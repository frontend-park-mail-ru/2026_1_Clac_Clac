import { boardsStore } from "./BoardsStore";
import { BoardsActions } from "./BoardsActions";
import { BoardsView } from "./BoardsView";

let view: BoardsView | null = null;

const handleStoreChange = (): void => {
  view?.render(boardsStore.getState());
};

export const renderBoardsModule = async (appDiv: HTMLElement): Promise<void> => {
  if (!view) {
    view = new BoardsView(appDiv);
  } else {
    view.setAppDiv(appDiv);
  }

  boardsStore.off("change", handleStoreChange);
  boardsStore.on("change", handleStoreChange);

  await BoardsActions.fetchBoards();
};
