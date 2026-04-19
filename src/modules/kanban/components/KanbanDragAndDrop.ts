import { KanbanActions } from "../KanbanActions";

export class KanbanDragAndDrop {
  public static bind(appDiv: HTMLElement, boardId: string, signal: AbortSignal): void {
    let draggedTaskId: string | null = null;
    let sourceSectionId: string | null = null;

    appDiv.querySelectorAll<HTMLElement>(".kanban-card").forEach((card) => {
      card.addEventListener("dragstart", (e: DragEvent) => {
        draggedTaskId = card.getAttribute("data-id");
        sourceSectionId = card.closest(".kanban__column-cards")?.getAttribute("data-section-id") || null;

        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", draggedTaskId || "");
        }
        setTimeout(() => (card.style.opacity = "0.5"), 0);
      }, { signal });

      card.addEventListener("dragend", () => {
        card.style.opacity = "1";
      }, { signal });
    });

    appDiv.querySelectorAll<HTMLElement>(".kanban__column-cards").forEach((dropZone) => {
      dropZone.addEventListener("dragover", (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      }, { signal });

      dropZone.addEventListener("drop", (e: DragEvent) => {
        e.preventDefault();
        const targetSectionId = dropZone.getAttribute("data-section-id");

        if (draggedTaskId && targetSectionId && targetSectionId !== sourceSectionId) {
          const cardEl = document.querySelector(`.kanban-card[data-id="${draggedTaskId}"]`);
          if (cardEl) dropZone.appendChild(cardEl);

          KanbanActions.moveTask(boardId, draggedTaskId, targetSectionId);
        }
      }, { signal });
    });
  }
}
