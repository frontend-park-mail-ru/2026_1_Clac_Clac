import { Store } from '../../core/Store';
import { appDispatcher, Action } from '../../core/Dispatcher';
import { RegisterState, ActionTypes } from './register.types';

const initialState: RegisterState = {
  isLoading: false,
  globalError: null,
  fieldErrors: {
    name: null,
    email: null,
    password: null,
    repeatPassword: null,
  }
};

class RegisterStore extends Store {
  private state: RegisterState = { ...initialState };

  public getState(): RegisterState {
    return this.state;
  }

  constructor() {
    super();
    appDispatcher.register((action: Action) => {
      switch (action.type) {
        case ActionTypes.SET_IS_LOADING:
          this.state.isLoading = action.payload as boolean;
          this.emit('change');
          break;
        case ActionTypes.SET_GLOBAL_ERROR:
          this.state.globalError = action.payload as string | null;
          this.emit('change');
          break;
        case ActionTypes.SET_FIELD_ERROR:
          const { field, error } = action.payload as { field: keyof RegisterState['fieldErrors'], error: string | null };
          this.state.fieldErrors[field] = error;
          this.emit('change');
          break;
        case ActionTypes.CLEAR_ERRORS:
          this.state.globalError = null;
          this.state.fieldErrors = { name: null, email: null, password: null, repeatPassword: null };
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

export const registerStore = new RegisterStore();
