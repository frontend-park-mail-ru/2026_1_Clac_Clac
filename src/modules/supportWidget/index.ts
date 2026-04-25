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
}

const store = new SupportWidgetStore();

export const SupportWidgetActions = {
  async fetchTickets() {
    try {
      const res = await supportApi.getTickets() as any;
      const data = res.data || res;
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { tickets: data.appeals || [], role: data.role } });
    } catch (e) { }
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
    const state = store.state;
    const ticket = state.tickets.find((t: any) => t.appeal_link === id);
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
      const removeBtn = document.getElementById('sw-attachment-remove');
      let selectedFile: File | null = null;

      fileInput?.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          selectedFile = file;

          if (fileName) fileName.textContent = file.name;
          if (fileHint) fileHint.style.display = 'none';
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
        if (fileHint) fileHint.style.display = 'inline';
        if (fileIcon) fileIcon.style.display = 'inline-block';
        if (removeBtn) removeBtn.classList.add('hidden');

        if (previewContainer && previewImg) {
          previewContainer.classList.add('hidden');
          previewImg.src = '';
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
      };['sw-email', 'sw-name', 'sw-desc'].forEach(id => {
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

    document.querySelectorAll('.support-widget__ticket').forEach(el => {
      el.addEventListener('click', () => SupportWidgetActions.openTicket(el.getAttribute('data-id')!));
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
