import { appDispatcher } from "../../core/Dispatcher";
import { boardsApi, kanbanApi, profileApi, SectionInfo } from "../../api";
import { navigateTo } from "../../router";
import { Toast } from "../../utils/toast";
import { kanbanStore } from "./KanbanStore";
import {
  BoardUser, Section,
  KANBAN_COLORS, ApiError
} from "./kanban.types";

const profileCache = new Map<string, BoardUser>();

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
      const rawUsers: string[] = usersRes.data.user_links;

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
              formattedDate = `${dlDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}, ${dlDate.getFullYear()}`;
              formattedTime = dlDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            }

            let subtasks = Array.isArray(t.subtasks) ? t.subtasks :[];
            const subtasksCount = subtasks.length;
            const subtasksDone = subtasks.filter((st: any) => st.is_done).length;

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
      await kanbanApi.createSection({
        board_link: boardId,
        name: name,
        max_tasks: maxTasks,
        is_mandatory: isMandatory,
        color,
      });
      await this.fetchKanban(boardId, true);
    } catch {
      Toast.error("Ошибка при создании колонки");
    }
  },

  async updateSection(sectionId: string, data: Partial<SectionInfo>): Promise<void> {
    try {
      await kanbanApi.updateSection(sectionId, data);
    } catch {
      Toast.error("Ошибка при обновлении колонки");
      throw new Error("Update section failed");
    }
  },

  async deleteSection(boardId: string, sectionId: string): Promise<void> {
    try {
      await kanbanApi.deleteSection(sectionId);
      await this.fetchKanban(boardId, true);
    } catch {
      Toast.error("Ошибка при удалении колонки");
    }
  },

  async reorderSections(boardId: string, newOrder: string[]): Promise<void> {
    try {
      await kanbanApi.reorderSections(boardId, { list_links: newOrder });
    } catch {
      Toast.error("Ошибка при сохранении порядка");
    }
  },

  async createTask(boardId: string, sectionId: string, title: string, executerId?: string): Promise<void> {
    try {
      await kanbanApi.createTask({
        title,
        section_link: sectionId,
        description: "",
        executor_link: executerId,
      });
      await this.fetchKanban(boardId, true);
    } catch {
      Toast.error("Ошибка создания карточки");
    }
  },

  async deleteTask(boardId: string, taskId: string): Promise<void> {
    try {
      await kanbanApi.deleteTask(taskId);
      await this.fetchKanban(boardId, true);
    } catch {
      Toast.error("Ошибка при удалении");
    }
  },

  async moveTask(boardId: string, taskId: string, targetSectionId: string, position: number): Promise<void> {
    try {
      await kanbanApi.reorderTask(taskId, {
        section_link: targetSectionId,
        position,
      });
      await this.fetchKanban(boardId, true);
    } catch (err: unknown) {
      const error = err as ApiError;
      if (error?.data?.message === "can not skip mandatory section") {
        Toast.error("Нельзя пропускать обязательную секцию");
      } else {
        Toast.error("Ошибка при переносе");
      }
      await this.fetchKanban(boardId, true);
    }
  }
};
