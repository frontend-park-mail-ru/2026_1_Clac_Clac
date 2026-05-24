import { Store } from "../../core/Store";
import { appDispatcher, Action } from "../../core/Dispatcher";
import { TaskState, TaskActionTypes } from "./task.types";

class TaskStore extends Store {
  private state: TaskState = {
    boardId: null,
    taskId: null,
    boardName: "Без названия",
    usersList: [],
    taskData: null,
    comments: [],
    attachments: [],
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
        this.state.comments = action.payload.comments || [];
        this.state.attachments = action.payload.taskData?.attachments || [];
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
      case TaskActionTypes.APPEND_COMMENT:
        this.state.comments = [...this.state.comments, action.payload.comment];
        this.emit("change");
        break;
      case TaskActionTypes.DELETE_COMMENT:
        this.state.comments = this.state.comments.filter(
          (c: any) => c.comment_link !== action.payload.commentLink,
        );
        this.emit("change");
        break;
      case TaskActionTypes.UPDATE_COMMENT:
        this.state.comments = this.state.comments.map((c: any) =>
          c.comment_link === action.payload.commentLink
            ? { ...c, text: action.payload.text }
            : c,
        );
        this.emit("change");
        break;
      case TaskActionTypes.ADD_SUBTASK_SUCCESS:
        if (this.state.taskData) {
          const newSt = action.payload.subtask;
          this.state.taskData.subtasks = [
            ...(this.state.taskData.subtasks || []),
            newSt,
          ];
          this.emit("change");
        }
        break;
      case TaskActionTypes.UPDATE_SUBTASK_SUCCESS:
        if (this.state.taskData) {
          const updated = action.payload.subtask;
          this.state.taskData.subtasks = (
            this.state.taskData.subtasks || []
          ).map((st: any) =>
            (st.link || st.subtask_link || st.link_subtask || st.id) ===
            action.payload.id
              ? updated
              : st,
          );
          this.emit("change");
        }
        break;
      case TaskActionTypes.DELETE_SUBTASK_SUCCESS:
        if (this.state.taskData) {
          this.state.taskData.subtasks = (
            this.state.taskData.subtasks || []
          ).filter(
            (st: any) =>
              (st.link || st.subtask_link || st.link_subtask || st.id) !==
              action.payload.id,
          );
          this.emit("change");
        }
        break;

      case TaskActionTypes.ADD_ATTACHMENT_SUCCESS:
        this.state.attachments = [
          ...this.state.attachments,
          action.payload.attachment,
        ];
        if (this.state.taskData) {
          this.state.taskData.attachments = [
            ...(this.state.taskData.attachments || []),
            action.payload.attachment,
          ];
        }
        this.emit("change");
        break;

      case TaskActionTypes.DELETE_ATTACHMENT_SUCCESS:
        this.state.attachments = this.state.attachments.filter(
          (a: any) => a.attachment_link !== action.payload.link,
        );
        if (this.state.taskData) {
          this.state.taskData.attachments = (
            this.state.taskData.attachments || []
          ).filter((att: any) => att.attachment_link !== action.payload.link);
        }
        this.emit("change");
        break;

      case TaskActionTypes.CLEAR_STORE:
        this.state = {
          boardId: null,
          taskId: null,
          boardName: "Без названия",
          usersList: [],
          taskData: null,
          comments: [],
          attachments: [],
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
