import type { ItineraryItem } from "./types";

type ReminderCallback = (item: ItineraryItem, minutesUntil: number) => void;

const activeTimers: ReturnType<typeof setTimeout>[] = [];

function parseTimeToDate(timeStr: string, baseDate: Date): Date {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return baseDate;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function scheduleReminders(
  items: ItineraryItem[],
  onReminder: ReminderCallback,
  leadTimeMinutes = 15
): void {
  clearReminders();

  const now = new Date();

  for (const item of items) {
    if (!item.time) continue;

    const venueTime = parseTimeToDate(item.time, now);
    const reminderTime = new Date(venueTime.getTime() - leadTimeMinutes * 60 * 1000);
    const msUntilReminder = reminderTime.getTime() - now.getTime();

    if (msUntilReminder > 0) {
      const timer = setTimeout(() => {
        onReminder(item, leadTimeMinutes);
      }, msUntilReminder);
      activeTimers.push(timer);
    }
  }
}

export function clearReminders(): void {
  for (const timer of activeTimers) {
    clearTimeout(timer);
  }
  activeTimers.length = 0;
}
