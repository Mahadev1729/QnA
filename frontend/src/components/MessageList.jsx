import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Search, Globe, AlertCircle } from 'lucide-react';
import WelcomeScreen from './WelcomeScreen';

export default function MessageList({
  messages,
  statusMessage,
  isStreaming,
  errorMessage,
  handleSendMessage,
  messagesEndRef,
}) {
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
              <div className="avatar bot">
                <Bot size={15} />
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
                        <span>Sources:</span>
                        {msg.sources.map((src, i) => (
                          <span key={i} className="source-tag">
                            <Globe size={11} /> {src.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <span>{msg.content}</span>
                )}
              </div>
            </div>
            {msg.role === 'user' && (
              <div className="avatar user">
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
