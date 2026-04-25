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

  public getState() {
    return this.state;
  }
}
const store = new SupportAdminStore();

export const SupportAdminActions = {
  async fetchAll() {
    try {
      let ticketsData: any = {};
      let statsData: any = { close: 0, in_work: 0, open: 0 };

      try {
        const tRes = await supportApi.getTickets() as any;
        ticketsData = tRes?.data || tRes || {};
      } catch (e) {
        console.error("Failed to load tickets", e);
      }

      try {
        const sRes = await supportApi.getStatistics() as any;
        statsData = sRes?.data || sRes || statsData;
      } catch (e) {
        console.error("Failed to load stats", e);
      }

      let tickets = [];
      if (Array.isArray(ticketsData)) {
        tickets = ticketsData;
      } else if (Array.isArray(ticketsData?.appeals)) {
        tickets = ticketsData.appeals;
      }

      appDispatcher.dispatch({ type: 'SA_SET_STATE', payload: { tickets, statistics: statsData } });
    } catch (e) {
      console.error("Error in fetchAll", e);
    }
  },

  async openTicket(id: string) {
    const state = store.getState();
    const ticket = state.tickets.find((t: any) => t.appeal_link === id || t.id === id);
    if (ticket) {
      appDispatcher.dispatch({ type: 'SA_SET_STATE', payload: { currentTicket: ticket } });
    }
  },

  async updateTicket(id: string, data: any) {
    try {
      await supportApi.updateTicket(id, data);
      await this.fetchAll();
      this.openTicket(id);
    } catch (e) {
      console.error("Failed to update ticket", e);
    }
  }
};

let boundRender: (() => void) | null = null;

export const renderSupportAdminModule = (appDiv: HTMLElement): void => {
  const render = () => {
    appDiv.innerHTML = template(store.getState());

    appDiv.querySelectorAll('.sa-ticket-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        if (id) SupportAdminActions.openTicket(id);
      });
    });

    const statusSelect = appDiv.querySelector('#sa-status-select') as HTMLSelectElement;
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        const status = (e.target as HTMLSelectElement).value;
        const currentTicket = store.getState().currentTicket;
        if (currentTicket) {
          const id = currentTicket.appeal_link || currentTicket.id;
          SupportAdminActions.updateTicket(id, { status });
        }
      });
    }
  };

  if (boundRender) {
    store.off('change', boundRender);
  }
  boundRender = render;
  store.on('change', boundRender);

  render();
  SupportAdminActions.fetchAll();
};
