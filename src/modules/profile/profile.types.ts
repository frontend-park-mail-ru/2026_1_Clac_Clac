export interface UserProfile {
  display_name: string;
  description_user: string;
  email: string;
  avatar_url?: string;
}

export interface ProfileState {
  user: UserProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  isDeleteModalOpen: boolean;
  error: string | null;
}

export const ActionTypes = {
  SET_USER: 'PROFILE_SET_USER',
  SET_IS_LOADING: 'PROFILE_SET_IS_LOADING',
  SET_IS_SAVING: 'PROFILE_SET_IS_SAVING',
  SET_DELETE_MODAL_OPEN: 'PROFILE_SET_DELETE_MODAL_OPEN',
  SET_ERROR: 'PROFILE_SET_ERROR',
  RESET_STATE: 'PROFILE_RESET_STATE',
};
