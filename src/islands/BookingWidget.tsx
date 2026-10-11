import { useEffect, useState } from 'preact/hooks';
import type { AvailableSlot } from '../../api/src/booking/slots';
import { bus } from '../engine/events';
import { createTelegramDeepLink } from '../lib/deeplinks';

interface Props {
  locale?: 'ru' | 'en';
}

export default function BookingWidget({ locale = 'ru' }: Props) {
  const isRu = locale === 'ru';

  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [channel, setChannel] = useState<'telegram' | 'whatsapp' | 'phone' | 'email'>('telegram');
  const [consent, setConsent] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch slots on mount
  useEffect(() => {
    let mounted = true;
    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        const res = await fetch('/api/slots?days=7');
        if (!res.ok) throw new Error('Failed to load slots');
        const data = await res.json();
        if (mounted) {
          const list: AvailableSlot[] = data.slots ?? [];
          setSlots(list);
          if (list.length > 0 && list[0]?.date) {
            setSelectedDate(list[0].date);
          }
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : String(err);
          setSlotsError(msg);
        }
      } finally {
        if (mounted) setLoadingSlots(false);
      }
    };

    fetchSlots();
    return () => {
      mounted = false;
    };
  }, []);

  // Group slots by date
  const groupedDates = Array.from(new Set(slots.map((s) => s.date)));
  const slotsForDate = slots.filter((s) => s.date === selectedDate);

  const handleBook = async (e: Event) => {
    e.preventDefault();
    if (!selectedSlot) return;

    if (!consent) {
      setSubmitError(
        isRu ? 'Подтвердите согласие на обработку данных' : 'Please give your consent',
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          channel,
          slotStart: selectedSlot.start,
          slotEnd: selectedSlot.end,
          locale,
          startedAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 || data.code === 'SLOT_ALREADY_BOOKED') {
          throw new Error(
            isRu
              ? 'Этот слот только что заняли. Пожалуйста, выберите другое время.'
              : 'This slot was just booked. Please choose another time.',
          );
        }
        throw new Error(data.error || 'Booking failed');
      }

      setBookingConfirmed(true);
      bus.emit({ type: 'booking:confirmed', slotIso: selectedSlot.start });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (bookingConfirmed && selectedSlot) {
    return (
      <div
        class="island-booking-widget p-8 rounded-2xl bg-neutral-900/90 border border-emerald-500/30 backdrop-blur-md shadow-2xl text-center max-w-xl mx-auto my-8"
        data-testid="booking-success"
      >
        <div class="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          📅
        </div>
        <h3 class="text-xl font-bold text-white mb-2">
          {isRu ? 'Созвон забронирован!' : 'Call Confirmed!'}
        </h3>
        <p class="text-sm text-neutral-300 mb-4">
          {isRu ? 'Дата и время (UTC): ' : 'Date & Time (UTC): '}
          <strong class="text-white">
            {selectedSlot.date} {selectedSlot.time}
          </strong>
        </p>
        <p class="text-xs text-neutral-400 max-w-md mx-auto">
          {isRu
            ? 'Слот сохранен. Мы отправили уведомление в команду и свяжемся с вами в выбранное время.'
            : 'Slot is saved. We notified the team and will connect with you at the specified time.'}
        </p>
      </div>
    );
  }

  return (
    <div
      class="island-booking-widget p-6 sm:p-8 rounded-2xl bg-neutral-900/80 border border-neutral-800 backdrop-blur-md shadow-2xl text-neutral-100 max-w-xl mx-auto my-8"
      id="booking-widget"
      data-testid="booking-widget"
    >
      <div class="mb-6">
        <h3 class="text-xl font-semibold text-white mb-1">
          {isRu ? 'Забронировать 20-минутный разбор' : 'Book a 20-min Intro Call'}
        </h3>
        <p class="text-sm text-neutral-400">
          {isRu
            ? 'Выберите удобный слот в календаре для обсуждения задач и демонстрации'
            : 'Select a convenient slot in the calendar to discuss requirements and see a demo'}
        </p>
      </div>

      {loadingSlots ? (
        <div class="py-8 text-center text-sm text-neutral-500">
          {isRu ? 'Загрузка свободных слотов...' : 'Loading available slots...'}
        </div>
      ) : slotsError ? (
        <div
          class="p-4 rounded-xl bg-neutral-800/40 text-neutral-300 text-xs mb-4 space-y-3"
          data-testid="booking-unavailable"
        >
          <p class="m-0">
            {isRu
              ? 'Календарь сейчас недоступен. Напишите нам — подберём время вручную.'
              : 'The calendar is unavailable right now. Message us and we will find a time.'}
          </p>
          <div class="flex flex-wrap gap-2">
            <a
              class="px-3 py-2 rounded-lg bg-emerald-500 text-black font-semibold no-underline"
              href={createTelegramDeepLink('tower_studio_bot', 'booking')}
              target="_blank"
              rel="noopener"
            >
              {isRu ? 'Написать в Telegram' : 'Message on Telegram'}
            </a>
            <a
              class="px-3 py-2 rounded-lg border border-neutral-600 text-neutral-100 no-underline"
              href="#basement"
            >
              {isRu ? 'Оставить заявку' : 'Leave a request'}
            </a>
          </div>
        </div>
      ) : groupedDates.length === 0 ? (
        <div class="p-4 rounded-xl bg-neutral-800/40 text-neutral-400 text-xs text-center mb-4">
          {isRu
            ? 'На ближайшие дни все слоты заняты. Оставьте заявку в форме ниже.'
            : 'All slots for upcoming days are occupied. Please submit a request.'}
        </div>
      ) : (
        <div>
          {/* Date Selector Tabs */}
          <div class="mb-4">
            <span class="block text-xs font-medium uppercase tracking-wider text-neutral-400 mb-2">
              {isRu ? 'Дата' : 'Date'}
            </span>
            <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {groupedDates.map((date) => (
                <button
                  type="button"
                  key={date}
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  class={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                    selectedDate === date
                      ? 'bg-neutral-800 border-emerald-500/80 text-emerald-300 shadow-sm'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                  data-testid={`slot-date-${date}`}
                >
                  {date}
                </button>
              ))}
            </div>
          </div>

          {/* Time Slots Chips */}
          <div class="mb-6">
            <span class="block text-xs font-medium uppercase tracking-wider text-neutral-400 mb-2">
              {isRu ? 'Время (Asia/Almaty)' : 'Time (Asia/Almaty)'}
            </span>
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slotsForDate.map((slot) => {
                const isSelected = selectedSlot?.start === slot.start;
                return (
                  <button
                    type="button"
                    key={slot.start}
                    onClick={() => setSelectedSlot(slot)}
                    class={`py-2 px-3 rounded-lg text-xs font-medium border transition-all text-center ${
                      isSelected
                        ? 'bg-emerald-500 text-black font-semibold border-emerald-500 shadow-sm shadow-emerald-500/30'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                    data-testid={`slot-time-${slot.time}`}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Booking Confirmation Form */}
          {selectedSlot && (
            <form
              onSubmit={handleBook}
              class="pt-4 border-t border-neutral-800 space-y-4"
              data-testid="booking-form"
            >
              {submitError && (
                <div
                  class="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs"
                  data-testid="booking-error"
                >
                  {submitError}
                </div>
              )}

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="book-name" class="block text-xs font-medium text-neutral-400 mb-1">
                    {isRu ? 'Имя' : 'Name'} *
                  </label>
                  <input
                    id="book-name"
                    type="text"
                    required
                    value={name}
                    onInput={(e) => setName((e.target as HTMLInputElement).value)}
                    placeholder={isRu ? 'Аман' : 'Alex'}
                    class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                    data-testid="booking-input-name"
                  />
                </div>

                <div>
                  <label for="book-contact" class="block text-xs font-medium text-neutral-400 mb-1">
                    {isRu ? 'Контакт' : 'Contact'} *
                  </label>
                  <input
                    id="book-contact"
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
                    class="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                    data-testid="booking-input-contact"
                  />
                </div>
              </div>

              <div>
                <span class="block text-xs font-medium text-neutral-400 mb-1">
                  {isRu ? 'Канал связи' : 'Channel'}
                </span>
                <div class="grid grid-cols-4 gap-1.5">
                  {(['telegram', 'whatsapp', 'phone', 'email'] as const).map((ch) => (
                    <button
                      type="button"
                      key={ch}
                      onClick={() => setChannel(ch)}
                      class={`py-1 rounded text-xs font-medium border text-center transition-all ${
                        channel === ch
                          ? 'bg-neutral-800 border-emerald-500/80 text-emerald-300'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      {ch.charAt(0).toUpperCase() + ch.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div class="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="book-consent"
                  required
                  checked={consent}
                  onChange={(e) => setConsent((e.target as HTMLInputElement).checked)}
                  class="mt-0.5 accent-emerald-500 rounded cursor-pointer"
                  data-testid="booking-consent"
                />
                <label
                  for="book-consent"
                  class="text-xs text-neutral-400 cursor-pointer select-none leading-relaxed"
                >
                  {isRu
                    ? 'Согласен с обработкой персональных данных'
                    : 'I agree to the processing of personal data'}
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting || !consent}
                class="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-xs transition-all shadow-md shadow-emerald-500/20"
                data-testid="booking-submit-btn"
              >
                {submitting
                  ? isRu
                    ? 'Бронирование...'
                    : 'Reserving...'
                  : isRu
                    ? `Забронировать слот ${selectedSlot.time}`
                    : `Confirm slot at ${selectedSlot.time}`}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
