import Handlebars from 'handlebars';
import { apiClient } from '../api.js';
import { navigateTo } from '../main.js';

const response = await fetch('/src/templates/boards.hbs');
const boardsTpl = await response.text();
const template = Handlebars.compile(boardsTpl);

let localBoards = [];

export const renderBoards = async (appDiv) => {
  try {
    const res = await apiClient.get('/home');
    let fetchedBoards = Array.isArray(res) ? res : (res?.boards || []);

    localBoards = fetchedBoards.map((b, i) => ({
      id: b.id,
      board_name: b.board_name || `Доска ${i + 1}`,
      description: b.description || 'Описание отсутствует',
      backlog: b.backlog || 0,
      hot: b.hot || 0,
      members: b.members || 1,
      iconClass: b.iconClass || 'bg-purple',
      iconHtml: b.iconHtml || '<span style="font-size: 1.5rem;">✨</span>',
      avatars: b.avatars || ['https://i.pravatar.cc/100?img=1']
    }));
  } catch (err) {
    if (err.status === 401) {
      localStorage.removeItem('isAuth');
      navigateTo('login');
      return;
    }
  }

  const updateUI = () => {
    appDiv.innerHTML = template({ boards: localBoards });
    attachEventListeners();
  };

  const attachEventListeners = () => {
    const searchInput = document.querySelector('.search-input');
    const boardCards = document.querySelectorAll('.board-card');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        boardCards.forEach((card) => {
          const title = card.querySelector('.board-name')?.textContent?.toLowerCase() || '';
          const desc = card.querySelector('.board-desc')?.textContent?.toLowerCase() || '';
          card.style.display = (title.includes(query) || desc.includes(query)) ? 'flex' : 'none';
        });
      });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await apiClient.post('/logout');
        } catch (error) {
          console.error('Ошибка при выходе:', error);
        } finally {
          localStorage.removeItem('isAuth');
          navigateTo('login');
        }
      });
    }

    const modalOverlay = document.getElementById('modal-overlay');
    const modalCreate = document.getElementById('modal-create-board');
    const modalDelete = document.getElementById('modal-delete-board');

    const openModal = (modal) => {
      modalOverlay.classList.remove('hidden');
      modal.classList.remove('hidden');
    };

    const closeModals = () => {
      modalOverlay.classList.add('hidden');
      modalCreate.classList.add('hidden');
      modalDelete.classList.add('hidden');
    };

    modalOverlay.addEventListener('mousedown', (e) => {
      if (e.target === modalOverlay) closeModals();
    });

    const inputNewName = document.getElementById('new-board-name');
    const btnConfirmCreate = document.getElementById('btn-confirm-create');
    const btnCancelCreate = document.getElementById('btn-cancel-create');

    const handleCreateClick = () => {
      inputNewName.value = '';
      btnConfirmCreate.disabled = true;
      openModal(modalCreate);
      setTimeout(() => inputNewName.focus(), 100);
    };

    document.querySelector('.btn-create')?.addEventListener('click', handleCreateClick);
    document.querySelector('.board-card-empty')?.addEventListener('click', handleCreateClick);

    inputNewName.addEventListener('input', () => {
      btnConfirmCreate.disabled = !inputNewName.value.trim();
    });

    btnCancelCreate.addEventListener('click', closeModals);

    btnConfirmCreate.addEventListener('click', () => {
      const newName = inputNewName.value.trim();
      if (newName) {
        localBoards.unshift({
          id: Date.now().toString(),
          board_name: newName,
          description: 'Новое рабочее пространство',
          backlog: 0, hot: 0, members: 1,
          iconClass: 'bg-purple', iconHtml: '<span style="font-size: 1.5rem;">✨</span>',
          avatars: ['https://i.pravatar.cc/100?img=1']
        });
        closeModals();
        setTimeout(updateUI, 150);
      }
    });

    let boardIdToDelete = null;
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    const btnCancelDelete = document.getElementById('btn-cancel-delete');
    const spanDeleteName = document.getElementById('delete-board-name');

    document.querySelectorAll('.board-options-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        boardIdToDelete = btn.getAttribute('data-id');
        const boardName = btn.closest('.board-header').querySelector('.board-name').textContent;
        spanDeleteName.textContent = boardName;
        openModal(modalDelete);
      });
    });

    btnCancelDelete.addEventListener('click', closeModals);

    btnConfirmDelete.addEventListener('click', () => {
      if (boardIdToDelete) {
        localBoards = localBoards.filter(b => b.id !== boardIdToDelete);
        closeModals();
        setTimeout(updateUI, 150);
      }
    });
  };

  updateUI();
};
