(function () {
  'use strict';

  const NOTIFICATION_REASON = "You're receiving notifications because you authored the thread.";

  function normalizeText(value) {
    return String(value || '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  function hideAuthoredThreadReason(root = document) {
    const paragraphs = [];

    if (root instanceof Element && root.matches('p')) {
      paragraphs.push(root);
    }

    if (typeof root.querySelectorAll === 'function') {
      paragraphs.push(...root.querySelectorAll('p'));
    }

    for (const paragraph of paragraphs) {
      if (paragraph.hidden) continue;
      if (normalizeText(paragraph.textContent) !== NOTIFICATION_REASON) continue;
      paragraph.hidden = true;
    }
  }

  hideAuthoredThreadReason();

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) hideAuthoredThreadReason(node);
      }
    }
  });

  observer.observe(document.documentElement || document, {
    childList: true,
    subtree: true,
  });

  document.addEventListener('turbo:load', () => hideAuthoredThreadReason());
  document.addEventListener('pjax:end', () => hideAuthoredThreadReason());
})();
