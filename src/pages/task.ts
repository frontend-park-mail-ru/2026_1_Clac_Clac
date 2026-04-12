import Handlebars from 'handlebars';
import { authApi, boardsApi, kanbanApi } from '../api';
import taskTpl from '../templates/task.hbs?raw';
import { navigateTo } from '../router';

const template = Handlebars.compile(taskTpl);

export const renderTask = async (appDiv: HTMLElement): Promise<void> => {
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get('taskId');
  const boardId = urlParams.get('boardId') || '';
  let title = urlParams.get('title') || 'Задача';
  let due_date = '17 марта, 2026';
  let time = 'До 23:59';
  let boardName = 'Без названия';
  let description = '';

  if (boardId) {
    try {
      const boardRes = await boardsApi.getBoard(boardId) as any;
      if (boardRes?.data?.name) boardName = boardRes.data.name;
    } catch (e) { }
  }

  if (taskId) {
    try {
      const taskRes = await kanbanApi.getTask(taskId) as any;
      if (taskRes) {
        title = taskRes.title || title;
        if (taskRes.data_dead_line) {
          const d = new Date(taskRes.data_dead_line);
          due_date = d.toLocaleDateString();
          time = d.toLocaleTimeString();
        }
        description = taskRes.description || '';
      }
    } catch {

    }
  }

  appDiv.innerHTML = template({
    board_name: boardName,
    task: {
      title: title,
      due_date: due_date,
      time: time,
      description: description
    }
  });

  document.getElementById('nav-boards')?.addEventListener('click', () => navigateTo('/boards'));
  document.getElementById('nav-profile')?.addEventListener('click', () => navigateTo('/profile'));
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    try { await authApi.logout(); } catch { }
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
