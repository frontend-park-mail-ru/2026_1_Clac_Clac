import { KanbanActions } from "../KanbanActions";
import { KanbanState } from "../kanban.types";
import { navigateTo } from "../../../router";
import { Toast } from "../../../utils/toast";
import { kanbanApi } from "../../../api";
import { showConfirmModal } from "../../../utils/confirmModal";
import { kanbanStore } from "../KanbanStore";

export class KanbanContextMenus {
  private static activeMenu: HTMLElement | null = null;

  public static bind(
    appDiv: HTMLElement,
    state: KanbanState,
    signal: AbortSignal,
  ): void {
    document.addEventListener("click", () => this.closeMenu(), { signal });

    appDiv
      .querySelectorAll<HTMLElement>(".kanban__btn-col-options")
      .forEach((btn) => {
        btn.addEventListener(
          "click",
          (e: MouseEvent) => {
            e.stopPropagation();
            this.closeMenu();
            const sectionId = btn.getAttribute("data-id")!;

            const menu = this.createMenuNode(
              `
          <div class="context-menu__item" id="ctx-edit-list">Изменить</div>
          <div class="context-menu__item context-menu__item--danger" id="ctx-delete-list">Удалить колонку</div>
        `,
              btn,
            );

            menu
              .querySelector("#ctx-edit-list")
              ?.addEventListener("click", () => {
                navigateTo(
                  `/section?boardId=${state.boardId}&sectionId=${sectionId}`,
                );
              });

            menu
              .querySelector("#ctx-delete-list")
              ?.addEventListener("click", () => {
                if (state.sections[0]?.id === sectionId)
                  return Toast.error("Нельзя удалять бэклог");
                KanbanActions.deleteSection(state.boardId!, sectionId);
              });
          },
          { signal },
        );
      });

    appDiv
      .querySelectorAll<HTMLInputElement>(".kanban-subtask-checkbox")
      .forEach((cb) => {
        cb.addEventListener("change", () => {
          const subtaskId = cb.getAttribute("data-id");
          const desc = cb.getAttribute("data-desc");
          const card = cb.closest(".kanban-card") as HTMLElement | null;

          const textSpan = cb.parentElement?.querySelector(
            ".kanban-card__subtask-text",
          );
          if (cb.checked) {
            textSpan?.classList.add("kanban-card__subtask-text--done");
          } else {
            textSpan?.classList.remove("kanban-card__subtask-text--done");
          }

          if (card) {
            const checkboxes = card.querySelectorAll<HTMLInputElement>(
              ".kanban-subtask-checkbox",
            );
            const total = checkboxes.length;
            const done = Array.from(checkboxes).filter((c) => c.checked).length;
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;

            const progressFill = card.querySelector(
              ".kanban-card__progress-fill",
            ) as HTMLElement | null;
            if (progressFill) {
              progressFill.style.width = `${percent}%`;
            }

            const subtasksTitle = card.querySelector(
              ".kanban-card__subtasks-title",
            );
            if (subtasksTitle) {
              subtasksTitle.textContent = `Подзадачи ${done}/${total}`;
            }

            const taskId = card.getAttribute("data-id");
            if (taskId && subtaskId && desc) {
              kanbanStore.updateSubtaskSilently(
                taskId,
                subtaskId,
                cb.checked,
                desc,
              );
            }
          }

          if (subtaskId && desc) {
            kanbanApi.updateSubtask(subtaskId, {
              is_done: cb.checked,
              description: desc,
            });
          }
        });
      });

    appDiv
      .querySelectorAll<HTMLElement>(".kanban-card__options-btn")
      .forEach((btn) => {
        btn.addEventListener(
          "click",
          (e: MouseEvent) => {
            e.stopPropagation();
            this.closeMenu();
            const taskId = btn.getAttribute("data-id")!;
            const title = btn.getAttribute("data-title") || "";

            const menu = this.createMenuNode(
              `
          <div class="context-menu__item" id="ctx-edit-card">Открыть</div>
          <div class="context-menu__item context-menu__item--danger" id="ctx-delete-card">Удалить</div>
        `,
              btn,
            );

            menu
              .querySelector("#ctx-edit-card")
              ?.addEventListener("click", () => {
                navigateTo(
                  `/task?boardId=${state.boardId}&taskId=${taskId}&title=${encodeURIComponent(title)}`,
                );
              });

            menu
              .querySelector("#ctx-delete-card")
              ?.addEventListener("click", () => {
                this.closeMenu();
                showConfirmModal({
                  title: "Удалить карточку",
                  text: `Вы уверены, что хотите удалить карточку "${title}"?`,
                  confirmLabel: "Удалить",
                  onConfirm: () =>
                    KanbanActions.deleteTask(state.boardId!, taskId),
                });
              });
          },
          { signal },
        );
      });

    appDiv
      .querySelectorAll<HTMLElement>(".kanban-card__status-checkmark")
      .forEach((btn) => {
        btn.addEventListener(
          "click",
          async (e: MouseEvent) => {
            e.stopPropagation();
            const card = btn.closest(".kanban-card") as HTMLElement | null;
            if (!card) return;
            const taskId = card.getAttribute("data-id");
            if (!taskId) return;

            const isCurrentlyDone = btn.classList.contains(
              "kanban-card__status-checkmark--active",
            );
            const nextDone = !isCurrentlyDone;

            const titleEl = card.querySelector(".kanban-card__title");

            if (nextDone) {
              card.classList.add("kanban-card--done");
              btn.classList.add("kanban-card__status-checkmark--active");
              titleEl?.classList.add("kanban-card__title--done");
            } else {
              card.classList.remove("kanban-card--done");
              btn.classList.remove("kanban-card__status-checkmark--active");
              titleEl?.classList.remove("kanban-card__title--done");
            }

            try {
              await kanbanApi.updateTaskStatus(taskId, { done: nextDone });
              await KanbanActions.fetchKanban(state.boardId!, true);
            } catch (err) {
              Toast.error("Не удалось обновить статус задачи");

              if (isCurrentlyDone) {
                card.classList.add("kanban-card--done");
                btn.classList.add("kanban-card__status-checkmark--active");
                titleEl?.classList.add("kanban-card__title--done");
              } else {
                card.classList.remove("kanban-card--done");
                btn.classList.remove("kanban-card__status-checkmark--active");
                titleEl?.classList.remove("kanban-card__title--done");
              }
              await KanbanActions.fetchKanban(state.boardId!, true);
            }
          },
          { signal },
        );
      });

    appDiv.querySelectorAll<HTMLElement>(".kanban-card").forEach((card) => {
      card.addEventListener(
        "click",
        (e: MouseEvent) => {
          const target = e.target as HTMLElement;

          if (
            target.closest(".kanban-card__options-btn") ||
            target.closest(".assignee__select-btn") ||
            target.closest(".kanban-card__subtask-item") ||
            target.closest(".kanban-card__status-checkmark") ||
            target.closest(".kanban-card__select-checkbox")
          ) {
            return;
          }

          const subtasksHeader = target.closest(
            ".kanban-card__subtasks-header",
          );
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
          navigateTo(
            `/task?boardId=${state.boardId}&taskId=${taskId}&title=${encodeURIComponent(title)}`,
          );
        },
        { signal },
      );
    });
  }

  public static closeMenu(): void {
    if (this.activeMenu) {
      this.activeMenu.remove();
      this.activeMenu = null;
    }
  }

  private static createMenuNode(
    innerHTML: string,
    targetBtn: HTMLElement,
  ): HTMLElement {
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
