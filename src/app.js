import {
  dateKeyFromDate,
  formatDate,
  formatWeekday,
  isCompleteOn,
  isScheduledOn,
  nextOpenDate,
  scheduleDescription,
  summarizeAllHabits,
  summarizeHabitWeek,
  toggleCompletion,
  weekDateKeys,
} from './domain.js';
import { readState, writeState } from './storage.js';

let state = readState();
let installPromptEvent = null;
let serviceWorkerRegistration = null;
let toastTimeout = 0;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const today = () => dateKeyFromDate();
const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

const guitarTips = [
  'Stimme dein Instrument, bevor du anfängst. Ein klarer erster Handgriff macht den Einstieg leichter.',
  'Wiederhole einen Übergang langsam ein paar Mal. Saubere Bewegung ist heute genug.',
  'Spiele zum Start etwas, das du schon gern magst. Vertrautheit hilft, ins Üben zu kommen.',
  'Lege dein Instrument vorher griffbereit. So bleibt zwischen Vorhaben und Anfang nur ein kleiner Schritt.',
  'Eine ruhige Wiederholung kann mehr bringen als ein neues Stück. Bleib für heute bei einer Sache.',
];
const movementTips = [
  'Lege deine Kleidung vorher bereit. Ein leichter Anfang macht es einfacher, bei deinem vollen Ziel anzukommen.',
  'Beginne mit einer Bewegung, die sich vertraut anfühlt. Du kannst dein Tempo danach selbst finden.',
  'Stell Wasser bereit, bevor du loslegst. Kleine Vorbereitungen nehmen dem Start Reibung.',
];
const readingTips = [
  'Lass das Buch dort liegen, wo du dich gern hinsetzt. Ein sichtbarer Anfang ist oft der einfachste.',
  'Lies an einem ruhigen Ort, an dem du dich wohlfühlst. Du musst nicht weiterkommen als dein volles Ziel.',
  'Such dir vorab eine Stelle aus, auf die du dich freust. Das gibt deiner Lesezeit einen sanften Anfang.',
];
const calmTips = [
  'Such dir einen ruhigen Platz und lass dein Handy außer Reichweite. Ein klarer Ort kann beim Ankommen helfen.',
  'Beginne mit einem ruhigen Atemzug. Danach folgst du einfach deinem eigenen Plan.',
  'Ein fester, bequemer Platz kann aus deinem Vorhaben ein vertrautes Ritual machen.',
];
const generalTips = [
  (name) => `Mach den ersten Handgriff für ${name} sichtbar: Lege bereit, was du dafür brauchst.`,
  (name) => `Verknüpfe ${name} mit etwas, das ohnehin zu deinem Tag gehört. Das macht den Einstieg leichter.`,
  (name) => `Nimm dir heute nur dein selbst gewähltes Ziel für ${name} vor. Mehr ist nicht nötig.`,
];
const defaultHabitPresentation = {
  tips: generalTips,
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v4M12 16.5v4M3.5 12h4m9 0h4M6 6l2.8 2.8m6.4 6.4L18 18m0-12-2.8 2.8m-6.4 6.4L6 18"/><circle cx="12" cy="12" r="3.7"/></svg>',
};
const habitPresentations = [
  {
    pattern: /gitarr|musik|instrument|klavier|bass/,
    tips: guitarTips,
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.4 5.3 17 8.9m-5.3-6.1 9.5 9.5-5.5 5.5-9.5-9.5 5.5-5.5ZM5.3 12.4l6.3 6.3-2.9 2.9a3.5 3.5 0 0 1-4.9-4.9l1.5-1.5m11.9-7.5-4.8 4.8m-3.1 3.1 2.1-2.1"/></svg>',
  },
  {
    pattern: /les|buch|roman/,
    tips: readingTips,
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7.5c-2.5-2-5.4-2.1-8.5-1.1v12c3.1-1 6-.9 8.5 1.1m0-12c2.5-2 5.4-2.1 8.5-1.1v12c-3.1-1-6-.9-8.5 1.1m0-12v12"/></svg>',
  },
  {
    pattern: /sport|beweg|lauf|yoga|training|fitness|spazier/,
    tips: movementTips,
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 15 4-4 3 2 6-7m-1-1h4v4M4 20h16"/></svg>',
  },
  { pattern: /medit|atem|ruhe|achtsam/, tips: calmTips, icon: defaultHabitPresentation.icon },
];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}

function habitsDueOn(dateKey) {
  return state.habits.filter((habit) => isScheduledOn(habit, dateKey));
}

function upcomingHabit() {
  return state.habits
    .map((habit) => ({ habit, date: nextOpenDate(habit, today()) }))
    .filter((item) => item.date)
    .sort((left, right) => left.date.localeCompare(right.date))[0] || null;
}

function focusHabit() {
  const due = habitsDueOn(today());
  return due.find((habit) => !isCompleteOn(habit, today())) || due[0] || upcomingHabit()?.habit || state.habits[0] || null;
}

function insightText() {
  if (!state.habits.length) return 'Deine Übersicht beginnt, sobald du eine Gewohnheit festlegst. Wähle ein Ziel, das sich in deinem Alltag gut anfühlt.';
  const habit = focusHabit() || state.habits[0];
  const progress = summarizeHabitWeek(habit, today());
  const nextDate = nextOpenDate(habit, today());
  if (progress.target && progress.completed >= progress.target) {
    return `Du hast dein Wochenziel für ${habit.name} erreicht. Lass den Erfolg kurz bei dir ankommen.`;
  }
  if (progress.completed > 0) {
    const remaining = progress.target - progress.completed;
    return `Du hast ${progress.completed} von ${progress.target} ${progress.target === 1 ? 'Einheit' : 'Einheiten'} für ${habit.name} erledigt. ${remaining} ${remaining === 1 ? 'steht' : 'stehen'} noch aus${nextDate ? ` — der nächste passende Tag ist ${formatWeekday(nextDate)}` : ''}.`;
  }
  if (!nextDate) return `Dein Wochenziel für ${habit.name} ist bereits vollständig. Eine neue Woche startet am Montag.`;
  if (nextDate === today()) return `Dein Plan für ${habit.name} ist diese Woche noch offen. Heute ist ein passender Tag für den ersten Haken.`;
  return `Dein nächster geplanter Tag für ${habit.name} ist ${formatWeekday(nextDate)}, der ${formatDate(nextDate)}. Bis dahin darf dein Alltag Platz haben.`;
}

function habitPresentationFor(habit) {
  if (!habit) return defaultHabitPresentation;
  const name = `${habit.name} ${habit.criteria}`.toLocaleLowerCase('de-DE');
  return habitPresentations.find((presentation) => presentation.pattern.test(name)) || defaultHabitPresentation;
}

function tipFor(habit) {
  if (!habit) return 'Fang mit einer kleinen Vorbereitung an, die zu deiner Gewohnheit passt. Der Einstieg darf sich leicht anfühlen.';
  const { tips } = habitPresentationFor(habit);
  const index = Math.floor(Date.now() / 86_400_000) % tips.length;
  const tip = tips[index];
  return typeof tip === 'function' ? tip(habit.name) : tip;
}

function renderWelcome() {
  const date = today();
  const dateText = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`));
  $('#today-label').textContent = `${getGreeting()} · ${dateText}`;
  $('#welcome-title').innerHTML = `${getGreeting()}. Ein kleiner Schritt<br><em>zählt.</em>`;
}

function renderFocus() {
  const card = $('#focus-card');
  const due = habitsDueOn(today());
  const open = due.filter((habit) => !isCompleteOn(habit, today()));
  const completed = due.filter((habit) => isCompleteOn(habit, today()));

  if (!state.habits.length) {
    card.innerHTML = `
      <div class="focus-topline"><span class="focus-status-dot"></span> DEIN ERSTER SCHRITT</div>
      <div class="focus-body focus-empty"><h2>Was möchtest du<br>regelmäßig für dich tun?</h2><p>Lege eine Gewohnheit fest. Du bestimmst den Rhythmus und was als voller Erfolg zählt.</p></div>
      <div class="focus-bottom"><button class="button" type="button" data-action="add">＋ Gewohnheit festlegen</button><span class="focus-secondary">Dein Plan passt sich deinem Alltag an.</span></div>`;
    return;
  }

  if (open.length) {
    const habit = open[0];
    const more = open.length > 1 ? `Außerdem heute: ${open.slice(1).map((item) => item.name).join(', ')}.` : 'Ein Häkchen, wenn du dein volles Ziel erreicht hast.';
    card.innerHTML = `
      <div class="focus-topline"><span class="focus-status-dot"></span> HEUTE IST DEIN MOMENT</div>
      <div class="focus-body"><h2>${escapeHtml(habit.name)}</h2><p>${escapeHtml(habit.criteria || 'Dein persönliches Ziel')} · ${escapeHtml(scheduleDescription(habit))}</p></div>
      <div class="focus-bottom"><button class="button" type="button" data-action="complete" data-id="${escapeHtml(habit.id)}"><span aria-hidden="true">✓</span> Einheit abhaken</button><span class="focus-secondary">${escapeHtml(more)}</span></div>`;
    return;
  }

  if (completed.length) {
    const habit = completed[completed.length - 1];
    card.innerHTML = `
      <div class="focus-topline"><span class="focus-status-dot is-done"></span> FÜR HEUTE ABGEHAKT</div>
      <div class="focus-body"><h2>Das hast du heute<br>für dich getan.</h2><p>${completed.map((item) => escapeHtml(item.name)).join(' · ')} — schön, dass du dir die Zeit genommen hast.</p></div>
      <div class="focus-bottom"><button class="button" type="button" data-action="undo" data-id="${escapeHtml(habit.id)}">Eintrag rückgängig</button><span class="focus-secondary">Du kannst hier jederzeit etwas korrigieren.</span></div>`;
    return;
  }

  const next = upcomingHabit();
  if (!next) {
    card.innerHTML = `
      <div class="focus-topline"><span class="focus-status-dot is-done"></span> DEINE WOCHE IST VOLL</div>
      <div class="focus-body"><h2>Du hast dein Wochenziel erreicht.</h2><p>Deine Gewohnheiten sind für diese Woche vollständig. Genieß den Moment, bevor am Montag ein neuer Rhythmus beginnt.</p></div>
      <div class="focus-bottom"><span class="focus-secondary">Ohne Punkte, ohne Druck — einfach gut drangeblieben.</span></div>`;
    return;
  }
  const nextDescription = next.habit.schedule?.type === 'flexible'
    ? `Dein Wochenziel für ${next.habit.name} ist geschafft. Der nächste Wochenrhythmus beginnt am Montag, den ${formatDate(next.date)}.`
    : `${next.habit.name} ist wieder am ${formatWeekday(next.date)}, den ${formatDate(next.date)} geplant.`;
  card.innerHTML = `
    <div class="focus-topline"><span class="focus-status-dot"></span> HEUTE OHNE FESTEN TERMIN</div>
    <div class="focus-body"><h2>${next.habit.schedule?.type === 'flexible' ? 'Diese Woche darfst du es dabei belassen.' : 'Dein nächster Schritt<br>ist schon eingeplant.'}</h2><p>${escapeHtml(nextDescription)}</p></div>
    <div class="focus-bottom"><span class="focus-secondary">Heute darf eine Pause sein.</span></div>`;
}

function renderWeek() {
  const progress = summarizeAllHabits(state.habits, today());
  const percent = progress.target ? Math.round((progress.completed / progress.target) * 100) : 0;
  $('#week-count').textContent = `${progress.completed} / ${progress.target}`;
  $('#week-progress-fill').style.width = `${percent}%`;
  const keys = weekDateKeys(today());
  $('#week-days').innerHTML = keys.map((dateKey, index) => {
    const hasCompletion = state.habits.some((habit) => isCompleteOn(habit, dateKey));
    const hasFixedSchedule = state.habits.some((habit) =>
      habit.schedule?.type === 'fixed' && isScheduledOn(habit, dateKey),
    );
    const isToday = dateKey === today();
    const classes = ['day-cell', hasFixedSchedule ? 'is-due' : '', hasCompletion ? 'is-complete' : '', isToday ? 'is-today' : ''].filter(Boolean).join(' ');
    const mark = hasCompletion ? '✓' : hasFixedSchedule ? '·' : '—';
    return `<div class="${classes}" role="listitem" aria-label="${dayNames[index]}${isToday ? ', heute' : ''}${hasCompletion ? ', erledigt' : hasFixedSchedule ? ', geplant' : ''}"><strong>${dayNames[index].slice(0, 2)}</strong><span class="day-mark" aria-hidden="true">${mark}</span></div>`;
  }).join('');

  if (!progress.target) {
    $('#week-caption').textContent = 'Lege eine Gewohnheit an, um deinen Wochenfortschritt zu sehen.';
  } else if (progress.completed >= progress.target) {
    $('#week-caption').textContent = 'Dein Wochenziel ist erreicht. Lass es für diese Woche dabei.';
  } else {
    const remaining = progress.target - progress.completed;
    $('#week-caption').textContent = `${remaining} ${remaining === 1 ? 'Einheit' : 'Einheiten'} ${remaining === 1 ? 'liegt' : 'liegen'} noch vor dir — Schritt für Schritt.`;
  }
}

function habitSymbol(habit) {
  return habitPresentationFor(habit).icon;
}

function renderHabits() {
  const list = $('#habit-list');
  if (!state.habits.length) {
    list.innerHTML = '<div class="empty-habits">Hier ist Platz für das, was dir wichtig ist. Beginne mit einer Gewohnheit, die du gern in deinen Alltag holen möchtest.</div>';
    return;
  }
  list.innerHTML = state.habits.map((habit) => {
    const progress = summarizeHabitWeek(habit, today());
    const schedule = scheduleDescription(habit) || 'Kein Wochentag ausgewählt';
    return `
      <article class="habit-card">
        <span class="habit-symbol">${habitSymbol(habit)}</span>
        <div class="habit-info"><h3>${escapeHtml(habit.name)}</h3><p>${escapeHtml(habit.criteria || 'Dein persönliches Ziel')}</p><div class="habit-meta"><span>${escapeHtml(schedule)}</span><span class="meta-separator">·</span><span>Diese Woche ${progress.completed}/${progress.target}</span></div></div>
        <div class="habit-card-actions"><span class="habit-progress" aria-label="${progress.completed} von ${progress.target} Einheiten">${progress.completed}/${progress.target}</span>${isCompleteOn(habit, today()) ? `<button class="completion-indicator" type="button" data-action="undo" data-id="${escapeHtml(habit.id)}" aria-label="Heutigen Eintrag für ${escapeHtml(habit.name)} rückgängig machen">✓</button>` : ''}<details class="habit-menu"><summary class="icon-button" aria-label="Aktionen für ${escapeHtml(habit.name)}">···</summary><div class="menu-options"><button type="button" data-action="edit" data-id="${escapeHtml(habit.id)}">Bearbeiten</button><button type="button" data-action="delete" data-id="${escapeHtml(habit.id)}">Entfernen</button></div></details></div>
      </article>`;
  }).join('');
}

function renderPersonalContent() {
  $('#insight-copy').textContent = insightText();
  const habit = focusHabit() || state.habits[0] || null;
  $('#tip-copy').textContent = tipFor(habit);
}

function renderSettings() {
  $('#reminder-enabled').checked = state.settings.remindersEnabled;
  $('#reminder-time').value = state.settings.reminderTime;
  $('#reminder-time').disabled = !state.settings.remindersEnabled;
}

function render() {
  renderWelcome();
  renderFocus();
  renderWeek();
  renderHabits();
  renderPersonalContent();
  renderSettings();
}

function persist() {
  writeState(state);
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove('is-visible'), 3000);
}

function updateHabitCompletion(habitId) {
  const index = state.habits.findIndex((habit) => habit.id === habitId);
  if (index < 0) return;
  const wasComplete = isCompleteOn(state.habits[index], today());
  state.habits[index] = toggleCompletion(state.habits[index], today());
  persist();
  render();
  const progress = summarizeHabitWeek(state.habits[index], today());
  if (wasComplete) showToast('Eintrag für heute entfernt.');
  else if (progress.completed === progress.target) showToast('Dein Wochenziel ist erreicht. Gut drangeblieben.');
  else showToast('Für heute abgehakt. Schön, dass du dir die Zeit genommen hast.');
}

function openHabitDialog(habitId = '') {
  const dialog = $('#habit-dialog');
  const form = $('#habit-form');
  const habit = state.habits.find((item) => item.id === habitId);
  form.reset();
  $('#habit-id').value = habit?.id || '';
  $('#dialog-title').textContent = habit ? 'Gewohnheit bearbeiten' : 'Neue Gewohnheit';
  $('#habit-name').value = habit?.name || '';
  $('#habit-criteria').value = habit?.criteria || '';
  const scheduleType = habit?.schedule?.type || 'fixed';
  $(`input[name="schedule-type"][value="${scheduleType}"]`).checked = true;
  const weekdays = habit?.schedule?.weekdays || [1, 2, 3, 4, 5];
  $$('input[name="weekday"]').forEach((input) => { input.checked = weekdays.includes(Number(input.value)); });
  $('#weekly-target').value = String(habit?.schedule?.weeklyTarget || 3);
  $('#schedule-error').hidden = true;
  updateScheduleFields();
  dialog.showModal();
  $('#habit-name').focus();
}

function updateScheduleFields() {
  const selected = $('input[name="schedule-type"]:checked')?.value || 'fixed';
  $('#fixed-days-detail').hidden = selected !== 'fixed';
  $('#flexible-detail').hidden = selected !== 'flexible';
}

function saveHabitFromForm(event) {
  event.preventDefault();
  const selectedType = $('input[name="schedule-type"]:checked').value;
  const weekdays = $$('input[name="weekday"]:checked').map((input) => Number(input.value));
  if (selectedType === 'fixed' && !weekdays.length) {
    $('#schedule-error').hidden = false;
    return;
  }
  const id = $('#habit-id').value || (globalThis.crypto?.randomUUID?.() ?? `habit-${Date.now()}`);
  const habit = {
    id,
    name: $('#habit-name').value.trim(),
    criteria: $('#habit-criteria').value.trim(),
    schedule: selectedType === 'fixed'
      ? { type: 'fixed', weekdays }
      : { type: 'flexible', weeklyTarget: Number($('#weekly-target').value) },
    completedDates: state.habits.find((item) => item.id === id)?.completedDates || [],
  };
  const existingIndex = state.habits.findIndex((item) => item.id === id);
  if (existingIndex >= 0) state.habits[existingIndex] = habit;
  else state.habits.push(habit);
  persist();
  $('#habit-dialog').close();
  render();
  showToast(existingIndex >= 0 ? 'Gewohnheit aktualisiert.' : 'Deine neue Gewohnheit ist gespeichert.');
}

function removeHabit(habitId) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit || !window.confirm(`„${habit.name}“ und die dazugehörigen Einträge entfernen?`)) return;
  state.habits = state.habits.filter((item) => item.id !== habitId);
  persist();
  render();
  showToast('Gewohnheit entfernt.');
}

function exportData() {
  const backup = {
    exportedAt: new Date().toISOString(),
    app: 'Takt',
    version: 1,
    ...state,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `takt-sicherung-${today()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('Deine Sicherung wurde heruntergeladen.');
}

function dueIncompleteHabits(dateKey = today()) {
  return state.habits.filter((habit) => isScheduledOn(habit, dateKey) && !isCompleteOn(habit, dateKey));
}

async function toggleReminders(enabled) {
  if (enabled) {
    if (!('Notification' in window)) {
      state.settings.remindersEnabled = false;
      renderSettings();
      showToast('Dieser Browser unterstützt keine Benachrichtigungen.');
      return;
    }
    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      state.settings.remindersEnabled = false;
      renderSettings();
      showToast('Benachrichtigungen sind noch nicht freigegeben.');
      return;
    }
  }
  state.settings.remindersEnabled = enabled;
  persist();
  renderSettings();
  if (enabled) {
    showToast('Erinnerung aktiviert. Takt prüft, wenn die App geöffnet ist.');
    checkReminder();
  } else {
    showToast('Erinnerung ausgeschaltet.');
  }
}

async function sendReminder(habit) {
  const options = {
    body: `Heute ist ${habit.name} geplant: ${habit.criteria || 'dein selbst gewähltes Ziel'}.`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: `takt-${today()}`,
    renotify: false,
    data: { url: '/' },
  };
  try {
    if (serviceWorkerRegistration?.showNotification) await serviceWorkerRegistration.showNotification('Ein Moment für dich', options);
    else new Notification('Ein Moment für dich', options);
  } catch {
    // Permission can be revoked by the browser while this tab is open.
  }
}

function checkReminder() {
  if (!state.settings.remindersEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
  const currentTime = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
  if (currentTime < state.settings.reminderTime) return;
  const reminderKey = `${today()}|${state.settings.reminderTime}`;
  if (state.settings.lastReminder === reminderKey) return;
  const [habit] = dueIncompleteHabits();
  if (!habit) return;
  state.settings.lastReminder = reminderKey;
  persist();
  void sendReminder(habit);
}

function onAppClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'add') openHabitDialog();
  else if (action === 'edit') openHabitDialog(id);
  else if (action === 'delete') removeHabit(id);
  else if (action === 'complete' || action === 'undo') updateHabitCompletion(id);
  else if (action === 'export') exportData();
  else if (action === 'close-dialog') $('#habit-dialog').close();
  else if (action === 'install' && installPromptEvent) {
    installPromptEvent.prompt();
    installPromptEvent.userChoice.finally(() => {
      installPromptEvent = null;
      button.hidden = true;
    });
  }
}

document.addEventListener('click', onAppClick);
$('#habit-form').addEventListener('submit', saveHabitFromForm);
$$('input[name="schedule-type"]').forEach((input) => input.addEventListener('change', updateScheduleFields));
$('#reminder-enabled').addEventListener('change', (event) => { void toggleReminders(event.currentTarget.checked); });
$('#reminder-time').addEventListener('change', (event) => {
  state.settings.reminderTime = event.currentTarget.value || '19:00';
  state.settings.lastReminder = '';
  persist();
  checkReminder();
});
$('#habit-dialog').addEventListener('click', (event) => {
  if (event.target === $('#habit-dialog')) $('#habit-dialog').close();
});
$('#habit-dialog').addEventListener('close', () => { $('#schedule-error').hidden = true; });
window.addEventListener('focus', checkReminder);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkReminder(); });

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPromptEvent = event;
  $('.install-button').hidden = false;
});
window.addEventListener('appinstalled', () => {
  installPromptEvent = null;
  $('.install-button').hidden = true;
  showToast('Takt ist jetzt auf deinem Gerät.');
});

render();
checkReminder();
window.setInterval(checkReminder, 30_000);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then((registration) => {
    serviceWorkerRegistration = registration;
    checkReminder();
  }).catch(() => {
    // The app remains available online even if offline installation is unavailable.
  });
}
