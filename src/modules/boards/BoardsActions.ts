import { appDispatcher } from "../../core/Dispatcher";
import { boardsApi, authApi, kanbanApi } from "../../api";
import { navigateTo, setIsAuth } from "../../router";
import { ApiError } from "./boards.types";
import { Toast } from "../../utils/toast";

interface BoardRaw {
  link: string;
  name?: string;
  description?: string;
  background?: string;
}

interface SectionRaw {
  link: string;
  name?: string;
}

interface TaskRaw {
  deadline?: string | Date;
}

const bgUploadErrorMessage = (status: number): string => {
  if (status === 413) return "Изображение слишком большое";
  if (status === 415) return "Неверный формат изображения";
  return "Неверный формат изображения";
};

const handleLogoutAndRedirect = (): void => {
  setIsAuth(false);
  localStorage.removeItem("isAuth");
  navigateTo("/login");
};

const uploadBoardBackground = async (
  boardId: string,
  file: File,
): Promise<void> => {
  const fd = new FormData();
  fd.append("background", file);
  try {
    await boardsApi.updateBoardBackground(boardId, fd);
  } catch (bgErr: unknown) {
    Toast.error(bgUploadErrorMessage((bgErr as ApiError).status));
  }
};

const isDoneSection = (name?: string): boolean => {
  if (!name) return false;
  const lowerName = name.toLowerCase();
  return lowerName.includes("готово") || lowerName.includes("done");
};

const getHotTasksCount = (tasks: TaskRaw[]): number => {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  let count = 0;

  tasks.forEach((t) => {
    const dl = t.deadline;
    if (dl) {
      const dlTime = new Date(dl).getTime();
      if (!isNaN(dlTime) && dlTime < now + oneDayMs) {
        count++;
      }
    }
  });

  return count;
};

const fetchBoardMembersCount = async (boardLink: string): Promise<number> => {
  try {
    const res = await boardsApi.getBoardUsers(boardLink);
    return res.data.members?.length || 0;
  } catch (err) {
    console.error(`Failed to fetch members for board ${boardLink}`, err);
    return 0;
  }
};

const fetchSectionStats = async (
  sec: SectionRaw,
  isFirst: boolean,
): Promise<{ backlogCount: number; hotCount: number }> => {
  try {
    const tasksRes = await kanbanApi.getTasks(sec.link);
    const tasks: TaskRaw[] = tasksRes.data.cards || [];

    const backlogCount = isFirst ? tasks.length : 0;
    const hotCount = !isDoneSection(sec.name) ? getHotTasksCount(tasks) : 0;

    return { backlogCount, hotCount };
  } catch (err) {
    console.error(`Failed to fetch tasks for section ${sec.link}`, err);
    return { backlogCount: 0, hotCount: 0 };
  }
};

const fetchBoardTasksStats = async (
  boardLink: string,
): Promise<{ backlogCount: number; hotCount: number }> => {
  try {
    const sectionsRes = await kanbanApi.getSections(boardLink);
    const sections: SectionRaw[] = sectionsRes.data || [];

    if (sections.length === 0) {
      return { backlogCount: 0, hotCount: 0 };
    }

    const statsPromises = sections.map((sec, idx) =>
      fetchSectionStats(sec, idx === 0),
    );

    const statsResults = await Promise.all(statsPromises);

    return statsResults.reduce(
      (acc, curr) => {
        acc.backlogCount += curr.backlogCount;
        acc.hotCount += curr.hotCount;
        return acc;
      },
      { backlogCount: 0, hotCount: 0 },
    );
  } catch (err) {
    console.error(`Failed to fetch sections for board ${boardLink}`, err);
    return { backlogCount: 0, hotCount: 0 };
  }
};

export const BoardsActions = {
  async fetchBoards(): Promise<void> {
    appDispatcher.dispatch({ type: "FETCH_BOARDS_START" });

    try {
      const res = await boardsApi.getBoards();
      const rawBoards: BoardRaw[] = res.data;

      const boardsWithStatsPromises = rawBoards.map(async (board) => {
        const [membersCount, taskStats] = await Promise.all([
          fetchBoardMembersCount(board.link),
          fetchBoardTasksStats(board.link),
        ]);

        return {
          id: board.link,
          board_name: board.name || "Без названия",
          description: board.description || "Без описания",
          background: board.background || "",
          backlog: taskStats.backlogCount,
          hot: taskStats.hotCount,
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
        handleLogoutAndRedirect();
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
        await uploadBoardBackground(newBoardId, file);
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
        await uploadBoardBackground(id, file);
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

    handleLogoutAndRedirect();
  },
};
