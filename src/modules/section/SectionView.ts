import Handlebars from "handlebars";
import sectionTpl from "../../templates/section.hbs?raw";
import { sectionStore } from "./SectionStore";
import { SectionActions } from "./SectionActions";
import { navigateTo } from "../../router";
import { renderKanban } from "../../pages/kanban";

const template = Handlebars.compile(sectionTpl);

export class SectionView {
  private appDiv: HTMLElement;
  private overlayContainer: HTMLElement | null = null;
  private boundUpdate: () => void;
  private boundGlobalClick: (e: MouseEvent) => void;
  private isInitialRender: boolean = true;

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
    this.boundUpdate = this.update.bind(this);
    this.boundGlobalClick = this.handleGlobalClick.bind(this);
  }

  public async mount() {
    SectionActions.resetState();
    this.isInitialRender = true;

    const urlParams = new URLSearchParams(window.location.search);
    const sectionId = urlParams.get("sectionId");
    const boardId = urlParams.get("boardId");

    if (!sectionId || sectionId === "null" || !boardId || boardId === "null") {
      return navigateTo("/boards");
    }

    try {
      await renderKanban(this.appDiv);
    } catch (err) {
      console.error("Board render error", err);
    }

    this.overlayContainer = document.createElement("div");
    this.overlayContainer.id = "section-overlay-container";
    this.appDiv.appendChild(this.overlayContainer);

    sectionStore.on('change', this.boundUpdate);
    document.addEventListener("click", this.boundGlobalClick);

    SectionActions.fetchSection(boardId, sectionId);
  }

  public unmount() {
    sectionStore.off('change', this.boundUpdate);
    document.removeEventListener("click", this.boundGlobalClick);

    if (this.overlayContainer) {
      this.overlayContainer.remove();
      this.overlayContainer = null;
    }
    document.querySelector(".context-menu")?.remove();
  }

  private update() {
    const state = sectionStore.getState();

    if (state.isLoading || !state.sectionData || !this.overlayContainer) {
      return;
    }

    if (this.isInitialRender) {
      this.isInitialRender = false;
      this.overlayContainer.innerHTML = template({
        board_name: state.boardName,
        section: state.sectionData,
      });
      this.attachListeners();
    }

    this.updateUI(state);
  }

  private attachListeners() {
    if (!this.overlayContainer) return;

    this.overlayContainer.querySelector("#btn-save-section")?.addEventListener("click", () => {
      const name = (this.overlayContainer?.querySelector("#section-name-input") as HTMLInputElement).value.trim();
      const maxTasks = parseInt((this.overlayContainer?.querySelector("#section-max-tasks-input") as HTMLInputElement).value);
      const isMandatory = (this.overlayContainer?.querySelector("#section-mandatory-input") as HTMLInputElement).checked;

      SectionActions.updateSection(name, maxTasks, isMandatory);
    });

    this.overlayContainer.querySelector("#btn-back-section")?.addEventListener("click", () => {
      const boardId = sectionStore.getState().boardId;
      navigateTo(`/board?id=${boardId}`);
    });

    this.overlayContainer.querySelector("#section-overlay")?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        const boardId = sectionStore.getState().boardId;
        navigateTo(`/board?id=${boardId}`);
      }
    });

    const colorSquares = this.overlayContainer.querySelectorAll(".color-square");
    colorSquares.forEach((square) => {
      square.addEventListener("click", () => {
        const squareColor = square.getAttribute("data-color");
        if (squareColor) {
          SectionActions.setColor(squareColor);
        }
      });
    });

    this.overlayContainer.querySelector("#btn-section-options")?.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelector(".context-menu")?.remove();

      const menu = document.createElement("div");
      menu.className = "context-menu";
      menu.innerHTML = `<div class="context-menu__item context-menu__item--danger" id="ctx-delete-section">Удалить секцию</div>`;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
      menu.style.left = `${rect.left + window.scrollX - 150}px`;

      document.body.appendChild(menu);

      menu.querySelector("#ctx-delete-section")?.addEventListener("click", () => {
        const nameInput = this.overlayContainer?.querySelector("#section-name-input") as HTMLInputElement;
        const deleteNameEl = this.overlayContainer?.querySelector("#delete-section-name") as HTMLElement;
        if (deleteNameEl && nameInput) {
          deleteNameEl.textContent = nameInput.value;
        }

        SectionActions.setDeleteModalOpen(true);
        menu.remove();
      });
    });

    this.overlayContainer.querySelectorAll(".modal__close-btn").forEach((btn) =>
      btn.addEventListener("click", () => SectionActions.setDeleteModalOpen(false))
    );

    this.overlayContainer.querySelector("#btn-confirm-delete-section")?.addEventListener("click", () => {
      SectionActions.deleteSection();
    });
  }

  private updateUI(state: any) {
    if (!this.overlayContainer) return;

    const btnSave = this.overlayContainer.querySelector("#btn-save-section") as HTMLButtonElement;
    if (btnSave) {
      if (state.isSaving) {
        btnSave.disabled = true;
        btnSave.textContent = "Сохранение...";
      } else {
        btnSave.disabled = false;
        btnSave.textContent = "Сохранить";
      }
    }

    const colorSquares = this.overlayContainer.querySelectorAll(".color-square");
    colorSquares.forEach((square) => {
      if (square.getAttribute("data-color") === state.selectedColor) {
        square.classList.add("active");
      } else {
        square.classList.remove("active");
      }
    });

    const modalOverlay = this.overlayContainer.querySelector("#modal-overlay-section");
    const modalDelete = this.overlayContainer.querySelector("#modal-delete-section");

    if (modalOverlay && modalDelete) {
      if (state.isDeleteModalOpen) {
        modalOverlay.classList.remove("hidden");
        modalDelete.classList.remove("hidden");
      } else {
        modalOverlay.classList.add("hidden");
        modalDelete.classList.add("hidden");
      }
    }
  }

  private handleGlobalClick() {
    document.querySelector(".context-menu")?.remove();
  }
}
