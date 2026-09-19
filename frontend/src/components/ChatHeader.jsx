import React, { useState, useRef, useEffect } from 'react';
import {
  PanelLeftOpen,
  PanelLeftClose,
  ChevronDown,
  Sparkles,
  SquarePen,
  Check,
  Zap,
  Brain,
  Cpu,
  BookOpen,
  Layers,
  Globe,
} from 'lucide-react';

export const GROQ_MODELS = [
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT OSS 120B',
    tag: 'Top Pick',
    desc: 'High-capacity flagship model for complex reasoning and coding',
    badge: '120B Flagship',
    icon: Sparkles,
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT OSS 20B',
    tag: 'Fast & Smart',
    desc: 'Ultra-fast low-latency responses for quick Q&A',
    badge: '20B Fast',
    icon: Zap,
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B',
    tag: 'Code & Logic',
    desc: 'Specialized for coding, math, and multi-language reasoning',
    badge: 'Coding & Math',
    icon: Brain,
  },
  {
    id: 'groq/compound',
    name: 'Groq Compound',
    tag: 'Compound AI',
    desc: "Groq's multi-step compound reasoning engine",
    badge: 'Multi-Step',
    icon: Layers,
  },
  {
    id: 'groq/compound-mini',
    name: 'Groq Compound Mini',
    tag: 'Ultra-Fast',
    desc: 'Compact, instant inference for real-time chatting',
    badge: 'Ultra Mini',
    icon: Cpu,
  },
];

export default function ChatHeader({
  activeConversation,
  sidebarOpen,
  setSidebarOpen,
  startNewChat,
  currentUser,
  handleLogout,
  selectedModel = 'openai/gpt-oss-120b',
  setSelectedModel,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const activeModelObj =
    GROQ_MODELS.find((m) => m.id === selectedModel) || GROQ_MODELS[0];
  const ActiveIcon = activeModelObj.icon;

  const handleSelectModel = (modelId) => {
    if (setSelectedModel) {
      setSelectedModel(modelId);
    }
    setDropdownOpen(false);
  };

  return (
    <header className="chat-header">
      <div className="header-left">
        <button
          className="icon-btn-ghost sidebar-toggle-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
        </button>

        {/* Interactive Model Selector Dropdown */}
        <div className="model-selector-container" ref={dropdownRef}>
          <button
            type="button"
            className={`model-selector-pill ${dropdownOpen ? 'active' : ''}`}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            title="Switch Groq AI Model"
          >
            <ActiveIcon size={14} color="var(--primary)" />
            <span className="model-name">{activeModelObj.name}</span>
            <span className="model-badge">{activeModelObj.badge}</span>
            <ChevronDown
              size={13}
              color="var(--text-dim)"
              className={`model-chevron ${dropdownOpen ? 'rotated' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="model-dropdown-menu">
              <div className="model-dropdown-header">
                <span>Select Groq LLM Engine</span>
                <span className="model-search-note">
                  <Globe size={11} /> + Live Web Search
                </span>
              </div>
              <div className="model-list">
                {GROQ_MODELS.map((model) => {
                  const Icon = model.icon;
                  const isSelected = model.id === activeModelObj.id;
                  return (
                    <div
                      key={model.id}
                      className={`model-option-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectModel(model.id)}
                    >
                      <div className="model-option-icon">
                        <Icon size={16} />
                      </div>
                      <div className="model-option-details">
                        <div className="model-option-title-row">
                          <span className="model-option-name">{model.name}</span>
                          <span className="model-option-tag">{model.tag}</span>
                        </div>
                        <p className="model-option-desc">{model.desc}</p>
                      </div>
                      {isSelected && (
                        <div className="model-selected-check">
                          <Check size={16} color="var(--primary)" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        {startNewChat && (
          <button
            className="icon-btn-ghost header-new-chat-btn"
            onClick={startNewChat}
            title="Start new chat"
            aria-label="New chat"
          >
            <SquarePen size={18} />
          </button>
        )}

        {currentUser && (
          <div
            className="header-user-badge"
            onClick={handleLogout}
            title="Click to Sign Out"
          >
            <div className="header-user-avatar">
              {currentUser.username ? currentUser.username[0].toUpperCase() : 'U'}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
