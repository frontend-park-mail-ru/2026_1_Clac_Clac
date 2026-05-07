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

    appDiv.querySelector("#btn-close-manage")?.addEventListener("click", () => {
      closeModals();
    });
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
          <div class="manage-columns__dot bg-${s.color}"></div>
          <input type="text" class="manage-columns__name" value="${s.section_name}" data-id="${s.id}" placeholder="Имя колонки">
        </div>
        <div class="manage-columns__actions">
          <button class="icon-btn manage-columns__delete" data-id="${s.id}" data-name="${s.section_name}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5c5c" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
          <div class="manage-columns__color-trigger bg-${s.color}" data-id="${s.id}"></div>
          <div class="manage-columns__drag">≡</div>
        </div>
      </div>
    `).join("");

    let draggedItem: HTMLElement | null = null;

    container.querySelectorAll<HTMLElement>(".manage-columns__item").forEach((el) => {
      el.addEventListener("dragstart", () => {
        draggedItem = el;
        setTimeout(() => el.classList.add("kanban-card--dragging"), 0);
      });
      el.addEventListener("dragend", () => {
        el.classList.remove("kanban-card--dragging");
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
          KanbanActions.updateSection(id, {
            link: id,
            name: input.value.trim(),
            color: section.color || "white",
            max_tasks: section.max_tasks || 100,
            position: section.position || 1,
            is_mandatory: section.is_mandatory || false,
          });
        }
      });
    });

    container.querySelectorAll<HTMLElement>(".manage-columns__color-trigger").forEach((trigger) => {
      trigger.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        document.querySelector(".color-picker-dropdown")?.remove();

        const dropdown = document.createElement("div");
        dropdown.className = "color-picker-dropdown";

        const colors = [
          { name: "white" },
          { name: "grey" },
          { name: "red" },
          { name: "orange" },
          { name: "blue" },
          { name: "green" },
          { name: "purple" },
          { name: "pink" }
        ];

        colors.forEach(c => {
          const btn = document.createElement("button");
          btn.className = `color-picker-dropdown__btn bg-${c.name}`;
          btn.addEventListener("click", () => {
            const id = trigger.getAttribute("data-id")!;
            const section = sections.find((s) => s.id === id);
            if (section) {
              KanbanActions.updateSection(id, {
                link: id,
                name: section.section_name || "Секция",
                color: c.name,
                max_tasks: section.max_tasks || 100,
                position: section.position || 1,
                is_mandatory: section.is_mandatory || false,
              }).then(() => {
                dropdown.remove();
                trigger.className = `manage-columns__color-trigger bg-${c.name}`;
                (trigger.parentElement?.parentElement?.querySelector(".manage-columns__dot") as HTMLElement).className = `manage-columns__dot bg-${c.name}`;
              });
            }
          });
          dropdown.appendChild(btn);
        });

        const rect = trigger.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + window.scrollY + 8}px`;
        dropdown.style.left = `${rect.left + window.scrollX - 80}px`;
        document.body.appendChild(dropdown);

        const closeDropdown = (ev: MouseEvent) => {
          if (!dropdown.contains(ev.target as Node)) {
            dropdown.remove();
            document.removeEventListener("click", closeDropdown);
          }
        };
        setTimeout(() => document.addEventListener("click", closeDropdown), 0);
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
