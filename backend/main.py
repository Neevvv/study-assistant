from fastapi import FastAPI  # type: ignore
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq # type: ignore
import os

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://study-assistant-three-dusky.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    text: str
    history: list = []
    subject: str = "General"
    notes: str = ""

@app.get("/")
def home():
    return {"message": "Study Assistant is running!"}

@app.post("/chat")
def chat(message: Message):
    system_prompt = f"You are a helpful study assistant for students. The student is currently studying {message.subject}."
    
    if message.notes:
        system_prompt += f"\n\nThe student has provided the following notes. Use them to answer questions:\n{message.notes}"
       
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(message.history)
    messages.append({"role": "user", "content": message.text})

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
     messages=messages       
    )
    return {"reply": response.choices[0].message.content}