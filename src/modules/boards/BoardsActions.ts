import { appDispatcher } from "../../core/Dispatcher";
import { boardsApi, authApi, kanbanApi } from "../../api";
import { navigateTo, setIsAuth } from "../../router";
import { ApiError } from "./boards.types";
import { Toast } from "../../utils/toast";

const bgUploadErrorMessage = (status: number): string => {
  if (status === 413) return "Изображение слишком большое";
  if (status === 415) return "Неверный формат изображения";
  return "Неверный формат изображения";
};

export const BoardsActions = {
  async fetchBoards(): Promise<void> {
    appDispatcher.dispatch({ type: "FETCH_BOARDS_START" });

    try {
      const res = await boardsApi.getBoards();
      const rawBoards = res.data;

      const boardsWithStatsPromises = rawBoards.map(async (board) => {
        let backlogCount = 0;
        let hotCount = 0;
        let membersCount = 0;

        try {
          const membersRes = await boardsApi.getBoardUsers(board.link);
          membersCount = membersRes.data.members?.length || 0;
        } catch (err) {
          console.error(`Failed to fetch members for board ${board.link}`, err);
        }

        try {
          const sectionsRes = await kanbanApi.getSections(board.link);
          const sections = sectionsRes.data || [];

          if (sections.length > 0) {
            const tasksPromises = sections.map(async (sec, idx) => {
              try {
                const tasksRes = await kanbanApi.getTasks(sec.link);
                const tasks = tasksRes.data.cards || [];

                if (idx === 0) {
                  backlogCount = tasks.length;
                }

                const isDoneSection =
                  sec.name?.toLowerCase().includes("готово") ||
                  sec.name?.toLowerCase().includes("done");

                if (!isDoneSection) {
                  const now = Date.now();
                  const oneDayMs = 24 * 60 * 60 * 1000;

                  tasks.forEach((t) => {
                    const dl = t.deadline;
                    if (dl) {
                      const dlTime = new Date(dl).getTime();
                      if (!isNaN(dlTime) && dlTime < now + oneDayMs) {
                        hotCount++;
                      }
                    }
                  });
                }
              } catch (err) {
                console.error(
                  `Failed to fetch tasks for section ${sec.link}`,
                  err,
                );
              }
            });

            await Promise.all(tasksPromises);
          }
        } catch (err) {
          console.error(
            `Failed to fetch sections for board ${board.link}`,
            err,
          );
        }

        return {
          id: board.link,
          board_name: board.name || "Без названия",
          description: board.description || "Без описания",
          background: board.background || "",
          backlog: backlogCount,
          hot: hotCount,
          members: membersCount,
        };
      });

      const boards = await Promise.all(boardsWithStatsPromises);

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
        setIsAuth(false);
        localStorage.removeItem("isAuth");
        navigateTo("/login");
      }
    }
  },

  async createBoard(
    name: string,
    description: string,
    file?: File,
  ): Promise<void> {
    try {
      const res = await boardsApi.createBoard({ name, description });
      const newBoardId = res.data.link;

      if (file && newBoardId) {
        const fd = new FormData();
        fd.append("background", file);
        try {
          await boardsApi.updateBoardBackground(newBoardId, fd);
        } catch (bgErr: unknown) {
          Toast.error(bgUploadErrorMessage((bgErr as ApiError).status));
          await this.fetchBoards();
          return;
        }
      }
      await this.fetchBoards();
    } catch (err: unknown) {
      console.error("Create board error", err);
    }
  },

  async updateBoard(
    id: string,
    name: string,
    description: string,
    file?: File,
  ): Promise<void> {
    try {
      await boardsApi.updateBoard(id, { name, description, board_link: id });

      if (file) {
        const fd = new FormData();
        fd.append("background", file);
        try {
          await boardsApi.updateBoardBackground(id, fd);
        } catch (bgErr: unknown) {
          Toast.error(bgUploadErrorMessage((bgErr as ApiError).status));
          await this.fetchBoards();
          return;
        }
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

    setIsAuth(false);
    localStorage.removeItem("isAuth");
    navigateTo("/login");
  },
};
