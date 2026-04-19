import { renderKanbanModule } from "../../modules/kanban";
import { navigateTo } from "../../router";
import { TaskActions } from "./TaskActions";
import { TaskView } from "./TaskView";

let currentTaskView: TaskView | null = null;

export const renderTaskModule = async (appDiv: HTMLElement): Promise<void> => {
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get("taskId");
  const boardId = urlParams.get("boardId");

  if (!taskId || taskId === "null" || !boardId || boardId === "null") {
    return navigateTo("/boards");
  }

  try {
    await renderKanbanModule(appDiv);
  } catch (err) {
    console.error("Board render error", err);
  }

  if (currentTaskView) {
    currentTaskView.destroy();
  }

  TaskActions.clearStore();

  currentTaskView = new TaskView(appDiv);
  currentTaskView.render();

  TaskActions.loadTaskData(boardId, taskId);
};
