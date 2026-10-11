import type { AvailableSlot } from '../../../api/src/booking/slots';
import type { Dict } from '../../i18n';

interface Props {
  copy: Dict['booking'];
  slots: readonly AvailableSlot[];
  selectedDate: string;
  selectedSlot: AvailableSlot | null;
  formatDay: (slot: AvailableSlot) => string;
  onDate: (date: string) => void;
  onSlot: (slot: AvailableSlot) => void;
}

/** Day tabs and time chips. Times are the studio's (Almaty) local times, as the API serves them. */
export function SlotPicker(props: Props) {
  const { copy, slots, selectedDate, selectedSlot, formatDay, onDate, onSlot } = props;
  const firstOfDay = new Map<string, AvailableSlot>();
  for (const slot of slots) if (!firstOfDay.has(slot.date)) firstOfDay.set(slot.date, slot);

  return (
    <>
      <div class="ui-section">
        <span class="ui-label">{copy.date}</span>
        <div class="booking-days">
          {[...firstOfDay].map(([date, slot]) => (
            <button
              type="button"
              key={date}
              class="ui-tile booking-day"
              aria-pressed={selectedDate === date}
              onClick={() => onDate(date)}
              data-testid={`slot-date-${date}`}
            >
              {formatDay(slot)}
            </button>
          ))}
        </div>
      </div>

      <div class="ui-section">
        <span class="ui-label">{copy.time}</span>
        <div class="booking-times">
          {slots
            .filter((slot) => slot.date === selectedDate)
            .map((slot) => (
              <button
                type="button"
                key={slot.start}
                class="ui-tile booking-time"
                aria-pressed={selectedSlot?.start === slot.start}
                onClick={() => onSlot(slot)}
                data-testid={`slot-time-${slot.time}`}
              >
                {slot.time}
              </button>
            ))}
        </div>
      </div>
    </>
  );
}
