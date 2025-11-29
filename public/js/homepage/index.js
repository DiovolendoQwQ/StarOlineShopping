import './notification.js';
import './cart.js';
import './nav.js';
import { initLogout } from './logout.js';
import { renderNav, renderFeatured, renderAccessories } from './render.js';

async function loadPartial(selector, url) {
  const container = document.querySelector(selector);
  if (!container) return;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return;
    const html = await resp.text();
    container.innerHTML = html;
  } catch (e) {
    console.error(`Failed to load partial ${url}`, e);
  }
}

async function init() {
  // Load static partials
  await Promise.all([
    loadPartial('#header-container', '/partials/header.html'),
    loadPartial('#footer-container', '/partials/footer.html'),
    loadPartial('#modals-container', '/partials/modals.html')
  ]);

  // Render data-driven sections
  renderNav();
  renderFeatured();
  renderAccessories();

  // Initialize logic that depends on loaded DOM
  initLogout();

  // Dispatch an event saying components are loaded
  document.dispatchEvent(new CustomEvent('components:loaded'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
