import { Store } from "../../core/Store";
import { appDispatcher, Action } from "../../core/Dispatcher";
import { LoginState, LoginErrorPayload, SetGlobalErrorPayload } from "./login.types";

class LoginStore extends Store {
  private state: LoginState = {
    isLoading: false,
    globalError: null,
    fieldErrors: {},
  };

  public getState(): LoginState {
    return this.state;
  }

  private handleAction(action: Action): void {
    switch (action.type) {
      case "LOGIN_START":
        this.state.isLoading = true;
        this.state.globalError = null;
        this.state.fieldErrors = {};
        this.emit("change");
        break;

      case "LOGIN_SUCCESS":
        this.state.isLoading = false;
        this.emit("change");
        break;

      case "LOGIN_ERROR": {
        const payload = action.payload as LoginErrorPayload;
        this.state.isLoading = false;
        this.state.globalError = payload.globalError;
        this.state.fieldErrors = payload.fieldErrors || {};
        this.emit("change");
        break;
      }

      case "SET_GLOBAL_ERROR": {
        const payload = action.payload as SetGlobalErrorPayload;
        this.state.globalError = payload.error;
        this.emit("change");
        break;
      }
    }
  }

  constructor() {
    super();
    appDispatcher.register(this.handleAction.bind(this));
  }
}

export const loginStore = new LoginStore();
