import React from 'react';
import { PanelLeftOpen, ChevronDown, Sparkles } from 'lucide-react';

export default function ChatHeader({
  activeConversation,
  sidebarOpen,
  setSidebarOpen,
}) {
  return (
    <header className="chat-header">
      <div className="header-left">
        {!sidebarOpen && (
          <button
            className="icon-btn-ghost"
            onClick={() => setSidebarOpen(true)}
            title="Open sidebar"
            aria-label="Open sidebar"
          >
            <PanelLeftOpen size={18} />
          </button>
        )}
        <div className="model-selector-pill">
          <span>QuickAnswer</span>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 'normal', background: 'var(--bg-surface-hover)', padding: '2px 6px', borderRadius: '4px' }}>
            Groq + Search
          </span>
          <ChevronDown size={14} color="var(--text-dim)" />
        </div>
      </div>
    </header>
  );
}
