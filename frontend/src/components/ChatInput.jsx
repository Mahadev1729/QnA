import React from 'react';
import { Send, Loader2 } from 'lucide-react';

export default function ChatInput({
  input,
  setInput,
  handleSendMessage,
  isStreaming,
  textareaRef,
  handleKeyDown,
}) {
  return (
    <div className="input-section">
      <div className="input-box-wrapper">
        <textarea
          ref={textareaRef}
          className="input-textarea"
          placeholder="Ask a question or explore fresh ideas..."
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          id="chat-input-textarea"
        />
        <div className="input-bottom-bar">
          <button
            className="send-btn"
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isStreaming}
            id="btn-send-message"
            aria-label="Send message"
          >
            {isStreaming ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
