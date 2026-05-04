import { KanbanActions } from "../KanbanActions";

export class KanbanDragAndDrop {
  public static bind(appDiv: HTMLElement, boardId: string, signal: AbortSignal): void {
    let draggedTaskId: string | null = null;
    let sourceSectionId: string | null = null;
    let draggedElement: HTMLElement | null = null;
    let initialIndex: number | null = null;

    appDiv.querySelectorAll<HTMLElement>(".kanban-card").forEach((card) => {
      card.addEventListener("dragstart", (e: DragEvent) => {
        draggedTaskId = card.getAttribute("data-id");
        draggedElement = card;

        const columnCards = card.closest(".kanban__column-cards");
        sourceSectionId = columnCards?.getAttribute("data-section-id") || null;
        initialIndex = columnCards ? Array.from(columnCards.querySelectorAll(".kanban-card")).indexOf(card) : null;

        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", draggedTaskId || "");
        }
        setTimeout(() => (card.classList.add("kanban-card--dragging")), 0);
      }, { signal });

      card.addEventListener("dragend", () => {
        if (draggedElement) draggedElement.classList.remove("kanban-card--dragging");
        draggedElement = null;
        draggedTaskId = null;
        sourceSectionId = null;
      }, { signal });
    });

    appDiv.querySelectorAll<HTMLElement>(".kanban__column-cards").forEach((dropZone) => {
      dropZone.addEventListener("dragover", (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

        if (!draggedElement) return;

        const targetCard = (e.target as HTMLElement).closest(".kanban-card") as HTMLElement;
        const isDifferentCard = targetCard && targetCard !== draggedElement;
        if (isDifferentCard) {
          const rect = targetCard.getBoundingClientRect();
          const middleY = rect.top + rect.height / 2;
          const shouldInsertAfter = e.clientY > middleY;
          dropZone.insertBefore(draggedElement, shouldInsertAfter ? targetCard.nextSibling : targetCard);
        } else {
          const targetDropZone = (e.target as HTMLElement).closest('.kanban__column-cards');
          const isTargetDropZone = e.target === dropZone || targetDropZone === dropZone;
          if (isTargetDropZone) {
            if (!dropZone.contains(draggedElement)) {
              dropZone.appendChild(draggedElement);
            }
          }
        }
      }, { signal });

      dropZone.addEventListener("drop", (e: DragEvent) => {
        e.preventDefault();
        const targetSectionId = dropZone.getAttribute("data-section-id");

        if (draggedTaskId && targetSectionId && draggedElement) {
          const cards = Array.from(dropZone.querySelectorAll(".kanban-card"));

          const position = cards.indexOf(draggedElement);
          const oldPosition = initialIndex !== null ? initialIndex : -1;

          if (targetSectionId !== sourceSectionId || position !== oldPosition) {
            KanbanActions.moveTask(boardId, draggedTaskId, sourceSectionId ?? targetSectionId, targetSectionId, position);

            initialIndex = position;
            sourceSectionId = targetSectionId;
          }
        }
      }, { signal });
    });
  }
}
