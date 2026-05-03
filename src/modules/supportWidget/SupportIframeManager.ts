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
      
      <div id="sw-close-modal" style="display: none; position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); z-index: 10000; align-items:center; justify-content:center; flex-direction:column; padding: 2rem; text-align: center; backdrop-filter: blur(4px);">
        <h3 style="color:white; margin-bottom: 1rem; font-size: 1.25rem;">Закрыть форму?</h3>
        <p style="color:#ccc; margin-bottom: 2rem; font-size: 0.95rem;">Введенные данные будут потеряны.</p>
        <div style="display:flex; gap: 1rem; width: 100%;">
          <button id="sw-btn-confirm-close" style="flex: 1; padding: 0.8rem; background: #ff5c5c; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: background 0.2s;" onmouseover="this.style.background='#e53e3e'" onmouseout="this.style.background='#ff5c5c'">Закрыть</button>
          <button id="sw-btn-cancel-close" style="flex: 1; padding: 0.8rem; background: transparent; border: 1px solid #666; color: white; border-radius: 8px; cursor: pointer; font-weight: 500; transition: background 0.2s;" onmouseover="this.style.background='#333'" onmouseout="this.style.background='transparent'">Отмена</button>
        </div>
      </div>
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
