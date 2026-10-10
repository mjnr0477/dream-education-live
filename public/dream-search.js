'use strict';

(function () {
  const state = { mode: 'public', resultsHost: null, resultsStatus: null, resultsPage: null };

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
    if (!raw) return '';
    return '<details class="dream-search-read-more"><summary>Read more</summary><div class="dream-search-full-evidence"><h4>' +
      escapeHtml(title) + '</h4><p>' + escapeHtml(raw) + '</p>' +
      (item?.source ? '<small>' + escapeHtml(item.source) + (privateResult ? ' · Authorized source' : '') + '</small>' : '') +
      '</div></details>';
  }

  function renderEvidence(item) {
    const evidence = Array.isArray(item?.evidence) ? item.evidence : [];
    const media = Array.isArray(item?.media) ? item.media : [];
    const assets = [...media, ...evidence.filter(x => x && x.url)]
      .filter(x => x && x.url)
      .filter((asset, index, all) => {
        const url = String(asset.url || '');
        return all.findIndex(candidate => String(candidate?.url || '') === url) === index;
      })
      .slice(0, 4);

    if (!assets.length) {
      return '<div class="dream-search-evidence dream-search-evidence-empty"><div class="dream-search-evidence-placeholder">Text evidence from the connected source</div></div>';
    }

    return '<div class="dream-search-evidence">' + assets.map(asset => {
      const type = String(asset.type || '').toLowerCase();
      const url = String(asset.url || '').trim();
      const title = escapeHtml(asset.title || 'Evidence');
      if (type === 'video') {
        return '<div class="dream-search-media"><video controls preload="metadata" src="' + escapeHtml(url) + '" aria-label="' + title + '"></video></div>';
      }
      if (type === 'audio') {
        return '<div class="dream-search-media"><audio controls preload="metadata" src="' + escapeHtml(url) + '" aria-label="' + title + '"></audio></div>';
      }
      if (type === 'image' || type === 'photo') {
        return '<div class="dream-search-media"><img loading="lazy" src="' + escapeHtml(url) + '" alt="' + title + '"></div>';
      }
      return '<div class="dream-search-media dream-search-evidence-note">' + title + '</div>';
    }).join('') + '</div>';
  }

  function renderEvidenceText(item) {
    const text = String(item?.excerpt || item?.content || '').trim();
    if (!text) return '';
    return '<div class="dream-search-evidence-text">' + escapeHtml(text.slice(0, 500)) + '</div>';
  }

  function renderResults(data, targetElement) {
    const el = targetElement || state.resultsHost || elements().results;
    if (!el) return;
    const results = data.results || [];

    if (!results.length) {
      el.innerHTML = '<div class="dream-search-result"><p>No matching information was found in the connected sources.</p></div>';
      return;
    }

    el.innerHTML = results.map(item => `
      <article class="dream-search-result${item.private ? ' dream-search-private' : ''}">
        <h3>${escapeHtml(item.title || 'Information')}</h3>
        ${renderEvidence(item)}
        ${renderEvidenceText(item)}
        ${renderReadMore(item, Boolean(item.private))}
        <div class="dream-search-source">${escapeHtml(item.source || 'Dream source')}${item.private ? ' · Authorized data' : ''}</div>
      </article>
    `).join('');
  }

  async function search(query, onSuccess, statusElement, resultsElement) {
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

      renderResults(data, resultsElement);
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


  function closeResultsPage() {
    const page = state.resultsPage || document.getElementById('dream-search-results-page');
    if (page) page.hidden = true;
    state.resultsHost = null;
    state.resultsStatus = null;
    document.body.classList.remove('dream-search-page-open');
    const shell = document.querySelector('.app-shell');
    if (shell) shell.hidden = false;
    const input = elements().input;
    if (input) input.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openResultsPage(query) {
    const shell = document.querySelector('.app-shell');
    if (!shell) return null;

    let page = state.resultsPage || document.getElementById('dream-search-results-page');
    if (!page) {
      page = document.createElement('section');
      page.id = 'dream-search-results-page';
      page.className = 'dream-search-results-page';
      page.hidden = true;
      page.setAttribute('aria-label', 'Dream Search results');
      page.innerHTML = `
        <div class="dream-search-page-shell">
          <div class="dream-search-page-top">
            <button class="dream-search-back" type="button" data-dream-search-back>← Back to Home</button>
            <span class="dream-search-kicker">DREAM SEARCH</span>
          </div>
          <h1 class="dream-search-page-title">Search results</h1>
          <p class="dream-search-page-copy">Explore evidence and information from Dream Education's connected public sources.</p>
          <form class="dream-search-box dream-search-page-form" id="dream-search-page-form">
            <input id="dream-search-page-input" type="search" name="query" autocomplete="off" aria-label="Search Dream Education again" placeholder="Search another topic…">
            <button class="dream-search-button" type="submit">Search</button>
          </form>
          <div class="dream-search-status" id="dream-search-page-status" aria-live="polite">Preparing your search…</div>
          <div class="dream-search-results dream-search-page-results" id="dream-search-page-results" aria-live="polite"></div>
          <div class="dream-search-page-bottom">
            <button class="dream-search-back" type="button" data-dream-search-back>← Back to Home</button>
          </div>
        </div>`;
      document.body.appendChild(page);
      state.resultsPage = page;
    }

    const pageInput = document.getElementById('dream-search-page-input');
    if (pageInput) pageInput.value = query;
    state.resultsHost = document.getElementById('dream-search-page-results');
    state.resultsStatus = document.getElementById('dream-search-page-status');
    state.mode = 'public';
    page.hidden = false;
    shell.hidden = true;
    document.body.classList.add('dream-search-page-open');
    const status = state.resultsStatus;
    if (status) status.textContent = 'Searching public sources…';
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (pageInput) pageInput.focus({ preventScroll: true });
    return page;
  }

  function submitPublicSearch(query) {
    const cleanQuery = String(query || '').trim();
    if (!cleanQuery) {
      elements().input?.focus();
      return;
    }
    const page = openResultsPage(cleanQuery);
    if (!page) {
      search(cleanQuery);
      return;
    }
    search(cleanQuery, null, state.resultsStatus, state.resultsHost);
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
            ${renderEvidence(item)}
            ${renderEvidenceText(item)}
            ${renderReadMore(item, Boolean(item.private))}
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

  document.addEventListener('click', event => {
    if (event.target.closest('[data-dream-search-back]')) {
      event.preventDefault();
      closeResultsPage();
    }
  });

  document.addEventListener('submit', event => {
    if (event.target.matches('#dream-search-form')) {
      event.preventDefault();
      submitPublicSearch(elements().input?.value || '');
      return;
    }
    if (event.target.matches('#dream-search-page-form')) {
      event.preventDefault();
      const input = document.getElementById('dream-search-page-input');
      const query = String(input?.value || '').trim();
      if (!query) {
        input?.focus();
        return;
      }
      const host = document.getElementById('dream-search-page-results');
      const status = document.getElementById('dream-search-page-status');
      state.resultsHost = host;
      state.resultsStatus = status;
      if (host) host.innerHTML = '';
      search(query, null, status, host);
    }
  });
})();
