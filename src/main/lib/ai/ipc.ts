import { ipcMain } from "electron";
import { processMessage, processStreamMessage, addAssistantMessageToHistory, getChatHistory, clearChatHistory, abortConversation, ChatMessage } from "./bonda";
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// IPC channel names
export const IPC_CHANNELS = {
  BONDA_MESSAGE: 'bonda:message',
  BONDA_STREAM: 'bonda:stream',
  BONDA_RESPONSE: 'bonda:response',
  BONDA_ERROR: 'bonda:error',
  BONDA_STREAM_CHUNK: 'bonda:stream:chunk',
  BONDA_STREAM_END: 'bonda:stream:end',
  BONDA_STREAM_ERROR: 'bonda:stream:error',
  BONDA_GET_HISTORY: 'bonda:getHistory',
  BONDA_CLEAR_HISTORY: 'bonda:clearHistory',
  BONDA_ABORT: 'bonda:abort',
  NAVIGATION_COMMAND: 'navigation:command',
} as const;

// Function to check if message contains next/previous variations
function isNavigationCommand(message: string): { isNavigation: boolean; command?: 'next' | 'previous' } {
  const lowerMessage = message.toLowerCase().trim();
  
  // Check for "next" variations
  const nextPatterns = ['next', 'nxt', 'forward', 'ahead', 'continue', 'proceed'];
  if (nextPatterns.some(pattern => lowerMessage.includes(pattern))) {
    return { isNavigation: true, command: 'next' };
  }
  
  // Check for "previous" variations
  const previousPatterns = ['previous', 'prev', 'back', 'backward', 'before', 'earlier'];
  if (previousPatterns.some(pattern => lowerMessage.includes(pattern))) {
    return { isNavigation: true, command: 'previous' };
  }
  
  return { isNavigation: false };
}

// Function to execute navigation command
async function executeNavigationCommand(command: 'next' | 'previous'): Promise<{ success: boolean; message: string }> {
  try {
    let xdotoolCommand: string;
    
    if (command === 'next') {
      xdotoolCommand = 'xdotool key Right';
    } else {
      xdotoolCommand = 'xdotool key Left';
    }
    
    await execAsync(xdotoolCommand);
    return { success: true, message: `✅ Executed ${command} command` };
  } catch (error) {
    console.error(`Error executing ${command} command:`, error);
    return { success: false, message: `❌ Failed to execute ${command} command` };
  }
}

/**
 * Initialize IPC handlers for Bonda AI agent
 */
export function initializeBondaIPC(): void {
  // Handle regular message processing
  ipcMain.handle(IPC_CHANNELS.BONDA_MESSAGE, async (_event, message: string, conversationId?: string) => {
    try {
      console.log('Processing Bonda message:', message);
      const response = await processMessage(message, conversationId);
      return { success: true, response };
    } catch (error) {
      console.error('Bonda message processing error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // Handle streaming message processing
  ipcMain.handle(IPC_CHANNELS.BONDA_STREAM, async (event, message: string, conversationId?: string) => {
    try {
      console.log('Processing Bonda stream message:', message);
      const streamResult = await processStreamMessage(message, conversationId);
      
      // Handle the stream and send chunks back to renderer
      const chunks: string[] = [];
      
      try {
        for await (const chunk of streamResult.textStream) {
          chunks.push(chunk);
          // Send each chunk to the renderer
          event.sender.send(IPC_CHANNELS.BONDA_STREAM_CHUNK, chunk);
        }
        
        const fullResponse = chunks.join('');
        
        // Add assistant response to history after streaming completes
        await addAssistantMessageToHistory(fullResponse, conversationId);
        
        // Send end signal
        event.sender.send(IPC_CHANNELS.BONDA_STREAM_END, fullResponse);
        
        return { success: true, response: fullResponse };
      } catch (streamError) {
        // Handle stream abortion or other streaming errors
        if (streamError instanceof Error && streamError.name === 'AbortError') {
          console.log('Stream aborted by user');
          event.sender.send(IPC_CHANNELS.BONDA_STREAM_ERROR, 'Stream aborted');
          return { success: false, error: 'Stream aborted' };
        }
        throw streamError;
      }
    } catch (error) {
      console.error('Bonda stream processing error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Send error to renderer
      event.sender.send(IPC_CHANNELS.BONDA_STREAM_ERROR, errorMessage);
      
      return { success: false, error: errorMessage };
    }
  });

  // Handle getting chat history
  ipcMain.handle(IPC_CHANNELS.BONDA_GET_HISTORY, async (_event, conversationId?: string) => {
    try {
      const history = getChatHistory(conversationId);
      return { success: true, history };
    } catch (error) {
      console.error('Error getting chat history:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // Handle clearing chat history
  ipcMain.handle(IPC_CHANNELS.BONDA_CLEAR_HISTORY, async (_event, conversationId?: string) => {
    try {
      clearChatHistory(conversationId);
      return { success: true };
    } catch (error) {
      console.error('Error clearing chat history:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // Handle aborting conversation
  ipcMain.handle(IPC_CHANNELS.BONDA_ABORT, async (_event, conversationId?: string) => {
    try {
      abortConversation(conversationId);
      return { success: true };
    } catch (error) {
      console.error('Error aborting conversation:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // Handle navigation commands
  ipcMain.handle(IPC_CHANNELS.NAVIGATION_COMMAND, async (_event, message: string) => {
    try {
      const navigationCheck = isNavigationCommand(message);
      
      if (navigationCheck.isNavigation && navigationCheck.command) {
        const result = await executeNavigationCommand(navigationCheck.command);
        return result;
      } else {
        return { success: false, message: 'Not a navigation command' };
      }
    } catch (error) {
      console.error('Error processing navigation command:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: errorMessage };
    }
  });
}

// Type definitions for IPC communication
export interface BondaMessageRequest {
  message: string;
  conversationId?: string;
}

export interface BondaMessageResponse {
  success: boolean;
  response?: string;
  error?: string;
}

export interface BondaHistoryResponse {
  success: boolean;
  history?: ChatMessage[];
  error?: string;
}

export type BondaIpcChannels = typeof IPC_CHANNELS;