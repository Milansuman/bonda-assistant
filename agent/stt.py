from RealtimeSTT import AudioToTextRecorder
from fastapi import FastAPI
# import asyncio

def record():
  response = recorder.text()
  return response


app = FastAPI(title= "Usage")
recorder = AudioToTextRecorder()

@app.get("/callfortext")
def callfortext():
  text = record()

  return text
      
