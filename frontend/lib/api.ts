const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API || 'http://localhost:3001';

function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)auth_token=([^;]*)/);
  return match ? match[1]! : null;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface Conversation {
  id: number;
  title: string | null;
  slug: string | null;
  userId: string;
}

export interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  conversationId: number;
  createdAt: string;
}

export interface Source {
  title: string;
  url: string;
}

export async function syncUser(): Promise<{ userId: string }> {
  return apiFetch('/users/sync', { method: 'POST' });
}

export async function getConversations(): Promise<{
  conversations: Conversation[];
}> {
  return apiFetch('/conversations');
}

export async function createConversation(
  title?: string,
): Promise<{ conversation: Conversation }> {
  return apiFetch('/conversations', {
    method: 'POST',
    body: JSON.stringify({ title: title || 'New Conversation' }),
  });
}

export async function getConversation(
  id: number,
): Promise<{ conversation: Conversation; messages: Message[] }> {
  return apiFetch(`/conversations/${id}`);
}

export async function deleteConversation(
  id: number,
): Promise<{ success: boolean }> {
  return apiFetch(`/conversations/${id}`, { method: 'DELETE' });
}

export interface AskCallbacks {
  onChunk: (text: string) => void;
  onSources: (sources: Source[]) => void;
  onTitle: (title: string, conversationId: number) => void;
  onFollowUps: (followUps: string[]) => void;
  onDone: (conversationId: number) => void;
  onError: (error: string) => void;
}

export async function askQuestion(
  query: string,
  conversationId: number | undefined,
  callbacks: AskCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, conversationId }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    callbacks.onError(err.error || 'Failed to send message');
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError('No response stream');
    return;
  }

  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          switch (data.type) {
            case 'chunk':
              callbacks.onChunk(data.text);
              break;
            case 'sources':
              callbacks.onSources(data.sources);
              break;
            case 'title':
              callbacks.onTitle(data.title, data.conversationId);
              break;
            case 'followUps':
              callbacks.onFollowUps(data.followUps);
              break;
            case 'done':
              callbacks.onDone(data.conversationId);
              break;
            case 'error':
              callbacks.onError(data.error);
              break;
          }
        } catch {
          // skip malformed JSON lines
        }
      }
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      callbacks.onError('Stream connection lost');
    }
  }
}
