import Handlebars from "handlebars";
import boardsTpl from "../../templates/boards.hbs?raw";
import { BoardsState } from "./boards.types";
import { navigateTo } from "../../router";
import { BoardsActions } from "./BoardsActions";

const template = Handlebars.compile(boardsTpl);

export class BoardsView {
  private appDiv: HTMLElement;
  private abortController: AbortController | null = null;
  private currentBoardId: string | null = null;
  private currentBoardName: string | null = null;

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
  }

  setAppDiv(appDiv: HTMLElement): void {
    this.appDiv = appDiv;
  }

  render(state: BoardsState): void {
    if (state.isLoading) {
      return;
    }

    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    this.appDiv.innerHTML = template({
      boards: state.boards,
      user: state.user,
    });
    this.attachEventListeners(this.abortController.signal);
  }

  private attachEventListeners(signal: AbortSignal): void {
    const modalOverlay = this.appDiv.querySelector<HTMLElement>("#modal-overlay");
    const modalCreate = this.appDiv.querySelector<HTMLElement>("#modal-create-board");
    const modalEdit = this.appDiv.querySelector<HTMLElement>("#modal-edit-board");
    const modalDelete = this.appDiv.querySelector<HTMLElement>("#modal-delete-board");

    const closeModals = (): void => {
      [modalOverlay, modalCreate, modalEdit, modalDelete].forEach((m) =>
        m?.classList.add("hidden")
      );
    };

    document.getElementById("nav-profile")?.addEventListener("click", () => navigateTo("/profile"), { signal });
    document.getElementById("logout-btn")?.addEventListener("click", () => BoardsActions.logout(), { signal });

    this.appDiv.querySelectorAll(".modal__close-btn").forEach((btn) =>
      btn.addEventListener("click", (e: Event) => {
        e.preventDefault();
        closeModals();
      }, { signal })
    );

    if (modalOverlay) {
      modalOverlay.addEventListener("click", (e: MouseEvent) => {
        if (e.target === modalOverlay) closeModals();
      }, { signal });
    }

    const btnConfirmCreate = this.appDiv.querySelector<HTMLButtonElement>("#btn-confirm-create");
    const inputNewBoard = this.appDiv.querySelector<HTMLInputElement>("#new-board-name");
    const errorNewBoard = this.appDiv.querySelector<HTMLElement>("#new-board-name-error");
    const createImgInput = this.appDiv.querySelector<HTMLInputElement>("#create-board-image");
    const createImgName = this.appDiv.querySelector<HTMLElement>("#create-board-image-name");

    const openCreateModal = (): void => {
      modalOverlay?.classList.remove("hidden");
      modalCreate?.classList.remove("hidden");
      if (inputNewBoard) inputNewBoard.value = "";
      if (createImgInput) createImgInput.value = "";
      if (createImgName) createImgName.textContent = "Изображение доски";
      if (btnConfirmCreate) btnConfirmCreate.disabled = true;
    };

    this.appDiv.querySelector("#btn-create-board")?.addEventListener("click", openCreateModal, { signal });
    this.appDiv.querySelector("#btn-create-board-empty")?.addEventListener("click", openCreateModal, { signal });

    createImgInput?.addEventListener("change", (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && createImgName) createImgName.textContent = file.name;
    }, { signal });

    inputNewBoard?.addEventListener("input", () => {
      const val = inputNewBoard.value.trim();
      if (val) {
        errorNewBoard?.classList.remove("modal__input-error--visible");
        inputNewBoard.classList.remove("modal__input-field--error");
        if (btnConfirmCreate) btnConfirmCreate.disabled = false;
      } else {
        errorNewBoard?.classList.add("modal__input-error--visible");
        inputNewBoard.classList.add("modal__input-field--error");
        if (btnConfirmCreate) btnConfirmCreate.disabled = true;
      }
    }, { signal });

    btnConfirmCreate?.addEventListener("click", async () => {
      const name = inputNewBoard?.value.trim();
      if (!name) return;

      btnConfirmCreate.disabled = true;
      const file = createImgInput?.files?.[0];

      await BoardsActions.createBoard(name, "Создаём аналог Trello", file);
      closeModals();
    }, { signal });

    const editBoardNameInput = this.appDiv.querySelector<HTMLInputElement>("#edit-board-name");
    const btnConfirmEdit = this.appDiv.querySelector<HTMLButtonElement>("#btn-confirm-edit");
    const editImgInput = this.appDiv.querySelector<HTMLInputElement>("#edit-board-image");
    const editImgName = this.appDiv.querySelector<HTMLElement>("#edit-board-image-name");

    const checkEditChanges = (): void => {
      if (!btnConfirmEdit) return;
      const nameChanged = editBoardNameInput?.value.trim() !== this.currentBoardName;
      const imageSelected = !!editImgInput?.files?.length;
      const nameEmpty = !editBoardNameInput?.value.trim();
      btnConfirmEdit.disabled = nameEmpty || (!nameChanged && !imageSelected);
    };

    editImgInput?.addEventListener("change", (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && editImgName) editImgName.textContent = file.name;
      checkEditChanges();
    }, { signal });

    editBoardNameInput?.addEventListener("input", checkEditChanges, { signal });

    this.appDiv.querySelectorAll(".board-card__options-btn").forEach((btn) => {
      btn.addEventListener("click", (e: Event) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        this.currentBoardId = target.getAttribute("data-id");
        this.currentBoardName = target.getAttribute("data-name");

        if (editBoardNameInput) editBoardNameInput.value = this.currentBoardName || "";
        if (editImgInput) editImgInput.value = "";
        if (editImgName) editImgName.textContent = "Изображение доски";
        if (btnConfirmEdit) btnConfirmEdit.disabled = true;

        modalOverlay?.classList.remove("hidden");
        modalEdit?.classList.remove("hidden");
      }, { signal });
    });

    btnConfirmEdit?.addEventListener("click", async () => {
      const name = editBoardNameInput?.value.trim();
      if (!this.currentBoardId || !name) return;

      btnConfirmEdit.disabled = true;
      const file = editImgInput?.files?.[0];

      await BoardsActions.updateBoard(this.currentBoardId, name, "Создаём аналог Trello", file);
      closeModals();
    }, { signal });

    const btnOpenDelete = this.appDiv.querySelector<HTMLButtonElement>("#btn-open-delete");
    const btnConfirmDelete = this.appDiv.querySelector<HTMLButtonElement>("#btn-confirm-delete");

    btnOpenDelete?.addEventListener("click", () => {
      modalEdit?.classList.add("hidden");
      modalDelete?.classList.remove("hidden");
      const deleteBoardName = this.appDiv.querySelector("#delete-board-name");
      if (deleteBoardName && this.currentBoardName) {
        deleteBoardName.textContent = this.currentBoardName;
      }
    }, { signal });

    btnConfirmDelete?.addEventListener("click", async () => {
      if (!this.currentBoardId) return;
      btnConfirmDelete.disabled = true;

      await BoardsActions.deleteBoard(this.currentBoardId);
      closeModals();
    }, { signal });

    this.appDiv.querySelectorAll(".board-card[data-id]").forEach((card) => {
      card.addEventListener("click", (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.closest(".board-card__options-btn")) return;
        
        const id = card.getAttribute("data-id");
        if (id) navigateTo(`/board?id=${id}`);
      }, { signal });
    });
  }
}
