import Handlebars from 'handlebars';
import { apiClient } from '../api';

import boardsTpl from '../templates/boards.hbs?raw';
import { navigateTo } from '../router';

const template = Handlebars.compile(boardsTpl);

interface User {
  id: number | string;
  username?: string;
  email?: string;
  avatar?: string;
}

interface RawBoard {
  id: string | number;
  board_name?: string;
  title?: string;
  description?: string;
  backlog?: number;
  hot?: number;
  members?: number;
  avatars?: string[];
  iconClass?: string;
  iconHtml?: string;
}

interface Board {
  id: string | number;
  board_name: string;
  description: string;
  backlog: number;
  hot: number;
  members?: number;
  hasMembers: boolean;
  avatars: string[] | null;
  iconClass: string;
  iconHtml: string;
}

interface ApiError {
  status?: number;
  message?: string;
}

let localBoards: Board[] = [];
let currentUser: User | null = null;
let eventController: AbortController | null = null;

/**
 * Отрисовывает главную страницу со списком досок проекта.
 * 
 * @param {HTMLElement} appDiv - DOM-контейнер, в который будет встроен HTML-код страницы.
 */
export const renderBoards = async (appDiv: HTMLElement): Promise<void> => {
  const success = await loadData();
  if (!success) return;

  /**
   * Обновляет UI интерфейс досок, перерисовывая шаблон и перенавешивая слушатели.
   */
  const updateUI = (): void => {
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

/**
 * Асинхронно загружает данные пользователя и список досок с сервера.
 * В случае ошибки 401 автоматически перенаправляет пользователя на страницу входа.
 * 
 * @returns {Promise<boolean>} Возвращает `true`, если данные успешно загружены, или `false`, если произошла критическая ошибка.
 */
async function loadData(): Promise<boolean> {
  try {
    const res = await apiClient.get('/home') as any;

    let rawBoards: RawBoard[] = [];
    if (res && res.data) {
      rawBoards = res.data;
    } else if (Array.isArray(res)) {
      rawBoards = res;
    }

    localBoards = rawBoards.map((board, i) => ({
      id: board.id,
      board_name: board.board_name || board.title || 'Без названия',
      description: board.description || 'Описание отсутствует',
      backlog: board.backlog !== undefined ? board.backlog : 0,
      hot: board.hot !== undefined ? board.hot : 0,
      members: board.members,
      hasMembers: board.members !== undefined && board.members !== null,
      avatars: board.avatars && Array.isArray(board.avatars) && board.avatars.length > 0 ? board.avatars : null,
      iconClass: board.iconClass || (i % 3 === 0 ? 'bg-purple' : i % 3 === 1 ? 'bg-blue' : 'bg-gradient'),
      iconHtml: board.iconHtml || '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14C20.67 22 22 20.67 22 15.07V8.93C22 3.33 20.67 2 15.07 2zm-1.24 13.56c-4.44 0-6.95-3.04-7.07-8.11h2.24c.08 3.73 1.63 5.3 2.87 5.63V7.45h2.15v3.2c1.22-.13 2.49-1.46 2.93-2.6h2.15c-.37 1.4-1.49 2.5-2.38 3.03.89.41 2.14 1.34 2.72 2.92h-2.31c-.48-1.07-1.48-1.93-3.07-2.06v2.02h-.23z"/></svg>'
    }));

    try {
      const profileRes = await apiClient.get('/profile') as any;
      currentUser = profileRes?.data || profileRes;
    } catch {
      currentUser = null;
    }

    return true;
  } catch (err) {
    const error = err as ApiError;
    if (error.status === 401) {
      localStorage.removeItem('isAuth');
      navigateTo('/login');
      return false;
    }
    return true;
  }
}

/**
 * Инициализирует и прикрепляет слушатели событий на странице со списком досок.
 * 
 * @param {HTMLElement} appDiv - DOM-контейнер страницы.
 * @param {Function} updateUI - Функция для обновления интерфейса при изменении данных.
 * @param {AbortSignal} abortSignal - Сигнал от AbortController для своевременной отписки от глобальных событий.
 */
function attachEventListeners(appDiv: HTMLElement, _: () => void, abortSignal: AbortSignal): void {
  const searchInput = appDiv.querySelector<HTMLInputElement>('.search-input');

  if (searchInput) {
    searchInput.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const query = target.value.toLowerCase();

      const cards = appDiv.querySelectorAll<HTMLElement>('.board-card');
      cards.forEach(card => {
        const title = card.querySelector('.board-name')?.textContent?.toLowerCase() || '';
        const desc = card.querySelector('.board-desc')?.textContent?.toLowerCase() || '';
        card.style.display = (title.includes(query) || desc.includes(query)) ? 'flex' : 'none';
      });
    });
  }

  const profileBtn = appDiv.querySelector<HTMLElement>('#profile-btn');
  const profilePopup = appDiv.querySelector<HTMLElement>('#profile-popup');

  if (profileBtn && profilePopup) {
    profileBtn.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      profilePopup.classList.toggle('hidden');
    });

    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as Node;
      if (!profilePopup.contains(target) && target !== profileBtn) {
        profilePopup.classList.add('hidden');
      }
    }, { signal: abortSignal });
  }

  const modalOverlay = appDiv.querySelector<HTMLElement>('#modal-overlay');
  const modalLogout = appDiv.querySelector<HTMLElement>('#modal-logout');

  /**
   * Скрывает все открытые модальные окна и оверлей на странице.
   */
  const closeModals = (): void => {
    [modalOverlay, modalLogout].forEach(m => m?.classList.add('hidden'));
  };

  appDiv.querySelector<HTMLButtonElement>('#btn-cancel-logout')?.addEventListener('click', closeModals);

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e: MouseEvent) => {
      if (e.target === modalOverlay) {
        closeModals();
      }
    });
  }

  const logoutBtn = appDiv.querySelector<HTMLElement>('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();

      if (profilePopup) {
        profilePopup.classList.add('hidden');
      }

      modalOverlay?.classList.remove('hidden');
      modalLogout?.classList.remove('hidden');
    });
  }

  const btnConfirmLogout = appDiv.querySelector<HTMLButtonElement>('#btn-confirm-logout');
  if (btnConfirmLogout) {
    btnConfirmLogout.addEventListener('click', async () => {
      btnConfirmLogout.disabled = true;
      try {
        await apiClient.post('/logout');
      } finally {
        localStorage.removeItem('isAuth');
        navigateTo('/login');
      }
    });
  }

  const boardCards = appDiv.querySelectorAll<HTMLElement>('.board-card');
  boardCards.forEach(card => {
    card.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.board-options-btn')) {
        // const id = card.querySelector('.board-options-btn')?.getAttribute('data-id') || card.getAttribute('data-id');
        // TODO: Реализовать переход в доску
      }
    });
  });
}
