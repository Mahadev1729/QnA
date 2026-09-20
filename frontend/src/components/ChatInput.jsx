import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowUp,
  Loader2,
  Globe,
  Mic,
  MicOff,
  Sparkles,
  Zap,
  Brain,
  Layers,
  Cpu,
  Check,
  ChevronUp,
  Wand2,
  RotateCcw,
} from 'lucide-react';
import { polishPrompt } from '../services/api';

export const GROQ_MODELS = [
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT OSS 120B',
    tag: 'Top Pick',
    desc: 'Flagship model for deep reasoning & coding',
    badge: '120B',
    icon: Sparkles,
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT OSS 20B',
    tag: 'Fast & Smart',
    desc: 'High speed, low-latency conversational engine',
    badge: '20B',
    icon: Zap,
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B',
    tag: 'Code & Math',
    desc: 'Strong code, logic & multi-language precision',
    badge: '27B',
    icon: Brain,
  },
  {
    id: 'groq/compound',
    name: 'Groq Compound',
    tag: 'Compound AI',
    desc: 'Multi-step reasoning engine',
    badge: 'Compound',
    icon: Layers,
  },
  {
    id: 'groq/compound-mini',
    name: 'Groq Compound Mini',
    tag: 'Ultra-Fast',
    desc: 'Compact instant model for rapid chat',
    badge: 'Mini',
    icon: Cpu,
  },
];

export default function ChatInput({
  input,
  setInput,
  handleSendMessage,
  isStreaming,
  textareaRef,
  handleKeyDown,
  selectedModel = 'openai/gpt-oss-120b',
  setSelectedModel,
}) {
  const [isListening, setIsListening] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [prevPromptBackup, setPrevPromptBackup] = useState(null);
  const recognitionRef = useRef(null);
  const modelMenuRef = useRef(null);

  // Close popup menu on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target)) {
        setModelMenuOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

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

  const activeModelObj =
    GROQ_MODELS.find((m) => m.id === selectedModel) || GROQ_MODELS[0];
  const ActiveIcon = activeModelObj.icon;

  const handleSelectModel = (modelId) => {
    if (setSelectedModel) {
      setSelectedModel(modelId);
    }
    setModelMenuOpen(false);
  };

  const handlePolish = async () => {
    const trimmed = input.trim();
    if (!trimmed || isPolishing || isStreaming) return;

    setIsPolishing(true);
    try {
      const data = await polishPrompt(trimmed);
      if (data && data.polished_prompt) {
        setPrevPromptBackup(trimmed);
        setInput(data.polished_prompt);
      }
    } catch (err) {
      console.warn('Failed to polish prompt:', err);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleUndoPolish = () => {
    if (prevPromptBackup !== null) {
      setInput(prevPromptBackup);
      setPrevPromptBackup(null);
    }
  };

  const handleSend = () => {
    setPrevPromptBackup(null);
    handleSendMessage();
  };

  return (
    <div className="input-section">
      <div className={`input-box-wrapper-chatgpt ${isListening ? 'listening-glow' : ''}`}>
        <textarea
          ref={textareaRef}
          className="input-textarea-chatgpt"
          placeholder={isListening ? 'Listening to your voice... (speak now)' : `Ask QuickAnswer (${activeModelObj.name})...`}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          id="chat-input-textarea"
        />
        <div className="input-bottom-bar-chatgpt">
          <div className="input-left-controls">
            {/* Real-Time Model Selector in Input Box */}
            <div className="input-model-selector-wrapper" ref={modelMenuRef}>
              <button
                type="button"
                className={`input-model-pill ${modelMenuOpen ? 'active' : ''}`}
                onClick={() => setModelMenuOpen((prev) => !prev)}
                aria-expanded={modelMenuOpen}
                title="Select AI Model for this message"
              >
                <ActiveIcon size={13} color="var(--primary)" />
                <span className="input-model-name">{activeModelObj.name}</span>
                <ChevronUp
                  size={12}
                  color="var(--text-dim)"
                  className={`input-model-chevron ${modelMenuOpen ? 'rotated' : ''}`}
                />
              </button>

              {modelMenuOpen && (
                <div className="input-model-popup-menu">
                  <div className="input-model-popup-header">
                    <span>Active Engine</span>
                    <span className="input-model-live-tag">
                      <Globe size={11} /> Web Grounded
                    </span>
                  </div>
                  <div className="input-model-list">
                    {GROQ_MODELS.map((model) => {
                      const Icon = model.icon;
                      const isSelected = model.id === activeModelObj.id;
                      return (
                        <div
                          key={model.id}
                          className={`input-model-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelectModel(model.id)}
                        >
                          <div className="input-model-item-icon">
                            <Icon size={14} />
                          </div>
                          <div className="input-model-item-details">
                            <div className="input-model-item-title-row">
                              <span className="input-model-item-name">{model.name}</span>
                              <span className="input-model-item-badge">{model.tag}</span>
                            </div>
                            <p className="input-model-item-desc">{model.desc}</p>
                          </div>
                          {isSelected && (
                            <div className="input-model-item-check">
                              <Check size={14} color="var(--primary)" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="input-tool-pill" title="Live Google Search grounding enabled">
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
            {/* 1-Click Undo Polish Button */}
            {prevPromptBackup !== null && (
              <button
                type="button"
                className="undo-polish-btn"
                onClick={handleUndoPolish}
                title="Undo AI polish & revert to previous text"
                aria-label="Undo prompt polish"
              >
                <RotateCcw size={12} />
                <span>Undo</span>
              </button>
            )}

            {/* 1-Click Prompt Polisher (Magic Wand) */}
            <button
              type="button"
              className={`wand-polish-btn ${isPolishing ? 'polishing' : ''}`}
              onClick={handlePolish}
              disabled={!input.trim() || isPolishing || isStreaming}
              title="Polish & optimize your prompt with AI (Magic Wand)"
              aria-label="Polish prompt"
            >
              {isPolishing ? (
                <Loader2 size={15} className="animate-spin text-purple-400" />
              ) : (
                <Wand2 size={15} />
              )}
            </button>

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
              onClick={handleSend}
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
