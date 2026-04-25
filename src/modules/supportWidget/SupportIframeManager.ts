export class SupportIframeManager {
  private static container: HTMLElement | null = null;

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

    document.getElementById('close-support-iframe')?.addEventListener('click', () => {
      this.hide();
    });
  }

  static toggle() {
    this.init();
    if (this.container?.classList.contains('visible')) {
      this.hide();
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
