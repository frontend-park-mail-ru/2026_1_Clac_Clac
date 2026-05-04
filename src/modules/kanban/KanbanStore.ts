import { Store } from "../../core/Store";
import { appDispatcher, Action } from "../../core/Dispatcher";
import {
  KanbanState,
  FetchKanbanSuccessPayload,
  FetchKanbanErrorPayload,
  Section,
} from "./kanban.types";

class KanbanStore extends Store {
  private state: KanbanState = {
    boardId: null,
    boardName: "Без названия",
    users: [],
    sections:[],
    isLoading: true,
    error: null,
  };

  public getState(): KanbanState {
    return this.state;
  }

  public clearCache(): void {
    this.state.boardId = null;
    this.state.sections =[];
    this.state.users =[];
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
        const { taskId, sourceSectionId, targetSectionId, position } = action.payload as {
          taskId: string;
          sourceSectionId: string;
          targetSectionId: string;
          position: number;
        };
        const sections = this.state.sections;
        const srcSection = sections.find(s => s.id === sourceSectionId);
        const tgtSection = sections.find(s => s.id === targetSectionId);
        if (!srcSection || !tgtSection) break;

        const taskIdx = srcSection.tasks.findIndex(t => t.id === taskId);
        if (taskIdx === -1) break;
        const [task] = srcSection.tasks.splice(taskIdx, 1);
        tgtSection.tasks.splice(position, 0, task);
        tgtSection.tasks.forEach((t, i) => { t.position = i; });
        if (sourceSectionId !== targetSectionId) {
          srcSection.tasks.forEach((t, i) => { t.position = i; });
        }
        this.emit("change");
        break;
      }

      case "KANBAN_REORDER_SECTIONS": {
        const { newOrder } = action.payload as { newOrder: string[] };
        const sectionMap = new Map(this.state.sections.map(s => [s.id, s]));
        this.state.sections = newOrder.map(id => sectionMap.get(id)).filter(Boolean) as Section[];
        this.emit("change");
        break;
      }

      case "KANBAN_REVERT_SECTIONS": {
        const { sections } = action.payload as { sections: Section[] };
        this.state.sections = sections;
        this.emit("change");
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
