import Handlebars from 'handlebars';
import { authApi, kanbanApi } from '../api';
import { navigateTo } from '../router';
import kanbanTpl from '../templates/kanban.hbs?raw';

const template = Handlebars.compile(kanbanTpl);

export const renderKanban = async (appDiv: HTMLElement): Promise<void> => {
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get('id');
  if (!boardId) return navigateTo('/boards');

  try {
    const res = await kanbanApi.getSections(boardId) as any;
    let sections = Array.isArray(res.data) ? res.data : (res || []);

    const colors = ['#666', '#8b5cf6', '#f59e0b', '#10b981'];

    for (let i = 0; i < sections.length; i++) {
      sections[i].color = colors[i % colors.length];
      try {
        const tasksRes = await kanbanApi.getTasks(sections[i].id) as any;
        const tasksList = Array.isArray(tasksRes.data) ? tasksRes.data : [];
        sections[i].tasks = tasksList.map((t: any) => ({
          id: t.id,
          title: t.title,
          due_date: '17 марта, 2026',
          time: 'До 23:59'
        }));
      } catch {
        sections[i].tasks = [];
      }
    }

    appDiv.innerHTML = template({ board_name: "NeXuS (Trello)", sections });

    document.getElementById('nav-boards')?.addEventListener('click', () => navigateTo('/boards'));
    document.getElementById('nav-profile')?.addEventListener('click', () => navigateTo('/profile'));
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      try {
        await authApi.logout();
      } catch {
        
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
            <textarea class="add-card-input" id="inline-new-task-\${sectionId}" placeholder="Введите имя карточки..." maxlength="50" autofocus style="width: 100%; background: transparent; border: none; color: white; font-size: 0.95rem; resize: none; outline: none; min-height: 40px;"></textarea>
          </div>
        `;
        const input = document.getElementById(`inline-new-task-${sectionId}`) as HTMLTextAreaElement;
        input.focus();

        const saveTask = async () => {
          const val = input.value.trim();
          if (val) {
            await kanbanApi.createTask(sectionId, { title: val });
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
            await kanbanApi.createSection(boardId, { section_name: val, position: sections.length });
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

  } catch (err) {
    console.error(err);
    navigateTo('/boards');
  }
};
