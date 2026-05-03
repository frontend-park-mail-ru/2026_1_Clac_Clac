import { appDispatcher } from "../../core/Dispatcher";
import { boardsApi, CommentResponse, kanbanApi, profileApi } from "../../api";
import { TaskActionTypes } from "./task.types";

interface ExtendedCommentResponse extends CommentResponse {
  author_name?: string;
  author_avatar?: string;
  author_fallback?: string;
};

export const TaskActions = {
  async loadTaskData(boardId: string, taskId: string) {
    appDispatcher.dispatch({ type: TaskActionTypes.LOAD_DATA_START });
    try {
      const boardRes = await boardsApi.getBoard(boardId);
      const boardName = boardRes.data.name || "Без названия";

      const usersRes = await boardsApi.getBoardUsers(boardId);
      const rawUsers = usersRes.data.user_links;

      const userPromises = rawUsers.map(async (u) => {
        const link = u;
        try {
          const pRes = await profileApi.getProfileByLink(link);
          const pData = pRes.data;
          return {
            id: link,
            name: pData.display_name || "Без имени",
            email: pData.email || "",
            avatarUrl: pData.avatar_url,
          };
        } catch (e) {
          return { id: link, name: "Пользователь", email: "" };
        }
      });
      const usersList = await Promise.all(userPromises);

      const taskRes = await kanbanApi.getTask(taskId);
      const taskData = taskRes.data;

      if (!taskData) {
        throw new Error("Задача не найдена");
      }

      let comments: ExtendedCommentResponse[] = [];
      try {
        const commentsRes = await kanbanApi.getComments(taskId);
        comments = commentsRes.data.comments;

        comments.forEach((c) => {
          const u = usersList.find(user => user.id === c.author_link);
          if (u) {
            c.author_name = u.name;
            c.author_avatar = u.avatarUrl;
            c.author_fallback = u.name.charAt(0).toUpperCase();
          } else {
            c.author_name = "Пользователь";
            c.author_fallback = "U";
          }
        });
      } catch (e) {
        console.error("Failed to load comments", e);
      }

      appDispatcher.dispatch({
        type: TaskActionTypes.LOAD_DATA_SUCCESS,
        payload: { boardId, taskId, boardName, usersList, taskData, comments },
      });
    } catch (err: any) {
      console.error("Fetch error", err);
      appDispatcher.dispatch({
        type: TaskActionTypes.LOAD_DATA_ERROR,
        payload: { error: "Ошибка при загрузке данных" },
      });
    }
  },

  async saveTask(taskId: string, payload: any) {
    appDispatcher.dispatch({ type: TaskActionTypes.SAVE_TASK_START });
    try {
      await kanbanApi.updateTask(taskId, payload);
      appDispatcher.dispatch({ type: TaskActionTypes.SAVE_TASK_SUCCESS });
    } catch (err: any) {
      console.error("Save task error", err);
      appDispatcher.dispatch({
        type: TaskActionTypes.SAVE_TASK_ERROR,
        payload: { error: "Ошибка при сохранении" },
      });
    }
  },

  async deleteTask(taskId: string) {
    appDispatcher.dispatch({ type: TaskActionTypes.DELETE_TASK_START });
    try {
      await kanbanApi.deleteTask(taskId);
      appDispatcher.dispatch({ type: TaskActionTypes.DELETE_TASK_SUCCESS });
    } catch (err: any) {
      console.error("Delete task error", err);
      appDispatcher.dispatch({
        type: TaskActionTypes.DELETE_TASK_ERROR,
        payload: { error: "Ошибка при удалении" },
      });
    }
  },

  clearStore() {
    appDispatcher.dispatch({ type: TaskActionTypes.CLEAR_STORE });
  },

  async addComment(taskId: string, text: string) {
    try {
      await kanbanApi.createComment(taskId, { text });
      const boardId = new URLSearchParams(window.location.search).get("boardId");
      if (boardId) this.loadTaskData(boardId, taskId);
    } catch (e) {
      console.error("Add comment error", e);
    }
  },

  async createSubtask(taskId: string, description: string) {
    try {
      await kanbanApi.createSubtask(taskId, { description });
      const boardId = new URLSearchParams(window.location.search).get("boardId");
      if (boardId) this.loadTaskData(boardId, taskId);
    } catch (e) {
      console.error("Create subtask error", e);
    }
  },

  async toggleSubtask(subtaskId: string, isDone: boolean, description: string) {
    try {
      await kanbanApi.updateSubtask(subtaskId, { is_done: isDone, description });
      const taskId = new URLSearchParams(window.location.search).get("taskId");
      const boardId = new URLSearchParams(window.location.search).get("boardId");
      if (boardId && taskId) this.loadTaskData(boardId, taskId);
    } catch (e) {
      console.error("Update subtask error", e);
    }
  },

  async deleteSubtask(subtaskId: string) {
    try {
      await kanbanApi.deleteSubtask(subtaskId);
      const taskId = new URLSearchParams(window.location.search).get("taskId");
      const boardId = new URLSearchParams(window.location.search).get("boardId");
      if (boardId && taskId) this.loadTaskData(boardId, taskId);
    } catch (e) {
      console.error("Delete subtask error", e);
    }
  }
};
