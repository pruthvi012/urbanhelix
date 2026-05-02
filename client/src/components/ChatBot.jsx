import React, { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiX, FiSend } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { auditAPI, projectAPI } from '../services/api';

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
        setInputValue('');
        setIsTyping(true);

        // Dynamic Response Logic
        setTimeout(() => {
            let botText = "";
            const input = userMsg.text.toLowerCase();
            
            // Search for mentioned ward in live data
            const mentionedWard = liveData.wards.find(w => 
                input.includes(w.ward.toLowerCase()) || 
                input.includes(w.name.toLowerCase())
            );

            if (mentionedWard) {
                // Find projects for this ward
                const wardProjects = liveData.projects.filter(p => 
                    p.location?.ward?.toLowerCase() === mentionedWard.ward.toLowerCase() ||
                    p.department?.ward?.toLowerCase() === mentionedWard.ward.toLowerCase()
                );

                if (wardProjects.length > 0) {
                    botText = `In **${mentionedWard.ward}**, there are currently ${wardProjects.length} undergoing projects:\n` +
                              wardProjects.map(p => `• **${p.title}** (${p.status.replace('_', ' ')})`).join('\n') +
                              ` \n\nTotal allocated budget for this area: ₹${(mentionedWard.allocatedBudget/1000000).toFixed(2)}M.`;
                } else {
                    botText = `As of now, there are **no undergoing projects** in ${mentionedWard.ward}. However, the ward has a total budget of ₹${(mentionedWard.totalBudget/1000000).toFixed(2)}M available for future development.`;
                }
            } else if (input.includes('area') || input.includes('ward') || input.includes('status')) {
                const activeWards = liveData.wards.filter(w => 
                    liveData.projects.some(p => p.department?.ward === w.ward)
                );
                
                if (activeWards.length > 0) {
                    botText = `Currently, there is active work in ${activeWards.length} wards: \n` +
                              activeWards.slice(0, 5).map(w => `• ${w.ward}`).join('\n') +
                              (activeWards.length > 5 ? `\n...and ${activeWards.length - 5} more.` : "") +
                              "\n\nAsk me about a specific ward for more details!";
                } else {
                    botText = "There are currently **no undergoing projects** in any South Zone wards. The system is up to date.";
                }
            } else if (input.includes('hi') || input.includes('hello')) {
                botText = "Hello! I am UrbanBot. I monitor all 48 South Zone wards in real-time. Ask me about any specific area to see its project status!";
            } else {
                botText = "I can tell you about any of the 48 wards. For example, try asking: 'What is the status of Koramangala?' or 'Show me active projects in Jayanagar'.";
            }

            const botMsg = { id: Date.now() + 1, type: 'bot', text: botText };
            setMessages(prev => [...prev, botMsg]);
            setIsTyping(false);
        }, 1000);
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
