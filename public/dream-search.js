'use strict';

(function () {
  const state = { mode: 'public' };

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function elements() {
    return {
      form: document.getElementById('dream-search-form'),
      input: document.getElementById('dream-search-input'),
      status: document.getElementById('dream-search-status'),
      results: document.getElementById('dream-search-results')
    };
  }

  function getOwnerToken() {
    try {
      const auth = JSON.parse(localStorage.getItem('dream_education_auth') || 'null');
      return auth?.session?.access_token || '';
    } catch (_) {
      return '';
    }
  }

  function renderResults(data) {
    const el = elements().results;
    if (!el) return;
    const results = state.mode === 'authorized'
      ? [...(data.private_results || []), ...(data.public_results || [])]
      : (data.results || []);

    if (!results.length) {
      el.innerHTML = '<div class="dream-search-result"><p>No matching information was found in the connected sources.</p></div>';
      return;
    }

    el.innerHTML = results.map(item => `
      <article class="dream-search-result${item.private ? ' dream-search-private' : ''}">
        <h3>${escapeHtml(item.title || 'Information')}</h3>
        <p>${escapeHtml(item.excerpt || item.content || 'No excerpt available.')}</p>
        <div class="dream-search-source">${escapeHtml(item.source || 'Dream source')}${item.private ? ' · Authorized data' : ''}</div>
      </article>
    `).join('');
  }

  async function search(query) {
    const { status } = elements();
    if (!query.trim()) return;
    status.textContent = 'Searching…';

    try {
      const headers = { 'Content-Type': 'application/json' };
      let url = '/api/dream-search/public';

      if (state.mode === 'authorized') {
        const ownerToken = getOwnerToken();
        if (!ownerToken) {
          status.textContent = 'Sign in with the Dream Education owner account to use Authorized Search.';
          return;
        }
        url = '/api/dream-search/authorized';
        headers.Authorization = 'Bearer ' + ownerToken;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, limit: 10 })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Search failed.');
      }

      renderResults(data);
      status.textContent = state.mode === 'authorized'
        ? 'Authorized Search — owner access'
        : 'Public Search';
    } catch (error) {
      status.textContent = error.message || 'Search failed.';
    }
  }

  function setMode(mode) {
    state.mode = mode;
    const { status } = elements();
    if (mode === 'authorized') {
      status.textContent = getOwnerToken()
        ? 'Authorized Search — owner access'
        : 'Sign in with the Dream Education owner account to use Authorized Search.';
    } else {
      status.textContent = 'Public Search';
    }
  }

  document.addEventListener('click', event => {
    const modeButton = event.target.closest('[data-dream-search-mode]');
    if (modeButton) {
      setMode(modeButton.dataset.dreamSearchMode);
    }
  });

  document.addEventListener('submit', event => {
    if (!event.target.matches('#dream-search-form')) return;
    event.preventDefault();
    search(elements().input?.value || '');
  });
})();
