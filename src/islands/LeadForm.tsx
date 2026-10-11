import { useEffect, useState } from 'preact/hooks';
import { bus } from '../engine/events';

interface Props {
  locale?: 'ru' | 'en';
}

export default function LeadForm({ locale = 'ru' }: Props) {
  const isRu = locale === 'ru';

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [channel, setChannel] = useState<'telegram' | 'whatsapp' | 'phone' | 'email'>('telegram');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState('');
  const [startedAt] = useState(() => Date.now());
  const [pain, setPain] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = bus.on('capsule:selected', (event) => {
      if (event.pain) {
        setPain(event.pain);
      }
    });
    return unsub;
  }, []);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!consent) {
      setError(
        isRu
          ? 'Пожалуйста, подтвердите согласие на обработку данных'
          : 'Please give your consent to proceed',
      );
      return;
    }

    if (!name.trim() || !contact.trim()) {
      setError(isRu ? 'Пожалуйста, заполните имя и контакт' : 'Please enter your name and contact');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          channel,
          message: message.trim() || undefined,
          pain,
          consent: true,
          locale,
          hp: hp || undefined,
          startedAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit lead');
      }

      setSubmitted(true);
      bus.emit({ type: 'lead:submitted', source: 'form' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div
        class="island-lead-form p-8 rounded-2xl bg-neutral-900/90 border border-emerald-500/30 backdrop-blur-md shadow-2xl text-center max-w-xl mx-auto my-8"
        data-testid="lead-form-success"
      >
        <div class="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          ✓
        </div>
        <h3 class="text-xl font-bold text-white mb-2">
          {isRu ? 'Заявка принята!' : 'Request Received!'}
        </h3>
        <p class="text-sm text-neutral-300 max-w-md mx-auto">
          {isRu
            ? 'Капсула отправлена на пульт команды. Мы свяжемся с вами в течение рабочего дня.'
            : 'Your capsule has reached the team console. We will get back to you shortly.'}
        </p>
      </div>
    );
  }

  return (
    <form
      id="lead-form"
      onSubmit={handleSubmit}
      class="island-lead-form p-6 sm:p-8 rounded-2xl bg-neutral-900/80 border border-neutral-800 backdrop-blur-md shadow-2xl text-neutral-100 max-w-xl mx-auto my-8"
      data-testid="lead-form"
    >
      <div class="mb-6">
        <h3 class="text-xl font-semibold text-white mb-1">
          {isRu ? 'Обсудить проект' : 'Discuss Your Project'}
        </h3>
        <p class="text-sm text-neutral-400">
          {isRu
            ? 'Оставьте контакт, и мы предложим архитектуру и вилку решения'
            : 'Leave your contact details and we will propose an architecture and budget range'}
        </p>
      </div>

      {error && (
        <div
          class="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs"
          data-testid="lead-form-error"
        >
          {error}
        </div>
      )}

      {/* Honeypot trap */}
      <input
        type="text"
        name="hp"
        value={hp}
        onInput={(e) => setHp((e.target as HTMLInputElement).value)}
        tabIndex={-1}
        autoComplete="off"
        class="hidden"
        aria-hidden="true"
      />

      <div class="space-y-4">
        <div>
          <label for="lead-name" class="block text-xs font-medium text-neutral-400 mb-1.5">
            {isRu ? 'Ваше имя' : 'Your Name'} *
          </label>
          <input
            id="lead-name"
            type="text"
            required
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder={isRu ? 'Аман' : 'Alex'}
            class="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
            data-testid="lead-input-name"
          />
        </div>

        <div>
          <label for="lead-contact" class="block text-xs font-medium text-neutral-400 mb-1.5">
            {isRu ? 'Контакт' : 'Contact (Phone / Telegram / Email)'} *
          </label>
          <input
            id="lead-contact"
            type="text"
            required
            value={contact}
            onInput={(e) => setContact((e.target as HTMLInputElement).value)}
            placeholder={
              channel === 'telegram'
                ? '@username'
                : channel === 'email'
                  ? 'you@example.com'
                  : '+7 ...'
            }
            class="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
            data-testid="lead-input-contact"
          />
        </div>

        <div>
          <span class="block text-xs font-medium text-neutral-400 mb-1.5">
            {isRu ? 'Предпочтительный канал связи' : 'Preferred Channel'}
          </span>
          <div class="grid grid-cols-4 gap-2">
            {(['telegram', 'whatsapp', 'phone', 'email'] as const).map((ch) => (
              <button
                type="button"
                key={ch}
                onClick={() => setChannel(ch)}
                class={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                  channel === ch
                    ? 'bg-neutral-800 border-emerald-500/80 text-emerald-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {ch.charAt(0).toUpperCase() + ch.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label for="lead-message" class="block text-xs font-medium text-neutral-400 mb-1.5">
            {isRu ? 'О проекте или задаче (кратко)' : 'Project details (briefly)'}
          </label>
          <textarea
            id="lead-message"
            rows={3}
            value={message}
            onInput={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
            placeholder={
              isRu
                ? 'Например: нужен голосовой бот для записи в клинику...'
                : 'E.g., need an automated customer onboarding pipeline...'
            }
            class="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            data-testid="lead-input-message"
          />
        </div>

        <div class="flex items-start gap-2.5 pt-1">
          <input
            type="checkbox"
            id="lead-consent"
            required
            checked={consent}
            onChange={(e) => setConsent((e.target as HTMLInputElement).checked)}
            class="mt-1 accent-emerald-500 rounded cursor-pointer"
            data-testid="lead-checkbox-consent"
          />
          <label
            for="lead-consent"
            class="text-xs text-neutral-400 cursor-pointer select-none leading-relaxed"
          >
            {isRu
              ? 'Согласен на обработку данных согласно '
              : 'I consent to data processing according to '}
            <a
              href={isRu ? '/privacy/' : '/en/privacy/'}
              target="_blank"
              rel="noreferrer"
              class="text-emerald-400 underline hover:text-emerald-300"
            >
              {isRu ? 'Политике конфиденциальности' : 'Privacy Policy'}
            </a>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !consent}
          class="w-full mt-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20"
          data-testid="lead-button-submit"
        >
          {loading
            ? isRu
              ? 'Отправка...'
              : 'Sending...'
            : isRu
              ? 'Отправить заявку'
              : 'Send Request'}
        </button>
      </div>
    </form>
  );
}
