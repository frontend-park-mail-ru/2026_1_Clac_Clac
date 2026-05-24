import { appDispatcher } from "../../core/Dispatcher";
import { boardsApi, CommentResponse, kanbanApi, profileApi } from "../../api";
import { TaskActionTypes, User } from "./task.types";
import { taskStore } from "./TaskStore";
import { Toast } from "../../utils/toast";
import { profileCache } from "../kanban/KanbanActions";

interface ExtendedCommentResponse extends CommentResponse {
  author_name?: string;
  author_avatar?: string;
  author_fallback?: string;
  created_time?: string;
  is_mine?: boolean;
  show_date_header?: boolean;
  date_header?: string;
}

const months = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

let currentUserLink: string | null = null;
const commentsCache = new Map<string, ExtendedCommentResponse[]>();

const parseCreatedAt = (createdAt?: string): Date | null => {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (!isNaN(date.getTime())) return date;

  const ts = parseFloat(createdAt);
  if (!isNaN(ts)) {
    return new Date(ts < 1e10 ? ts * 1000 : ts);
  }
  return null;
};

const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

const formatDateWithComma = (date: Date): string => {
  return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
};

const formatDateWithSpace = (date: Date): string => {
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const enrichComment = (
  c: ExtendedCommentResponse,
  users: User[],
): ExtendedCommentResponse => {
  const u = users.find((user: User) => user.id === c.author_link);
  if (u) {
    c.author_name = u.name;
    c.author_avatar = u.avatarUrl;
    c.author_fallback = u.name.charAt(0).toUpperCase();
  } else {
    c.author_name = "Пользователь";
    c.author_fallback = "U";
  }

  const date = parseCreatedAt(c.created_at);
  c.created_time = date ? formatTime(date) : "";
  c.is_mine = c.author_link === currentUserLink;

  return c;
};

const fetchAndProcessComments = async (
  taskId: string,
  users: User[],
): Promise<ExtendedCommentResponse[]> => {
  const cached = commentsCache.get(taskId);
  if (cached) return cached;

  try {
    const commentsRes = await kanbanApi.getComments(taskId);
    const comments: ExtendedCommentResponse[] = commentsRes.data.comments;
    let lastDate = "";

    comments.forEach((c) => {
      enrichComment(c, users);
      const d = parseCreatedAt(c.created_at);
      if (d) {
        const dateStr = formatDateWithComma(d);
        if (dateStr !== lastDate) {
          c.show_date_header = true;
          c.date_header = dateStr;
          lastDate = dateStr;
        }
      }
    });

    commentsCache.set(taskId, comments);
    return comments;
  } catch (e) {
    console.error("Failed to load comments", e);
    return [];
  }
};

const updateCachedComments = (
  taskId: string,
  updater: (comments: ExtendedCommentResponse[]) => ExtendedCommentResponse[],
): void => {
  const cached = commentsCache.get(taskId) ?? [];
  commentsCache.set(taskId, updater(cached));
};

export const TaskActions = {
  async loadTaskData(boardId: string, taskId: string) {
    appDispatcher.dispatch({ type: TaskActionTypes.LOAD_DATA_START });
    try {
      const boardRes = await boardsApi.getBoard(boardId);
      const boardName = boardRes.data.name || "Без названия";

      const usersRes = await boardsApi.getBoardUsers(boardId);

      const usersList: User[] = usersRes.data.members.map((m) => {
        const user: User = {
          id: m.link,
          name: m.display_name || "Без имени",
          email: m.email || "",
          avatarUrl: m.avatar_url,
        };
        profileCache.set(m.link, user);
        return user;
      });

      const [taskRes, meRes] = await Promise.all([
        kanbanApi.getTask(taskId),
        profileApi.getProfile().catch(() => null),
      ]);
      const taskData = taskRes.data;

      if (!taskData) {
        throw new Error("Задача не найдена");
      }

      if (meRes?.data?.link) {
        currentUserLink = meRes.data.link;
      }

      const comments = await fetchAndProcessComments(taskId, usersList);

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

      const { usersList, comments } = taskStore.getState();
      const me = usersList.find((u) => u.id === currentUserLink);

      const now = new Date();
      const created_time = formatTime(now);
      const dateStr = formatDateWithSpace(now);

      let show_date_header = false;
      let date_header = "";

      const lastComment = comments[comments.length - 1];
      if (lastComment?.created_at) {
        const lastD = parseCreatedAt(lastComment.created_at);
        const lastDateStr = lastD ? formatDateWithSpace(lastD) : "";

        if (dateStr !== lastDateStr) {
          show_date_header = true;
          date_header = formatDateWithComma(now);
        }
      } else {
        show_date_header = true;
        date_header = formatDateWithComma(now);
      }

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
        is_mine: true,
        show_date_header,
        date_header,
      };

      updateCachedComments(taskId, (cached) => [...cached, comment]);

      appDispatcher.dispatch({
        type: TaskActionTypes.APPEND_COMMENT,
        payload: { comment },
      });
    } catch (e) {
      console.error("Add comment error", e);
      Toast.error("Ошибка при отправке комментария");
    }
  },

  async deleteComment(commentLink: string, taskId: string) {
    try {
      await kanbanApi.deleteComment(commentLink);
      updateCachedComments(taskId, (cached) =>
        cached.filter((c) => c.comment_link !== commentLink),
      );
      appDispatcher.dispatch({
        type: TaskActionTypes.DELETE_COMMENT,
        payload: { commentLink },
      });
    } catch (e) {
      console.error("Delete comment error", e);
      Toast.error("Ошибка при удалении комментария");
    }
  },

  async updateComment(commentLink: string, text: string, taskId: string) {
    try {
      await kanbanApi.updateComment(commentLink, { text });
      updateCachedComments(taskId, (cached) =>
        cached.map((c) =>
          c.comment_link === commentLink ? { ...c, text } : c,
        ),
      );
      appDispatcher.dispatch({
        type: TaskActionTypes.UPDATE_COMMENT,
        payload: { commentLink, text },
      });
    } catch (e) {
      console.error("Update comment error", e);
      Toast.error("Ошибка при редактировании комментария");
    }
  },

  async createSubtask(taskId: string, description: string) {
    try {
      const res = await kanbanApi.createSubtask(taskId, { description });
      appDispatcher.dispatch({
        type: TaskActionTypes.ADD_SUBTASK_SUCCESS,
        payload: { subtask: res.data },
      });
    } catch (e) {
      console.error("Create subtask error", e);
    }
  },

  async toggleSubtask(subtaskId: string, isDone: boolean, description: string) {
    try {
      await kanbanApi.updateSubtask(subtaskId, {
        is_done: isDone,
        description,
      });
      appDispatcher.dispatch({
        type: TaskActionTypes.UPDATE_SUBTASK_SUCCESS,
        payload: {
          id: subtaskId,
          subtask: {
            id: subtaskId,
            description,
            is_done: isDone,
          },
        },
      });
    } catch (e) {
      console.error("Update subtask error", e);
    }
  },

  async deleteSubtask(subtaskId: string) {
    try {
      await kanbanApi.deleteSubtask(subtaskId);
      appDispatcher.dispatch({
        type: TaskActionTypes.DELETE_SUBTASK_SUCCESS,
        payload: { id: subtaskId },
      });
    } catch (e) {
      console.error("Delete subtask error", e);
    }
  },

  async uploadAttachment(taskId: string, file: File) {
    try {
      const formData = new FormData();
      formData.append("attachment", file);

      const res = await kanbanApi.uploadAttachment(taskId, formData);

      appDispatcher.dispatch({
        type: TaskActionTypes.ADD_ATTACHMENT_SUCCESS,
        payload: { attachment: res.data },
      });
      Toast.success(`Файл ${file.name} загружен`);
    } catch (e: any) {
      console.error("Upload attachment error", e);
      if (e?.status === 413) {
        Toast.error("Файл слишком большой");
      } else {
        Toast.error(`Ошибка при загрузке ${file.name}`);
      }
    }
  },

  async deleteAttachment(attachmentLink: string) {
    try {
      await kanbanApi.deleteAttachment(attachmentLink);
      appDispatcher.dispatch({
        type: TaskActionTypes.DELETE_ATTACHMENT_SUCCESS,
        payload: { link: attachmentLink },
      });
      Toast.success("Файл удален");
    } catch (e) {
      console.error("Delete attachment error", e);
      Toast.error("Ошибка при удалении файла");
    }
  },
};
