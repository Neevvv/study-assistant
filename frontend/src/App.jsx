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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => { fetchChats() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const fetchChats = async () => {
    try {
      const res = await fetch(`${BACKEND}/chats`)
      const data = await res.json()
      setChats(data.chats)
    } catch (e) { console.log(e) }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userText = input
    const userMessage = { role: "user", text: userText }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setLoading(true)

    const history = messages.map(msg => ({
      role: msg.role === "ai" ? "assistant" : "user",
      content: msg.text
    }))

    try {
      const res = await fetch(`${BACKEND}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: userText,
          history,
          subject,
          notes,
          chat_id: currentChatId,
          title: userText.slice(0, 40)
        })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: "ai", text: data.reply || "Something went wrong." }])
      setCurrentChatId(data.chat_id)
      fetchChats()
    } catch (e) {
      setMessages(prev => [...prev, { role: "ai", text: "Error connecting to server." }])
    }
    setLoading(false)
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
      const res = await fetch(`${BACKEND}/chats/${chat.id}`)
      const data = await res.json()
      setMessages(data.messages.map(msg => ({
        role: msg.role === "assistant" ? "ai" : "user",
        text: msg.content
      })))
      setCurrentChatId(chat.id)
      setSubject(chat.subject)
    } catch (e) { console.log(e) }
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
      const res = await fetch(`${BACKEND}/upload-pdf`, { method: "POST", body: formData })
      const data = await res.json()
      if (!data.text || data.text.trim() === "") {
        alert("This PDF appears to be scanned. Please paste the text manually.")
        return
      }
      setNotes(data.text)
      setShowNotes(true)
    } catch (e) { console.log(e) }
  }

  return (
    <div className="flex h-screen bg-[#212121] text-white font-sans">

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 bg-[#171717] flex flex-col py-3 px-2 gap-1">
          <button
            onClick={startNewChat}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#2a2a2a] text-sm text-gray-300 transition-colors mb-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            New chat
          </button>

          <div className="text-xs text-gray-500 px-3 py-1 mt-2">Previous chats</div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-0.5">
            {chats.length === 0 && (
              <div className="text-xs text-gray-600 text-center mt-4">No chats yet</div>
            )}
            {chats.map(chat => (
              <div
                key={chat.id}
                onClick={() => loadChat(chat)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors group ${currentChatId === chat.id ? "bg-[#2a2a2a]" : "hover:bg-[#2a2a2a]"}`}
              >
                <span className="truncate text-gray-300">{chat.title}</span>
                <button
                  onClick={(e) => deleteChat(e, chat.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 ml-2 flex-shrink-0"
                >×</button>
              </div>
            ))}
          </div>

          {/* Subject selector in sidebar */}
          <div className="px-2 pt-2 border-t border-[#2a2a2a]">
            <select
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full bg-[#2a2a2a] text-gray-300 text-sm rounded-lg px-3 py-2 border border-[#333] outline-none cursor-pointer"
            >
              <option>General</option>
              <option>Mathematics</option>
              <option>Science</option>
              <option>History</option>
              <option>English</option>
              <option>Computer Science</option>
            </select>
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span className="text-sm font-medium text-gray-300">Study Assistant</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="text-4xl">📚</div>
              <h1 className="text-2xl font-semibold text-gray-200">What do you want to learn?</h1>
              <p className="text-gray-500 text-sm">Select a subject from the sidebar and start asking</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "ai" && (
                    <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-xs font-bold">AI</span>
                    </div>
                  )}
                  <div className={`max-w-[80%] ${msg.role === "user" ? "bg-[#2f2f2f] rounded-3xl px-5 py-3" : ""}`}>
                    <p className="text-gray-100 text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    {msg.role === "ai" && (
                      <button
                        onClick={() => copyText(msg.text, i)}
                        className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {copied === i ? "Copied!" : "Copy"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold">AI</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Notes panel */}
        {showNotes && (
          <div className="max-w-3xl mx-auto w-full px-4 pb-2">
            <div className="bg-[#2f2f2f] rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs text-gray-400 cursor-pointer hover:text-gray-200 transition-colors">
                  📎 Upload PDF
                  <input type="file" accept=".pdf" onChange={uploadPDF} className="hidden" />
                </label>
                <span className="text-gray-600 text-xs">or paste below</span>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Paste your notes here..."
                className="w-full bg-transparent text-gray-300 text-sm outline-none resize-none h-24 placeholder-gray-600"
              />
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="max-w-3xl mx-auto w-full px-4 pb-6 pt-2">
          <div className="bg-[#2f2f2f] rounded-2xl flex items-end gap-2 px-4 py-3">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`text-gray-400 hover:text-white transition-colors flex-shrink-0 mb-1 ${showNotes ? "text-white" : ""}`}
              title="Add notes"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>
            <textarea
              className="flex-1 bg-transparent text-gray-100 text-sm outline-none resize-none placeholder-gray-500 max-h-40"
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = "auto"
                e.target.style.height = e.target.scrollHeight + "px"
              }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Message Study Assistant..."
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors mb-1 ${input.trim() && !loading ? "bg-white text-black hover:bg-gray-200" : "bg-[#444] text-gray-600 cursor-not-allowed"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            </button>
          </div>
          <p className="text-center text-xs text-gray-600 mt-2">Press Enter to send, Shift+Enter for new line</p>
        </div>

      </div>
    </div>
  )
}

export default App