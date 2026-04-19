import { appDispatcher } from '../../core/Dispatcher';
import { ActionTypes } from './register.types';
import { apiClient } from '../../api';
import { navigateTo } from '../../router';

export const RegisterActions = {
  resetState() {
    appDispatcher.dispatch({ type: ActionTypes.RESET_STATE });
  },

  setGlobalError(error: string | null) {
    appDispatcher.dispatch({ type: ActionTypes.SET_GLOBAL_ERROR, payload: error });
  },

  setFieldError(field: string, error: string | null) {
    appDispatcher.dispatch({ type: ActionTypes.SET_FIELD_ERROR, payload: { field, error } });
  },

  async registerUser(name: string, email: string, password: string) {
    appDispatcher.dispatch({ type: ActionTypes.CLEAR_ERRORS });
    appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: true });

    try {
      await apiClient.post('/register', {
        display_name: name,
        email: email,
        password: password,
        repeated_password: password
      });

      localStorage.setItem('isAuth', 'true');
      navigateTo('/boards');
    } catch (err: any) {
      const errMsg = err.data?.message || err.data?.error;

      if (errMsg) {
        if (errMsg.includes('exists')) {
          this.setFieldError('email', 'Этот адрес уже зарегистрирован');
        } else {
          this.setGlobalError(errMsg);
        }
      } else {
        this.setGlobalError('Проверьте подключение и попробуйте снова');
      }
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: false });
    }
  }
};
