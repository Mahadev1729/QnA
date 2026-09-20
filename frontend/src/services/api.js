const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getAuthToken() {
  return localStorage.getItem('qa_auth_token') || '';
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('qa_auth_token', token);
  } else {
    localStorage.removeItem('qa_auth_token');
  }
}

function getAuthHeaders() {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function register(email, username, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Registration failed');
  }
  return data;
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Login failed');
  }
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function getAuthConfig() {
  try {
    const res = await fetch(`${API_BASE}/auth/config`);
    if (!res.ok) return { google_client_id: '' };
    return await res.json();
  } catch (err) {
    return { google_client_id: '' };
  }
}

export async function loginWithGoogle(credential) {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Google sign-in failed');
  }
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function getMe() {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      setAuthToken(null);
      return null;
    }
    return await res.json();
  } catch (err) {
    setAuthToken(null);
    return null;
  }
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return await res.json();
  } catch (err) {
    console.error('Health check failed', err);
    return { status: 'error', error: err.message };
  }
}

export async function getConversations() {
  const res = await fetch(`${API_BASE}/chats`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to load conversations');
  }
  return await res.json();
}

export async function createConversation(chatId, title = 'New Conversation') {
  const res = await fetch(`${API_BASE}/chats`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ chat_id: chatId, title }),
  });
  if (!res.ok) throw new Error('Failed to create conversation');
  return await res.json();
}

export async function getChatDetails(chatId) {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load chat history');
  return await res.json();
}

export async function deleteConversation(chatId) {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete conversation');
  return await res.json();
}

export async function streamChat({
  chatId,
  message,
  model,
  onToken,
  onStatus,
  onDone,
  onError,
}) {
  try {
    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        chat_id: chatId,
        message,
        model,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let errorDetail = errText;
      try {
        const parsed = JSON.parse(errText);
        errorDetail = parsed.detail || errText;
      } catch (e) {}
      throw new Error(errorDetail || `Server returned ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.replace('data: ', '');
          try {
            const data = JSON.parse(jsonStr);
            if (data.type === 'token') {
              onToken(data.content);
            } else if (data.type === 'status') {
              onStatus?.(data.content);
            } else if (data.type === 'done') {
              onDone?.(data);
            } else if (data.type === 'error') {
              onError?.(data.error);
            }
          } catch (e) {
            console.error('Failed to parse SSE payload', jsonStr, e);
          }
        }
      }
    }
  } catch (error) {
    onError?.(error.message);
  }
}

export async function transcribeAudio(audioBlob) {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('file', audioBlob, 'speech.webm');

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/transcribe`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Audio transcription failed');
  }

  return await res.json();
}

export async function polishPrompt(rawPrompt) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/polish-prompt`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt: rawPrompt }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to polish prompt');
  }

  return await res.json();
}


