import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, Loader2, Globe, Mic, MicOff } from 'lucide-react';

export default function ChatInput({
  input,
  setInput,
  handleSendMessage,
  isStreaming,
  textareaRef,
  handleKeyDown,
}) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check Web Speech API availability
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput((prev) => {
            const separator = prev && !prev.endsWith(' ') ? ' ' : '';
            return prev + separator + transcript;
          });
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [setInput]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start recognition:', err);
      }
    }
  };

  return (
    <div className="input-section">
      <div className={`input-box-wrapper-chatgpt ${isListening ? 'listening-glow' : ''}`}>
        <textarea
          ref={textareaRef}
          className="input-textarea-chatgpt"
          placeholder={isListening ? 'Listening to your voice... (speak now)' : 'Message QuickAnswer...'}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          id="chat-input-textarea"
        />
        <div className="input-bottom-bar-chatgpt">
          <div className="input-left-controls">
            <div className="input-tool-pill">
              <Globe size={13} color="var(--accent-cyan)" />
              <span>Search</span>
            </div>
            {isListening && (
              <span className="listening-badge">
                <span className="recording-dot"></span>
                <span>Listening...</span>
              </span>
            )}
          </div>

          <div className="input-right-controls">
            {/* Voice Dictation Button */}
            <button
              type="button"
              className={`mic-btn ${isListening ? 'active' : ''}`}
              onClick={toggleListening}
              title={isListening ? 'Stop recording voice' : 'Dictate with voice'}
              aria-label="Voice input"
              disabled={isStreaming}
            >
              {isListening ? (
                <MicOff size={16} color="#ef4444" />
              ) : (
                <Mic size={16} color="var(--text-dim)" />
              )}
            </button>

            {/* Send Button */}
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
      </div>
      <div className="input-disclaimer">
        QuickAnswer can make mistakes. Verify critical facts and web citations.
      </div>
    </div>
  );
}
