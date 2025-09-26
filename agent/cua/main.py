import os
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from instructions import SYSTEM_PROMPT
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputParser

load_dotenv()

class RunRequest(BaseModel):
    task: str

app = FastAPI()

@app.get("/")
def root():
    return {"status": "running"}

@app.post("/run")
def run(request: RunRequest):
    model = ChatOpenAI(
        model="bytedance/ui-tars-1.5-7b",
        api_key=os.environ["OPENROUTER_API_KEY"],
        base_url="https://openrouter.ai/api/v1",
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
    
    chain = messages | model | JsonOutputParser()
    try:
        result = chain.run()
        return {"result": result}
    except Exception as e:
        return {"error": str(e)}