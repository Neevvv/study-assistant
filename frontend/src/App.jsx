import { useState, useRef, useEffect } from "react"

const BACKEND = "https://study-assistant-backend-hdnx.onrender.com"

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState("General")
  const [chats, setChats] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const [copied, setCopied] = useState(null)
  const [notes, setNotes] = useState("")
  const [showNotes, setShowNotes] = useState(false)
  const bottomRef = useRef(null)

  // Load chats from database on startup
  useEffect(() => {
    fetchChats()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const fetchChats = async () => {
    try {
      const response = await fetch(`${BACKEND}/chats`)
      const data = await response.json()
      setChats(data.chats)
    } catch (error) {
      console.log("Error fetching chats:", error)
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage = { role: "user", text: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setLoading(true)

    const history = messages.map(msg => ({
      role: msg.role === "ai" ? "assistant" : "user",
      content: msg.text
    }))

    const response = await fetch(`${BACKEND}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: input,
        history: history,
        subject: subject,
        notes: notes,
        chat_id: currentChatId,
        title: input.slice(0, 40)
      })
    })

    const data = await response.json()
    const aiMessage = { role: "ai", text: data.reply }
    setMessages(prev => [...prev, aiMessage])
    setCurrentChatId(data.chat_id)
    setLoading(false)
    fetchChats()
  }

  const startNewChat = () => {
    setMessages([])
    setCurrentChatId(null)
    setInput("")
    setNotes("")
    setShowNotes(false)
  }

  const loadChat = async (chat) => {
    try {
      const response = await fetch(`${BACKEND}/chats/${chat.id}`)
      const data = await response.json()
      const formattedMessages = data.messages.map(msg => ({
        role: msg.role === "assistant" ? "ai" : "user",
        text: msg.content
      }))
      setMessages(formattedMessages)
      setCurrentChatId(chat.id)
      setSubject(chat.subject)
    } catch (error) {
      console.log("Error loading chat:", error)
    }
  }

  const deleteChat = async (e, chatId) => {
    e.stopPropagation()
    await fetch(`${BACKEND}/chats/${chatId}`, { method: "DELETE" })
    if (currentChatId === chatId) startNewChat()
    fetchChats()
  }

  const copyText = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopied(index)
    setTimeout(() => setCopied(null), 2000)
  }

  const uploadPDF = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append("file", file)
    try {
      const response = await fetch(`${BACKEND}/upload-pdf`, {
        method: "POST",
        body: formData
      })
      const data = await response.json()
      if (!data.text || data.text.trim() === "") {
        alert("This PDF appears to be scanned and can't be read automatically. Please copy and paste the text into the notes box instead.")
        return
      }
      setNotes(data.text)
      setShowNotes(true)
    } catch (error) {
      console.log("Error:", error)
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0f0f0f", color: "white", fontFamily: "Inter, sans-serif" }}>

      {/* Sidebar */}
      <div style={{ width: "260px", borderRight: "1px solid #222", display: "flex", flexDirection: "column", padding: "16px", gap: "8px" }}>
        <button
          onClick={startNewChat}
          style={{ padding: "10px", borderRadius: "8px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "14px", marginBottom: "8px" }}
        >
          + New Chat
        </button>
        <div style={{ fontSize: "11px", color: "#444", textTransform: "uppercase", letterSpacing: "1px", padding: "4px 0" }}>Previous Chats</div>
        <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
          {chats.length === 0 && (
            <div style={{ color: "#444", fontSize: "13px", textAlign: "center", marginTop: "20px" }}>No chats yet</div>
          )}
          {chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => loadChat(chat)}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                background: currentChatId === chat.id ? "#1e1e2e" : "transparent",
                border: currentChatId === chat.id ? "1px solid #333" : "1px solid transparent",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "13px", color: "#ccc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chat.title}</div>
                <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{chat.subject}</div>
              </div>
              <button
                onClick={(e) => deleteChat(e, chat.id)}
                style={{ background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: "16px", padding: "0 4px", flexShrink: 0 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: "8px" }}></div>
            <span style={{ fontWeight: "600", fontSize: "18px" }}>Study Assistant</span>
          </div>
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #333", background: "#1a1a1a", color: "white", fontSize: "14px", cursor: "pointer" }}
          >
            <option>General</option>
            <option>Mathematics</option>
            <option>Science</option>
            <option>History</option>
            <option>English</option>
            <option>Computer Science</option>
          </select>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "#444", marginTop: "80px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📚</div>
              <div style={{ fontSize: "20px", fontWeight: "600", color: "#666" }}>What do you want to learn today?</div>
              <div style={{ fontSize: "14px", color: "#444", marginTop: "8px" }}>Select a subject and start asking questions</div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              {msg.role === "ai" && (
                <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: "6px", marginRight: "10px", flexShrink: 0, marginTop: "4px" }}></div>
              )}
              <div style={{ maxWidth: "70%" }}>
                <div style={{
                  padding: "12px 16px",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === "user" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#1a1a1a",
                  color: "white",
                  fontSize: "15px",
                  lineHeight: "1.5",
                  border: msg.role === "ai" ? "1px solid #222" : "none"
                }}>
                  {msg.text}
                </div>
                {msg.role === "ai" && (
                  <button
                    onClick={() => copyText(msg.text, i)}
                    style={{ marginTop: "6px", padding: "4px 10px", borderRadius: "6px", background: "transparent", border: "1px solid #333", color: "#666", fontSize: "12px", cursor: "pointer" }}
                  >
                    {copied === i ? "Copied!" : "Copy"}
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: "6px" }}></div>
              <div style={{ background: "#1a1a1a", border: "1px solid #222", padding: "12px 16px", borderRadius: "18px 18px 18px 4px" }}>
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: "6px", height: "6px", borderRadius: "50%", background: "#6366f1",
                      animation: "bounce 1.2s infinite",
                      animationDelay: `${i * 0.2}s`
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Notes Panel */}
        {showNotes && (
          <div style={{ padding: "0 24px 16px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <label style={{ padding: "6px 12px", borderRadius: "8px", background: "#1e1e2e", border: "1px solid #333", color: "#6366f1", fontSize: "13px", cursor: "pointer" }}>
                📎 Upload PDF
                <input type="file" accept=".pdf" onChange={uploadPDF} style={{ display: "none" }} />
              </label>
              <span style={{ color: "#444", fontSize: "13px" }}>or paste notes below</span>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Paste your notes here... The AI will use them to answer your questions."
              style={{ width: "100%", height: "150px", background: "#1a1a1a", border: "1px solid #333", borderRadius: "12px", color: "white", padding: "12px", fontSize: "14px", resize: "vertical", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        )}

        {/* Input */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #222" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "#1a1a1a", border: "1px solid #333", borderRadius: "12px", padding: "8px 8px 8px 16px" }}>
            <input
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "white", fontSize: "15px", padding: "6px 0" }}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Ask anything..."
            />
            <button
              onClick={() => setShowNotes(!showNotes)}
              style={{ padding: "8px 12px", borderRadius: "8px", background: showNotes ? "#1e1e2e" : "transparent", border: "1px solid #333", color: showNotes ? "#6366f1" : "#666", fontSize: "13px", cursor: "pointer" }}
            >
              📄 Notes
            </button>
            <button
              onClick={sendMessage}
              style={{ padding: "8px 20px", borderRadius: "8px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}
            >
              Send
            </button>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>

    </div>
  )
}

export default App