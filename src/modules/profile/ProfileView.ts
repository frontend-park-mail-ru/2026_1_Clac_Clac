import Handlebars from 'handlebars';
import profileTpl from '../../templates/profile.hbs?raw';
import { profileStore } from './ProfileStore';
import { ProfileActions } from './ProfileActions';
import { navigateTo } from '../../router';
import { UserProfile } from './profile.types';

const template = Handlebars.compile(profileTpl);

export class ProfileView {
  private appDiv: HTMLElement;
  private boundUpdate: () => void;
  private currentUser: UserProfile | null = null;
  private isInitialRender: boolean = true;

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
    this.boundUpdate = this.update.bind(this);
  }

  public mount() {
    ProfileActions.resetState();
    profileStore.on('change', this.boundUpdate);
    ProfileActions.fetchProfile();
  }

  public unmount() {
    profileStore.off('change', this.boundUpdate);
  }

  private update() {
    const state = profileStore.getState();

    if (state.isLoading && this.isInitialRender) {
      return;
    }

    if (state.user && (this.isInitialRender || this.currentUser !== state.user)) {
      this.isInitialRender = false;
      this.currentUser = state.user;
      this.appDiv.innerHTML = template({ user: state.user });
      this.attachListeners();
    }

    if (state.user) {
      this.updateUI(state);
    }
  }

  private attachListeners() {
    document.getElementById('nav-boards')?.addEventListener('click', () => navigateTo('/boards'));
    document.getElementById('logout-btn')?.addEventListener('click', () => ProfileActions.logout());

    const form = document.getElementById('profile-form');
    const nameInput = document.getElementById('profile-name') as HTMLInputElement;
    const descInput = document.getElementById('profile-desc') as HTMLTextAreaElement;
    const btnSave = document.getElementById('btn-save-profile') as HTMLButtonElement;

    const checkChanges = () => {
      const state = profileStore.getState();
      const user = state.user;
      if (!user) return;

      if (
        nameInput.value !== user.display_name ||
        descInput.value !== (user.description_user || '')
      ) {
        btnSave.classList.add('profile__btn-active');
        btnSave.classList.remove('profile__btn-disabled');
        btnSave.disabled = false;
      } else {
        btnSave.classList.add('profile__btn-disabled');
        btnSave.classList.remove('profile__btn-active');
        btnSave.disabled = true;
      }
    };

    nameInput?.addEventListener('input', checkChanges);
    descInput?.addEventListener('input', checkChanges);

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      ProfileActions.updateProfile(nameInput.value.trim(), descInput.value.trim());
    });

    const avatarUpload = document.getElementById('avatar-upload') as HTMLInputElement;
    avatarUpload?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        ProfileActions.updateAvatar(file);
      }
    });

    document.getElementById('btn-delete-avatar')?.addEventListener('click', () => {
      const state = profileStore.getState();
      if (state.user?.avatar_url) {
        ProfileActions.openDeleteModal();
      }
    });

    document.querySelectorAll('.modal__close-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        ProfileActions.closeDeleteModal();
      });
    });

    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay?.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        ProfileActions.closeDeleteModal();
      }
    });

    document.getElementById('confirm-delete-avatar')?.addEventListener('click', () => {
      ProfileActions.deleteAvatar();
    });
  }

  private updateUI(state: any) {
    const btnSave = document.getElementById('btn-save-profile') as HTMLButtonElement;
    if (btnSave) {
      if (state.isSaving) {
        btnSave.disabled = true;
      } else {
        const nameInput = document.getElementById('profile-name') as HTMLInputElement;
        const descInput = document.getElementById('profile-desc') as HTMLTextAreaElement;
        const user = state.user;
        if (user && nameInput && descInput) {
          if (
            nameInput.value !== user.display_name ||
            descInput.value !== (user.description_user || '')
          ) {
            btnSave.classList.add('profile__btn-active');
            btnSave.classList.remove('profile__btn-disabled');
            btnSave.disabled = false;
          } else {
            btnSave.classList.add('profile__btn-disabled');
            btnSave.classList.remove('profile__btn-active');
            btnSave.disabled = true;
          }
        }
      }
    }

    const modalOverlay = document.getElementById('modal-overlay');
    const modalDelete = document.getElementById('modal-delete-avatar');

    if (modalOverlay && modalDelete) {
      if (state.isDeleteModalOpen) {
        modalOverlay.classList.remove('hidden');
        modalDelete.classList.remove('hidden');
      } else {
        modalOverlay.classList.add('hidden');
        modalDelete.classList.add('hidden');
      }
    }
  }
}
