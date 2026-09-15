(async () => {
  'use strict';

  const { hideInboxWhileBusy = true } = await chrome.storage.local.get({
    hideInboxWhileBusy: true,
  });
  if (!hideInboxWhileBusy) return;

  const STYLE_ID = 'github-extension-hide-inbox-style';
  const BUSY_ATTR = 'data-github-viewer-busy';
  const BUSY_CACHE_KEY = 'github-viewer-busy';
  const CHECK_INTERVAL_MS = 60_000;
  const STATUS_URL = '/users/status?circle=0&compact=1&link_mentions=1&truncate=0';
  const BUSY_CONTROL_SELECTOR = [
    'input[name="limited_availability"]',
    'input.js-user-status-limited-availability-checkbox',
  ].join(',');
  const CSS = `
    html[${BUSY_ATTR}="true"] #AppHeader-notifications-button,
    html[${BUSY_ATTR}="true"] .AppHeader a[href="/notifications"],
    html[${BUSY_ATTR}="true"] .AppHeader a[href^="/notifications?"],
    html[${BUSY_ATTR}="true"] .AppHeader a[aria-label*="notification" i],
    html[${BUSY_ATTR}="true"] .AppHeader button[aria-label*="notification" i],
    html[${BUSY_ATTR}="true"] header[role="banner"] a[href="/notifications"],
    html[${BUSY_ATTR}="true"] header[role="banner"] a[href^="/notifications?"],
    html[${BUSY_ATTR}="true"] header[role="banner"] a[aria-label*="notification" i],
    html[${BUSY_ATTR}="true"] header[role="banner"] button[aria-label*="notification" i],
    html[${BUSY_ATTR}="true"] header[role="banner"] a:has(.octicon-inbox),
    html[${BUSY_ATTR}="true"] header[role="banner"] button:has(.octicon-inbox),
    html[${BUSY_ATTR}="true"] header[role="banner"] a:has(.octicon-bell),
    html[${BUSY_ATTR}="true"] header[role="banner"] button:has(.octicon-bell) {
      display: none !important;
    }
  `;

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return true;

    const root = document.head || document.documentElement;
    if (!root) return false;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    root.append(style);
    return true;
  }

  function setBusy(isBusy) {
    if (!document.documentElement) return;

    if (isBusy) {
      document.documentElement.setAttribute(BUSY_ATTR, 'true');
    } else {
      document.documentElement.removeAttribute(BUSY_ATTR);
    }
  }

  function readCachedBusyStatus() {
    try {
      const value = window.localStorage.getItem(BUSY_CACHE_KEY);
      if (value === 'true') return true;
      if (value === 'false') return false;
    } catch (error) {
      console.warn('[GitHub Extension]', error.message);
    }

    return null;
  }

  function cacheBusyStatus(isBusy) {
    try {
      window.localStorage.setItem(BUSY_CACHE_KEY, String(isBusy));
    } catch (error) {
      console.warn('[GitHub Extension]', error.message);
    }
  }

  function applyBusyStatus(isBusy) {
    cacheBusyStatus(isBusy);
    setBusy(isBusy);
  }

  function restoreCachedBusyStatus() {
    const cachedBusy = readCachedBusyStatus();
    if (cachedBusy === null) return;

    if (document.documentElement) {
      setBusy(cachedBusy);
      return;
    }

    const observer = new MutationObserver(() => {
      if (!document.documentElement) return;
      observer.disconnect();
      setBusy(cachedBusy);
    });

    observer.observe(document, { childList: true });
  }

  function parseBusyStatus(statusDocument) {
    const busyControl = statusDocument.querySelector(BUSY_CONTROL_SELECTOR);
    if (busyControl) {
      return (
        busyControl.checked ||
        busyControl.hasAttribute('checked') ||
        busyControl.getAttribute('aria-checked') === 'true'
      );
    }

    const legacyStatus = statusDocument.querySelector('.js-user-status-container');
    if (legacyStatus) {
      return legacyStatus.classList.contains('user-status-busy');
    }

    throw new Error('GitHub status response did not contain a Busy status control');
  }

  async function fetchBusyStatus() {
    const statusUrl = new URL(STATUS_URL, window.location.origin);
    statusUrl.searchParams.set('_', String(Date.now()));

    const response = await window.fetch(statusUrl, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'text/html',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub status request returned ${response.status}`);
    }

    const markup = await response.text();
    const statusDocument = new DOMParser().parseFromString(markup, 'text/html');
    return parseBusyStatus(statusDocument);
  }

  async function checkBusyStatus() {
    try {
      applyBusyStatus(await fetchBusyStatus());
    } catch (error) {
      console.warn('[GitHub Extension]', error.message);
    }
  }

  function scheduleStatusRefresh() {
    window.setTimeout(() => void checkBusyStatus(), 500);
    window.setTimeout(() => void checkBusyStatus(), 1_500);
  }

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (form instanceof HTMLFormElement && form.matches('.js-user-status-form')) {
      scheduleStatusRefresh();
    }
  }, true);

  document.addEventListener('turbo:load', () => void checkBusyStatus());
  document.addEventListener('pjax:end', () => void checkBusyStatus());
  window.addEventListener('focus', () => void checkBusyStatus());

  restoreCachedBusyStatus();

  if (!installStyle()) {
    const observer = new MutationObserver(() => {
      if (installStyle()) observer.disconnect();
    });

    observer.observe(document, { childList: true, subtree: true });
  }

  void checkBusyStatus();
  window.setInterval(checkBusyStatus, CHECK_INTERVAL_MS);
})();
