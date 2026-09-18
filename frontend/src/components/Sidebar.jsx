import React from 'react';
import {
  SquarePen,
  Trash2,
  PanelLeftClose,
  MessageSquare,
  LogOut,
  Sparkles,
} from 'lucide-react';

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
    <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      {/* Top Header */}
      <div className="sidebar-header">
        <div className="sidebar-top-actions">
          <div className="brand-wrapper" onClick={startNewChat}>
            <div className="brand-icon-chatgpt">
              <Sparkles size={16} />
            </div>
            <span className="brand-name-chatgpt">QuickAnswer</span>
          </div>
          <button
            className="icon-btn-ghost"
            onClick={() => setSidebarOpen(false)}
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <button className="new-chat-btn-chatgpt" onClick={startNewChat} id="btn-new-chat">
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

      {/* User Profile / Bottom */}
      {currentUser && (
        <div className="user-profile-bar" onClick={handleLogout} title="Click to Sign Out">
          <div className="user-profile-info">
            <div className="user-avatar-initial">
              {currentUser.username ? currentUser.username[0].toUpperCase() : 'U'}
            </div>
            <div className="user-details">
              <div className="user-name">{currentUser.username || 'User'}</div>
              <div className="user-email">{currentUser.email}</div>
            </div>
          </div>
          <LogOut size={15} color="var(--text-dim)" />
        </div>
      )}
    </aside>
  );
}
