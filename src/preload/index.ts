import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  bonda: {
    // Send a message to Bonda AI and get a response
    sendMessage: (message: string, conversationId?: string) => 
      ipcRenderer.invoke('bonda:message', message, conversationId),
    
    // Send a message to Bonda AI and get a streaming response
    sendStreamMessage: (message: string, conversationId?: string) => 
      ipcRenderer.invoke('bonda:stream', message, conversationId),
    
    // Get chat history
    getChatHistory: (conversationId?: string) => 
      ipcRenderer.invoke('bonda:getHistory', conversationId),
      
    // Clear chat history
    clearChatHistory: (conversationId?: string) => 
      ipcRenderer.invoke('bonda:clearHistory', conversationId),
    
    // Listen for streaming chunks
    onStreamChunk: (callback: (chunk: string) => void) => {
      ipcRenderer.on('bonda:stream:chunk', (_, chunk) => callback(chunk))
    },
    
    // Listen for stream end
    onStreamEnd: (callback: (fullResponse: string) => void) => {
      ipcRenderer.on('bonda:stream:end', (_, response) => callback(response))
    },
    
    // Listen for stream errors
    onStreamError: (callback: (error: string) => void) => {
      ipcRenderer.on('bonda:stream:error', (_, error) => callback(error))
    },
    
    // Remove listeners
    removeStreamListeners: () => {
      ipcRenderer.removeAllListeners('bonda:stream:chunk')
      ipcRenderer.removeAllListeners('bonda:stream:end')
      ipcRenderer.removeAllListeners('bonda:stream:error')
    },

    // Abort conversation
    abortConversation: (conversationId?: string) => 
      ipcRenderer.invoke('bonda:abort', conversationId)
  },

  // Navigation commands
  navigation: {
    executeCommand: (message: string) => 
      ipcRenderer.invoke('navigation:command', message)
  },
  
  // Hide window
  hideWindow: () => ipcRenderer.invoke('hideWindow'),

  // Listen for window maximize event
  onWindowMaximized: (callback: () => void) => {
    ipcRenderer.on('window:maximized', callback)
  },

  // Remove window maximize listener
  removeWindowMaximizedListener: () => {
    ipcRenderer.removeAllListeners('window:maximized')
  },

  // Listen for voice recording start event
  onVoiceRecordingStart: (callback: () => void) => {
    ipcRenderer.on('voice:start-recording', callback)
  },

  // Remove voice recording listener
  removeVoiceRecordingListener: () => {
    ipcRenderer.removeAllListeners('voice:start-recording')
  },

  // Listen for transcript toggle event
  onTranscriptToggle: (callback: () => void) => {
    ipcRenderer.on('transcript:toggle', callback)
  },

  // Remove transcript toggle listener
  removeTranscriptToggleListener: () => {
    ipcRenderer.removeAllListeners('transcript:toggle')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
