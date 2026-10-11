import { useEffect, useRef } from 'preact/hooks';
import type { Dict } from '../../i18n';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tool?: {
    name: 'get_free_slots' | 'book_call' | 'create_lead' | 'show_case';
    data?: Record<string, unknown>;
  };
}

interface Props {
  copy: Dict['chat'];
  messages: readonly ChatMessage[];
  /** Closes the sheet and scrolls the page to an element (booking widget, cases). */
  goTo: (id: string) => void;
}

export function ChatMessages({ copy, messages, goTo }: Props) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [messages]);

  return (
    <div class="chat__messages" aria-live="polite">
      {messages.map((m) => (
        <div key={m.id} class={`chat__row chat__row--${m.role}`}>
          <div class={`chat__bubble chat__bubble--${m.role}`}>{m.content}</div>
          {m.tool?.name === 'get_free_slots' && (
            <button
              type="button"
              class="ui-btn ui-btn--brass chat__action"
              onClick={() => goTo('booking-widget')}
            >
              {copy.slotsCta}
            </button>
          )}
          {m.tool?.name === 'show_case' && (
            <button type="button" class="ui-btn chat__action" onClick={() => goTo('agents')}>
              {copy.casesCta}
            </button>
          )}
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}
