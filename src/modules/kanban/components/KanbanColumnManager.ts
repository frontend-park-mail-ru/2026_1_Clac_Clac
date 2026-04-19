import { KanbanActions } from "../KanbanActions";
import { KanbanState, Section } from "../kanban.types";
import { Toast } from "../../../utils/toast";

export class KanbanColumnManager {
  public static bind(appDiv: HTMLElement, state: KanbanState, closeModals: () => void, signal: AbortSignal): void {
    this.bindCreation(appDiv, state.boardId!, closeModals, signal);

    const btnManage = appDiv.querySelector("#btn-manage-columns");
    const modalManage = appDiv.querySelector<HTMLElement>("#modal-manage-columns");
    const modalOverlay = appDiv.querySelector<HTMLElement>("#modal-overlay");
    const manageList = appDiv.querySelector<HTMLElement>("#manage-columns-list");

    btnManage?.addEventListener("click", () => {
      closeModals();
      if (manageList) this.renderManageList(state.boardId!, state.sections, manageList);
      modalOverlay?.classList.remove("hidden");
      modalManage?.classList.remove("hidden");
    }, { signal });
  }

  private static bindCreation(appDiv: HTMLElement, boardId: string, closeModals: () => void, signal: AbortSignal): void {
    const modalCreateColumn = appDiv.querySelector<HTMLElement>("#modal-create-column");
    const modalOverlay = appDiv.querySelector<HTMLElement>("#modal-overlay");
    const inputName = appDiv.querySelector<HTMLInputElement>("#create-col-name");
    const inputMax = appDiv.querySelector<HTMLInputElement>("#create-col-max");
    const inputMandatory = appDiv.querySelector<HTMLInputElement>("#create-col-mandatory");
    const btnCreate = appDiv.querySelector<HTMLButtonElement>("#btn-confirm-create-column");
    let selectedColor = "white";

    const openCreateColumn = () => {
      closeModals();
      modalOverlay?.classList.remove("hidden");
      modalCreateColumn?.classList.remove("hidden");
      if (inputName) inputName.value = "";
      if (inputMax) inputMax.value = "";
      if (inputMandatory) inputMandatory.checked = false;
      if (btnCreate) btnCreate.disabled = true;
      setTimeout(() => inputName?.focus(), 100);
    };

    appDiv.querySelector("#btn-add-column")?.addEventListener("click", openCreateColumn, { signal });
    appDiv.querySelector("#btn-add-column-modal")?.addEventListener("click", openCreateColumn, { signal });

    inputName?.addEventListener("input", () => {
      if (btnCreate) btnCreate.disabled = !inputName.value.trim();
    }, { signal });

    appDiv.querySelectorAll<HTMLButtonElement>(".create-column-form__color-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        appDiv.querySelectorAll(".create-column-form__color-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        selectedColor = btn.getAttribute("data-color") || "white";
      }, { signal });
    });

    btnCreate?.addEventListener("click", () => {
      const name = inputName?.value.trim();
      if (!name) return;
      const max = parseInt(inputMax?.value || "", 10);

      btnCreate.disabled = true;
      KanbanActions.createSection(boardId, name, isNaN(max) || max <= 0 ? 100 : max, inputMandatory?.checked || false, selectedColor);
      closeModals();
    }, { signal });
  }

  private static renderManageList(boardId: string, sections: Section[], container: HTMLElement): void {
    container.innerHTML = sections.map((s) => `
      <div class="manage-columns__item" data-id="${s.id}" draggable="true">
        <div class="manage-columns__left">
          <div class="manage-columns__dot" style="background: ${s.colorHex};"></div>
          <input type="text" class="manage-columns__name" value="${s.section_name}" data-id="${s.id}" placeholder="Имя колонки">
        </div>
        <div class="manage-columns__actions">
          <button class="icon-btn manage-columns__delete" data-id="${s.id}" data-name="${s.section_name}">Удалить</button>
          <div class="manage-columns__color-trigger" style="background: ${s.colorHex};" data-id="${s.id}"></div>
          <div class="manage-columns__drag">≡</div>
        </div>
      </div>
    `).join("");

    let draggedItem: HTMLElement | null = null;

    container.querySelectorAll<HTMLElement>(".manage-columns__item").forEach((el) => {
      el.addEventListener("dragstart", () => {
        draggedItem = el;
        setTimeout(() => el.style.opacity = "0.5", 0);
      });
      el.addEventListener("dragend", () => {
        el.style.opacity = "1";
        draggedItem = null;
        const newOrder = Array.from(container.querySelectorAll(".manage-columns__item")).map(i => i.getAttribute("data-id")!);
        KanbanActions.reorderSections(boardId, newOrder);
      });
      el.addEventListener("dragover", (e: DragEvent) => {
        e.preventDefault();
        const target = e.currentTarget as HTMLElement;
        if (target && target !== draggedItem) {
          const rect = target.getBoundingClientRect();
          const next = e.clientY - rect.top > rect.height / 2;
          container.insertBefore(draggedItem!, next ? target.nextSibling : target);
        }
      });
    });

    container.querySelectorAll<HTMLInputElement>(".manage-columns__name").forEach((input) => {
      input.addEventListener("blur", () => {
        const id = input.getAttribute("data-id")!;
        const section = sections.find((s) => s.id === id);
        if (section && input.value.trim() && input.value.trim() !== section.section_name) {
          KanbanActions.updateSection(id, { section_name: input.value.trim(), section_link: id });
        }
      });
    });

    container.querySelectorAll<HTMLButtonElement>(".manage-columns__delete").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id")!;
        if (sections[0]?.id === id) return Toast.error("Нельзя удалять бэклог");
        KanbanActions.deleteSection(boardId, id);

        document.querySelector("#modal-manage-columns")?.classList.add("hidden");
        document.querySelector("#modal-overlay")?.classList.add("hidden");
      });
    });
  }
}
