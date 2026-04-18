import Handlebars from "handlebars";
import taskTpl from "../../templates/task.hbs?raw";
import { taskStore } from "./TaskStore";
import { TaskActions } from "./TaskActions";
import { navigateTo } from "../../router";
import { Toast } from "../../utils/toast";
import { clearKanbanCache } from "../../pages/kanban";

const template = Handlebars.compile(taskTpl);

export class TaskView {
  private appDiv: HTMLElement;
  private taskNode: HTMLElement | null = null;
  private currentExecuterId: string = "";
  private hasRendered: boolean = false;

  private onStoreChangeBound = this.onStoreChange.bind(this);
  private onStoreSuccessBound = this.onStoreSuccess.bind(this);
  private onStoreErrorBound = this.onStoreError.bind(this);
  private globalClickHandlerBound = this.globalClickHandler.bind(this);

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
  }

  public render() {
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

  private globalClickHandler() {
    document.querySelector(".context-menu")?.remove();
    document.querySelector(".assignee__dropdown")?.remove();
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

    if (state.taskData && !this.hasRendered) {
      this.hasRendered = true;
      this.renderTemplate();
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

    const deadline = taskData.dead_line || taskData.data_dead_line;
    let rawDate = "";
    let rawTime = "";
    let formattedDate = "";
    let formattedTime = "";

    if (deadline) {
      const d = new Date(deadline);
      rawDate = d.toISOString().split("T")[0];
      rawTime = d.toTimeString().split(" ")[0].substring(0, 5);
      formattedDate = d.toLocaleDateString();
      formattedTime = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    let executorName = "Не назначен";
    let currentExecuterId =
      taskData.link_executer ||
      taskData.executer_link ||
      taskData.link_executor ||
      taskData.executor_link ||
      "";

    if (currentExecuterId) {
      const found = usersList.find((u) => u.id === currentExecuterId);
      executorName = found ? found.name : "Пользователь";
    }

    this.currentExecuterId = currentExecuterId;

    if (!this.taskNode) {
      this.taskNode = document.createElement("div");
      this.taskNode.id = "task-overlay-container";
      this.appDiv.appendChild(this.taskNode);
    }

    this.taskNode.innerHTML = template({
      board_name: state.boardName,
      task: {
        title: taskData.title || "Без названия",
        description: taskData.description || "",
        due_date: formattedDate,
        time: formattedTime,
        raw_date: rawDate,
        raw_time: rawTime,
        executor: executorName,
        executor_id: this.currentExecuterId,
      },
    });

    this.attachListeners();
  }

  private attachListeners() {
    const state = taskStore.getState();

    this.taskNode?.querySelector("#btn-save-task")?.addEventListener("click", () => {
      const title = (this.taskNode?.querySelector("#task-title-input") as HTMLInputElement).value.trim();
      const description = (this.taskNode?.querySelector("#task-desc-input") as HTMLTextAreaElement).value.trim();
      const dateVal = (this.taskNode?.querySelector("#task-date-input") as HTMLInputElement).value;
      const timeVal = (this.taskNode?.querySelector("#task-time-input") as HTMLInputElement).value;

      let finalDeadline = state.taskData.dead_line || state.taskData.data_dead_line;
      if (dateVal) {
        finalDeadline = `${dateVal}T${timeVal || "00:00"}:00Z`;
      }

      const payload = {
        link_card: state.taskId,
        title: title || "Без названия",
        description: description,
        link_executer: this.currentExecuterId || null,
        data_dead_line: finalDeadline,
      };

      if (state.taskId) {
        TaskActions.saveTask(state.taskId, payload);
      }
    });

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

      state.usersList.forEach((user) => {
        const item = document.createElement("div");
        item.className = "assignee__dropdown-item";
        item.innerHTML = `
          ${user.avatarUrl ? `<img src="${user.avatarUrl}" class="assignee__avatar" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">` : `<div class="assignee__avatar">${user.name.charAt(0).toUpperCase()}</div>`}
          <div class="assignee__info">
            <span class="assignee__name">${user.name}</span>
            <span class="assignee__email">${user.email}</span>
          </div>
        `;
        item.addEventListener("click", () => {
          execBtn.textContent = user.name;
          this.currentExecuterId = user.id;
          dropdown.remove();
        });
        dropdown.appendChild(item);
      });

      execBtn.parentElement!.appendChild(dropdown);
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
  }
}
