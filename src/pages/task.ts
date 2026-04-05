import Handlebars from 'handlebars';
import taskTpl from '../templates/task.hbs?raw';
import { navigateTo } from '../router';

const template = Handlebars.compile(taskTpl);

export const renderTask = (appDiv: HTMLElement): void => {
  const urlParams = new URLSearchParams(window.location.search);
  const title = urlParams.get('title') || 'ДЗ3 Макет';
  const boardId = urlParams.get('boardId') || '';

  appDiv.innerHTML = template({
    board_name: 'NeXuS (Trello)',
    task: {
      title: title,
      due_date: '17 марта, 2026',
      time: 'До 23:59'
    }
  });

  document.getElementById('nav-boards')?.addEventListener('click', () => navigateTo('/boards'));
  document.getElementById('nav-profile')?.addEventListener('click', () => navigateTo('/profile'));
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('isAuth');
    navigateTo('/login');
  });

  document.getElementById('btn-back')?.addEventListener('click', () => {
    if (boardId) {
      navigateTo(`/board?id=${boardId}`);
    } else {
      navigateTo('/boards');
    }
  });
};
