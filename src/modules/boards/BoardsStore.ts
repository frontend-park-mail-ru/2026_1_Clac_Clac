import { Store } from "../../core/Store";
import { appDispatcher, Action } from "../../core/Dispatcher";
import { 
  BoardsState, 
  FetchBoardsSuccessPayload, 
  FetchBoardsErrorPayload 
} from "./boards.types";

class BoardsStore extends Store {
  private state: BoardsState = {
    boards:[],
    user: null,
    isLoading: false,
    error: null,
  };

  public getState(): BoardsState {
    return this.state;
  }

  private handleAction(action: Action): void {
    switch (action.type) {
      case "FETCH_BOARDS_START":
        this.state.isLoading = true;
        this.state.error = null;
        this.emit("change");
        break;

      case "FETCH_BOARDS_SUCCESS": {
        const payload = action.payload as FetchBoardsSuccessPayload;
        this.state.boards = payload.boards;
        this.state.isLoading = false;
        this.emit("change");
        break;
      }

      case "FETCH_BOARDS_ERROR": {
        const payload = action.payload as FetchBoardsErrorPayload;
        this.state.error = payload.error;
        this.state.isLoading = false;
        this.emit("change");
        break;
      }
    }
  }

  constructor() {
    super();
    appDispatcher.register(this.handleAction.bind(this));
  }
}

export const boardsStore = new BoardsStore();
