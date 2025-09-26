
import { Mic, Play, StopCircle, PlusCircle } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import { MessageRenderer } from "./components/MessageRenderer";

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export default function App() {

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const conversationId = "default";
  const [loading, setLoading] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const promptInputRef = useRef<HTMLInputElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);


  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const result = await window.api.bonda.getChatHistory(conversationId)
        if (result.success && result.history) {
          setChatHistory(result.history)
        }
      } catch (error) {
        console.error('Failed to load chat history:', error)
      }

    };

    loadHistory();
  }, []);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory, currentResponse])

  const getTranscript = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/callfortext', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Transcript data:', data) // Debug log
        if (promptInputRef.current && data.text) {
          promptInputRef.current.value = data.text

          promptInputRef.current.focus()
          sendPrompt(data.text)
          promptInputRef.current.value = ''
        }
      } else {
        console.error('Failed to get transcript:', response.status)
      }
    } catch (error) {
      console.error('Error fetching transcript:', error)
    }
  }

  // Set up streaming listeners
  useEffect(() => {
    const handleStreamChunk = (chunk: string) => {
      setCurrentResponse((prev) => prev + chunk)
    }

    const handleStreamEnd = async (_fullResponse: string) => {
      setIsStreaming(false)
      setCurrentResponse('')

      // Reload chat history to get the complete conversation
      try {
        const result = await window.api.bonda.getChatHistory(conversationId)
        if (result.success && result.history) {
          setChatHistory(result.history)
        }
      } catch (error) {
        console.error('Failed to reload chat history:', error)
      }
    }

    const handleStreamError = (error: string) => {
      setIsStreaming(false)
      setCurrentResponse('')

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `${Date.now()}-error`,
        role: 'assistant',
        content: `Error: ${error}`,
        timestamp: Date.now()
      }
      setChatHistory((prev) => [...prev, errorMessage])
    }

    // Set up listeners
    window.api.bonda.onStreamChunk(handleStreamChunk)
    window.api.bonda.onStreamEnd(handleStreamEnd)
    window.api.bonda.onStreamError(handleStreamError)

    // Cleanup listeners on unmount
    return () => {
      window.api.bonda.removeStreamListeners()
    }
  }, [conversationId])

  const sendPrompt = async (prompt: string) => {
    if (!prompt.trim() || isStreaming) return;
    // Add user message to local state immediately
    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: prompt,
      timestamp: Date.now()

    }
    setChatHistory((prev) => [...prev, userMessage])
    setLoading(true)
    setShowBurst(true)
    setIsStreaming(true)
    setCurrentResponse('') // Clear current response

    try {
      // Start streaming response
      await window.api.bonda.sendStreamMessage(prompt, conversationId)
    } catch (error) {

      setIsStreaming(false)
      setCurrentResponse('')

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `${Date.now()}-error`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setShowBurst(false);
    }
  };
  

  const clearHistory = async () => {
    try {
      const result = await window.api.bonda.clearChatHistory(conversationId)
      if (result.success) {
        setChatHistory([])
        setCurrentResponse('')
      }
    } catch (error) {
      console.error('Failed to clear chat history:', error)
    }
  }

  return (
    <>
      {loading && <div className="bonda-overlay"></div>}
      {showBurst && <div className="bonda-overlay-burst"></div>}

      <div className="w-screen h-screen flex items-center justify-center bg-transparent">
        <div className="w-[600px] bg-[#0c0e10] border border-white/10 rounded-2xl shadow-xl backdrop-blur-lg text-gray-200">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 text-[#7cc3ff] text-sm font-bold">
              ⌘
            </span>
            <input
              ref={promptInputRef}
              placeholder="Ask me anything!"
              className="flex-1 bg-transparent outline-none text-sm placeholder-gray-400"
              disabled={isStreaming}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const prompt = event.currentTarget.value;
                  if (promptInputRef.current) promptInputRef.current.value = "";
                  sendPrompt(prompt);
                }
              }}
            />
            <Mic
              color="#9ca3af"
              size={18}
              className="cursor-pointer hover:text-white"
              onClick={getTranscript}
            />
            <div title="Clear chat history">
              <PlusCircle
                color="#9ca3af"
                size={18}
                className="cursor-pointer hover:text-white"
                onClick={clearHistory}
              />
            </div>
            {isStreaming ? (
              <StopCircle
                color="#ff6b6b"
                size={18}
                className="cursor-pointer hover:text-white"
                onClick={() => {
                  setIsStreaming(false)
                }}
              />
            ) : (
              <Play
                color="#9ca3af"
                size={18}
                className="cursor-pointer hover:text-white"
                onClick={() => {
                  if (promptInputRef.current?.value.trim()) {
                    const prompt = promptInputRef.current.value
                    promptInputRef.current.value = ''
                    sendPrompt(prompt)
                  }
                }}
              />
            )}
          </div>
          <div
            ref={chatContainerRef}
            className="flex flex-col p-5 min-h-20 h-fit max-h-96 overflow-auto space-y-2"
          >
            {chatHistory.length === 0 && !isStreaming && (
              <div className="flex flex-col space-y-2">
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => sendPrompt("What's the current time and date?")}
                    className="flex-shrink-0 p-2 bg-transparent hover:bg-white/5 rounded-lg border border-white/5 text-left text-xs text-gray-300 transition-colors whitespace-nowrap"
                  >
                    📅 Current time & date
                  </button>
                  <button

                    onClick={() => sendPrompt('List the files in my current directory')}
                    className="flex-shrink-0 p-2 bg-transparent hover:bg-white/5 rounded-lg border border-white/5 text-left text-xs text-gray-300 transition-colors whitespace-nowrap"
                  >
                    📁 List current directory
                  </button>
                  <button
                    onClick={() => sendPrompt('Check my system information')}
                    className="flex-shrink-0 p-2 bg-transparent hover:bg-white/5 rounded-lg border border-white/5 text-left text-xs text-gray-300 transition-colors whitespace-nowrap"
                  >
                    💻 System information
                  </button>
                  <button
                    onClick={() => sendPrompt('What can you help me with?')}
                    className="flex-shrink-0 p-2 bg-transparent hover:bg-white/5 rounded-lg border border-white/5 text-left text-xs text-gray-300 transition-colors whitespace-nowrap"
                  >
                    ❓ What can you do?
                  </button>
                  <button
                    onClick={() => sendPrompt('Check network connectivity')}
                    className="flex-shrink-0 p-2 bg-transparent hover:bg-white/5 rounded-lg border border-white/5 text-left text-xs text-gray-300 transition-colors whitespace-nowrap"
                  >
                    🌐 Check network
                  </button>
                  <button
                    onClick={() => sendPrompt('Show running processes')}
                    className="flex-shrink-0 p-2 bg-transparent hover:bg-white/5 rounded-lg border border-white/5 text-left text-xs text-gray-300 transition-colors whitespace-nowrap"
                  >
                    ⚡ Running processes
                  </button>
                  <button
                    onClick={() => sendPrompt('Check disk usage')}
                    className="flex-shrink-0 p-2 bg-transparent hover:bg-white/5 rounded-lg border border-white/5 text-left text-xs text-gray-300 transition-colors whitespace-nowrap"
                  >
                    💾 Disk usage
                  </button>
                  <button
                    onClick={() => sendPrompt('Create a new file')}
                    className="flex-shrink-0 p-2 bg-transparent hover:bg-white/5 rounded-lg border border-white/5 text-left text-xs text-gray-300 transition-colors whitespace-nowrap"
                  >
                    📝 Create file
                  </button>
                  <button
                    onClick={() => sendPrompt('Find files by name')}
                    className="flex-shrink-0 p-2 bg-transparent hover:bg-white/5 rounded-lg border border-white/5 text-left text-xs text-gray-300 transition-colors whitespace-nowrap"
                  >
                    🔍 Find files
                  </button>
                  <button
                    onClick={() => sendPrompt('Open a website')}
                    className="flex-shrink-0 p-2 bg-transparent hover:bg-white/5 rounded-lg border border-white/5 text-left text-xs text-gray-300 transition-colors whitespace-nowrap"
                  >
                    🌍 Open website
                  </button>
                  <button
                    onClick={() => sendPrompt('Here are the contents: 【{"type":"folder","folder":[{"name":"package.json","path":"/project/package.json","type":"file","size":"2048","timestamp":"2025-09-25 16:20:15"},{"name":"src","path":"/project/src","type":"directory","size":"4096","timestamp":"2025-09-26 10:30:00"},{"name":"README.md","path":"/project/README.md","type":"file","size":"1024","timestamp":"2025-09-24 14:45:30"}]}】')}
                    className="flex-shrink-0 p-2 bg-transparent hover:bg-white/5 rounded-lg border border-white/5 text-left text-xs text-gray-300 transition-colors whitespace-nowrap"
                  >
                    🧪 Test Folder JSON
                  </button>
                  <button
                    onClick={() => sendPrompt('I found several files: 【{"type":"folder","folder":[{"name":"app.py","path":"/home/user/app.py","type":"file","size":"5432","timestamp":"2025-09-26 09:15:00"},{"name":"templates","path":"/home/user/templates","type":"directory","size":"4096","timestamp":"2025-09-25 18:30:00"}]}】\n\nThe **app.py** file appears to be the main application. Would you like me to help with anything specific?')}
                    className="flex-shrink-0 p-2 bg-transparent hover:bg-white/5 rounded-lg border border-white/5 text-left text-xs text-gray-300 transition-colors whitespace-nowrap"
                  >
                    📝 Test Mixed Content
                  </button>
                </div>
              </div>
            )}

            {chatHistory.map((message) => (
              <div
                key={message.id}
                className={message.role === 'user' ? 'opacity-40' : 'opacity-100'}
              >
                {message.role === 'assistant' ? (
                  <MessageRenderer 
                    content={message.content} 
                    isStreamFinished={true}
                  />
                ) : (
                  <div className="text-sm text-gray-200">{message.content}</div>
                )}
              </div>
            ))}

            {isStreaming && (
              <div className="opacity-100">
                {currentResponse ? (
                  <div className="relative">
                    <MessageRenderer 
                      content={currentResponse} 
                      isStreamFinished={false}
                    />
                    <div className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1 align-baseline"></div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm animate-pulse">Thinking...</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
