import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, User, Search, Globe, AlertCircle, Copy, Check } from 'lucide-react';
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

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
                    {!isStreaming && msg.content && (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                        <button
                          className="icon-btn-ghost"
                          style={{ width: '28px', height: '28px', padding: '4px' }}
                          title="Copy response"
                          onClick={() => handleCopy(msg.id, msg.content)}
                        >
                          {copiedId === msg.id ? (
                            <Check size={14} color="var(--primary)" />
                          ) : (
                            <Copy size={14} />
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
