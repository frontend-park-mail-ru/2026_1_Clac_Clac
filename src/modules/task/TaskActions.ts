import { appDispatcher } from "../../core/Dispatcher";
import { boardsApi, CommentResponse, kanbanApi, profileApi } from "../../api";
import { TaskActionTypes } from "./task.types";
import { taskStore } from "./TaskStore";
import { Toast } from "../../utils/toast";
import { profileCache } from "../kanban/KanbanActions";

interface ExtendedCommentResponse extends CommentResponse {
  author_name?: string;
  author_avatar?: string;
  author_fallback?: string;
  created_time?: string;
};

let currentUserLink: string | null = null;
const commentsCache = new Map<string, ExtendedCommentResponse[]>();

export const TaskActions = {
  async loadTaskData(boardId: string, taskId: string) {
    appDispatcher.dispatch({ type: TaskActionTypes.LOAD_DATA_START });
    try {
      const boardRes = await boardsApi.getBoard(boardId);
      const boardName = boardRes.data.name || "Без названия";

      const usersRes = await boardsApi.getBoardUsers(boardId);
      const rawUsers = usersRes.data.user_links;

      const userPromises = rawUsers.map(async (link) => {
        if (profileCache.has(link)) return profileCache.get(link)!;
        try {
          const pRes = await profileApi.getProfileByLink(link);
          const pData = pRes.data;
          const user = {
            id: link,
            name: pData.display_name || "Без имени",
            email: pData.email || "",
            avatarUrl: pData.avatar_url,
          };
          profileCache.set(link, user);
          return user;
        } catch {
          return { id: link, name: "Пользователь", email: "" };
        }
      });
      const usersList = await Promise.all(userPromises);

      const [taskRes, meRes] = await Promise.all([
        kanbanApi.getTask(taskId),
        profileApi.getProfile().catch(() => null),
      ]);
      const rawData = taskRes.data as any;
      let taskData = rawData.card || rawData.cards?.[0] || rawData;

      if (!taskData) {
        throw new Error("Задача не найдена");
      }

      if (meRes?.data?.link) {
        currentUserLink = meRes.data.link;
      }

      const enrichComment = (c: ExtendedCommentResponse, users: typeof usersList) => {
        const u = users.find(user => user.id === c.author_link);
        if (u) {
          c.author_name = u.name;
          c.author_avatar = u.avatarUrl;
          c.author_fallback = u.name.charAt(0).toUpperCase();
        } else {
          c.author_name = "Пользователь";
          c.author_fallback = "U";
        }
        try {
          let date: Date | null = null;
          if (c.created_at) {
            date = new Date(c.created_at);
            if (isNaN(date.getTime())) {
              const ts = parseFloat(c.created_at);
              if (!isNaN(ts)) {
                date = new Date(ts < 1e10 ? ts * 1000 : ts);
              }
            }
          }
          c.created_time = (date && !isNaN(date.getTime()))
            ? `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`
            : '';
        } catch {
          c.created_time = '';
        }
        return c;
      };

      let comments: ExtendedCommentResponse[] = [];
      const cached = commentsCache.get(taskId);
      if (cached) {
        comments = cached;
      } else {
        try {
          const commentsRes = await kanbanApi.getComments(taskId);
          comments = commentsRes.data.comments;
          comments.forEach(c => enrichComment(c, usersList));
          commentsCache.set(taskId, comments);
        } catch (e) {
          console.error("Failed to load comments", e);
        }
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
    commentsCache.clear();
    currentUserLink = null;
    appDispatcher.dispatch({ type: TaskActionTypes.CLEAR_STORE });
  },

  async addComment(taskId: string, text: string) {
    try {
      const res = await kanbanApi.createComment(taskId, { text });
      const commentLink = res.data.comment_link;

      const { usersList } = taskStore.getState();
      const me = usersList.find(u => u.id === currentUserLink);

      const now = new Date();
      const created_time = `${now.getUTCHours().toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}`;

      const comment: ExtendedCommentResponse = {
        comment_link: commentLink,
        author_link: currentUserLink ?? "",
        parent_link: "",
        text,
        created_at: now.toISOString(),
        author_name: me?.name ?? "Пользователь",
        author_avatar: me?.avatarUrl,
        author_fallback: (me?.name ?? "U").charAt(0).toUpperCase(),
        created_time,
      };

      const cached = commentsCache.get(taskId) ?? [];
      commentsCache.set(taskId, [...cached, comment]);

      appDispatcher.dispatch({ type: TaskActionTypes.APPEND_COMMENT, payload: { comment } });
    } catch (e) {
      console.error("Add comment error", e);
      Toast.error("Ошибка при отправке комментария");
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
