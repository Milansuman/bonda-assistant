import { groq } from "./client";
import { Experimental_Agent as Agent, stepCountIs, tool, CoreMessage} from "ai";
import { z } from "zod";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import * as os from "node:os";
import { createNote, deleteNote, getAllNotes, getNote } from "../tools/notes";

const execAsync = promisify(exec);
const mainModel = groq("moonshotai/kimi-k2-instruct");

// Message history interface
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Conversation state manager
class ConversationManager {
  private conversations = new Map<string, ChatMessage[]>();
  private abortControllers = new Map<string, AbortController>();

  addMessage(conversationId: string, message: ChatMessage): void {
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, []);
    }
    this.conversations.get(conversationId)!.push(message);
  }

  getHistory(conversationId: string): ChatMessage[] {
    return this.conversations.get(conversationId) || [];
  }

  clearHistory(conversationId: string): void {
    this.conversations.delete(conversationId);
  }

  // Convert chat messages to CoreMessage format for the AI
  toCoreMessages(conversationId: string): CoreMessage[] {
    const history = this.getHistory(conversationId);
    return history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  createAbortController(conversationId: string): AbortController {
    const controller = new AbortController();
    this.abortControllers.set(conversationId, controller);
    return controller;
  }

  abortConversation(conversationId: string): void {
    const controller = this.abortControllers.get(conversationId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(conversationId);
    }
  }

  getAbortSignal(conversationId: string): AbortSignal | undefined {
    return this.abortControllers.get(conversationId)?.signal;
  }
}

export const conversationManager = new ConversationManager();

export const BondaAgent = new Agent({
  model: mainModel,
  system: `
  You are a helpful AI assistant named Bonda. Your aim is to assist the user in any tasks they have.

  You are on ${os.platform()} operating system.

  GUIDELINES:
  1. Only execute a shell command if it is necessary for the task at hand.
  2. If you need information about the system in order to perform a task, use a shell command to obtain that information.
  3. If there isn't a task to perform, respond directly to the prompt.
  4. For tasks related to organizing files, follow the FILE ORGANIZATION GUIDELINES.
  5. Do not reveal the inner workings of the tool calls under any circumstances.
  6. For tasks that require google searches, find the installed browser and do the search there.
  7. When the user asks you to let them know when you're done with a task, use the available notification utility to send a desktop notification.
  8. When you need to run a long running task, but don't need it's output for the next step, use the detached option in runCommand and use the available notification utility when the command is done.
  9. Always use shell commands for any mathematical calculation.
  10. The user is not used to technical jargon. Use natural, easy to understand language.
  11. If another language prompt is given, translate to english and understand the prompt and then execute the function back in ENGLISH ONLY and also ONLY REPLY IN ENGLISH
  12. Ensure any command outputs are limited to around 1000 tokens by truncating the output. For example. don't just use ps aux directly, truncate the output to show the processes using up the most memory
  
  KEYBOARD SHORTCUTS GUIDELINES:
  1. Press the right arrow for Next
  2. Press the left arrow for Previous

  FILE ORGANIZATION GUIDELINES:
  1. Always gather information about the relevant folder before performing the action.
  2. If you can't find the relevant files/folder, use the find command(or equivalent command for the current OS) to find it.
  3. Do not perform any actions without gathering information first, unless it is absolutely unecessary.

  LINUX SPECIFIC GUIDELINES:
  1. To find the list of applications, look at folders where .desktop files are usually stored.
  2. Use xdg-open to open files whenever possible.
  3. For commands that are likely to ask for prompts(yes/no questions), use the yes utility
  4. For commands that require sudo access, use pkexec to ask for sudo access.
  <IMPORTANT>Never run a command with sudo directly.</IMPORTANT>
  5. When you need perform a keypress, use xdotool to perform the keybinding.

  WINDOWS SPECIFIC GUIDELINES:
  1. Ensure windows commands are running using powershell.

  LATEX RULES:
  1. When working on a latex project, create a folder in the tmp directory and then copy the output of the latex source to the desired location.
  2. Use the appropriate document class when setting up the source code.
  3. Use pdflatex -interaction=nonstopmode wherever possible. <IMPORTANT>Always export to pdf</IMPORTANT>
  4. Use latex for tasks like creating presentations, documents, etc.

RULES:
1. Use this exact structure when returning folders or files:

【
{
  "type": "folder",
  "folder": [
    {
      "name": "file.txt",
      "path": "/path/to/file.txt",
      "type": "file",
      "size": "1024",
      "timestamp": "2025-09-26 10:30:00"
    }
  ]
}
】

2. Every object must include: name, path, type, size, and timestamp.
3. Do not remove or trim any symbols — the outer 【 】 must always be present.
4. Include all files and subfolders as objects in the "folder" array.
5. Only folders and files are allowed; do not include anything else.
6. For system specifications, use this exact structure:

【{
"type": "system-specs",
"system": {
"computerName": "DESKTOP-1G6EJKJ",
"manufacturer": "Acer",
"model": "Aspire A315-23",
"operatingSystem": {
"name": "Windows 11 Home Single Language",
"version": "Windows 10.0.26100 (Windows 11)",
"installed": "2025-07-01",
"systemType": "64-bit operating system",
"windowsDirectory": "C:\WINDOWS"
}
},
"cpu": {
"processor": "AMD processor",
"speedMHz": 2600
},
"memory": {
"totalRAM_MB": 10177,
"availableRAM_MB": 2979,
"virtualMemory_MB": 20480
},
"storage": {
"pageFileLocation": "D:"
},
"network": {
"wifiAdapter": "Intel Dual Band Wireless-AC 3168",
"currentIP": "10.3.4.75",
"vmwareAdaptersInstalled": true
},
"security": {
"windowsUpdatesInstalled": 3,
"virtualizationEnabled": true,
"secureBootEnabled": true
}
}】
7. Do not remove or trim any symbols — the outer 【 】 must always be present.
8. Only system specifications are allowed; do not include anything else.
9. Every object must include all fields as shown in the example
10. Always respond in English
11. Never break the formatting structure, even if the data is missing. Use "unknown" or "N/A" for missing values.
12. Always adhere to the formatting guidelines strictly.
13. If response is about system specs/information or file/folder structure, respond ONLY with the JSON data structure, and nothing else.
`,


  tools: {
    runCommand: tool({
      description: "Tool to execute commands in the terminal",
      inputSchema: z.object({
        command: z.string(),
        detached: z.boolean().optional().describe("Whether to run the command in detached mode (background process). Default is false.")
      }),
      execute: async ({ command, detached = false }) => {
        try {
          console.log(`Executing command: ${command}${detached ? ' (detached)' : ''}`);
          
          if (detached) {
            // Use spawn for detached processes
            const args = command.split(' ');
            const cmd = args.shift()!;
            
            const child = spawn(cmd, args, {
              detached: true,
              stdio: 'ignore'
            });
            
            // Unreference the child process so the parent can exit
            child.unref();
            
            return { 
              success: true, 
              pid: child.pid,
              message: `Command started in background with PID: ${child.pid}`,
              detached: true
            };
          } else {
            // Use exec for regular processes that we wait for
            const { stdout, stderr } = await execAsync(command);
            console.log(stdout);
            return { success: true, stdout, stderr, detached: false };
          }
        } catch (error) {
          console.error(`Command execution failed: ${error}`);
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            detached: detached
          };
        }
      }
    }),
    fetch: tool({
      description: "Tool to send an http request to an endpoint",
      inputSchema: z.object({
        endpoint: z.string(),
        method: z.enum(["GET", "POST", "PUT", "DELETE"]),
        body: z.string().optional()
      }),
      execute: async ({endpoint, method, body}) => {
        try {
          const response = await fetch(endpoint, {
            method: method,
            body
          });

          if(!response.ok){
            return {
              success: false,
              response: await response.text(),
              status: response.status
            }
          }

          return {
            success: true,
            response: await response.text(),
            status: response.status
          }
        } catch (error) {
          return {
            success: false,
            error: error
          }
        }
      }
    }),
    notes: tool({
      description: "Tool to manage notes",
      inputSchema: z.object({
        action: z.enum(["CREATE", "GET", "GETALL", "DELETE"]),
        name: z.string(),
        content: z.string()
      }),
      execute: async ({action, name, content}) => {
        try {
          switch (action) {
            case "CREATE":
              await createNote(name, content);
              return {
                success: true,
                message: "Note created successfully"
              };
            case "GET":
              const note = await getNote(name);
              return {
                success: true,
                message: note
              };
            case "GETALL":
              const notes = await getAllNotes();
              return {
                success: true,
                message: notes
              };
            case "DELETE":
              await deleteNote(name);
              return {
                success: true,
                message: "Note deleted successfully"
              };
            default:
              return {
                success: false,
                message: "Invalid action"
              };
          }
        } catch (error) {
          return {
            success: false,
            error: error
          }
        }
      }
    })
  },
  stopWhen: stepCountIs(20)
});

export async function processMessage(message: string, conversationId: string = 'default'): Promise<string> {
  try {
    // Add user message to history
    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    conversationManager.addMessage(conversationId, userMessage);

    // Get conversation history
    const messages = conversationManager.toCoreMessages(conversationId);

    // Create abort controller for this conversation
    const abortController = conversationManager.createAbortController(conversationId);

    // Wrap the generation in a promise that respects the abort signal
    const result = await new Promise<any>((resolve, reject) => {
      if (abortController.signal.aborted) {
        reject(new DOMException('Request aborted', 'AbortError'));
        return;
      }

      const generatePromise = BondaAgent.generate({
        messages: messages
      });

      abortController.signal.addEventListener('abort', () => {
        reject(new DOMException('Request aborted', 'AbortError'));
      });

      generatePromise.then(resolve).catch(reject);
    });

    // Add assistant response to history
    const assistantMessage: ChatMessage = {
      id: `${Date.now()}-assistant`,
      role: 'assistant',
      content: result.text,
      timestamp: Date.now()
    };
    conversationManager.addMessage(conversationId, assistantMessage);

    return result.text;
  } catch (error) {
    console.error('AI processing error:', error);
    throw error;
  }
}

export async function processStreamMessage(message: string, conversationId: string = 'default') {
  try {
    // Add user message to history
    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    conversationManager.addMessage(conversationId, userMessage);

    // Get conversation history
    const messages = conversationManager.toCoreMessages(conversationId);

    // Create abort controller for this conversation
    const abortController = conversationManager.createAbortController(conversationId);

    // Create a wrapper that monitors the abort signal
    const result = BondaAgent.stream({
      messages: messages
    });

    // Create a new stream that respects the abort signal
    const abortableStream = {
      textStream: async function* () {
        try {
          for await (const chunk of result.textStream) {
            if (abortController.signal.aborted) {
              throw new DOMException('Stream aborted', 'AbortError');
            }
            yield chunk;
          }
        } catch (error) {
          if (abortController.signal.aborted) {
            throw new DOMException('Stream aborted', 'AbortError');
          }
          throw error;
        }
      }()
    };

    return abortableStream;
  } catch (error) {
    console.error('AI processing error:', error);
    throw error;
  }
}

export async function addAssistantMessageToHistory(content: string, conversationId: string = 'default'): Promise<void> {
  const assistantMessage: ChatMessage = {
    id: `${Date.now()}-assistant`,
    role: 'assistant',
    content: content,
    timestamp: Date.now()
  };
  conversationManager.addMessage(conversationId, assistantMessage);
}

export function getChatHistory(conversationId: string = 'default'): ChatMessage[] {
  return conversationManager.getHistory(conversationId);
}

export function clearChatHistory(conversationId: string = 'default'): void {
  conversationManager.clearHistory(conversationId);
}

export function abortConversation(conversationId: string = 'default'): void {
  conversationManager.abortConversation(conversationId);
}