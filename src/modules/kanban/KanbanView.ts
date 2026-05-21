import Handlebars from "handlebars";
import kanbanTpl from "../../templates/kanban.hbs?raw";
import { KanbanState } from "./kanban.types";
import { navigateTo } from "../../router";
import { authApi, boardsApi, kanbanApi } from "../../api";

import { KanbanDragAndDrop } from "./components/KanbanDragAndDrop";
import { KanbanContextMenus } from "./components/KanbanContextMenus";
import { KanbanTaskCreation } from "./components/KanbanTaskCreation";
import { KanbanColumnManager } from "./components/KanbanColumnManager";
import { showConfirmModal } from "../../utils/confirmModal";
import { Toast } from "../../utils/toast";
import { KanbanActions } from "./KanbanActions";

const template = Handlebars.compile(kanbanTpl);

export class KanbanView {
  private appDiv: HTMLElement;
  private abortController: AbortController | null = null;

  private currentView: "kanban" | "gantt" = "kanban";

  private collapsedSections = new Set<string>();
  private collapsedTasks = new Set<string>();

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
  }

  public setAppDiv(appDiv: HTMLElement): void {
    this.appDiv = appDiv;
  }

  public render(state: KanbanState): void {
    if (state.isLoading) return;

    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    const scrollMap = new Map<string, number>();
    const expandedTasks = new Set<string>();

    const wrapper = this.appDiv.querySelector(".kanban__columns-wrapper");
    const wrapperScrollLeft = wrapper ? wrapper.scrollLeft : 0;

    this.appDiv
      .querySelectorAll<HTMLElement>(".kanban__column-cards")
      .forEach((el) => {
        const id = el.getAttribute("data-section-id");
        if (id) scrollMap.set(id, el.scrollTop);
      });

    this.appDiv.querySelectorAll<HTMLElement>(".kanban-card").forEach((el) => {
      const id = el.getAttribute("data-id");
      const list = el.querySelector(".kanban-card__subtasks-list");
      if (id && list && !list.classList.contains("hidden")) {
        expandedTasks.add(id);
      }
    });

    this.appDiv.innerHTML = template({
      board_name: state.boardName,
      sections: state.sections,
    });

    const tabKanban = this.appDiv.querySelector("#tab-view-kanban");
    const tabGantt = this.appDiv.querySelector("#tab-view-gantt");
    const kanbanWrapper = this.appDiv.querySelector(
      ".kanban__columns-wrapper",
    ) as HTMLElement;
    const ganttContainer = this.appDiv.querySelector(
      "#gantt-chart-container",
    ) as HTMLElement;

    if (this.currentView === "gantt") {
      kanbanWrapper?.classList.add("hidden");
      ganttContainer?.classList.remove("hidden");
      tabGantt?.classList.add("active");
      tabKanban?.classList.remove("active");
      this.renderGanttChart(state);
    } else {
      kanbanWrapper?.classList.remove("hidden");
      ganttContainer?.classList.add("hidden");
      tabKanban?.classList.add("active");
      tabGantt?.classList.remove("active");
    }

    tabKanban?.addEventListener("click", () => {
      this.currentView = "kanban";
      kanbanWrapper?.classList.remove("hidden");
      ganttContainer?.classList.add("hidden");
      tabKanban.classList.add("active");
      tabGantt?.classList.remove("active");
    });

    tabGantt?.addEventListener("click", () => {
      this.currentView = "gantt";
      kanbanWrapper?.classList.add("hidden");
      ganttContainer?.classList.remove("hidden");
      tabGantt.classList.add("active");
      tabKanban?.classList.remove("active");
      this.renderGanttChart(state);
    });

    const newWrapper = this.appDiv.querySelector(".kanban__columns-wrapper");
    if (newWrapper) newWrapper.scrollLeft = wrapperScrollLeft;

    this.appDiv
      .querySelectorAll<HTMLElement>(".kanban__column-cards")
      .forEach((el) => {
        const id = el.getAttribute("data-section-id");
        if (id && scrollMap.has(id)) el.scrollTop = scrollMap.get(id)!;
      });

    this.appDiv.querySelectorAll<HTMLElement>(".kanban-card").forEach((el) => {
      const id = el.getAttribute("data-id");
      if (id && expandedTasks.has(id)) {
        const list = el.querySelector(".kanban-card__subtasks-list");
        if (list) list.classList.remove("hidden");
        const svg = el.querySelector(
          ".kanban-card__subtasks-header svg",
        ) as HTMLElement;
        if (svg) svg.classList.add("kanban-card__subtasks-icon--expanded");
      }
    });

    this.attachEventListeners(state, this.abortController.signal);
  }

  private renderGanttChart(state: KanbanState) {
    const container = this.appDiv.querySelector(
      "#gantt-chart-container",
    ) as HTMLElement;
    if (!container) return;

    container.innerHTML = "";

    const flatItems: any[] = [];
    const parseDueDate = (dueStr: string): Date | null => {
      if (!dueStr) return null;
      const months = [
        "января",
        "февраля",
        "марта",
        "апреля",
        "мая",
        "июня",
        "июля",
        "августа",
        "сентября",
        "октября",
        "ноября",
        "декабря",
      ];
      const parts = dueStr.replace(",", "").split(" ");
      if (parts.length >= 3) {
        const day = parseInt(parts[0], 10);
        const monthIdx = months.indexOf(parts[1].toLowerCase());
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && monthIdx !== -1 && !isNaN(year)) {
          return new Date(year, monthIdx, day);
        }
      }
      return null;
    };

    state.sections.forEach((sec) => {
      flatItems.push({
        type: "section",
        id: sec.id,
        name: sec.section_name,
        color: sec.color,
        isExpanded: !this.collapsedSections.has(sec.id),
      });

      if (!this.collapsedSections.has(sec.id)) {
        sec.tasks.forEach((task) => {
          const end =
            parseDueDate(task.due_date || "") ||
            new Date(Date.now() + (task.id.charCodeAt(0) % 5) * 86400000);
          const start = new Date(end.getTime() - 4 * 86400000);

          flatItems.push({
            type: "task",
            id: task.id,
            sectionId: sec.id,
            name: task.title,
            start,
            end,
            due_date: task.due_date,
            isExpanded: !this.collapsedTasks.has(task.id),
            subtasks: task.subtasks || [],
          });

          if (!this.collapsedTasks.has(task.id)) {
            const subtasks = task.subtasks || [];
            const N = subtasks.length;
            subtasks.forEach((sub, i) => {
              const step = N > 0 ? (end.getTime() - start.getTime()) / N : 0;
              const subStart = new Date(start.getTime() + i * step);
              const subEnd = new Date(start.getTime() + (i + 1) * step);

              flatItems.push({
                type: "subtask",
                id: sub.link || (sub as any).id,
                taskId: task.id,
                name: sub.description,
                start: subStart,
                end: subEnd,
                is_done: sub.is_done,
              });
            });
          }
        });
      }
    });

    let minTime = Infinity;
    let maxTime = -Infinity;
    flatItems.forEach((item) => {
      if (item.start && item.end) {
        minTime = Math.min(minTime, item.start.getTime());
        maxTime = Math.max(maxTime, item.end.getTime());
      }
    });

    if (minTime === Infinity || maxTime === -Infinity) {
      minTime = Date.now() - 3 * 86400000;
      maxTime = Date.now() + 3 * 86400000;
    }

    const timelineStart = minTime - 3 * 86400000;
    const timelineEnd = maxTime + 3 * 86400000;
    const timelineDuration = timelineEnd - timelineStart;
    const totalDays = Math.round(timelineDuration / 86400000);

    container.innerHTML = `
      <div class="gantt-chart__left-pane">
        <div class="gantt-chart__header-row">
          <span>Название</span>
          <span>Диапазон дат</span>
        </div>
        <div class="gantt-chart__list"></div>
      </div>
      <div class="gantt-chart__right-pane">
        <div class="gantt-chart__timeline-header"></div>
        <div class="gantt-chart__grid-body"></div>
      </div>
    `;

    const leftList = container.querySelector(
      ".gantt-chart__list",
    ) as HTMLElement;
    const timelineHeader = container.querySelector(
      ".gantt-chart__timeline-header",
    ) as HTMLElement;
    const gridBody = container.querySelector(
      ".gantt-chart__grid-body",
    ) as HTMLElement;

    const months = [
      "янв",
      "фев",
      "мар",
      "апр",
      "май",
      "июн",
      "июл",
      "авг",
      "сен",
      "окт",
      "ноя",
      "дек",
    ];
    const cellWidth = 60;
    timelineHeader.style.width = `${totalDays * cellWidth}px`;
    gridBody.style.width = `${totalDays * cellWidth}px`;

    for (let d = 0; d < totalDays; d++) {
      const date = new Date(timelineStart + d * 86400000);
      const cell = document.createElement("div");
      cell.className = "gantt-chart__timeline-cell";
      cell.style.width = `${cellWidth}px`;
      cell.textContent = `${date.getDate()}`;
      cell.title = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
      timelineHeader.appendChild(cell);
    }

    leftList.addEventListener("scroll", () => {
      gridBody.scrollTop = leftList.scrollTop;
    });
    gridBody.addEventListener("scroll", () => {
      leftList.scrollTop = gridBody.scrollTop;
    });

    flatItems.forEach((item) => {
      const leftRow = document.createElement("div");
      leftRow.className = `gantt-chart__row gantt-chart__row--${item.type}`;

      let iconHtml = "";
      let dateRangeHtml = "";

      const formatDateRange = (s: Date, e: Date) => {
        const mNames = [
          "января",
          "февраля",
          "марта",
          "апреля",
          "мая",
          "июня",
          "июля",
          "августа",
          "сентября",
          "октября",
          "ноября",
          "декабря",
        ];
        return `${s.getDate()} ${mNames[s.getMonth()]}, ${s.getFullYear()} - ${e.getDate()} ${mNames[e.getMonth()]}, ${e.getFullYear()}`;
      };

      if (item.type === "section") {
        const chevronClass = item.isExpanded
          ? "gantt-chart__chevron--expanded"
          : "";
        iconHtml = `
          <span class="gantt-chart__chevron ${chevronClass}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
          <span class="gantt-chart__col-dot bg-${item.color}"></span>
        `;
        leftRow.addEventListener("click", () => {
          if (this.collapsedSections.has(item.id)) {
            this.collapsedSections.delete(item.id);
          } else {
            this.collapsedSections.add(item.id);
          }
          this.renderGanttChart(state);
        });
      } else if (item.type === "task") {
        const chevronClass = item.isExpanded
          ? "gantt-chart__chevron--expanded"
          : "";
        iconHtml =
          item.subtasks.length > 0
            ? `
          <span class="gantt-chart__chevron ${chevronClass}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
        `
            : "";
        dateRangeHtml = `<span class="gantt-chart__item-date">${formatDateRange(item.start, item.end)}</span>`;
        leftRow.addEventListener("click", () => {
          if (item.subtasks.length === 0) return;
          if (this.collapsedTasks.has(item.id)) {
            this.collapsedTasks.delete(item.id);
          } else {
            this.collapsedTasks.add(item.id);
          }
          this.renderGanttChart(state);
        });
      } else if (item.type === "subtask") {
        iconHtml = `
          <label class="custom-checkbox gantt-chart__subtask-checkbox">
            <input type="checkbox" class="gantt-subtask-cb" data-id="${item.id}" ${item.is_done ? "checked" : ""}>
            <span class="checkmark"></span>
          </label>
        `;
        dateRangeHtml = `<span class="gantt-chart__item-date">${formatDateRange(item.start, item.end)}</span>`;
      }

      leftRow.innerHTML = `
        <div class="gantt-chart__item-title">
          ${iconHtml}
          <span>${item.name}</span>
        </div>
        ${dateRangeHtml}
      `;

      if (item.type === "subtask") {
        const cb = leftRow.querySelector(
          ".gantt-subtask-cb",
        ) as HTMLInputElement;
        cb?.addEventListener("click", (e) => e.stopPropagation());
        cb?.addEventListener("change", async () => {
          try {
            await kanbanApi.updateSubtask(item.id, {
              is_done: cb.checked,
              description: item.name,
            });
            item.is_done = cb.checked;
            this.renderGanttChart(state);
            KanbanActions.fetchKanban(state.boardId!, true);
          } catch {
            cb.checked = !cb.checked;
            Toast.error("Ошибка при обновлении подзадачи");
          }
        });
      }

      leftList.appendChild(leftRow);

      const rightRow = document.createElement("div");
      rightRow.className = `gantt-chart__grid-row gantt-chart__grid-row--${item.type}`;

      for (let d = 0; d < totalDays; d++) {
        const line = document.createElement("div");
        line.className = "gantt-chart__grid-line";
        line.style.width = `${cellWidth}px`;
        rightRow.appendChild(line);
      }

      if (item.start && item.end) {
        const barContainer = document.createElement("div");
        barContainer.className = "gantt-chart__bar-container";

        const offsetLeft =
          ((item.start.getTime() - timelineStart) / timelineDuration) * 100;
        const barWidth =
          ((item.end.getTime() - item.start.getTime()) / timelineDuration) *
          100;

        const isPurple =
          item.type === "subtask"
            ? item.is_done
            : item.type === "task" &&
              (item.subtasks || []).length > 0 &&
              item.subtasks.every((s: any) => s.is_done);
        const barColorClass = isPurple
          ? "gantt-chart__bar--purple"
          : "gantt-chart__bar--white";

        const bar = document.createElement("div");
        bar.className = `gantt-chart__bar ${barColorClass}`;
        bar.style.left = `${offsetLeft}%`;
        bar.style.width = `${barWidth}%`;
        bar.title = `${item.name}: ${formatDateRange(item.start, item.end)}`;

        barContainer.appendChild(bar);
        rightRow.appendChild(barContainer);
      }

      gridBody.appendChild(rightRow);
    });
  }

  private attachEventListeners(state: KanbanState, signal: AbortSignal): void {
    const closeModals = (): void => {
      this.appDiv
        .querySelectorAll(".modal, .manage-columns")
        .forEach((m) => m.classList.add("hidden"));
      this.appDiv.querySelector("#modal-overlay")?.classList.add("hidden");
      document
        .querySelectorAll(".assignee-dropdown")
        .forEach((dd) => dd.remove());
      KanbanContextMenus.closeMenu();
    };

    document
      .getElementById("nav-boards")
      ?.addEventListener("click", () => navigateTo("/boards"), { signal });
    document
      .getElementById("nav-logo")
      ?.addEventListener("click", () => navigateTo("/boards"), { signal });
    document
      .getElementById("nav-profile")
      ?.addEventListener("click", () => navigateTo("/profile"), { signal });
    document.getElementById("logout-btn")?.addEventListener(
      "click",
      () => {
        showConfirmModal({
          title: "Выход",
          text: "Вы уверены, что хотите выйти из аккаунта?",
          confirmLabel: "Выйти",
          onConfirm: async () => {
            try {
              await authApi.logout();
            } catch (err) {
              console.error("Logout error", err);
            } finally {
              localStorage.removeItem("isAuth");
              navigateTo("/login");
            }
          },
        });
      },
      { signal },
    );

    this.appDiv.querySelector("#modal-overlay")?.addEventListener(
      "click",
      (e: Event) => {
        if (e.target === e.currentTarget) closeModals();
      },
      { signal },
    );

    this.appDiv
      .querySelectorAll(".modal__close-btn, #btn-close-manage")
      .forEach((btn) => btn.addEventListener("click", closeModals, { signal }));

    this.appDiv.querySelector("#btn-share-board")?.addEventListener(
      "click",
      async () => {
        closeModals();
        this.appDiv.querySelector("#modal-overlay")?.classList.remove("hidden");

        const inviteModal = this.appDiv.querySelector(
          "#modal-invite-board",
        ) as HTMLElement;
        if (!inviteModal) return;
        inviteModal.classList.remove("hidden");

        const linkInput = inviteModal.querySelector(
          "#invite-link-input",
        ) as HTMLInputElement;
        const emailInput = inviteModal.querySelector(
          "#invite-email-input",
        ) as HTMLInputElement;
        const confirmBtn = inviteModal.querySelector(
          "#btn-confirm-invite",
        ) as HTMLButtonElement;
        const roleBtn = inviteModal.querySelector(
          "#invite-role-btn",
        ) as HTMLButtonElement;
        const roleText = inviteModal.querySelector(
          "#invite-role-text",
        ) as HTMLElement;
        const roleDropdown = inviteModal.querySelector(
          "#invite-role-dropdown",
        ) as HTMLElement;
        const roleContainer = inviteModal.querySelector(
          "#invite-role-select-container",
        ) as HTMLElement;

        const tabMember = inviteModal.querySelector(
          "#tab-invite-member",
        ) as HTMLButtonElement;
        const tabGuest = inviteModal.querySelector(
          "#tab-invite-guest",
        ) as HTMLButtonElement;

        if (linkInput) linkInput.value = "Загрузка ссылки...";
        if (emailInput) emailInput.value = "";
        if (confirmBtn) {
          confirmBtn.disabled = true;
          confirmBtn.textContent = "Пригласить";
        }

        let currentRole = "editor";

        const generateLink = async (role: string) => {
          if (!state.boardId) return;
          try {
            const res = await boardsApi.createInvite(state.boardId, {
              default_role: role,
              expire_seconds: 86400 * 7,
            });
            if (linkInput) {
              linkInput.value = `${window.location.origin}/invite/${res.data.invite_link}`;
            }
          } catch {
            if (linkInput) linkInput.value = "Ошибка при генерации ссылки";
          }
        };

        generateLink(currentRole);

        tabMember?.addEventListener("click", () => {
          tabMember.classList.add("active");
          tabGuest.classList.remove("active");
          roleContainer.classList.remove("hidden");
          currentRole = "editor";
          if (roleText) roleText.textContent = "Участник";
          generateLink(currentRole);
        });

        tabGuest?.addEventListener("click", () => {
          tabGuest.classList.add("active");
          tabMember.classList.remove("active");
          roleContainer.classList.add("hidden");
          currentRole = "viewer";
          generateLink(currentRole);
        });

        roleBtn?.addEventListener("click", (ev) => {
          ev.stopPropagation();
          roleDropdown?.classList.toggle("hidden");
        });

        roleDropdown
          ?.querySelectorAll(".invite-modal__dropdown-item")
          .forEach((item) => {
            item.addEventListener("click", (ev) => {
              ev.stopPropagation();
              const role = item.getAttribute("data-role") || "editor";
              const visibleName = item.textContent?.trim() || "Участник";
              currentRole = role;
              if (roleText) roleText.textContent = visibleName;
              roleDropdown.classList.add("hidden");
              generateLink(currentRole);
            });
          });

        const closeDropdown = () => {
          roleDropdown?.classList.add("hidden");
        };
        document.addEventListener("click", closeDropdown);

        emailInput?.addEventListener("input", () => {
          const val = emailInput.value.trim();
          const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
          if (confirmBtn) {
            confirmBtn.disabled = !isValid;
          }
        });

        inviteModal
          .querySelector("#btn-copy-invite-link")
          ?.addEventListener("click", () => {
            if (
              linkInput &&
              linkInput.value &&
              !linkInput.value.startsWith("Загрузка")
            ) {
              navigator.clipboard.writeText(linkInput.value).then(() => {
                Toast.success("Ссылка скопирована!");
              });
            }
          });

        inviteModal
          .querySelector("#btn-cancel-invite")
          ?.addEventListener("click", closeModals);
        inviteModal
          .querySelector("#btn-close-invite")
          ?.addEventListener("click", closeModals);

        confirmBtn?.addEventListener("click", async () => {
          const email = emailInput.value.trim();
          if (!email) return;

          confirmBtn.disabled = true;
          confirmBtn.textContent = "Отправка...";

          try {
            await boardsApi.createInvite(state.boardId!, {
              default_role: currentRole,
              expire_seconds: 86400 * 7,
            });
            Toast.success(`Приглашение отправлено на ${email}!`);
            closeModals();
          } catch {
            Toast.error("Не удалось отправить приглашение");
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Пригласить";
          }
        });
      },
      { signal },
    );

    if (state.boardId) {
      KanbanColumnManager.bind(this.appDiv, state, closeModals, signal);
      KanbanTaskCreation.bind(this.appDiv, state, closeModals, signal);
      KanbanContextMenus.bind(this.appDiv, state, signal);
      KanbanDragAndDrop.bind(this.appDiv, state.boardId, signal);
    }
  }
}
