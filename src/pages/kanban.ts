import Handlebars from 'handlebars';
import { kanbanApi } from '../api';
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
    document.getElementById('logout-btn')?.addEventListener('click', () => {
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
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModals(); });

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
          <div class="context-menu-item" id="ctx-delete-list">Удалить список</div>
        `;
        const rect = btn.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY}px`;
        menu.style.left = `${rect.left + window.scrollX}px`;
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
        menu.style.top = `${rect.bottom + window.scrollY}px`;
        menu.style.left = `${rect.left + window.scrollX}px`;
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
      btn.addEventListener('click', (e) => {
        const parent = btn.parentElement!;
        const sectionId = parent.getAttribute('data-section-id')!;
        parent.innerHTML = `
          <div class="add-card-form">
            <textarea class="add-card-input" id="inline-new-task-${sectionId}" placeholder="Введите имя карточки..." maxlength="50" autofocus></textarea>
            <div class="add-card-footer">
              <span class="char-count" id="char-count-${sectionId}">50</span>
              <div class="add-card-icons">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
              </div>
            </div>
          </div>
        `;
        const input = document.getElementById(`inline-new-task-${sectionId}`) as HTMLTextAreaElement;
        const charCount = document.getElementById(`char-count-${sectionId}`)!;
        input.focus();

        input.addEventListener('input', () => {
          charCount.textContent = (50 - input.value.length).toString();
        });

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
          <div class="add-column-form">
            <input type="text" class="add-column-input" id="inline-new-col-name" placeholder="Введите имя колонки..." autofocus>
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
