/** @typedef {'fixed' | 'flexible'} ScheduleType */

/**
 * Return a local calendar date as YYYY-MM-DD without converting through UTC.
 * @param {Date} [date]
 */
export function dateKeyFromDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** @param {string} dateKey */
export function dateFromKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

/** @param {string} dateKey */
export function isoWeekday(dateKey) {
  const day = dateFromKey(dateKey).getDay();
  return day === 0 ? 7 : day;
}

/** @param {string} dateKey @param {number} amount */
export function addDays(dateKey, amount) {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() + amount);
  return dateKeyFromDate(date);
}

/** @param {string} dateKey */
export function mondayOf(dateKey) {
  return addDays(dateKey, 1 - isoWeekday(dateKey));
}

/** @param {string} [referenceDate] */
export function weekDateKeys(referenceDate = dateKeyFromDate()) {
  const monday = mondayOf(referenceDate);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

/** @param {object} habit */
function safeCompletedDates(habit) {
  return Array.isArray(habit.completedDates) ? [...new Set(habit.completedDates)] : [];
}

/** @param {object} habit @param {string} dateKey */
export function isScheduledOn(habit, dateKey) {
  if (habit.schedule?.type === 'flexible') {
    if (isCompleteOn(habit, dateKey)) return true;
    const progress = summarizeHabitWeek(habit, dateKey);
    return progress.completed < progress.target;
  }
  return Array.isArray(habit.schedule?.weekdays) && habit.schedule.weekdays.includes(isoWeekday(dateKey));
}

/**
 * Weekly targets are scheduled weekdays for fixed habits and a completion count
 * for flexible habits. Fixed completions count only on their scheduled date.
 * @param {object} habit
 * @param {string} [referenceDate]
 */
export function summarizeHabitWeek(habit, referenceDate = dateKeyFromDate()) {
  const week = weekDateKeys(referenceDate);
  const completedDates = new Set(safeCompletedDates(habit));

  if (habit.schedule?.type === 'flexible') {
    const target = Math.max(0, Number(habit.schedule.weeklyTarget) || 0);
    const completed = week.filter((dateKey) => completedDates.has(dateKey)).length;
    return { target, completed: Math.min(completed, target), dates: week };
  }

  const scheduledDates = week.filter((dateKey) =>
    Array.isArray(habit.schedule?.weekdays) && habit.schedule.weekdays.includes(isoWeekday(dateKey)),
  );
  const completedDatesThisWeek = scheduledDates.filter((dateKey) => completedDates.has(dateKey));
  return {
    target: scheduledDates.length,
    completed: completedDatesThisWeek.length,
    dates: scheduledDates,
  };
}

/** @param {object[]} habits @param {string} [referenceDate] */
export function summarizeAllHabits(habits, referenceDate = dateKeyFromDate()) {
  return habits.reduce(
    (summary, habit) => {
      const progress = summarizeHabitWeek(habit, referenceDate);
      summary.target += progress.target;
      summary.completed += progress.completed;
      return summary;
    },
    { target: 0, completed: 0 },
  );
}

/** @param {object} habit @param {string} dateKey @param {string[]} [completedDates] */
export function isCompleteOn(habit, dateKey, completedDates = safeCompletedDates(habit)) {
  return completedDates.includes(dateKey);
}

/**
 * Find the next date this habit can be completed. Flexible goals can be done on
 * any day while there is still room in the current week's target.
 * @param {object} habit
 * @param {string} [fromDate]
 */
export function nextOpenDate(habit, fromDate = dateKeyFromDate()) {
  for (let offset = 0; offset <= 7; offset += 1) {
    const dateKey = addDays(fromDate, offset);
    if (isScheduledOn(habit, dateKey) && !isCompleteOn(habit, dateKey)) return dateKey;
  }
  return null;
}

/** @param {object} habit @param {string} dateKey */
export function toggleCompletion(habit, dateKey) {
  const completedDates = safeCompletedDates(habit);
  const alreadyComplete = completedDates.includes(dateKey);
  return {
    ...habit,
    completedDates: alreadyComplete
      ? completedDates.filter((completedDate) => completedDate !== dateKey)
      : [...completedDates, dateKey].sort(),
  };
}

/** @param {object} habit */
export function scheduleDescription(habit) {
  if (habit.schedule?.type === 'flexible') {
    const target = Number(habit.schedule.weeklyTarget) || 0;
    return `${target} ${target === 1 ? 'Einheit' : 'Einheiten'} pro Woche, flexibel`;
  }

  const names = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const days = [...(habit.schedule?.weekdays || [])].sort((left, right) => left - right);
  return days.map((day) => names[day - 1]).join(' · ');
}

/** @param {string} dateKey */
export function formatDate(dateKey) {
  return new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' }).format(dateFromKey(dateKey));
}

/** @param {string} dateKey */
export function formatWeekday(dateKey) {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(dateFromKey(dateKey));
}
