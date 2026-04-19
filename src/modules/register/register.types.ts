export interface RegisterState {
  isLoading: boolean;
  globalError: string | null;
  fieldErrors: {
    name: string | null;
    email: string | null;
    password: string | null;
    repeatPassword: string | null;
  };
}

export const ActionTypes = {
  SET_IS_LOADING: 'REGISTER_SET_IS_LOADING',
  SET_GLOBAL_ERROR: 'REGISTER_SET_GLOBAL_ERROR',
  SET_FIELD_ERROR: 'REGISTER_SET_FIELD_ERROR',
  CLEAR_ERRORS: 'REGISTER_CLEAR_ERRORS',
  RESET_STATE: 'REGISTER_RESET_STATE',
};
