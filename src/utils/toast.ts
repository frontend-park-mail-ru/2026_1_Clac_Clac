export class Toast {
  private static container: HTMLDivElement | null = null;

  private static initContainer() {
    if (this.container && document.body.contains(this.container)) {
      return;
    }
    this.container = document.createElement("div");
    this.container.className = "toast-container";
    document.body.appendChild(this.container);
  }

  static show(
    message: string,
    type: "success" | "error" | "info" = "info",
    duration = 4000,
  ) {
    this.initContainer();
    const toast = document.createElement("div");

    toast.className = `toast toast--${type}`;

    toast.innerHTML = `
      <span class="toast__msg"></span>
      <button class="toast__close">&times;</button>
    `;

    const msgEl = toast.querySelector<HTMLElement>(".toast__msg");
    if (msgEl) msgEl.textContent = message;

    this.container!.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("toast--visible");
    });

    const remove = () => {
      toast.classList.remove("toast--visible");
      setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector("button")?.addEventListener("click", remove);

    if (duration > 0) {
      setTimeout(remove, duration);
    }
  }

  static success(msg: string) {
    this.show(msg, "success");
  }
  static error(msg: string) {
    this.show(msg, "error");
  }
  static info(msg: string) {
    this.show(msg, "info");
  }
}
