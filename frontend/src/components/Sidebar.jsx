import React from 'react';
import {
  SquarePen,
  Trash2,
  PanelLeftClose,
  MessageSquare,
  LogOut,
  Sparkles,
} from 'lucide-react';

export function GoogleIcon({ size = 13, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  conversations,
  activeChatId,
  selectChat,
  startNewChat,
  handleDeleteChat,
  currentUser,
  handleLogout,
}) {
  const handleItemClick = (id) => {
    selectChat(id);
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const handleNewChatClick = () => {
    startNewChat();
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      {/* Top Header */}
      <div className="sidebar-header">
        <div className="sidebar-top-actions">
          <div className="brand-wrapper" onClick={handleNewChatClick}>
            <div className="brand-icon-chatgpt">
              <Sparkles size={16} />
            </div>
            <span className="brand-name-chatgpt">QuickAnswer</span>
          </div>
          <button
            className="icon-btn-ghost close-sidebar-btn"
            onClick={() => setSidebarOpen(false)}
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <button className="new-chat-btn-chatgpt" onClick={handleNewChatClick} id="btn-new-chat">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SquarePen size={16} />
          <span>New chat</span>
        </div>
      </button>

      {/* Conversation List */}
      <div className="chat-list-section">
        {conversations.length === 0 ? (
          <div style={{ padding: '16px 14px', fontSize: '13px', color: 'var(--text-dim)' }}>
            No chat history
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`chat-item ${conv.id === activeChatId ? 'active' : ''}`}
              onClick={() => handleItemClick(conv.id)}
            >
              <div className="chat-item-content">
                <MessageSquare size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
                <span className="chat-item-title">{conv.title || 'New Conversation'}</span>
              </div>
              <button
                className="delete-chat-btn"
                title="Delete chat"
                aria-label="Delete chat"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleDeleteChat(e, conv.id);
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* User Profile / Bottom */}
      {currentUser && (
        <div className="user-profile-bar" onClick={handleLogout} title="Click to Sign Out">
          <div className="user-profile-info">
            <div className="user-avatar-wrapper">
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.username || 'User'}
                  className="user-avatar-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="user-avatar-initial">
                  {currentUser.username ? currentUser.username[0].toUpperCase() : 'U'}
                </div>
              )}
              <div className="user-avatar-badge-icon" title="Google Authenticated">
                <GoogleIcon size={10} />
              </div>
            </div>
            <div className="user-details">
              <div className="user-name">{currentUser.username || 'User'}</div>
              <div className="user-status-badge">
                <GoogleIcon size={12} />
                <span>Google Account</span>
              </div>
            </div>
          </div>
          <div className="logout-icon-btn" title="Sign Out">
            <LogOut size={15} />
          </div>
        </div>
      )}
    </aside>
  );
}
