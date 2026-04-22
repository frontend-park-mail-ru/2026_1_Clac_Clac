import { appDispatcher } from '../../core/Dispatcher';
import { ActionTypes } from './profile.types';
import { authApi, profileApi } from '../../api';
import { navigateTo } from '../../router';

export const ProfileActions = {
  resetState() {
    appDispatcher.dispatch({ type: ActionTypes.RESET_STATE });
  },

  async fetchProfile() {
    appDispatcher.dispatch({ type: ActionTypes.SET_IS_LOADING, payload: true });
    try {
      const res = await profileApi.getProfile() as any;
      const user = res.data || res;
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
    try {
      await profileApi.updateProfile({
        display_name: displayName,
        description_user: descriptionUser,
      });
      await ProfileActions.fetchProfile();
    } catch (e) {
      console.error('Save profile failed', e);
      appDispatcher.dispatch({ type: ActionTypes.SET_ERROR, payload: 'Не удалось сохранить профиль' });
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
    } catch (err) {
      console.error('Avatar upload error', err);
      appDispatcher.dispatch({ type: ActionTypes.SET_ERROR, payload: 'Не удалось загрузить аватар' });
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

  async logout() {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error', err);
    }
    localStorage.removeItem('isAuth');
    navigateTo('/login');
  },

  openDeleteModal() {
    appDispatcher.dispatch({ type: ActionTypes.SET_DELETE_MODAL_OPEN, payload: true });
  },

  closeDeleteModal() {
    appDispatcher.dispatch({ type: ActionTypes.SET_DELETE_MODAL_OPEN, payload: false });
  }
};
