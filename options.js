const DEFAULT_MUTED_USERS = [
  'leighmcculloch',
  'rice2000',
  'tomerweller',
];

const hideInboxInput = document.getElementById('hide-inbox-while-busy');
const organizationInboxesInput = document.getElementById('organization-notification-inboxes-enabled');
const notificationOrganizationsList = document.getElementById('notification-organizations');
const addNotificationOrganizationButton = document.getElementById('add-notification-organization');
const notificationOrganizationTemplate = document.getElementById('notification-organization-template');
const muteUsersInput = document.getElementById('mute-users-enabled');
const mutedUsersList = document.getElementById('muted-users');
const mutedUsersSummary = document.getElementById('muted-users-summary');
const addMutedUserButton = document.getElementById('add-muted-user');
const mutedUserTemplate = document.getElementById('muted-user-template');
const status = document.getElementById('status');

let saveTimer = null;
let statusTimer = null;

function normalizeAccountName(value) {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/^@+/, '')
    .replace(/\/+$/, '')
    .replace(/\s+/g, '');
}

function normalizeUsername(value) {
  return normalizeAccountName(value);
}

function normalizeOrganization(value) {
  return normalizeAccountName(value);
}

function valuesFromRows(list, inputSelector, normalize) {
  const values = [];
  const seen = new Set();

  for (const input of list.querySelectorAll(inputSelector)) {
    const value = normalize(input.value);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    values.push(value);
  }

  return values;
}

function mutedUsersFromRows() {
  return valuesFromRows(mutedUsersList, '.muted-user-input', normalizeUsername);
}

function notificationOrganizationsFromRows() {
  return valuesFromRows(
    notificationOrganizationsList,
    '.organization-input',
    normalizeOrganization,
  );
}

function updateSummary(users = mutedUsersFromRows()) {
  mutedUsersSummary.textContent = users.length === 0
    ? 'None'
    : users.length === 1
      ? '1 person'
      : `${users.length} people`;
}

function updateEmptyState(list, rowSelector, message) {
  list.querySelector('.empty-state')?.remove();
  if (list.querySelector(rowSelector)) return;

  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.textContent = message;
  list.append(empty);
}

function updateMutedUsersEmptyState() {
  updateEmptyState(mutedUsersList, '.muted-user-row', 'Nobody is muted.');
}

function updateOrganizationsEmptyState() {
  updateEmptyState(
    notificationOrganizationsList,
    '.organization-row',
    'No organization inboxes configured.',
  );
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

function addNotificationOrganizationRow(organization = '', { focus = false } = {}) {
  notificationOrganizationsList.querySelector('.empty-state')?.remove();

  const row = notificationOrganizationTemplate.content.firstElementChild.cloneNode(true);
  const input = row.querySelector('.organization-input');
  const removeButton = row.querySelector('.remove-notification-organization');

  input.value = organization;
  input.addEventListener('input', queueSave);
  input.addEventListener('blur', () => {
    input.value = normalizeOrganization(input.value);
    queueSave();
  });

  removeButton.addEventListener('click', () => {
    row.remove();
    updateOrganizationsEmptyState();
    void saveSettings();
  });

  notificationOrganizationsList.append(row);
  if (focus) input.focus();
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
    updateMutedUsersEmptyState();
    updateSummary();
    void saveSettings();
  });

  mutedUsersList.append(row);
  if (focus) input.focus();
}

async function loadSettings() {
  const settings = await chrome.storage.local.get({
    hideInboxWhileBusy: true,
    organizationNotificationInboxesEnabled: false,
    notificationOrganizations: [],
    muteUsersEnabled: true,
    mutedUsers: DEFAULT_MUTED_USERS,
  });

  hideInboxInput.checked = Boolean(settings.hideInboxWhileBusy);
  organizationInboxesInput.checked = Boolean(settings.organizationNotificationInboxesEnabled);
  muteUsersInput.checked = Boolean(settings.muteUsersEnabled);

  const organizations = Array.isArray(settings.notificationOrganizations)
    ? settings.notificationOrganizations.map(normalizeOrganization).filter(Boolean)
    : [];

  notificationOrganizationsList.replaceChildren();
  for (const organization of organizations) addNotificationOrganizationRow(organization);
  updateOrganizationsEmptyState();

  const mutedUsers = Array.isArray(settings.mutedUsers)
    ? settings.mutedUsers.map(normalizeUsername).filter(Boolean)
    : DEFAULT_MUTED_USERS;

  mutedUsersList.replaceChildren();
  for (const username of mutedUsers) addMutedUserRow(username);
  updateMutedUsersEmptyState();
  updateSummary(mutedUsers);
}

async function saveSettings() {
  const notificationOrganizations = notificationOrganizationsFromRows();
  const mutedUsers = mutedUsersFromRows();

  await chrome.storage.local.set({
    hideInboxWhileBusy: hideInboxInput.checked,
    organizationNotificationInboxesEnabled: organizationInboxesInput.checked,
    notificationOrganizations,
    muteUsersEnabled: muteUsersInput.checked,
    mutedUsers,
  });

  updateSummary(mutedUsers);
  showSaved();
}

hideInboxInput.addEventListener('change', () => void saveSettings());
organizationInboxesInput.addEventListener('change', () => void saveSettings());
addNotificationOrganizationButton.addEventListener('click', () => {
  addNotificationOrganizationRow('', { focus: true });
});
muteUsersInput.addEventListener('change', () => void saveSettings());
addMutedUserButton.addEventListener('click', () => {
  addMutedUserRow('', { focus: true });
  updateSummary();
});

void loadSettings();
