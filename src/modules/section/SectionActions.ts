import { appDispatcher } from '../../core/Dispatcher';
import { ActionTypes } from './section.types';
import { boardsApi, kanbanApi } from '../../api';
import { navigateTo } from '../../router';
import { Toast } from '../../utils/toast';
import { clearKanbanCache } from '../../modules/kanban';
import { sectionStore } from './SectionStore';

export const SectionActions = {
  resetState() {
    appDispatcher.dispatch({ type: ActionTypes.RESET_STATE });
  },

  async fetchSection(boardId: string, sectionId: string) {
    appDispatcher.dispatch({ type: ActionTypes.SET_IDS, payload: { boardId, sectionId } });
    appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: true });

    try {
      const boardRes = (await boardsApi.getBoard(boardId)) as any;
      if (boardRes?.data?.name) {
        appDispatcher.dispatch({ type: ActionTypes.SET_BOARD_NAME, payload: boardRes.data.name });
      }

      const sectionRes = (await kanbanApi.getSection(sectionId)) as any;
      const sectionData = sectionRes?.data || sectionRes;

      if (!sectionData) {
        throw new Error('No section data');
      }

      const formattedData = {
        section_link: sectionId,
        section_name: sectionData.section_name || "Без названия",
        color: sectionData.color || "white",
        max_tasks: sectionData.max_tasks || 100,
        is_mandatory: sectionData.is_mandatory || false,
        position: sectionData.position || 1,
      };

      appDispatcher.dispatch({ type: ActionTypes.SET_SECTION_DATA, payload: formattedData });
      appDispatcher.dispatch({ type: ActionTypes.SET_COLOR, payload: formattedData.color });
    } catch (err) {
      console.error("Fetch error", err);
      Toast.error("Ошибка при загрузке данных");
      navigateTo(`/board?id=${boardId}`);
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: false });
    }
  },

  setColor(color: string) {
    appDispatcher.dispatch({ type: ActionTypes.SET_COLOR, payload: color });
  },

  setDeleteModalOpen(isOpen: boolean) {
    appDispatcher.dispatch({ type: ActionTypes.SET_DELETE_MODAL_OPEN, payload: isOpen });
  },

  async updateSection(name: string, maxTasks: number, isMandatory: boolean) {
    const state = sectionStore.getState();
    if (!state.sectionId || !state.boardId || !state.sectionData) return;

    appDispatcher.dispatch({ type: ActionTypes.SET_IS_SAVING, payload: true });

    const payload = {
      section_link: state.sectionId,
      section_name: name || "Без названия",
      color: state.selectedColor,
      max_tasks: isNaN(maxTasks) ? 100 : maxTasks,
      is_mandatory: isMandatory,
      position: state.sectionData.position || 1,
    };

    try {
      await kanbanApi.updateSection(state.sectionId, payload);
      clearKanbanCache();
      Toast.success("Секция сохранена");
      navigateTo(`/board?id=${state.boardId}`);
    } catch (err) {
      console.error("Update section error", err);
      const isBacklog =
        state.sectionData.section_name?.toLowerCase().includes("бэклог") ||
        state.sectionData.section_name?.toLowerCase().includes("backlog");
      if (isBacklog) {
        Toast.error("Нельзя изменять бэклог");
      } else {
        Toast.error("Ошибка при сохранении");
      }
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_SAVING, payload: false });
    }
  },

  async deleteSection() {
    const state = sectionStore.getState();
    if (!state.sectionId || !state.boardId) return;

    try {
      await kanbanApi.deleteSection(state.sectionId);
      clearKanbanCache();
      this.setDeleteModalOpen(false);
      navigateTo(`/board?id=${state.boardId}`);
    } catch (err) {
      Toast.error("Ошибка при удалении");
    }
  }
};
