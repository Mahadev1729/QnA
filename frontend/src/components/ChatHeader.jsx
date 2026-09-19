import React from 'react';
import { PanelLeftOpen, PanelLeftClose, ChevronDown, Sparkles, SquarePen, LogOut } from 'lucide-react';

export default function ChatHeader({
  activeConversation,
  sidebarOpen,
  setSidebarOpen,
  startNewChat,
  currentUser,
  handleLogout,
}) {
  return (
    <header className="chat-header">
      <div className="header-left">
        <button
          className="icon-btn-ghost sidebar-toggle-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
        </button>

        <div className="model-selector-pill">
          <Sparkles size={14} color="var(--primary)" />
          <span className="model-name">QuickAnswer</span>
          <span className="model-badge">Groq + Search</span>
          <ChevronDown size={13} color="var(--text-dim)" />
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
          <div className="header-user-badge" onClick={handleLogout} title="Click to Sign Out">
            <div className="header-user-avatar">
              {currentUser.username ? currentUser.username[0].toUpperCase() : 'U'}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
