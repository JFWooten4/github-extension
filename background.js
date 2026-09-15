const DEFAULT_SETTINGS = {
  hideInboxWhileBusy: true,
  muteUsersEnabled: true,
  mutedUsers: [
    'leighmcculloch',
    'rice2000',
    'tomerweller',
  ],
};

async function initializeMissingSettings() {
  const keys = Object.keys(DEFAULT_SETTINGS);
  const stored = await chrome.storage.local.get(keys);
  const missing = {};

  for (const key of keys) {
    if (stored[key] === undefined) missing[key] = DEFAULT_SETTINGS[key];
  }

  if (Object.keys(missing).length) {
    await chrome.storage.local.set(missing);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void initializeMissingSettings();
});
