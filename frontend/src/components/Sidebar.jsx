import React from 'react';
import { MessageSquare, Plus, Trash2, X, LogOut } from 'lucide-react';

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
  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">Q</div>
          <div className="brand-title">QuickAnswer</div>
        </div>
        <button
          className="icon-btn mobile-menu-btn"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <X size={16} />
        </button>
      </div>

      {/* New Chat Action */}
      <div className="sidebar-actions">
        <button className="new-chat-btn" onClick={startNewChat} id="btn-new-chat">
          <Plus size={15} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Conversation Threads */}
      <div className="chat-list-section">
        {conversations.length === 0 ? (
          <div style={{ padding: '16px 12px', fontSize: '13px', color: 'var(--text-dim)' }}>
            No chats yet
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              className={`chat-item ${conv.id === activeChatId ? 'active' : ''}`}
              onClick={() => selectChat(conv.id)}
            >
              <div className="chat-item-content">
                <MessageSquare size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
                <span className="chat-item-title">{conv.title || 'New Conversation'}</span>
              </div>
              <button
                className="delete-chat-btn"
                title="Delete chat"
                onClick={(e) => handleDeleteChat(e, conv.id)}
              >
                <Trash2 size={13} />
              </button>
            </button>
          ))
        )}
      </div>

      {/* User Profile Bar */}
      {currentUser && (
        <div className="user-profile-bar">
          <div className="user-profile-info">
            <div className="user-avatar-initial">
              {currentUser.username ? currentUser.username[0].toUpperCase() : 'U'}
            </div>
            <div className="user-details">
              <div className="user-name">{currentUser.username || 'User'}</div>
              <div className="user-email">{currentUser.email}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Sign Out">
            <LogOut size={15} />
          </button>
        </div>
      )}
    </aside>
  );
}
