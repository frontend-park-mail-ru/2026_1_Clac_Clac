import { Store } from "../../core/Store";
import { appDispatcher, Action } from "../../core/Dispatcher";
import { TaskState, TaskActionTypes } from "./task.types";

class TaskStore extends Store {
  private state: TaskState = {
    boardId: null,
    taskId: null,
    boardName: "Без названия",
    usersList:[],
    taskData: null,
    error: null,
    isLoading: false,
    isSaving: false,
  };

  constructor() {
    super();
    appDispatcher.register(this.handleActions.bind(this));
  }

  public getState(): TaskState {
    return this.state;
  }

  private handleActions(action: Action<any>): void {
    switch (action.type) {
      case TaskActionTypes.LOAD_DATA_START:
        this.state.isLoading = true;
        this.state.error = null;
        this.emit("change");
        break;
      case TaskActionTypes.LOAD_DATA_SUCCESS:
        this.state.isLoading = false;
        this.state.boardId = action.payload.boardId;
        this.state.taskId = action.payload.taskId;
        this.state.boardName = action.payload.boardName;
        this.state.usersList = action.payload.usersList;
        this.state.taskData = action.payload.taskData;
        this.emit("change");
        break;
      case TaskActionTypes.LOAD_DATA_ERROR:
        this.state.isLoading = false;
        this.state.error = action.payload.error;
        this.emit("change");
        break;
      case TaskActionTypes.SAVE_TASK_START:
      case TaskActionTypes.DELETE_TASK_START:
        this.state.isSaving = true;
        this.state.error = null;
        this.emit("change");
        break;
      case TaskActionTypes.SAVE_TASK_SUCCESS:
        this.state.isSaving = false;
        this.emit("success", "Карточка сохранена");
        break;
      case TaskActionTypes.DELETE_TASK_SUCCESS:
        this.state.isSaving = false;
        this.emit("success", "Карточка удалена");
        break;
      case TaskActionTypes.SAVE_TASK_ERROR:
      case TaskActionTypes.DELETE_TASK_ERROR:
        this.state.isSaving = false;
        this.state.error = action.payload.error;
        this.emit("error");
        this.emit("change");
        break;
      case TaskActionTypes.CLEAR_STORE:
        this.state = {
          boardId: null,
          taskId: null,
          boardName: "Без названия",
          usersList:[],
          taskData: null,
          error: null,
          isLoading: false,
          isSaving: false,
        };
        this.emit("change");
        break;
    }
  }
}

export const taskStore = new TaskStore();
