import { KanbanActions } from "../KanbanActions";
import { KanbanState } from "../kanban.types";
import { KanbanContextMenus } from "./KanbanContextMenus";

export class KanbanTaskCreation {
  public static bind(appDiv: HTMLElement, state: KanbanState, closeModals: () => void, signal: AbortSignal): void {
    const btnNewTask = appDiv.querySelector<HTMLButtonElement>("#btn-new-task");
    const btnFab = appDiv.querySelector<HTMLButtonElement>("#btn-new-task-fab");

    if (state.sections.length === 0) {
      if (btnNewTask) {
        btnNewTask.disabled = true;
        btnNewTask.classList.add("kanban__action-btn--disabled");
      }
      if (btnFab) {
        btnFab.disabled = true;
        btnFab.classList.add("kanban__fab--disabled");
      }
    }

    const modalCreateTask = appDiv.querySelector<HTMLElement>("#modal-create-task");
    const modalOverlay = appDiv.querySelector<HTMLElement>("#modal-overlay");
    const taskTitleInput = appDiv.querySelector<HTMLInputElement>("#new-task-title");
    const btnConfirmCreateTask = appDiv.querySelector<HTMLButtonElement>("#btn-confirm-create-task");
    const modalAssigneeBtn = appDiv.querySelector<HTMLElement>("#assignee-select-btn");
    let selectedAssigneeId: string;

    const openCreateModal = () => {
      if (state.sections.length === 0) return;
      closeModals();
      modalOverlay?.classList.remove("hidden");
      modalCreateTask?.classList.remove("hidden");
      if (taskTitleInput) {
        taskTitleInput.value = "";
        taskTitleInput.focus();
      }
      if (modalAssigneeBtn) modalAssigneeBtn.textContent = "Выбрать...";
    };

    btnNewTask?.addEventListener("click", openCreateModal, { signal });
    btnFab?.addEventListener("click", openCreateModal, { signal });

    modalAssigneeBtn?.addEventListener("click", (e: MouseEvent) => {
      e.stopPropagation();
      KanbanContextMenus.closeMenu();
      document.querySelectorAll(".assignee-dropdown").forEach((dd) => dd.remove());

      const dropdown = document.createElement("div");
      dropdown.className = "assignee__dropdown assignee-dropdown";

      state.users.forEach((user) => {
        const item = document.createElement("div");
        item.className = "assignee__dropdown-item";
        if (user.id === selectedAssigneeId) item.classList.add("assignee__dropdown-item--selected");
        item.textContent = user.name;

        item.addEventListener("click", () => {
          selectedAssigneeId = user.id;
          modalAssigneeBtn.textContent = user.name;
          dropdown.remove();
        });
        dropdown.appendChild(item);
      });

      if (modalAssigneeBtn.parentElement) {
        modalAssigneeBtn.parentElement.classList.add("relative-wrapper");
        modalAssigneeBtn.parentElement.appendChild(dropdown);
      }
    }, { signal });

    btnConfirmCreateTask?.addEventListener("click", () => {
      const title = taskTitleInput?.value.trim();
      if (!title || state.sections.length === 0) return;

      btnConfirmCreateTask.disabled = true;
      KanbanActions.createTask(state.boardId!, state.sections[0].id, title, selectedAssigneeId);
      closeModals();
    }, { signal });

    appDiv.querySelectorAll<HTMLButtonElement>(".kanban__add-card-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const parent = btn.parentElement;
        if (!parent) return;

        const sectionId = parent.getAttribute("data-section-id")!;
        parent.innerHTML = `<div class="kanban__add-card-form"><textarea class="kanban__add-card-input" id="inline-new-task-${sectionId}" placeholder="Введите имя карточки..." maxlength="50" autofocus></textarea></div>`;
        const input = document.getElementById(`inline-new-task-${sectionId}`) as HTMLTextAreaElement;
        input.focus();

        const saveTask = () => {
          const val = input.value.trim();
          if (val) KanbanActions.createTask(state.boardId!, sectionId, val);
          else KanbanActions.fetchKanban(state.boardId!, true);
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
