import { KanbanActions } from "../KanbanActions";
import { KanbanState } from "../kanban.types";
import { KanbanContextMenus } from "./KanbanContextMenus";

export class KanbanTaskCreation {
  public static bind(appDiv: HTMLElement, state: KanbanState, closeModals: () => void, signal: AbortSignal): void {
    const btnNewTask = appDiv.querySelector<HTMLButtonElement>("#btn-new-task");
    if (btnNewTask && state.sections.length === 0) {
      btnNewTask.disabled = true;
      btnNewTask.style.opacity = "0.5";
      btnNewTask.style.cursor = "not-allowed";
    }

    const modalCreateTask = appDiv.querySelector<HTMLElement>("#modal-create-task");
    const modalOverlay = appDiv.querySelector<HTMLElement>("#modal-overlay");
    const taskTitleInput = appDiv.querySelector<HTMLInputElement>("#new-task-title");
    const btnConfirmCreateTask = appDiv.querySelector<HTMLButtonElement>("#btn-confirm-create-task");
    const modalAssigneeBtn = appDiv.querySelector<HTMLElement>("#assignee-select-btn");
    let selectedAssigneeId: string | null = null;

    btnNewTask?.addEventListener("click", () => {
      if (state.sections.length === 0) return;
      closeModals();
      modalOverlay?.classList.remove("hidden");
      modalCreateTask?.classList.remove("hidden");
      if (taskTitleInput) {
        taskTitleInput.value = "";
        taskTitleInput.focus();
      }
      selectedAssigneeId = null;
      if (modalAssigneeBtn) modalAssigneeBtn.textContent = "Выбрать...";
    }, { signal });

    modalAssigneeBtn?.addEventListener("click", (e: MouseEvent) => {
      e.stopPropagation();
      KanbanContextMenus.closeMenu();
      document.querySelectorAll(".assignee-dropdown").forEach((dd) => dd.remove());

      const dropdown = document.createElement("div");
      dropdown.className = "assignee-dropdown";
      dropdown.style.cssText = `position: absolute; top: 100%; left: 0; width: 220px; background: #2a2a2c; border: 1px solid #444; border-radius: 8px; z-index: 1000;`;

      state.users.forEach((user) => {
        const item = document.createElement("div");
        item.style.cssText = `padding: 8px; cursor: pointer; border-bottom: 1px solid #333; color: white;`;
        if (user.id === selectedAssigneeId) item.style.backgroundColor = "#3a3a3c";
        item.textContent = user.name;

        item.addEventListener("click", () => {
          selectedAssigneeId = user.id;
          modalAssigneeBtn.textContent = user.name;
          dropdown.remove();
        });
        dropdown.appendChild(item);
      });

      if (modalAssigneeBtn.parentElement) {
        modalAssigneeBtn.parentElement.style.position = "relative";
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
