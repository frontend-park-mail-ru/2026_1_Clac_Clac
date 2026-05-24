import { Store } from "../../core/Store";
import { appDispatcher, Action } from "../../core/Dispatcher";
import {
  KanbanState,
  FetchKanbanSuccessPayload,
  FetchKanbanErrorPayload,
  Section,
  Task,
  KANBAN_COLORS,
} from "./kanban.types";
import { SectionInfo } from "../../api";

class KanbanStore extends Store {
  private state: KanbanState = {
    boardId: null,
    boardName: "Без названия",
    users: [],
    sections: [],
    isLoading: true,
    error: null,
    myRole: "viewer",
  };

  public getState(): KanbanState {
    return this.state;
  }

  public clearCache(): void {
    this.state.boardId = null;
    this.state.sections = [];
    this.state.users = [];
    this.state.myRole = "viewer";
  }

  public updateSubtaskSilently(
    taskId: string,
    subtaskId: string,
    isDone: boolean,
    description: string,
  ): void {
    for (const section of this.state.sections) {
      const task = section.tasks.find((t) => t.id === taskId);
      if (!task || !task.subtasks) continue;

      const subtask = task.subtasks.find((st) => {
        const id =
          (st as any).id || (st as any).subtask_link || (st as any).link || "";
        return String(id) === String(subtaskId);
      });

      if (!subtask) continue;

      (subtask as any).is_done = isDone;
      (subtask as any).description = description;

      const done = task.subtasks.filter((st: any) => st.is_done).length;
      task.subtasksDone = done;
      const count = task.subtasksCount || 0;
      const pct = count > 0 ? Math.round((done / count) * 100) : 0;
      task.progressPercent = pct;
      task.subtasksProgressText = count > 0 ? `Подзадачи ${done}/${count}` : "";
      task.progressPercentStyle = count > 0 ? `width: ${pct}%` : "width: 0%";
      task.hasSubtasks = count > 0;
      return;
    }
  }

  private handleAction(action: Action): void {
    switch (action.type) {
      case "FETCH_KANBAN_START":
        this.state.isLoading = true;
        this.state.error = null;
        this.emit("change");
        break;

      case "FETCH_KANBAN_SUCCESS": {
        const payload = action.payload as FetchKanbanSuccessPayload;
        this.state.boardId = payload.boardId;
        this.state.boardName = payload.boardName;
        this.state.users = payload.users;
        this.state.sections = payload.sections;
        this.state.myRole = payload.myRole || "viewer";
        this.state.isLoading = false;
        this.emit("change");
        break;
      }

      case "FETCH_KANBAN_ERROR": {
        const payload = action.payload as FetchKanbanErrorPayload;
        this.state.error = payload.error;
        this.state.isLoading = false;
        this.emit("change");
        break;
      }

      case "KANBAN_MOVE_TASK": {
        const { taskId, sourceSectionId, targetSectionId, position } =
          action.payload as {
            taskId: string;
            sourceSectionId: string;
            targetSectionId: string;
            position: number;
          };
        const sections = this.state.sections;
        const srcSection = sections.find((s) => s.id === sourceSectionId);
        const tgtSection = sections.find((s) => s.id === targetSectionId);
        if (!srcSection || !tgtSection) break;

        const taskIdx = srcSection.tasks.findIndex((t) => t.id === taskId);
        if (taskIdx === -1) break;
        const [task] = srcSection.tasks.splice(taskIdx, 1);
        tgtSection.tasks.splice(position, 0, task);
        tgtSection.tasks.forEach((t, i) => {
          t.position = i;
        });
        if (sourceSectionId !== targetSectionId) {
          srcSection.tasks.forEach((t, i) => {
            t.position = i;
          });
        }
        this.emit("change");
        break;
      }

      case "KANBAN_REORDER_SECTIONS": {
        const { newOrder } = action.payload as { newOrder: string[] };
        const sectionMap = new Map(this.state.sections.map((s) => [s.id, s]));
        this.state.sections = newOrder
          .map((id) => sectionMap.get(id))
          .filter(Boolean) as Section[];
        this.emit("change");
        break;
      }

      case "KANBAN_REVERT_SECTIONS": {
        const payload = action.payload as { sections: Section[] };
        this.state.sections = payload.sections;
        this.emit("change");
        break;
      }

      case "KANBAN_ADD_SECTION_SUCCESS": {
        const payload = action.payload as { section: Section };
        this.state.sections = [...this.state.sections, payload.section];
        this.emit("change");
        break;
      }

      case "KANBAN_DELETE_SECTION_SUCCESS": {
        const payload = action.payload as { sectionId: string };
        this.state.sections = this.state.sections.filter(
          (s) => s.id !== payload.sectionId,
        );
        this.emit("change");
        break;
      }

      case "KANBAN_ADD_TASK_SUCCESS": {
        const { sectionId, task } = action.payload as {
          sectionId: string;
          task: Task;
        };
        const section = this.state.sections.find((s) => s.id === sectionId);
        if (section) {
          section.tasks = [...section.tasks, task];
          this.emit("change");
        }
        break;
      }

      case "KANBAN_DELETE_TASK_SUCCESS": {
        const { taskId } = action.payload as { taskId: string };
        this.state.sections.forEach((s) => {
          s.tasks = s.tasks.filter((t) => t.id !== taskId);
        });
        this.emit("change");
        break;
      }

      case "KANBAN_UPDATE_SECTION_SUCCESS": {
        const { sectionId, data } = action.payload as {
          sectionId: string;
          data: Partial<SectionInfo>;
        };
        const section = this.state.sections.find((s) => s.id === sectionId);
        if (section) {
          if (data.name) section.section_name = data.name;
          if (data.color) {
            section.color = data.color;
            section.colorHex = KANBAN_COLORS[data.color] || data.color;
          }
          if (data.max_tasks) section.max_tasks = data.max_tasks;
          if (data.is_mandatory) section.is_mandatory = data.is_mandatory;
          this.emit("change");
        }
        break;
      }
    }
  }

  constructor() {
    super();
    appDispatcher.register(this.handleAction.bind(this));
  }
}

export const kanbanStore = new KanbanStore();
