import Handlebars from "handlebars";
import { authApi, boardsApi, kanbanApi, profileApi } from "../api";
import taskTpl from "../templates/task.hbs?raw";
import { navigateTo } from "../router";
import { Toast } from "../utils/toast";
import { renderKanbanModule, clearKanbanCache } from "../modules/kanban";

const template = Handlebars.compile(taskTpl);

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export const renderTask = async (appDiv: HTMLElement): Promise<void> => {
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get("taskId");
  const boardId = urlParams.get("boardId");

  if (!taskId || taskId === "null" || !boardId || boardId === "null") {
    return navigateTo("/boards");
  }

  let boardName = "Без названия";
  let usersList: User[] = [];
  let taskData: any = null;

  try {
    const boardRes = (await boardsApi.getBoard(boardId)) as any;
    if (boardRes?.data?.name) {
      boardName = boardRes.data.name;
    }

    const usersRes = (await boardsApi.getBoardUsers(boardId)) as any;
    const rawUsers = Array.isArray(usersRes?.data)
      ? usersRes.data
      : Array.isArray(usersRes)
        ? usersRes
        : [];

    const userPromises = rawUsers.map(async (u: any) => {
      const link = u.user_link || u.id || u;
      try {
        const pRes = (await profileApi.getProfileByLink(link)) as any;
        const pData = pRes?.data || pRes;
        return {
          id: link,
          name: pData.display_name || "Без имени",
          email: pData.email || "",
          avatarUrl: pData.avatar_url,
        };
      } catch (e) {
        return { id: link, name: "Пользователь", email: "" };
      }
    });
    usersList = await Promise.all(userPromises);

    const taskRes = (await kanbanApi.getTask(taskId)) as any;
    taskData = taskRes?.data || taskRes;
  } catch (err) {
    console.error("Fetch error", err);
    Toast.error("Ошибка при загрузке данных");
  }

  if (!taskData) {
    return navigateTo(`/board?id=${boardId}`);
  }

  try {
    await renderKanbanModule(appDiv);
  } catch (err) {
    console.error("Board render error", err);
  }

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
    formattedTime = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const taskOverlayContainer = document.createElement("div");
  taskOverlayContainer.id = "task-overlay-container";
  appDiv.appendChild(taskOverlayContainer);

  taskOverlayContainer.innerHTML = template({
    board_name: boardName,
    task: {
      title: taskData.title || "Без названия",
      description: taskData.description || "",
      due_date: formattedDate,
      time: formattedTime,
      raw_date: rawDate,
      raw_time: rawTime,
      executor: executorName,
      executor_id: currentExecuterId,
    },
  });

  const taskNode = taskOverlayContainer;

  const handleSave = async () => {
    const btnSave = taskNode.querySelector(
      "#btn-save-task",
    ) as HTMLButtonElement;
    try {
      btnSave.disabled = true;
      btnSave.textContent = "Сохранение...";

      const title = (
        taskNode.querySelector("#task-title-input") as HTMLInputElement
      ).value.trim();
      const description = (
        taskNode.querySelector("#task-desc-input") as HTMLTextAreaElement
      ).value.trim();
      const dateVal = (
        taskNode.querySelector("#task-date-input") as HTMLInputElement
      ).value;
      const timeVal = (
        taskNode.querySelector("#task-time-input") as HTMLInputElement
      ).value;

      let finalDeadline = taskData.dead_line || taskData.data_dead_line;
      if (dateVal) {
        finalDeadline = `${dateVal}T${timeVal || "00:00"}:00Z`;
      }

      const payload = {
        link_card: taskId,
        title: title || "Без названия",
        description: description,
        link_executer: currentExecuterId || null,
        data_dead_line: finalDeadline,
      };

      await kanbanApi.updateTask(taskId, payload);
      clearKanbanCache();
      Toast.success("Карточка сохранена");
      navigateTo(`/board?id=${boardId}`);
    } catch (err) {
      console.error("Save task error", err);
      Toast.error("Ошибка при сохранении");
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = "Сохранить";
    }
  };

  taskNode
    .querySelector("#btn-save-task")
    ?.addEventListener("click", handleSave);

  taskNode
    .querySelector("#btn-back")
    ?.addEventListener("click", () => navigateTo(`/board?id=${boardId}`));

  taskNode.querySelector("#task-overlay")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      navigateTo(`/board?id=${boardId}`);
    }
  });

  const execBtn = taskNode.querySelector(
    "#task-executor-btn",
  ) as HTMLButtonElement;
  execBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    taskNode
      .querySelectorAll(".assignee__dropdown")
      .forEach((dd) => dd.remove());

    const dropdown = document.createElement("div");
    dropdown.className = "assignee__dropdown";

    usersList.forEach((user) => {
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
        currentExecuterId = user.id;
        dropdown.remove();
      });
      dropdown.appendChild(item);
    });

    execBtn.parentElement!.appendChild(dropdown);
  });

  const optionsBtn = taskNode.querySelector("#btn-task-options");
  optionsBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const existingMenu = document.querySelector(".context-menu");
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.innerHTML = `<div class="context-menu__item context-menu__item--danger" id="ctx-delete-task">Удалить карточку</div>`;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
    menu.style.left = `${rect.left + window.scrollX - 150}px`;

    document.body.appendChild(menu);

    menu.querySelector("#ctx-delete-task")?.addEventListener("click", () => {
      const modalOverlay = taskNode.querySelector("#modal-overlay") as HTMLElement;
      const modalDelete = taskNode.querySelector("#modal-delete-task") as HTMLElement;
      const titleInput = taskNode.querySelector(
        "#task-title-input",
      ) as HTMLInputElement;
      (taskNode.querySelector("#delete-task-name") as HTMLElement).textContent =
        titleInput.value;

      modalOverlay.classList.remove("hidden");
      modalDelete.classList.remove("hidden");

      (taskNode.querySelector("#btn-confirm-delete-task") as HTMLElement).onclick =
        async () => {
          try {
            await kanbanApi.deleteTask(taskId);
            clearKanbanCache();
            navigateTo(`/board?id=${boardId}`);
          } catch (err) {
            Toast.error("Ошибка при удалении");
          }
        };
      menu.remove();
    });
  });

  const globalClickHandler = () => {
    document.querySelector(".context-menu")?.remove();
    document.querySelector(".assignee__dropdown")?.remove();
  };
  document.addEventListener("click", globalClickHandler);

  const btnLogout = document.getElementById("logout-btn");
  btnLogout?.addEventListener("click", async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error("Logout error", err);
    }
    localStorage.removeItem("isAuth");
    navigateTo("/login");
  });

  const navBoards = document.getElementById("nav-boards");
  navBoards?.addEventListener("click", () => navigateTo("/boards"));
  const navProfile = document.getElementById("nav-profile");
  navProfile?.addEventListener("click", () => navigateTo("/profile"));

  taskNode.querySelectorAll(".modal__close-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      taskNode.querySelector("#modal-overlay")?.classList.add("hidden");
      taskNode.querySelector("#modal-delete-task")?.classList.add("hidden");
    }),
  );
};
