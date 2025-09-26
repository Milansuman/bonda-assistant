import { ipcMain } from "electron";
import { processMessage, processStreamMessage, addAssistantMessageToHistory, getChatHistory, clearChatHistory, ChatMessage } from "./bonda";

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
} as const;

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