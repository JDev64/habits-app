export const STORAGE_KEY = 'takt.habits.v1';

/**
 * @returns {{ version: number, habits: object[], settings: { remindersEnabled: boolean, reminderTime: string, lastReminder: string } }}
 */
export function createDefaultState() {
  return {
    version: 1,
    habits: [
      {
        id: 'guitar-practice',
        name: 'Gitarre üben',
        criteria: 'Mindestens 10 Minuten spielen',
        schedule: { type: 'fixed', weekdays: [1, 2, 3, 4, 5] },
        completedDates: [],
      },
    ],
    settings: { remindersEnabled: false, reminderTime: '19:00', lastReminder: '' },
  };
}

/** @param {unknown} value */
export function normalizeState(value) {
  const fallback = createDefaultState();
  if (!value || typeof value !== 'object') return fallback;
  const candidate = /** @type {Record<string, any>} */ (value);
  const habits = Array.isArray(candidate.habits)
    ? candidate.habits.map(normalizeHabit).filter(Boolean)
    : fallback.habits;
  const settings = candidate.settings && typeof candidate.settings === 'object' ? candidate.settings : {};
  return {
    version: 1,
    habits,
    settings: {
      remindersEnabled: settings.remindersEnabled === true,
      reminderTime: isValidTime(settings.reminderTime) ? settings.reminderTime : '19:00',
      lastReminder: typeof settings.lastReminder === 'string' ? settings.lastReminder : '',
    },
  };
}

/** @param {unknown} value */
function isValidTime(value) {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(':').map(Number);
  return hour <= 23 && minute <= 59;
}

/** @param {unknown} value */
function normalizeHabit(value) {
  if (!value || typeof value !== 'object') return null;
  const habit = /** @type {Record<string, any>} */ (value);
  const name = typeof habit.name === 'string' ? habit.name.trim().slice(0, 48) : '';
  if (!name) return null;
  const schedule = habit.schedule && typeof habit.schedule === 'object' ? habit.schedule : {};
  let normalizedSchedule;
  if (schedule.type === 'flexible') {
    const weeklyTarget = Math.min(7, Math.max(1, Math.round(Number(schedule.weeklyTarget) || 1)));
    normalizedSchedule = { type: 'flexible', weeklyTarget };
  } else {
    const weekdays = Array.isArray(schedule.weekdays)
      ? [...new Set(schedule.weekdays.map(Number).filter((day) => Number.isInteger(day) && day >= 1 && day <= 7))].sort()
      : [];
    normalizedSchedule = { type: 'fixed', weekdays: weekdays.length ? weekdays : [1, 2, 3, 4, 5] };
  }
  const completedDates = Array.isArray(habit.completedDates)
    ? [...new Set(habit.completedDates.filter((date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)))].sort()
    : [];
  return {
    id: typeof habit.id === 'string' && habit.id ? habit.id : (globalThis.crypto?.randomUUID?.() ?? `habit-${Date.now()}`),
    name,
    criteria: typeof habit.criteria === 'string' ? habit.criteria.trim().slice(0, 120) : '',
    schedule: normalizedSchedule,
    completedDates,
  };
}

/** @param {Storage} [storage] */
export function readState(storage) {
  try {
    const raw = (storage ?? globalThis.localStorage)?.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : createDefaultState();
  } catch {
    return createDefaultState();
  }
}

/** @param {object} state @param {Storage} [storage] */
export function writeState(state, storage) {
  try {
    (storage ?? globalThis.localStorage)?.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
  } catch {
    // The app stays usable for the current session if browser storage is unavailable.
  }
}
