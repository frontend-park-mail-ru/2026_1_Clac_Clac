import { Store } from '../../core/Store';
import { appDispatcher, Action } from '../../core/Dispatcher';
import { ProfileState, ActionTypes, UserProfile } from './profile.types';

const initialState: ProfileState = {
  user: null,
  isLoading: false,
  isSaving: false,
  isDeleteModalOpen: false,
  error: null,
};

class ProfileStore extends Store {
  private state: ProfileState = { ...initialState };

  public getState(): ProfileState {
    return this.state;
  }

  constructor() {
    super();
    appDispatcher.register((action: Action) => {
      switch (action.type) {
        case ActionTypes.SET_USER:
          this.state.user = action.payload as UserProfile;
          this.emit('change');
          break;
        case ActionTypes.SET_IS_LOADING:
          this.state.isLoading = action.payload as boolean;
          this.emit('change');
          break;
        case ActionTypes.SET_IS_SAVING:
          this.state.isSaving = action.payload as boolean;
          this.emit('change');
          break;
        case ActionTypes.SET_DELETE_MODAL_OPEN:
          this.state.isDeleteModalOpen = action.payload as boolean;
          this.emit('change');
          break;
        case ActionTypes.SET_ERROR:
          this.state.error = action.payload as string | null;
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

export const profileStore = new ProfileStore();
