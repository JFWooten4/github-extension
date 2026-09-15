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
  const STATUS_URL = '/users/status?compact=1&link_mentions=0&truncate=1';
  const CSS = `
    html[${BUSY_ATTR}="true"] #AppHeader-notifications-button,
    html[${BUSY_ATTR}="true"] .AppHeader a[href="/notifications"],
    html[${BUSY_ATTR}="true"] .AppHeader a[href^="/notifications?"],
    html[${BUSY_ATTR}="true"] header[role="banner"] a[href="/notifications"],
    html[${BUSY_ATTR}="true"] header[role="banner"] a[href^="/notifications?"] {
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

  async function fetchBusyStatus() {
    const response = await window.fetch(STATUS_URL, {
      credentials: 'same-origin',
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
    const status = statusDocument.querySelector('.js-user-status-container');

    if (!status) {
      throw new Error('GitHub status response did not contain a status control');
    }

    return status.classList.contains('user-status-busy');
  }

  async function checkBusyStatus() {
    try {
      const isBusy = await fetchBusyStatus();
      cacheBusyStatus(isBusy);
      setBusy(isBusy);
    } catch (error) {
      console.warn('[GitHub Extension]', error.message);
    }
  }

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
