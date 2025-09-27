import os
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from langchain_core.output_parsers import JsonOutputParser
from fastapi.middleware.cors import CORSMiddleware
from tools import invoke_tool, TOOLS
from instructions import MAIN_PROMPT

load_dotenv()

class RunRequest(BaseModel):
    task: str

origins = [
    "http://localhost:3000",   
    "http://127.0.0.1:3000", 
    "http://localhost:5173" 
]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "running"}

@app.post("/run")
def run(request: RunRequest):
    main_model = ChatOpenAI(
        model="gpt-5",
        reasoning={"effort": "minimal"},
        # temperature=0.5,
        api_key=os.environ["OPENAI_API_KEY"],
    ).bind_tools(TOOLS, parallel_tool_calls=False)
    
    messages = [SystemMessage(content=MAIN_PROMPT)]
    messages.append(HumanMessage(
        content=[
            {
                "type": "text",
                "text": request.task
            }
        ]
    ))
    
    finish = False
    function_exec_state = False
    screen_index = None
    try:
        while (not finish or function_exec_state):
            response = main_model.invoke(messages)
            print("Response: ", response)
            messages.append(response)
            function_exec_state = False
            if (not response.tool_calls):
                finish = True
            else:
                for tool_call in response.tool_calls:
                    function_exec_state = True
                    tool_result = invoke_tool({
                        "name": tool_call["name"],
                        "arguments": tool_call["args"]
                    })
                    messages.append(ToolMessage(
                        content=tool_result["text"],
                        name=tool_call["name"],
                        tool_call_id=tool_call["id"]
                    ))
                    if (tool_result["type"] == "screen"):
                        if (screen_index):
                            messages.pop(screen_index)
                        screen_index = len(messages)
                        messages.append(HumanMessage(
                            content=[
                                {
                                    "type": "image",
                                    "source_type": "base64",
                                    "mime_type": "image/jpeg",
                                    "data": tool_result["data"]
                                }
                            ]
                        ))
        return {"status": "success", "message": response.content}
    except Exception as e:
        return {"status": "error", "message": str(e)}