export enum PasswordRecoveryStep {
  EMAIL = 'EMAIL',
  CODE = 'CODE',
  NEW_PASS = 'NEW_PASS'
}

export interface PasswordRecoveryState {
  step: PasswordRecoveryStep;
  email: string;
  code: string;
  timeLeft: number;
  isLoading: boolean;
  globalError: string | null;
  fieldErrors: {
    email: string | null;
    code: string | null;
    password: string | null;
    repeatPassword: string | null;
  };
}

export const ActionTypes = {
  SET_STEP: 'PR_SET_STEP',
  SET_EMAIL: 'PR_SET_EMAIL',
  SET_CODE: 'PR_SET_CODE',
  SET_TIME_LEFT: 'PR_SET_TIME_LEFT',
  SET_IS_LOADING: 'PR_SET_IS_LOADING',
  SET_GLOBAL_ERROR: 'PR_SET_GLOBAL_ERROR',
  SET_FIELD_ERROR: 'PR_SET_FIELD_ERROR',
  CLEAR_ERRORS: 'PR_CLEAR_ERRORS',
  RESET_STATE: 'PR_RESET_STATE'
};
