'use strict';

(function () {
  const state = {
    mode: 'public',
    token: sessionStorage.getItem('dream_authorized_search_token') || ''
  };

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
      results: document.getElementById('dream-search-results'),
      lock: document.getElementById('dream-search-lock'),
      password: document.getElementById('dream-search-password')
    };
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

    el.innerHTML = results.map(item => \`
      <article class="dream-search-result\${item.private ? ' dream-search-private' : ''}">
        <h3>\${escapeHtml(item.title || 'Information')}</h3>
        <p>\${escapeHtml(item.excerpt || item.content || 'No excerpt available.')}</p>
        <div class="dream-search-source">\${escapeHtml(item.source || 'Dream source')}\${item.private ? ' · Authorized data' : ''}</div>
      </article>
    \`).join('');
  }

  async function search(query) {
    const { status } = elements();
    if (!query.trim()) return;

    status.textContent = 'Searching…';

    try {
      const headers = { 'Content-Type': 'application/json' };
      let url = '/api/dream-search/public';

      if (state.mode === 'authorized') {
        if (!state.token) {
          status.textContent = 'Authorized Search is locked.';
          elements().lock?.classList.add('visible');
          return;
        }
        url = '/api/dream-search/authorized';
        headers.Authorization = 'Bearer ' + state.token;
        const auth = JSON.parse(localStorage.getItem('dream_education_auth') || 'null');
        const ownerToken = auth?.session?.access_token || '';
        if (!ownerToken) {
          state.token = '';
          sessionStorage.removeItem('dream_authorized_search_token');
          status.textContent = 'Owner sign-in is required for Authorized Search.';
          elements().lock?.classList.add('visible');
          return;
        }
        headers['X-Dream-Owner-Token'] = ownerToken;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, limit: 10 })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        if (state.mode === 'authorized' && response.status === 401) {
          state.token = '';
          sessionStorage.removeItem('dream_authorized_search_token');
          elements().lock?.classList.add('visible');
        }
        throw new Error(data.error || 'Search failed.');
      }

      renderResults(data);
      status.textContent = state.mode === 'authorized'
        ? 'Authorized Search results.'
        : 'Public Search results.';
    } catch (error) {
      status.textContent = error.message || 'Search failed.';
    }
  }

  function setMode(mode) {
    state.mode = mode;
    const { lock, status } = elements();
    if (mode === 'authorized' && !state.token) {
      lock?.classList.add('visible');
      status.textContent = 'Enter the developer password to unlock Authorized Search.';
    } else {
      lock?.classList.remove('visible');
      status.textContent = mode === 'public'
        ? 'Public Search'
        : 'Authorized Search unlocked for this browser session.';
    }
  }

  async function unlock() {
    const { password, status, lock } = elements();
    const value = String(password?.value || '');
    if (!value) {
      status.textContent = 'Enter the Authorized Search password.';
      return;
    }

    status.textContent = 'Unlocking…';

    try {
      const auth = JSON.parse(localStorage.getItem('dream_education_auth') || 'null');
      const accessToken = auth?.session?.access_token || '';
      if (!accessToken) {
        status.textContent = 'Sign in with the owner account before unlocking Authorized Search.';
        return;
      }

      const response = await fetch('/api/dream-search/authorized/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken
        },
        body: JSON.stringify({ password: value })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Authorized Search could not be unlocked.');

      state.token = data.token;
      sessionStorage.setItem('dream_authorized_search_token', data.token);
      password.value = '';
      lock?.classList.remove('visible');
      status.textContent = 'Authorized Search unlocked for this browser session.';
    } catch (error) {
      status.textContent = error.message || 'Unlock failed.';
    }
  }

  document.addEventListener('click', event => {
    const modeButton = event.target.closest('[data-dream-search-mode]');
    if (modeButton) {
      setMode(modeButton.dataset.dreamSearchMode);
      return;
    }
    if (event.target.closest('#dream-search-unlock')) unlock();
  });

  document.addEventListener('submit', event => {
    if (!event.target.matches('#dream-search-form')) return;
    event.preventDefault();
    search(elements().input?.value || '');
  });
})();
