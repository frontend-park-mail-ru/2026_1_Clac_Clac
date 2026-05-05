import Handlebars from "handlebars";
import taskTpl from "../../templates/task.hbs?raw";
import { taskStore } from "./TaskStore";
import { TaskActions } from "./TaskActions";
import { navigateTo } from "../../router";
import { Toast } from "../../utils/toast";
import { clearKanbanCache } from "../../modules/kanban";
import { showConfirmModal } from "../../utils/confirmModal";

const template = Handlebars.compile(taskTpl);

export class TaskView {
  private appDiv: HTMLElement;
  private taskNode: HTMLElement | null = null;
  private currentExecuterId: string = "";
  private isFirstRender: boolean = true;
  private scrollToNewComment: boolean = false;

  private onStoreChangeBound = this.onStoreChange.bind(this);
  private onStoreSuccessBound = this.onStoreSuccess.bind(this);
  private onStoreErrorBound = this.onStoreError.bind(this);
  private globalClickHandlerBound = this.globalClickHandler.bind(this);

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
  }

  public render() {
    this.isFirstRender = true;
    taskStore.on("change", this.onStoreChangeBound);
    taskStore.on("success", this.onStoreSuccessBound);
    taskStore.on("error", this.onStoreErrorBound);
    document.addEventListener("click", this.globalClickHandlerBound);

    this.onStoreChange();
  }

  public destroy() {
    taskStore.off("change", this.onStoreChangeBound);
    taskStore.off("success", this.onStoreSuccessBound);
    taskStore.off("error", this.onStoreErrorBound);
    document.removeEventListener("click", this.globalClickHandlerBound);

    if (this.taskNode && this.appDiv.contains(this.taskNode)) {
      this.appDiv.removeChild(this.taskNode);
    }
  }

  private globalClickHandler(e: MouseEvent) {
    document.querySelector(".context-menu")?.remove();
    document.querySelector(".assignee__dropdown")?.remove();
    if (!(e.target as HTMLElement).closest(".task__comment-menu-wrap")) {
      this.taskNode?.querySelectorAll(".task__comment-dropdown").forEach(d => d.classList.add("hidden"));
    }
  }

  private onStoreChange() {
    const state = taskStore.getState();

    if (state.isLoading) {
      return;
    }

    if (state.isSaving) {
      const btnSave = this.taskNode?.querySelector("#btn-save-task") as HTMLButtonElement;
      if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = "Сохранение...";
      }
      return;
    }

    if (state.error && !state.taskData) {
      Toast.error("Ошибка при загрузке данных");
      if (state.boardId) {
        navigateTo(`/board?id=${state.boardId}`);
      } else {
        navigateTo('/boards');
      }
      return;
    }

    if (state.taskData) {
      this.renderTemplate();
      this.isFirstRender = false;
    }
  }

  private onStoreSuccess(...args: unknown[]) {
    const message = args[0] as string | undefined;

    const state = taskStore.getState();
    clearKanbanCache();
    Toast.success(message || "Операция успешна");
    navigateTo(`/board?id=${state.boardId}`);
  }

  private onStoreError() {
    const state = taskStore.getState();
    Toast.error(state.error || "Произошла ошибка");

    const btnSave = this.taskNode?.querySelector("#btn-save-task") as HTMLButtonElement;
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = "Сохранить";
    }
  }

  private renderTemplate() {
    const state = taskStore.getState();
    const taskData = state.taskData;
    const usersList = state.usersList;

    if (!taskData) return;

    const contentEl = this.taskNode?.querySelector(".task__content") as HTMLElement;
    const currentScrollTop = contentEl ? contentEl.scrollTop : 0;

    const currentSubtasks: Record<string, string> = {};
    this.taskNode?.querySelectorAll(".task__subtask-text-input").forEach((input) => {
      const id = input.getAttribute("data-id");
      if (id) {
        currentSubtasks[id] = (input as HTMLInputElement).value;
      }
    });

    const currentValues = {
      title: (this.taskNode?.querySelector("#task-title-input") as HTMLInputElement)?.value,
      desc: (this.taskNode?.querySelector("#task-desc-input") as HTMLTextAreaElement)?.value,
      date: (this.taskNode?.querySelector("#task-date-input") as HTMLInputElement)?.value,
      time: (this.taskNode?.querySelector("#task-time-input") as HTMLInputElement)?.value,
      subtask: (this.taskNode?.querySelector("#new-subtask-input") as HTMLInputElement)?.value,
      comment: (this.taskNode?.querySelector(".task__comment-input") as HTMLInputElement)?.value,
    };

    const activeEl = document.activeElement as HTMLElement;
    const activeId = activeEl?.id;
    const activeClass = activeEl?.className;
    let activeSelector = activeId ? `#${activeId}` : null;

    if (!activeSelector && activeClass && activeClass.includes('task__comment-input')) {
      activeSelector = '.task__comment-input';
    } else if (!activeSelector && activeClass && activeClass.includes('task__subtask-text-input')) {
      const id = activeEl.getAttribute('data-id');
      if (id) activeSelector = `.task__subtask-text-input[data-id="${id}"]`;
    }

    let selectionStart = 0;
    let selectionEnd = 0;
    if (activeEl && (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement)) {
      selectionStart = activeEl.selectionStart || 0;
      selectionEnd = activeEl.selectionEnd || 0;
    }

    const deadline = taskData.dead_line || taskData.data_dead_line || taskData.deadline;
    let rawDate = "";
    let rawTime = "";
    let formattedDate = "";
    let formattedTime = "";

    if (deadline) {
      const d = new Date(deadline);
      if (!isNaN(d.getTime())) {
        const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
        rawDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        rawTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        formattedDate = `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
        formattedTime = rawTime;
      }
    }

    let executorName = "Не назначен";
    let executorAvatar = "";
    let executorFallback = "";
    let currentExecuterId =
      taskData.link_executer ||
      taskData.executer_link ||
      taskData.link_executor ||
      taskData.executor_link ||
      "";

    if (currentExecuterId) {
      const found = usersList.find((u) => u.id === currentExecuterId);
      if (found) {
        executorName = found.name;
        executorAvatar = found.avatarUrl || "";
        executorFallback = found.name.charAt(0).toUpperCase();
      } else {
        executorName = "Пользователь";
        executorFallback = "U";
      }
    }

    this.currentExecuterId = currentExecuterId;

    if (!this.taskNode) {
      this.taskNode = document.createElement("div");
      this.taskNode.id = "task-overlay-container";
      this.appDiv.appendChild(this.taskNode);
    }

    const formattedSubtasks = taskData.subtasks.map((st: any) => {
      const validId = st.link || st.subtask_link || st.link_subtask || st.id || "";
      const validDesc = st.description || st.name || st.title || st.resolved_desc || "";
      return {
        ...st,
        id: validId,
        description: validDesc,
      };
    }).sort((a: any, b: any) => {
      if (a.position !== b.position) return (a.position || 0) - (b.position || 0);
      return String(a.id).localeCompare(String(b.id));
    });

    this.taskNode.innerHTML = template({
      noAnimation: !this.isFirstRender,
      board_name: state.boardName,
      task: {
        title: taskData.title || "Без названия",
        description: taskData.description || "",
        due_date: formattedDate,
        time: formattedTime,
        raw_date: rawDate,
        raw_time: rawTime,
        executor: executorName,
        executor_avatar: executorAvatar,
        executor_fallback: executorFallback,
        executor_id: this.currentExecuterId,
        subtasks: formattedSubtasks
      },
      comments: state.comments,
    });

    if (currentValues.title !== undefined) (this.taskNode.querySelector("#task-title-input") as HTMLInputElement).value = currentValues.title;
    if (currentValues.desc !== undefined) (this.taskNode.querySelector("#task-desc-input") as HTMLTextAreaElement).value = currentValues.desc;
    if (currentValues.date !== undefined) {
      (this.taskNode.querySelector("#task-date-input") as HTMLInputElement).value = currentValues.date;
      this.updateDateBtn(currentValues.date);
    }
    if (currentValues.time !== undefined) {
      (this.taskNode.querySelector("#task-time-input") as HTMLInputElement).value = currentValues.time;
      this.updateTimeBtn(currentValues.time);
    }
    if (currentValues.subtask !== undefined) (this.taskNode.querySelector("#new-subtask-input") as HTMLInputElement).value = currentValues.subtask;
    if (currentValues.comment !== undefined) (this.taskNode.querySelector(".task__comment-input") as HTMLInputElement).value = currentValues.comment;

    const newContentEl = this.taskNode?.querySelector(".task__content") as HTMLElement;
    if (this.scrollToNewComment) {
      this.scrollToNewComment = false;
      requestAnimationFrame(() => {
        if (newContentEl) newContentEl.scrollTo({ top: newContentEl.scrollHeight, behavior: "smooth" });
      });
    } else {
      if (newContentEl) newContentEl.scrollTop = currentScrollTop;
    }

    if (activeSelector) {
      const elToFocus = this.taskNode.querySelector(activeSelector) as HTMLInputElement;
      if (elToFocus) {
        elToFocus.focus();
        if (elToFocus.setSelectionRange) elToFocus.setSelectionRange(selectionStart, selectionEnd);
      }
    }

    Object.entries(currentSubtasks).forEach(([id, val]) => {
      const el = this.taskNode?.querySelector(`.task__subtask-text-input[data-id="${id}"]`) as HTMLInputElement;
      if (el) el.value = val;
    });

    this.attachListeners();
  }

  private updateDateBtn(dateVal: string) {
    const btn = this.taskNode?.querySelector("#task-date-btn") as HTMLButtonElement;
    if (!btn) return;
    if (dateVal) {
      // dateVal is YYYY-MM-DD. Parsing as T00:00:00 ensures local date.
      const d = new Date(`${dateVal}T00:00:00`);
      if (!isNaN(d.getTime())) {
        const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
        btn.textContent = `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
        return;
      }
    }
    btn.textContent = 'Не задана';
  }

  private updateTimeBtn(timeVal: string) {
    const btn = this.taskNode?.querySelector("#task-time-btn") as HTMLButtonElement;
    if (!btn) return;
    btn.textContent = timeVal || 'Не задано';
  }

  private buildDatePicker(currentDate: string, onSelect?: (dateStr: string) => void): HTMLElement {
    const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    const DAYS = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];

    const sel = currentDate ? new Date(currentDate + 'T00:00:00Z') : null;
    let viewYear = sel ? sel.getUTCFullYear() : new Date().getFullYear();
    let viewMonth = sel ? sel.getUTCMonth() : new Date().getMonth();

    const todayUtc = new Date();
    const todayStr = `${todayUtc.getFullYear()}-${String(todayUtc.getMonth()+1).padStart(2,'0')}-${String(todayUtc.getDate()).padStart(2,'0')}`;
    let selectedStr = currentDate || '';

    const picker = document.createElement('div');
    picker.className = 'date-picker';
    picker.dataset.selectedDate = selectedStr;

    const render = () => {
      picker.innerHTML = '';

      const header = document.createElement('div');
      header.className = 'date-picker__header';

      const prev = document.createElement('button');
      prev.className = 'date-picker__nav-btn';
      prev.type = 'button';
      prev.textContent = '‹';
      prev.addEventListener('click', (e) => { e.stopPropagation(); viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } render(); });

      const title = document.createElement('span');
      title.textContent = `${MONTHS[viewMonth]} ${viewYear}`;

      const next = document.createElement('button');
      next.className = 'date-picker__nav-btn';
      next.type = 'button';
      next.textContent = '›';
      next.addEventListener('click', (e) => { e.stopPropagation(); viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } render(); });

      header.appendChild(prev);
      header.appendChild(title);
      header.appendChild(next);
      picker.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'date-picker__grid';

      DAYS.forEach(d => {
        const el = document.createElement('div');
        el.className = 'date-picker__day-name';
        el.textContent = d;
        grid.appendChild(el);
      });

      let dow = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
      if (dow === 0) dow = 7;
      dow--;

      const prevLast = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
      for (let i = dow - 1; i >= 0; i--) {
        const el = document.createElement('div');
        el.className = 'date-picker__day date-picker__day--other-month';
        el.textContent = String(prevLast - i);
        grid.appendChild(el);
      }

      const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const el = document.createElement('div');
        el.className = 'date-picker__day';
        if (dateStr === todayStr) el.classList.add('date-picker__day--today');
        if (dateStr === selectedStr) el.classList.add('date-picker__day--selected');
        el.textContent = String(d);
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          selectedStr = dateStr;
          picker.dataset.selectedDate = dateStr;
          render();
          if (onSelect) onSelect(dateStr);
        });
        grid.appendChild(el);
      }

      const total = Math.ceil((dow + daysInMonth) / 7) * 7;
      for (let d = 1; d <= total - dow - daysInMonth; d++) {
        const el = document.createElement('div');
        el.className = 'date-picker__day date-picker__day--other-month';
        el.textContent = String(d);
        grid.appendChild(el);
      }

      picker.appendChild(grid);
    };

    render();
    return picker;
  }

  private buildTimePicker(currentTime: string): HTMLElement {
    const [h, m] = currentTime ? currentTime.split(':').map(Number) : [0, 0];
    const picker = document.createElement('div');
    picker.className = 'time-picker';

    const updateSelectedByScroll = (scroll: HTMLElement) => {
      const scrollRect = scroll.getBoundingClientRect();
      const center = scrollRect.top + scrollRect.height / 2;
      let closest: HTMLElement | null = null;
      let minDist = Infinity;
      scroll.querySelectorAll<HTMLElement>('.time-picker__num').forEach((el) => {
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - center);
        if (dist < minDist) { minDist = dist; closest = el; }
      });
      scroll.querySelectorAll('.time-picker__num').forEach(el => el.classList.remove('time-picker__num--selected'));
      (closest as HTMLElement | null)?.classList.add('time-picker__num--selected');
    };

    const createCol = (label: string, count: number, selected: number) => {
      const col = document.createElement('div');
      col.className = 'time-picker__col';
      const labelEl = document.createElement('div');
      labelEl.className = 'time-picker__col-label';
      labelEl.textContent = label;
      col.appendChild(labelEl);
      const scroll = document.createElement('div');
      scroll.className = 'time-picker__scroll';
      for (let i = 0; i < count; i++) {
        const num = document.createElement('div');
        num.className = 'time-picker__num' + (i === selected ? ' time-picker__num--selected' : '');
        num.textContent = String(i).padStart(2, '0');
        num.dataset.value = String(i);
        num.addEventListener('click', () => {
          scroll.querySelectorAll('.time-picker__num').forEach(el => el.classList.remove('time-picker__num--selected'));
          num.classList.add('time-picker__num--selected');
          num.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
        scroll.appendChild(num);
      }
      let scrollTimer: ReturnType<typeof setTimeout>;
      scroll.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => updateSelectedByScroll(scroll), 200);
      });
      col.appendChild(scroll);
      return { col, scroll };
    };

    const { col: hourCol, scroll: hourScroll } = createCol('Часы', 24, h);
    const { col: minCol, scroll: minScroll } = createCol('Минуты', 60, m);
    picker.appendChild(hourCol);
    picker.appendChild(minCol);

    setTimeout(() => {
      hourScroll.querySelector('.time-picker__num--selected')?.scrollIntoView({ block: 'center' });
      minScroll.querySelector('.time-picker__num--selected')?.scrollIntoView({ block: 'center' });
    }, 0);

    return picker;
  }

  private attachListeners() {
    const state = taskStore.getState();

    this.taskNode?.querySelector("#btn-save-task")?.addEventListener("click", () => {
      const title = (this.taskNode?.querySelector("#task-title-input") as HTMLInputElement).value.trim();
      const description = (this.taskNode?.querySelector("#task-desc-input") as HTMLTextAreaElement).value.trim();
      const dateVal = (this.taskNode?.querySelector("#task-date-input") as HTMLInputElement).value;
      const timeVal = (this.taskNode?.querySelector("#task-time-input") as HTMLInputElement).value;

      let finalDeadline = state.taskData.dead_line || state.taskData.data_dead_line || state.taskData.deadline;
      if (dateVal) {
        const d = new Date(`${dateVal}T${timeVal || "00:00"}`);
        finalDeadline = d.toISOString();
      }

      const payload = {
        link_card: state.taskId,
        title: title || "Без названия",
        description: description,
        executor_link: this.currentExecuterId || null,
        deadline: finalDeadline,
        max_tasks: state.taskData?.max_tasks || 100,
      };

      if (state.taskId) {
        TaskActions.saveTask(state.taskId, payload);
      }
    });

    const dateInput = this.taskNode?.querySelector("#task-date-input") as HTMLInputElement;
    const dateBtn = this.taskNode?.querySelector("#task-date-btn") as HTMLButtonElement;
    dateBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const existing = this.taskNode?.querySelector(".date-picker");
      if (existing) { existing.remove(); return; }

      const timeInput = this.taskNode?.querySelector("#task-time-input") as HTMLInputElement;

      const picker = this.buildDatePicker(dateInput.value, (dateStr) => {
        dateInput.value = dateStr;
        this.updateDateBtn(dateStr);

        if (!timeInput.value) {
          const now = new Date();
          const target = new Date(
            parseInt(dateStr.split('-')[0]),
            parseInt(dateStr.split('-')[1]) - 1,
            parseInt(dateStr.split('-')[2]),
            now.getHours() + 1,
            now.getMinutes()
          );

          const finalDate = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
          const finalTime = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`;

          dateInput.value = finalDate;
          this.updateDateBtn(finalDate);
          timeInput.value = finalTime;
          this.updateTimeBtn(finalTime);
        }

        picker.remove();
        cleanup();
      });
      picker.addEventListener("click", (ev) => ev.stopPropagation());
      dateBtn.parentElement?.appendChild(picker);

      const cleanup = () => {
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("click", onOutside);
      };
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === "Enter") {
          const dateStr = picker.dataset.selectedDate;
          if (dateStr) {
            dateInput.value = dateStr;
            this.updateDateBtn(dateStr);
          }
          picker.remove();
          cleanup();
        } else if (ev.key === "Escape") {
          picker.remove();
          cleanup();
        }
      };
      const onOutside = () => { picker.remove(); cleanup(); };
      setTimeout(() => {
        document.addEventListener("keydown", onKey);
        document.addEventListener("click", onOutside);
      }, 0);
    });

    const commitTimePicker = (picker: Element, timeInput: HTMLInputElement) => {
      const sel = picker.querySelectorAll(".time-picker__num--selected");
      const h = (sel[0] as HTMLElement)?.dataset.value ?? "0";
      const m = (sel[1] as HTMLElement)?.dataset.value ?? "0";
      const val = `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
      timeInput.value = val;
      this.updateTimeBtn(val);

      if (!dateInput.value) {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        dateInput.value = todayStr;
        this.updateDateBtn(todayStr);
      }

      picker.remove();
    };

    const timeBtn = this.taskNode?.querySelector("#task-time-btn") as HTMLButtonElement;
    timeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const timeInput = this.taskNode?.querySelector("#task-time-input") as HTMLInputElement;
      const existing = this.taskNode?.querySelector(".time-picker");
      if (existing) {
        commitTimePicker(existing, timeInput);
        return;
      }
      const picker = this.buildTimePicker(timeInput.value);
      picker.addEventListener("click", (ev) => ev.stopPropagation());
      timeBtn.parentElement?.appendChild(picker);

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          commitTimePicker(picker, timeInput);
          document.removeEventListener("keydown", onKey);
          document.removeEventListener("click", onOutside);
        }
      };
      const onOutside = () => {
        commitTimePicker(picker, timeInput);
        document.removeEventListener("click", onOutside);
        document.removeEventListener("keydown", onKey);
      };
      setTimeout(() => {
        document.addEventListener("click", onOutside);
        document.addEventListener("keydown", onKey);
      }, 0);
    });

    const saveBtn = this.taskNode?.querySelector("#btn-save-task") as HTMLButtonElement;
    const titleInput = this.taskNode?.querySelector("#task-title-input") as HTMLInputElement;
    if (saveBtn && titleInput) {
      saveBtn.disabled = !titleInput.value.trim();
      titleInput.addEventListener("input", () => {
        saveBtn.disabled = !titleInput.value.trim();
      });
    }

    this.taskNode?.querySelector("#btn-back")?.addEventListener("click", () => {
      navigateTo(`/board?id=${state.boardId}`);
    });

    this.taskNode?.querySelector("#task-overlay")?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        navigateTo(`/board?id=${state.boardId}`);
      }
    });

    const execBtn = this.taskNode?.querySelector("#task-executor-btn") as HTMLButtonElement;
    execBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.taskNode?.querySelectorAll(".assignee__dropdown").forEach((dd) => dd.remove());

      const dropdown = document.createElement("div");
      dropdown.className = "assignee__dropdown";

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
            execBtn.innerHTML = `Не назначен`;
            this.currentExecuterId = "";
            dropdown.remove();
          });
          listContainer.appendChild(clearItem);
        }

        state.usersList.filter(u => u.name.toLowerCase().includes(filter.toLowerCase())).forEach((user) => {
          const item = document.createElement("div");
          item.className = "assignee__dropdown-item";
          item.innerHTML = `
            ${user.avatarUrl ? `<img src="${user.avatarUrl}" class="assignee__avatar assignee__avatar--img">` : `<div class="assignee__avatar">${user.name.charAt(0).toUpperCase()}</div>`}
            <div class="assignee__info">
              <span class="assignee__name">${user.name}</span>
              <span class="assignee__email">${user.email}</span>
            </div>
          `;
          item.addEventListener("click", () => {
            execBtn.innerHTML = `
              ${user.avatarUrl ? `<img src="${user.avatarUrl}" class="assignee__avatar-small">` : `<div class="assignee__avatar-fallback-small">${user.name.charAt(0).toUpperCase()}</div>`}
              ${user.name}
            `;
            this.currentExecuterId = user.id;
            dropdown.remove();
          });
          listContainer.appendChild(item);
        });
      };

      renderList();
      searchInput.addEventListener("input", (e) => renderList((e.target as HTMLInputElement).value));

      if (!execBtn.parentElement) return;
      execBtn.parentElement.appendChild(dropdown);
      searchInput.focus();
    });

    const optionsBtn = this.taskNode?.querySelector("#btn-task-options");
    optionsBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelector(".context-menu")?.remove();

      const menu = document.createElement("div");
      menu.className = "context-menu";
      menu.innerHTML = `<div class="context-menu__item context-menu__item--danger" id="ctx-delete-task">Удалить карточку</div>`;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
      menu.style.left = `${rect.left + window.scrollX - 150}px`;

      document.body.appendChild(menu);

      menu.querySelector("#ctx-delete-task")?.addEventListener("click", () => {
        const modalOverlay = this.taskNode?.querySelector("#modal-overlay") as HTMLElement;
        const modalDelete = this.taskNode?.querySelector("#modal-delete-task") as HTMLElement;
        const titleInput = this.taskNode?.querySelector("#task-title-input") as HTMLInputElement;

        (this.taskNode?.querySelector("#delete-task-name") as HTMLElement).textContent = titleInput.value;

        modalOverlay.classList.remove("hidden");
        modalDelete.classList.remove("hidden");

        (this.taskNode?.querySelector("#btn-confirm-delete-task") as HTMLElement).onclick = () => {
          if (state.taskId) {
            TaskActions.deleteTask(state.taskId);
          }
        };
        menu.remove();
      });
    });

    this.taskNode?.querySelectorAll(".modal__close-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        this.taskNode?.querySelector("#modal-overlay")?.classList.add("hidden");
        this.taskNode?.querySelector("#modal-delete-task")?.classList.add("hidden");
      }),
    );

    const commentInput = this.taskNode?.querySelector(".task__comment-input") as HTMLInputElement;
    const commentBtn = this.taskNode?.querySelector(".task__comment-send-btn") as HTMLButtonElement;

    const submitComment = () => {
      const text = commentInput?.value.trim();
      if (text && state.taskId) {
        this.scrollToNewComment = true;
        commentInput.value = "";
        TaskActions.addComment(state.taskId, text);
      }
    };

    commentBtn?.addEventListener("click", submitComment);
    commentInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitComment();
      }
    });

    const subtaskInput = this.taskNode?.querySelector("#new-subtask-input") as HTMLInputElement;
    const subtaskAddBtn = this.taskNode?.querySelector("#subtask-add-btn") as HTMLButtonElement;

    const submitSubtask = () => {
      const desc = subtaskInput.value.trim();
      if (desc && state.taskId) {
        subtaskInput.value = "";
        TaskActions.createSubtask(state.taskId, desc);
      }
    };

    subtaskAddBtn?.addEventListener("click", submitSubtask);
    subtaskInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitSubtask();
      }
    });

    this.taskNode?.querySelectorAll(".subtask-checkbox").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        const id = target.getAttribute("data-id");
        const desc = target.getAttribute("data-desc");

        const textInput = target.parentElement?.querySelector(".task__subtask-text-input");
        if (target.checked) {
          textInput?.classList.add("task__subtask-text-input--done");
        } else {
          textInput?.classList.remove("task__subtask-text-input--done");
        }

        if (id && desc) {
          TaskActions.toggleSubtask(id, target.checked, desc);
        }
      });
    });

    this.taskNode?.querySelectorAll(".task__subtask-text-input").forEach((input) => {
      const updateSubtask = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const id = target.getAttribute("data-id");
        const isDone = target.getAttribute("data-done") === "true";
        const desc = target.value.trim();
        if (id && desc) {
          TaskActions.toggleSubtask(id, isDone, desc);
        }
      };
      input.addEventListener("blur", updateSubtask);
      input.addEventListener("keydown", (e: Event) => {
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === "Enter") {
          keyEvent.preventDefault();
          (keyEvent.target as HTMLElement).blur();
        }
      });
    });

    this.taskNode?.querySelectorAll(".task__comment-menu-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdown = (e.currentTarget as HTMLElement)
          .closest(".task__comment-menu-wrap")
          ?.querySelector(".task__comment-dropdown");
        this.taskNode?.querySelectorAll(".task__comment-dropdown").forEach(d => {
          if (d !== dropdown) d.classList.add("hidden");
        });
        dropdown?.classList.toggle("hidden");
      });
    });

    this.taskNode?.querySelectorAll(".task__comment-delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const commentEl = (e.currentTarget as HTMLElement).closest(".task__comment");
        const commentId = commentEl?.getAttribute("data-id");
        const taskId = state.taskId;
        if (!commentId || !taskId) return;
        (e.currentTarget as HTMLElement).closest(".task__comment-dropdown")?.classList.add("hidden");
        showConfirmModal({
          title: "Удалить комментарий",
          text: "Вы уверены, что хотите удалить комментарий?",
          confirmLabel: "Удалить",
          onConfirm: () => TaskActions.deleteComment(commentId, taskId),
        });
      });
    });

    this.taskNode?.querySelectorAll(".task__comment-edit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const commentEl = (e.currentTarget as HTMLElement).closest(".task__comment") as HTMLElement;
        const commentId = commentEl?.getAttribute("data-id");
        const taskId = state.taskId;
        const bubble = commentEl?.querySelector(".task__comment-bubble") as HTMLElement;
        if (!commentId || !taskId || !bubble) return;
        (e.currentTarget as HTMLElement).closest(".task__comment-dropdown")?.classList.add("hidden");

        const originalText = bubble.textContent ?? "";

        const textarea = document.createElement("textarea");
        textarea.className = "task__comment-edit-input";
        textarea.value = originalText;

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "task__comment-edit-actions";

        const btnSave = document.createElement("button");
        btnSave.className = "btn btn--primary task__comment-edit-save";
        btnSave.textContent = "Сохранить";

        const btnCancel = document.createElement("button");
        btnCancel.className = "btn btn--cancel task__comment-edit-cancel";
        btnCancel.textContent = "Отмена";

        actionsDiv.appendChild(btnSave);
        actionsDiv.appendChild(btnCancel);
        bubble.replaceWith(textarea);
        textarea.after(actionsDiv);
        textarea.focus();
        textarea.selectionStart = textarea.value.length;

        const cancelEdit = () => {
          textarea.replaceWith(bubble);
          actionsDiv.remove();
        };

        const saveEdit = () => {
          const newText = textarea.value.trim();
          if (!newText || newText === originalText) {
            cancelEdit();
            return;
          }
          TaskActions.updateComment(commentId, newText, taskId);
        };

        btnSave.addEventListener("click", saveEdit);
        btnCancel.addEventListener("click", cancelEdit);
        textarea.addEventListener("keydown", (ev) => {
          if (ev.key === "Escape") { cancelEdit(); }
          else if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); saveEdit(); }
        });
      });
    });

    this.taskNode?.querySelectorAll(".task__subtask-delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute("data-id");
        if (id) {
          showConfirmModal({
            title: "Удалить подзадачу",
            text: "Вы уверены, что хотите удалить подзадачу?",
            confirmLabel: "Удалить",
            onConfirm: () => TaskActions.deleteSubtask(id),
          });
        }
      });
    });
  }
}
