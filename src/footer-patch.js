/* The upstream footer feed has occasionally contained tab indentation.
 * Normalise only the footer YAML response before js-yaml receives it. */
(function () {
  'use strict';
  const original = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const response = await original(input, init);
    const url = typeof input === 'string' ? input : input && input.url;
    if (!url || !/footer\.ya?ml(?:[?#]|$)/i.test(url) || !response.ok) return response;
    const content = (await response.text()).replace(/^\t+/gm, tabs => '  '.repeat(tabs.length));
    return new Response(content, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
  document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('mightora-header');
    if (!header) return;
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => document.documentElement.style.setProperty('--real-header-height', header.getBoundingClientRect().height + 'px')).observe(header);
    }
    const menu = header.querySelector('.mobile-menu-btn');
    const nav = header.querySelector('.header-nav');
    if (menu && nav) {
      menu.setAttribute('aria-expanded', String(nav.classList.contains('open')));
      menu.setAttribute('aria-controls', 'header-nav');
      menu.addEventListener('click', () => menu.setAttribute('aria-expanded', String(nav.classList.contains('open'))));
    }
  });
})();
