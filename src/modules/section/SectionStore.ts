import { Store } from '../../core/Store';
import { appDispatcher, Action } from '../../core/Dispatcher';
import { SectionState, ActionTypes, SectionData } from './section.types';

const initialState: SectionState = {
  boardId: null,
  sectionId: null,
  boardName: 'Без названия',
  sectionData: null,
  selectedColor: 'white',
  isLoading: false,
  isSaving: false,
  isDeleteModalOpen: false,
};

class SectionStore extends Store {
  private state: SectionState = { ...initialState };

  public getState(): SectionState {
    return this.state;
  }

  constructor() {
    super();
    appDispatcher.register((action: Action) => {
      switch (action.type) {
        case ActionTypes.SET_IDS:
          const { boardId, sectionId } = action.payload as { boardId: string; sectionId: string };
          this.state.boardId = boardId;
          this.state.sectionId = sectionId;
          this.emit('change');
          break;
        case ActionTypes.SET_BOARD_NAME:
          this.state.boardName = action.payload as string;
          this.emit('change');
          break;
        case ActionTypes.SET_SECTION_DATA:
          this.state.sectionData = action.payload as SectionData;
          this.emit('change');
          break;
        case ActionTypes.SET_COLOR:
          this.state.selectedColor = action.payload as string;
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
        case ActionTypes.RESET_STATE:
          this.state = { ...initialState };
          this.emit('change');
          break;
      }
    });
  }
}

export const sectionStore = new SectionStore();
