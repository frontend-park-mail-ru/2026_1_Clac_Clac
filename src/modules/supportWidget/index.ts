import { appDispatcher } from "../../core/Dispatcher";
import { supportApi } from "../../api";
import Handlebars from "handlebars";
import widgetTpl from "../../templates/support_widget.hbs?raw";
import { Store } from "../../core/Store";
import { currentUser } from "../../main";
import { validateEmail } from "../../utils";
import { Toast } from "../../utils/toast";

const template = Handlebars.compile(widgetTpl);

class SupportWidgetStore extends Store {
  public state: any = { view: 'list', tickets: [], currentTicket: null };
  constructor() {
    super();
    appDispatcher.register((action) => {
      if (action.type === 'SW_SET_STATE') {
        this.state = { ...this.state, ...(action.payload as any) };
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
    } catch (e) { }
  },

  async createTicket(data: FormData) {
    try {
      await supportApi.createTicket(data);
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { view: 'list' } });
      this.fetchTickets();
      Toast.success("Обращение отправлено");
    } catch (e: any) {
      console.error("Ошибка при создании тикета:", e);
      const msg = e.data?.message || e.data?.error || "Ошибка при отправке";
      Toast.error(msg);
      throw e;
    }
  },

  async openTicket(id: string) {
    try {
      const res = await supportApi.getTicket(id) as any;
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { currentTicket: res.data || res, view: 'chat' } });
    } catch (e) { }
  },

  async sendMessage(id: string, text: string) {
    try {
      await supportApi.sendMessage(id, text);
      this.openTicket(id);
    } catch (e) { }
  },

  async rateTicket(id: string, rating: number) {
    try {
      await supportApi.updateTicket(id, { rating });
      this.openTicket(id);
    } catch (e) { }
  }
};

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

      document.addEventListener('click', () => catDropdown?.classList.add('hidden'));

      document.querySelectorAll('.support-widget__dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          selectedCategory = (e.target as HTMLElement).textContent || 'Баг';
          if (catText) catText.textContent = selectedCategory;
        });
      });

      const fileInput = document.getElementById('sw-attachment') as HTMLInputElement;
      const fileName = document.getElementById('sw-attachment-name');
      const fileHint = document.getElementById('sw-attachment-hint');
      const fileIcon = document.getElementById('sw-attachment-icon');
      const previewContainer = document.getElementById('sw-attachment-preview-container');
      const previewImg = document.getElementById('sw-attachment-preview') as HTMLImageElement;
      let selectedFile: File | null = null;

      fileInput?.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          selectedFile = file;

          if (fileName) fileName.textContent = file.name;
          if (fileHint) fileHint.style.display = 'none';
          if (fileIcon) fileIcon.style.display = 'none';

          if (previewContainer && previewImg) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                previewImg.src = event.target.result as string;
                previewContainer.classList.remove('hidden');
              }
            };
            reader.readAsDataURL(file);
          }
        }
      });

      const validateForm = () => {
        const email = (document.getElementById('sw-email') as HTMLInputElement)?.value.trim();
        const name = (document.getElementById('sw-name') as HTMLInputElement)?.value.trim();
        const desc = (document.getElementById('sw-desc') as HTMLTextAreaElement)?.value.trim();

        const isEmailValid = validateEmail(email);

        if (submitBtn) {
          submitBtn.disabled = !(isEmailValid && name && desc);
        }
      };

      ['sw-email', 'sw-name', 'sw-desc'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', (e) => {
          (e.target as HTMLElement).classList.remove('input-group__field--error');
          validateForm();
        });
      });

      validateForm();

      submitBtn?.addEventListener('click', async () => {
        const email = (document.getElementById('sw-email') as HTMLInputElement).value.trim();
        const name = (document.getElementById('sw-name') as HTMLInputElement).value.trim();
        const desc = (document.getElementById('sw-desc') as HTMLTextAreaElement).value.trim();

        if (validateEmail(email) && name && desc) {
          const fd = new FormData();
          fd.append('email', email);
          fd.append('name', name);
          fd.append('category', selectedCategory);
          fd.append('description', desc);
          fd.append('title', `[${selectedCategory}] Обращение от ${name}`);

          if (selectedFile) fd.append('file', selectedFile);

          submitBtn.disabled = true;
          submitBtn.textContent = 'Отправка...';

          try {
            await SupportWidgetActions.createTicket(fd);
          } catch (e) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить';
          }
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
        if (store.state.currentTicket) SupportWidgetActions.rateTicket(store.state.currentTicket.id, rating);
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
  SupportWidgetActions.fetchTickets();
};
