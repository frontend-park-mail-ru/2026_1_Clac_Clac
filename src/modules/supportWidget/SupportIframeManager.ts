export class SupportIframeManager {
  private static container: HTMLElement | null = null;
  private static isCreateView: boolean = false;

  static init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'support-iframe-container';
    this.container.innerHTML = `
      <div class="support-iframe__header">
        <h3>Служба поддержки</h3>
        <button id="close-support-iframe">&times;</button>
      </div>
      <iframe src="/support-widget" id="support-iframe-el"></iframe>
    `;
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
  }

  static attemptClose() {
    if (this.isCreateView) {
      if (confirm('Вы уверены, что хотите закрыть? Введенные данные будут потеряны.')) {
        this.hide();
      }
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
    this.container?.classList.remove('visible');
  }
}
