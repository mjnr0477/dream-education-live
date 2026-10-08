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
      results: document.getElementById('dream-search-results'),
      authorizedButton: null
    };
  }

  function ownerFlagIsTrue(value) {
    return value === true || String(value).toLowerCase() === 'true';
  }

  function isOwnerSignedIn() {
    try {
      const auth = JSON.parse(localStorage.getItem('dream_education_auth') || 'null');
      const account = auth?.account || {};
      const email = String(account.email || '').trim().toLowerCase();
      const ownerIdentity =
        ownerFlagIsTrue(account.owner_account) ||
        email === 'mathiassimiyu52@gmail.com';
      return ownerIdentity && Boolean(auth?.session?.access_token);
    } catch (_) {
      return false;
    }
  }

  function isOwnerIdentity() {
    try {
      const auth = JSON.parse(localStorage.getItem('dream_education_auth') || 'null');
      const account = auth?.account || {};
      const email = String(account.email || '').trim().toLowerCase();
      return ownerFlagIsTrue(account.owner_account) || email === 'mathiassimiyu52@gmail.com';
    } catch (_) {
      return false;
    }
  }

  function syncAuthorizedVisibility() {
    state.mode = 'public';
    const status = elements().status;
    if (status) status.textContent = 'Public Search';
  }

  function getOwnerToken() {
    try {
      const auth = JSON.parse(localStorage.getItem('dream_education_auth') || 'null');
      return auth?.session?.access_token || '';
    } catch (_) {
      return '';
    }
  }

  function renderReadMore(item, privateResult) {
    const raw = item?.content || item?.extract || item?.excerpt || '';
    const title = item?.title || 'More information';
    if (!raw || raw.length < 180) return '';
    return '<details class="dream-search-read-more"><summary>Read more</summary><div class="dream-search-full-evidence"><h4>' +
      escapeHtml(title) + '</h4><p>' + escapeHtml(raw) + '</p>' +
      (item?.source ? '<small>' + escapeHtml(item.source) + (privateResult ? ' · Authorized source' : '') + '</small>' : '') +
      '</div></details>';
  }

  function renderEvidence(item) {
    const evidence = Array.isArray(item?.evidence) ? item.evidence : [];
    const media = Array.isArray(item?.media) ? item.media : [];
    const assets = [...evidence.filter(x => x && x.type !== 'text'), ...media].filter(x => x && x.url).slice(0, 6);
    if (!assets.length) return '';
    return '<div class="dream-search-evidence">' + assets.map(asset => {
      const type = String(asset.type || '').toLowerCase();
      const url = String(asset.url || '').trim();
      const title = escapeHtml(asset.title || 'Evidence');
      if (type === 'video') return '<video controls preload="metadata" src="' + escapeHtml(url) + '" aria-label="' + title + '"></video>';
      if (type === 'audio') return '<audio controls preload="metadata" src="' + escapeHtml(url) + '" aria-label="' + title + '"></audio>';
      if (type === 'image' || type === 'photo') return '<img loading="lazy" src="' + escapeHtml(url) + '" alt="' + title + '">';
      return '<div class="dream-search-evidence-note">' + title + '</div>';
    }).join('') + '</div>';
  }

  function renderResults(data) {
    const el = elements().results;
    if (!el) return;
    const results = data.results || [];

    if (!results.length) {
      el.innerHTML = '<div class="dream-search-result"><p>No matching information was found in the connected sources.</p></div>';
      return;
    }

    el.innerHTML = results.map(item => `
      <article class="dream-search-result${item.private ? ' dream-search-private' : ''}">
        <h3>${escapeHtml(item.title || 'Information')}</h3>
        <p>${escapeHtml(item.excerpt || item.content || 'No excerpt available.')}</p>
        \${renderEvidence(item)}
        \${renderReadMore(item, false)}
        <div class="dream-search-source">${escapeHtml(item.source || 'Dream source')}${item.private ? ' · Authorized data' : ''}</div>
      </article>
    `).join('');
  }

  async function search(query, onSuccess, statusElement) {
    const status = statusElement || elements().status;
    if (!query.trim()) return;
    if (status) status.textContent = 'Searching…';

    try {
      const headers = { 'Content-Type': 'application/json' };
      let url = '/api/dream-search/public';

      if (state.mode === 'authorized') {
        const ownerToken = getOwnerToken();
        if (!ownerToken) {
          if (status) status.textContent = 'Sign in with the Dream Education owner account to use Authorized Search.';
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
      if (typeof onSuccess === 'function') onSuccess(data);
      if (status) {
        status.textContent = state.mode === 'authorized'
          ? 'Authorized Search — owner access'
          : 'Public Search';
      }
    } catch (error) {
      if (status) status.textContent = error.message || 'Search failed.';
    }
  }



  function openAuthorizedSearch() {
    if (!isOwnerIdentity()) {
      return;
    }

    const host = document.getElementById('panel-body');
    const title = document.getElementById('panel-title');
    const kicker = document.getElementById('panel-kicker');
    const description = document.getElementById('panel-description');
    if (!host || !title || !kicker || !description) return;

    state.mode = 'authorized';
    kicker.textContent = 'OWNER SEARCH';
    title.textContent = 'Authorized Search';
    description.textContent = 'Owner-only deep search. Connected public evidence and legitimately authorized sources are combined, ranked, deduplicated, and owner-authorized overrides take precedence.';

    host.innerHTML = `
      <form class="dream-search-box" id="dream-authorized-connect-form">
        <input id="dream-authorized-connect-input" type="search" placeholder="Search authorized and public information…" aria-label="Authorized Search">
        <button class="dream-search-button" type="submit">Search</button>
      </form>
      <div class="dream-search-status" id="dream-authorized-connect-status" aria-live="polite">Owner access confirmed</div>
      <div class="dream-search-results" id="dream-authorized-connect-results" aria-live="polite"></div>
      <div class="panel-actions">
        <button class="panel-action secondary" type="button" data-action="open" data-panel="connect">Back to Connect</button>
      </div>
    `;

    document.body.classList.remove('menu-open');
    document.body.classList.add('panel-open');
    const panel = document.getElementById('experience-panel');
    if (panel) panel.setAttribute('aria-hidden', 'false');

    const form = document.getElementById('dream-authorized-connect-form');
    form?.addEventListener('submit', function (event) {
      event.preventDefault();
      const input = document.getElementById('dream-authorized-connect-input');
      const query = input?.value || '';
      const statusHost = document.getElementById('dream-authorized-connect-status');
      search(query, function (data) {
        const resultsHost = document.getElementById('dream-authorized-connect-results');
        if (!resultsHost || !statusHost) return;
        const results = data.results || [];
        resultsHost.innerHTML = results.length ? results.map(item => `
          <article class="dream-search-result${item.private ? ' dream-search-private' : ''}">
            <h3>${escapeHtml(item.title || 'Information')}</h3>
            <p>${escapeHtml(item.excerpt || item.content || 'No excerpt available.')}</p>
          \${renderEvidence(item)}
          \${renderReadMore(item, Boolean(item.private))}
            <div class="dream-search-source">${escapeHtml(item.source || 'Dream source')}${item.authoritative ? ' · Owner authoritative' : item.private ? ' · Authorized data' : ' · Public evidence'}${item.provider ? ' · ' + escapeHtml(item.provider) : ''}</div>
          </article>
        `).join('') : '<div class="dream-search-result"><p>No matching information was found.</p></div>';
        statusHost.textContent = 'Authorized Search — owner access';
      }, statusHost);
    });
  }

  function setMode(mode) {
    state.mode = 'public';
    const { status } = elements();
    if (status) status.textContent = 'Public Search';
  }

  window.DreamEducationSearch = { openAuthorizedSearch };

  syncAuthorizedVisibility();
  window.addEventListener('dream-education-auth-changed', syncAuthorizedVisibility);
  window.addEventListener('storage', syncAuthorizedVisibility);

  document.addEventListener('click', event => {
    const authorizedButton = event.target.closest('[data-panel-action="authorized-search"]');
    if (authorizedButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openAuthorizedSearch();
      return;
    }

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
