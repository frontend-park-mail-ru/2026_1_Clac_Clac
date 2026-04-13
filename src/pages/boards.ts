import Handlebars from "handlebars";
import { authApi, boardsApi } from "../api";
import boardsTpl from "../templates/boards.hbs?raw";
import { navigateTo } from "../router";

const template = Handlebars.compile(boardsTpl);

interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

interface RawBoard {
  id: string;
  link: string;
  name: string;
  board_name: string;
  title: string;
  description: string;
  background: string;
  backlog: number;
  hot: number;
  members: number;
}

interface Board {
  id: string;
  board_name: string;
  description: string;
  background: string;
  backlog: number;
  hot: number;
  members: number;
}

let localBoards: Board[] = [];
let currentUser: User | null = null;
let eventController: AbortController | null = null;

/**
 * Отрисовывает главную страницу со списком досок проекта.
 *
 * @param {HTMLElement} appDiv - DOM-контейнер, в который будет встроен HTML-код страницы.
 */
export const renderBoards = async (appDiv: HTMLElement): Promise<void> => {
  const success = await loadData();
  if (!success) {
    return;
  }

  /**
   * Обновляет UI интерфейс досок, перерисовывая шаблон и перенавешивая слушатели.
   */
  const updateUI = (): void => {
    if (eventController) {
      eventController.abort();
    }
    eventController = new AbortController();

    appDiv.innerHTML = template({ boards: localBoards, user: currentUser });

    const reloadBoards = async () => {
      await renderBoards(appDiv);
    };

    attachEventListeners(appDiv, reloadBoards, eventController.signal);
  };
  updateUI();
};

/**
 * Асинхронно загружает данные пользователя и список досок с сервера.
 * В случае ошибки 401 автоматически перенаправляет пользователя на страницу входа.
 *
 * @returns {Promise<boolean>} Возвращает `true`, если данные успешно загружены, или `false`, если произошла критическая ошибка.
 */
async function loadData(): Promise<boolean> {
  try {
    const res = (await boardsApi.getBoards()) as any;
    let rawBoards: Partial<RawBoard>[] = [];
    if (res && res.data) {
      rawBoards = Array.isArray(res.data) ? res.data : [res.data];
    } else if (Array.isArray(res)) {
      rawBoards = res;
    }

    localBoards = rawBoards.map((board) => ({
      id: board.link || board.id || "",
      board_name:
        board.name || board.board_name || board.title || "Без названия",
      description: board.description || "Без описания",
      background: board.background || "",
      backlog: board.backlog || 0,
      hot: board.hot || 0,
      members: board.members || 0,
    }));
    return true;
  } catch (err: any) {
    if (err.status === 401) {
      localStorage.removeItem("isAuth");
      navigateTo("/login");
      return false;
    }
    return true;
  }
}

/**
 * Инициализирует и прикрепляет слушатели событий на странице со списком досок.
 *
 * @param {HTMLElement} appDiv - DOM-контейнер страницы.
 * @param {Function} reloadBoards - Функция для полного обновления данных и интерфейса.
 * @param {AbortSignal} abortSignal - Сигнал от AbortController для своевременной отписки от глобальных событий.
 */
const attachEventListeners = (
  appDiv: HTMLElement,
  reloadBoards: () => Promise<void>,
  abortSignal: AbortSignal,
): void => {
  const modalOverlay = appDiv.querySelector<HTMLElement>("#modal-overlay");
  const modalCreate = appDiv.querySelector<HTMLElement>("#modal-create-board");
  const modalEdit = appDiv.querySelector<HTMLElement>("#modal-edit-board");
  const modalDelete = appDiv.querySelector<HTMLElement>("#modal-delete-board");

  let currentBoardId: string | null = null;
  let currentBoardName: string | null = null;

  document
    .getElementById("nav-profile")
    ?.addEventListener("click", () => navigateTo("/profile"), {
      signal: abortSignal,
    });
  document.getElementById("logout-btn")?.addEventListener(
    "click",
    async () => {
      try {
        await authApi.logout();
      } catch (err) {
        console.error("Logout error", err);
      }
      localStorage.removeItem("isAuth");
      navigateTo("/login");
    },
    { signal: abortSignal },
  );

  const closeModals = (): void => {
    [modalOverlay, modalCreate, modalEdit, modalDelete].forEach((m) => {
      if (m) {
        m.classList.add("hidden");
      }
    });
  };

  appDiv.querySelectorAll(".modal__close-btn").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      closeModals();
    }),
  );

  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e: MouseEvent) => {
      if (e.target === modalOverlay) {
        closeModals();
      }
    });
  }

  const createImgInput = appDiv.querySelector<HTMLInputElement>(
    "#create-board-image",
  );
  const createImgName = appDiv.querySelector<HTMLElement>(
    "#create-board-image-name",
  );
  createImgInput?.addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file && createImgName) {
      createImgName.textContent = file.name;
    }
  });

  const editImgInput =
    appDiv.querySelector<HTMLInputElement>("#edit-board-image");
  const editImgName = appDiv.querySelector<HTMLElement>(
    "#edit-board-image-name",
  );
  editImgInput?.addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file && editImgName) {
      editImgName.textContent = file.name;
    }
  });

  const openCreateModal = () => {
    modalOverlay?.classList.remove("hidden");
    modalCreate?.classList.remove("hidden");
    const inputNewBoard =
      appDiv.querySelector<HTMLInputElement>("#new-board-name");
    const errorNewBoard = appDiv.querySelector<HTMLElement>(
      "#new-board-name-error",
    );
    const btnConfirmCreate = appDiv.querySelector<HTMLButtonElement>(
      "#btn-confirm-create",
    );

    if (inputNewBoard) {
      inputNewBoard.value = "";
      inputNewBoard.classList.remove("modal__input-field--error");
    }
    if (errorNewBoard) {
      errorNewBoard.classList.remove("modal__input-error--visible");
    }
    if (createImgInput) {
      createImgInput.value = "";
    }
    if (createImgName) {
      createImgName.textContent = "Изображение доски";
    }

    if (btnConfirmCreate) {
      btnConfirmCreate.disabled = true;
    }
  };

  appDiv
    .querySelector("#btn-create-board")
    ?.addEventListener("click", openCreateModal);
  appDiv
    .querySelector("#btn-create-board-empty")
    ?.addEventListener("click", openCreateModal);

  const inputNewBoard =
    appDiv.querySelector<HTMLInputElement>("#new-board-name");
  const errorNewBoard = appDiv.querySelector<HTMLElement>(
    "#new-board-name-error",
  );
  const btnConfirmCreate = appDiv.querySelector<HTMLButtonElement>(
    "#btn-confirm-create",
  );

  inputNewBoard?.addEventListener("input", () => {
    const val = inputNewBoard.value.trim();
    if (val) {
      if (errorNewBoard) {
        errorNewBoard.classList.remove("modal__input-error--visible");
      }
      if (btnConfirmCreate) {
        btnConfirmCreate.disabled = false;
      }
      inputNewBoard.classList.remove("modal__input-field--error");
    } else {
      if (errorNewBoard) {
        errorNewBoard.classList.add("modal__input-error--visible");
      }
      if (btnConfirmCreate) {
        btnConfirmCreate.disabled = true;
      }
      inputNewBoard.classList.add("modal__input-field--error");
    }
  });

  btnConfirmCreate?.addEventListener("click", async () => {
    const boardName = inputNewBoard?.value.trim();
    if (!boardName) {
      return;
    }
    try {
      btnConfirmCreate.disabled = true;
      const res = (await boardsApi.createBoard({
        name: boardName,
        description: "Создаём аналог Trello",
      })) as any;
      const newBoardId = res.data?.link;

      const file = createImgInput?.files?.[0];
      if (file && newBoardId) {
        const fd = new FormData();
        fd.append("background", file);
        await boardsApi.updateBoardBackground(newBoardId, fd);
      }

      closeModals();
      await reloadBoards();
    } catch (err) {
      console.error("Create error", err);
    } finally {
      btnConfirmCreate.disabled = false;
    }
  });

  const editBoardNameInput =
    appDiv.querySelector<HTMLInputElement>("#edit-board-name");
  const btnConfirmEdit =
    appDiv.querySelector<HTMLButtonElement>("#btn-confirm-edit");
  const btnOpenDelete =
    appDiv.querySelector<HTMLButtonElement>("#btn-open-delete");
  const btnConfirmDelete = appDiv.querySelector<HTMLButtonElement>(
    "#btn-confirm-delete",
  );

  appDiv.querySelectorAll(".board-card__options-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).getAttribute("data-id")!;
      const name = (e.currentTarget as HTMLElement).getAttribute("data-name")!;
      currentBoardId = id;
      currentBoardName = name;

      if (editBoardNameInput) {
        editBoardNameInput.value = name;
        editBoardNameInput.placeholder = "Например, Запуск продукта";
      }
      if (editImgInput) {
        editImgInput.value = "";
      }
      if (editImgName) {
        editImgName.textContent = "Изображение доски";
      }

      if (btnConfirmEdit) {
        btnConfirmEdit.disabled = false;
      }

      modalOverlay?.classList.remove("hidden");
      modalEdit?.classList.remove("hidden");
    });
  });

  editBoardNameInput?.addEventListener("input", () => {
    const val = editBoardNameInput.value.trim();
    if (val) {
      if (btnConfirmEdit) {
        btnConfirmEdit.disabled = false;
      }
    } else {
      if (btnConfirmEdit) {
        btnConfirmEdit.disabled = true;
      }
    }
  });

  btnConfirmEdit?.addEventListener("click", async () => {
    const name = editBoardNameInput?.value.trim();
    if (!currentBoardId) {
      return;
    }
    try {
      btnConfirmEdit.disabled = true;
      if (name) {
        await boardsApi.updateBoard(currentBoardId, {
          name: name,
          description: "Создаём аналог Trello",
        });
      }

      const file = editImgInput?.files?.[0];
      if (file) {
        const fd = new FormData();
        fd.append("background", file);
        await boardsApi.updateBoardBackground(currentBoardId, fd);
      }
      closeModals();
      await reloadBoards();
    } finally {
      btnConfirmEdit.disabled = false;
    }
  });

  btnOpenDelete?.addEventListener("click", () => {
    modalEdit?.classList.add("hidden");
    modalDelete?.classList.remove("hidden");
    const deleteBoardName = appDiv.querySelector("#delete-board-name");
    if (deleteBoardName && currentBoardName) {
      deleteBoardName.textContent = currentBoardName;
    }
  });

  btnConfirmDelete?.addEventListener("click", async () => {
    if (!currentBoardId) {
      return;
    }
    try {
      btnConfirmDelete.disabled = true;
      await boardsApi.deleteBoard(currentBoardId);
      closeModals();
      await reloadBoards();
      currentBoardId = null;
      currentBoardName = null;
    } catch (err) {
      console.error("Delete board error", err);
    } finally {
      btnConfirmDelete.disabled = false;
    }
  });

  appDiv.querySelectorAll(".board-card[data-id]").forEach((card) => {
    card.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest(".board-card__options-btn")) {
        return;
      }
      const id = card.getAttribute("data-id");
      if (id) {
        navigateTo(`/board?id=${id}`);
      }
    });
  });
};
