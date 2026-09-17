const DEFAULT_MUTED_USERS = [
  'leighmcculloch',
  'rice2000',
  'tomerweller',
];

const hideInboxInput = document.getElementById('hide-inbox-while-busy');
const blockTooltipsInput = document.getElementById('block-tooltips');
const muteUsersInput = document.getElementById('mute-users-enabled');
const mutedUsersList = document.getElementById('muted-users');
const mutedUsersSummary = document.getElementById('muted-users-summary');
const addMutedUserButton = document.getElementById('add-muted-user');
const mutedUserTemplate = document.getElementById('muted-user-template');
const status = document.getElementById('status');

let saveTimer = null;
let statusTimer = null;

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '');
}

function mutedUsersFromRows() {
  const users = [];
  const seen = new Set();

  for (const input of mutedUsersList.querySelectorAll('.muted-user-input')) {
    const username = normalizeUsername(input.value);
    const key = username.toLowerCase();
    if (!username || seen.has(key)) continue;
    seen.add(key);
    users.push(username);
  }

  return users;
}

function updateSummary(users = mutedUsersFromRows()) {
  mutedUsersSummary.textContent = users.length === 0
    ? 'None'
    : users.length === 1
      ? '1 person'
      : `${users.length} people`;
}

function updateEmptyState() {
  mutedUsersList.querySelector('.empty-state')?.remove();
  if (mutedUsersList.querySelector('.muted-user-row')) return;

  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.textContent = 'Nobody is muted.';
  mutedUsersList.append(empty);
}

function queueSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void saveSettings();
  }, 250);
}

function showSaved() {
  window.clearTimeout(statusTimer);
  status.textContent = 'Saved. Refresh open GitHub tabs to apply changes.';
  status.dataset.state = 'saved';
  statusTimer = window.setTimeout(() => {
    status.textContent = 'Changes save automatically.';
    delete status.dataset.state;
  }, 2500);
}

function addMutedUserRow(username = '', { focus = false } = {}) {
  mutedUsersList.querySelector('.empty-state')?.remove();

  const row = mutedUserTemplate.content.firstElementChild.cloneNode(true);
  const input = row.querySelector('.muted-user-input');
  const removeButton = row.querySelector('.remove-muted-user');

  input.value = username;
  input.addEventListener('input', () => {
    updateSummary();
    queueSave();
  });
  input.addEventListener('blur', () => {
    input.value = normalizeUsername(input.value);
    updateSummary();
    queueSave();
  });

  removeButton.addEventListener('click', () => {
    row.remove();
    updateEmptyState();
    updateSummary();
    void saveSettings();
  });

  mutedUsersList.append(row);
  if (focus) input.focus();
}

async function loadSettings() {
  const settings = await chrome.storage.local.get({
    hideInboxWhileBusy: true,
    blockTooltips: false,
    muteUsersEnabled: true,
    mutedUsers: DEFAULT_MUTED_USERS,
  });

  hideInboxInput.checked = Boolean(settings.hideInboxWhileBusy);
  blockTooltipsInput.checked = Boolean(settings.blockTooltips);
  muteUsersInput.checked = Boolean(settings.muteUsersEnabled);

  const mutedUsers = Array.isArray(settings.mutedUsers)
    ? settings.mutedUsers.map(normalizeUsername).filter(Boolean)
    : DEFAULT_MUTED_USERS;

  mutedUsersList.replaceChildren();
  for (const username of mutedUsers) addMutedUserRow(username);
  updateEmptyState();
  updateSummary(mutedUsers);
}

async function saveSettings() {
  const mutedUsers = mutedUsersFromRows();
  await chrome.storage.local.set({
    hideInboxWhileBusy: hideInboxInput.checked,
    blockTooltips: blockTooltipsInput.checked,
    muteUsersEnabled: muteUsersInput.checked,
    mutedUsers,
  });
  updateSummary(mutedUsers);
  showSaved();
}

hideInboxInput.addEventListener('change', () => void saveSettings());
blockTooltipsInput.addEventListener('change', () => void saveSettings());
muteUsersInput.addEventListener('change', () => void saveSettings());
addMutedUserButton.addEventListener('click', () => {
  addMutedUserRow('', { focus: true });
  updateSummary();
});

void loadSettings();
