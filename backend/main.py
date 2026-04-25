from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq
from supabase import create_client
import pdfplumber
import os
import io

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", 
                   "https://study-assistant-three-dusky.vercel.app", 
                   "https://study-assistant-neev2.vercel.app"
                ],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    text: str
    history: list = []
    subject: str = "General"
    notes: str = ""
    chat_id: str = None
    title: str = ""

@app.get("/")
def home():
    return {"message": "Study Assistant is running!"}

@app.get("/chats")
def get_chats():
    response = supabase.table("chats").select("id, title, subject, created_at").order("created_at", desc=True).execute()
    return {"chats": response.data}

@app.get("/chats/{chat_id}")
def get_chat(chat_id: str):
    response = supabase.table("chats").select("*").eq("id", chat_id).execute()
    return response.data[0]

@app.delete("/chats/{chat_id}")
def delete_chat(chat_id: str):
    supabase.table("chats").delete().eq("id", chat_id).execute()
    return {"message": "Chat deleted"}

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    contents = await file.read()
    text = ""
    with pdfplumber.open(io.BytesIO(contents)) as pdf:
        for page in pdf.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
    return {"text": text}

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
    reply = response.choices[0].message.content

    # Save to database
    new_history = list(message.history) + [
        {"role": "user", "content": message.text},
        {"role": "assistant", "content": reply}
    ]

    if message.chat_id:
        supabase.table("chats").update({"messages": new_history}).eq("id", message.chat_id).execute()
        chat_id = message.chat_id
    else:
        result = supabase.table("chats").insert({
            "title": message.title or message.text[:40],
            "subject": message.subject,
            "messages": new_history
        }).execute()
        chat_id = result.data[0]["id"]

    return {"reply": reply, "chat_id": chat_id}