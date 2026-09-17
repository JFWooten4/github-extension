const STYLE_ID = 'github-tweaks-block-tooltips-style';
const BLOCKED_TITLE_ATTRIBUTE = 'data-github-tweaks-blocked-title';
const ADDED_ARIA_ATTRIBUTE = 'data-github-tweaks-added-aria-label';

let titleObserver = null;
let enabled = false;

function tooltipStyle() {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    tool-tip,
    [role="tooltip"],
    [data-component="Tooltip"] {
      display: none !important;
    }

    .tooltipped::before,
    .tooltipped::after {
      display: none !important;
    }
  `;
  return style;
}

function blockTitle(element) {
  if (!(element instanceof Element) || !element.hasAttribute('title')) return;

  const title = element.getAttribute('title') || '';
  element.setAttribute(BLOCKED_TITLE_ATTRIBUTE, title);

  if (title && !element.hasAttribute('aria-label')) {
    element.setAttribute('aria-label', title);
    element.setAttribute(ADDED_ARIA_ATTRIBUTE, 'true');
  }

  element.removeAttribute('title');
}

function blockTitlesWithin(root) {
  if (!(root instanceof Element)) return;
  blockTitle(root);
  for (const element of root.querySelectorAll('[title]')) blockTitle(element);
}

function restoreTitles() {
  for (const element of document.querySelectorAll(`[${BLOCKED_TITLE_ATTRIBUTE}]`)) {
    element.setAttribute('title', element.getAttribute(BLOCKED_TITLE_ATTRIBUTE) || '');
    element.removeAttribute(BLOCKED_TITLE_ATTRIBUTE);

    if (element.hasAttribute(ADDED_ARIA_ATTRIBUTE)) {
      element.removeAttribute('aria-label');
      element.removeAttribute(ADDED_ARIA_ATTRIBUTE);
    }
  }
}

function enableBlocking() {
  if (enabled) return;
  enabled = true;

  if (!document.getElementById(STYLE_ID)) {
    (document.head || document.documentElement).append(tooltipStyle());
  }

  if (document.documentElement) blockTitlesWithin(document.documentElement);

  titleObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        blockTitle(mutation.target);
        continue;
      }

      for (const node of mutation.addedNodes) {
        if (node instanceof Element) blockTitlesWithin(node);
      }
    }
  });

  titleObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['title'],
  });
}

function disableBlocking() {
  if (!enabled) return;
  enabled = false;
  titleObserver?.disconnect();
  titleObserver = null;
  document.getElementById(STYLE_ID)?.remove();
  restoreTitles();
}

async function loadSetting() {
  const { blockTooltips } = await chrome.storage.local.get({ blockTooltips: false });
  if (blockTooltips) enableBlocking();
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.blockTooltips) return;
  if (changes.blockTooltips.newValue) enableBlocking();
  else disableBlocking();
});

void loadSetting();
