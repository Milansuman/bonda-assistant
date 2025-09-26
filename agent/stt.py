from RealtimeSTT import AudioToTextRecorder
from fastapi import FastAPI

app = FastAPI(title="Usage")


recorder: AudioToTextRecorder | None = None

def record():
    if recorder is None:
        return {"error": "Recorder not initialized"}
    response = recorder.text()
    return response

@app.get("/callfortext")
def callfortext():
    return {"text": record()}

if __name__ == "__main__":
    recorder = AudioToTextRecorder()

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
