import Handlebars from "handlebars";
import { authApi, boardsApi, kanbanApi, profileApi } from "../api";
import taskTpl from "../templates/task.hbs?raw";
import { navigateTo } from "../router";
import { Toast } from "../utils/toast";

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
  const executerId = taskData.link_executer || taskData.executer_link;
  if (executerId) {
    const found = usersList.find((u) => u.id === executerId);
    executorName = found ? found.name : "Пользователь";
  }

  appDiv.innerHTML = template({
    board_name: boardName,
    task: {
      title: taskData.title || "Без названия",
      description: taskData.description || "",
      due_date: formattedDate,
      time: formattedTime,
      raw_date: rawDate,
      raw_time: rawTime,
      executor: executorName,
      executor_id: executerId,
    },
  });

  // Event Listeners
  const updateTask = async (updates: any) => {
    try {
      const currentDeadline = (
        appDiv.querySelector("#task-date-input") as HTMLInputElement
      ).value;
      const currentTime = (
        appDiv.querySelector("#task-time-input") as HTMLInputElement
      ).value;

      let finalDeadline = taskData.dead_line || taskData.data_dead_line;
      if (updates.raw_date !== undefined || updates.raw_time !== undefined) {
        const d =
          updates.raw_date !== undefined ? updates.raw_date : currentDeadline;
        const t =
          updates.raw_time !== undefined ? updates.raw_time : currentTime;
        if (d && t) {
          finalDeadline = `${d}T${t}:00Z`;
        } else if (d) {
          finalDeadline = `${d}T00:00:00Z`;
        }
      }

      const payload = {
        link_card: taskId,
        title:
          updates.title !== undefined
            ? updates.title
            : (appDiv.querySelector("#task-title-input") as HTMLInputElement)
                .value,
        description:
          updates.description !== undefined
            ? updates.description
            : (appDiv.querySelector("#task-desc-input") as HTMLTextAreaElement)
                .value,
        link_executer:
          updates.link_executer !== undefined
            ? updates.link_executer
            : executerId,
        data_dead_line: finalDeadline,
      };

      await kanbanApi.updateTask(taskId, payload);
    } catch (err) {
      console.error("Update task error", err);
      Toast.error("Ошибка при сохранении");
    }
  };

  appDiv
    .querySelector("#btn-back")
    ?.addEventListener("click", () => navigateTo(`/board?id=${boardId}`));

  const titleInput = appDiv.querySelector(
    "#task-title-input",
  ) as HTMLInputElement;
  titleInput?.addEventListener("blur", () => {
    if (titleInput.value.trim() !== taskData.title) {
      updateTask({ title: titleInput.value.trim() });
    }
  });

  const descInput = appDiv.querySelector(
    "#task-desc-input",
  ) as HTMLTextAreaElement;
  descInput?.addEventListener("blur", () => {
    if (descInput.value.trim() !== taskData.description) {
      updateTask({ description: descInput.value.trim() });
    }
  });

  appDiv.querySelector("#task-date-input")?.addEventListener("change", (e) => {
    updateTask({ raw_date: (e.target as HTMLInputElement).value });
  });

  appDiv.querySelector("#task-time-input")?.addEventListener("change", (e) => {
    updateTask({ raw_time: (e.target as HTMLInputElement).value });
  });

  const execBtn = appDiv.querySelector(
    "#task-executor-btn",
  ) as HTMLButtonElement;
  execBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    document
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
      item.addEventListener("click", async () => {
        execBtn.textContent = user.name;
        await updateTask({ link_executer: user.id });
        dropdown.remove();
      });
      dropdown.appendChild(item);
    });

    execBtn.parentElement!.appendChild(dropdown);
  });

  // Options Menu
  const optionsBtn = appDiv.querySelector("#btn-task-options");
  optionsBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const existingMenu = document.querySelector(".context-menu");
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.innerHTML = `<div class="context-menu__item context-menu__item--danger" id="ctx-delete-task">Удалить карточку</div>`;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
    menu.style.left = `${rect.left + window.scrollX - 150}px`;

    document.body.appendChild(menu);

    menu.querySelector("#ctx-delete-task")?.addEventListener("click", () => {
      const modalOverlay = document.getElementById("modal-overlay")!;
      const modalDelete = document.getElementById("modal-delete-task")!;
      document.getElementById("delete-task-name")!.textContent =
        titleInput.value;

      modalOverlay.classList.remove("hidden");
      modalDelete.classList.remove("hidden");

      document.getElementById("btn-confirm-delete-task")!.onclick =
        async () => {
          try {
            await kanbanApi.deleteTask(taskId);
            navigateTo(`/board?id=${boardId}`);
          } catch (err) {
            Toast.error("Ошибка при удалении");
          }
        };
      menu.remove();
    });
  });

  document.addEventListener("click", () => {
    document.querySelector(".context-menu")?.remove();
    document.querySelector(".assignee__dropdown")?.remove();
  });

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

  // Close modals
  appDiv.querySelectorAll(".modal__close-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.getElementById("modal-overlay")?.classList.add("hidden");
      document.getElementById("modal-delete-task")?.classList.add("hidden");
    }),
  );
};
