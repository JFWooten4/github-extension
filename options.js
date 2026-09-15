const DEFAULT_MUTED_USERS = [
  'leighmcculloch',
  'rice2000',
  'tomerweller',
];

const hideInboxInput = document.getElementById('hide-inbox-while-busy');
const muteUsersInput = document.getElementById('mute-users-enabled');
const mutedUsersInput = document.getElementById('muted-users');
const status = document.getElementById('status');
let saveTimer = null;

function normalizeMutedUsers(value) {
  const seen = new Set();
  return value
    .split(/\r?\n/)
    .map((username) => username.trim().replace(/^@/, ''))
    .filter((username) => {
      const key = username.toLowerCase();
      if (!username || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function showSaved() {
  status.textContent = 'Saved. Reload open GitHub tabs to apply changes.';
  status.dataset.state = 'saved';
}

async function loadSettings() {
  const settings = await chrome.storage.local.get({
    hideInboxWhileBusy: true,
    muteUsersEnabled: true,
    mutedUsers: DEFAULT_MUTED_USERS,
  });

  hideInboxInput.checked = Boolean(settings.hideInboxWhileBusy);
  muteUsersInput.checked = Boolean(settings.muteUsersEnabled);
  mutedUsersInput.value = (
    Array.isArray(settings.mutedUsers) ? settings.mutedUsers : DEFAULT_MUTED_USERS
  ).join('\n');
}

async function saveSettings() {
  await chrome.storage.local.set({
    hideInboxWhileBusy: hideInboxInput.checked,
    muteUsersEnabled: muteUsersInput.checked,
    mutedUsers: normalizeMutedUsers(mutedUsersInput.value),
  });
  showSaved();
}

function queueSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void saveSettings();
  }, 250);
}

hideInboxInput.addEventListener('change', () => void saveSettings());
muteUsersInput.addEventListener('change', () => void saveSettings());
mutedUsersInput.addEventListener('input', queueSave);

void loadSettings();
