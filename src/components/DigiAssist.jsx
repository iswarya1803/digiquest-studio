import React, { useState, useRef, useEffect } from 'react';
import { MessageSquareCode, Send, X, Bot } from 'lucide-react';

export default function DigiAssist({ activeProject }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { 
      sender: 'bot', 
      text: "Hello! I am DigiAssist, your DigiQuest Studio automation assistant. How can I help you today? You can ask me about project statuses, delivery dates, or how to submit approval and revision requests." 
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickReplies = [
    { label: "Project Status", text: "What is my project status?" },
    { label: "Delivery Date", text: "When is delivery?" },
    { label: "Approval Guide", text: "How do I approve the project?" },
    { label: "Request Changes", text: "How do I request changes?" }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const text = textToSend || query;
    if (!text.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text }]);
    if (!textToSend) setQuery('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://digiquest-studio.onrender.com/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          query: text,
          projectId: activeProject?.id || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { sender: 'bot', text: data.response }]);
      } else {
        const err = await res.json();
        setMessages(prev => [...prev, { sender: 'bot', text: `Error: ${err.error || 'Server error'}` }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'bot', text: "Sorry, I am having trouble connecting to the server. Please verify your connection." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot-bubble">
      {/* Trigger Button */}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="chatbot-trigger pulse-glow">
          <MessageSquareCode size={18} />
          <span>DigiAssist AI</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window glass-panel animate-fade-in">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-header-icon">
                <Bot size={16} />
              </div>
              <div>
                <h4 className="chatbot-header-title">DigiAssist</h4>
                <div className="chatbot-status">
                  <span className="chatbot-status-dot animate-pulse"></span>
                  <span>Assistant Online</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="chatbot-close">
              <X size={16} />
            </button>
          </div>

          {/* Messages Body */}
          <div className="chatbot-messages">
            {messages.map((m, index) => (
              <div key={index} className={`chat-msg ${m.sender === 'user' ? 'user' : 'bot'}`}>
                {m.sender === 'bot' && (
                  <div className="chat-msg-avatar">AI</div>
                )}
                <div className="chat-msg-text">
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg bot">
                <div className="chat-msg-avatar">AI</div>
                <div className="chat-msg-text" style={{ color: 'var(--text-muted)' }}>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          <div className="chatbot-quick-chips">
            {quickReplies.map((qr, i) => (
              <button key={i} onClick={() => handleSend(qr.text)} className="chatbot-chip">
                {qr.label}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="chatbot-footer"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              className="chatbot-input"
            />
            <button type="submit" disabled={!query.trim() || loading} className="chatbot-send-btn">
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
