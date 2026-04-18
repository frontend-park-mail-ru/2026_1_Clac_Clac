export interface SectionData {
  section_link: string;
  section_name: string;
  color: string;
  max_tasks: number;
  is_mandatory: boolean;
  position: number;
}

export interface SectionState {
  boardId: string | null;
  sectionId: string | null;
  boardName: string;
  sectionData: SectionData | null;
  selectedColor: string;
  isLoading: boolean;
  isSaving: boolean;
  isDeleteModalOpen: boolean;
}

export const ActionTypes = {
  SET_IDS: 'SECTION_SET_IDS',
  SET_BOARD_NAME: 'SECTION_SET_BOARD_NAME',
  SET_SECTION_DATA: 'SECTION_SET_SECTION_DATA',
  SET_COLOR: 'SECTION_SET_COLOR',
  SET_IS_LOADING: 'SECTION_SET_IS_LOADING',
  SET_IS_SAVING: 'SECTION_SET_IS_SAVING',
  SET_DELETE_MODAL_OPEN: 'SECTION_SET_DELETE_MODAL_OPEN',
  RESET_STATE: 'SECTION_RESET_STATE',
};
