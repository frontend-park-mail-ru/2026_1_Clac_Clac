import { appDispatcher } from "../../core/Dispatcher";
import { boardsApi, kanbanApi, profileApi } from "../../api";
import { TaskActionTypes } from "./task.types";

export const TaskActions = {
  async loadTaskData(boardId: string, taskId: string) {
    appDispatcher.dispatch({ type: TaskActionTypes.LOAD_DATA_START });
    try {
      const boardRes = (await boardsApi.getBoard(boardId)) as any;
      const boardName = boardRes?.data?.name || "Без названия";

      const usersRes = (await boardsApi.getBoardUsers(boardId)) as any;
      const rawUsers = Array.isArray(usersRes?.data)
        ? usersRes.data
        : Array.isArray(usersRes)
          ? usersRes
          :[];

      const userPromises = rawUsers.map(async (u: any) => {
        const link = u.user_link || u.id || u;
        try {
          const pRes = (await profileApi.getProfileByLink(link)) as any;
          const pData = pRes?.data || pRes;
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

      const taskRes = (await kanbanApi.getTask(taskId)) as any;
      const taskData = taskRes?.data || taskRes;

      if (!taskData) {
        throw new Error("Задача не найдена");
      }

      appDispatcher.dispatch({
        type: TaskActionTypes.LOAD_DATA_SUCCESS,
        payload: { boardId, taskId, boardName, usersList, taskData },
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
};
