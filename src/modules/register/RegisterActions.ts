import { appDispatcher } from '../../core/Dispatcher';
import { ActionTypes } from './register.types';
import { authApi } from '../../api';
import { navigateTo, setIsAuth } from '../../router';
import { setCurrentUser } from '../../main';

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
      await authApi.register({
        display_name: name,
        email,
        password,
        repeated_password: password
      });

      localStorage.setItem('isAuth', 'true');
      setIsAuth(true);

      try {
        const meRes = await authApi.checkAuth();
        setCurrentUser(meRes.data.profile);
      } catch (err) {
        console.error("Не удалось загрузить данные пользователя после регистрации", err);
      }

      navigateTo('/boards');
    } catch (err: any) {
      const errMsg = err.data?.message || err.data?.error;

      if (errMsg) {
        if (errMsg.includes('exists')) {
          this.setFieldError('email', 'Невозможно создать аккаунт, попробуйте другой email');
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
