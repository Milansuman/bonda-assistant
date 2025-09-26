import { groq } from "./client";
import { Experimental_Agent as Agent, stepCountIs, StreamTextResult, tool, CoreMessage } from "ai";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import * as os from "node:os";

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
  8. When you need to run a long running task, but don't need it's output for the next step, run it as a background process and use the available notification utility when the command is done.
  9. Always use shell commands for any mathematical calculation.

  FILE ORGANIZATION GUIDELINES:
  1. Always gather information about the relevant folder before performing the action.
  2. If you can't find the relevant files/folder, use the find command(or equivalent command for the current OS) to find it.
  3. Do not perform any actions without gathering information first, unless it is absolutely unecessary.

  LINUX SPECIFIC GUIDELINES:
  1. To find the list of applications, look at folders where .desktop files are usually stored.
  2. Use xdg-open to open files whenever possible.
  3. For commands that are likely to ask for prompts(yes/no questions), use the yes utility
  4. For commands that require sudo access, use pkexec to ask for sudo access. <IMPORTANT>Never run a command with sudo directly.</IMPORTANT>

  WINDOWS SPECIFIC GUIDELINES:
  1. Ensure windows commands are running using powershell.
  
  FORMATTING GUIDELINES:
  1. When returning folders or files, always format the response strictly to remove the triple backticks and also return only the response. response must be in json with this following correct structure:【{"type":"folder","folder":[{"name":"file.txt","path":"/path/to/file.txt","type":"file","size":"1024","timestamp":"2025-09-26 10:30:00"}]}】`,
  tools: {
    runCommand: tool({
      description: "Tool to execute commands in the terminal",
      inputSchema: z.object({
        command: z.string()
      }),
      execute: async ({ command }) => {
        try {
          console.log(`Executing command: ${command}`);
          const { stdout, stderr } = await execAsync(command);
          return { success: true, stdout, stderr };
        } catch (error) {
          console.error(`Command execution failed: ${error}`);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          };
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
    
    const result = await BondaAgent.generate({
      messages: messages
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

export async function processStreamMessage(message: string, conversationId: string = 'default'): Promise<StreamTextResult<any, any>> {
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
    
    const result = BondaAgent.stream({
      messages: messages
    });

    return result;
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