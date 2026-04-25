import { appDispatcher } from "../../core/Dispatcher";
import { supportApi } from "../../api";
import Handlebars from "handlebars";
import adminTpl from "../../templates/support_admin.hbs?raw";
import { Store } from "../../core/Store";

const template = Handlebars.compile(adminTpl);

class SupportAdminStore extends Store {
  public state: any = { tickets: [], statistics: { close: 0, in_work: 0, open: 0 }, currentTicket: null };
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
      const ticketsData = tRes.data || tRes;
      const statsData = sRes.data || sRes;

      const tickets = ticketsData.appeals || [];
      appDispatcher.dispatch({ type: 'SA_SET_STATE', payload: { tickets, statistics: statsData } });
    } catch (e) { }
  },
  async openTicket(id: string) {
    const state = store.state;
    const ticket = state.tickets.find((t: any) => t.appeal_link === id);
    if (ticket) {
      appDispatcher.dispatch({ type: 'SA_SET_STATE', payload: { currentTicket: ticket } });
    }
  },
  async updateTicket(id: string, data: any) {
    try {
      await supportApi.updateTicket(id, data);
      await this.fetchAll();
      this.openTicket(id);
    } catch (e) { }
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
      if (store.state.currentTicket) SupportAdminActions.updateTicket(store.state.currentTicket.appeal_link, { status });
    });
  };

  store.on('change', render);
  render();
  SupportAdminActions.fetchAll();
};
