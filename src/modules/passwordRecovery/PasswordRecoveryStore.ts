import { Store } from '../../core/Store';
import { appDispatcher, Action } from '../../core/Dispatcher';
import { PasswordRecoveryState, PasswordRecoveryStep, ActionTypes } from './passwordRecovery.types';

const initialState: PasswordRecoveryState = {
  step: PasswordRecoveryStep.EMAIL,
  email: '',
  code: '',
  timeLeft: 59,
  isLoading: false,
  globalError: null,
  fieldErrors: {
    email: null,
    code: null,
    password: null,
    repeatPassword: null,
  }
};

class PasswordRecoveryStore extends Store {
  private state: PasswordRecoveryState = { ...initialState };

  public getState(): PasswordRecoveryState {
    return this.state;
  }

  constructor() {
    super();
    appDispatcher.register((action: Action) => {
      switch (action.type) {
        case ActionTypes.SET_STEP:
          this.state.step = action.payload as PasswordRecoveryStep;
          this.emit('change');
          break;
        case ActionTypes.SET_EMAIL:
          this.state.email = action.payload as string;
          this.emit('change');
          break;
        case ActionTypes.SET_CODE:
          this.state.code = action.payload as string;
          this.emit('change');
          break;
        case ActionTypes.SET_TIME_LEFT:
          this.state.timeLeft = action.payload as number;
          this.emit('change');
          break;
        case ActionTypes.SET_IS_LOADING:
          this.state.isLoading = action.payload as boolean;
          this.emit('change');
          break;
        case ActionTypes.SET_GLOBAL_ERROR:
          this.state.globalError = action.payload as string | null;
          this.emit('change');
          break;
        case ActionTypes.SET_FIELD_ERROR:
          const { field, error } = action.payload as { field: keyof PasswordRecoveryState['fieldErrors'], error: string | null };
          this.state.fieldErrors[field] = error;
          this.emit('change');
          break;
        case ActionTypes.CLEAR_ERRORS:
          this.state.globalError = null;
          this.state.fieldErrors = { email: null, code: null, password: null, repeatPassword: null };
          this.emit('change');
          break;
        case ActionTypes.RESET_STATE:
          this.state = { ...initialState };
          this.emit('change');
          break;
      }
    });
  }
}

export const passwordRecoveryStore = new PasswordRecoveryStore();
