import { request, showToast, copyToClipboard, escapeHtml } from './api.js';
import { setupAuthUI } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
  setupAuthUI();

  // Tab navigation
  const tabShortLink = document.getElementById('tab-short-link');
  const tabQrCode = document.getElementById('tab-qr-code');
  const panelShortLink = document.getElementById('panel-short-link');
  const panelQrCode = document.getElementById('panel-qr-code');

  if (tabShortLink && tabQrCode && panelShortLink && panelQrCode) {
    tabShortLink.addEventListener('click', () => {
      tabShortLink.classList.add('active');
      tabQrCode.classList.remove('active');
      panelShortLink.style.display = 'block';
      panelQrCode.style.display = 'none';
    });

    tabQrCode.addEventListener('click', () => {
      tabQrCode.classList.add('active');
      tabShortLink.classList.remove('active');
      panelQrCode.style.display = 'block';
      panelShortLink.style.display = 'none';
    });
  }

  // Shortener form elements
  const shortenForm = document.getElementById('landing-shorten-form');
  const urlInput = document.getElementById('landing-url-input');
  const pasteBtn = document.getElementById('paste-btn');
  const submitBtn = document.getElementById('landing-submit-btn');
  const resultCard = document.getElementById('landing-result-card');
  const resultShortUrl = document.getElementById('result-short-url');
  const resultOrigUrl = document.getElementById('result-orig-url');
  const resultCopyBtn = document.getElementById('result-copy-btn');
  const copyBtnText = document.getElementById('copy-btn-text');
  const resultQrBtn = document.getElementById('result-qr-btn');
  const historyContainer = document.getElementById('guest-history-container');
  const historyList = document.getElementById('guest-history-list');
  const clearHistoryBtn = document.getElementById('clear-history-btn');

  // Direct QR panel elements
  const directQrInput = document.getElementById('direct-qr-input');
  const directQrPaste = document.getElementById('direct-qr-paste');
  const directQrGenerateBtn = document.getElementById('direct-qr-generate-btn');
  const directQrResult = document.getElementById('direct-qr-result');
  const directQrImg = document.getElementById('direct-qr-img');
  const directQrDownload = document.getElementById('direct-qr-download');

  // QR Modal elements
  const qrModal = document.getElementById('qr-modal');
  const qrModalClose = document.getElementById('qr-modal-close');
  const qrModalImage = document.getElementById('qr-modal-image');
  const qrModalUrl = document.getElementById('qr-modal-url');
  const qrModalDownload = document.getElementById('qr-modal-download');
  const qrModalCopy = document.getElementById('qr-modal-copy');

  let currentQrData = null;

  // Guest history helpers
  function getGuestHistory() {
    try {
      return JSON.parse(localStorage.getItem('makemeshort_guest_history') || '[]');
    } catch {
      return [];
    }
  }

  function saveToGuestHistory(item) {
    const history = getGuestHistory();
    const filtered = history.filter(h => h.shortCode !== item.shortCode);
    filtered.unshift(item);
    localStorage.setItem('makemeshort_guest_history', JSON.stringify(filtered.slice(0, 8)));
    renderGuestHistory();
  }

  function renderGuestHistory() {
    const history = getGuestHistory();
    if (!historyList || !historyContainer) return;

    if (history.length === 0) {
      historyContainer.style.display = 'none';
      return;
    }

    historyContainer.style.display = 'block';
    historyList.innerHTML = history.map(item => `
      <div class="history-item">
        <div class="history-details">
          <a href="${escapeHtml(item.shortUrl)}" target="_blank" class="history-short">${escapeHtml(item.shortUrl)}</a>
          <span class="history-dest" title="${escapeHtml(item.originalUrl)}">${escapeHtml(item.originalUrl)}</span>
        </div>
        <div class="history-actions">
          <button class="btn btn-secondary btn-sm copy-history-btn" data-url="${escapeHtml(item.shortUrl)}">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            Copy
          </button>
          <button class="btn btn-ghost btn-sm qr-history-btn" data-url="${escapeHtml(item.shortUrl)}" data-qr="${escapeHtml(item.qrCode || '')}">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
            QR
          </button>
        </div>
      </div>
    `).join('');

    // Attach event listeners for history actions
    historyList.querySelectorAll('.copy-history-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await copyToClipboard(btn.dataset.url, 'Copied to clipboard!');
        const origText = btn.innerHTML;
        btn.innerHTML = '✓ Copied';
        setTimeout(() => { btn.innerHTML = origText; }, 1800);
      });
    });

    historyList.querySelectorAll('.qr-history-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const url = btn.dataset.url;
        let qr = btn.dataset.qr;
        if (!qr) {
          try {
            const res = await request(`/api/urls/qr?url=${encodeURIComponent(url)}`);
            qr = res.qrCode;
          } catch (e) {
            showToast('Failed to load QR code', 'error');
            return;
          }
        }
        openQrModal(url, qr);
      });
    });
  }

  // Paste button handler
  if (pasteBtn && urlInput) {
    pasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          urlInput.value = text.trim();
          urlInput.focus();
        }
      } catch (err) {
        urlInput.focus();
      }
    });
  }

  // Form submission handler
  if (shortenForm) {
    shortenForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rawUrl = urlInput.value.trim();

      if (!rawUrl) {
        showToast('Please enter a URL to shorten', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="4" stroke="currentColor" opacity="0.25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
        <span>Shortening...</span>
      `;

      try {
        const res = await request('/api/urls/shorten', {
          method: 'POST',
          body: JSON.stringify({ originalUrl: rawUrl })
        });

        // Show result box
        resultCard.style.display = 'flex';
        resultShortUrl.href = res.shortUrl;
        resultShortUrl.textContent = res.shortUrl;
        resultOrigUrl.textContent = res.originalUrl;
        resultOrigUrl.title = res.originalUrl;

        currentQrData = { url: res.shortUrl, qrCode: res.qrCode };

        // Save to guest history
        saveToGuestHistory(res);

        // Auto copy to clipboard for user convenience
        await copyToClipboard(res.shortUrl, 'Short link created & copied to clipboard!');
        if (copyBtnText) copyBtnText.textContent = 'Copied!';
        setTimeout(() => { if (copyBtnText) copyBtnText.textContent = 'Copy Link'; }, 2500);

        urlInput.value = '';
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <span>Get your link for free</span>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
          </svg>
        `;
      }
    });
  }

  // Result card actions
  if (resultCopyBtn) {
    resultCopyBtn.addEventListener('click', async () => {
      if (resultShortUrl.textContent) {
        await copyToClipboard(resultShortUrl.textContent, 'Copied short link to clipboard!');
        if (copyBtnText) copyBtnText.textContent = 'Copied!';
        setTimeout(() => { if (copyBtnText) copyBtnText.textContent = 'Copy Link'; }, 2000);
      }
    });
  }

  if (resultQrBtn) {
    resultQrBtn.addEventListener('click', () => {
      if (currentQrData) {
        openQrModal(currentQrData.url, currentQrData.qrCode);
      }
    });
  }

  // Direct QR Code panel logic
  if (directQrPaste && directQrInput) {
    directQrPaste.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          directQrInput.value = text.trim();
          directQrInput.focus();
        }
      } catch {
        directQrInput.focus();
      }
    });
  }

  if (directQrGenerateBtn && directQrInput) {
    directQrGenerateBtn.addEventListener('click', async () => {
      const val = directQrInput.value.trim();
      if (!val) {
        showToast('Please enter a link or text to generate a QR code', 'error');
        return;
      }

      directQrGenerateBtn.disabled = true;
      directQrGenerateBtn.innerHTML = 'Generating...';

      try {
        const res = await request(`/api/urls/qr?url=${encodeURIComponent(val)}`);
        if (res && res.qrCode) {
          directQrImg.src = res.qrCode;
          directQrDownload.href = res.qrCode;
          directQrDownload.download = `qrcode-${Date.now()}.png`;
          directQrResult.style.display = 'flex';
          showToast('QR code generated successfully!', 'success');
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        directQrGenerateBtn.disabled = false;
        directQrGenerateBtn.innerHTML = `
          <span>Generate QR Code</span>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
          </svg>
        `;
      }
    });
  }

  // QR Modal logic
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
    qrModalCopy.addEventListener('click', async () => {
      await copyToClipboard(qrModalUrl.textContent, 'Copied link to clipboard!');
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      localStorage.removeItem('makemeshort_guest_history');
      renderGuestHistory();
      showToast('Recent history cleared', 'info');
    });
  }

  // Initial render of history
  renderGuestHistory();
});
