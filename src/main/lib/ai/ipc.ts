import { IpcMain, ipcMain } from "electron";
import { processMessage, processStreamMessage } from "./bonda";

// IPC channel names
export const IPC_CHANNELS = {
  BONDA_MESSAGE: 'bonda:message',
  BONDA_STREAM: 'bonda:stream',
  BONDA_RESPONSE: 'bonda:response',
  BONDA_ERROR: 'bonda:error',
  BONDA_STREAM_CHUNK: 'bonda:stream:chunk',
  BONDA_STREAM_END: 'bonda:stream:end',
  BONDA_STREAM_ERROR: 'bonda:stream:error'
} as const;

/**
 * Initialize IPC handlers for Bonda AI agent
 */
export function initializeBondaIPC(): void {
  // Handle regular message processing
  ipcMain.handle(IPC_CHANNELS.BONDA_MESSAGE, async (event, message: string) => {
    try {
      console.log('Processing Bonda message:', message);
      const response = await processMessage(message);
      return { success: true, response };
    } catch (error) {
      console.error('Bonda message processing error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // Handle streaming message processing
  ipcMain.handle(IPC_CHANNELS.BONDA_STREAM, async (event, message: string) => {
    try {
      console.log('Processing Bonda stream message:', message);
      const streamResult = await processStreamMessage(message);
      
      // Handle the stream and send chunks back to renderer
      const chunks: string[] = [];
      
      for await (const chunk of streamResult.textStream) {
        chunks.push(chunk);
        // Send each chunk to the renderer
        event.sender.send(IPC_CHANNELS.BONDA_STREAM_CHUNK, chunk);
      }
      
      // Send end signal
      event.sender.send(IPC_CHANNELS.BONDA_STREAM_END, chunks.join(''));
      
      return { success: true, response: chunks.join('') };
    } catch (error) {
      console.error('Bonda stream processing error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Send error to renderer
      event.sender.send(IPC_CHANNELS.BONDA_STREAM_ERROR, errorMessage);
      
      return { success: false, error: errorMessage };
    }
  });
}

// Type definitions for IPC communication
export interface BondaMessageRequest {
  message: string;
}

export interface BondaMessageResponse {
  success: boolean;
  response?: string;
  error?: string;
}

export type BondaIpcChannels = typeof IPC_CHANNELS;