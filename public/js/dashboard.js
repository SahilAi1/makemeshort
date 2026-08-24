import { state, isAuthenticated, clearAuthSession, request, showToast, copyToClipboard, escapeHtml } from './api.js';
import { setupAuthUI } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth
  if (!isAuthenticated()) {
    window.location.href = '/';
    return;
  }

  setupAuthUI();

  // Elements
  const welcomeName = document.getElementById('user-welcome-name');
  const statTotalLinks = document.getElementById('stat-total-links');
  const statTotalClicks = document.getElementById('stat-total-clicks');
  const statActiveLinks = document.getElementById('stat-active-links');
  const statAvgClicks = document.getElementById('stat-avg-clicks');

  const createForm = document.getElementById('dashboard-create-form');
  const inputUrl = document.getElementById('create-url-input');
  const inputSlug = document.getElementById('create-slug-input');
  const inputTitle = document.getElementById('create-title-input');
  const createSubmitBtn = document.getElementById('create-submit-btn');

  const searchInput = document.getElementById('search-links-input');
  const filterStatus = document.getElementById('filter-status-select');
  const linksList = document.getElementById('dashboard-links-list');
  const emptyState = document.getElementById('dashboard-empty-state');

  // Modals
  const qrModal = document.getElementById('qr-modal');
  const qrModalClose = document.getElementById('qr-modal-close');
  const qrModalImage = document.getElementById('qr-modal-image');
  const qrModalUrl = document.getElementById('qr-modal-url');
  const qrModalDownload = document.getElementById('qr-modal-download');
  const qrModalCopy = document.getElementById('qr-modal-copy');

  const analyticsModal = document.getElementById('analytics-modal');
  const analyticsModalClose = document.getElementById('analytics-modal-close');
  const analyticsTitle = document.getElementById('analytics-link-title');
  const analyticsShortUrl = document.getElementById('analytics-short-url');
  const analyticsTotalClicks = document.getElementById('analytics-total-clicks');
  const analyticsCreated = document.getElementById('analytics-created');
  const analyticsLogs = document.getElementById('analytics-logs-list');

  const editModal = document.getElementById('edit-modal');
  const editModalClose = document.getElementById('edit-modal-close');
  const editForm = document.getElementById('edit-form');
  const editIdInput = document.getElementById('edit-link-id');
  const editTitleInput = document.getElementById('edit-title-input');
  const editUrlInput = document.getElementById('edit-url-input');
  const editStatusInput = document.getElementById('edit-status-input');

  let allLinks = [];

  // Load user data & statistics
  async function loadDashboardData() {
    try {
      const meRes = await request('/api/auth/me');
      if (welcomeName) welcomeName.textContent = meRes.user.username;

      const urlsRes = await request('/api/urls');
      allLinks = urlsRes.urls || [];
      renderOverviewStats();
      renderFilteredLinks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function renderOverviewStats() {
    const total = allLinks.length;
    const clicks = allLinks.reduce((sum, l) => sum + (l.clicks || 0), 0);
    const active = allLinks.filter(l => l.isActive).length;
    const avg = total > 0 ? (clicks / total).toFixed(1) : '0';

    if (statTotalLinks) statTotalLinks.textContent = total;
    if (statTotalClicks) statTotalClicks.textContent = clicks;
    if (statActiveLinks) statActiveLinks.textContent = active;
    if (statAvgClicks) statAvgClicks.textContent = avg;
  }

  function renderFilteredLinks() {
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const status = filterStatus ? filterStatus.value : 'all';

    let filtered = allLinks;

    if (status === 'active') {
      filtered = filtered.filter(l => l.isActive);
    } else if (status === 'inactive') {
      filtered = filtered.filter(l => !l.isActive);
    }

    if (search) {
      filtered = filtered.filter(l => 
        (l.title && l.title.toLowerCase().includes(search)) ||
        l.shortCode.toLowerCase().includes(search) ||
        l.originalUrl.toLowerCase().includes(search)
      );
    }

    if (filtered.length === 0) {
      if (linksList) linksList.innerHTML = '';
      if (emptyState) {
        emptyState.style.display = 'block';
        const emptyTitle = emptyState.querySelector('.empty-state-title');
        if (emptyTitle) {
          emptyTitle.textContent = search || status !== 'all' ? 'No matching links found' : 'No links created yet';
        }
      }
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    if (linksList) {
      linksList.innerHTML = filtered.map(link => `
        <div class="link-card" id="link-card-${link.id}">
          <div class="link-main-info">
            <div class="link-header-line">
              <span class="link-title-text">${escapeHtml(link.title || link.shortCode)}</span>
              <span class="badge ${link.isActive ? 'badge-active' : 'badge-inactive'}">
                ${link.isActive ? '<span class="pulse-dot"></span> Active' : 'Disabled'}
              </span>
            </div>
            <a href="${escapeHtml(link.shortUrl)}" target="_blank" class="link-short-url">
              ${escapeHtml(link.shortUrl)}
            </a>
            <div class="link-destination" title="${escapeHtml(link.originalUrl)}">
              ↳ ${escapeHtml(link.originalUrl)}
            </div>
            <div class="link-meta-row">
              <span>Created ${new Date(link.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          <div class="link-stats-info">
            <div class="click-badge" title="Total visits">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              ${link.clicks} clicks
            </div>

            <div class="link-actions-group">
              <button class="action-btn-icon copy-link-btn" title="Copy Short Link" data-url="${escapeHtml(link.shortUrl)}">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              </button>
              <button class="action-btn-icon qr-link-btn" title="View QR Code" data-url="${escapeHtml(link.shortUrl)}">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
              </button>
              <button class="action-btn-icon stats-link-btn" title="View Analytics" data-id="${link.id}">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              </button>
              <button class="action-btn-icon edit-link-btn" title="Edit Link" data-id="${link.id}">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button class="action-btn-icon danger delete-link-btn" title="Delete Link" data-id="${link.id}">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        </div>
      `).join('');

      // Event listeners
      linksList.querySelectorAll('.copy-link-btn').forEach(btn => {
        btn.addEventListener('click', () => copyToClipboard(btn.dataset.url));
      });

      linksList.querySelectorAll('.qr-link-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const url = btn.dataset.url;
          try {
            const res = await request(`/api/urls/qr?url=${encodeURIComponent(url)}`);
            openQrModal(url, res.qrCode);
          } catch (e) {
            showToast('Failed to load QR code', 'error');
          }
        });
      });

      linksList.querySelectorAll('.stats-link-btn').forEach(btn => {
        btn.addEventListener('click', () => openAnalyticsModal(btn.dataset.id));
      });

      linksList.querySelectorAll('.edit-link-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
      });

      linksList.querySelectorAll('.delete-link-btn').forEach(btn => {
        btn.addEventListener('click', () => handleDeleteLink(btn.dataset.id));
      });
    }
  }

  // Create new link
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rawUrl = inputUrl.value.trim();
      const customSlug = inputSlug.value.trim();
      const title = inputTitle.value.trim();

      if (!rawUrl) {
        showToast('Destination URL is required', 'error');
        return;
      }

      createSubmitBtn.disabled = true;
      createSubmitBtn.textContent = 'Creating...';

      try {
        const payload = { originalUrl: rawUrl };
        if (customSlug) payload.customSlug = customSlug;
        if (title) payload.title = title;

        const res = await request('/api/urls/shorten', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        showToast('Link shortened successfully!', 'success');
        inputUrl.value = '';
        inputSlug.value = '';
        inputTitle.value = '';

        // Reload data
        await loadDashboardData();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        createSubmitBtn.disabled = false;
        createSubmitBtn.textContent = 'Create Short Link';
      }
    });
  }

  // Search & Filter listeners
  if (searchInput) searchInput.addEventListener('input', renderFilteredLinks);
  if (filterStatus) filterStatus.addEventListener('change', renderFilteredLinks);

  // Delete Link
  async function handleDeleteLink(id) {
    if (!confirm('Are you sure you want to delete this shortened link? Redirections will stop working immediately.')) {
      return;
    }

    try {
      await request(`/api/urls/${id}`, { method: 'DELETE' });
      showToast('Link deleted successfully', 'info');
      allLinks = allLinks.filter(l => l.id != id);
      renderOverviewStats();
      renderFilteredLinks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // Edit Link Modal
  function openEditModal(id) {
    const link = allLinks.find(l => l.id == id);
    if (!link || !editModal) return;

    editIdInput.value = link.id;
    editTitleInput.value = link.title || '';
    editUrlInput.value = link.originalUrl;
    editStatusInput.value = link.isActive ? '1' : '0';

    editModal.classList.add('active');
  }

  function closeEditModal() {
    if (editModal) editModal.classList.remove('active');
  }

  if (editModalClose) editModalClose.addEventListener('click', (e) => { e.preventDefault(); closeEditModal(); });
  if (editModal) {
    let editMouseDown = false;
    editModal.addEventListener('mousedown', (e) => {
      editMouseDown = (e.target === editModal);
    });
    editModal.addEventListener('mouseup', (e) => {
      if (editMouseDown && e.target === editModal) {
        closeEditModal();
      }
      editMouseDown = false;
    });
  }

  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = editIdInput.value;
      const title = editTitleInput.value.trim();
      const originalUrl = editUrlInput.value.trim();
      const isActive = editStatusInput.value === '1';

      try {
        const res = await request(`/api/urls/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ title, originalUrl, is_active: isActive })
        });

        showToast('Link updated successfully', 'success');
        closeEditModal();

        // Update in memory
        const idx = allLinks.findIndex(l => l.id == id);
        if (idx !== -1) {
          allLinks[idx] = { ...allLinks[idx], ...res.url };
        }
        renderOverviewStats();
        renderFilteredLinks();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  const analyticsTopDevice = document.getElementById('analytics-top-device');
  const analyticsBreakdowns = document.getElementById('analytics-breakdowns');

  // Analytics Modal
  async function openAnalyticsModal(id) {
    if (!analyticsModal) return;
    try {
      const data = await request(`/api/urls/${id}/stats`);
      analyticsTitle.textContent = data.url.title || data.url.shortCode;
      analyticsShortUrl.textContent = data.url.shortUrl;
      analyticsShortUrl.href = data.url.shortUrl;
      analyticsTotalClicks.textContent = data.url.clicks;
      analyticsCreated.textContent = new Date(data.url.createdAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
      });

      // Compute Top Device
      const devices = data.summary?.topDevices || {};
      const topDeviceName = Object.keys(devices).sort((a, b) => devices[b] - devices[a])[0] || 'Desktop';
      if (analyticsTopDevice) analyticsTopDevice.textContent = topDeviceName;

      // Render breakdown pills
      if (analyticsBreakdowns) {
        const pills = [];
        if (data.summary) {
          const browsers = data.summary.topBrowsers || {};
          Object.entries(browsers).slice(0, 3).forEach(([browser, count]) => {
            if (browser && browser !== 'Unknown') pills.push(`<span class="breakdown-pill">🌐 ${escapeHtml(browser)} (${count})</span>`);
          });

          const referrers = data.summary.topReferrers || {};
          Object.entries(referrers).slice(0, 3).forEach(([ref, count]) => {
            if (ref) pills.push(`<span class="breakdown-pill">🔗 ${escapeHtml(ref)} (${count})</span>`);
          });

          const oss = data.summary.topOS || {};
          Object.entries(oss).slice(0, 2).forEach(([os, count]) => {
            if (os && os !== 'Unknown') pills.push(`<span class="breakdown-pill">💻 ${escapeHtml(os)} (${count})</span>`);
          });
        }

        analyticsBreakdowns.innerHTML = pills.length > 0 ? pills.join('') : '<span style="font-size: 0.8rem; color: var(--text-subtle);">No visitor patterns recorded yet</span>';
      }

      // Render expandable click logs
      if (!data.clickHistory || data.clickHistory.length === 0) {
        analyticsLogs.innerHTML = `
          <div style="padding: 2rem 1rem; text-align: center; color: var(--text-subtle); font-size: 0.9rem; background: rgba(255,255,255,0.02); border-radius: var(--radius-md);">
            No click logs recorded yet. Visit the short link to test tracking!
          </div>
        `;
      } else {
        analyticsLogs.innerHTML = data.clickHistory.map((log, index) => `
          <div class="click-log-accordion" id="click-accordion-${index}">
            <div class="click-log-summary" data-index="${index}">
              <div class="click-log-main">
                <span class="click-log-icon">${log.icon || '💻'}</span>
                <span class="click-log-title">${escapeHtml(log.summary || 'Direct visit')}</span>
                <span class="click-log-ref-tag">${escapeHtml(log.referrer || 'Direct')}</span>
              </div>
              <div class="click-log-meta">
                <span class="click-log-time">${new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                <span class="click-log-chevron">▼</span>
              </div>
            </div>
            <div class="click-log-details">
              <div class="detail-row">
                <span class="detail-label">Platform:</span>
                <span class="detail-value">${escapeHtml(log.browser || 'Unknown')} on ${escapeHtml(log.os || 'Unknown')} (${escapeHtml(log.device || 'Desktop')})</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Referrer:</span>
                <span class="detail-value">${escapeHtml(log.referrer || 'Direct visit')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Timestamp:</span>
                <span class="detail-value">${new Date(log.createdAt).toLocaleString()}</span>
              </div>
              ${log.ipHash ? `
              <div class="detail-row">
                <span class="detail-label">IP Fingerprint:</span>
                <span class="detail-value" style="font-family: monospace; font-size: 0.75rem; color: #a5b4fc;">${escapeHtml(log.ipHash)}</span>
              </div>` : ''}
              <div style="margin-top: 0.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                  <span class="detail-label">Raw User-Agent:</span>
                  <button type="button" class="btn btn-ghost btn-sm copy-ua-btn" data-ua="${escapeHtml(log.userAgent || '')}" style="padding: 0.15rem 0.4rem; font-size: 0.7rem;">Copy UA</button>
                </div>
                <div class="ua-code-box">${escapeHtml(log.userAgent || 'No user agent captured')}</div>
              </div>
            </div>
          </div>
        `).join('');

        // Attach accordion click listeners
        analyticsLogs.querySelectorAll('.click-log-summary').forEach(header => {
          header.addEventListener('click', () => {
            const parent = header.closest('.click-log-accordion');
            if (parent) parent.classList.toggle('open');
          });
        });

        // Attach Copy UA listeners
        analyticsLogs.querySelectorAll('.copy-ua-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyToClipboard(btn.dataset.ua, 'Raw User-Agent copied!');
          });
        });
      }

      analyticsModal.classList.add('active');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function closeAnalyticsModal() {
    if (analyticsModal) analyticsModal.classList.remove('active');
  }

  if (analyticsModalClose) analyticsModalClose.addEventListener('click', (e) => { e.preventDefault(); closeAnalyticsModal(); });
  if (analyticsModal) {
    let analyticsMouseDown = false;
    analyticsModal.addEventListener('mousedown', (e) => {
      analyticsMouseDown = (e.target === analyticsModal);
    });
    analyticsModal.addEventListener('mouseup', (e) => {
      if (analyticsMouseDown && e.target === analyticsModal) {
        closeAnalyticsModal();
      }
      analyticsMouseDown = false;
    });
  }

  // QR Modal
  function openQrModal(url, qrDataUrl) {
    if (!qrModal) return;
    qrModalUrl.textContent = url;
    qrModalImage.src = qrDataUrl;
    qrModalDownload.href = qrDataUrl;
    qrModalDownload.download = `qrcode-${Date.now()}.png`;
    qrModal.classList.add('active');
  }

  function closeQrModal() {
    if (!qrModal) return;
    qrModal.classList.remove('active');
  }

  if (qrModalClose) qrModalClose.addEventListener('click', (e) => { e.preventDefault(); closeQrModal(); });
  if (qrModal) {
    let qrMouseDown = false;
    qrModal.addEventListener('mousedown', (e) => {
      qrMouseDown = (e.target === qrModal);
    });
    qrModal.addEventListener('mouseup', (e) => {
      if (qrMouseDown && e.target === qrModal) {
        closeQrModal();
      }
      qrMouseDown = false;
    });
  }
  if (qrModalCopy) {
    qrModalCopy.addEventListener('click', () => copyToClipboard(qrModalUrl.textContent));
  }

  // Initial load
  loadDashboardData();
});
