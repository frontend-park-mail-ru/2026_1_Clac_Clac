import { appDispatcher } from "../../core/Dispatcher";
import { boardsApi, kanbanApi, profileApi, SectionInfo } from "../../api";
import { navigateTo } from "../../router";
import { Toast } from "../../utils/toast";
import { kanbanStore } from "./KanbanStore";
import {
  BoardUser, Section, Task,
  KANBAN_COLORS, ApiError
} from "./kanban.types";

export const profileCache = new Map<string, BoardUser>();

export const KanbanActions = {
  async fetchKanban(boardId: string, forceFetch = false): Promise<void> {
    const currentState = kanbanStore.getState();

    if (currentState.boardId === boardId && !forceFetch && currentState.sections.length > 0) {
      kanbanStore.emit("change");
      return;
    }

    appDispatcher.dispatch({ type: "FETCH_KANBAN_START" });

    try {
      const boardRes = await boardsApi.getBoard(boardId);
      const boardName = boardRes.data.name;

      const usersRes = await boardsApi.getBoardUsers(boardId);
      const rawUsers: string[] = usersRes.data.members.map((m) => m.link);

      const userPromises = rawUsers.map(async (link) => {
        if (profileCache.has(link)) return profileCache.get(link)!;

        try {
          const pRes = await profileApi.getProfileByLink(link);
          const pData = pRes.data;
          const userObj: BoardUser = {
            id: link,
            name: pData.display_name,
            email: pData.email,
            avatarUrl: pData.avatar_url,
          };
          profileCache.set(link, userObj);
          return userObj;
        } catch {
          return { id: link, name: "Пользователь", email: "" };
        }
      });
      const users = await Promise.all(userPromises);

      const sectionsRes = await kanbanApi.getSections(boardId);
      const fetchedSections = sectionsRes.data;

      const colors = Object.keys(KANBAN_COLORS);
      const sectionPromises = fetchedSections.map(async (sec, i) => {
        const secId = sec.link;
        const secColor = sec.color || colors[i % colors.length];

        const section: Section = {
          id: secId,
          section_name: sec.name || "Без названия",
          color: secColor,
          colorHex: KANBAN_COLORS[secColor] || secColor,
          max_tasks: sec.max_tasks,
          is_mandatory: sec.is_mandatory,
          position: sec.position,
          tasks: [],
        };

        try {
          const tasksRes = await kanbanApi.getTasks(secId);
          const tasksList = tasksRes.data.cards;

          section.tasks = tasksList.map((t) => {
            const exId = t.executor_link;
            const exUser = users.find((u) => u.id === exId);
            const dl = t.deadline;

            let formattedDate = null;
            let formattedTime = null;

            if (dl) {
              const dlDate = new Date(dl);
              const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
              formattedDate = `${dlDate.getDate()} ${months[dlDate.getMonth()]}, ${dlDate.getFullYear()}`;
              formattedTime = `${String(dlDate.getHours()).padStart(2, '0')}:${String(dlDate.getMinutes()).padStart(2, '0')}`;
            }

            let subtasks = Array.isArray(t.subtasks) ? t.subtasks :[];
            const subtasksCount = subtasks.length;
            const subtasksDone = subtasks.filter((st: any) => st.is_done).length;
            const progressPercent = subtasksCount > 0 ? Math.round((subtasksDone / subtasksCount) * 100) : 0;
            const subtasksProgressText = subtasksCount > 0 ? `Подзадачи ${subtasksDone}/${subtasksCount}` : '';
            const progressPercentStyle = subtasksCount > 0 ? `width: ${progressPercent}%` : 'width: 0%';
            const hasSubtasks = subtasksCount > 0;

            subtasks = subtasks.map((st: any) => {
              const validId = st.subtask_link || st.link_subtask || st.id || st.link || "";
              const validDesc = st.description || st.name || st.title || st.resolved_desc || "";
              return {
                ...st,
                id: validId,
                description: validDesc,
              };
            }).sort((a: any, b: any) => {
              if (a.position !== b.position) return (a.position || 0) - (b.position || 0);
              return String(a.id).localeCompare(String(b.id));
            });

            return {
              id: t.link,
              title: t.title || "Без названия",
              due_date: formattedDate,
              time: formattedTime,
              executor: exUser ? exUser.name : "",
              executor_id: exId,
              subtasks,
              subtasksCount,
              subtasksDone,
              progressPercent,
              subtasksProgressText,
              progressPercentStyle,
              hasSubtasks,
              position: t.position,
            };
          }).sort((a, b) => a.position - b.position);
        } catch {
          section.tasks =[];
        }
        return section;
      });

      const sections = await Promise.all(sectionPromises);

      appDispatcher.dispatch({
        type: "FETCH_KANBAN_SUCCESS",
        payload: { boardId, boardName, users, sections },
      });

    } catch (err: unknown) {
      appDispatcher.dispatch({
        type: "FETCH_KANBAN_ERROR",
        payload: { error: "Ошибка загрузки канбан-доски" },
      });
      navigateTo("/boards");
    }
  },

  async createSection(boardId: string, name: string, maxTasks: number, isMandatory: boolean, color: string): Promise<void> {
    try {
      const res = await kanbanApi.createSection({
        board_link: boardId,
        name: name,
        max_tasks: maxTasks,
        is_mandatory: isMandatory,
        color,
      });
      const secData = res.data;
      const newSection: Section = {
        id: secData.link,
        section_name: secData.name,
        color: secData.color || color,
        colorHex: KANBAN_COLORS[secData.color || color] || secData.color || color,
        max_tasks: secData.max_tasks,
        is_mandatory: secData.is_mandatory,
        position: secData.position,
        tasks: [],
      };
      appDispatcher.dispatch({ type: "KANBAN_ADD_SECTION_SUCCESS", payload: { section: newSection } });
    } catch {
      Toast.error("Ошибка при создании колонки");
    }
  },

  async updateSection(sectionId: string, data: Partial<SectionInfo>): Promise<void> {
    try {
      await kanbanApi.updateSection(sectionId, data);
      appDispatcher.dispatch({ type: "KANBAN_UPDATE_SECTION_SUCCESS", payload: { sectionId, data } });
    } catch {
      Toast.error("Ошибка при обновлении колонки");
      throw new Error("Update section failed");
    }
  },

  async deleteSection(_boardId: string, sectionId: string): Promise<void> {
    try {
      await kanbanApi.deleteSection(sectionId);
      appDispatcher.dispatch({ type: "KANBAN_DELETE_SECTION_SUCCESS", payload: { sectionId } });
    } catch {
      Toast.error("Ошибка при удалении колонки");
    }
  },

  async reorderSections(boardId: string, newOrder: string[]): Promise<void> {
    const snapshot = JSON.parse(JSON.stringify(kanbanStore.getState().sections));
    appDispatcher.dispatch({ type: "KANBAN_REORDER_SECTIONS", payload: { newOrder } });
    try {
      await kanbanApi.reorderSections(boardId, { list_links: newOrder });
    } catch {
      appDispatcher.dispatch({ type: "KANBAN_REVERT_SECTIONS", payload: { sections: snapshot } });
      Toast.error("Ошибка при сохранении порядка");
    }
  },

  async createTask(_boardId: string, sectionId: string, title: string, executerId?: string): Promise<void> {
    try {
      const res = await kanbanApi.createTask({
        title,
        section_link: sectionId,
        description: "",
        executor_link: executerId,
      });
      const taskResponse = res.data;

      let executorName: string | null = null;
      if (executerId) {
        const found = profileCache.get(executerId);
        executorName = found ? found.name : "Пользователь";
      }

      const newTask: Task = {
        id: taskResponse.card_link,
        title: title,
        executor: executorName,
        executor_id: executerId || null,
        due_date: null,
        time: null,
        position: taskResponse.position,
        subtasks: [],
        subtasksCount: 0,
        subtasksDone: 0,
        subtasksProgressText: '',
        progressPercentStyle: 'width: 0%',
        hasSubtasks: false
      };

      appDispatcher.dispatch({ type: "KANBAN_ADD_TASK_SUCCESS", payload: { sectionId, task: newTask } });
    } catch (err) {
      const error = err as ApiError;
      if (error?.data?.message === "task limit reached") {
        Toast.error("Достигнуто максимальное количество задач");
      } else {
        Toast.error("Ошибка создания карточки");
      }
    }
  },

  async deleteTask(_boardId: string, taskId: string): Promise<void> {
    try {
      await kanbanApi.deleteTask(taskId);
      appDispatcher.dispatch({ type: "KANBAN_DELETE_TASK_SUCCESS", payload: { taskId } });
    } catch {
      Toast.error("Ошибка при удалении");
    }
  },

  async moveTask(_boardId: string, taskId: string, sourceSectionId: string, targetSectionId: string, position: number): Promise<void> {
    const snapshot = JSON.parse(JSON.stringify(kanbanStore.getState().sections));
    appDispatcher.dispatch({ type: "KANBAN_MOVE_TASK", payload: { taskId, sourceSectionId, targetSectionId, position } });
    try {
      await kanbanApi.reorderTask(taskId, {
        section_link: targetSectionId,
        position: position + 1,
      });
    } catch (err: unknown) {
      appDispatcher.dispatch({ type: "KANBAN_REVERT_SECTIONS", payload: { sections: snapshot } });
      const error = err as ApiError;
      const msg = error?.data?.message;
      if (msg === "task limit reached") {
        Toast.error("Превышен лимит задач");
      } else if (
        msg === "can not skip mandatory section" ||
        msg === "miss mandatory section" ||
        msg === "invalid input"
      ) {
        Toast.error("Пропущена обязательная секция");
      } else {
        Toast.error("Ошибка при переносе");
      }
    }
  }
};
