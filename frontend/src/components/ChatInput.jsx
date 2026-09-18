import React from 'react';
import { ArrowUp, Loader2, Globe } from 'lucide-react';

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
      <div className="input-box-wrapper-chatgpt">
        <textarea
          ref={textareaRef}
          className="input-textarea-chatgpt"
          placeholder="Message QuickAnswer..."
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          id="chat-input-textarea"
        />
        <div className="input-bottom-bar-chatgpt">
          <div className="input-tool-pill">
            <Globe size={13} color="var(--accent-cyan)" />
            <span>Search</span>
          </div>
          <button
            className="send-btn-chatgpt"
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isStreaming}
            id="btn-send-message"
            aria-label="Send message"
          >
            {isStreaming ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowUp size={18} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
      <div className="input-disclaimer">
        QuickAnswer can make mistakes. Verify critical facts and web citations.
      </div>
    </div>
  );
}
