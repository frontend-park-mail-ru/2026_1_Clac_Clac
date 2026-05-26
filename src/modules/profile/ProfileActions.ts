import { appDispatcher } from '../../core/Dispatcher';
import { ActionTypes } from './profile.types';
import { authApi, profileApi } from '../../api';
import { navigateTo, setIsAuth } from '../../router';
import { Toast } from '../../utils/toast';
import { setCurrentUser } from '../../main';

export const ProfileActions = {
  resetState() {
    appDispatcher.dispatch({ type: ActionTypes.RESET_STATE });
  },

  async fetchProfile() {
    appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: true });
    try {
      const res = await profileApi.getProfile();
      const user = res.data;
      setCurrentUser(user);
      appDispatcher.dispatch({ type: ActionTypes.SET_USER, payload: user });
    } catch (err: any) {
      console.error('Profile fetch error', err);
      if (err?.status === 401) {
        localStorage.removeItem('isAuth');
        navigateTo('/login');
      } else {
        appDispatcher.dispatch({ type: ActionTypes.SET_ERROR, payload: 'Не удалось загрузить профиль' });
      }
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: false });
    }
  },

  async updateProfile(displayName: string, descriptionUser: string) {
    appDispatcher.dispatch({ type: ActionTypes.SET_IS_SAVING, payload: true });
    appDispatcher.dispatch({ type: ActionTypes.SET_ERROR, payload: null });
    try {
      await profileApi.updateProfile({
        display_name: displayName,
        description_user: descriptionUser,
      });
      await ProfileActions.fetchProfile();
    } catch (e: any) {
      console.error('Save profile failed', e);
      let errorMsg = 'Не удалось сохранить профиль';
      if (e?.status === 400) {
        errorMsg = 'Превышен лимит символов или неверный формат';
      } else if (e?.status === 403) {
        errorMsg = 'Отказано в доступе';
      } else if (e?.status === 404) {
        errorMsg = 'Профиль не найден';
      } else if (e?.status === 409) {
        errorMsg = 'Конфликт при обновлении данных';
      } else if (e?.status === 413) {
        errorMsg = 'Изображение слишком большое';
      } else if (e?.status === 429) {
        errorMsg = 'Слишком много запросов, попробуйте позже';
      } else if (e?.status === 500) {
        errorMsg = 'Ошибка сервера, попробуйте позже';
      }
      appDispatcher.dispatch({ type: ActionTypes.SET_ERROR, payload: errorMsg });
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_SAVING, payload: false });
    }
  },

  async updateAvatar(file: File) {
    appDispatcher.dispatch({ type: ActionTypes.SET_IS_SAVING, payload: true });
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      await profileApi.updateAvatar(fd);
      await ProfileActions.fetchProfile();
    } catch (err: any) {
      console.error('Avatar upload error', err);
      const status = err?.status;
      if (status === 413) {
        Toast.error('Изображение слишком большое');
      } else if (status === 415) {
        Toast.error('Неверный формат изображения');
      } else {
        Toast.error('Не удалось загрузить аватар');
      }
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_SAVING, payload: false });
    }
  },

  async deleteAvatar() {
    appDispatcher.dispatch({ type: ActionTypes.SET_IS_SAVING, payload: true });
    try {
      await profileApi.deleteAvatar();
      appDispatcher.dispatch({ type: ActionTypes.SET_DELETE_MODAL_OPEN, payload: false });
      await ProfileActions.fetchProfile();
    } catch (err) {
      console.error('Avatar delete error', err);
      appDispatcher.dispatch({ type: ActionTypes.SET_ERROR, payload: 'Не удалось удалить аватар' });
    } finally {
      appDispatcher.dispatch({ type: ActionTypes.SET_IS_SAVING, payload: false });
    }
  },

  async logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch (err: unknown) {
      console.error("Logout error", err);
    }
    
    setIsAuth(false);
    localStorage.removeItem("isAuth");
    navigateTo("/login");
  },

  openDeleteModal() {
    appDispatcher.dispatch({ type: ActionTypes.SET_DELETE_MODAL_OPEN, payload: true });
  },

  closeDeleteModal() {
    appDispatcher.dispatch({ type: ActionTypes.SET_DELETE_MODAL_OPEN, payload: false });
  }
};
