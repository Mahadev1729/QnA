import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  User,
  Search,
  Globe,
  AlertCircle,
  Copy,
  Check,
  Volume2,
  VolumeX,
} from 'lucide-react';
import WelcomeScreen from './WelcomeScreen';

export default function MessageList({
  messages,
  statusMessage,
  isStreaming,
  errorMessage,
  handleSendMessage,
  messagesEndRef,
}) {
  const [copiedId, setCopiedId] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);

  useEffect(() => {
    // Cleanup speech on unmount
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const cleanTextForSpeech = (markdown) => {
    return markdown
      .replace(/```[\s\S]*?```/g, 'Code snippet omitted.') // replace code blocks
      .replace(/`([^`]+)`/g, '$1') // inline code
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // markdown links
      .replace(/[#*_\->~]/g, '') // formatting symbols
      .replace(/\n+/g, '. ')
      .trim();
  };

  const handleSpeak = (id, text) => {
    if (!window.speechSynthesis) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    if (speakingId === id) {
      // Stop speaking
      window.speechSynthesis.cancel();
      setSpeakingId(null);
    } else {
      window.speechSynthesis.cancel(); // Stop any other speech
      const cleanText = cleanTextForSpeech(text);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      utterance.onend = () => {
        setSpeakingId(null);
      };

      utterance.onerror = () => {
        setSpeakingId(null);
      };

      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="messages-container">
      {messages.length === 0 ? (
        <WelcomeScreen handleSendMessage={handleSendMessage} />
      ) : (
        messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-row ${msg.role === 'user' ? 'user' : 'assistant'}`}
          >
            {msg.role === 'assistant' && (
              <div className="avatar-chatgpt bot">
                <Sparkles size={15} />
              </div>
            )}
            <div className="message-content-wrapper">
              <div className="message-bubble">
                {msg.role === 'assistant' ? (
                  <div className="markdown-body">
                    {statusMessage && isStreaming && !msg.content && (
                      <div className="search-status-chip">
                        <Search size={12} />
                        <span>{statusMessage}</span>
                      </div>
                    )}
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                    {isStreaming && msg.content && (
                      <span className="streaming-cursor"></span>
                    )}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="sources-box">
                        <Globe size={13} color="var(--accent-cyan)" />
                        <span>Sources:</span>
                        {msg.sources.map((src, i) => (
                          <span key={i} className="source-tag">
                            {src.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Bar (Copy + Speak Aloud) */}
                    {!isStreaming && msg.content && (
                      <div className="assistant-action-bar">
                        <button
                          className="icon-btn-ghost action-btn-chatgpt"
                          title="Copy response"
                          onClick={() => handleCopy(msg.id, msg.content)}
                        >
                          {copiedId === msg.id ? (
                            <Check size={14} color="var(--primary)" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>

                        <button
                          className={`icon-btn-ghost action-btn-chatgpt ${
                            speakingId === msg.id ? 'speaking-active' : ''
                          }`}
                          title={
                            speakingId === msg.id
                              ? 'Stop reading aloud'
                              : 'Read response aloud (Text-to-Speech)'
                          }
                          onClick={() => handleSpeak(msg.id, msg.content)}
                        >
                          {speakingId === msg.id ? (
                            <VolumeX size={14} color="var(--primary)" />
                          ) : (
                            <Volume2 size={14} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <span>{msg.content}</span>
                )}
              </div>
            </div>
            {msg.role === 'user' && (
              <div className="avatar-chatgpt user">
                <User size={15} />
              </div>
            )}
          </div>
        ))
      )}

      {errorMessage && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
