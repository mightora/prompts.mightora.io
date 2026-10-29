(function () {
  'use strict';
  const catalogue = globalThis.MIGHTORA_CATALOGUE;
  const engine = globalThis.MightoraPromptEngine;
  if (!catalogue || !engine) return;
  const el = (id) => document.getElementById(id);
  const fields = ['objective', 'context', 'audience', 'format', 'tone', 'constraints', 'material'];
  const toggles = ['clarify', 'sources', 'checklist'];
  const storeKey = 'mightora-prompts-custom-profiles-v1';
  let customProfiles = [];
  let category = 'All';
  const status = (message) => { if (el('action-status')) el('action-status').textContent = message; };

  try {
    const saved = JSON.parse(localStorage.getItem(storeKey) || '[]');
    if (Array.isArray(saved)) customProfiles = saved.filter(validProfile).slice(0, 30);
  } catch (_) { /* Storage can be disabled, including in private mode. */ }

  function validProfile(p) {
    return p && typeof p.id === 'string' && p.id.startsWith('custom-') &&
      typeof p.name === 'string' && typeof p.role === 'string' &&
      typeof p.expertise === 'string' && typeof p.approach === 'string';
  }
  function profiles() { return [...catalogue.profiles, ...customProfiles]; }
  function selectedProfile() { return profiles().find(p => p.id === el('profile-picker').value) || catalogue.profiles[0]; }
  function selectedTask() { return catalogue.tasks.find(t => t.id === el('task-picker').value) || catalogue.tasks[0]; }

  function fillSelect(select, items, selection) {
    select.replaceChildren();
    for (const item of items) {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name;
      select.append(option);
    }
    select.value = selection || items[0].id;
    if (!select.value) select.selectedIndex = 0;
  }
  function refreshProfilePicker(selected) { fillSelect(el('profile-picker'), profiles(), selected || 'general'); }
  function fillProfileEditor() {
    const p = selectedProfile();
    el('profile-name').value = p.name;
    el('profile-role').value = p.role;
    el('profile-expertise').value = p.expertise;
    el('profile-approach').value = p.approach;
    el('delete-profile').disabled = !p.id.startsWith('custom-');
  }
  function profileForPrompt() {
    // While the editor is open, the user can preview edits before saving.
    if (!el('profile-editor').open) return selectedProfile();
    return {
      role: el('profile-role').value,
      expertise: el('profile-expertise').value,
      approach: el('profile-approach').value
    };
  }
  function renderPrompt() {
    const values = Object.fromEntries(fields.map(id => [id, el(id).value]));
    for (const id of toggles) values[id] = el(id).checked;
    const output = engine.compose({ ...values, profile: profileForPrompt(), task: selectedTask() });
    el('prompt-output').value = output;
    el('prompt-size').textContent = `${output.length.toLocaleString('en-GB')} characters`;
    el('template-context').textContent = selectedTask().description;
    el('task-label').textContent = selectedTask().name;
  }
  function chooseTask(id) {
    if (!catalogue.tasks.some(t => t.id === id)) return;
    el('task-picker').value = id;
    renderPrompt();
    status(`Selected ${selectedTask().name}. Add your details to personalise it.`);
  }
  function renderTasks() {
    const query = el('template-search').value.trim().toLowerCase();
    const list = catalogue.tasks.filter(t => (category === 'All' || t.category === category) &&
      `${t.name} ${t.description} ${t.category}`.toLowerCase().includes(query));
    el('template-count').textContent = `${list.length} templates`;
    const grid = el('template-grid');
    grid.replaceChildren();
    for (const task of list) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'template-card';
      const type = document.createElement('span');
      type.className = 'eyebrow'; type.textContent = task.category;
      const heading = document.createElement('strong'); heading.textContent = task.name;
      const description = document.createElement('span'); description.textContent = task.description;
      const action = document.createElement('span'); action.className = 'template-action'; action.textContent = 'Use this template ↗';
      card.append(type, heading, description, action);
      card.addEventListener('click', () => {
        chooseTask(task.id);
        el('builder').scrollIntoView({ behavior: 'smooth', block: 'start' });
        el('objective').focus({ preventScroll: true });
      });
      grid.append(card);
    }
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'muted'; empty.textContent = 'No templates match. Try a different search.';
      grid.append(empty);
    }
  }
  function saveProfiles() {
    try { localStorage.setItem(storeKey, JSON.stringify(customProfiles)); return true; }
    catch (_) { status('Browser storage is unavailable. Your profile was not saved.'); return false; }
  }
  function saveProfile() {
    const name = engine.clean(el('profile-name').value, 80);
    const role = engine.clean(el('profile-role').value, 250);
    if (!name || !role) { status('Give your profile a name and a role before saving.'); return; }
    const p = { id: 'custom-' + Date.now().toString(36), name, role,
      expertise: engine.clean(el('profile-expertise').value, 600),
      approach: engine.clean(el('profile-approach').value, 1000) };
    if (customProfiles.length >= 30) { status('You can save up to 30 custom profiles.'); return; }
    const previous = customProfiles;
    customProfiles = [...customProfiles, p];
    if (!saveProfiles()) { customProfiles = previous; return; }
    refreshProfilePicker(p.id);
    fillProfileEditor();
    renderPrompt();
    status(`Saved “${name}” in this browser only.`);
  }
  function deleteProfile() {
    const p = selectedProfile();
    if (!p.id.startsWith('custom-')) return;
    const previous = customProfiles;
    customProfiles = customProfiles.filter(item => item.id !== p.id);
    if (!saveProfiles()) { customProfiles = previous; return; }
    refreshProfilePicker('general'); fillProfileEditor(); renderPrompt();
    status(`Removed “${p.name}” from this browser.`);
  }
  function download(name, value, mime) {
    const url = URL.createObjectURL(new Blob([value], { type: mime }));
    const link = document.createElement('a'); link.href = url; link.download = name;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copyPrompt() {
    const output = el('prompt-output');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(output.value);
      status('Prompt copied to your clipboard.');
    } catch (_) {
      output.focus(); output.select();
      const success = document.execCommand && document.execCommand('copy');
      status(success ? 'Prompt copied to your clipboard.' : 'Select and copy the prompt using your device’s copy command.');
    }
  }
  function showNetwork() {
    const target = el('network-summary');
    if (!target) return;
    const urls = performance.getEntriesByType ? performance.getEntriesByType('resource').map(r => r.name) : [];
    const domains = new Set();
    for (const url of urls) {
      try { const origin = new URL(url).origin; if (origin !== location.origin && origin !== 'null') domains.add(origin); }
      catch (_) { /* Ignore opaque entries. */ }
    }
    target.textContent = document.documentElement.dataset.offline === 'true'
      ? 'Offline edition: all styles, scripts and images are embedded. This page does not initiate network requests.'
      : `Browser-reported resource requests: ${urls.length}. External origins observed: ${domains.size ? Array.from(domains).sort().join(', ') : 'none observed'}. The online site loads Mightora shared UI assets; this summary is not a complete network audit.`;
  }

  fillSelect(el('task-picker'), catalogue.tasks, 'from-scratch');
  refreshProfilePicker('general'); fillProfileEditor();
  for (const id of [...fields, ...toggles, 'profile-role', 'profile-expertise', 'profile-approach']) {
    el(id).addEventListener('input', renderPrompt);
    el(id).addEventListener('change', renderPrompt);
  }
  el('task-picker').addEventListener('change', renderPrompt);
  el('profile-picker').addEventListener('change', () => { fillProfileEditor(); renderPrompt(); });
  el('profile-editor').addEventListener('toggle', renderPrompt);
  el('save-profile').addEventListener('click', saveProfile);
  el('delete-profile').addEventListener('click', deleteProfile);
  el('copy-prompt').addEventListener('click', copyPrompt);
  el('download-prompt').addEventListener('click', () => { download(engine.safeFilename(selectedTask().name), el('prompt-output').value, 'text/markdown;charset=utf-8'); status('Markdown prompt downloaded.'); });
  el('download-text').addEventListener('click', () => { download(engine.safeFilename(selectedTask().name).replace(/\.md$/, '.txt'), el('prompt-output').value, 'text/plain;charset=utf-8'); status('Text prompt downloaded.'); });
  el('reset-builder').addEventListener('click', () => {
    fields.forEach(id => { el(id).value = id === 'format' ? 'Clear sections with headings' : id === 'tone' ? 'Clear and professional' : ''; });
    el('clarify').checked = true; el('sources').checked = false; el('checklist').checked = true;
    chooseTask('from-scratch'); status('Builder reset. Saved custom profiles are unchanged.');
  });
  const categories = ['All', ...new Set(catalogue.tasks.map(t => t.category))];
  for (const name of categories) {
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'filter-chip';
    btn.textContent = name; btn.setAttribute('aria-pressed', String(name === category));
    btn.addEventListener('click', () => {
      category = name;
      el('category-filters').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      renderTasks();
    });
    el('category-filters').append(btn);
  }
  el('template-search').addEventListener('input', renderTasks);
  const urlTask = new URLSearchParams(location.search).get('task');
  if (urlTask) chooseTask(urlTask);
  renderTasks(); renderPrompt(); showNetwork();
  window.addEventListener('load', showNetwork, { once: true });
  if (typeof ResizeObserver !== 'undefined') {
    const header = document.querySelector('mightora-header');
    if (header) new ResizeObserver(() => document.documentElement.style.setProperty('--real-header-height', header.getBoundingClientRect().height + 'px')).observe(header);
  }
})();
