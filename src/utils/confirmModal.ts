import { escapeHtml } from "../utils";

export function showConfirmModal(options: {
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
}): void {
  const overlay = document.createElement("div");
  overlay.className = "modal__overlay";
  overlay.style.zIndex = "2010";
  overlay.style.opacity = "0";
  overlay.style.pointerEvents = "auto";

  overlay.innerHTML = `
    <div class="modal" style="display:block">
      <div class="modal__header">
        <h2 class="modal__title"></h2>
        <button class="modal__close-btn" id="confirm-modal-close">×</button>
      </div>
      <p class="modal__text"></p>
      <div class="modal__actions">
        <button class="btn btn--danger" id="confirm-modal-ok">${escapeHtml(options.confirmLabel)}</button>
        <button class="btn btn--cancel" id="confirm-modal-cancel">Отменить</button>
      </div>
    </div>
  `;

  const titleEl = overlay.querySelector<HTMLElement>(".modal__title");
  const textEl = overlay.querySelector<HTMLElement>(".modal__text");
  if (titleEl) titleEl.textContent = options.title;
  if (textEl) textEl.textContent = options.text;

  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.transition = "opacity 0.2s ease";
    overlay.style.opacity = "1";
  });

  const close = () => {
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector("#confirm-modal-ok")?.addEventListener("click", () => {
    close();
    options.onConfirm();
  });

  overlay.querySelector("#confirm-modal-cancel")?.addEventListener("click", close);
  overlay.querySelector("#confirm-modal-close")?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
}
