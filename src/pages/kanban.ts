import Handlebars from 'handlebars';
import { authApi, boardsApi, kanbanApi } from '../api';
import { navigateTo } from '../router';
import kanbanTpl from '../templates/kanban.hbs?raw';

const template = Handlebars.compile(kanbanTpl);

interface BoardUser {
  id: string;
  name: string;
  email: string;
}

export const renderKanban = async (appDiv: HTMLElement): Promise<void> => {
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get('id');
  if (!boardId) {
    return navigateTo('/boards');
  }

  let boardName = "Без названия";
  let boardUsers: BoardUser[] = [];

  try {
    const boardRes = await boardsApi.getBoard(boardId) as any;
    if (boardRes?.data?.name) {
      boardName = boardRes.data.name;
    }

    const usersRes = await boardsApi.getBoardUsers(boardId) as any;
    const rawUsers = Array.isArray(usersRes?.data) ? usersRes.data : (Array.isArray(usersRes) ? usersRes : []);
    boardUsers = rawUsers.map((u: any) => ({
      id: u.user_link || u.id,
      name: u.display_name || u.username || 'Без имени',
      email: u.email || ''
    }));
  } catch (err) {
    console.error('Error fetching board details/users', err);
  }

  try {
    const res = await kanbanApi.getSections(boardId) as any;
    let sections = res.data?.sections || res.sections || res.data || res || [];
    if (!Array.isArray(sections)) {
      sections = [];
    }

    const colors = ['#666', '#8b5cf6', '#f59e0b', '#10b981'];

    for (let i = 0; i < sections.length; i++) {
      sections[i].id = sections[i].section_link || sections[i].id;
      sections[i].color = sections[i].color || colors[i % colors.length];
      
      try {
        const tasksRes = await kanbanApi.getTasks(sections[i].id) as any;
        
        let tasksList = [];
        if (Array.isArray(tasksRes?.data?.cards)) {
          tasksList = tasksRes.data.cards;
        } else if (Array.isArray(tasksRes?.cards)) {
          tasksList = tasksRes.cards;
        } else if (Array.isArray(tasksRes?.data)) {
          tasksList = tasksRes.data;
        } else if (Array.isArray(tasksRes)) {
          tasksList = tasksRes;
        }

        sections[i].tasks = tasksList.map((t: any) => {
          const executerId = t.link_executer || t.executer_link;
          const exUser = boardUsers.find(u => u.id === executerId);
          
          const deadline = t.dead_line || t.data_dead_line;

          return {
            id: t.card_link || t.link_card || t.id,
            title: t.title || 'Без названия',
            due_date: deadline ? new Date(deadline).toLocaleDateString() : null,
            time: deadline ? new Date(deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : null,
            executor: exUser ? exUser.name : (t.executer_name || t.name_executer || null)
          };
        });
      } catch (err) {
        sections[i].tasks =[];
        console.error('Error fetching tasks', err);
      }
    }

    appDiv.innerHTML = template({ board_name: boardName, sections });

    document.getElementById('nav-boards')?.addEventListener('click', () => navigateTo('/boards'));
    document.getElementById('nav-profile')?.addEventListener('click', () => navigateTo('/profile'));
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      try {
        await authApi.logout();
      } catch (err) {
        console.error('Logout error', err);
      }
      localStorage.removeItem('isAuth');
      navigateTo('/login');
    });

    const modalOverlay = document.getElementById('modal-overlay')!;
    const modalDeleteCard = document.getElementById('modal-delete-card')!;

    const closeModals = () => {
      modalOverlay.classList.add('hidden');
      modalDeleteCard.classList.add('hidden');
    };

    document.querySelectorAll('.modal__close-btn').forEach(btn => btn.addEventListener('click', closeModals));
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModals();
    });

    let activeMenu: HTMLElement | null = null;
    const closeMenu = () => {
      if (activeMenu) {
        activeMenu.remove();
        activeMenu = null;
      }
    };
    document.addEventListener('click', closeMenu);

    document.querySelectorAll('.kanban__btn-col-options').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        const sectionId = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
          <div class="context-menu__item" id="ctx-add-card">Добавить карточку</div>
          <div class="context-menu__item" id="ctx-edit-list">Изменить имя списка</div>
          <div class="context-menu__item context-menu__item--danger" id="ctx-delete-list">Удалить список</div>
        `;
        const rect = btn.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
        menu.style.left = `${rect.left + window.scrollX - 150}px`;
        document.body.appendChild(menu);
        activeMenu = menu;

        menu.querySelector('#ctx-edit-list')?.addEventListener('click', async () => {
          const newName = prompt('Введите новое имя списка:');
          if (newName && newName.trim() && sectionId) {
            await kanbanApi.updateSection(sectionId, { section_link: sectionId, section_name: newName.trim(), is_mandatory: false, max_tasks: 100, color: 'gray', position: 1 });
            renderKanban(appDiv);
          }
        });

        menu.querySelector('#ctx-delete-list')?.addEventListener('click', async () => {
          if (sectionId) {
            await kanbanApi.deleteSection(sectionId);
            renderKanban(appDiv);
          }
        });
      });
    });

    document.querySelectorAll('.kanban-card__options-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        const taskId = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const title = (e.currentTarget as HTMLElement).getAttribute('data-title');
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
          <div class="context-menu__item" id="ctx-edit-card">Изменить имя</div>
          <div class="context-menu__item context-menu__item--danger" id="ctx-delete-card">Удалить карточку</div>
        `;
        const rect = btn.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
        menu.style.left = `${rect.left + window.scrollX - 150}px`;
        document.body.appendChild(menu);
        activeMenu = menu;

        menu.querySelector('#ctx-edit-card')?.addEventListener('click', async () => {
          const newName = prompt('Введите новое имя карточки:', title || '');
          if (newName && newName.trim() && taskId) {
            await kanbanApi.updateTask(taskId, { link_card: taskId, title: newName.trim(), description: '' });
            renderKanban(appDiv);
          }
        });

        menu.querySelector('#ctx-delete-card')?.addEventListener('click', () => {
          document.getElementById('delete-card-name')!.textContent = title || '';
          modalOverlay.classList.remove('hidden');
          modalDeleteCard.classList.remove('hidden');
          const confirmBtn = document.getElementById('btn-confirm-delete-card')!;
          confirmBtn.onclick = async () => {
            if (taskId) {
              await kanbanApi.deleteTask(taskId);
              renderKanban(appDiv);
            }
          };
        });
      });
    });

    document.querySelectorAll('.kanban__add-card-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const parent = btn.parentElement!;
        const sectionId = parent.getAttribute('data-section-id')!;

        parent.innerHTML = `
          <div class="kanban__add-card-form">
            <textarea class="kanban__add-card-input" id="inline-new-task-${sectionId}" placeholder="Введите имя карточки..." maxlength="50" autofocus></textarea>
          </div>
        `;
        const input = document.getElementById(`inline-new-task-${sectionId}`) as HTMLTextAreaElement;
        input.focus();

        const saveTask = async () => {
          const val = input.value.trim();
          if (val) {
            await kanbanApi.createTask({ title: val, link_section: sectionId, description: '' });
            renderKanban(appDiv);
          } else {
            renderKanban(appDiv);
          }
        };

        input.addEventListener('blur', saveTask);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            input.blur();
          } else if (e.key === 'Escape') {
            input.value = '';
            input.blur();
          }
        });
      });
    });

    const addColumnBtn = document.getElementById('btn-add-column');
    if (addColumnBtn) {
      addColumnBtn.addEventListener('click', () => {
        const parent = addColumnBtn.parentElement!;
        parent.innerHTML = `
          <div class="kanban__add-column-form">
            <input type="text" class="kanban__add-column-input" id="inline-new-col-name" placeholder="Введите имя колонки..." autofocus>
          </div>
        `;
        const input = document.getElementById('inline-new-col-name') as HTMLInputElement;
        input.focus();

        const saveColumn = async () => {
          const val = input.value.trim();
          if (val) {
            await kanbanApi.createSection({ board_link: boardId, section_name: val, max_tasks: 100, is_mandatory: false, color: 'gray' });
          }
          renderKanban(appDiv);
        };

        input.addEventListener('blur', saveColumn);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') input.blur();
          else if (e.key === 'Escape') { input.value = ''; input.blur(); }
        });
      });
    }

    document.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.kanban-card__options-btn') || (e.target as HTMLElement).closest('.assignee__select-btn')) {
          return;
        }
        const taskId = card.getAttribute('data-id');
        const title = card.getAttribute('data-title') || '';
        navigateTo(`/task?boardId=${boardId}&taskId=${taskId}&title=${encodeURIComponent(title)}`);
      });
    });

    const updateTaskAssignee = async (taskId: string | null, userId: string) => {
      if (!taskId) return;
      try {
        const taskNode = document.querySelector(`.kanban-card[data-id="${taskId}"]`);
        const title = taskNode?.getAttribute('data-title') || '';
        await kanbanApi.updateTask(taskId, { link_card: taskId, title: title, link_executer: userId, description: '' });
        renderKanban(appDiv);
      } catch (error) {
        console.error('Ошибка при обновлении исполнителя:', error);
      }
    };

    document.querySelectorAll('.assignee__select-btn').forEach(btn => {
      if (btn.id === 'assignee-select-btn') return;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        document.querySelectorAll('.assignee__dropdown').forEach(dd => dd.remove());

        const dropdown = document.createElement('div');
        dropdown.className = 'assignee__dropdown';

        boardUsers.forEach(user => {
          const item = document.createElement('div');
          item.className = 'assignee__dropdown-item';
          item.innerHTML = `
            <div class="assignee__avatar">${user.name.charAt(0).toUpperCase()}</div>
            <div class="assignee__info">
              <span class="assignee__name">${user.name}</span>
              <span class="assignee__email">${user.email}</span>
            </div>
          `;

          item.addEventListener('click', () => {
            btn.textContent = user.name;
            btn.setAttribute('data-selected-user-id', user.id);
            updateTaskAssignee(taskId, user.id);
            dropdown.remove();
          });

          dropdown.appendChild(item);
        });

        btn.parentElement!.classList.add('relative-wrapper');
        btn.parentElement!.appendChild(dropdown);
      });
    });

    const modalCreateTask = document.getElementById('modal-create-task')!;
    const newTaskInput = document.getElementById('new-task-title') as HTMLInputElement;
    const btnConfirmCreate = document.getElementById('btn-confirm-create-task')!;
    const btnNewTask = document.getElementById('btn-new-task');
    const modalAssigneeBtn = document.getElementById('assignee-select-btn');

    let selectedAssigneeId: string | null = null;

    if (btnNewTask) {
      btnNewTask.addEventListener('click', () => {
        modalOverlay.classList.remove('hidden');
        modalCreateTask.classList.remove('hidden');
        newTaskInput.value = '';
        newTaskInput.focus();

        selectedAssigneeId = null;
        if (modalAssigneeBtn) modalAssigneeBtn.textContent = 'Выбрать...';
      });
    }

    if (modalAssigneeBtn) {
      modalAssigneeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.assignee-dropdown').forEach(dd => dd.remove());

        const dropdown = document.createElement('div');
        dropdown.className = 'assignee-dropdown';

        boardUsers.forEach(user => {
          const item = document.createElement('div');
          item.className = 'assignee-dropdown-item';
          if (user.id === selectedAssigneeId) item.classList.add('assignee__dropdown-item--selected');

          item.innerHTML = `
            <div class="assignee-avatar" style="width:24px;height:24px;border-radius:50%;background:#8b5cf6;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;">${user.name.charAt(0).toUpperCase()}</div>
            <div class="assignee-info" style="display:flex;flex-direction:column;margin-left:8px;">
              <span class="assignee-name" style="color:white;font-weight:500;">${user.name}</span>
              <span class="assignee-email" style="color:#777;font-size:12px;">${user.email}</span>
            </div>
          `;

          item.addEventListener('click', () => {
            selectedAssigneeId = user.id;
            modalAssigneeBtn.textContent = user.name;
            dropdown.remove();
          });

          dropdown.appendChild(item);
        });

        modalAssigneeBtn.classList.add('relative-wrapper');
        modalAssigneeBtn.appendChild(dropdown);
      });
    }

    const handleCreateTask = async () => {
      const title = newTaskInput.value.trim();
      if (!title) return;

      try {
        if (sections.length > 0) {
          await kanbanApi.createTask({
            title,
            link_section: sections[0].id,
            description: '',
            link_executer: selectedAssigneeId ? selectedAssigneeId : undefined
          });
          closeModals();
          await renderKanban(appDiv);

          selectedAssigneeId = null;
          if (modalAssigneeBtn) {
            modalAssigneeBtn.textContent = 'Выбрать...';
          }
        } else {
          alert('Сначала создайте колонку');
        }
      } catch (error) {
        console.error('Ошибка при создании задачи:', error);
      }
    };

    btnConfirmCreate.addEventListener('click', handleCreateTask);

    newTaskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCreateTask();
      }
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.assignee-select-btn') && !target.closest('.assignee__select-btn')) {
        document.querySelectorAll('.assignee-dropdown, .assignee__dropdown').forEach(dd => dd.remove());
      }
    });

    let draggedTaskId: string | null = null;
    let sourceSectionId: string | null = null;

    appDiv.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('dragstart', (e: Event) => {
        const dragEvent = e as DragEvent;
        draggedTaskId = card.getAttribute('data-id');
        sourceSectionId = card.closest('.kanban__column-cards')?.getAttribute('data-section-id') || null;

        if (dragEvent.dataTransfer) {
          dragEvent.dataTransfer.effectAllowed = 'move';
          dragEvent.dataTransfer.setData('text/plain', draggedTaskId || '');
        }
        setTimeout(() => (card as HTMLElement).style.opacity = '0.5', 0);
      });

      card.addEventListener('dragend', () => {
        (card as HTMLElement).style.opacity = '1';
        draggedTaskId = null;
        sourceSectionId = null;
      });
    });

    appDiv.querySelectorAll('.kanban__column-cards').forEach(dropZone => {
      dropZone.addEventListener('dragover', (e: Event) => {
        e.preventDefault();
        const dragEvent = e as DragEvent;
        if (dragEvent.dataTransfer) {
          dragEvent.dataTransfer.dropEffect = 'move';
        }
      });

      dropZone.addEventListener('drop', async (e: Event) => {
        e.preventDefault();
        const targetSectionId = dropZone.getAttribute('data-section-id');

        if (draggedTaskId && targetSectionId && targetSectionId !== sourceSectionId) {
          try {
            const cardEl = document.querySelector(`.kanban-card[data-id="${draggedTaskId}"]`);
            if (cardEl) dropZone.appendChild(cardEl);

            await kanbanApi.reorderTask(draggedTaskId, {
              link_card: draggedTaskId,
              link_section: targetSectionId,
              position: 1
            });
            renderKanban(appDiv);
          } catch (err) {
            console.error('Ошибка при переносе карточки:', err);
            renderKanban(appDiv);
          }
        }
      });
    });

  } catch (err) {
    console.error(err);
    navigateTo('/boards');
  }
};
