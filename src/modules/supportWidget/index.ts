import { appDispatcher } from "../../core/Dispatcher";
import { supportApi } from "../../api";
import Handlebars from "handlebars";
import widgetTpl from "../../templates/support_widget.hbs?raw";
import { Store } from "../../core/Store";

const template = Handlebars.compile(widgetTpl);

class SupportWidgetStore extends Store {
  public state: any = { view: 'list', tickets:[], currentTicket: null };
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
    } catch(e) {}
  },
  async createTicket(data: any) {
    try {
      await supportApi.createTicket(data);
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { view: 'list' } });
      this.fetchTickets();
    } catch(e) {}
  },
  async openTicket(id: string) {
    try {
      const res = await supportApi.getTicket(id) as any;
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { currentTicket: res.data || res, view: 'chat' } });
    } catch(e) {}
  },
  async sendMessage(id: string, text: string) {
    try {
      await supportApi.sendMessage(id, text);
      this.openTicket(id);
    } catch(e) {}
  },
  async rateTicket(id: string, rating: number) {
    try {
      await supportApi.updateTicket(id, { rating });
      this.openTicket(id);
    } catch(e) {}
  }
};

export const renderSupportWidgetModule = (appDiv: HTMLElement): void => {
  const render = () => {
    appDiv.innerHTML = template(store.state);

    document.getElementById('sw-btn-create')?.addEventListener('click', () => {
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { view: 'create' } });
    });

    document.getElementById('sw-btn-back')?.addEventListener('click', () => {
      appDispatcher.dispatch({ type: 'SW_SET_STATE', payload: { view: 'list' } });
    });

    document.getElementById('sw-btn-submit')?.addEventListener('click', () => {
      const title = (document.getElementById('sw-title') as HTMLInputElement).value;
      const desc = (document.getElementById('sw-desc') as HTMLTextAreaElement).value;
      const cat = (document.getElementById('sw-category') as HTMLSelectElement).value;
      if (title && desc) SupportWidgetActions.createTicket({ title, description: desc, category: cat });
    });

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

  store.on('change', render);
  render();
  SupportWidgetActions.fetchTickets();
};
