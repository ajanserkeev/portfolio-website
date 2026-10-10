export interface SlotRuleOptions {
  workingDays?: number[]; // [1, 2, 3, 4, 5] (1=Monday .. 7=Sunday)
  startHour?: number; // e.g. 10
  endHour?: number; // e.g. 19
  slotDurationMinutes?: number; // e.g. 30
  daysAhead?: number; // e.g. 7
  minNoticeMinutes?: number; // e.g. 120
  timeZone?: string; // e.g. 'Asia/Almaty'
}

export interface BusyInterval {
  start: string;
  end: string;
}

export interface AvailableSlot {
  start: string;
  end: string;
  date: string;
  time: string;
}

export function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  let y = 1970;
  let m = 1;
  let d = 1;
  let hr = 0;
  let min = 0;
  let sec = 0;

  for (const part of parts) {
    const val = Number.parseInt(part.value, 10);
    if (part.type === 'year') y = val;
    else if (part.type === 'month') m = val;
    else if (part.type === 'day') d = val;
    else if (part.type === 'hour') hr = val % 24;
    else if (part.type === 'minute') min = val;
    else if (part.type === 'second') sec = val;
  }

  const asUtc = Date.UTC(y, m - 1, d, hr, min, sec);
  return asUtc - date.getTime();
}

export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const dateParts = dateStr.split('-').map((s) => Number.parseInt(s, 10));
  const timeParts = timeStr.split(':').map((s) => Number.parseInt(s, 10));

  const y = dateParts[0] ?? 2026;
  const mo = dateParts[1] ?? 1;
  const d = dateParts[2] ?? 1;
  const h = timeParts[0] ?? 0;
  const mi = timeParts[1] ?? 0;

  const utcGuess = Date.UTC(y, mo - 1, d, h, mi, 0);
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

export function generateSlots(
  rules: SlotRuleOptions = {},
  busy: BusyInterval[] = [],
  now: Date = new Date(),
): AvailableSlot[] {
  const workingDays = rules.workingDays ?? [1, 2, 3, 4, 5];
  const startHour = rules.startHour ?? 10;
  const endHour = rules.endHour ?? 19;
  const slotDurationMinutes = rules.slotDurationMinutes ?? 30;
  const daysAhead = rules.daysAhead ?? 7;
  const minNoticeMinutes = rules.minNoticeMinutes ?? 120;
  const timeZone = rules.timeZone ?? 'Asia/Almaty';

  // Determine local date parts for `now` in target timeZone
  const dtfLocal = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const nowParts = dtfLocal.formatToParts(now);
  let baseYear = 2026;
  let baseMonth = 1;
  let baseDay = 1;
  for (const part of nowParts) {
    const val = Number.parseInt(part.value, 10);
    if (part.type === 'year') baseYear = val;
    else if (part.type === 'month') baseMonth = val;
    else if (part.type === 'day') baseDay = val;
  }

  const busyParsed = busy.map((b) => ({
    start: new Date(b.start).getTime(),
    end: new Date(b.end).getTime(),
  }));

  const minAllowedTime = now.getTime() + minNoticeMinutes * 60_000;
  const slots: AvailableSlot[] = [];

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const targetMidday = new Date(Date.UTC(baseYear, baseMonth - 1, baseDay + dayOffset, 12, 0, 0));

    // Get formatted date in target timezone
    const dtfIso = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dateStr = dtfIso.format(targetMidday);

    // Compute day of week in target timezone (1 = Mon, 7 = Sun)
    const dtfWd = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    });
    const weekdayStr = dtfWd.format(targetMidday);
    const weekdayMap: Record<string, number> = {
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
      Sun: 7,
    };
    const dayOfWeek = weekdayMap[weekdayStr] ?? 1;

    if (!workingDays.includes(dayOfWeek)) {
      continue;
    }

    const startMinute = startHour * 60;
    const endMinute = endHour * 60;

    for (let m = startMinute; m + slotDurationMinutes <= endMinute; m += slotDurationMinutes) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

      const slotStart = zonedTimeToUtc(dateStr, timeStr, timeZone);
      const slotStartTime = slotStart.getTime();
      const slotEndTime = slotStartTime + slotDurationMinutes * 60_000;
      const slotEnd = new Date(slotEndTime);

      // Check min notice
      if (slotStartTime < minAllowedTime) {
        continue;
      }

      // Check overlaps with busy intervals
      const isBusy = busyParsed.some((b) => slotStartTime < b.end && slotEndTime > b.start);
      if (isBusy) {
        continue;
      }

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        date: dateStr,
        time: timeStr,
      });
    }
  }

  return slots;
}
