from RealtimeSTT import AudioToTextRecorder
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

recorder: AudioToTextRecorder | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global recorder
    global recorder2
    recorder = AudioToTextRecorder(
        model="tiny",
        device='cuda',
        gpu_device_index=0,
        compute_type='int8',
    )
    recorder2 = AudioToTextRecorder(
        model="medium"
    )
    
    print("Initialized RealtimeSTT with optimized settings")
    yield
    print("Closed the ai")

app = FastAPI(title="Usage", lifespan=lifespan)


origins = [
    "http://localhost:3000",   
    "http://127.0.0.1:3000", 
    "http://localhost:5173" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def record():
    if recorder is None:
        return {"error": "Recorder not initialized"}
    response = recorder.text()
    return response
def record2():
    if recorder2 is None:
        return {"error": "Recorder not initialized"}
        response = recorder2.text()
        return response
@app.get("/callfortext")
def callfortext():
    return {"text": record()}

@app.get("/callfortext2")
def callfortext2():
    return {"text": record2()}