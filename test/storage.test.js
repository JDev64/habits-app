import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, normalizeState, readState, STORAGE_KEY, writeState } from '../src/storage.js';

test('first use starts with weekday guitar practice and reminders off', () => {
  const state = createDefaultState();
  assert.equal(state.habits[0].name, 'Gitarre üben');
  assert.equal(state.habits[0].criteria, 'Mindestens 10 Minuten spielen');
  assert.deepEqual(state.habits[0].schedule, { type: 'fixed', weekdays: [1, 2, 3, 4, 5] });
  assert.equal(state.settings.remindersEnabled, false);
});

test('saved flexible plans and completion dates are normalized', () => {
  const state = normalizeState({
    habits: [{
      id: 'read', name: '  Lesen  ', criteria: '  10 Seiten  ',
      schedule: { type: 'flexible', weeklyTarget: 3.4 },
      completedDates: ['2026-09-28', '2026-09-28', 'not-a-date'],
    }],
    settings: { remindersEnabled: true, reminderTime: '20:15' },
  });
  assert.equal(state.habits[0].name, 'Lesen');
  assert.deepEqual(state.habits[0].schedule, { type: 'flexible', weeklyTarget: 3 });
  assert.deepEqual(state.habits[0].completedDates, ['2026-09-28']);
  assert.deepEqual(state.settings, { remindersEnabled: true, reminderTime: '20:15', lastReminder: '' });
});

test('invalid stored data is discarded and uses a safe reminder time', () => {
  const state = normalizeState({ habits: [{ name: '   ' }], settings: { remindersEnabled: true, reminderTime: '29:78' } });
  assert.equal(state.habits.length, 0);
  assert.equal(state.settings.reminderTime, '19:00');
});

test('state is read and written through the browser storage boundary', () => {
  const records = new Map();
  const storage = {
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value),
  };
  const state = createDefaultState();
  state.habits[0].completedDates.push('2026-09-28');
  writeState(state, /** @type {Storage} */ (storage));
  assert.ok(records.has(STORAGE_KEY));
  assert.deepEqual(readState(/** @type {Storage} */ (storage)).habits[0].completedDates, ['2026-09-28']);
});
