export class Toast {
  private static container: HTMLDivElement | null = null;

  private static initContainer() {
    if (this.container && document.body.contains(this.container)) {
      return;
    }
    this.container = document.createElement("div");
    this.container.id = "toast-container";
    this.container.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  }

  static show(
    message: string,
    type: "success" | "error" | "info" = "info",
    duration = 4000,
  ) {
    this.initContainer();
    const toast = document.createElement("div");

    const colors = {
      success: "#10b981",
      error: "#ef4444",
      info: "#3b82f6",
    };

    toast.style.cssText = `
      background: #1e1e20;
      color: #fff;
      padding: 14px 20px;
      border-radius: 10px;
      border-left: 4px solid ${colors[type]};
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      font-size: 14px;
      font-weight: 500;
      min-width: 280px;
      max-width: 400px;
      pointer-events: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      transform: translateX(120%);
      opacity: 0;
    `;

    toast.innerHTML = `
      <span style="flex: 1; margin-right: 12px; line-height: 1.4;">${message}</span>
      <button style="background:none; border:none; color:#777; cursor:pointer; font-size: 18px; padding: 0; display: flex; align-items: center;">&times;</button>
    `;

    this.container!.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = "translateX(0)";
      toast.style.opacity = "1";
    });

    const remove = () => {
      toast.style.transform = "translateX(120%)";
      toast.style.opacity = "0";
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
