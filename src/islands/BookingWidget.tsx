import { useEffect, useState } from 'preact/hooks';
import type { AvailableSlot } from '../../api/src/booking/slots';
import { bus } from '../engine/events';
import type { Dict, Locale } from '../i18n';
import { createTelegramDeepLink } from '../lib/deeplinks';
import { type BookingDetails, BookingForm } from './booking/BookingForm';
import { SlotPicker } from './booking/SlotPicker';

interface Props {
  copy: Dict['booking'];
  /** Shared field labels with the lead form. */
  form: Dict['lead'];
  locale: Locale;
  privacyHref: string;
}

/** The studio works in Almaty; slot times come from the API in this zone. */
const STUDIO_TIME_ZONE = 'Asia/Almaty';

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; slots: AvailableSlot[] };

export default function BookingWidget({ copy, form, locale, privacyHref }: Props) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<AvailableSlot | null>(null);

  const formatDay = (slot: AvailableSlot) =>
    new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: STUDIO_TIME_ZONE,
    }).format(new Date(slot.start));

  useEffect(() => {
    let alive = true;
    fetch('/api/slots?days=7')
      .then((res) => {
        if (!res.ok) throw new Error(`slots: HTTP ${res.status}`);
        return res.json() as Promise<{ slots?: AvailableSlot[] }>;
      })
      .then((data) => {
        if (!alive) return;
        const slots = data.slots ?? [];
        setLoad({ state: 'ready', slots });
        setSelectedDate(slots[0]?.date ?? '');
      })
      .catch(() => alive && setLoad({ state: 'error' }));
    return () => {
      alive = false;
    };
  }, []);

  const book = async (details: BookingDetails) => {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...details,
          slotStart: selectedSlot.start,
          consent: true,
          locale,
          startedAt,
        }),
      });
      if (res.status === 409) return setError(copy.errorTaken);
      if (!res.ok) throw new Error(`book: HTTP ${res.status}`);
      setBooked(selectedSlot);
      bus.emit({ type: 'booking:confirmed', slotIso: selectedSlot.start });
    } catch {
      setError(copy.errorNetwork);
    } finally {
      setSubmitting(false);
    }
  };

  if (booked) {
    return (
      <div class="ui-panel ui-success" data-testid="booking-success" role="status">
        <div class="ui-success__mark" aria-hidden="true">
          ✓
        </div>
        <h3 class="ui-panel__title">{copy.successTitle}</h3>
        <p class="ui-panel__lead">
          {copy.successAt} <strong>{formatDay(booked)}</strong>, <strong>{booked.time}</strong>{' '}
          {copy.successZone}. {copy.successText}
        </p>
      </div>
    );
  }

  return (
    <div class="ui-panel" id="booking-widget" data-testid="booking-widget">
      <h3 class="ui-panel__title">{copy.title}</h3>
      <p class="ui-panel__lead">{copy.lead}</p>

      {load.state === 'loading' && <p class="ui-note">{copy.loading}</p>}

      {load.state === 'error' && (
        <div class="ui-note" data-testid="booking-unavailable">
          <p class="booking-note__text">{copy.unavailable}</p>
          <div class="booking-note__actions">
            <a
              class="ui-btn ui-btn--primary"
              href={createTelegramDeepLink('tower_studio_bot', 'booking')}
              target="_blank"
              rel="noopener"
            >
              {copy.telegram}
            </a>
            <a class="ui-btn" href="#basement">
              {copy.request}
            </a>
          </div>
        </div>
      )}

      {load.state === 'ready' && load.slots.length === 0 && <p class="ui-note">{copy.noSlots}</p>}

      {load.state === 'ready' && load.slots.length > 0 && (
        <>
          <SlotPicker
            copy={copy}
            slots={load.slots}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            formatDay={formatDay}
            onDate={(date) => {
              setSelectedDate(date);
              setSelectedSlot(null);
            }}
            onSlot={setSelectedSlot}
          />
          {selectedSlot && (
            <BookingForm
              copy={copy}
              form={form}
              privacyHref={privacyHref}
              slotLabel={`${formatDay(selectedSlot)}, ${selectedSlot.time}`}
              submitting={submitting}
              error={error}
              onSubmit={book}
            />
          )}
        </>
      )}
    </div>
  );
}
