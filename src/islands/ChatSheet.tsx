import { useEffect, useRef, useState } from 'preact/hooks';
import { bus } from '../engine/events';
import type { Dict, Locale } from '../i18n';
import { createTelegramDeepLink, createWhatsAppDeepLink } from '../lib/deeplinks';
import { type ChatMessage, ChatMessages } from './chat/ChatMessages';

interface Props {
  copy: Dict['chat'];
  locale: Locale;
}

type StreamEvent =
  | { type: 'token'; content: string }
  | { type: 'tool'; tool: NonNullable<ChatMessage['tool']>['name']; data?: Record<string, unknown> }
  | { type: 'done'; sessionId?: string };

/** Reads the `data:` lines of the /api/chat SSE stream and hands each JSON event to `onEvent`. */
async function readStream(body: ReadableStream<Uint8Array>, onEvent: (e: StreamEvent) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const json = line.trim().startsWith('data:') ? line.trim().slice(5).trim() : '';
      if (!json) continue;
      try {
        onEvent(JSON.parse(json) as StreamEvent);
      } catch {
        // A partial chunk; the rest arrives with the next read.
      }
    }
  }
}

export default function ChatSheet({ copy, locale }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'greeting', role: 'assistant', content: copy.greeting },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Opened from the bottom dock or the giant phone on the agents floor.
  useEffect(() => {
    const offOpen = bus.on('chat:open', () => setIsOpen(true));
    const offHotspot = bus.on('hotspot:activated', (e) => {
      if (e.level === 'agents' && e.action === 'open-chat') setIsOpen(true);
    });
    return () => {
      offOpen();
      offHotspot();
    };
  }, []);

  const close = () => {
    setIsOpen(false);
    document.querySelector<HTMLElement>('[data-chat-open]')?.focus();
  };

  // Focus the input on open and again after each reply (it is disabled while sending).
  useEffect(() => {
    if (isOpen && !loading) inputRef.current?.focus();
  }, [isOpen, loading]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const update = (id: string, change: (m: ChatMessage) => ChatMessage) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? change(m) : m)));

  const send = async (text = input) => {
    const message = text.trim();
    if (!message || loading) return;
    const replyId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: message },
      { id: replyId, role: 'assistant', content: '' },
    ]);
    setInput('');
    setLoading(true);
    bus.emit({ type: 'chat:user-message' });
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId: sessionId ?? undefined, locale }),
      });
      if (!res.ok || !res.body) throw new Error(`chat: HTTP ${res.status}`);
      await readStream(res.body, (event) => {
        if (event.type === 'token')
          update(replyId, (m) => ({ ...m, content: m.content + event.content }));
        if (event.type === 'tool') {
          update(replyId, (m) => ({ ...m, tool: { name: event.tool, data: event.data } }));
          bus.emit({ type: 'chat:tool', tool: event.tool });
        }
        if (event.type === 'done') {
          if (event.sessionId) setSessionId(event.sessionId);
          bus.emit({ type: 'chat:agent-reply' });
        }
      });
    } catch {
      update(replyId, (m) => ({ ...m, content: copy.error }));
    } finally {
      setLoading(false);
    }
  };

  const goTo = (id: string) => {
    setIsOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isOpen) return null;

  return (
    <div class="chat" data-testid="chat-sheet" role="dialog" aria-label={copy.title}>
      <header class="chat__header">
        <span class="chat__avatar" aria-hidden="true" />
        <div class="chat__heading">
          <h2 class="chat__title">{copy.title}</h2>
          <p class="chat__status">{copy.status}</p>
        </div>
        <button
          type="button"
          class="chat__close"
          onClick={close}
          aria-label={copy.close}
          data-testid="chat-close-btn"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </header>

      <ChatMessages copy={copy} messages={messages} goTo={goTo} />

      <div class="chat__prompts">
        {Object.values(copy.prompts).map((prompt) => (
          <button type="button" key={prompt} class="chat__prompt" onClick={() => send(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <p class="chat__direct">
        {copy.direct}{' '}
        <a
          href={createTelegramDeepLink('tower_studio_bot', 'chat')}
          target="_blank"
          rel="noreferrer"
        >
          Telegram
        </a>
        {' · '}
        <a
          href={createWhatsAppDeepLink('+77011234567', copy.whatsappText)}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </a>
      </p>

      <form
        class="chat__composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          ref={inputRef}
          class="ui-input"
          type="text"
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          placeholder={copy.placeholder}
          aria-label={copy.placeholder}
          disabled={loading}
          data-testid="chat-input"
        />
        <button
          type="submit"
          class="ui-btn ui-btn--primary chat__send"
          disabled={loading || !input.trim()}
          aria-label={copy.send}
          data-testid="chat-send-btn"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M4 12h14M13 6l6 6-6 6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}
