import { KanbanActions } from "../KanbanActions";
import { KanbanState } from "../kanban.types";
import { kanbanStore } from "../KanbanStore";
import { KanbanContextMenus } from "./KanbanContextMenus";

export class KanbanTaskCreation {
  public static bind(appDiv: HTMLElement, state: KanbanState, closeModals: () => void, signal: AbortSignal): void {
    const btnNewTask = appDiv.querySelector<HTMLButtonElement>("#btn-new-task");
    if (btnNewTask && state.sections.length === 0) {
      btnNewTask.disabled = true;
      btnNewTask.classList.add("kanban__action-btn--disabled");
    }

    const modalCreateTask = appDiv.querySelector<HTMLElement>("#modal-create-task");
    const modalOverlay = appDiv.querySelector<HTMLElement>("#modal-overlay");
    const taskTitleInput = appDiv.querySelector<HTMLInputElement>("#new-task-title");
    const btnConfirmCreateTask = appDiv.querySelector<HTMLButtonElement>("#btn-confirm-create-task");
    const modalAssigneeBtn = appDiv.querySelector<HTMLElement>("#assignee-select-btn");
    let selectedAssigneeId: string;
    let activeSectionId: string = state.sections[0]?.id ?? "";

    const setConfirmDisabled = (disabled: boolean) => {
      if (!btnConfirmCreateTask) return;
      btnConfirmCreateTask.disabled = disabled;
    };

    const openCreateModal = (sectionId?: string) => {
      if (state.sections.length === 0) return;
      activeSectionId = sectionId ?? state.sections[0].id;
      closeModals();
      modalOverlay?.classList.remove("hidden");
      modalCreateTask?.classList.remove("hidden");
      if (taskTitleInput) {
        taskTitleInput.value = "";
        taskTitleInput.focus();
      }
      if (modalAssigneeBtn) modalAssigneeBtn.textContent = "Выбрать...";
      selectedAssigneeId = undefined!;
      setConfirmDisabled(true);
    };

    taskTitleInput?.addEventListener("input", () => {
      setConfirmDisabled(!taskTitleInput.value.trim());
    }, { signal });

    btnNewTask?.addEventListener("click", () => openCreateModal(), { signal });

    modalAssigneeBtn?.addEventListener("click", (e: MouseEvent) => {
      e.stopPropagation();
      KanbanContextMenus.closeMenu();
      document.querySelectorAll(".assignee-dropdown").forEach((dd) => dd.remove());

      const dropdown = document.createElement("div");
      dropdown.className = "assignee__dropdown assignee-dropdown";

      const searchContainer = document.createElement("div");
      searchContainer.className = "assignee__search-container";
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Поиск...";
      searchInput.className = "assignee__search-input";
      searchContainer.appendChild(searchInput);
      dropdown.appendChild(searchContainer);

      const listContainer = document.createElement("div");
      listContainer.className = "assignee__list-container";
      dropdown.appendChild(listContainer);

      const renderList = (filter = "") => {
        listContainer.innerHTML = "";

        if ("Не назначен".toLowerCase().includes(filter.toLowerCase())) {
          const clearItem = document.createElement("div");
          clearItem.className = "assignee__dropdown-item assignee__dropdown-item--clear";
          clearItem.innerHTML = `<div class="assignee__avatar assignee__avatar--clear">?</div><div class="assignee__info"><span class="assignee__name">Не назначен</span></div>`;
          clearItem.addEventListener("click", () => {
            selectedAssigneeId = undefined!;
            if (modalAssigneeBtn) modalAssigneeBtn.textContent = "Выбрать...";
            dropdown.remove();
          });
          listContainer.appendChild(clearItem);
        }

        state.users
          .filter((u) => u.name.toLowerCase().includes(filter.toLowerCase()))
          .forEach((user) => {
            const item = document.createElement("div");
            item.className = "assignee__dropdown-item";
            if (user.id === selectedAssigneeId) item.classList.add("assignee__dropdown-item--selected");
            item.innerHTML = `
              ${user.avatarUrl ? `<img src="${user.avatarUrl}" class="assignee__avatar assignee__avatar--img">` : `<div class="assignee__avatar">${user.name.charAt(0).toUpperCase()}</div>`}
              <div class="assignee__info">
                <span class="assignee__name">${user.name}</span>
                <span class="assignee__email">${user.email}</span>
              </div>
            `;
            item.addEventListener("click", () => {
              selectedAssigneeId = user.id;
              if (modalAssigneeBtn) {
                modalAssigneeBtn.innerHTML = `
                  ${user.avatarUrl ? `<img src="${user.avatarUrl}" class="assignee__avatar-small">` : `<div class="assignee__avatar-fallback-small">${user.name.charAt(0).toUpperCase()}</div>`}
                  ${user.name}
                `;
              }
              dropdown.remove();
            });
            listContainer.appendChild(item);
          });
      };

      renderList();
      searchInput.addEventListener("input", (e) => renderList((e.target as HTMLInputElement).value));

      if (modalAssigneeBtn.parentElement) {
        modalAssigneeBtn.parentElement.classList.add("relative-wrapper");
        modalAssigneeBtn.parentElement.appendChild(dropdown);
      }
      searchInput.focus();
    }, { signal });

    btnConfirmCreateTask?.addEventListener("click", () => {
      const title = taskTitleInput?.value.trim();
      if (!title || state.sections.length === 0) return;

      btnConfirmCreateTask.disabled = true;
      KanbanActions.createTask(state.boardId!, activeSectionId, title, selectedAssigneeId);
      closeModals();
    }, { signal });

    appDiv.querySelectorAll<HTMLButtonElement>(".kanban__add-card-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const parent = btn.parentElement;
        if (!parent) return;

        const sectionId = parent.getAttribute("data-section-id")!;

        if (window.innerWidth <= 768) {
          openCreateModal(sectionId);
          return;
        }

        parent.innerHTML = `<div class="kanban__add-card-form"><textarea class="kanban__add-card-input" id="inline-new-task-${sectionId}" placeholder="Введите имя карточки..." maxlength="50" autofocus></textarea></div>`;
        const input = document.getElementById(`inline-new-task-${sectionId}`) as HTMLTextAreaElement;
        input.focus();

        const saveTask = () => {
          const val = input.value.trim();
          if (val) KanbanActions.createTask(state.boardId!, sectionId, val);
          else kanbanStore.emit("change");
        };

        input.addEventListener("blur", saveTask, { signal });
        input.addEventListener("keydown", (e: KeyboardEvent) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            input.blur();
          } else if (e.key === "Escape") {
            input.value = "";
            input.blur();
          }
        }, { signal });
      }, { signal });
    });
  }
}
