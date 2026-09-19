import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import {
  getConversations,
  createConversation,
  getChatDetails,
  deleteConversation,
  streamChat,
  login,
  loginWithGoogle,
  register,
  getMe,
  setAuthToken,
} from './services/api';

import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import ChatHeader from './components/ChatHeader';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Chat State
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    checkUserSession();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusMessage, isStreaming]);

  const checkUserSession = async () => {
    setAuthLoading(true);
    try {
      const user = await getMe();
      if (user) {
        setCurrentUser(user);
        await loadUserConversations();
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const loadUserConversations = async () => {
    try {
      const convos = await getConversations();
      setConversations(convos || []);
      if (convos && convos.length > 0) {
        selectChat(convos[0].id);
      } else {
        startNewChat();
      }
    } catch (err) {
      console.error('Failed to load user conversations:', err);
      setConversations([]);
      startNewChat();
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthSubmitting(true);

    try {
      if (authMode === 'register') {
        if (!authUsername.trim()) {
          throw new Error('Please enter a username');
        }
        await register(authEmail, authUsername, authPassword);
        // Switch to login mode and ask user to sign in
        setAuthMode('login');
        setAuthPassword('');
        setAuthSuccess('Account created successfully! Please sign in with your credentials.');
      } else {
        const res = await login(authEmail, authPassword);
        setCurrentUser(res.user);
        setAuthPassword('');
        setAuthEmail('');
        setAuthUsername('');
        setAuthSuccess('');
        await loadUserConversations();
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleGoogleLogin = async (credential) => {
    setAuthError('');
    setAuthSuccess('');
    setAuthSubmitting(true);
    try {
      const res = await loginWithGoogle(credential);
      setCurrentUser(res.user);
      setAuthPassword('');
      setAuthEmail('');
      setAuthUsername('');
      setAuthSuccess('');
      await loadUserConversations();
    } catch (err) {
      setAuthError(err.message || 'Google sign-in failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setConversations([]);
    setMessages([]);
    setActiveChatId(null);
  };

  const selectChat = async (chatId) => {
    setActiveChatId(chatId);
    setErrorMessage('');
    setSidebarOpen(false);
    try {
      const details = await getChatDetails(chatId);
      setMessages(details.messages || []);
    } catch (err) {
      console.error('Failed to load chat:', err);
      setMessages([]);
    }
  };

  const startNewChat = async () => {
    const newChatId = crypto.randomUUID ? crypto.randomUUID() : 'chat_' + Date.now();
    try {
      const newConvo = await createConversation(newChatId, 'New Conversation');
      setConversations((prev) => [newConvo, ...prev.filter((c) => c.id !== newChatId)]);
      setActiveChatId(newChatId);
      setMessages([]);
      setErrorMessage('');
      setSidebarOpen(false);
    } catch (err) {
      console.error('Failed to create new chat:', err);
      setActiveChatId(newChatId);
      setMessages([]);
    }
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    try {
      await deleteConversation(chatId);
      const updated = conversations.filter((c) => c.id !== chatId);
      setConversations(updated);

      if (activeChatId === chatId) {
        if (updated.length > 0) {
          selectChat(updated[0].id);
        } else {
          startNewChat();
        }
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const handleSendMessage = async (customPrompt) => {
    const text = (customPrompt || input).trim();
    if (!text || isStreaming) return;

    setInput('');
    setErrorMessage('');
    setStatusMessage('');

    let currentChatId = activeChatId;
    if (!currentChatId) {
      currentChatId = crypto.randomUUID ? crypto.randomUUID() : 'chat_' + Date.now();
      setActiveChatId(currentChatId);
    }

    const userMsg = {
      id: Date.now(),
      chat_id: currentChatId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Proactively update the sidebar conversation title from "New Conversation" immediately
    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentChatId &&
        (!c.title || c.title === 'New Conversation' || c.title === 'New chat')
          ? {
              ...c,
              title:
                text.length > 32
                  ? text.substring(0, 30).trim() + '...'
                  : text.trim(),
            }
          : c
      )
    );

    const assistantMsgId = Date.now() + 1;
    const assistantPlaceholder = {
      id: assistantMsgId,
      chat_id: currentChatId,
      role: 'assistant',
      content: '',
      sources: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantPlaceholder]);
    setIsStreaming(true);

    let accumulatedContent = '';

    await streamChat({
      chatId: currentChatId,
      message: text,
      onToken: (token) => {
        accumulatedContent += token;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: accumulatedContent } : msg
          )
        );
      },
      onStatus: (status) => {
        setStatusMessage(status);
      },
      onDone: (doneData) => {
        setStatusMessage('');
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: doneData.full_content || accumulatedContent,
                  sources: doneData.sources || [],
                }
              : msg
          )
        );
        getConversations().then(setConversations).catch(console.error);
      },
      onError: (err) => {
        setStatusMessage('');
        setIsStreaming(false);
        setErrorMessage(err || 'Failed to generate response.');
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMsgId));
      },
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <Loader2 size={32} className="animate-spin" color="var(--primary)" />
      </div>
    );
  }

  // Not Logged In -> Auth Screen
  if (!currentUser) {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authUsername={authUsername}
        setAuthUsername={setAuthUsername}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authError={authError}
        setAuthError={setAuthError}
        authSuccess={authSuccess}
        setAuthSuccess={setAuthSuccess}
        authSubmitting={authSubmitting}
        handleAuthSubmit={handleAuthSubmit}
        handleGoogleLogin={handleGoogleLogin}
      />
    );
  }

  const activeConversation = conversations.find((c) => c.id === activeChatId);

  return (
    <div className="app-container">
      {/* Sidebar Component */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        conversations={conversations}
        activeChatId={activeChatId}
        selectChat={selectChat}
        startNewChat={startNewChat}
        handleDeleteChat={handleDeleteChat}
        currentUser={currentUser}
        handleLogout={handleLogout}
      />

      {/* Main Chat Workspace */}
      <main className="main-chat">
        <ChatHeader
          activeConversation={activeConversation}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <MessageList
          messages={messages}
          statusMessage={statusMessage}
          isStreaming={isStreaming}
          errorMessage={errorMessage}
          handleSendMessage={handleSendMessage}
          messagesEndRef={messagesEndRef}
        />

        <ChatInput
          input={input}
          setInput={setInput}
          handleSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          textareaRef={textareaRef}
          handleKeyDown={handleKeyDown}
        />
      </main>
    </div>
  );
}
