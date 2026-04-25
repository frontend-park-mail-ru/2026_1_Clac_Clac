import { appDispatcher } from "../../core/Dispatcher";
import { supportApi } from "../../api";
import Handlebars from "handlebars";
import widgetTpl from "../../templates/support_widget.hbs?raw";
import { Store } from "../../core/Store";
import { currentUser } from "../../main";

const template = Handlebars.compile(widgetTpl);

interface SupportState {
  view: 'list' | 'create' | 'chat';
  tickets: any[];
  currentTicket: any | null;
  isLoading: boolean;
}

class SupportWidgetStore extends Store {
  public state: SupportState = { 
    view: 'list', 
    tickets:[], 
    currentTicket: null, 
    isLoading: false 
  };

  constructor() {
    super();
    appDispatcher.register((action) => {
      if (action.type === 'SW_SET_STATE') {
        this.state = { ...this.state, ...(action.payload as Partial<SupportState>) };
        this.emit('change');
      }
    });
  }
}

const store = new SupportWidgetStore();

export const SupportWidgetActions = {
  async fetchTickets() {
    try {
      const res = await supportApi.getTickets() as any;
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { tickets: res.data || res } });
    } catch(e) {
      console.error("Ошибка при получении тикетов:", e);
    }
  },
  
  async createTicket(data: FormData) {
    try {
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { isLoading: true } });
      await supportApi.createTicket(data);
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { view: 'list', isLoading: false } });
      SupportWidgetActions.fetchTickets();
    } catch(e) {
      console.error("Ошибка при создании тикета:", e);
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { isLoading: false } });
    }
  },
  
  async openTicket(id: string) {
    try {
      const res = await supportApi.getTicket(id) as any;
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { currentTicket: res.data || res, view: 'chat' } });
    } catch(e) {
      console.error("Ошибка при открытии тикета:", e);
    }
  },
  
  async sendMessage(id: string, text: string) {
    try {
      await supportApi.sendMessage(id, text);
      SupportWidgetActions.openTicket(id);
    } catch(e) {
      console.error("Ошибка при отправке сообщения:", e);
    }
  },
  
  async rateTicket(id: string, rating: number) {
    try {
      await supportApi.updateTicket(id, { rating });
      SupportWidgetActions.openTicket(id);
    } catch(e) {
      console.error("Ошибка при оценке тикета:", e);
    }
  }
};

let isBound = false;
let boundRender: (() => void) | null = null;

document.addEventListener('click', (e) => {
  const catDropdown = document.getElementById('sw-category-dropdown');
  const catBtn = document.getElementById('sw-category-btn');
  if (catDropdown && catBtn && !catBtn.contains(e.target as Node)) {
    catDropdown.classList.add('hidden');
  }
});

export const renderSupportWidgetModule = (appDiv: HTMLElement): void => {
  const render = () => {
    appDiv.innerHTML = template({ ...store.state, user: currentUser });

    const submitBtn = document.getElementById('sw-btn-submit') as HTMLButtonElement;
    if (submitBtn && store.state.isLoading) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправка...';
    }

    document.getElementById('sw-btn-create')?.addEventListener('click', () => {
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { view: 'create' } });
    });

    document.getElementById('sw-btn-back')?.addEventListener('click', () => {
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { view: 'list' } });
    });

    if (store.state.view === 'create') {
      const catBtn = document.getElementById('sw-category-btn');
      const catText = document.getElementById('sw-category-text');
      const catDropdown = document.getElementById('sw-category-dropdown');
      const submitBtn = document.getElementById('sw-btn-submit') as HTMLButtonElement;
      let selectedCategory = 'Баг';

      catBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        catDropdown?.classList.toggle('hidden');
      });

      document.addEventListener('click', () => {
        catDropdown?.classList.add('hidden');
      });

      document.querySelectorAll('.support-widget__dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          selectedCategory = (e.target as HTMLElement).textContent || 'Баг';
          if (catText) catText.textContent = selectedCategory;
        });
      });

      const fileInput = document.getElementById('sw-attachment') as HTMLInputElement;
      const fileName = document.getElementById('sw-attachment-name');
      const fileHint = document.getElementById('sw-attachment-hint');
      let selectedFile: File | null = null;

      fileInput?.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          selectedFile = file;
          if (fileName) fileName.textContent = file.name;
          if (fileHint) fileHint.style.display = 'none'; // Скрываем подпись (необязательно)
        }
      });

      const validateForm = () => {
        const email = (document.getElementById('sw-email') as HTMLInputElement)?.value.trim();
        const name = (document.getElementById('sw-name') as HTMLInputElement)?.value.trim();
        const desc = (document.getElementById('sw-desc') as HTMLTextAreaElement)?.value.trim();
        
        if (submitBtn) {
          submitBtn.disabled = !(email && name && desc);
        }
      };

      ['sw-email', 'sw-name', 'sw-desc'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', (e) => {
           (e.target as HTMLElement).classList.remove('input-group__field--error');
           validateForm();
        });
      });

      validateForm();

      submitBtn?.addEventListener('click', () => {
        const email = (document.getElementById('sw-email') as HTMLInputElement).value.trim();
        const name = (document.getElementById('sw-name') as HTMLInputElement).value.trim();
        const desc = (document.getElementById('sw-desc') as HTMLTextAreaElement).value.trim();

        if (email && name && desc) {
          const fd = new FormData();
          fd.append('email', email);
          fd.append('name', name);
          fd.append('category', selectedCategory);
          fd.append('description', desc);
          fd.append('title', `[${selectedCategory}] Обращение от ${name}`);
          
          if (selectedFile) {
            fd.append('file', selectedFile);
          }

          submitBtn.disabled = true;
          submitBtn.textContent = 'Отправка...';

          SupportWidgetActions.createTicket(fd);
        }
      });
    }

    document.querySelectorAll('.support-widget__ticket').forEach(el => {
      el.addEventListener('click', () => SupportWidgetActions.openTicket(el.getAttribute('data-id')!));
    });

    document.getElementById('sw-btn-send')?.addEventListener('click', () => {
      const text = (document.getElementById('sw-msg-text') as HTMLInputElement).value;
      if (text && store.state.currentTicket) {
        SupportWidgetActions.sendMessage(store.state.currentTicket.id, text);
      }
    });

    document.querySelectorAll('.star').forEach(star => {
      star.addEventListener('click', (e) => {
        const rating = parseInt((e.target as HTMLElement).getAttribute('data-val')!);
        if (store.state.currentTicket) {
          SupportWidgetActions.rateTicket(store.state.currentTicket.id, rating);
        }
      });
    });

    const msgContainer = document.getElementById('sw-messages');
    if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
  };

  if (boundRender) {
    store.off('change', boundRender);
  }
  boundRender = render;
  store.on('change', boundRender);
  
  render();
  
  if (!isBound) {
    SupportWidgetActions.fetchTickets();
    isBound = true;
  }
};
