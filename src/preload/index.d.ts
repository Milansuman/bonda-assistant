import { ElectronAPI } from '@electron-toolkit/preload'

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface BondaAPI {
  sendMessage: (message: string, conversationId?: string) => Promise<{ success: boolean; response?: string; error?: string }>
  sendStreamMessage: (message: string, conversationId?: string) => Promise<{ success: boolean; response?: string; error?: string }>
  getChatHistory: (conversationId?: string) => Promise<{ success: boolean; history?: ChatMessage[]; error?: string }>
  clearChatHistory: (conversationId?: string) => Promise<{ success: boolean; error?: string }>
  onStreamChunk: (callback: (chunk: string) => void) => void
  onStreamEnd: (callback: (fullResponse: string) => void) => void
  onStreamError: (callback: (error: string) => void) => void
  removeStreamListeners: () => void
  abortConversation: (conversationId?: string) => Promise<{ success: boolean; error?: string }>
}

interface API {
  bonda: BondaAPI
  hideWindow: () => Promise<void>
  onWindowMaximized: (callback: () => void) => void
  removeWindowMaximizedListener: () => void
  onVoiceRecordingStart: (callback: () => void) => void
  removeVoiceRecordingListener: () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
