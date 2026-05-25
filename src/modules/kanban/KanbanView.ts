import Handlebars from "handlebars";
import kanbanTpl from "../../templates/kanban.hbs?raw";
import { KanbanState } from "./kanban.types";
import { navigateTo } from "../../router";
import { authApi, boardsApi, kanbanApi } from "../../api";
import { currentUser } from "../../main";

import { KanbanDragAndDrop } from "./components/KanbanDragAndDrop";
import { KanbanContextMenus } from "./components/KanbanContextMenus";
import { KanbanTaskCreation } from "./components/KanbanTaskCreation";
import { KanbanColumnManager } from "./components/KanbanColumnManager";
import { KanbanPoll } from "./components/KanbanPoll";
import { showConfirmModal } from "../../utils/confirmModal";
import { Toast } from "../../utils/toast";
import { KanbanActions } from "./KanbanActions";

const template = Handlebars.compile(kanbanTpl);

export class KanbanView {
  private appDiv: HTMLElement;
  private abortController: AbortController | null = null;

  private currentView: "kanban" | "gantt" = "kanban";

  private collapsedSections = new Set<string>();

  private ganttFilterEnabled = false;
  private ganttFilterStartDate: Date | null = null;
  private ganttFilterEndDate: Date | null = null;
  private ganttFilterWithTime = false;
  private ganttFilterWithStart = false;

  private tempGanttFilterStartDate: Date | null = null;
  private tempGanttFilterEndDate: Date | null = null;

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

    const wrapper = this.appDiv.querySelector(".kanban__columns-container");
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

    const isViewer = state.myRole === "viewer";
    const isPollActive = state.poll && state.poll.isActive ? true : false;

    const sectionsWithSelection = state.sections.map((sec) => ({
      ...sec,
      tasks: sec.tasks.map((task) => ({
        ...task,
        hasPoints: task.points !== undefined && task.points !== null,
        isSelected: state.selectedCards
          ? state.selectedCards.has(task.id)
          : false,
      })),
    }));

    this.appDiv.innerHTML = template({
      board_name: state.boardName,
      sections: sectionsWithSelection,
      isViewer: isViewer,
      pollActive: isPollActive,
      isSelectionMode: state.isSelectionMode,
    });

    const tabKanban = this.appDiv.querySelector("#tab-view-kanban");
    const tabGantt = this.appDiv.querySelector("#tab-view-gantt");
    const kanbanWrapper = this.appDiv.querySelector(
      ".kanban__columns-wrapper",
    ) as HTMLElement;
    const ganttContainer = this.appDiv.querySelector(
      "#gantt-chart-container",
    ) as HTMLElement;
    const filterContainer = this.appDiv.querySelector(
      "#gantt-filter-container",
    ) as HTMLElement;

    if (this.currentView === "gantt") {
      kanbanWrapper?.classList.add("hidden");
      ganttContainer?.classList.remove("hidden");
      filterContainer?.classList.remove("hidden");
      tabGantt?.classList.add("active");
      tabKanban?.classList.remove("active");
      this.renderGanttChart(state);
    } else {
      kanbanWrapper?.classList.remove("hidden");
      ganttContainer?.classList.add("hidden");
      filterContainer?.classList.add("hidden");
      tabKanban?.classList.add("active");
      tabGantt?.classList.remove("active");
    }

    tabKanban?.addEventListener("click", () => {
      this.currentView = "kanban";
      kanbanWrapper?.classList.remove("hidden");
      ganttContainer?.classList.add("hidden");
      filterContainer?.classList.add("hidden");
      tabKanban.classList.add("active");
      tabGantt?.classList.remove("active");
    });

    tabGantt?.addEventListener("click", () => {
      this.currentView = "gantt";
      kanbanWrapper?.classList.add("hidden");
      ganttContainer?.classList.remove("hidden");
      filterContainer?.classList.remove("hidden");
      tabGantt.classList.add("active");
      tabKanban?.classList.remove("active");
      this.renderGanttChart(state);
    });

    const newWrapper = this.appDiv.querySelector(".kanban__columns-container");
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

  private buildFilterCalendar(
    currentDate: Date | null,
    onSelect: (d: Date) => void,
  ): HTMLElement {
    const MONTHS = [
      "Январь",
      "Февраль",
      "Март",
      "Апрель",
      "Май",
      "Июнь",
      "Июль",
      "Август",
      "Сентябрь",
      "Октябрь",
      "Ноябрь",
      "Декабрь",
    ];
    const DAYS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

    let viewYear = currentDate
      ? currentDate.getFullYear()
      : new Date().getFullYear();
    let viewMonth = currentDate
      ? currentDate.getMonth()
      : new Date().getMonth();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const selectedStr = currentDate
      ? `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`
      : "";

    const cal = document.createElement("div");
    cal.className = "gantt-filter-calendar";

    const render = () => {
      cal.innerHTML = "";

      const header = document.createElement("div");
      header.className = "date-picker__header";

      const prev = document.createElement("button");
      prev.className = "date-picker__nav-btn";
      prev.textContent = "‹";
      prev.type = "button";
      prev.addEventListener("click", (e) => {
        e.stopPropagation();
        viewMonth--;
        if (viewMonth < 0) {
          viewMonth = 11;
          viewYear--;
        }
        render();
      });

      const title = document.createElement("span");
      title.textContent = `${MONTHS[viewMonth]} ${viewYear}`;

      const next = document.createElement("button");
      next.className = "date-picker__nav-btn";
      next.textContent = "›";
      next.type = "button";
      next.addEventListener("click", (e) => {
        e.stopPropagation();
        viewMonth++;
        if (viewMonth > 11) {
          viewMonth = 0;
          viewYear++;
        }
        render();
      });

      header.appendChild(prev);
      header.appendChild(title);
      header.appendChild(next);
      cal.appendChild(header);

      const grid = document.createElement("div");
      grid.className = "date-picker__grid";

      DAYS.forEach((d) => {
        const el = document.createElement("div");
        el.className = "date-picker__day-name";
        el.textContent = d;
        grid.appendChild(el);
      });

      let dow = new Date(viewYear, viewMonth, 1).getDay();
      if (dow === 0) dow = 7;
      dow--;

      const prevLast = new Date(viewYear, viewMonth, 0).getDate();
      for (let i = dow - 1; i >= 0; i--) {
        const el = document.createElement("div");
        el.className = "date-picker__day date-picker__day--other-month";
        el.textContent = String(prevLast - i);
        grid.appendChild(el);
      }

      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${viewYear}-${viewMonth}-${d}`;
        const el = document.createElement("div");
        el.className = "date-picker__day";
        if (dateStr === todayStr) el.classList.add("date-picker__day--today");
        if (dateStr === selectedStr)
          el.classList.add("date-picker__day--selected");
        el.textContent = String(d);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelect(new Date(viewYear, viewMonth, d));
        });
        grid.appendChild(el);
      }

      const total = Math.ceil((dow + daysInMonth) / 7) * 7;
      for (let d = 1; d <= total - dow - daysInMonth; d++) {
        const el = document.createElement("div");
        el.className = "date-picker__day date-picker__day--other-month";
        el.textContent = String(d);
        grid.appendChild(el);
      }

      cal.appendChild(grid);
    };

    render();
    return cal;
  }

  private renderGanttFilterPopover(state: KanbanState) {
    const popover = this.appDiv.querySelector(
      "#gantt-filter-popover",
    ) as HTMLElement;
    if (!popover) return;

    popover.innerHTML = "";

    if (this.ganttFilterWithStart) {
      popover.className = "gantt-filter-popover gantt-filter-popover--double";
    } else {
      popover.className = "gantt-filter-popover";
    }

    if (!this.tempGanttFilterStartDate) {
      this.tempGanttFilterStartDate = this.ganttFilterStartDate
        ? new Date(this.ganttFilterStartDate)
        : new Date(Date.now() - 3 * 86400000);
    }
    if (!this.tempGanttFilterEndDate) {
      this.tempGanttFilterEndDate = this.ganttFilterEndDate
        ? new Date(this.ganttFilterEndDate)
        : new Date(Date.now() + 3 * 86400000);
    }

    const formatDateToInput = (d: Date | null): string => {
      if (!d) return "";
      return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
    };

    const formatTimeToInput = (d: Date | null): string => {
      if (!d) return "00:00";
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };

    const buildInputsRow = () => {
      const row = document.createElement("div");
      row.className = "gantt-filter-inputs-row";

      if (this.ganttFilterWithStart) {
        row.innerHTML = `
          <div class="gantt-filter-input-group">
            <span>с</span>
            <input type="text" id="gantt-val-date-from" class="gantt-filter-field" value="${formatDateToInput(this.tempGanttFilterStartDate)}" readonly>
            ${this.ganttFilterWithTime ? `<input type="text" class="gantt-filter-field gantt-filter-field--time" value="${formatTimeToInput(this.tempGanttFilterStartDate)}" readonly>` : ""}
          </div>
          <div class="gantt-filter-input-group">
            <span>до</span>
            <input type="text" id="gantt-val-date-to" class="gantt-filter-field" value="${formatDateToInput(this.tempGanttFilterEndDate)}" readonly>
            ${this.ganttFilterWithTime ? `<input type="text" class="gantt-filter-field gantt-filter-field--time" value="${formatTimeToInput(this.tempGanttFilterEndDate)}" readonly>` : ""}
          </div>
        `;
      } else {
        row.innerHTML = `
          <div class="gantt-filter-input-group">
            <input type="text" id="gantt-val-date-to" class="gantt-filter-field" value="${formatDateToInput(this.tempGanttFilterEndDate)}" readonly>
            ${this.ganttFilterWithTime ? `<input type="text" class="gantt-filter-field gantt-filter-field--time" value="${formatTimeToInput(this.tempGanttFilterEndDate)}" readonly>` : ""}
          </div>
        `;
      }
      return row;
    };

    popover.appendChild(buildInputsRow());

    const calendarsContainer = document.createElement("div");
    calendarsContainer.className = "gantt-filter-calendars";

    if (this.ganttFilterWithStart) {
      const calFrom = this.buildFilterCalendar(
        this.tempGanttFilterStartDate,
        (d) => {
          this.tempGanttFilterStartDate = d;
          if (this.tempGanttFilterEndDate && d > this.tempGanttFilterEndDate) {
            this.tempGanttFilterEndDate = new Date(d);
          }
          refreshPopover();
        },
      );
      calendarsContainer.appendChild(calFrom);
    }

    const calTo = this.buildFilterCalendar(this.tempGanttFilterEndDate, (d) => {
      this.tempGanttFilterEndDate = d;
      if (this.tempGanttFilterStartDate && d < this.tempGanttFilterStartDate) {
        this.tempGanttFilterStartDate = new Date(d);
      }
      refreshPopover();
    });
    calendarsContainer.appendChild(calTo);

    popover.appendChild(calendarsContainer);

    const togglesContainer = document.createElement("div");
    togglesContainer.className = "gantt-filter-toggles";

    togglesContainer.innerHTML = `
      <div class="gantt-filter-toggle-item">
        <span>Добавить время</span>
        <label class="toggle">
          <input type="checkbox" id="gantt-toggle-time" ${this.ganttFilterWithTime ? "checked" : ""}>
          <span class="slider"></span>
        </label>
      </div>
      <div class="gantt-filter-toggle-item">
        <span>Добавить дату начала</span>
        <label class="toggle">
          <input type="checkbox" id="gantt-toggle-start" ${this.ganttFilterWithStart ? "checked" : ""}>
          <span class="slider"></span>
        </label>
      </div>
    `;

    popover.appendChild(togglesContainer);

    const actionsContainer = document.createElement("div");
    actionsContainer.className = "gantt-filter-actions";

    const btnReset = document.createElement("button");
    btnReset.className = "gantt-filter-btn gantt-filter-btn--cancel";
    btnReset.textContent = "Сбросить";
    btnReset.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.ganttFilterEnabled = false;
      this.ganttFilterStartDate = null;
      this.ganttFilterEndDate = null;
      this.tempGanttFilterStartDate = null;
      this.tempGanttFilterEndDate = null;
      popover.classList.add("hidden");
      const label = this.appDiv.querySelector(
        "#gantt-filter-label",
      ) as HTMLElement;
      if (label) label.textContent = "Период: Все";
      this.renderGanttChart(state);
    });

    const btnApply = document.createElement("button");
    btnApply.className = "gantt-filter-btn gantt-filter-btn--apply";
    btnApply.textContent = "Применить";
    btnApply.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.ganttFilterEnabled = true;
      this.ganttFilterStartDate = this.ganttFilterWithStart
        ? this.tempGanttFilterStartDate
        : null;
      this.ganttFilterEndDate = this.tempGanttFilterEndDate;

      popover.classList.add("hidden");
      const label = this.appDiv.querySelector(
        "#gantt-filter-label",
      ) as HTMLElement;
      if (label) {
        if (this.ganttFilterWithStart) {
          label.textContent = `Период: ${formatDateToInput(this.tempGanttFilterStartDate)} - ${formatDateToInput(this.tempGanttFilterEndDate)}`;
        } else {
          label.textContent = `День: ${formatDateToInput(this.tempGanttFilterEndDate)}`;
        }
      }
      this.renderGanttChart(state);
    });

    actionsContainer.appendChild(btnReset);
    actionsContainer.appendChild(btnApply);
    popover.appendChild(actionsContainer);

    popover
      .querySelector("#gantt-toggle-time")
      ?.addEventListener("change", (ev) => {
        this.ganttFilterWithTime = (ev.target as HTMLInputElement).checked;
        refreshPopover();
      });

    popover
      .querySelector("#gantt-toggle-start")
      ?.addEventListener("change", (ev) => {
        this.ganttFilterWithStart = (ev.target as HTMLInputElement).checked;
        refreshPopover();
      });

    const refreshPopover = () => {
      this.renderGanttFilterPopover(state);
    };
  }

  private renderGanttChart(state: KanbanState) {
    const container = this.appDiv.querySelector(
      "#gantt-chart-container",
    ) as HTMLElement;
    if (!container) return;

    container.innerHTML = "";

    const flatItems: any[] = [];
    const parseDate = (dateStr: string | null): Date | null => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    };

    const filterActive = this.ganttFilterEnabled;
    let tStart = 0;
    let tEnd = 0;

    if (filterActive) {
      if (this.ganttFilterStartDate) {
        tStart = this.ganttFilterStartDate.getTime();
        tEnd = this.ganttFilterEndDate
          ? this.ganttFilterEndDate.getTime()
          : Infinity;
      } else if (this.ganttFilterEndDate) {
        const dayStart = new Date(this.ganttFilterEndDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(this.ganttFilterEndDate);
        dayEnd.setHours(23, 59, 59, 999);
        tStart = dayStart.getTime();
        tEnd = dayEnd.getTime();
      }
    }

    const isViewer = state.myRole === "viewer";

    state.sections.forEach((sec) => {
      const matchingTasks: any[] = [];

      sec.tasks.forEach((task) => {
        const rawStart = parseDate((task as any).start);
        const rawEnd = parseDate((task as any).deadline);

        const end = rawEnd || rawStart || new Date();
        const start = rawStart || new Date(end.getTime() - 4 * 86400000);

        const taskOverlaps =
          !filterActive || (start.getTime() < tEnd && end.getTime() > tStart);

        if (taskOverlaps) {
          matchingTasks.push({
            type: "task",
            id: task.id,
            sectionId: sec.id,
            name: task.title,
            start,
            end,
            due_date: task.due_date,
            is_done: (task as any).is_done === true,
            isExpanded: false,
            subtasks: [],
            subsRenderList: [],
          });
        }
      });

      if (!filterActive || matchingTasks.length > 0) {
        flatItems.push({
          type: "section",
          id: sec.id,
          name: sec.section_name,
          color: sec.color,
          isExpanded: !this.collapsedSections.has(sec.id),
        });

        if (!this.collapsedSections.has(sec.id)) {
          matchingTasks.forEach((task) => {
            flatItems.push(task);
          });
        }
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

    let timelineStart = minTime - 3 * 86400000;
    let timelineEnd = maxTime + 3 * 86400000;

    if (this.ganttFilterEnabled) {
      if (this.ganttFilterStartDate) {
        timelineStart = this.ganttFilterStartDate.getTime();
        timelineEnd = this.ganttFilterEndDate?.getTime() || Infinity;
      } else if (this.ganttFilterEndDate) {
        timelineStart = this.ganttFilterEndDate.getTime() - 2 * 86400000;
        timelineEnd = this.ganttFilterEndDate.getTime() + 2 * 86400000;
      }
    }

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
          <div class="gantt-chart__timeline-header">
            <div class="gantt-chart__months-row"></div>
            <div class="gantt-chart__days-row"></div>
          </div>
          <div class="gantt-chart__grid-body"></div>
        </div>
      `;

    const leftList = container.querySelector(
      ".gantt-chart__list",
    ) as HTMLElement;
    const monthsRow = container.querySelector(
      ".gantt-chart__months-row",
    ) as HTMLElement;
    const daysRow = container.querySelector(
      ".gantt-chart__days-row",
    ) as HTMLElement;
    const gridBody = container.querySelector(
      ".gantt-chart__grid-body",
    ) as HTMLElement;

    const monthNames = [
      "Январь",
      "Февраль",
      "Март",
      "Апрель",
      "Май",
      "Июнь",
      "Июль",
      "Август",
      "Сентябрь",
      "Октябрь",
      "Ноябрь",
      "Декабрь",
    ];
    const cellWidth = 60;

    monthsRow.style.width = `${totalDays * cellWidth}px`;
    daysRow.style.width = `${totalDays * cellWidth}px`;
    gridBody.style.width = `${totalDays * cellWidth}px`;

    let currentMonthKey = "";
    let currentMonthWidth = 0;
    let currentMonthLabel = "";

    for (let d = 0; d < totalDays; d++) {
      const date = new Date(timelineStart + d * 86400000);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

      if (monthKey !== currentMonthKey) {
        if (currentMonthWidth > 0) {
          const mCell = document.createElement("div");
          mCell.className = "gantt-chart__month-cell";
          mCell.style.width = `${currentMonthWidth}px`;
          mCell.textContent = currentMonthLabel;
          monthsRow.appendChild(mCell);
        }
        currentMonthKey = monthKey;
        currentMonthWidth = cellWidth;
        currentMonthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      } else {
        currentMonthWidth += cellWidth;
      }

      const dayCell = document.createElement("div");
      dayCell.className = "gantt-chart__timeline-cell";
      dayCell.style.width = `${cellWidth}px`;
      dayCell.textContent = `${date.getDate()}`;
      dayCell.title = `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      daysRow.appendChild(dayCell);
    }

    if (currentMonthWidth > 0) {
      const mCell = document.createElement("div");
      mCell.className = "gantt-chart__month-cell";
      mCell.style.width = `${currentMonthWidth}px`;
      mCell.textContent = currentMonthLabel;
      monthsRow.appendChild(mCell);
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
        const isTaskDone = item.is_done === true;
        if (isTaskDone) {
          leftRow.classList.add("gantt-chart__row--done");
        }

        iconHtml = isViewer
          ? ""
          : `
            <button class="kanban-card__status-checkmark gantt-chart__task-status-btn ${isTaskDone ? "kanban-card__status-checkmark--active" : ""}" title="Изменить статус задачи" type="button">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          `;
        dateRangeHtml = `<span class="gantt-chart__item-date">${formatDateRange(item.start, item.end)}</span>`;

        leftRow.addEventListener("click", (e) => {
          const target = e.target as HTMLElement;
          if (target.closest(".gantt-chart__task-status-btn")) return;

          const isDetailsBtn = target.closest(".gantt-chart__open-details-btn");
          if (isDetailsBtn) {
            e.stopPropagation();
            navigateTo(
              `/task?boardId=${state.boardId}&taskId=${item.id}&title=${encodeURIComponent(item.name)}`,
            );
          }
        });
      }

      if (item.type === "task") {
        const isTaskDone = item.is_done === true;
        leftRow.innerHTML = `
            <div class="gantt-chart__item-title">
              ${iconHtml}
              <span class="${isTaskDone ? "kanban-card__title--done" : ""}">${item.name}</span>
            </div>
            <button class="gantt-chart__open-details-btn" title="Открыть карточку">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </button>
            ${dateRangeHtml}
          `;

        const statusBtn = leftRow.querySelector(
          ".gantt-chart__task-status-btn",
        );
        statusBtn?.addEventListener("click", async (ev) => {
          ev.stopPropagation();
          if (isViewer) return;
          const nextDone = !isTaskDone;
          try {
            await kanbanApi.updateTaskStatus(item.id, { done: nextDone });
            await KanbanActions.fetchKanban(state.boardId!, true);
          } catch {
            Toast.error("Не удалось обновить статус задачи");
          }
        });
      } else {
        leftRow.innerHTML = `
            <div class="gantt-chart__item-title">
              ${iconHtml}
              <span>${item.name}</span>
            </div>
            ${dateRangeHtml}
          `;
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

        const isTaskDone = item.is_done === true;
        const barColorClass = isTaskDone
          ? "gantt-chart__bar--purple"
          : "gantt-chart__bar--white";

        const bar = document.createElement("div");
        bar.className = `gantt-chart__bar ${barColorClass}`;
        if (isTaskDone) {
          bar.classList.add("gantt-chart__bar--done");
        }
        bar.style.left = `${offsetLeft}%`;
        bar.style.width = `${barWidth}%`;

        bar.style.cursor = isTaskDone ? "default" : "grab";
        bar.title = `${item.name}: ${formatDateRange(item.start, item.end)}`;

        if (!isTaskDone && !isViewer) {
          const leftHandle = document.createElement("div");
          leftHandle.className =
            "gantt-chart__bar-handle gantt-chart__bar-handle--left";
          leftHandle.title = "Изменить дату начала";

          const rightHandle = document.createElement("div");
          rightHandle.className =
            "gantt-chart__bar-handle gantt-chart__bar-handle--right";
          rightHandle.title = "Изменить дедлайн";

          bar.appendChild(leftHandle);
          bar.appendChild(rightHandle);

          const msPerPixel = 86400000 / cellWidth;

          leftHandle.addEventListener("mousedown", (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const startX = e.clientX;
            const originalLeftPercent = parseFloat(bar.style.left);
            const originalWidthPercent = parseFloat(bar.style.width);
            const parentWidth = (
              bar.parentElement as HTMLElement
            ).getBoundingClientRect().width;

            document.body.style.cursor = "ew-resize";

            const onMouseMove = (moveEv: MouseEvent) => {
              const deltaX = moveEv.clientX - startX;
              const deltaPercent = (deltaX / parentWidth) * 100;

              let newLeft = originalLeftPercent + deltaPercent;
              let newWidth = originalWidthPercent - deltaPercent;

              const minWidthPercent = (cellWidth / parentWidth) * 100;

              if (newLeft < 0) {
                newLeft = 0;
                newWidth = originalLeftPercent + originalWidthPercent;
              }
              if (newWidth < minWidthPercent) {
                newWidth = minWidthPercent;
                newLeft =
                  originalLeftPercent + originalWidthPercent - minWidthPercent;
              }

              bar.style.left = `${newLeft}%`;
              bar.style.width = `${newWidth}%`;
            };

            const onMouseUp = async (upEv: MouseEvent) => {
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);
              document.body.style.cursor = "";

              const deltaX = upEv.clientX - startX;
              const deltaTimeMs = deltaX * msPerPixel;

              let newStartTime = item.start.getTime() + deltaTimeMs;
              if (newStartTime >= item.end.getTime()) {
                newStartTime = item.end.getTime() - 86400000;
              }

              try {
                await kanbanApi.updateTaskTimeline(item.id, {
                  start: new Date(newStartTime).toISOString(),
                  deadline: item.end.toISOString(),
                });
                Toast.success(`Дата начала задачи "${item.name}" обновлена`);
                await KanbanActions.fetchKanban(state.boardId!, true);
              } catch {
                Toast.error("Не удалось изменить дату начала");
                this.renderGanttChart(state);
              }
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
          });

          rightHandle.addEventListener("mousedown", (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const startX = e.clientX;
            const originalLeftPercent = parseFloat(bar.style.left);
            const originalWidthPercent = parseFloat(bar.style.width);
            const parentWidth = (
              bar.parentElement as HTMLElement
            ).getBoundingClientRect().width;

            document.body.style.cursor = "ew-resize";

            const onMouseMove = (moveEv: MouseEvent) => {
              const deltaX = moveEv.clientX - startX;
              const deltaPercent = (deltaX / parentWidth) * 100;

              let newWidth = originalWidthPercent + deltaPercent;
              const minWidthPercent = (cellWidth / parentWidth) * 100;

              if (newWidth < minWidthPercent) {
                newWidth = minWidthPercent;
              }
              if (originalLeftPercent + newWidth > 100) {
                newWidth = 100 - originalLeftPercent;
              }

              bar.style.width = `${newWidth}%`;
            };

            const onMouseUp = async (upEv: MouseEvent) => {
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);
              document.body.style.cursor = "";

              const deltaX = upEv.clientX - startX;
              const deltaTimeMs = deltaX * msPerPixel;

              let newEndTime = item.end.getTime() + deltaTimeMs;
              if (newEndTime <= item.start.getTime()) {
                newEndTime = item.start.getTime() + 86400000;
              }

              try {
                await kanbanApi.updateTaskTimeline(item.id, {
                  start: item.start.toISOString(),
                  deadline: new Date(newEndTime).toISOString(),
                });
                Toast.success(`Дедлайн задачи "${item.name}" обновлен`);
                await KanbanActions.fetchKanban(state.boardId!, true);
              } catch {
                Toast.error("Не удалось изменить дедлайн");
                this.renderGanttChart(state);
              }
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
          });

          bar.addEventListener("mousedown", (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const startX = e.clientX;
            const originalLeftPercent = parseFloat(bar.style.left);
            const parentWidth = (
              bar.parentElement as HTMLElement
            ).getBoundingClientRect().width;
            const msPerPixel = 86400000 / cellWidth;

            bar.style.cursor = "grabbing";

            const onMouseMove = (moveEv: MouseEvent) => {
              const deltaX = moveEv.clientX - startX;
              const deltaPercent = (deltaX / parentWidth) * 100;
              let newLeft = originalLeftPercent + deltaPercent;

              if (newLeft < 0) newLeft = 0;
              if (newLeft + barWidth > 100) newLeft = 100 - barWidth;

              bar.style.left = `${newLeft}%`;
            };

            const onMouseUp = async (upEv: MouseEvent) => {
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);
              bar.style.cursor = "grab";

              const deltaX = upEv.clientX - startX;
              const deltaTimeMs = deltaX * msPerPixel;

              const newStartTime = item.start.getTime() + deltaTimeMs;
              const newEndTime = item.end.getTime() + deltaTimeMs;

              const newStart = new Date(newStartTime);
              const newEnd = new Date(newEndTime);

              try {
                await kanbanApi.updateTaskTimeline(item.id, {
                  start: newStart.toISOString(),
                  deadline: newEnd.toISOString(),
                });
                Toast.success(`Период задачи "${item.name}" обновлен`);
                await KanbanActions.fetchKanban(state.boardId!, true);
              } catch {
                Toast.error("Не удалось обновить отрезок задачи");
                this.renderGanttChart(state);
              }
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
          });
        }

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
      this.appDiv
        .querySelector("#gantt-filter-popover")
        ?.classList.add("hidden");
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

        const newInviteModal = inviteModal.cloneNode(true) as HTMLElement;
        inviteModal.replaceWith(newInviteModal);

        newInviteModal.classList.remove("hidden");

        const linkInput = newInviteModal.querySelector(
          "#invite-link-input",
        ) as HTMLInputElement;
        const emailInput = newInviteModal.querySelector(
          "#invite-email-input",
        ) as HTMLInputElement;
        const confirmBtn = newInviteModal.querySelector(
          "#btn-confirm-invite",
        ) as HTMLButtonElement;
        const roleBtn = newInviteModal.querySelector(
          "#invite-role-btn",
        ) as HTMLButtonElement;
        const roleText = newInviteModal.querySelector(
          "#invite-role-text",
        ) as HTMLElement;
        const roleDropdown = newInviteModal.querySelector(
          "#invite-role-dropdown",
        ) as HTMLElement;
        const roleContainer = newInviteModal.querySelector(
          "#invite-role-select-container",
        ) as HTMLElement;

        const tabMember = newInviteModal.querySelector(
          "#tab-invite-member",
        ) as HTMLButtonElement;
        const tabGuest = newInviteModal.querySelector(
          "#tab-invite-guest",
        ) as HTMLButtonElement;
        const copyBtn = newInviteModal.querySelector(
          "#btn-copy-invite-link",
        ) as HTMLButtonElement;

        if (linkInput) linkInput.value = "Загрузка ссылки...";
        if (copyBtn) copyBtn.disabled = true;
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
            if (copyBtn) copyBtn.disabled = false;
          } catch {
            if (linkInput) linkInput.value = "Нет прав";
            if (copyBtn) copyBtn.disabled = true;
          }
        };

        generateLink(currentRole);

        let cachedMembers: any[] = [];
        let myEmail = "";

        const renderMembersList = (filter = "") => {
          const listContainer = newInviteModal.querySelector(
            "#invite-members-list",
          );
          if (!listContainer) return;

          const filtered = cachedMembers.filter((m) => {
            const name = (m.display_name || "").toLowerCase();
            const email = (m.email || "").toLowerCase();
            const term = filter.toLowerCase().trim();
            return name.includes(term) || email.includes(term);
          });

          listContainer.innerHTML = "";

          if (filtered.length === 0) {
            listContainer.innerHTML = `<div style="text-align: center; color: #666; padding: 1.5rem; font-size: 0.9rem;">Ничего не найдено</div>`;
            return;
          }

          const myMember = cachedMembers.find(
            (m) => m.email.toLowerCase().trim() === myEmail,
          );
          const myRole = myMember?.role || "";

          const canManage =
            myRole === "admin" || myRole === "owner" || myRole === "creator";

          const roleLabels: Record<string, string> = {
            admin: "Админ",
            editor: "Участник",
            viewer: "Гость",
            owner: "Владелец",
            creator: "Владелец",
          };

          filtered.forEach((m) => {
            const item = document.createElement("div");
            item.className = "invite-modal__member-item";

            const avatarHtml = m.avatar_url
              ? `<img src="${m.avatar_url}" class="invite-modal__member-avatar" alt="Avatar">`
              : `<div class="invite-modal__member-avatar-fallback">${(m.display_name || "U").charAt(0).toUpperCase()}</div>`;

            const isSelf = m.email.toLowerCase().trim() === myEmail;
            const isOwner = m.role === "owner" || m.role === "creator";

            const canDeleteThisMember = canManage && !isSelf && !isOwner;
            const canEditThisMemberRole = canManage && !isSelf && !isOwner;

            const roleLabel = roleLabels[m.role] || m.role || "Участник";

            const roleSelectorHtml = canEditThisMemberRole
              ? `
              <div class="invite-modal__member-role-dropdown-container">
                <button type="button" class="invite-modal__member-role-trigger">
                  <span class="invite-modal__member-role-text">${roleLabel}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>`
              : `<span class="invite-modal__member-role-static">${roleLabel}</span>`;

            const deleteButtonHtml = canDeleteThisMember
              ? `
              <button class="invite-modal__member-delete-btn" title="Удалить участника">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>`
              : "";

            item.innerHTML = `
              <div class="invite-modal__member-left">
                ${avatarHtml}
                <div class="invite-modal__member-info">
                  <span class="invite-modal__member-name" title="${m.display_name || "Без имени"}">${m.display_name || "Без имени"}</span>
                  <span class="invite-modal__member-email" title="${m.email}">${m.email}</span>
                </div>
              </div>
              <div class="invite-modal__member-right">
                ${roleSelectorHtml}
                ${deleteButtonHtml}
              </div>
            `;

            if (canEditThisMemberRole) {
              const trigger = item.querySelector(
                ".invite-modal__member-role-trigger",
              ) as HTMLButtonElement;

              trigger?.addEventListener("click", (e) => {
                e.stopPropagation();
                document
                  .querySelectorAll(".invite-modal__active-role-dropdown")
                  .forEach((el) => el.remove());

                const dropdown = document.createElement("div");
                dropdown.className =
                  "invite-modal__member-role-dropdown invite-modal__active-role-dropdown";
                dropdown.innerHTML = `
                  <div class="invite-modal__member-role-option" data-role="viewer">Гость</div>
                  <div class="invite-modal__member-role-option" data-role="editor">Участник</div>
                  <div class="invite-modal__member-role-option" data-role="admin">Админ</div>
                `;

                const rect = trigger.getBoundingClientRect();
                dropdown.style.position = "fixed";
                dropdown.style.top = `${rect.bottom + 4}px`;
                dropdown.style.left = `${rect.left}px`;
                dropdown.style.width = `${rect.width}px`;
                dropdown.style.zIndex = "10005";

                document.body.appendChild(dropdown);

                const options = dropdown.querySelectorAll(
                  ".invite-modal__member-role-option",
                );
                options.forEach((opt) => {
                  opt.addEventListener("click", async (ev) => {
                    ev.stopPropagation();
                    const nextRole = opt.getAttribute("data-role") || "editor";
                    dropdown.remove();

                    try {
                      await boardsApi.updateMemberRole(state.boardId!, m.link, {
                        new_role: nextRole,
                      });
                      Toast.success("Роль участника обновлена");
                      m.role = nextRole;
                      renderMembersList(searchInput?.value.trim() || "");
                      KanbanActions.fetchKanban(state.boardId!, true);
                    } catch (err: any) {
                      const msg =
                        err?.data?.message ||
                        err?.data?.error ||
                        "Не удалось обновить роль";
                      Toast.error(msg);
                    }
                  });
                });
              });
            }

            if (canDeleteThisMember) {
              const deleteBtn = item.querySelector(
                ".invite-modal__member-delete-btn",
              ) as HTMLButtonElement;
              deleteBtn?.addEventListener("click", () => {
                showConfirmModal({
                  title: "Удалить участника",
                  text: `Вы уверены, что хотите удалить участника "${m.display_name || m.email}" с этой доски?`,
                  confirmLabel: "Удалить",
                  onConfirm: async () => {
                    try {
                      await boardsApi.removeMember(state.boardId!, m.link);
                      Toast.success("Участник удален с доски");
                      KanbanActions.fetchKanban(state.boardId!, true);

                      cachedMembers = cachedMembers.filter(
                        (member) => member.link !== m.link,
                      );
                      renderMembersList(searchInput?.value.trim() || "");
                    } catch (err: any) {
                      const msg =
                        err?.data?.message ||
                        err?.data?.error ||
                        "Не удалось удалить участника";
                      Toast.error(msg);
                    }
                  },
                });
              });
            }

            listContainer.appendChild(item);
          });
        };

        const loadMembersAndRender = async () => {
          const listContainer = newInviteModal.querySelector(
            "#invite-members-list",
          );
          if (listContainer) {
            listContainer.innerHTML = `<div style="text-align: center; color: #888; padding: 1.5rem; font-size: 0.9rem;">Загрузка участников...</div>`;
          }
          try {
            myEmail = (currentUser?.email || "").toLowerCase().trim();

            const res = await boardsApi.getBoardUsers(state.boardId!);
            cachedMembers = res.data.members;

            const activeSearchInput = newInviteModal.querySelector(
              "#invite-members-search",
            ) as HTMLInputElement;
            renderMembersList(
              activeSearchInput ? activeSearchInput.value.trim() : "",
            );
          } catch {
            if (listContainer) {
              listContainer.innerHTML = `<div style="text-align: center; color: #ff5c5c; padding: 1.5rem; font-size: 0.9rem;">Ошибка при загрузке участников</div>`;
            }
          }
        };

        const searchInput = newInviteModal.querySelector(
          "#invite-members-search",
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.value = "";
          const newSearchInput = searchInput.cloneNode(
            true,
          ) as HTMLInputElement;
          searchInput.replaceWith(newSearchInput);

          newSearchInput.addEventListener("input", (e) => {
            const target = e.target as HTMLInputElement;
            renderMembersList(target.value.trim());
          });
        }

        loadMembersAndRender();

        document.addEventListener("click", () => {
          document
            .querySelectorAll(".invite-modal__active-role-dropdown")
            .forEach((el) => el.remove());
        });

        newInviteModal
          .querySelector("#invite-members-list")
          ?.addEventListener("scroll", () => {
            document
              .querySelectorAll(".invite-modal__active-role-dropdown")
              .forEach((el) => el.remove());
          });
        newInviteModal.addEventListener("scroll", () => {
          document
            .querySelectorAll(".invite-modal__active-role-dropdown")
            .forEach((el) => el.remove());
        });

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

        newInviteModal
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

        newInviteModal
          .querySelector("#btn-cancel-invite")
          ?.addEventListener("click", closeModals);
        newInviteModal
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

    this.appDiv
      .querySelector("#btn-gantt-filter")
      ?.addEventListener("click", (e) => {
        e.stopPropagation();
        const popover = this.appDiv.querySelector(
          "#gantt-filter-popover",
        ) as HTMLElement;
        if (popover) {
          const wasHidden = popover.classList.contains("hidden");
          closeModals();
          if (wasHidden) {
            popover.classList.remove("hidden");
            this.tempGanttFilterStartDate = this.ganttFilterStartDate
              ? new Date(this.ganttFilterStartDate)
              : new Date(Date.now() - 3 * 86400000);
            this.tempGanttFilterEndDate = this.ganttFilterEndDate
              ? new Date(this.ganttFilterEndDate)
              : new Date(Date.now() + 3 * 86400000);
            this.renderGanttFilterPopover(state);
          }
        }
      });

    const filterPopover = this.appDiv.querySelector("#gantt-filter-popover");
    filterPopover?.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    if (state.boardId) {
      KanbanColumnManager.bind(this.appDiv, state, closeModals, signal);
      KanbanTaskCreation.bind(this.appDiv, state, closeModals, signal);
      KanbanContextMenus.bind(this.appDiv, state, signal);
      KanbanPoll.bind(this.appDiv, state, closeModals, signal);
      if (state.myRole !== "viewer") {
        KanbanDragAndDrop.bind(this.appDiv, state.boardId, signal);
      }
    }
  }
}
