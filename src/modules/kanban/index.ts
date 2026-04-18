import { kanbanStore } from "./KanbanStore";
import { KanbanActions } from "./KanbanActions";
import { KanbanView } from "./KanbanView";
import { navigateTo } from "../../router";

let view: KanbanView | null = null;

const handleStoreChange = (): void => {
  view?.render(kanbanStore.getState());
};

export const clearKanbanCache = (): void => {
  kanbanStore.clearCache();
};

export const renderKanbanModule = async (appDiv: HTMLElement, forceFetch = false): Promise<void> => {
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get("id") || urlParams.get("boardId");

  if (!boardId || boardId === "null") {
    navigateTo("/boards");
    return;
  }

  if (!view) {
    view = new KanbanView(appDiv);
  } else {
    view.setAppDiv(appDiv);
  }

  kanbanStore.off("change", handleStoreChange);
  kanbanStore.on("change", handleStoreChange);

  await KanbanActions.fetchKanban(boardId, forceFetch);
};
