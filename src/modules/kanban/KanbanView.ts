import Handlebars from "handlebars";
import kanbanTpl from "../../templates/kanban.hbs?raw";
import { kanbanStore } from "./KanbanStore";
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

    state.sections.forEach((sec) => {
      const matchingTasks: any[] = [];

      sec.tasks.forEach((task) => {
        const end =
          parseDueDate(task.due_date || "") ||
          new Date(Date.now() + (task.id.charCodeAt(0) % 5) * 86400000);
        const start = new Date(end.getTime() - 4 * 86400000);

        const subtasks = task.subtasks || [];
        const N = subtasks.length;
        const formattedSubs: any[] = [];

        subtasks.forEach((sub, i) => {
          const step = N > 0 ? (end.getTime() - start.getTime()) / N : 0;
          const subStart = new Date(start.getTime() + i * step);
          const subEnd = new Date(start.getTime() + (i + 1) * step);

          const overlaps =
            !filterActive ||
            (subStart.getTime() < tEnd && subEnd.getTime() > tStart);
          if (overlaps) {
            formattedSubs.push({
              type: "subtask",
              id: sub.link || (sub as any).id,
              taskId: task.id,
              name: sub.description,
              start: subStart,
              end: subEnd,
              is_done: sub.is_done,
            });
          }
        });

        const taskOverlaps =
          !filterActive || (start.getTime() < tEnd && end.getTime() > tStart);
        if (taskOverlaps || formattedSubs.length > 0) {
          matchingTasks.push({
            type: "task",
            id: task.id,
            sectionId: sec.id,
            name: task.title,
            start,
            end,
            due_date: task.due_date,
            isExpanded: !this.collapsedTasks.has(task.id),
            subtasks: task.subtasks || [],
            subsRenderList: formattedSubs,
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
            if (!this.collapsedTasks.has(task.id)) {
              task.subsRenderList.forEach((sub: any) => {
                flatItems.push(sub);
              });
            }
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

        leftRow.innerHTML = `
                  <div class="gantt-chart__item-title">
                    ${iconHtml}
                    <span>${item.name}</span>
                  </div>
                  <button class="icon-btn gantt-chart__row-edit-btn" title="Открыть задачу">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  ${dateRangeHtml}
                `;

        leftRow.addEventListener("click", (e) => {
          const target = e.target as HTMLElement;
          const isChevron = target.closest(".gantt-chart__chevron");

          if (isChevron && item.subtasks.length > 0) {
            e.stopPropagation();
            if (this.collapsedTasks.has(item.id)) {
              this.collapsedTasks.delete(item.id);
            } else {
              this.collapsedTasks.add(item.id);
            }
            this.renderGanttChart(state);
          } else {
            navigateTo(
              `/task?boardId=${state.boardId}&taskId=${item.id}&title=${encodeURIComponent(item.name)}`,
            );
          }
        });
      } else if (item.type === "subtask") {
        iconHtml = `
                <label class="custom-checkbox gantt-chart__subtask-checkbox">
                  <input type="checkbox" class="gantt-subtask-cb" data-id="${item.id}" data-task-id="${item.taskId}" data-desc="${item.name}" ${item.is_done ? "checked" : ""}>
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
        cb?.addEventListener("click", (ev) => ev.stopPropagation());
        cb?.addEventListener("change", async () => {
          const taskId = cb.getAttribute("data-task-id") || "";
          const subtaskId = item.id;
          const desc = item.name;

          kanbanStore.updateSubtaskSilently(
            taskId,
            subtaskId,
            cb.checked,
            desc,
          );

          item.is_done = cb.checked;

          this.renderGanttChart(state);

          try {
            await kanbanApi.updateSubtask(subtaskId, {
              is_done: cb.checked,
              description: desc,
            });
            KanbanActions.fetchKanban(state.boardId!, true);
          } catch {
            kanbanStore.updateSubtaskSilently(
              taskId,
              subtaskId,
              !cb.checked,
              desc,
            );
            item.is_done = !cb.checked;
            cb.checked = !cb.checked;
            this.renderGanttChart(state);
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
      KanbanDragAndDrop.bind(this.appDiv, state.boardId, signal);
    }
  }
}
