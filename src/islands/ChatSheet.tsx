import { useEffect, useRef, useState } from 'preact/hooks';
import { bus } from '../engine/events';
import { createTelegramDeepLink, createWhatsAppDeepLink } from '../lib/deeplinks';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tool?: {
    name: 'get_free_slots' | 'book_call' | 'create_lead' | 'show_case';
    data?: Record<string, unknown>;
  };
}

interface Props {
  locale?: 'ru' | 'en';
}

export default function ChatSheet({ locale = 'ru' }: Props) {
  const isRu = locale === 'ru';
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const initialGreeting = isRu
    ? 'Привет! Я ИИ-ассистент Башни. Могу рассказать о наших технологиях, рассчитать примерную смету или подобрать удобный слот для созвона.'
    : 'Hello! I am the Tower AI assistant. I can explain our architecture, give an estimate, or find a convenient slot for an intro call.';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: initialGreeting,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

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

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    bus.emit({ type: 'chat:user-message' });

    const assistantMsgId = `asst-${Date.now()}`;
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
    };
    setMessages((prev) => [...prev, initialAssistantMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId ?? undefined,
          locale,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Chat request failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.type === 'token') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: m.content + data.content } : m,
                ),
              );
            } else if (data.type === 'tool') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        tool: { name: data.tool, data: data.data },
                      }
                    : m,
                ),
              );
              bus.emit({ type: 'chat:tool', tool: data.tool });
            } else if (data.type === 'done') {
              if (data.sessionId) setSessionId(data.sessionId);
              bus.emit({ type: 'chat:agent-reply' });
            }
          } catch {
            // Ignore parse errors in partial stream chunks
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: isRu
                  ? 'Извините, соединение прервалось. Пожалуйста, напишите нам в Telegram.'
                  : 'Sorry, connection lost. Please reach out via Telegram.',
              }
            : m,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const telegramLink = createTelegramDeepLink('tower_studio_bot', 'chat');
  const whatsappLink = createWhatsAppDeepLink(
    '+77011234567',
    isRu ? 'Здравствуйте! Пишу с сайта Башня.' : 'Hello! Reaching out from Tower site.',
  );

  return (
    <>
      {/* Drawer / Sheet */}
      {isOpen && (
        <div
          class="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-neutral-950/95 border-l border-neutral-800 backdrop-blur-xl flex flex-col shadow-2xl text-neutral-100"
          data-testid="chat-sheet"
          role="dialog"
          aria-label={isRu ? 'Чат с ИИ-агентом' : 'AI agent chat'}
        >
          {/* Header */}
          <div class="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-base font-bold">
                🤖
              </div>
              <div>
                <h4 class="text-sm font-semibold text-white">
                  {isRu ? 'ИИ-ассистент Башни' : 'Tower Assistant'}
                </h4>
                <div class="flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{isRu ? 'На связи' : 'Online'}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              class="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center text-sm transition-colors"
              data-testid="chat-close-btn"
              aria-label={isRu ? 'Закрыть чат' : 'Close chat'}
            >
              ✕
            </button>
          </div>

          {/* Messages list */}
          <div class="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
            {messages.map((m) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div
                  key={m.id}
                  class={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  <div
                    class={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      isAssistant
                        ? 'bg-neutral-900 border border-neutral-800 text-neutral-200'
                        : 'bg-emerald-500 text-black font-medium'
                    }`}
                  >
                    {m.content}
                  </div>

                  {/* Tool action prompt if available */}
                  {m.tool?.name === 'get_free_slots' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        const el = document.getElementById('booking-widget');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      class="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[11px] text-emerald-300 hover:bg-emerald-900/60 transition-colors"
                    >
                      <span>📅</span>
                      <span>{isRu ? 'Выбрать свободный слот' : 'Choose available slot'}</span>
                    </button>
                  )}

                  {m.tool?.name === 'show_case' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        const el = document.getElementById('agents');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      class="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-[11px] text-neutral-200 hover:border-neutral-500 transition-colors"
                    >
                      <span>📂</span>
                      <span>{isRu ? 'Перейти к кейсам' : 'View cases'}</span>
                    </button>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div class="px-3 py-2 border-t border-neutral-800/80 bg-neutral-950/40 flex gap-1.5 overflow-x-auto scrollbar-none">
            {[
              {
                ru: 'Записаться на созвон',
                en: 'Book an intro call',
              },
              {
                ru: 'Сколько стоит?',
                en: 'What is the pricing?',
              },
              {
                ru: 'Показать кейсы',
                en: 'Show cases',
              },
            ].map((chip) => (
              <button
                type="button"
                key={chip.ru}
                onClick={() => handleSend(isRu ? chip.ru : chip.en)}
                class="px-2.5 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 whitespace-nowrap transition-colors"
              >
                {isRu ? chip.ru : chip.en}
              </button>
            ))}
          </div>

          {/* Messengers deep links */}
          <div class="px-4 py-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400 bg-neutral-900/40">
            <span>{isRu ? 'Или напишите напрямую:' : 'Or chat directly:'}</span>
            <div class="flex items-center gap-2">
              <a
                href={telegramLink}
                target="_blank"
                rel="noreferrer"
                class="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300 hover:border-blue-600 transition-colors"
              >
                Telegram
              </a>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                class="px-2 py-0.5 rounded bg-green-950/60 border border-green-800/60 text-green-300 hover:border-green-600 transition-colors"
              >
                WhatsApp
              </a>
            </div>
          </div>

          {/* Input field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            class="p-3 border-t border-neutral-800 flex items-center gap-2 bg-neutral-900/80"
          >
            <input
              type="text"
              value={input}
              onInput={(e) => setInput((e.target as HTMLInputElement).value)}
              placeholder={
                isRu ? 'Задайте вопрос ассистенту...' : 'Ask the assistant a question...'
              }
              disabled={loading}
              class="flex-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
              data-testid="chat-input"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              class="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs transition-colors shadow-md shadow-emerald-500/20"
              data-testid="chat-send-btn"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
