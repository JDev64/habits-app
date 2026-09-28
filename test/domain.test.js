import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  dateKeyFromDate,
  isScheduledOn,
  mondayOf,
  nextOpenDate,
  summarizeAllHabits,
  summarizeHabitWeek,
  toggleCompletion,
  weekDateKeys,
} from '../src/domain.js';

const guitar = {
  id: 'guitar',
  name: 'Gitarre üben',
  criteria: 'Mindestens 10 Minuten spielen',
  schedule: { type: 'fixed', weekdays: [1, 2, 3, 4, 5] },
  completedDates: [],
};

test('calendar weeks start on Monday and stay in local dates', () => {
  assert.equal(mondayOf('2026-09-27'), '2026-09-21');
  assert.deepEqual(weekDateKeys('2026-09-28'), [
    '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01',
    '2026-10-02', '2026-10-03', '2026-10-04',
  ]);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(dateKeyFromDate(new Date(2026, 8, 28, 23, 30)), '2026-09-28');
});

test('fixed weekday habits count only their scheduled dates', () => {
  const habit = { ...guitar, completedDates: ['2026-09-26', '2026-09-28', '2026-09-29'] };
  assert.equal(isScheduledOn(habit, '2026-09-28'), true);
  assert.equal(isScheduledOn(habit, '2026-09-26'), false);
  assert.deepEqual(summarizeHabitWeek(habit, '2026-09-28'), {
    target: 5,
    completed: 2,
    dates: ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'],
  });
});

test('flexible habits allow any day until the weekly target is met', () => {
  const habit = {
    ...guitar,
    schedule: { type: 'flexible', weeklyTarget: 3 },
    completedDates: ['2026-09-26', '2026-09-28'],
  };
  assert.equal(isScheduledOn(habit, '2026-09-30'), true);
  assert.equal(summarizeHabitWeek(habit, '2026-09-28').completed, 1);
  assert.equal(nextOpenDate(habit, '2026-09-29'), '2026-09-29');
  const goalReached = { ...habit, completedDates: ['2026-09-28', '2026-09-29', '2026-09-30'] };
  assert.equal(isScheduledOn(goalReached, '2026-09-30'), true);
  assert.equal(isScheduledOn(goalReached, '2026-10-01'), false);
});

test('completion checkmarks can be added and undone by date', () => {
  const completed = toggleCompletion(guitar, '2026-09-28');
  assert.equal(summarizeHabitWeek(completed, '2026-09-28').completed, 1);
  assert.deepEqual(toggleCompletion(completed, '2026-09-28').completedDates, []);
});

test('overall progress sums the habits for the selected Monday-to-Sunday week', () => {
  const flexible = { ...guitar, id: 'read', schedule: { type: 'flexible', weeklyTarget: 2 }, completedDates: ['2026-09-28'] };
  assert.deepEqual(summarizeAllHabits([guitar, flexible], '2026-09-28'), { target: 7, completed: 1 });
});
