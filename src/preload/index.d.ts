import { ElectronAPI } from '@electron-toolkit/preload'

interface BondaAPI {
  sendMessage: (message: string) => Promise<{ success: boolean; response?: string; error?: string }>
  sendStreamMessage: (message: string) => Promise<{ success: boolean; response?: string; error?: string }>
  onStreamChunk: (callback: (chunk: string) => void) => void
  onStreamEnd: (callback: (fullResponse: string) => void) => void
  onStreamError: (callback: (error: string) => void) => void
  removeStreamListeners: () => void
}

interface API {
  bonda: BondaAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
