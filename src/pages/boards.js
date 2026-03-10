import Handlebars from 'handlebars';
import { apiClient } from '../api.js';
import { navigateTo } from '../main.js';

const response = await fetch('/src/templates/boards.hbs');
const boardsTpl = await response.text();
const template = Handlebars.compile(boardsTpl);

let localBoards = [];
let currentUser = null;
let eventController = null;

export const renderBoards = async (appDiv) => {
  const success = await loadData();
  if (!success) return;

  const updateUI = () => {
    if (eventController) {
      eventController.abort();
    }
    eventController = new AbortController();

    appDiv.innerHTML = template({
      boards: localBoards,
      user: currentUser
    });

    attachEventListeners(appDiv, updateUI, eventController.signal);
  };

  updateUI();
};

async function loadData() {
  try {
    const res = await apiClient.get('/home');

    let rawBoards = [];
    if (res && res.data) {
      rawBoards = res.data;
    } else if (Array.isArray(res)) {
      rawBoards = res;
    }

    localBoards = rawBoards.map((board, i) => ({
      id: board.id,
      board_name: board.board_name || 'Без названия',
      description: board.description || 'Описание отсутствует',
      backlog: board.backlog || 0,
      hot: board.hot || 0,
      iconClass: board.iconClass || (i % 3 === 0 ? 'bg-purple' : i % 3 === 1 ? 'bg-blue' : 'bg-gradient'),
      iconHtml: board.iconHtml || '<span style="font-size: 1.5rem;">✨</span>'
    }));

    try {
      const profileRes = await apiClient.get('/profile');
      currentUser = profileRes?.data || profileRes;
    } catch (e) {
      
    }

    return true;
  } catch (err) {
    if (err.status === 401) {
      localStorage.removeItem('isAuth');
      navigateTo('login');
      return false;
    }
    return true;
  }
}

function attachEventListeners(appDiv, updateUI, abortSignal) {
  const searchInput = appDiv.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      appDiv.querySelectorAll('.board-card').forEach(card => {
        const title = card.querySelector('.board-name')?.textContent.toLowerCase() || '';
        const desc = card.querySelector('.board-desc')?.textContent.toLowerCase() || '';
        card.style.display = (title.includes(query) || desc.includes(query)) ? 'flex' : 'none';
      });
    });
  }

  const profileBtn = appDiv.querySelector('#profile-btn');
  const profilePopup = appDiv.querySelector('#profile-popup');
  if (profileBtn && profilePopup) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profilePopup.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!profilePopup.contains(e.target) && e.target !== profileBtn) {
        profilePopup.classList.add('hidden');
      }
    }, { signal: abortSignal });
  }

  const modalOverlay = appDiv.querySelector('#modal-overlay');
  const modalLogout = appDiv.querySelector('#modal-logout');

  const closeModals = () => {
    [modalOverlay, modalLogout].forEach(m => m?.classList.add('hidden'));
  };

  appDiv.querySelector('#btn-cancel-logout')?.addEventListener('click', closeModals);

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModals();
      }
    });
  }

  const logoutBtn = appDiv.querySelector('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();

      if (profilePopup) {
        profilePopup.classList.add('hidden');
      }

      modalOverlay.classList.remove('hidden');
      modalLogout.classList.remove('hidden');
    });
  }

  const btnConfirmLogout = appDiv.querySelector('#btn-confirm-logout');
  if (btnConfirmLogout) {
    btnConfirmLogout.addEventListener('click', async () => {
      btnConfirmLogout.disabled = true;
      try {
        await apiClient.post('/logout');
      } finally {
        localStorage.removeItem('isAuth');
        navigateTo('login');
      }
    });
  }

  appDiv.querySelectorAll('.board-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.board-options-btn')) {
        const id = card.querySelector('.board-options-btn')?.getAttribute('data-id') || card.getAttribute('data-id');
        // TODO: Реализовать переход в доску
      }
    });
  });
}
