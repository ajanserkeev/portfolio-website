import { useEffect, useState } from 'preact/hooks';
import { bus, type PainId } from '../engine/events';
import { getStoredPain } from '../engine/relevance';
import type { Dict, Locale } from '../i18n';

interface Props {
  copy: Dict['lead'];
  locale: Locale;
  privacyHref: string;
}

const CHANNELS = ['telegram', 'whatsapp', 'phone', 'email'] as const;
type Channel = (typeof CHANNELS)[number];

export default function LeadForm({ copy, locale, privacyHref }: Props) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [channel, setChannel] = useState<Channel>('telegram');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState('');
  const [startedAt] = useState(() => Date.now());
  // The capsule picked on the roof (this visit or earlier in the session) travels with the lead.
  const [pain, setPain] = useState<PainId | null>(() => getStoredPain());

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => bus.on('capsule:selected', (event) => setPain(event.pain)), []);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!consent) return setError(copy.errorConsent);
    if (!name.trim() || !contact.trim()) return setError(copy.errorRequired);

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
          pain: pain ?? undefined,
          consent: true,
          locale,
          hp: hp || undefined,
          startedAt,
        }),
      });
      if (!res.ok) throw new Error(`lead: HTTP ${res.status}`);
      setSubmitted(true);
      bus.emit({ type: 'lead:submitted', source: 'form' });
    } catch {
      // Server details are not for visitors; the API logs them.
      setError(copy.errorNetwork);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div class="ui-panel ui-success" data-testid="lead-form-success" role="status">
        <div class="ui-success__mark" aria-hidden="true">
          ✓
        </div>
        <h3 class="ui-panel__title">{copy.successTitle}</h3>
        <p class="ui-panel__lead">{copy.successText}</p>
      </div>
    );
  }

  return (
    <form id="lead-form" class="ui-panel" onSubmit={handleSubmit} data-testid="lead-form">
      <h3 class="ui-panel__title">{copy.title}</h3>
      <p class="ui-panel__lead">{copy.lead}</p>

      {error && (
        <div class="ui-alert ui-section" role="alert" data-testid="lead-form-error">
          {error}
        </div>
      )}

      {/* Honeypot: invisible to people, filled by bots. */}
      <input
        type="text"
        name="hp"
        value={hp}
        onInput={(e) => setHp((e.target as HTMLInputElement).value)}
        tabIndex={-1}
        autoComplete="off"
        hidden
        aria-hidden="true"
      />

      <div class="ui-section ui-grid ui-grid--2">
        <label class="ui-field">
          <span class="ui-label">{copy.name} *</span>
          <input
            class="ui-input"
            type="text"
            required
            autoComplete="name"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder={copy.namePlaceholder}
            data-testid="lead-input-name"
          />
        </label>
        <label class="ui-field">
          <span class="ui-label">{copy.contact} *</span>
          <input
            class="ui-input"
            type="text"
            required
            value={contact}
            onInput={(e) => setContact((e.target as HTMLInputElement).value)}
            placeholder={copy.contactPlaceholders[channel]}
            data-testid="lead-input-contact"
          />
        </label>
      </div>

      <div class="ui-section">
        <span class="ui-label">{copy.channel}</span>
        <div class="ui-segmented ui-segmented--pairs">
          {CHANNELS.map((ch) => (
            <button
              type="button"
              key={ch}
              aria-pressed={channel === ch}
              onClick={() => setChannel(ch)}
            >
              {copy.channels[ch]}
            </button>
          ))}
        </div>
      </div>

      <label class="ui-section ui-field">
        <span class="ui-label">{copy.message}</span>
        <textarea
          class="ui-textarea"
          rows={3}
          value={message}
          onInput={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
          placeholder={copy.messagePlaceholder}
          data-testid="lead-input-message"
        />
      </label>

      <label class="ui-section ui-consent">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent((e.target as HTMLInputElement).checked)}
          data-testid="lead-checkbox-consent"
        />
        <span>
          {copy.consentBefore}
          <a href={privacyHref} target="_blank" rel="noreferrer">
            {copy.consentLink}
          </a>
        </span>
      </label>

      <div class="ui-section">
        <button
          type="submit"
          class="ui-btn ui-btn--accent ui-btn--block"
          disabled={loading || !consent}
          data-testid="lead-button-submit"
        >
          {loading ? copy.sending : copy.submit}
        </button>
      </div>
    </form>
  );
}
