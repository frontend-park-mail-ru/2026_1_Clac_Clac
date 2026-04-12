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
  let dueDate = '';
  let timeStr = '';
  let boardName = 'Без названия';
  let descriptionText = '';
  let executorName = 'Не назначен';

  let usersList = new Array();

  if (boardId) {
    try {
      const boardRes = await boardsApi.getBoard(boardId) as any;
      if (boardRes && boardRes.data && boardRes.data.name) {
        boardName = boardRes.data.name;
      }

      const usersRes = await boardsApi.getBoardUsers(boardId) as any;
      if (usersRes && usersRes.data && Array.isArray(usersRes.data)) {
        usersList = usersRes.data;
      } else if (Array.isArray(usersRes)) {
        usersList = usersRes;
      }
    } catch (e) {
      console.error('Board fetch error', e);
    }
  }

  if (taskId) {
    try {
      const taskRes = await kanbanApi.getTask(taskId) as any;
      let taskData = taskRes;
      
      if (taskRes && taskRes.data) {
        taskData = taskRes.data;
      }

      if (taskData) {
        if (taskData.title) {
          title = taskData.title;
        }
        if (taskData.description) {
          descriptionText = taskData.description;
        }
        if (taskData.data_dead_line) {
          const d = new Date(taskData.data_dead_line);
          dueDate = d.toLocaleDateString();
          timeStr = d.toLocaleTimeString();
        }
        
        if (taskData.link_executer) {
          let foundUser = null;
          
          for (let i = 0; i < usersList.length; i++) {
            const u = usersList[i];
            const uId = u.user_link || u.id;
            if (uId === taskData.link_executer) {
              foundUser = u;
              break;
            }
          }
          
          if (foundUser) {
            executorName = foundUser.display_name || foundUser.username || 'Без имени';
          }
        }
      }
    } catch (err) {
      console.error('Task fetch error', err);
    }
  }

  appDiv.innerHTML = template({
    board_name: boardName,
    task: {
      title: title,
      due_date: dueDate,
      time: timeStr,
      description: descriptionText,
      executor: executorName
    }
  });

  const navBoards = document.getElementById('nav-boards');
  if (navBoards) {
    navBoards.addEventListener('click', () => navigateTo('/boards'));
  }

  const navProfile = document.getElementById('nav-profile');
  if (navProfile) {
    navProfile.addEventListener('click', () => navigateTo('/profile'));
  }

  const btnLogout = document.getElementById('logout-btn');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        await authApi.logout();
      } catch (err) {
        console.error('Logout error', err);
      }
      localStorage.removeItem('isAuth');
      navigateTo('/login');
    });
  }

  const btnBack = document.getElementById('btn-back');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      if (boardId) {
        navigateTo(`/board?id=${boardId}`);
      } else {
        navigateTo('/boards');
      }
    });
  }
};
