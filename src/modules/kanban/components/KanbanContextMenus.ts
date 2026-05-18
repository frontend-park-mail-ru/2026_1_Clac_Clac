import { KanbanActions } from "../KanbanActions";
import { KanbanState } from "../kanban.types";
import { navigateTo } from "../../../router";
import { Toast } from "../../../utils/toast";
import { kanbanApi } from "../../../api";
import { showConfirmModal } from "../../../utils/confirmModal";

export class KanbanContextMenus {
  private static activeMenu: HTMLElement | null = null;

  public static bind(appDiv: HTMLElement, state: KanbanState, signal: AbortSignal): void {
    document.addEventListener("click", () => this.closeMenu(), { signal });

    appDiv.querySelectorAll<HTMLElement>(".kanban__btn-col-options").forEach((btn) => {
      btn.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        this.closeMenu();
        const target = e.currentTarget as HTMLElement;
        const sectionId = target.getAttribute("data-id")!;

        const menu = this.createMenuNode(`
          <div class="context-menu__item" id="ctx-edit-list">Изменить</div>
          <div class="context-menu__item context-menu__item--danger" id="ctx-delete-list">Удалить колонку</div>
        `, target);

        menu.querySelector("#ctx-edit-list")?.addEventListener("click", () => {
          navigateTo(`/section?boardId=${state.boardId}&sectionId=${sectionId}`);
        });

        menu.querySelector("#ctx-delete-list")?.addEventListener("click", () => {
          if (state.sections[0]?.id === sectionId) return Toast.error("Нельзя удалять бэклог");
          KanbanActions.deleteSection(state.boardId!, sectionId);
        });
      }, { signal });
    });

    appDiv.querySelectorAll<HTMLInputElement>(".kanban-subtask-checkbox").forEach((cb) => {
      cb.addEventListener("change", () => {
        const subtaskId = cb.getAttribute("data-id");
        const desc = cb.getAttribute("data-desc");
        const card = cb.closest(".kanban-card") as HTMLElement | null;

        const textSpan = cb.parentElement?.querySelector(".kanban-card__subtask-text");
        if (cb.checked) {
          textSpan?.classList.add("kanban-card__subtask-text--done");
        } else {
          textSpan?.classList.remove("kanban-card__subtask-text--done");
        }

        if (card) {
          const checkboxes = card.querySelectorAll<HTMLInputElement>(".kanban-subtask-checkbox");
          const total = checkboxes.length;
          const done = Array.from(checkboxes).filter(c => c.checked).length;
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;

          const progressFill = card.querySelector(".kanban-card__progress-fill") as HTMLElement | null;
          if (progressFill) {
            progressFill.style.width = `${percent}%`;
          }

          const subtasksTitle = card.querySelector(".kanban-card__subtasks-title");
          if (subtasksTitle) {
            subtasksTitle.textContent = `Подзадачи ${done}/${total}`;
          }
        }

        if (subtaskId && desc) {
          kanbanApi.updateSubtask(subtaskId, { is_done: cb.checked, description: desc });
        }
      });
    });

    appDiv.querySelectorAll<HTMLElement>(".kanban-card__options-btn").forEach((btn) => {
      btn.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        this.closeMenu();
        const target = e.currentTarget as HTMLElement;
        const taskId = target.getAttribute("data-id")!;
        const title = target.getAttribute("data-title") || "";

        const menu = this.createMenuNode(`
          <div class="context-menu__item" id="ctx-edit-card">Открыть</div>
          <div class="context-menu__item context-menu__item--danger" id="ctx-delete-card">Удалить</div>
        `, target);

        menu.querySelector("#ctx-edit-card")?.addEventListener("click", () => {
          navigateTo(`/task?boardId=${state.boardId}&taskId=${taskId}&title=${encodeURIComponent(title)}`);
        });

        menu.querySelector("#ctx-delete-card")?.addEventListener("click", () => {
          this.closeMenu();
          showConfirmModal({
            title: "Удалить карточку",
            text: `Вы уверены, что хотите удалить карточку "${title}"?`,
            confirmLabel: "Удалить",
            onConfirm: () => KanbanActions.deleteTask(state.boardId!, taskId),
          });
        });
      }, { signal });
    });

    appDiv.querySelectorAll<HTMLElement>(".kanban-card").forEach((card) => {
      card.addEventListener("click", (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest(".kanban-card__options-btn") || target.closest(".assignee__select-btn") || target.closest(".kanban-card__subtask-item")) return;

        const subtasksHeader = target.closest(".kanban-card__subtasks-header");
        if (subtasksHeader) {
          e.stopPropagation();
          const list = subtasksHeader.nextElementSibling;
          if (list) {
            list.classList.toggle("hidden");
            const svg = subtasksHeader.querySelector("svg");
            if (svg) {
              if (list.classList.contains("hidden")) {
                svg.classList.remove("kanban-card__subtasks-icon--expanded");
              } else {
                svg.classList.add("kanban-card__subtasks-icon--expanded");
              }
            }
          }
          return;
        }

        const subtasksList = target.closest(".kanban-card__subtasks-list");
        if (subtasksList) {
          e.stopPropagation();
          return;
        }

        const taskId = card.getAttribute("data-id");
        const title = card.getAttribute("data-title") || "";
        navigateTo(`/task?boardId=${state.boardId}&taskId=${taskId}&title=${encodeURIComponent(title)}`);
      }, { signal });
    });
  }

  public static closeMenu(): void {
    if (this.activeMenu) {
      this.activeMenu.remove();
      this.activeMenu = null;
    }
  }

  private static createMenuNode(innerHTML: string, targetBtn: HTMLElement): HTMLElement {
    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.innerHTML = innerHTML;

    const rect = targetBtn.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
    menu.style.left = `${rect.left + window.scrollX - 150}px`;
    document.body.appendChild(menu);
    this.activeMenu = menu;

    return menu;
  }
}
