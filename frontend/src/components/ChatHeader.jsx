import React from 'react';
import { PanelLeftOpen, PanelLeftClose, Sparkles, SquarePen } from 'lucide-react';

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
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
        </button>

        <div className="header-brand-pill">
          <Sparkles size={14} color="var(--primary)" />
          <span className="brand-name">QuickAnswer</span>
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
            title={`${currentUser.username || 'User'} (Click to Sign Out)`}
          >
            <div className="header-user-avatar-wrapper">
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.username || 'User'}
                  className="header-user-avatar-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <div
                className="header-user-avatar"
                style={{ display: currentUser.avatar_url ? 'none' : 'flex' }}
              >
                {currentUser.username ? currentUser.username[0].toUpperCase() : 'U'}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
