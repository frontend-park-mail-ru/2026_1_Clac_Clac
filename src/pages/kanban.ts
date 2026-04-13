import Handlebars from "handlebars";
import { authApi, boardsApi, kanbanApi, profileApi } from "../api";
import { navigateTo } from "../router";
import kanbanTpl from "../templates/kanban.hbs?raw";
import { Toast } from "../utils/toast";

const template = Handlebars.compile(kanbanTpl);

interface BoardUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export const renderKanban = async (appDiv: HTMLElement): Promise<void> => {
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get("id") || urlParams.get("boardId");
  if (!boardId || boardId === "null") {
    return navigateTo("/boards");
  }

  let boardName = "Без названия";
  let boardUsers: BoardUser[] = [];

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
        return {
          id: link,
          name: "Пользователь",
          email: "",
        };
      }
    });

    boardUsers = await Promise.all(userPromises);
  } catch (err) {
    console.error("Error fetching board details/users", err);
  }

  try {
    const res = (await kanbanApi.getSections(boardId)) as any;
    let sections = res.data?.sections || res.sections || res.data || res || [];
    if (!Array.isArray(sections)) {
      sections = [];
    }

    const colors = [
      "white",
      "#f87171",
      "#fb923c",
      "#60a5fa",
      "#f43f5e",
      "#4ade80",
      "#a5b4fc",
      "#f9a8d4",
    ];

    for (let i = 0; i < sections.length; i++) {
      sections[i].id = sections[i].section_link || sections[i].id;
      sections[i].color = sections[i].color || colors[i % colors.length];

      try {
        const tasksRes = (await kanbanApi.getTasks(sections[i].id)) as any;

        let tasksList = [];
        if (Array.isArray(tasksRes?.data?.cards)) {
          tasksList = tasksRes.data.cards;
        } else if (Array.isArray(tasksRes?.cards)) {
          tasksList = tasksRes.cards;
        } else if (Array.isArray(tasksRes?.data)) {
          tasksList = tasksRes.data;
        } else if (Array.isArray(tasksRes)) {
          tasksList = tasksRes;
        }

        sections[i].tasks = tasksList.map((t: any) => {
          const executerId = t.link_executer || t.executer_link;
          const exUser = boardUsers.find((u) => u.id === executerId);

          const deadline = t.dead_line || t.data_dead_line;

          return {
            id: t.card_link || t.link_card || t.id,
            title: t.title || "Без названия",
            due_date: deadline ? new Date(deadline).toLocaleDateString() : null,
            time: deadline
              ? new Date(deadline).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null,
            executor: exUser
              ? exUser.name
              : t.executer_name || t.name_executer || null,
          };
        });
      } catch (err) {
        sections[i].tasks = [];
        console.error("Error fetching tasks", err);
      }
    }

    appDiv.innerHTML = template({ board_name: boardName, sections });

    const modalOverlay = document.getElementById("modal-overlay")!;
    const modalManage = document.getElementById("modal-manage-columns")!;
    const manageList = document.getElementById("manage-columns-list")!;
    const modalCreateTask = document.getElementById("modal-create-task")!;
    const modalDeleteCard = document.getElementById("modal-delete-card")!;

    const closeModals = () => {
      modalOverlay.classList.add("hidden");
      modalManage.classList.add("hidden");
      modalCreateTask.classList.add("hidden");
      modalDeleteCard.classList.add("hidden");
    };

    const renderManageList = () => {
      manageList.innerHTML = sections
        .map(
          (s: any) => `
        <div class="manage-columns__item" data-id="${s.id}" draggable="true">
          <div class="manage-columns__color-trigger" style="background: ${s.color}; width: 24px; height: 24px; border-radius: 4px; cursor: pointer;" data-id="${s.id}"></div>
          <input type="text" class="manage-columns__name" value="${s.section_name}" data-id="${s.id}" placeholder="Имя колонки">
          <div class="manage-columns__actions">
            <div class="manage-columns__delete" data-id="${s.id}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </div>
            <div class="manage-columns__drag">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="9" x2="16" y2="9"></line>
                <line x1="8" y1="15" x2="16" y2="15"></line>
              </svg>
            </div>
          </div>
        </div>
      `,
        )
        .join("");

      // Drag and Drop Logic
      let draggedItem: HTMLElement | null = null;

      manageList.querySelectorAll(".manage-columns__item").forEach((item) => {
        const node = item as HTMLElement;
        node.addEventListener("dragstart", () => {
          draggedItem = node;
          setTimeout(() => (node.style.opacity = "0.5"), 0);
        });

        node.addEventListener("dragend", async () => {
          node.style.opacity = "1";
          draggedItem = null;

          // Save new order
          const newOrder = Array.from(
            manageList.querySelectorAll(".manage-columns__item"),
          ).map((i) => i.getAttribute("data-id") as string);

          try {
            await kanbanApi.reorderSections(boardId, { list_links: newOrder });
            Toast.success("Порядок сохранен");
            // We don't call renderKanban here to avoid closing the modal
          } catch (e) {
            Toast.error("Ошибка при сохранении порядка");
          }
        });

        node.addEventListener("dragover", (e) => {
          e.preventDefault();
          const draggingOver = e.currentTarget as HTMLElement;
          if (draggingOver && draggingOver !== draggedItem) {
            const rect = draggingOver.getBoundingClientRect();
            const next = e.clientY - rect.top > rect.height / 2;
            manageList.insertBefore(
              draggedItem!,
              next ? draggingOver.nextSibling : draggingOver,
            );
          }
        });
      });

      // Listeners for manage items
      manageList
        .querySelectorAll(".manage-columns__name")
        .forEach((input: any) => {
          input.addEventListener("blur", async () => {
            const id = input.getAttribute("data-id");
            const newName = input.value.trim();
            const section = sections.find((s: any) => s.id === id);
            if (section && newName && newName !== section.section_name) {
              await kanbanApi.updateSection(id, {
                ...section,
                section_link: id,
                section_name: newName,
              });
              // Update local state to keep UI in sync
              section.section_name = newName;
            }
          });
        });

      manageList.querySelectorAll(".manage-columns__delete").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (id && confirm("Удалить секцию?")) {
            await kanbanApi.deleteSection(id);
            sections = sections.filter((s: any) => s.id !== id);
            renderManageList();
          }
        });
      });

      manageList
        .querySelectorAll(".manage-columns__color-trigger")
        .forEach((trigger: any) => {
          trigger.addEventListener("click", (e: MouseEvent) => {
            e.stopPropagation();
            const id = trigger.getAttribute("data-id");
            const section = sections.find((s: any) => s.id === id);

            const palette = [
              "white",
              "#f87171",
              "#fb923c",
              "#60a5fa",
              "#f43f5e",
              "#4ade80",
              "#a5b4fc",
              "#f9a8d4",
            ];

            const picker = document.createElement("div");
            picker.className = "color-picker-bubble";
            picker.style.cssText = `position: absolute; z-index: 10001;`;
            picker.innerHTML = `
            <div class="color-picker-bubble__title">Цвета</div>
            <div class="color-picker-bubble__grid">
              ${palette.map((c) => `<div class="color-picker-bubble__dot ${section?.color === c ? "active" : ""}" data-color="${c}" style="background:${c}"></div>`).join("")}
            </div>
            <div class="color-picker-bubble__footer">
              <button class="color-picker-bubble__btn color-picker-bubble__btn--cancel">Отмена</button>
              <button class="color-picker-bubble__btn color-picker-bubble__btn--save">Сохранить</button>
            </div>
          `;

            const rect = trigger.getBoundingClientRect();
            picker.style.top = `${rect.bottom + window.scrollY + 8}px`;
            picker.style.left = `${rect.left + window.scrollX - 100}px`;

            document.body.appendChild(picker);

            let tempColor = section?.color || "white";

            picker
              .querySelectorAll(".color-picker-bubble__dot")
              .forEach((dot: any) => {
                dot.addEventListener("click", () => {
                  picker
                    .querySelectorAll(".color-picker-bubble__dot")
                    .forEach((d) => d.classList.remove("active"));
                  dot.classList.add("active");
                  tempColor = dot.getAttribute("data-color");
                });
              });

            picker
              .querySelector(".color-picker-bubble__btn--cancel")
              ?.addEventListener("click", () => picker.remove());

            picker
              .querySelector(".color-picker-bubble__btn--save")
              ?.addEventListener("click", async () => {
                if (section && tempColor) {
                  await kanbanApi.updateSection(id, {
                    ...section,
                    section_link: id,
                    color: tempColor,
                  });
                  section.color = tempColor;
                  trigger.style.background = tempColor;
                  picker.remove();
                }
              });

            const closeOnOutside = (e: MouseEvent) => {
              if (!picker.contains(e.target as Node)) {
                picker.remove();
                document.removeEventListener("mousedown", closeOnOutside);
              }
            };
            setTimeout(
              () => document.addEventListener("mousedown", closeOnOutside),
              0,
            );
          });
        });
    };

    document
      .getElementById("btn-manage-columns")
      ?.addEventListener("click", () => {
        closeModals(); // Close other modals
        renderManageList();
        modalOverlay.classList.remove("hidden");
        modalManage.classList.remove("hidden");
      });

    document
      .getElementById("btn-close-manage")
      ?.addEventListener("click", () => {
        renderKanban(appDiv); // Full reload only on close
      });

    document
      .getElementById("btn-add-column-modal")
      ?.addEventListener("click", async () => {
        try {
          const res = (await kanbanApi.createSection({
            board_link: boardId,
            section_name: "Новая секция",
            max_tasks: 100,
            is_mandatory: false,
            color: "white",
          })) as any;
          const newSec = res.data || res;
          newSec.id = newSec.section_link || newSec.id;
          newSec.tasks = [];
          sections.push(newSec);
          renderManageList();
        } catch (e) {
          Toast.error("Ошибка при создании секции");
        }
      });

    document
      .getElementById("nav-boards")
      ?.addEventListener("click", () => navigateTo("/boards"));
    document
      .getElementById("nav-profile")
      ?.addEventListener("click", () => navigateTo("/profile"));
    document
      .getElementById("logout-btn")
      ?.addEventListener("click", async () => {
        try {
          await authApi.logout();
        } catch (err) {
          console.error("Logout error", err);
        }
        localStorage.removeItem("isAuth");
        navigateTo("/login");
      });

    document
      .querySelectorAll(".modal__close-btn")
      .forEach((btn) => btn.addEventListener("click", closeModals));

    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeModals();
    });

    let activeMenu: HTMLElement | null = null;
    const closeMenu = () => {
      if (activeMenu) {
        activeMenu.remove();
        activeMenu = null;
      }
    };
    document.addEventListener("click", closeMenu);

    document.querySelectorAll(".kanban__btn-col-options").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeMenu();
        const sectionId = (e.currentTarget as HTMLElement).getAttribute(
          "data-id",
        );
        const menu = document.createElement("div");
        menu.className = "context-menu";
        menu.innerHTML = `
          <div class="context-menu__item" id="ctx-edit-list">Изменить</div>
          <div class="context-menu__item context-menu__item--danger" id="ctx-delete-list">Удалить список</div>
        `;
        const rect = btn.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
        menu.style.left = `${rect.left + window.scrollX - 150}px`;
        document.body.appendChild(menu);
        activeMenu = menu;

        menu.querySelector("#ctx-edit-list")?.addEventListener("click", () => {
          if (sectionId) {
            navigateTo(`/section?boardId=${boardId}&sectionId=${sectionId}`);
          }
        });

        menu
          .querySelector("#ctx-delete-list")
          ?.addEventListener("click", async () => {
            if (sectionId && confirm("Удалить список?")) {
              await kanbanApi.deleteSection(sectionId);
              renderKanban(appDiv);
            }
          });
      });
    });

    document.querySelectorAll(".kanban-card__options-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeMenu();
        const taskId = (e.currentTarget as HTMLElement).getAttribute("data-id");
        const title = (e.currentTarget as HTMLElement).getAttribute(
          "data-title",
        );
        const menu = document.createElement("div");
        menu.className = "context-menu";
        menu.innerHTML = `
          <div class="context-menu__item" id="ctx-edit-card">Изменить имя</div>
          <div class="context-menu__item context-menu__item--danger" id="ctx-delete-card">Удалить карточку</div>
        `;
        const rect = btn.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
        menu.style.left = `${rect.left + window.scrollX - 150}px`;
        document.body.appendChild(menu);
        activeMenu = menu;

        menu
          .querySelector("#ctx-edit-card")
          ?.addEventListener("click", async () => {
            const newName = prompt("Введите новое имя карточки:", title || "");
            if (newName && newName.trim() && taskId) {
              await kanbanApi.updateTask(taskId, {
                link_card: taskId,
                title: newName.trim(),
                description: "",
              });
              renderKanban(appDiv);
            }
          });

        menu
          .querySelector("#ctx-delete-card")
          ?.addEventListener("click", () => {
            document.getElementById("delete-card-name")!.textContent =
              title || "";
            modalOverlay.classList.remove("hidden");
            modalDeleteCard.classList.remove("hidden");
            const confirmBtn = document.getElementById(
              "btn-confirm-delete-card",
            )!;
            confirmBtn.onclick = async () => {
              if (taskId) {
                await kanbanApi.deleteTask(taskId);
                renderKanban(appDiv);
              }
            };
          });
      });
    });

    document.querySelectorAll(".kanban__add-card-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const parent = btn.parentElement!;
        const sectionId = parent.getAttribute("data-section-id")!;

        parent.innerHTML = `
          <div class="kanban__add-card-form">
            <textarea class="kanban__add-card-input" id="inline-new-task-${sectionId}" placeholder="Введите имя карточки..." maxlength="50" autofocus></textarea>
          </div>
        `;
        const input = document.getElementById(
          `inline-new-task-${sectionId}`,
        ) as HTMLTextAreaElement;
        input.focus();

        const saveTask = async () => {
          const val = input.value.trim();
          if (val) {
            await kanbanApi.createTask({
              title: val,
              link_section: sectionId,
              description: "",
            });
            renderKanban(appDiv);
          } else {
            renderKanban(appDiv);
          }
        };

        input.addEventListener("blur", saveTask);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            input.blur();
          } else if (e.key === "Escape") {
            input.value = "";
            input.blur();
          }
        });
      });
    });

    const addColumnBtn = document.getElementById("btn-add-column");
    if (addColumnBtn) {
      addColumnBtn.addEventListener("click", async () => {
        await kanbanApi.createSection({
          board_link: boardId,
          section_name: "Новая секция",
          max_tasks: 100,
          is_mandatory: false,
          color: "white",
        });
        renderKanban(appDiv);
      });
    }

    document.querySelectorAll(".kanban-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (
          (e.target as HTMLElement).closest(".kanban-card__options-btn") ||
          (e.target as HTMLElement).closest(".assignee__select-btn")
        ) {
          return;
        }
        const taskId = card.getAttribute("data-id");
        const title = card.getAttribute("data-title") || "";
        navigateTo(
          `/task?boardId=${boardId}&taskId=${taskId}&title=${encodeURIComponent(title)}`,
        );
      });
    });

    const updateTaskAssignee = async (
      taskId: string | null,
      userId: string,
    ) => {
      if (!taskId) return;
      try {
        const taskNode = document.querySelector(
          `.kanban-card[data-id="${taskId}"]`,
        );
        const title = taskNode?.getAttribute("data-title") || "";
        await kanbanApi.updateTask(taskId, {
          link_card: taskId,
          title: title,
          link_executer: userId,
          description: "",
        });
        renderKanban(appDiv);
      } catch (error) {
        console.error("Ошибка при обновлении исполнителя:", error);
      }
    };

    document.querySelectorAll(".assignee__select-btn").forEach((btn) => {
      if (btn.id === "assignee-select-btn") return;

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute("data-task-id");
        document
          .querySelectorAll(".assignee__dropdown")
          .forEach((dd) => dd.remove());

        const dropdown = document.createElement("div");
        dropdown.className = "assignee__dropdown";

        boardUsers.forEach((user) => {
          const item = document.createElement("div");
          item.className = "assignee__dropdown-item";
          item.innerHTML = `
            ${
              user.avatarUrl
                ? `<img src="${user.avatarUrl}" class="assignee__avatar" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">`
                : `<div class="assignee__avatar">${user.name.charAt(0).toUpperCase()}</div>`
            }
            <div class="assignee__info">
              <span class="assignee__name">${user.name}</span>
              <span class="assignee__email">${user.email}</span>
            </div>
          `;

          item.addEventListener("click", () => {
            btn.textContent = user.name;
            btn.setAttribute("data-selected-user-id", user.id);
            updateTaskAssignee(taskId, user.id);
            dropdown.remove();
          });

          dropdown.appendChild(item);
        });

        btn.parentElement!.classList.add("relative-wrapper");
        btn.parentElement!.appendChild(dropdown);
      });
    });

    const newTaskInput = document.getElementById(
      "new-task-title",
    ) as HTMLInputElement;
    const btnConfirmCreate = document.getElementById(
      "btn-confirm-create-task",
    )!;
    const btnNewTask = document.getElementById("btn-new-task");
    const modalAssigneeBtn = document.getElementById("assignee-select-btn");

    let selectedAssigneeId: string | null = null;

    if (btnNewTask) {
      btnNewTask.addEventListener("click", () => {
        closeModals(); // Close other modals
        modalOverlay.classList.remove("hidden");
        modalCreateTask.classList.remove("hidden");
        newTaskInput.value = "";
        newTaskInput.focus();

        selectedAssigneeId = null;
        if (modalAssigneeBtn) modalAssigneeBtn.textContent = "Выбрать...";
      });
    }

    if (modalAssigneeBtn) {
      modalAssigneeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        document
          .querySelectorAll(".assignee-dropdown")
          .forEach((dd) => dd.remove());

        const dropdown = document.createElement("div");
        dropdown.className = "assignee-dropdown";
        dropdown.style.cssText = `
          position: absolute;
          top: 100%;
          left: 0;
          width: 220px;
          background: #2a2a2c;
          border: 1px solid #444;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          z-index: 1000;
          max-height: 200px;
          overflow-y: auto;
          margin-top: 4px;
        `;

        boardUsers.forEach((user) => {
          const item = document.createElement("div");
          item.className = "assignee-dropdown-item";
          item.style.cssText = `
            display: flex;
            align-items: center;
            padding: 8px;
            cursor: pointer;
            transition: background 0.2s;
            border-bottom: 1px solid #333;
          `;
          if (user.id === selectedAssigneeId) {
            item.style.backgroundColor = "#3a3a3c";
          }

          item.innerHTML = `
            ${
              user.avatarUrl
                ? `<img src="${user.avatarUrl}" class="assignee-avatar" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">`
                : `<div class="assignee-avatar" style="width:24px;height:24px;border-radius:50%;background:#8b5cf6;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;">${user.name.charAt(0).toUpperCase()}</div>`
            }
            <div class="assignee-info" style="display:flex;flex-direction:column;margin-left:8px;min-width:0;">
              <span class="assignee-name" style="color:white;font-weight:500;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${user.name}</span>
              <span class="assignee-email" style="color:#888;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${user.email}</span>
            </div>
          `;

          item.addEventListener("mouseenter", () => {
            item.style.backgroundColor = "#333";
          });
          item.addEventListener("mouseleave", () => {
            if (user.id !== selectedAssigneeId)
              item.style.backgroundColor = "transparent";
          });

          item.addEventListener("click", () => {
            selectedAssigneeId = user.id;
            modalAssigneeBtn.innerHTML = `
              <div style="display:flex;align-items:center;gap:8px;">
                ${
                  user.avatarUrl
                    ? `<img src="${user.avatarUrl}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">`
                    : `<div style="width:24px;height:24px;border-radius:50%;background:#8b5cf6;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;">${user.name.charAt(0).toUpperCase()}</div>`
                }
                <span style="color:white;font-size:14px;">${user.name}</span>
              </div>
            `;
            dropdown.remove();
          });

          dropdown.appendChild(item);
        });

        const parent = modalAssigneeBtn.parentElement!;
        parent.style.position = "relative";
        parent.appendChild(dropdown);
      });
    }

    const handleCreateTask = async () => {
      const title = newTaskInput.value.trim();
      if (!title) return;

      try {
        if (sections.length > 0) {
          await kanbanApi.createTask({
            title,
            link_section: sections[0].id,
            description: "",
            link_executer: selectedAssigneeId ? selectedAssigneeId : undefined,
          });
          Toast.success("Задача успешно создана");
          closeModals();
          await renderKanban(appDiv);

          selectedAssigneeId = null;
          if (modalAssigneeBtn) {
            modalAssigneeBtn.textContent = "Выбрать...";
          }
        } else {
          Toast.error("Сначала создайте колонку");
        }
      } catch (error) {
        console.error("Ошибка при создании задачи:", error);
      }
    };

    btnConfirmCreate.addEventListener("click", handleCreateTask);

    newTaskInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCreateTask();
      }
    });

    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".assignee-select-btn") &&
        !target.closest(".assignee__select-btn")
      ) {
        document
          .querySelectorAll(".assignee-dropdown, .assignee__dropdown")
          .forEach((dd) => dd.remove());
      }
    });

    let draggedTaskId: string | null = null;
    let sourceSectionId: string | null = null;

    appDiv.querySelectorAll(".kanban-card").forEach((card) => {
      card.addEventListener("dragstart", (e: Event) => {
        const dragEvent = e as DragEvent;
        draggedTaskId = card.getAttribute("data-id");
        sourceSectionId =
          card
            .closest(".kanban__column-cards")
            ?.getAttribute("data-section-id") || null;

        if (dragEvent.dataTransfer) {
          dragEvent.dataTransfer.effectAllowed = "move";
          dragEvent.dataTransfer.setData("text/plain", draggedTaskId || "");
        }
        setTimeout(() => ((card as HTMLElement).style.opacity = "0.5"), 0);
      });

      card.addEventListener("dragend", () => {
        (card as HTMLElement).style.opacity = "1";
        draggedTaskId = null;
        sourceSectionId = null;
      });
    });

    appDiv.querySelectorAll(".kanban__column-cards").forEach((dropZone) => {
      dropZone.addEventListener("dragover", (e: Event) => {
        e.preventDefault();
        const dragEvent = e as DragEvent;
        if (dragEvent.dataTransfer) {
          dragEvent.dataTransfer.dropEffect = "move";
        }
      });

      dropZone.addEventListener("drop", async (e: Event) => {
        e.preventDefault();
        const targetSectionId = dropZone.getAttribute("data-section-id");

        if (
          draggedTaskId &&
          targetSectionId &&
          targetSectionId !== sourceSectionId
        ) {
          try {
            const cardEl = document.querySelector(
              `.kanban-card[data-id="${draggedTaskId}"]`,
            );
            if (cardEl) dropZone.appendChild(cardEl);

            await kanbanApi.reorderTask(draggedTaskId, {
              link_card: draggedTaskId,
              link_section: targetSectionId,
              position: 1,
            });
            renderKanban(appDiv);
          } catch (err) {
            console.error("Ошибка при переносе карточки:", err);
            renderKanban(appDiv);
          }
        }
      });
    });
  } catch (err) {
    console.error(err);
    navigateTo("/boards");
  }
};
