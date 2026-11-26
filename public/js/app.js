import { apiFetch, esc, getToken, setToken, showToast } from './api.js';
import { renderHome } from './views/home.js';
import { renderDiscovery } from './views/discovery.js';
import { renderPortfolio } from './views/portfolio.js';
import { renderResume } from './views/resume.js';
import { renderVerify } from './views/verify.js';
import { renderDashboard } from './views/dashboard.js';

let currentUser = null;
let currentProfile = null;

const appEl = document.getElementById('app');
const authModal = document.getElementById('authModal');
const authControls = document.getElementById('authControls');
const navDashboard = document.getElementById('navDashboard');

function updateThemeUI() {
  const saved = localStorage.getItem('scholarfolio_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('themeToggle').textContent = saved === 'dark' ? '☀️' : '🌙';
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('scholarfolio_theme', next);
  updateThemeUI();
});

function openAuthModal(tab = 'login') {
  authModal.classList.remove('hidden');
  switchAuthTab(tab);
}

function closeAuthModal() {
  authModal.classList.add('hidden');
}

function switchAuthTab(tab) {
  document.querySelectorAll('#authTabs .tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.authTab === tab);
  });
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('authModalTitle').textContent =
    tab === 'login' ? 'Sign In to ScholarFolio' : 'Create Your Account';
}

function renderAuthControls() {
  if (currentUser) {
    navDashboard.classList.remove('hidden');
    authControls.innerHTML = `
      <div class="row" style="gap: 8px;">
        <span class="badge badge-primary">${esc(currentUser.full_name)}</span>
        <button type="button" id="logoutBtn" class="btn btn-outline btn-sm">Sign Out</button>
      </div>
    `;
    document.getElementById('logoutBtn').addEventListener('click', () => {
      setToken('');
      currentUser = null;
      currentProfile = null;
      renderAuthControls();
      showToast('Signed out.');
      window.location.hash = '#home';
      route();
    });
  } else {
    navDashboard.classList.add('hidden');
    authControls.innerHTML = `
      <button type="button" id="openLoginBtn" class="btn btn-primary btn-sm">Sign In / Join</button>
    `;
    document.getElementById('openLoginBtn').addEventListener('click', () => openAuthModal('login'));
  }
}

async function restoreSession() {
  if (!getToken()) return;
  try {
    const res = await apiFetch('/api/auth/me');
    currentUser = res.user;
    currentProfile = res.profile;
  } catch {
    setToken('');
    currentUser = null;
    currentProfile = null;
  }
}

async function route() {
  const hash = window.location.hash.replace(/^#/, '') || 'home';
  const [page, ...rest] = hash.split('/');
  const param = decodeURIComponent(rest.join('/'));

  document.querySelectorAll('#navLinks a').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === page);
  });

  if (page === 'discover') {
    await renderDiscovery(appEl);
  } else if (page === 'portfolio' && param) {
    await renderPortfolio(appEl, param, currentUser);
  } else if (page === 'resume' && param) {
    await renderResume(appEl, param);
  } else if (page === 'verify') {
    await renderVerify(appEl, param, currentUser);
  } else if (page === 'dashboard') {
    await renderDashboard(appEl, currentUser);
  } else {
    await renderHome(appEl);
  }
}

// Modal & Auth Event Listeners
document.getElementById('closeAuthModal').addEventListener('click', closeAuthModal);
document.getElementById('authBackdrop').addEventListener('click', closeAuthModal);
document.querySelectorAll('#authTabs .tab').forEach((btn) => {
  btn.addEventListener('click', () => switchAuthTab(btn.dataset.authTab));
});

document.getElementById('demoStudentBtn').addEventListener('click', () => {
  document.getElementById('loginEmail').value = 'aarav@university.edu';
  document.getElementById('loginPassword').value = 'Student@123';
});

document.getElementById('demoEvaluatorBtn').addEventListener('click', () => {
  document.getElementById('loginEmail').value = 'evaluator@university.edu';
  document.getElementById('loginPassword').value = 'Evaluator@123';
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
      })
    });
    setToken(res.token);
    currentUser = res.user;
    currentProfile = res.profile;
    closeAuthModal();
    renderAuthControls();
    showToast(`Welcome back, ${currentUser.full_name}!`, 'success');
    window.location.hash = currentUser.role === 'student' ? '#dashboard' : '#verify';
    route();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        full_name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        role: document.getElementById('regRole').value,
        graduation_year: document.getElementById('regGradYear').value,
        university: document.getElementById('regUniversity').value,
        department: document.getElementById('regDepartment').value
      })
    });
    setToken(res.token);
    currentUser = res.user;
    currentProfile = res.profile;
    closeAuthModal();
    renderAuthControls();
    showToast('Account created successfully!', 'success');
    window.location.hash = currentUser.role === 'student' ? '#dashboard' : '#verify';
    route();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

window.addEventListener('hashchange', route);

(async function init() {
  updateThemeUI();
  await restoreSession();
  renderAuthControls();
  await route();
})();
