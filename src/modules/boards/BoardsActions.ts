import { appDispatcher } from "../../core/Dispatcher";
import { boardsApi, authApi } from "../../api";
import { navigateTo } from "../../router";
import { 
  RawBoard, BoardsResponse, CreateBoardResponse, ApiError, Board 
} from "./boards.types";

export const BoardsActions = {
  async fetchBoards(): Promise<void> {
    appDispatcher.dispatch({ type: "FETCH_BOARDS_START" });

    try {
      const res = (await boardsApi.getBoards()) as BoardsResponse | RawBoard[];
      let rawBoards: RawBoard[] =[];

      if ("data" in res && res.data) {
        rawBoards = Array.isArray(res.data) ? res.data : [res.data];
      } else if (Array.isArray(res)) {
        rawBoards = res;
      }

      const boards: Board[] = rawBoards.map((board) => ({
        id: board.link || board.id || "",
        board_name: board.name || board.board_name || board.title || "Без названия",
        description: board.description || "Без описания",
        background: board.background || "",
        backlog: board.backlog || 0,
        hot: board.hot || 0,
        members: board.members || 0,
      }));

      appDispatcher.dispatch({
        type: "FETCH_BOARDS_SUCCESS",
        payload: { boards },
      });
    } catch (err: unknown) {
      const error = err as ApiError;
      appDispatcher.dispatch({
        type: "FETCH_BOARDS_ERROR",
        payload: { error: error.message || "Ошибка загрузки досок" },
      });

      if (error.status === 401) {
        localStorage.removeItem("isAuth");
        navigateTo("/login");
      }
    }
  },

  async createBoard(name: string, description: string, file?: File): Promise<void> {
    try {
      const res = (await boardsApi.createBoard({ name, description })) as CreateBoardResponse;
      const newBoardId = res.data?.link;

      if (file && newBoardId) {
        const fd = new FormData();
        fd.append("background", file);
        await boardsApi.updateBoardBackground(newBoardId, fd);
      }
      await this.fetchBoards();
    } catch (err: unknown) {
      console.error("Create board error", err);
    }
  },

  async updateBoard(id: string, name: string, description: string, file?: File): Promise<void> {
    try {
      await boardsApi.updateBoard(id, { name, description });

      if (file) {
        const fd = new FormData();
        fd.append("background", file);
        await boardsApi.updateBoardBackground(id, fd);
      }
      await this.fetchBoards();
    } catch (err: unknown) {
      console.error("Update board error", err);
    }
  },

  async deleteBoard(id: string): Promise<void> {
    try {
      await boardsApi.deleteBoard(id);
      await this.fetchBoards();
    } catch (err: unknown) {
      console.error("Delete board error", err);
    }
  },

  async logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch (err: unknown) {
      console.error("Logout error", err);
    }
    localStorage.removeItem("isAuth");
    navigateTo("/login");
  },
};
