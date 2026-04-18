export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface TaskState {
  boardId: string | null;
  taskId: string | null;
  boardName: string;
  usersList: User[];
  taskData: any;
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
}

export const TaskActionTypes = {
  LOAD_DATA_START: "TASK_LOAD_DATA_START",
  LOAD_DATA_SUCCESS: "TASK_LOAD_DATA_SUCCESS",
  LOAD_DATA_ERROR: "TASK_LOAD_DATA_ERROR",
  SAVE_TASK_START: "TASK_SAVE_TASK_START",
  SAVE_TASK_SUCCESS: "TASK_SAVE_TASK_SUCCESS",
  SAVE_TASK_ERROR: "TASK_SAVE_TASK_ERROR",
  DELETE_TASK_START: "TASK_DELETE_TASK_START",
  DELETE_TASK_SUCCESS: "TASK_DELETE_TASK_SUCCESS",
  DELETE_TASK_ERROR: "TASK_DELETE_TASK_ERROR",
  CLEAR_STORE: "TASK_CLEAR_STORE",
};
