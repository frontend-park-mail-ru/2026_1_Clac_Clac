import Handlebars from "handlebars";
import kanbanTpl from "../../templates/kanban.hbs?raw";
import { KanbanState } from "./kanban.types";
import { navigateTo } from "../../router";
import { authApi } from "../../api";

import { KanbanDragAndDrop } from "./components/KanbanDragAndDrop";
import { KanbanContextMenus } from "./components/KanbanContextMenus";
import { KanbanTaskCreation } from "./components/KanbanTaskCreation";
import { KanbanColumnManager } from "./components/KanbanColumnManager";

const template = Handlebars.compile(kanbanTpl);

export class KanbanView {
  private appDiv: HTMLElement;
  private abortController: AbortController | null = null;

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
    this.appDiv.querySelectorAll<HTMLElement>(".kanban__column-cards").forEach((el) => {
      const id = el.getAttribute("data-section-id");
      if (id) scrollMap.set(id, el.scrollTop);
    });

    this.appDiv.innerHTML = template({ 
      board_name: state.boardName, 
      sections: state.sections 
    });

    this.appDiv.querySelectorAll<HTMLElement>(".kanban__column-cards").forEach((el) => {
      const id = el.getAttribute("data-section-id");
      if (id && scrollMap.has(id)) el.scrollTop = scrollMap.get(id)!;
    });

    this.attachEventListeners(state, this.abortController.signal);
  }

  private attachEventListeners(state: KanbanState, signal: AbortSignal): void {
    const closeModals = (): void => {
      this.appDiv.querySelectorAll(".modal, .manage-columns").forEach((m) => m.classList.add("hidden"));
      this.appDiv.querySelector("#modal-overlay")?.classList.add("hidden");
      document.querySelectorAll(".assignee-dropdown").forEach(dd => dd.remove());
      KanbanContextMenus.closeMenu();
    };

    document.getElementById("nav-boards")?.addEventListener("click", () => navigateTo("/boards"), { signal });
    document.getElementById("nav-profile")?.addEventListener("click", () => navigateTo("/profile"), { signal });
    document.getElementById("logout-btn")?.addEventListener("click", async () => {
      try { await authApi.logout(); } catch {}
      localStorage.removeItem("isAuth");
      navigateTo("/login");
    }, { signal });

    this.appDiv.querySelector("#modal-overlay")?.addEventListener("click", (e: Event) => {
      if (e.target === e.currentTarget) closeModals();
    }, { signal });
    
    this.appDiv.querySelectorAll(".modal__close-btn, #btn-close-manage").forEach((btn) =>
      btn.addEventListener("click", closeModals, { signal })
    );

    if (state.boardId) {
      KanbanColumnManager.bind(this.appDiv, state, closeModals, signal);
      KanbanTaskCreation.bind(this.appDiv, state, closeModals, signal);
      KanbanContextMenus.bind(this.appDiv, state, signal);
      KanbanDragAndDrop.bind(this.appDiv, state.boardId, signal);
    }
  }
}
