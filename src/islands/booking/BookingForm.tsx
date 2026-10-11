import { useState } from 'preact/hooks';
import type { Dict } from '../../i18n';

const CHANNELS = ['telegram', 'whatsapp', 'phone', 'email'] as const;
export type Channel = (typeof CHANNELS)[number];

export interface BookingDetails {
  name: string;
  contact: string;
  channel: Channel;
}

interface Props {
  copy: Dict['booking'];
  form: Dict['lead'];
  privacyHref: string;
  slotLabel: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (details: BookingDetails) => void;
}

/** Name, contact, channel and consent for the chosen slot. */
export function BookingForm(props: Props) {
  const { copy, form, privacyHref, slotLabel, submitting, error, onSubmit } = props;
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [channel, setChannel] = useState<Channel>('telegram');
  const [consent, setConsent] = useState(false);

  const submit = (event: Event) => {
    event.preventDefault();
    if (!consent || !name.trim() || !contact.trim()) return;
    onSubmit({ name: name.trim(), contact: contact.trim(), channel });
  };

  return (
    <form class="ui-section booking-form" onSubmit={submit} data-testid="booking-form">
      {error && (
        <div class="ui-alert ui-section" role="alert" data-testid="booking-error">
          {error}
        </div>
      )}

      <div class="ui-section ui-grid ui-grid--2">
        <label class="ui-field">
          <span class="ui-label">{form.name} *</span>
          <input
            class="ui-input"
            type="text"
            required
            autoComplete="name"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder={form.namePlaceholder}
            data-testid="booking-input-name"
          />
        </label>
        <label class="ui-field">
          <span class="ui-label">{form.contact} *</span>
          <input
            class="ui-input"
            type="text"
            required
            value={contact}
            onInput={(e) => setContact((e.target as HTMLInputElement).value)}
            placeholder={form.contactPlaceholders[channel]}
            data-testid="booking-input-contact"
          />
        </label>
      </div>

      <div class="ui-section">
        <span class="ui-label">{form.channel}</span>
        <div class="ui-segmented ui-segmented--pairs">
          {CHANNELS.map((ch) => (
            <button
              type="button"
              key={ch}
              aria-pressed={channel === ch}
              onClick={() => setChannel(ch)}
            >
              {form.channels[ch]}
            </button>
          ))}
        </div>
      </div>

      <label class="ui-section ui-consent">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent((e.target as HTMLInputElement).checked)}
          data-testid="booking-consent"
        />
        <span>
          {form.consentBefore}
          <a href={privacyHref} target="_blank" rel="noreferrer">
            {form.consentLink}
          </a>
        </span>
      </label>

      <div class="ui-section">
        <button
          type="submit"
          class="ui-btn ui-btn--accent ui-btn--block"
          disabled={submitting || !consent}
          data-testid="booking-submit-btn"
        >
          {submitting ? copy.sending : `${copy.submit}: ${slotLabel}`}
        </button>
      </div>
    </form>
  );
}
