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

const profileCache = new Map<string, BoardUser>();
export let cachedBoardId: string | null = null;
export let cachedBoardName = "Без названия";
export let cachedBoardUsers: BoardUser[] = [];
export let cachedSections: any[] = [];

export const clearKanbanCache = () => {
  cachedBoardId = null;
  cachedBoardName = "Без названия";
  cachedBoardUsers = [];
  cachedSections = [];
};

const colorMap: Record<string, string> = {
  white: "#ffffff",
  grey: "#9ca3af",
  red: "#f87171",
  orange: "#fb923c",
  blue: "#60a5fa",
  green: "#4ade80",
  purple: "#a5b4fc",
  pink: "#f9a8d4",
};

export const renderKanban = async (
  appDiv: HTMLElement,
  forceFetch = false,
): Promise<void> => {
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get("id") || urlParams.get("boardId");
  if (!boardId || boardId === "null") {
    return navigateTo("/boards");
  }

  if (boardId !== cachedBoardId || forceFetch || cachedSections.length === 0) {
    try {
      const boardRes = (await boardsApi.getBoard(boardId)) as any;
      if (boardRes?.data?.name) {
        cachedBoardName = boardRes.data.name;
      }

      const usersRes = (await boardsApi.getBoardUsers(boardId)) as any;
      const rawUsers = Array.isArray(usersRes?.data)
        ? usersRes.data
        : Array.isArray(usersRes)
          ? usersRes
          : [];

      const userPromises = rawUsers.map(async (u: any) => {
        const link = u.user_link || u.id || u;
        if (profileCache.has(link)) {
          return profileCache.get(link)!;
        }
        try {
          const pRes = (await profileApi.getProfileByLink(link)) as any;
          const pData = pRes?.data || pRes;
          const userObj = {
            id: link,
            name: pData.display_name || "Без имени",
            email: pData.email || "",
            avatarUrl: pData.avatar_url,
          };
          profileCache.set(link, userObj);
          return userObj;
        } catch (e) {
          return { id: link, name: "Пользователь", email: "" };
        }
      });
      cachedBoardUsers = await Promise.all(userPromises);

      const res = (await kanbanApi.getSections(boardId)) as any;
      let fetchedSections =
        res.data?.sections || res.sections || res.data || res || [];
      if (!Array.isArray(fetchedSections)) {
        fetchedSections = [];
      }

      const colors = Object.keys(colorMap);
      const sectionPromises = fetchedSections.map(
        async (sec: any, i: number) => {
          sec.id = sec.section_link || sec.id;
          sec.color = sec.color || colors[i % colors.length];
          sec.colorHex = colorMap[sec.color] || sec.color;

          try {
            const tasksRes = (await kanbanApi.getTasks(sec.id)) as any;
            let tasksList =
              tasksRes?.data?.cards ||
              tasksRes?.cards ||
              tasksRes?.data ||
              tasksRes ||
              [];
            sec.tasks = tasksList.map((t: any) => {
              const exUser = cachedBoardUsers.find(
                (u) => u.id === (t.link_executer || t.executer_link),
              );
              const dl = t.dead_line || t.data_dead_line;

              let formattedDate = null;
              let formattedTime = null;

              if (dl) {
                const dlDate = new Date(dl);
                const dayMonth = dlDate.toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                });
                formattedDate = `${dayMonth}, ${dlDate.getFullYear()}`;
                formattedTime = dlDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
              }

              return {
                id: t.card_link || t.link_card || t.id,
                title: t.title || "Без названия",
                due_date: formattedDate,
                time: formattedTime,
                executor: exUser
                  ? exUser.name
                  : t.executer_name || t.name_executer || null,
              };
            });
          } catch (err) {
            sec.tasks = [];
          }
          return sec;
        },
      );
      cachedSections = await Promise.all(sectionPromises);
      cachedBoardId = boardId;
    } catch (err) {
      if (forceFetch || boardId !== cachedBoardId) {
        return navigateTo("/boards");
      }
    }
  }

  const sections = cachedSections;
  const boardName = cachedBoardName;
  const scrollMap = new Map<string, number>();
  appDiv.querySelectorAll(".kanban__column-cards").forEach((el) => {
    const id = el.getAttribute("data-section-id");
    if (id) {
      scrollMap.set(id, el.scrollTop);
    }
  });
  appDiv.innerHTML = template({ board_name: boardName, sections });
  appDiv.querySelectorAll(".kanban__column-cards").forEach((el) => {
    const id = el.getAttribute("data-section-id");
    if (id && scrollMap.has(id)) {
      el.scrollTop = scrollMap.get(id)!;
    }
  });

  const btnNewTask = document.getElementById(
    "btn-new-task",
  ) as HTMLButtonElement;
  if (btnNewTask && sections.length === 0) {
    btnNewTask.disabled = true;
    btnNewTask.style.opacity = "0.5";
    btnNewTask.style.cursor = "not-allowed";
  }

  const modalOverlay = document.getElementById("modal-overlay")!;
  const modalManage = document.getElementById("modal-manage-columns")!;
  const manageList = document.getElementById("manage-columns-list")!;
  const modalCreateTask = document.getElementById("modal-create-task")!;
  const modalDeleteCard = document.getElementById("modal-delete-card")!;
  const modalDeleteSection = document.getElementById("modal-delete-section")!;
  const modalCreateColumn = document.getElementById("modal-create-column")!;

  const deleteSectionModalName = document.getElementById(
    "delete-section-modal-name",
  )!;
  const btnConfirmDeleteSectionModal = document.getElementById(
    "btn-confirm-delete-section-modal",
  )!;

  const closeModals = () => {
    [
      modalManage,
      modalCreateTask,
      modalDeleteCard,
      modalDeleteSection,
      modalCreateColumn,
    ].forEach((m) => m?.classList.add("hidden"));
    modalOverlay.classList.add("hidden");
  };

  const openDeleteSectionModal = (
    name: string,
    onConfirm: () => Promise<void>,
  ) => {
    deleteSectionModalName.textContent = name;
    modalOverlay.classList.remove("hidden");
    modalDeleteSection.classList.remove("hidden");
    btnConfirmDeleteSectionModal.onclick = async () => {
      await onConfirm();
      closeModals();
    };
  };

  const renderManageList = () => {
    manageList.innerHTML = sections
      .map(
        (s: any) =>
          `<div class="manage-columns__item" data-id="${s.id}" draggable="true">
            <div class="manage-columns__left">
              <div class="manage-columns__dot" style="background: ${s.colorHex};"></div>
              <input type="text" class="manage-columns__name" value="${s.section_name}" data-id="${s.id}" placeholder="Имя колонки">
            </div>
            <div class="manage-columns__actions">
              <button class="icon-btn manage-columns__delete" data-id="${s.id}" data-name="${s.section_name}" title="Удалить">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5c5c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
              <div class="manage-columns__color-trigger" style="background: ${s.colorHex};" data-id="${s.id}"></div>
              <div class="manage-columns__drag">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="6" y1="9" x2="18" y2="9"></line>
                  <line x1="6" y1="15" x2="18" y2="15"></line>
                </svg>
              </div>
            </div>
          </div>`,
      )
      .join("");

    let draggedItem: HTMLElement | null = null;
    manageList
      .querySelectorAll(".manage-columns__item")
      .forEach((node: any) => {
        node.addEventListener("dragstart", () => {
          draggedItem = node;
          setTimeout(() => (node.style.opacity = "0.5"), 0);
        });
        node.addEventListener("dragend", async () => {
          node.style.opacity = "1";
          draggedItem = null;
          const newOrder = Array.from(
            manageList.querySelectorAll(".manage-columns__item"),
          ).map((i) => i.getAttribute("data-id") as string);
          try {
            await kanbanApi.reorderSections(boardId, { list_links: newOrder });
            cachedSections.sort(
              (a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id),
            );
          } catch (e) {
            Toast.error("Ошибка при сохранении порядка");
            renderKanban(appDiv);
          }
        });
        node.addEventListener("dragover", (e: any) => {
          e.preventDefault();
          if (e.currentTarget && e.currentTarget !== draggedItem) {
            const rect = e.currentTarget.getBoundingClientRect();
            const next = e.clientY - rect.top > rect.height / 2;
            manageList.insertBefore(
              draggedItem!,
              next ? e.currentTarget.nextSibling : e.currentTarget,
            );
          }
        });
      });

    manageList
      .querySelectorAll(".manage-columns__name")
      .forEach((input: any) => {
        input.addEventListener("blur", async () => {
          const id = input.getAttribute("data-id");
          const newName = input.value.trim();
          const section = sections.find((s: any) => s.id === id);
          if (section && newName && newName !== section.section_name) {
            const oldName = section.section_name;
            section.section_name = newName;
            try {
              await kanbanApi.updateSection(id, {
                ...section,
                section_link: id,
                section_name: newName,
              });
            } catch (err) {
              section.section_name = oldName;
              if (sections[0]?.id === id) {
                Toast.error("Нельзя изменять бэклог");
              }
              else Toast.error("Ошибка при сохранении");
              renderManageList();
            }
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

          const palette = Object.keys(colorMap);
          const picker = document.createElement("div");
          picker.className = "color-picker-bubble";
          picker.style.cssText = `position: absolute; z-index: 10001;`;
          picker.innerHTML = `<div class="color-picker-bubble__title">Цвета</div><div class="color-picker-bubble__grid">${palette.map((name) => `<div class="color-picker-bubble__dot ${section?.color === name ? "active" : ""}" data-color="${name}" style="background:${colorMap[name]}"></div>`).join("")}</div><div class="color-picker-bubble__footer"><button class="color-picker-bubble__btn color-picker-bubble__btn--cancel">Отмена</button><button class="color-picker-bubble__btn color-picker-bubble__btn--save">Сохранить</button></div>`;
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
                tempColor = dot.getAttribute("data-color") || "white";
              });
            });

          picker
            .querySelector(".color-picker-bubble__btn--cancel")
            ?.addEventListener("click", () => picker.remove());

          picker
            .querySelector(".color-picker-bubble__btn--save")
            ?.addEventListener("click", async () => {
              if (section && tempColor) {
                const oldColor = section.color;
                const oldColorHex = section.colorHex;

                section.color = tempColor;
                section.colorHex = colorMap[tempColor];
                trigger.style.background = colorMap[tempColor];

                const item = trigger.closest(".manage-columns__item");
                if (item) {
                  const dot = item.querySelector(
                    ".manage-columns__dot",
                  ) as HTMLElement;
                  if (dot) {
                    dot.style.background = colorMap[tempColor];
                  }
                }

                const boardColumnTitle = document.querySelector(
                  `.kanban__column[data-id="${id}"] .kanban__column-title`,
                ) as HTMLElement;
                if (boardColumnTitle) {
                  boardColumnTitle.style.color = colorMap[tempColor];
                  const boardDot = boardColumnTitle.querySelector(
                    ".kanban__col-dot",
                  ) as HTMLElement;
                  if (boardDot) {
                    boardDot.style.background = colorMap[tempColor];
                  }
                }

                picker.remove();
                try {
                  await kanbanApi.updateSection(id, {
                    ...section,
                    section_link: id,
                    color: tempColor,
                  });
                } catch (e) {
                  section.color = oldColor;
                  section.colorHex = oldColorHex;
                  trigger.style.background = oldColorHex;
                  if (item) {
                    const dot = item.querySelector(
                      ".manage-columns__dot",
                    ) as HTMLElement;
                    if (dot) {
                      dot.style.background = oldColorHex;
                    }
                  }
                  if (boardColumnTitle) {
                    boardColumnTitle.style.color = oldColorHex;
                    const boardDot = boardColumnTitle.querySelector(
                      ".kanban__col-dot",
                    ) as HTMLElement;
                    if (boardDot) {
                      boardDot.style.background = oldColorHex;
                    }
                  }
                  Toast.error("Ошибка сохранения цвета");
                }
              }
            });

          const closeOnOutside = (ev: MouseEvent) => {
            if (!picker.contains(ev.target as Node)) {
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

    manageList
      .querySelectorAll(".manage-columns__delete")
      .forEach((btn: any) => {
        btn.addEventListener("click", (e: MouseEvent) => {
          e.stopPropagation();
          const id = btn.getAttribute("data-id");
          const name = btn.getAttribute("data-name");
          const section = sections.find((s: any) => s.id === id);
          if (id && section) {
            if (sections[0]?.id === id) {
              Toast.error("Нельзя удалять бэклог");
              return;
            }
            modalManage.classList.add("hidden");
            openDeleteSectionModal(name || "", async () => {
              try {
                await kanbanApi.deleteSection(id);
                cachedSections = cachedSections.filter((s) => s.id !== id);
                renderKanban(appDiv, true);
              } catch (e) {
                Toast.error("Ошибка при удалении колонки");
              }
            });
          }
        });
      });
  };

  document
    .getElementById("btn-manage-columns")
    ?.addEventListener("click", () => {
      closeModals();
      renderManageList();
      modalOverlay.classList.remove("hidden");
      modalManage.classList.remove("hidden");
    });

  document.getElementById("btn-close-manage")?.addEventListener("click", () => {
    renderKanban(appDiv);
  });

  const createColNameInput = document.getElementById(
    "create-col-name",
  ) as HTMLInputElement;
  const createColMandatory = document.getElementById(
    "create-col-mandatory",
  ) as HTMLInputElement;
  const createColMax = document.getElementById(
    "create-col-max",
  ) as HTMLInputElement;
  const btnConfirmCreateColumn = document.getElementById(
    "btn-confirm-create-column",
  ) as HTMLButtonElement;
  let selectedColColor = "white";

  const openCreateColumnModal = () => {
    closeModals();
    modalOverlay.classList.remove("hidden");
    modalCreateColumn.classList.remove("hidden");

    if (createColNameInput) {
      createColNameInput.value = "";
    }
    if (createColMandatory) {
      createColMandatory.checked = false;
    }
    if (createColMax) {
      createColMax.value = "";
    }
    if (btnConfirmCreateColumn) {
      btnConfirmCreateColumn.disabled = true;
    }

    selectedColColor = "white";
    document
      .querySelectorAll(".create-column-form__color-btn")
      .forEach((btn) => {
        btn.classList.remove("active");
        if (btn.getAttribute("data-color") === "white") {
          btn.classList.add("active");
        }
      });
    setTimeout(() => {
      if (createColNameInput) {
        createColNameInput.focus();
      }
    }, 100);
  };

  document
    .getElementById("btn-add-column-modal")
    ?.addEventListener("click", openCreateColumnModal);
  document
    .getElementById("btn-add-column")
    ?.addEventListener("click", openCreateColumnModal);

  createColNameInput?.addEventListener("input", () => {
    btnConfirmCreateColumn.disabled = !createColNameInput.value.trim();
  });

  document.querySelectorAll(".create-column-form__color-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".create-column-form__color-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedColColor = btn.getAttribute("data-color") || "white";
    });
  });

  btnConfirmCreateColumn?.addEventListener("click", async () => {
    const name = createColNameInput.value.trim();
    if (!name) {
      return;
    }
    const maxTasks = parseInt(createColMax.value);

    try {
      btnConfirmCreateColumn.disabled = true;
      const res = (await kanbanApi.createSection({
        board_link: boardId,
        section_name: name,
        max_tasks: isNaN(maxTasks) || maxTasks <= 0 ? 100 : maxTasks,
        is_mandatory: createColMandatory.checked,
        color: selectedColColor,
      })) as any;

      const newSec = res.data || res;
      newSec.id = newSec.section_link || newSec.id;
      newSec.tasks = [];
      newSec.color = selectedColColor;
      newSec.colorHex = colorMap[selectedColColor] || selectedColColor;
      cachedSections.push(newSec);

      closeModals();
      renderKanban(appDiv);
    } catch (e) {
      Toast.error("Ошибка при создании колонки");
      btnConfirmCreateColumn.disabled = false;
    }
  });

  document
    .getElementById("nav-boards")
    ?.addEventListener("click", () => navigateTo("/boards"));
  document
    .getElementById("nav-profile")
    ?.addEventListener("click", () => navigateTo("/profile"));
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    try {
      await authApi.logout();
    } catch {}
    localStorage.removeItem("isAuth");
    navigateTo("/login");
  });

  document
    .querySelectorAll(".modal__close-btn")
    .forEach((btn) => btn.addEventListener("click", closeModals));

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      closeModals();
    }
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
      menu.innerHTML = `<div class="context-menu__item" id="ctx-edit-list">Изменить</div><div class="context-menu__item context-menu__item--danger" id="ctx-delete-list">Удалить колонку</div>`;
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
          const section = sections.find((s: any) => s.id === sectionId);
          if (sectionId && section) {
            if (sections[0]?.id === sectionId) {
              Toast.error("Нельзя удалять бэклог");
              return;
            }
            openDeleteSectionModal(section.section_name, async () => {
              try {
                await kanbanApi.deleteSection(sectionId);
                cachedSections = cachedSections.filter(
                  (s) => s.id !== sectionId,
                );
                renderKanban(appDiv, true);
              } catch (e) {
                Toast.error("Ошибка при удалении колонки");
              }
            });
          }
        });
    });
  });

  document.querySelectorAll(".kanban-card__options-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeMenu();
      const taskId = (e.currentTarget as HTMLElement).getAttribute("data-id");
      const title = (e.currentTarget as HTMLElement).getAttribute("data-title");
      const menu = document.createElement("div");
      menu.className = "context-menu";
      menu.innerHTML = `<div class="context-menu__item" id="ctx-edit-card">Открыть</div><div class="context-menu__item context-menu__item--danger" id="ctx-delete-card">Удалить карточку</div>`;
      const rect = btn.getBoundingClientRect();
      menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
      menu.style.left = `${rect.left + window.scrollX - 150}px`;
      document.body.appendChild(menu);
      activeMenu = menu;
      menu.querySelector("#ctx-edit-card")?.addEventListener("click", () => {
        if (taskId) {
          navigateTo(
            `/task?boardId=${boardId}&taskId=${taskId}&title=${encodeURIComponent(title || "")}`,
          );
        }
      });
      menu.querySelector("#ctx-delete-card")?.addEventListener("click", () => {
        document.getElementById("delete-card-name")!.textContent = title || "";
        modalOverlay.classList.remove("hidden");
        modalDeleteCard.classList.remove("hidden");
        (document.getElementById("btn-confirm-delete-card") as any).onclick =
          async () => {
            if (taskId) {
              try {
                await kanbanApi.deleteTask(taskId);
                cachedSections.forEach(
                  (s) =>
                    (s.tasks = s.tasks.filter((t: any) => t.id !== taskId)),
                );
                renderKanban(appDiv);
              } catch (e) {
                Toast.error("Ошибка при удалении");
              }
            }
          };
      });
    });
  });

  document.querySelectorAll(".kanban__add-card-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const parent = btn.parentElement!;
      const sectionId = parent.getAttribute("data-section-id")!;
      parent.innerHTML = `<div class="kanban__add-card-form"><textarea class="kanban__add-card-input" id="inline-new-task-${sectionId}" placeholder="Введите имя карточки..." maxlength="50" autofocus></textarea></div>`;
      const input = document.getElementById(
        `inline-new-task-${sectionId}`,
      ) as HTMLTextAreaElement;
      input.focus();
      const saveTask = async () => {
        const val = input.value.trim();
        if (val) {
          try {
            await kanbanApi.createTask({
              title: val,
              link_section: sectionId,
              description: "",
            });
            renderKanban(appDiv, true);
          } catch (e: any) {
            if (e.data?.message === "rich limit task") {
              Toast.error("Секция переполнена");
            } else {
              Toast.error("Ошибка создания карточки");
            }
            renderKanban(appDiv);
          }
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

  document.querySelectorAll(".kanban-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (
        (e.target as HTMLElement).closest(".kanban-card__options-btn") ||
        (e.target as HTMLElement).closest(".assignee__select-btn")
      )
        return;
      const taskId = card.getAttribute("data-id");
      const title = card.getAttribute("data-title") || "";
      navigateTo(
        `/task?boardId=${boardId}&taskId=${taskId}&title=${encodeURIComponent(title)}`,
      );
    });
  });

  const newTaskInput = document.getElementById(
    "new-task-title",
  ) as HTMLInputElement;
  const btnConfirmCreate = document.getElementById("btn-confirm-create-task")!;
  const modalAssigneeBtn = document.getElementById("assignee-select-btn");
  let selectedAssigneeId: string | null = null;

  if (btnNewTask) {
    btnNewTask.addEventListener("click", () => {
      closeModals();
      modalOverlay.classList.remove("hidden");
      modalCreateTask.classList.remove("hidden");
      newTaskInput.value = "";
      newTaskInput.focus();
      selectedAssigneeId = null;
      if (modalAssigneeBtn) {
        modalAssigneeBtn.textContent = "Выбрать...";
      }
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
      dropdown.style.cssText = `position: absolute; top: 100%; left: 0; width: 220px; background: #2a2a2c; border: 1px solid #444; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 1000; max-height: 200px; overflow-y: auto; margin-top: 4px;`;
      cachedBoardUsers.forEach((user) => {
        const item = document.createElement("div");
        item.className = "assignee-dropdown-item";
        item.style.cssText = `display: flex; align-items: center; padding: 8px; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid #333;`;
        if (user.id === selectedAssigneeId) {
          item.style.backgroundColor = "#3a3a3c";
        }
        item.innerHTML = `${user.avatarUrl ? `<img src="${user.avatarUrl}" class="assignee-avatar" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">` : `<div class="assignee-avatar" style="width:24px;height:24px;border-radius:50%;background:#8b5cf6;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;">${user.name.charAt(0).toUpperCase()}</div>`}<div class="assignee-info" style="display:flex;flex-direction:column;margin-left:8px;min-width:0;"><span class="assignee-name" style="color:white;font-weight:500;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${user.name}</span><span class="assignee-email" style="color:#888;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${user.email}</span></div>`;
        item.addEventListener("click", () => {
          selectedAssigneeId = user.id;
          modalAssigneeBtn.innerHTML = `<div style="display:flex;align-items:center;gap:8px;">${user.avatarUrl ? `<img src="${user.avatarUrl}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">` : `<div style="width:24px;height:24px;border-radius:50%;background:#8b5cf6;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;">${user.name.charAt(0).toUpperCase()}</div>`}<span style="color:white;font-size:14px;">${user.name}</span></div>`;
          dropdown.remove();
        });
        dropdown.appendChild(item);
      });
      modalAssigneeBtn.parentElement!.style.position = "relative";
      modalAssigneeBtn.parentElement!.appendChild(dropdown);
    });
  }
  btnConfirmCreate.addEventListener("click", async () => {
    const title = newTaskInput.value.trim();
    if (!title) {
      return;
    }
    try {
      await kanbanApi.createTask({
        title,
        link_section: sections[0].id,
        description: "",
        link_executer: selectedAssigneeId || null,
      });
      closeModals();
      renderKanban(appDiv, true);
    } catch (e: any) {
      if (e.data?.message === "rich limit task") {
        Toast.error("Секция переполнена");
      } else {
        Toast.error("Ошибка создания");
      }
    }
  });

  let draggedTaskId: string | null = null;
  let sourceSectionId: string | null = null;
  appDiv.querySelectorAll(".kanban-card").forEach((card) => {
    card.addEventListener("dragstart", (e: any) => {
      draggedTaskId = card.getAttribute("data-id");
      sourceSectionId =
        card
          .closest(".kanban__column-cards")
          ?.getAttribute("data-section-id") || null;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", draggedTaskId || "");
      }
      setTimeout(() => ((card as HTMLElement).style.opacity = "0.5"), 0);
    });
    card.addEventListener("dragend", () => {
      (card as HTMLElement).style.opacity = "1";
    });
  });
  appDiv.querySelectorAll(".kanban__column-cards").forEach((dropZone) => {
    dropZone.addEventListener("dragover", (e: any) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }
    });
    dropZone.addEventListener("drop", async (e: any) => {
      e.preventDefault();
      const targetSectionId = dropZone.getAttribute("data-section-id");
      if (
        draggedTaskId &&
        targetSectionId &&
        targetSectionId !== sourceSectionId
      ) {
        const cardEl = document.querySelector(
          `.kanban-card[data-id="${draggedTaskId}"]`,
        );
        if (cardEl) {
          dropZone.appendChild(cardEl);
        }
        const srcSec = cachedSections.find((s) => s.id === sourceSectionId);
        const tgtSec = cachedSections.find((s) => s.id === targetSectionId);
        let movedTask: any = null;
        if (srcSec && tgtSec) {
          const idx = srcSec.tasks.findIndex(
            (t: any) => t.id === draggedTaskId,
          );
          if (idx > -1) {
            movedTask = srcSec.tasks.splice(idx, 1)[0];
            tgtSec.tasks.push(movedTask);
          }
        }
        try {
          await kanbanApi.reorderTask(draggedTaskId, {
            link_card: draggedTaskId,
            link_section: targetSectionId,
            position: 1,
          });
        } catch (err: any) {
          if (err.data?.message === "can not skip mandatory section") {
            Toast.error("Нельзя пропускать обязательную секцию");
          } else if (err.data?.message === "rich limit task") {
            Toast.error("Секция переполнена");
          } else {
            Toast.error("Ошибка при переносе");
          }
          if (srcSec && tgtSec && movedTask) {
            const idx = tgtSec.tasks.findIndex(
              (t: any) => t.id === draggedTaskId,
            );
            if (idx > -1) {
              tgtSec.tasks.splice(idx, 1);
              srcSec.tasks.push(movedTask);
            }
          }
          renderKanban(appDiv);
        }
      }
    });
  });
};
