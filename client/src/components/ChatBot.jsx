import React, { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiX, FiSend } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { auditAPI, projectAPI, aiAPI } from '../services/api';

export default function ChatBot() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, type: 'bot', text: `Hello ${user?.name || 'there'}! I'm UrbanBot. I'm connected to the live database. Ask me about any ward!` }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    
    // Live data state
    const [liveData, setLiveData] = useState({ wards: [], projects: [] });
    
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            fetchLiveStatus();
        }
    }, [messages, isOpen]);

    const fetchLiveStatus = async () => {
        try {
            const [analyticsRes, projectRes] = await Promise.all([
                auditAPI.getAnalytics(),
                projectAPI.getAll()
            ]);
            setLiveData({
                wards: analyticsRes.data.analytics.departmentSpending || [],
                projects: projectRes.data.projects || []
            });
        } catch (error) {
            console.error("ChatBot data fetch error:", error);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userMsg = { id: Date.now(), type: 'user', text: inputValue };
        setMessages(prev => [...prev, userMsg]);
        const questionText = inputValue;
        setInputValue('');
        setIsTyping(true);

        try {
            // Call the real AI backend
            const response = await aiAPI.ask({
                question: questionText,
                context: liveData
            });
            
            const botMsg = { id: Date.now() + 1, type: 'bot', text: response.data.answer };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error("AI API Error:", error);
            const errorMsg = { id: Date.now() + 1, type: 'bot', text: "Sorry, I am having trouble connecting to the AI core right now. Please try again later." };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
            {!isOpen && (
                <button className="chatbot-fab" onClick={() => setIsOpen(true)}>
                    <FiMessageSquare />
                    <span className="fab-label">Ask UrbanBot</span>
                </button>
            )}

            {isOpen && (
                <div className="chatbot-window glass-card">
                    <div className="chatbot-header">
                        <div className="bot-info">
                            <div className="bot-avatar">🤖</div>
                            <div>
                                <div className="bot-name">UrbanBot</div>
                                <div className="bot-status">Live Database Sync</div>
                            </div>
                        </div>
                        <button className="btn-icon" onClick={() => setIsOpen(false)}>
                            <FiX />
                        </button>
                    </div>

                    <div className="chatbot-messages">
                        {messages.map(msg => (
                            <div key={msg.id} className={`message-wrapper ${msg.type}`}>
                                <div className="message-bubble" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }} />
                            </div>
                        ))}
                        {isTyping && (
                            <div className="message-wrapper bot">
                                <div className="message-bubble typing">
                                    <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="chatbot-input" onSubmit={handleSend}>
                        <input
                            type="text"
                            placeholder="Ask about a ward (e.g. Koramangala)..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                        <button type="submit" disabled={!inputValue.trim()}>
                            <FiSend />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
