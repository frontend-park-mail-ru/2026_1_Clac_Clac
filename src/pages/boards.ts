import Handlebars from 'handlebars';
import { apiClient, boardsApi } from '../api';
import boardsTpl from '../templates/boards.hbs?raw';
import { navigateTo } from '../router';

const template = Handlebars.compile(boardsTpl);

interface User { id: string; username: string; email: string; avatar: string; }
interface RawBoard { id: string; board_name: string; title: string; description: string; backlog: number; hot: number; members: number; }
interface Board { id: string; board_name: string; description: string; backlog: number; hot: number; members: number; }

let localBoards: Board[] = [];
let currentUser: User | null = null;
let eventController: AbortController | null = null;

export const renderBoards = async (appDiv: HTMLElement): Promise<void> => {
  const success = await loadData();
  if (!success) return;

  const updateUI = (): void => {
    if (eventController) eventController.abort();
    eventController = new AbortController();

    appDiv.innerHTML = template({ boards: localBoards, user: currentUser });
    attachEventListeners(appDiv, updateUI, eventController.signal);
  };
  updateUI();
};

async function loadData(): Promise<boolean> {
  try {
    const res = await apiClient.get('/home') as any;
    let rawBoards: RawBoard[] = [];
    if (res && res.data) rawBoards = res.data;
    else if (Array.isArray(res)) rawBoards = res;

    localBoards = rawBoards.map(board => ({
      id: board.id,
      board_name: board.board_name || board.title || 'Без названия',
      description: board.description || 'Создаём аналог Trello',
      backlog: board.backlog || 0,
      hot: board.hot || 0,
      members: board.members || 0
    }));
    return true;
  } catch (err: any) {
    if (err.status === 401) {
      localStorage.removeItem('isAuth');
      navigateTo('/login');
      return false;
    }
    return true;
  }
}

function attachEventListeners(appDiv: HTMLElement, updateUI: () => void, abortSignal: AbortSignal): void {
  const modalOverlay = appDiv.querySelector<HTMLElement>('#modal-overlay');
  const modalCreate = appDiv.querySelector<HTMLElement>('#modal-create-board');
  const modalEdit = appDiv.querySelector<HTMLElement>('#modal-edit-board');
  const modalDelete = appDiv.querySelector<HTMLElement>('#modal-delete-board');

  let currentBoardId: string | null = null;

  document.getElementById('nav-profile')?.addEventListener('click', () => navigateTo('/profile'), { signal: abortSignal });
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('isAuth');
    navigateTo('/login');
  }, { signal: abortSignal });

  const closeModals = (): void => {
    [modalOverlay, modalCreate, modalEdit, modalDelete].forEach(m => m?.classList.add('hidden'));
  };

  appDiv.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', closeModals));
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e: MouseEvent) => {
      if (e.target === modalOverlay) closeModals();
    });
  }

  const openCreateModal = () => {
    modalOverlay?.classList.remove('hidden');
    modalCreate?.classList.remove('hidden');
    const inputNewBoard = appDiv.querySelector<HTMLInputElement>('#new-board-name');
    const errorNewBoard = appDiv.querySelector<HTMLElement>('#new-board-name-error');
    const btnConfirmCreate = appDiv.querySelector<HTMLButtonElement>('#btn-confirm-create');

    if (inputNewBoard) {
      inputNewBoard.value = '';
      inputNewBoard.style.borderColor = '#ff5c5c';
    }
    errorNewBoard?.classList.remove('hidden');
    if (btnConfirmCreate) btnConfirmCreate.disabled = true;
  };

  appDiv.querySelector('#btn-create-board')?.addEventListener('click', openCreateModal);
  appDiv.querySelector('#btn-create-board-empty')?.addEventListener('click', openCreateModal);

  const inputNewBoard = appDiv.querySelector<HTMLInputElement>('#new-board-name');
  const errorNewBoard = appDiv.querySelector<HTMLElement>('#new-board-name-error');
  const btnConfirmCreate = appDiv.querySelector<HTMLButtonElement>('#btn-confirm-create');

  inputNewBoard?.addEventListener('input', () => {
    const val = inputNewBoard.value.trim();
    if (val) {
      errorNewBoard?.classList.add('hidden');
      if (btnConfirmCreate) btnConfirmCreate.disabled = false;
      inputNewBoard.style.borderColor = '#333';
    } else {
      errorNewBoard?.classList.remove('hidden');
      if (btnConfirmCreate) btnConfirmCreate.disabled = true;
      inputNewBoard.style.borderColor = '#ff5c5c';
    }
  });

  btnConfirmCreate?.addEventListener('click', async () => {
    const boardName = inputNewBoard?.value.trim();
    if (!boardName) return;
    try {
      btnConfirmCreate.disabled = true;
      await boardsApi.createBoard({ board_name: boardName, description: 'Создаём аналог Trello' });
      closeModals();
      updateUI();
    } catch (err) {
      console.error('Create error', err);
    } finally {
      btnConfirmCreate.disabled = false;
    }
  });

  const editBoardNameInput = appDiv.querySelector<HTMLInputElement>('#edit-board-name');
  const btnConfirmEdit = appDiv.querySelector<HTMLButtonElement>('#btn-confirm-edit');
  const btnOpenDelete = appDiv.querySelector<HTMLButtonElement>('#btn-open-delete');
  const btnConfirmDelete = appDiv.querySelector<HTMLButtonElement>('#btn-confirm-delete');

  appDiv.querySelectorAll('.board-options-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
      const name = (e.currentTarget as HTMLElement).getAttribute('data-name')!;
      currentBoardId = id;

      if (editBoardNameInput) editBoardNameInput.value = name;
      modalOverlay?.classList.remove('hidden');
      modalEdit?.classList.remove('hidden');
    });
  });

  btnConfirmEdit?.addEventListener('click', async () => {
    const name = editBoardNameInput?.value.trim();
    if (!name || !currentBoardId) return;
    try {
      btnConfirmEdit.disabled = true;
      await boardsApi.updateBoard(currentBoardId, { board_name: name });
      closeModals();
      updateUI();
    } finally {
      btnConfirmEdit.disabled = false;
    }
  });

  btnOpenDelete?.addEventListener('click', () => {
    modalEdit?.classList.add('hidden');
    modalDelete?.classList.remove('hidden');
    const deleteBoardName = appDiv.querySelector('#delete-board-name');
    if (deleteBoardName) {
      deleteBoardName.textContent = editBoardNameInput?.value || '';
    }
  });

  btnConfirmDelete?.addEventListener('click', async () => {
    if (!currentBoardId) return;
    try {
      btnConfirmDelete.disabled = true;
      await boardsApi.deleteBoard(currentBoardId);
      closeModals();
      updateUI();
    } finally {
      btnConfirmDelete.disabled = false;
      currentBoardId = null;
    }
  });

  appDiv.querySelectorAll('.board-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.board-options-btn')) return;
      const id = card.getAttribute('data-id');
      navigateTo(`/board?id=${id}`);
    });
  });
}
