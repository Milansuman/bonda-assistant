import {Mic, Play} from "lucide-react";
import { useRef, useState } from "react";

export default function App() {
  const [response, setResponse] = useState("");
  const [prompt, setPrompt] = useState<string>("");
  const [loading,setLoading] = useState(false);
  const promptInputRef = useRef<HTMLInputElement | null>(null);

  const askBonda = async (prompt: string) => {
    try{
      setLoading(true);
      setResponse("Thinking...");
      //const res = await functionCall( prompt);
      //setResponse(res.response);
    }catch(err){
      setResponse("Error occurred. Please try again.");
      console.error(err);
    }finally{
      setLoading(false);
    }
  }
  return (
    <>
      {loading && (
        <div className="bonda-overlay"></div>
      )}
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
              onChange={(e) => setPrompt(e.currentTarget.value)}
              onKeyDown={(event) => {
                if(event.key === "Enter"){
                  const prompt = event.currentTarget.value;
                  setPrompt(prompt);
                  askBonda(prompt);
                  if(promptInputRef.current) promptInputRef.current.value = "";

                  
                }
              }}
            />
            <Mic color="#9ca3af" size={18} className="cursor-pointer hover:text-white" />
            <Play color="#9ca3af" size={18} onClick={() => askBonda(prompt)} className="cursor-pointer hover:text-white" />
          </div>
          <div className="flex flex-col p-5 min-h-20 h-fit max-h-96 overflow-auto">
            {response}
          </div>
        </div>
      </div>
    </>
  )
}
