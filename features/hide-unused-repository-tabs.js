(() => {
  const HIDDEN_REPOSITORY_TABS = [
    { label: 'agents', route: 'agents' },
    { label: 'security and quality', route: 'security' },
    { label: 'wiki', route: 'wiki' },
  ];

  function repositoryPrefix() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return `/${parts[0]}/${parts[1]}`;
  }

  function normalizedLabel(link) {
    return (link.getAttribute('aria-label') || link.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function isHiddenRepositoryTab(link, prefix) {
    let url;
    try {
      url = new URL(link.href, window.location.origin);
    } catch {
      return false;
    }

    if (url.origin !== window.location.origin) return false;

    const label = normalizedLabel(link);
    return HIDDEN_REPOSITORY_TABS.some(({ label: expectedLabel, route }) => {
      if (label !== expectedLabel) return false;
      const tabPath = `${prefix}/${route}`;
      return url.pathname === tabPath || url.pathname.startsWith(`${tabPath}/`);
    });
  }

  function restorePreviouslyHiddenTabs(navigation) {
    for (const item of navigation.querySelectorAll('[data-fractured-hidden-repository-tab]')) {
      item.hidden = false;
      delete item.dataset.fracturedHiddenRepositoryTab;
    }
  }

  function hideUnusedRepositoryTabs() {
    const prefix = repositoryPrefix();
    if (!prefix) return;

    const navigations = document.querySelectorAll(
      '#repository-container-header nav, nav[aria-label="Repository"]',
    );

    for (const navigation of navigations) {
      restorePreviouslyHiddenTabs(navigation);

      for (const link of navigation.querySelectorAll('a[href]')) {
        if (!isHiddenRepositoryTab(link, prefix)) continue;

        const item = link.closest('li') || link.closest('[role="tab"]') || link;
        item.hidden = true;
        item.dataset.fracturedHiddenRepositoryTab = 'true';
      }
    }
  }

  let scheduled = false;
  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      hideUnusedRepositoryTabs();
    });
  }

  const observer = new MutationObserver(scheduleUpdate);

  function start() {
    scheduleUpdate();
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  if (document.documentElement) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });

  document.addEventListener('turbo:load', scheduleUpdate);
  document.addEventListener('pjax:end', scheduleUpdate);
  window.addEventListener('popstate', scheduleUpdate);
})();
