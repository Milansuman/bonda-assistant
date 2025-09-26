import os
import json
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from instructions import SYSTEM_PROMPT
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.output_parsers import JsonOutputParser
from tools import invoke_tool

load_dotenv()

class RunRequest(BaseModel):
    task: str

app = FastAPI()

@app.get("/")
def root():
    return {"status": "running"}

@app.post("/run")
def run(request: RunRequest):
    parser = JsonOutputParser()

    model = ChatOpenAI(
        model="qwen/qwen2.5-vl-72b-instruct",
        # model="bytedance/ui-tars-1.5-7b",
        api_key=os.environ["OPENROUTER_API_KEY"],
        base_url="https://openrouter.ai/api/v1",
        extra_body={
            "provider": {"only": ["hyperbolic"]}
        }
    )
    
    messages = [SystemMessage(content=SYSTEM_PROMPT)]
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
    try:
        while (not finish or function_exec_state):
            response = model.invoke(messages)
            llm_result = parser.invoke(response)
            print("Tool: ", llm_result)
            function_exec_state = False
            if (not llm_result):
                break
            if (llm_result["name"] == "finish" or llm_result["name"] == "error"):
                finish = True
            else:
                function_exec_state = True
                messages.append(AIMessage(
                    content=[
                        {
                            "type": "text",
                            "text": json.dumps(llm_result)
                        }
                    ]
                ))
                tool_result = invoke_tool(llm_result)
                if (tool_result):
                    messages.append(HumanMessage(content=[tool_result]))
    except Exception as e:
        return {"error": str(e)}