import Handlebars from 'handlebars';
import { authApi, boardsApi, kanbanApi } from '../api';
import { navigateTo } from '../router';
import kanbanTpl from '../templates/kanban.hbs?raw';

const template = Handlebars.compile(kanbanTpl);

export const renderKanban = async (appDiv: HTMLElement): Promise<void> => {
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get('id');
  if (!boardId) return navigateTo('/boards');

  let boardName = "Без названия";
  try {
    const boardRes = await boardsApi.getBoard(boardId) as any;
    if (boardRes?.data?.name) {
      boardName = boardRes.data.name;
    }
  } catch {

  }

  try {
    const res = await kanbanApi.getSections(boardId) as any;
    let sections = res.data?.sections || res.sections || res.data || res || [];
    if (!Array.isArray(sections)) sections = [];

    const colors = ['#666', '#8b5cf6', '#f59e0b', '#10b981'];

    for (let i = 0; i < sections.length; i++) {
      sections[i].id = sections[i].section_link || sections[i].id;
      sections[i].color = sections[i].color || colors[i % colors.length];
      try {
        const tasksRes = await kanbanApi.getTasks(sections[i].id) as any;
        const tasksList = Array.isArray(tasksRes?.data) ? tasksRes.data : (Array.isArray(tasksRes) ? tasksRes : []);

        sections[i].tasks = tasksList.map((t: any) => ({
          id: t.link_card || t.id,
          title: t.title || 'Без названия',
          due_date: t.data_dead_line ? new Date(t.data_dead_line).toLocaleDateString() : '17 марта, 2026',
          time: t.data_dead_line ? new Date(t.data_dead_line).toLocaleTimeString() : 'До 23:59',
          executor: t.name_executer || t.link_executer || 'Demo'
        }));
      } catch {
        sections[i].tasks = [];
      }
    }

    appDiv.innerHTML = template({ board_name: boardName, sections });

    document.getElementById('nav-boards')?.addEventListener('click', () => navigateTo('/boards'));
    document.getElementById('nav-profile')?.addEventListener('click', () => navigateTo('/profile'));
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      try { await authApi.logout(); } catch { }
      localStorage.removeItem('isAuth');
      navigateTo('/login');
    });

    const modalOverlay = document.getElementById('modal-overlay')!;
    const modalDeleteCard = document.getElementById('modal-delete-card')!;

    const closeModals = () => {
      modalOverlay.classList.add('hidden');
      modalDeleteCard.classList.add('hidden');
    };

    document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', closeModals));
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

    document.querySelectorAll('.btn-col-options').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        const sectionId = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
          <div class="context-menu-item" id="ctx-add-card">Добавить карточку</div>
          <div class="context-menu-item" id="ctx-edit-list">Изменить имя списка</div>
          <div class="context-menu-item text-danger" id="ctx-delete-list">Удалить список</div>
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

    document.querySelectorAll('.btn-card-options').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        const taskId = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const title = (e.currentTarget as HTMLElement).getAttribute('data-title');
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
          <div class="context-menu-item" id="ctx-edit-card">Изменить имя</div>
          <div class="context-menu-item text-danger" id="ctx-delete-card">Удалить карточку</div>
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

    document.querySelectorAll('.add-card-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const parent = btn.parentElement!;
        const sectionId = parent.getAttribute('data-section-id')!;

        parent.innerHTML = `
          <div class="add-card-form" style="background: #1e1e20; border: 1px dashed #444; border-radius: 12px; padding: 1.2rem;">
            <textarea class="add-card-input" id="inline-new-task-${sectionId}" placeholder="Введите имя карточки..." maxlength="50" autofocus style="width: 100%; background: transparent; border: none; color: white; font-size: 0.95rem; resize: none; outline: none; min-height: 40px;"></textarea>
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
          <div class="add-column-form" style="background: #1e1e20; border: 1px dashed #444; border-radius: 12px; padding: 1.2rem; min-height: 75px; display: flex; align-items: center;">
            <input type="text" class="add-column-input" id="inline-new-col-name" placeholder="Введите имя колонки..." autofocus style="background: transparent; border: none; color: white; font-size: 0.95rem; outline: none; width: 100%;">
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
        if ((e.target as HTMLElement).closest('.btn-card-options')) return;
        const taskId = card.getAttribute('data-id');
        const title = card.getAttribute('data-title') || '';
        navigateTo(`/task?boardId=${boardId}&taskId=${taskId}&title=${encodeURIComponent(title)}`);
      });
    });

    const updateTaskAssignee = async (taskId: string | null, userId: number) => {
      if (!taskId) return;
      try {
        const taskNode = document.querySelector(`.kanban-card[data-id="${taskId}"]`);
        const title = taskNode?.getAttribute('data-title') || '';
        await kanbanApi.updateTask(taskId, { link_card: taskId, title: title, link_executer: userId.toString(), description: '' });
      } catch (error) {
        console.error('Ошибка при обновлении исполнителя:', error);
      }
    };

    document.querySelectorAll('.assignee-select-btn').forEach(btn => {
      if (btn.id === 'assignee-select-btn') return;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');

        document.querySelectorAll('.assignee-dropdown').forEach(dd => dd.remove());

        const dropdown = document.createElement('div');
        dropdown.className = 'assignee-dropdown';

        const users = [
          { id: 1, name: 'Demo User', email: 'demo@demo.ru' }
        ];

        users.forEach(user => {
          const item = document.createElement('div');
          item.className = 'assignee-dropdown-item';
          item.innerHTML = `
            <div class="assignee-avatar">${user.name.charAt(0).toUpperCase()}</div>
            <div>
              <div style="font-weight: 500;">${user.name}</div>
              <div style="font-size: 0.75rem; color: #777;">${user.email}</div>
            </div>
          `;

          item.addEventListener('click', () => {
            btn.textContent = user.name;
            btn.setAttribute('data-selected-user-id', user.id.toString());
            updateTaskAssignee(taskId, user.id);
            dropdown.remove();
          });

          dropdown.appendChild(item);
        });

        btn.parentElement!.style.position = 'relative';
        btn.parentElement!.appendChild(dropdown);
      });
    });

    const modalCreateTask = document.getElementById('modal-create-task')!;
    const newTaskInput = document.getElementById('new-task-title') as HTMLInputElement;
    const btnConfirmCreate = document.getElementById('btn-confirm-create-task')!;
    const btnNewTask = document.getElementById('btn-new-task');
    const modalAssigneeBtn = document.getElementById('assignee-select-btn');

    let selectedAssigneeId: number | null = null;

    if (btnNewTask) {
      btnNewTask.addEventListener('click', () => {
        modalOverlay.classList.remove('hidden');
        modalCreateTask.classList.remove('hidden');
        newTaskInput.value = '';
        newTaskInput.focus();

        selectedAssigneeId = null;
        if (modalAssigneeBtn) {
          modalAssigneeBtn.textContent = 'Выбрать...';
        }
      });
    }

    if (modalAssigneeBtn) {
      modalAssigneeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.assignee-dropdown').forEach(dd => dd.remove());

        const dropdown = document.createElement('div');
        dropdown.className = 'assignee-dropdown';

        const users = [
          { id: 1, name: 'Demo User', email: 'demo@demo.ru' }
        ];

        users.forEach(user => {
          const item = document.createElement('div');
          item.className = 'assignee-dropdown-item';
          if (user.id === selectedAssigneeId) item.classList.add('selected');

          item.innerHTML = `
            <div class="assignee-avatar">${user.name.charAt(0).toUpperCase()}</div>
            <div class="assignee-info">
              <span class="assignee-name">${user.name}</span>
              <span class="assignee-email">${user.email}</span>
            </div>
          `;

          item.addEventListener('click', () => {
            selectedAssigneeId = user.id;
            modalAssigneeBtn.textContent = user.name;
            dropdown.remove();
          });

          dropdown.appendChild(item);
        });

        modalAssigneeBtn.style.position = 'relative';
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
            link_executer: selectedAssigneeId ? selectedAssigneeId.toString() : undefined
          });

          closeModals();
          await renderKanban(appDiv);

          selectedAssigneeId = null;
          if (modalAssigneeBtn) modalAssigneeBtn.textContent = 'Выбрать...';
        } else {
          alert('Сначала создайте колонку');
        }
      } catch (error) {
        console.error('Ошибка при создании задачи:', error);
        alert('Не удалось создать задачу');
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
      if (!target.closest('.assignee-select-btn')) {
        document.querySelectorAll('.assignee-dropdown').forEach(dd => dd.remove());
      }
    });

  } catch (err) {
    console.error(err);
    navigateTo('/boards');
  }
};
