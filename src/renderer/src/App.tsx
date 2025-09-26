import {Mic, Play} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { MarkdownComponent } from "./components/markdown";

export default function App() {
  const [response, setResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const promptInputRef = useRef<HTMLInputElement | null>(null);

  // Set up streaming listeners
  useEffect(() => {
    const handleStreamChunk = (chunk: string) => {
      setResponse(prev => prev + chunk);
    };

    const handleStreamEnd = (fullResponse: string) => {
      setIsStreaming(false);
      setResponse(fullResponse);
    };

    const handleStreamError = (error: string) => {
      setIsStreaming(false);
      setResponse(`Error: ${error}`);
    };

    // Set up listeners
    window.api.bonda.onStreamChunk(handleStreamChunk);
    window.api.bonda.onStreamEnd(handleStreamEnd);
    window.api.bonda.onStreamError(handleStreamError);

    // Cleanup listeners on unmount
    return () => {
      window.api.bonda.removeStreamListeners();
    };
  }, []);

  const sendPrompt = async (prompt: string) => {
    if (!prompt.trim() || isStreaming) return;
    
    setIsStreaming(true);
    setResponse(""); // Clear previous response
    
    try {
      // Start streaming response
      await window.api.bonda.sendStreamMessage(prompt);
    } catch (error) {
      setIsStreaming(false);
      setResponse(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <>
      <div className="bonda-overlay"></div>
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
                if(event.key === "Enter"){
                  const prompt = event.currentTarget.value;
                  if(promptInputRef.current) promptInputRef.current.value = "";
                  sendPrompt(prompt);
                }
              }}
            />
            <Mic color="#9ca3af" size={18} className="cursor-pointer hover:text-white" />
            <Play 
              color={isStreaming ? "#7cc3ff" : "#9ca3af"} 
              size={18} 
              className={`cursor-pointer hover:text-white ${isStreaming ? "animate-pulse" : ""}`}
              onClick={() => {
                if (promptInputRef.current?.value.trim()) {
                  const prompt = promptInputRef.current.value;
                  promptInputRef.current.value = "";
                  sendPrompt(prompt);
                }
              }}
            />
          </div>
          <div className="flex flex-col p-5 min-h-20 h-fit max-h-96 overflow-auto">
            {isStreaming && !response && (
              <div className="text-gray-400 text-sm animate-pulse">
                Thinking...
              </div>
            )}
            {response && (
              <div className="prose prose-invert prose-sm max-w-none">
                <MarkdownComponent response={response} />
              </div>
            )}
            {isStreaming && response && (
              <div className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1 align-baseline"></div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
