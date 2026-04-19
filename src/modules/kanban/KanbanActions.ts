import { appDispatcher } from "../../core/Dispatcher";
import { boardsApi, kanbanApi, profileApi } from "../../api";
import { navigateTo } from "../../router";
import { Toast } from "../../utils/toast";
import { kanbanStore } from "./KanbanStore";
import {
  BoardUser, Section, RawUser, RawSection, RawTask,
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
      const boardRes = (await boardsApi.getBoard(boardId)) as { data?: { name?: string } };
      const boardName = boardRes?.data?.name || "Без названия";

      const usersRes = (await boardsApi.getBoardUsers(boardId)) as { data?: RawUser[] } | RawUser[];
      const rawUsers: RawUser[] = Array.isArray((usersRes as any)?.data)
        ? (usersRes as any).data
        : Array.isArray(usersRes) ? usersRes : [];

      const userPromises = rawUsers.map(async (u) => {
        const link = u.user_link || u.id || String(u);
        if (profileCache.has(link)) return profileCache.get(link)!;

        try {
          const pRes = (await profileApi.getProfileByLink(link)) as { data?: RawUser } | RawUser;
          const pData = (pRes as any)?.data || pRes;
          const userObj: BoardUser = {
            id: link,
            name: pData.display_name || "Без имени",
            email: pData.email || "",
            avatarUrl: pData.avatar_url,
          };
          profileCache.set(link, userObj);
          return userObj;
        } catch {
          return { id: link, name: "Пользователь", email: "" };
        }
      });
      const users = await Promise.all(userPromises);

      const sectionsRes = (await kanbanApi.getSections(boardId)) as { data?: { sections?: RawSection[] }, sections?: RawSection[] } | RawSection[];
      let fetchedSections: RawSection[] = (sectionsRes as any).data?.sections || (sectionsRes as any).sections || (sectionsRes as any).data || sectionsRes || [];
      if (!Array.isArray(fetchedSections)) fetchedSections = [];

      const colors = Object.keys(KANBAN_COLORS);
      const sectionPromises = fetchedSections.map(async (sec, i) => {
        const secId = sec.section_link || sec.id || "";
        const secColor = sec.color || colors[i % colors.length];

        const section: Section = {
          id: secId,
          section_name: sec.section_name || "Без названия",
          color: secColor,
          colorHex: KANBAN_COLORS[secColor] || secColor,
          max_tasks: sec.max_tasks,
          is_mandatory: sec.is_mandatory,
          tasks: [],
        };

        try {
          const tasksRes = (await kanbanApi.getTasks(secId)) as { data?: { cards?: RawTask[] }, cards?: RawTask[] } | RawTask[];
          const tasksList: RawTask[] = (tasksRes as any)?.data?.cards || (tasksRes as any)?.cards || (tasksRes as any)?.data || tasksRes || [];

          section.tasks = tasksList.map((t) => {
            const exId = t.link_executer || t.executer_link;
            const exUser = users.find((u) => u.id === exId);
            const dl = t.dead_line || t.data_dead_line;

            let formattedDate = null;
            let formattedTime = null;

            if (dl) {
              const dlDate = new Date(dl);
              formattedDate = `${dlDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}, ${dlDate.getFullYear()}`;
              formattedTime = dlDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            }

            return {
              id: t.card_link || t.link_card || t.id || "",
              title: t.title || "Без названия",
              due_date: formattedDate,
              time: formattedTime,
              executor: exUser ? exUser.name : t.executer_name || t.name_executer || null,
              executor_id: exId,
            };
          });
        } catch {
          section.tasks = [];
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
        section_name: name,
        max_tasks: maxTasks,
        is_mandatory: isMandatory,
        color,
      });
      await this.fetchKanban(boardId, true);
    } catch {
      Toast.error("Ошибка при создании колонки");
    }
  },

  async updateSection(sectionId: string, data: Partial<RawSection>): Promise<void> {
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
      await this.fetchKanban(boardId, true);
    }
  },

  async createTask(boardId: string, sectionId: string, title: string, executerId: string | null = null): Promise<void> {
    try {
      await kanbanApi.createTask({
        title,
        link_section: sectionId,
        description: "",
        link_executer: executerId,
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

  async moveTask(boardId: string, taskId: string, targetSectionId: string): Promise<void> {
    try {
      await kanbanApi.reorderTask(taskId, {
        link_card: taskId,
        link_section: targetSectionId,
        position: 1,
      });
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
