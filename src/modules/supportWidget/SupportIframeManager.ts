import supportIframeTemplate from './supportIframeTemplate.hbs?raw';

export class SupportIframeManager {
  private static container: HTMLElement | null = null;
  private static isCreateView: boolean = false;

  static init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'support-iframe-container';
    this.container.innerHTML = supportIframeTemplate;
    document.body.appendChild(this.container);

    window.addEventListener('message', (e) => {
      if (e.data?.type === 'SUPPORT_WIDGET_STATE') {
        this.isCreateView = e.data.view === 'create';
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (!this.container?.classList.contains('visible')) return;
      const target = e.target as HTMLElement;
      if (target.closest('#nav-support')) return;
      if (!this.container.contains(target)) {
        this.attemptClose();
      }
    });

    document.getElementById('close-support-iframe')?.addEventListener('click', () => {
      this.attemptClose();
    });

    document.getElementById('sw-btn-confirm-close')?.addEventListener('click', () => {
      document.getElementById('sw-close-modal')!.style.display = 'none';
      this.hide();
    });

    document.getElementById('sw-btn-cancel-close')?.addEventListener('click', () => {
      document.getElementById('sw-close-modal')!.style.display = 'none';
    });
  }

  static attemptClose() {
    if (this.isCreateView) {
      document.getElementById('sw-close-modal')!.style.display = 'flex';
    } else {
      this.hide();
    }
  }

  static toggle() {
    this.init();
    if (this.container?.classList.contains('visible')) {
      this.attemptClose();
    } else {
      this.show();
    }
  }

  static show() {
    this.init();
    this.container?.classList.add('visible');
  }

  static hide() {
    const modal = document.getElementById('sw-close-modal');
    if (modal) modal.style.display = 'none';
    this.container?.classList.remove('visible');
  }
}
