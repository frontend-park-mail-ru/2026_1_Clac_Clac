import { appDispatcher } from "../../core/Dispatcher";
import { supportApi } from "../../api";
import Handlebars from "handlebars";
import adminTpl from "../../templates/support_admin.hbs?raw";
import { Store } from "../../core/Store";

const template = Handlebars.compile(adminTpl);

class SupportAdminStore extends Store {
  public state: any = { tickets: new Array(), statistics: { new: 0, in_progress: 0, closed: 0 }, currentTicket: null };
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
      const tRes = await supportApi.getTickets() as any;
      const rawData = tRes?.data || tRes || {};

      let resultList = new Array();
      if (Array.isArray(rawData)) {
        resultList = rawData;
      } else if (rawData && Array.isArray(rawData.appeals)) {
        resultList = rawData.appeals;
      }

      const stats = { new: 0, in_progress: 0, closed: 0 };

      for (let i = 0; i < resultList.length; i++) {
        const s = resultList[i].status;
        if (s === 'new') stats.new += 1;
        if (s === 'in_progress') stats.in_progress += 1;
        if (s === 'closed') stats.closed += 1;
      }

      appDispatcher.dispatch({
        type: 'SA_SET_STATE',
        payload: { tickets: resultList, statistics: stats }
      });
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
