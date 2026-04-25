import { appDispatcher } from "../../core/Dispatcher";
import { supportApi } from "../../api";
import Handlebars from "handlebars";
import adminTpl from "../../templates/support_admin.hbs?raw";
import { Store } from "../../core/Store";

const template = Handlebars.compile(adminTpl);

class SupportAdminStore extends Store {
  public state: any = { tickets:[], statistics: { total: 0, open: 0, closed: 0, avgRating: 0 }, currentTicket: null };
  constructor() {
    super();
    appDispatcher.register((action) => {
      if (action.type === 'SA_SET_STATE') {
        this.state = { ...this.state, ...(action.payload as any) };
        this.emit('change');
      }
    });
  }
}
const store = new SupportAdminStore();

export const SupportAdminActions = {
  async fetchAll() {
    try {
      const [tRes, sRes] = await Promise.all([supportApi.getTickets() as any, supportApi.getStatistics() as any]);
      appDispatcher.dispatch({ type: 'SA_SET_STATE', payload: { tickets: tRes.data || tRes, statistics: sRes.data || sRes } });
    } catch(e) {}
  },
  async openTicket(id: string) {
    try {
      const res = await supportApi.getTicket(id) as any;
      appDispatcher.dispatch({ type: 'SA_SET_STATE', payload: { currentTicket: res.data || res } });
    } catch(e) {}
  },
  async updateTicket(id: string, data: any) {
    try {
      await supportApi.updateTicket(id, data);
      this.openTicket(id);
      this.fetchAll();
    } catch(e) {}
  },
  async sendMessage(id: string, text: string) {
    try {
      await supportApi.sendMessage(id, text);
      this.openTicket(id);
    } catch(e) {}
  }
};

export const renderSupportAdminModule = (appDiv: HTMLElement): void => {
  const render = () => {
    appDiv.innerHTML = template(store.state);

    document.querySelectorAll('.sa-ticket-item').forEach(el => {
      el.addEventListener('click', () => SupportAdminActions.openTicket(el.getAttribute('data-id')!));
    });

    document.getElementById('sa-status-select')?.addEventListener('change', (e) => {
      const status = (e.target as HTMLSelectElement).value;
      if (store.state.currentTicket) SupportAdminActions.updateTicket(store.state.currentTicket.id, { status });
    });

    document.getElementById('sa-escalate')?.addEventListener('click', () => {
      if (store.state.currentTicket) SupportAdminActions.updateTicket(store.state.currentTicket.id, { support_line: 2 });
    });

    document.getElementById('sa-btn-send')?.addEventListener('click', () => {
      const text = (document.getElementById('sa-msg-text') as HTMLInputElement).value;
      if (text && store.state.currentTicket) {
        SupportAdminActions.sendMessage(store.state.currentTicket.id, text);
      }
    });

    const msgContainer = document.getElementById('sa-messages');
    if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
  };

  store.on('change', render);
  render();
  SupportAdminActions.fetchAll();
};
