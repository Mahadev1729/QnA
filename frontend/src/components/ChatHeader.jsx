import React from 'react';
import { Menu } from 'lucide-react';

export default function ChatHeader({
  activeConversation,
  sidebarOpen,
  setSidebarOpen,
}) {
  return (
    <header className="chat-header">
      <div className="header-left">
        <button
          className="icon-btn mobile-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation"
        >
          <Menu size={16} />
        </button>
        <span className="current-thread-title">
          {activeConversation?.title || 'QuickAnswer'}
        </span>
      </div>
    </header>
  );
}
