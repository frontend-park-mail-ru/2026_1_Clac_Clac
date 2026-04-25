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
  public state: any = { view: 'list', tickets: [], role: 'user', currentTicket: null };
  constructor() {
    super();
    appDispatcher.register((action) => {
      if (action.type === 'SW_SET_STATE') {
        this.state = { ...this.state, ...(action.payload as any) };
        this.emit('change');
      }
    });
  }

  public getState() {
    return this.state;
  }
}

const store = new SupportWidgetStore();

export const SupportWidgetActions = {
  async fetchTickets() {
    try {
      const res = await supportApi.getTickets() as any;
      const data = res?.data || res || {};

      let tickets = [];
      if (Array.isArray(data)) {
        tickets = data;
      } else if (Array.isArray(data?.appeals)) {
        tickets = data.appeals;
      }

      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { tickets, role: data.role || 'user' } });
    } catch (e) {
      console.error("Failed to fetch tickets", e);
    }
  },

  async createTicket(data: { email: string, name: string, category: string, description: string, title: string, file: File | null }) {
    try {
      const res = await supportApi.createTicket({
        mail: data.email,
        display_name: data.title,
        category: data.category,
        description: data.description
      }) as any;

      let newTicketId = typeof res === 'string' ? res : (res.data?.appeal_link || res.data || res.appeal_link || res);

      if (typeof newTicketId === 'string' && newTicketId.startsWith('"') && newTicketId.endsWith('"')) {
        newTicketId = newTicketId.slice(1, -1);
      }

      if (data.file && newTicketId && typeof newTicketId === 'string') {
        const fd = new FormData();
        fd.append('attachment', data.file);
        await supportApi.uploadAttachment(newTicketId, fd);
      }

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
    const state = store.getState();
    const ticket = state.tickets.find((t: any) => t.appeal_link === id || t.id === id);
    if (ticket) {
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { currentTicket: ticket, view: 'chat' } });
    }
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
    appDiv.innerHTML = template({ ...store.getState(), user: currentUser });

    appDiv.querySelector('#sw-btn-create')?.addEventListener('click', () => {
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { view: 'create' } });
    });

    appDiv.querySelector('#sw-btn-back')?.addEventListener('click', () => {
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { view: 'list' } });
    });

    if (store.getState().view === 'create') {
      const catBtn = appDiv.querySelector('#sw-category-btn');
      const catText = appDiv.querySelector('#sw-category-text');
      const catDropdown = appDiv.querySelector('#sw-category-dropdown');
      const submitBtn = appDiv.querySelector('#sw-btn-submit') as HTMLButtonElement;
      let selectedCategory = 'Баг';

      catBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        catDropdown?.classList.toggle('hidden');
      });

      appDiv.querySelectorAll('.support-widget__dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          selectedCategory = (e.target as HTMLElement).textContent || 'Баг';
          if (catText) catText.textContent = selectedCategory;
        });
      });

      const fileInput = appDiv.querySelector('#sw-attachment') as HTMLInputElement;
      const fileName = appDiv.querySelector('#sw-attachment-name');
      const fileHint = appDiv.querySelector('#sw-attachment-hint');
      const fileIcon = appDiv.querySelector('#sw-attachment-icon') as HTMLElement;
      const previewContainer = appDiv.querySelector('#sw-attachment-preview-container');
      const previewImg = appDiv.querySelector('#sw-attachment-preview') as HTMLImageElement;
      const removeBtn = appDiv.querySelector('#sw-attachment-remove');
      let selectedFile: File | null = null;

      fileInput?.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          selectedFile = file;

          if (fileName) fileName.textContent = file.name;
          if (fileHint) (fileHint as HTMLElement).style.display = 'none';
          if (fileIcon) fileIcon.style.display = 'none';
          if (removeBtn) removeBtn.classList.remove('hidden');

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

      removeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();

        selectedFile = null;
        if (fileInput) fileInput.value = '';

        if (fileName) fileName.textContent = 'Прикрепить фото';
        if (fileHint) (fileHint as HTMLElement).style.display = 'inline';
        if (fileIcon) fileIcon.style.display = 'inline-block';
        if (removeBtn) removeBtn.classList.add('hidden');

        if (previewContainer && previewImg) {
          previewContainer.classList.add('hidden');
          previewImg.src = '';
        }
      });

      const validateForm = () => {
        const email = (appDiv.querySelector('#sw-email') as HTMLInputElement)?.value.trim();
        const name = (appDiv.querySelector('#sw-name') as HTMLInputElement)?.value.trim();
        const desc = (appDiv.querySelector('#sw-desc') as HTMLTextAreaElement)?.value.trim();

        const isEmailValid = validateEmail(email);

        if (submitBtn) {
          submitBtn.disabled = !(isEmailValid && name && desc);
        }
      };['sw-email', 'sw-name', 'sw-desc'].forEach(id => {
        appDiv.querySelector(`#${id}`)?.addEventListener('input', (e) => {
          (e.target as HTMLElement).classList.remove('input-group__field--error');
          validateForm();
        });
      });

      validateForm();

      submitBtn?.addEventListener('click', async () => {
        const email = (appDiv.querySelector('#sw-email') as HTMLInputElement).value.trim();
        const name = (appDiv.querySelector('#sw-name') as HTMLInputElement).value.trim();
        const desc = (appDiv.querySelector('#sw-desc') as HTMLTextAreaElement).value.trim();

        if (validateEmail(email) && name && desc) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Отправка...';

          try {
            await SupportWidgetActions.createTicket({
              email,
              name,
              category: selectedCategory,
              description: desc,
              title: `[${selectedCategory}] Обращение от ${name}`,
              file: selectedFile
            });
          } catch (e) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить';
          }
        }
      });
    }

    appDiv.querySelectorAll('.support-widget__ticket').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        if (id) SupportWidgetActions.openTicket(id);
      });
    });
  };

  if (boundRender) {
    store.off('change', boundRender);
  }
  boundRender = render;
  store.on('change', boundRender);

  render();
  SupportWidgetActions.fetchTickets();
};
