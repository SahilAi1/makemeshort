import { state, setAuthSession, clearAuthSession, isAuthenticated, request, showToast } from './api.js';

export function setupAuthUI() {
  const navContainer = document.getElementById('nav-user-area');
  const authModal = document.getElementById('auth-modal');
  const authForm = document.getElementById('auth-form');
  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  const registerFields = document.querySelectorAll('.register-only');
  const submitBtn = document.getElementById('auth-submit-btn');
  const modalTitle = document.getElementById('auth-modal-title');
  const closeModalBtn = document.getElementById('auth-modal-close');
  const loginLabel = document.getElementById('auth-login-label');
  const loginInput = document.getElementById('auth-login-input');
  const emailInput = document.getElementById('auth-email-input');
  const passwordInput = document.getElementById('auth-password-input');

  let currentMode = 'login'; // 'login' or 'register'

  function updateNav() {
    if (!navContainer) return;
    if (isAuthenticated() && state.user) {
      navContainer.innerHTML = `
        <a href="/dashboard.html" class="btn btn-secondary btn-sm">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          Dashboard
        </a>
        <button id="nav-logout-btn" class="btn btn-ghost btn-sm">Logout</button>
      `;
      const logoutBtn = document.getElementById('nav-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          clearAuthSession();
          showToast('Logged out successfully', 'info');
          if (window.location.pathname.includes('dashboard')) {
            window.location.href = '/';
          } else {
            updateNav();
          }
        });
      }
    } else {
      navContainer.innerHTML = `
        <button id="open-login-btn" class="btn btn-ghost btn-sm">Sign In</button>
        <button id="open-register-btn" class="btn btn-primary btn-sm">Get Started</button>
      `;
      const openLogin = document.getElementById('open-login-btn');
      const openRegister = document.getElementById('open-register-btn');
      if (openLogin) openLogin.addEventListener('click', (e) => { e.preventDefault(); openModal('login'); });
      if (openRegister) openRegister.addEventListener('click', (e) => { e.preventDefault(); openModal('register'); });
    }
  }

  function setMode(mode) {
    currentMode = mode;
    if (mode === 'login') {
      if (loginTab) { loginTab.classList.add('btn-primary'); loginTab.classList.remove('btn-ghost'); }
      if (registerTab) { registerTab.classList.add('btn-ghost'); registerTab.classList.remove('btn-primary'); }
      if (modalTitle) modalTitle.textContent = 'Welcome Back';
      if (submitBtn) submitBtn.textContent = 'Sign In';
      if (loginLabel) loginLabel.textContent = 'Username or Email';
      if (loginInput) loginInput.placeholder = 'e.g. sahil or sahil@example.com';
      registerFields.forEach(el => { el.style.display = 'none'; });
      if (emailInput) emailInput.removeAttribute('required');
    } else {
      if (registerTab) { registerTab.classList.add('btn-primary'); registerTab.classList.remove('btn-ghost'); }
      if (loginTab) { loginTab.classList.add('btn-ghost'); loginTab.classList.remove('btn-primary'); }
      if (modalTitle) modalTitle.textContent = 'Create Free Account';
      if (submitBtn) submitBtn.textContent = 'Sign Up';
      if (loginLabel) loginLabel.textContent = 'Choose Username';
      if (loginInput) loginInput.placeholder = 'e.g. sahil';
      registerFields.forEach(el => { el.style.display = 'flex'; });
      if (emailInput) emailInput.setAttribute('required', 'true');
    }
  }

  function openModal(mode = 'login') {
    if (!authModal) return;
    setMode(mode);
    authModal.classList.add('active');
    setTimeout(() => {
      if (loginInput) loginInput.focus();
    }, 100);
  }

  function closeModal() {
    if (!authModal) return;
    authModal.classList.remove('active');
  }

  if (loginTab) loginTab.addEventListener('click', (e) => { e.preventDefault(); setMode('login'); });
  if (registerTab) registerTab.addEventListener('click', (e) => { e.preventDefault(); setMode('register'); });
  if (closeModalBtn) closeModalBtn.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });

  // Safe backdrop click handler: only close if mousedown and mouseup are directly on the overlay background
  if (authModal) {
    let backdropMouseDown = false;
    authModal.addEventListener('mousedown', (e) => {
      backdropMouseDown = (e.target === authModal);
    });
    authModal.addEventListener('mouseup', (e) => {
      if (backdropMouseDown && e.target === authModal) {
        closeModal();
      }
      backdropMouseDown = false;
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const loginVal = loginInput?.value.trim();
      const passwordVal = passwordInput?.value;
      const emailVal = emailInput?.value.trim();

      if (!loginVal || !passwordVal) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = currentMode === 'login' ? 'Signing in...' : 'Creating account...';

      try {
        if (currentMode === 'login') {
          const res = await request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ login: loginVal, password: passwordVal })
          });
          setAuthSession(res.token, res.user);
          showToast(`Welcome back, ${res.user.username}!`, 'success');
          closeModal();
          updateNav();
          if (window.location.pathname.includes('dashboard')) {
            window.location.reload();
          } else {
            window.location.href = '/dashboard.html';
          }
        } else {
          if (!emailVal) {
            showToast('Email address is required for registration', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
            return;
          }
          const res = await request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username: loginVal, email: emailVal, password: passwordVal })
          });
          setAuthSession(res.token, res.user);
          showToast('Account created successfully!', 'success');
          closeModal();
          updateNav();
          window.location.href = '/dashboard.html';
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = currentMode === 'login' ? 'Sign In' : 'Sign Up';
      }
    });
  }

  // Check current session validity
  if (isAuthenticated()) {
    request('/api/auth/me')
      .then(res => {
        setAuthSession(state.token, res.user);
        updateNav();
      })
      .catch(() => {
        clearAuthSession();
        updateNav();
      });
  } else {
    updateNav();
  }

  return { openModal, closeModal, updateNav };
}
