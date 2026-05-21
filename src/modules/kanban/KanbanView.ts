import Handlebars from "handlebars";
import kanbanTpl from "../../templates/kanban.hbs?raw";
import { KanbanState } from "./kanban.types";
import { navigateTo } from "../../router";
import { authApi } from "../../api";

import { KanbanDragAndDrop } from "./components/KanbanDragAndDrop";
import { KanbanContextMenus } from "./components/KanbanContextMenus";
import { KanbanTaskCreation } from "./components/KanbanTaskCreation";
import { KanbanColumnManager } from "./components/KanbanColumnManager";
import { showConfirmModal } from "../../utils/confirmModal";
import { Toast } from "../../utils/toast";
import { boardsApi } from "../../api";

const template = Handlebars.compile(kanbanTpl);

export class KanbanView {
  private appDiv: HTMLElement;
  private abortController: AbortController | null = null;

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
  }

  public setAppDiv(appDiv: HTMLElement): void {
    this.appDiv = appDiv;
  }

  public render(state: KanbanState): void {
    if (state.isLoading) return;

    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    const scrollMap = new Map<string, number>();
    const expandedTasks = new Set<string>();

    const wrapper = this.appDiv.querySelector(".kanban__columns-wrapper");
    const wrapperScrollLeft = wrapper ? wrapper.scrollLeft : 0;

    this.appDiv.querySelectorAll<HTMLElement>(".kanban__column-cards").forEach((el) => {
      const id = el.getAttribute("data-section-id");
      if (id) scrollMap.set(id, el.scrollTop);
    });

    this.appDiv.querySelectorAll<HTMLElement>(".kanban-card").forEach((el) => {
      const id = el.getAttribute("data-id");
      const list = el.querySelector(".kanban-card__subtasks-list");
      if (id && list && !list.classList.contains("hidden")) {
        expandedTasks.add(id);
      }
    });

    this.appDiv.innerHTML = template({ 
      board_name: state.boardName, 
      sections: state.sections 
    });

    const newWrapper = this.appDiv.querySelector(".kanban__columns-wrapper");
    if (newWrapper) newWrapper.scrollLeft = wrapperScrollLeft;

    this.appDiv.querySelectorAll<HTMLElement>(".kanban__column-cards").forEach((el) => {
      const id = el.getAttribute("data-section-id");
      if (id && scrollMap.has(id)) el.scrollTop = scrollMap.get(id)!;
    });

    this.appDiv.querySelectorAll<HTMLElement>(".kanban-card").forEach((el) => {
      const id = el.getAttribute("data-id");
      if (id && expandedTasks.has(id)) {
        const list = el.querySelector(".kanban-card__subtasks-list");
        if (list) list.classList.remove("hidden");
        const svg = el.querySelector(".kanban-card__subtasks-header svg") as HTMLElement;
        if (svg) svg.classList.add("kanban-card__subtasks-icon--expanded");
      }
    });

    this.attachEventListeners(state, this.abortController.signal);
  }

  private attachEventListeners(state: KanbanState, signal: AbortSignal): void {
    const closeModals = (): void => {
      this.appDiv.querySelectorAll(".modal, .manage-columns, .share-modal").forEach((m) => m.classList.add("hidden"));
      this.appDiv.querySelector("#modal-overlay")?.classList.add("hidden");
      document.querySelectorAll(".assignee-dropdown").forEach(dd => dd.remove());
      KanbanContextMenus.closeMenu();
    };

    document.getElementById("nav-boards")?.addEventListener("click", () => navigateTo("/boards"), { signal });
    document.getElementById("nav-logo")?.addEventListener("click", () => navigateTo("/boards"), { signal });
    document.getElementById("nav-profile")?.addEventListener("click", () => navigateTo("/profile"), { signal });
    document.getElementById("logout-btn")?.addEventListener("click", () => {
      showConfirmModal({
        title: "Выход",
        text: "Вы уверены, что хотите выйти из аккаунта?",
        confirmLabel: "Выйти",
        onConfirm: async () => {
          try {
            await authApi.logout();
          } catch (err) {
            console.error("Logout error", err);
          } finally {
            localStorage.removeItem("isAuth");
            navigateTo("/login");
          }
        },
      });
    }, { signal });

    document.getElementById("btn-share-board")?.addEventListener("click", () => {
      const shareModal = this.appDiv.querySelector("#modal-share") as HTMLElement;
      const overlay = this.appDiv.querySelector("#modal-overlay") as HTMLElement;
      const linkInput = this.appDiv.querySelector("#share-link-input") as HTMLInputElement;

      const boardUrl = window.location.href;
      if (linkInput) linkInput.value = boardUrl;

      overlay?.classList.remove("hidden");
      shareModal?.classList.remove("hidden");
    }, { signal });

    const shareModal = this.appDiv.querySelector("#modal-share") as HTMLElement;
    const shareOverlay = this.appDiv.querySelector("#modal-overlay") as HTMLElement;

    const closeShareModal = (): void => {
      shareModal?.classList.add("hidden");
      const anyOtherModal = this.appDiv.querySelector(".modal:not(.hidden), .manage-columns:not(.hidden)");
      if (!anyOtherModal) {
        shareOverlay?.classList.add("hidden");
      }
    };

    this.appDiv.querySelector("#share-close-btn")?.addEventListener("click", closeShareModal, { signal });
    this.appDiv.querySelector("#share-cancel-btn")?.addEventListener("click", closeShareModal, { signal });

    this.appDiv.querySelectorAll<HTMLElement>(".share-modal__toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.appDiv.querySelectorAll<HTMLElement>(".share-modal__toggle-btn").forEach((b) =>
          b.classList.remove("share-modal__toggle-btn--active")
        );
        btn.classList.add("share-modal__toggle-btn--active");

        const roleWrapper = this.appDiv.querySelector("#share-role-wrapper") as HTMLElement;
        if (btn.getAttribute("data-role") === "member") {
          roleWrapper?.classList.remove("hidden");
        } else {
          roleWrapper?.classList.add("hidden");
        }
      }, { signal });
    });

    const roleSelect = this.appDiv.querySelector("#share-role-select") as HTMLElement;
    const roleDropdown = this.appDiv.querySelector("#share-role-dropdown") as HTMLElement;
    const roleText = this.appDiv.querySelector("#share-role-text") as HTMLElement;

    roleSelect?.addEventListener("click", (e) => {
      e.stopPropagation();
      roleDropdown?.classList.toggle("hidden");
    }, { signal });

    this.appDiv.querySelectorAll<HTMLElement>(".share-modal__role-option").forEach((option) => {
      option.addEventListener("click", () => {
        const label = option.textContent || "Участник";
        if (roleText) roleText.textContent = label;
        roleDropdown?.classList.add("hidden");
      }, { signal });
    });

    this.appDiv.querySelector("#share-copy-link-btn")?.addEventListener("click", () => {
      const linkInput = this.appDiv.querySelector("#share-link-input") as HTMLInputElement;
      if (linkInput) {
        navigator.clipboard.writeText(linkInput.value).then(() => {
          Toast.success("Ссылка скопирована");
        });
      }
    }, { signal });

    document.addEventListener("click", (e) => {
      if (roleSelect && !roleSelect.contains(e.target as Node) && roleDropdown && !roleDropdown.contains(e.target as Node)) {
        roleDropdown?.classList.add("hidden");
      }
    }, { signal });

    this.appDiv.querySelector("#modal-overlay")?.addEventListener("click", (e: Event) => {
      if (e.target === e.currentTarget) closeModals();
    }, { signal });
    
    this.appDiv.querySelectorAll(".modal__close-btn, #btn-close-manage").forEach((btn) =>
      btn.addEventListener("click", closeModals, { signal })
    );

    if (state.boardId) {
      KanbanColumnManager.bind(this.appDiv, state, closeModals, signal);
      KanbanTaskCreation.bind(this.appDiv, state, closeModals, signal);
      KanbanContextMenus.bind(this.appDiv, state, signal);
      KanbanDragAndDrop.bind(this.appDiv, state.boardId, signal);
    }

    this.appDiv.querySelector("#btn-share-board")?.addEventListener("click", async () => {
          closeModals();
          this.appDiv.querySelector("#modal-overlay")?.classList.remove("hidden");
          
          const inviteModal = this.appDiv.querySelector("#modal-invite-board") as HTMLElement;
          if (!inviteModal) return;
          inviteModal.classList.remove("hidden");
    
          const linkInput = inviteModal.querySelector("#invite-link-input") as HTMLInputElement;
          const emailInput = inviteModal.querySelector("#invite-email-input") as HTMLInputElement;
          const confirmBtn = inviteModal.querySelector("#btn-confirm-invite") as HTMLButtonElement;
          const roleBtn = inviteModal.querySelector("#invite-role-btn") as HTMLButtonElement;
          const roleText = inviteModal.querySelector("#invite-role-text") as HTMLElement;
          const roleDropdown = inviteModal.querySelector("#invite-role-dropdown") as HTMLElement;
          const roleContainer = inviteModal.querySelector("#invite-role-select-container") as HTMLElement;
    
          const tabMember = inviteModal.querySelector("#tab-invite-member") as HTMLButtonElement;
          const tabGuest = inviteModal.querySelector("#tab-invite-guest") as HTMLButtonElement;
    
          if (linkInput) linkInput.value = "Загрузка ссылки...";
          if (emailInput) emailInput.value = "";
          if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = "Пригласить";
          }
    
          let currentRole = "editor";
    
          const generateLink = async (role: string) => {
            if (!state.boardId) return;
            try {
              const res = await boardsApi.createInvite(state.boardId, {
                default_role: role,
                expire_seconds: 86400 * 7
              });
              if (linkInput) {
                linkInput.value = `${window.location.origin}/invite/${res.data.invite_link}`;
              }
            } catch {
              if (linkInput) linkInput.value = "Ошибка при генерации ссылки";
            }
          };
    
          generateLink(currentRole);
    
          tabMember?.addEventListener("click", () => {
            tabMember.classList.add("active");
            tabGuest.classList.remove("active");
            roleContainer.classList.remove("hidden");
            currentRole = "editor";
            if (roleText) roleText.textContent = "Участник";
            generateLink(currentRole);
          });
    
          tabGuest?.addEventListener("click", () => {
            tabGuest.classList.add("active");
            tabMember.classList.remove("active");
            roleContainer.classList.add("hidden");
            currentRole = "viewer";
            generateLink(currentRole);
          });
    
          roleBtn?.addEventListener("click", (ev) => {
            ev.stopPropagation();
            roleDropdown?.classList.toggle("hidden");
          });
    
          roleDropdown?.querySelectorAll(".invite-modal__dropdown-item").forEach(item => {
            item.addEventListener("click", (ev) => {
              ev.stopPropagation();
              const role = item.getAttribute("data-role") || "editor";
              const visibleName = item.textContent?.trim() || "Участник";
              currentRole = role;
              if (roleText) roleText.textContent = visibleName;
              roleDropdown.classList.add("hidden");
              generateLink(currentRole);
            });
          });
    
          const closeDropdown = () => {
            roleDropdown?.classList.add("hidden");
          };
          document.addEventListener("click", closeDropdown);
    
          emailInput?.addEventListener("input", () => {
            const val = emailInput.value.trim();
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
            if (confirmBtn) {
              confirmBtn.disabled = !isValid;
            }
          });
    
          inviteModal.querySelector("#btn-copy-invite-link")?.addEventListener("click", () => {
            if (linkInput && linkInput.value && !linkInput.value.startsWith("Загрузка")) {
              navigator.clipboard.writeText(linkInput.value).then(() => {
                Toast.success("Ссылка скопирована!");
              });
            }
          });
    
          inviteModal.querySelector("#btn-cancel-invite")?.addEventListener("click", closeModals);
          inviteModal.querySelector("#btn-close-invite")?.addEventListener("click", closeModals);
    
          confirmBtn?.addEventListener("click", async () => {
            const email = emailInput.value.trim();
            if (!email) return;
    
            confirmBtn.disabled = true;
            confirmBtn.textContent = "Отправка...";
    
            try {
              await boardsApi.createInvite(state.boardId!, {
                default_role: currentRole,
                expire_seconds: 86400 * 7
              });
              Toast.success(`Приглашение отправлено на ${email}!`);
              closeModals();
            } catch {
              Toast.error("Не удалось отправить приглашение");
              confirmBtn.disabled = false;
              confirmBtn.textContent = "Пригласить";
            }
          });
        }, { signal });
  }
}
