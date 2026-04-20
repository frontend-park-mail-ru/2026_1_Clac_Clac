import { appDispatcher } from '../../core/Dispatcher';
import { ActionTypes, PasswordRecoveryStep } from './passwordRecovery.types';
import { apiClient } from '../../api';
import { validateEmail, validatePassword } from '../../utils';
import { navigateTo } from '../../router';
import { passwordRecoveryStore } from './PasswordRecoveryStore';

let timerInterval: ReturnType<typeof setInterval> | null = null;

export const PasswordRecoveryActions = {
  resetState() {
    if (timerInterval) clearInterval(timerInterval);
    appDispatcher.dispatch({ type: ActionTypes.RESET_STATE });
  },

  async sendEmail(email: string) {
    appDispatcher.dispatch({ type: ActionTypes.CLEAR_ERRORS });

    if (!validateEmail(email)) {
      appDispatcher.dispatch({ type: ActionTypes.SET_FIELD_ERROR, payload: { field: 'email', error: 'Неверный формат email' } });
      return;
    }

    appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: true });

    try {
      await apiClient.post('/forgot-password', { email });
      appDispatcher.dispatch({ type: ActionTypes.SET_EMAIL, payload: email });
      appDispatcher.dispatch({ type: ActionTypes.SET_STEP, payload: PasswordRecoveryStep.CODE });
      this.startTimer();
    } catch (err: any) {
      if (err.status === 429) {
        appDispatcher.dispatch({ type: ActionTypes.SET_GLOBAL_ERROR, payload: 'Слишком много попыток. Подождите немного.' });
      } else if (err.status === 404) {
        appDispatcher.dispatch({ type: ActionTypes.SET_GLOBAL_ERROR, payload: 'Пользователь не найден' });
      } else {
        appDispatcher.dispatch({ type: ActionTypes.SET_GLOBAL_ERROR, payload: err.data?.message || err.data?.error || 'Не удалось отправить код' });
      }
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: false });
    }
  },

  startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    appDispatcher.dispatch({ type: ActionTypes.SET_TIME_LEFT, payload: 59 });

    timerInterval = setInterval(() => {
      const currentTimer = passwordRecoveryStore.getState().timeLeft;
      if (currentTimer > 0) {
        appDispatcher.dispatch({ type: ActionTypes.SET_TIME_LEFT, payload: currentTimer - 1 });
      } else {
        if (timerInterval) clearInterval(timerInterval);
      }
    }, 1000);
  },

  async resendCode() {
    const email = passwordRecoveryStore.getState().email;
    appDispatcher.dispatch({ type: ActionTypes.CLEAR_ERRORS });
    try {
      await apiClient.post('/forgot-password', { email });
      this.startTimer();
    } catch (err) {
      appDispatcher.dispatch({ type: ActionTypes.SET_FIELD_ERROR, payload: { field: 'code', error: 'Не удалось отправить код повторно' } });
    }
  },

  async verifyCode(code: string) {
    appDispatcher.dispatch({ type: ActionTypes.CLEAR_ERRORS });
    appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: true });

    try {
      await apiClient.post('/check-code', { code });
      if (timerInterval) clearInterval(timerInterval);
      appDispatcher.dispatch({ type: ActionTypes.SET_CODE, payload: code });
      appDispatcher.dispatch({ type: ActionTypes.SET_STEP, payload: PasswordRecoveryStep.NEW_PASS });
    } catch (err) {
      appDispatcher.dispatch({ type: ActionTypes.SET_FIELD_ERROR, payload: { field: 'code', error: 'Неверный или недействительный код' } });
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: false });
    }
  },

  async resetPassword(password: string, repeatPassword: string) {
    appDispatcher.dispatch({ type: ActionTypes.CLEAR_ERRORS });

    let hasError = false;
    const passErrorMsg = validatePassword(password);
    if (passErrorMsg) {
      appDispatcher.dispatch({ type: ActionTypes.SET_FIELD_ERROR, payload: { field: 'password', error: passErrorMsg } });
      hasError = true;
    }

    if (password !== repeatPassword) {
      appDispatcher.dispatch({ type: ActionTypes.SET_FIELD_ERROR, payload: { field: 'repeatPassword', error: 'Пароли не совпадают' } });
      hasError = true;
    }

    if (hasError) return;

    appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: true });
    const code = passwordRecoveryStore.getState().code;

    try {
      await apiClient.post('/reset-password', {
        token_id: code,
        password: password,
        repeated_password: repeatPassword
      });
      navigateTo('/login');
    } catch (err: any) {
      appDispatcher.dispatch({ type: ActionTypes.SET_GLOBAL_ERROR, payload: err.data?.message || err.data?.error || 'Не удалось сохранить новый пароль' });
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: false });
    }
  },

  goBack() {
    const step = passwordRecoveryStore.getState().step;
    if (step === PasswordRecoveryStep.CODE) {
      if (timerInterval) clearInterval(timerInterval);
      appDispatcher.dispatch({ type: ActionTypes.SET_STEP, payload: PasswordRecoveryStep.EMAIL });
      appDispatcher.dispatch({ type: ActionTypes.CLEAR_ERRORS });
    } else {
      navigateTo('/login');
    }
  }
};
