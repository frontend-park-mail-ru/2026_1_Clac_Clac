import Handlebars from "handlebars";
import pollTpl from "../../../templates/poll.hbs?raw";
import { appDispatcher } from "../../../core/Dispatcher";
import { kanbanApi, pollsApi } from "../../../api";
import { Toast } from "../../../utils/toast";
import { showConfirmModal } from "../../../utils/confirmModal";
import { PollState } from "../kanban.types";
import { KanbanActions } from "../KanbanActions";
import { kanbanStore } from "../KanbanStore";
import { getCurrentUser } from "../../../main";

const template = Handlebars.compile(pollTpl);

export class KanbanPoll {
  private static overlay: HTMLElement | null = null;
  private static selectedVote: number | null = null;
  private static finalScore: number | null = null;
  private static notifiedPollId: string | null = null;
  private static shouldAutoOpen = false;

  private static computeUserMode(state: any): "admin" | "voter" | "observer" {
    const poll = state.poll as PollState;
    if (!poll) return "observer";
    const myLink = state.myLink as string;
    if (myLink && poll.adminLink === myLink) return "admin";
    if (myLink && poll.invitees.includes(myLink)) return "voter";
    return "observer";
  }

  public static bind(
    appDiv: HTMLElement,
    state: any,
    _: () => void,
    signal: AbortSignal,
  ): void {
    const btnStartPoll = appDiv.querySelector("#btn-start-poll");
    const btnConnectPoll = appDiv.querySelector("#btn-connect-poll");

    btnStartPoll?.addEventListener(
      "click",
      () => {
        if (state.isSelectionMode) {
          const selectedCards = state.selectedCards
            ? Array.from(state.selectedCards as Set<string>)
            : [];
          if (selectedCards.length === 0) {
            appDispatcher.dispatch({
              type: "KANBAN_SET_SELECTION_MODE",
              payload: false,
            });
            return;
          }
          this.openStartModal(appDiv, state);
        } else {
          appDispatcher.dispatch({
            type: "KANBAN_SET_SELECTION_MODE",
            payload: true,
          });
          Toast.info(
            "Выберите карточки чекбоксами и нажмите кнопку голосования еще раз",
          );
        }
      },
      { signal },
    );

    btnConnectPoll?.addEventListener(
      "click",
      () => {
        this.openActivePollModal(appDiv, state);
      },
      { signal },
    );

    if (state.isSelectionMode) {
      appDiv
        .querySelectorAll<HTMLElement>(".kanban-card__select-checkbox")
        .forEach((el) => {
          el.addEventListener(
            "click",
            (e) => {
              e.stopPropagation();
            },
            { signal },
          );
        });

      appDiv
        .querySelectorAll<HTMLInputElement>(".kanban-card-select-checkbox")
        .forEach((cb) => {
          cb.addEventListener(
            "change",
            () => {
              const cardId = cb.getAttribute("data-id")!;
              appDispatcher.dispatch({
                type: "KANBAN_TOGGLE_CARD_SELECTION",
                payload: cardId,
              });
            },
            { signal },
          );
        });
    }

    if (state.lastPollResults) {
      const results = state.lastPollResults as PollState;
      const myLink = state.myLink as string;
      const isVoter = myLink && results.invitees.includes(myLink);

      if (!isVoter) {
        appDispatcher.dispatch({ type: "KANBAN_POLL_CLEAR" });
        return;
      }

      this.showSummaryModal(appDiv, state);
      return;
    }

    if (state.poll && state.poll.isActive) {
      if (this.overlay?.isConnected) {
        this.renderActivePoll(appDiv, state);
      }
      const poll = state.poll as PollState;
      const myLink = state.myLink as string;
      if (poll.adminLink !== myLink && poll.adminLink !== this.notifiedPollId) {
        this.notifiedPollId = poll.adminLink;
        Toast.info("Началось голосование! Нажмите «Подключиться к голосованию» чтобы присоединиться.");
      }
    } else {
      this.notifiedPollId = null;
      this.destroyOverlay();
    }

    if (this.computeUserMode(state) === "admin" && this.shouldAutoOpen) {
      this.shouldAutoOpen = false;
      this.renderActivePoll(appDiv, state);
    }
  }

  private static openStartModal(_appDiv: HTMLElement, state: any) {
    this.destroyOverlay();

    this.overlay = document.createElement("div");
    this.overlay.id = "poll-overlay-container";
    document.body.appendChild(this.overlay);

    const inviteesSet = new Set<string>();
    const members = state.users.filter(
      (m: any) =>
        m.id !== getCurrentUser()?.link &&
        m.email.toLowerCase().trim() !== getCurrentUser()?.email?.toLowerCase().trim(),
    );

    this.overlay.innerHTML = template({
      isStartModal: true,
      members: members.map((m: any) => ({
        link: m.id,
        display_name: m.name,
        role: m.email,
        avatar_url: m.avatarUrl,
      })),
    });

    const closeBtn = this.overlay.querySelector("#btn-close-poll-start");
    const cancelBtn = this.overlay.querySelector("#btn-cancel-poll-start");
    const confirmBtn = this.overlay.querySelector(
      "#btn-confirm-poll-start",
    ) as HTMLButtonElement;

    const closeAll = () => {
      appDispatcher.dispatch({
        type: "KANBAN_SET_SELECTION_MODE",
        payload: false,
      });
      this.destroyOverlay();
    };

    closeBtn?.addEventListener("click", closeAll);
    cancelBtn?.addEventListener("click", closeAll);

    const checkBoxes = this.overlay.querySelectorAll<HTMLInputElement>(
      ".poll-invitee-checkbox",
    );
    checkBoxes.forEach((cb) => {
      cb.addEventListener("change", () => {
        const link = cb.getAttribute("data-link")!;
        if (cb.checked) {
          inviteesSet.add(link);
        } else {
          inviteesSet.delete(link);
        }
        confirmBtn.disabled = inviteesSet.size === 0;
      });
    });

    confirmBtn.addEventListener("click", async () => {
      const cardLinks = state.selectedCards
        ? Array.from(state.selectedCards as Set<string>)
        : [];
      const invitees = Array.from(inviteesSet);

      confirmBtn.disabled = true;
      confirmBtn.textContent = "Запуск...";

      try {
        await pollsApi.createPoll(state.boardId!, {
          card_links: cardLinks,
          invitees: invitees,
        });
        Toast.success("Голосование запущено!");
        this.shouldAutoOpen = true;
        closeAll();
        await KanbanActions.fetchPoll(state.boardId!);
      } catch (e: any) {
        const msg = e.data?.message || e.data?.error || "";
        Toast.error(msg === "Permission denied" ? "Доступ запрещён" : (msg || "Ошибка при создании голосования"));
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Начать";
      }
    });
  }

  private static openActivePollModal(_appDiv: HTMLElement, state: any) {
    this.renderActivePoll(_appDiv, state);
  }

  private static renderActivePoll(_appDiv: HTMLElement, state: any) {
    if (!state.poll) return;

    if (!this.overlay || !this.overlay.isConnected) {
      this.overlay = document.createElement("div");
      this.overlay.id = "poll-overlay-container";
      document.body.appendChild(this.overlay);
    }

    const poll = state.poll as PollState;
    const userMode = this.computeUserMode(state);
    const currentTask = poll.tasks[poll.currentIdx];
    if (!currentTask) return;

    const cardLink = currentTask.cardLink;
    const cardTitle = currentTask.title || "Без названия";
    const liveState = kanbanStore.getState();
    let cardDescription = "";
    for (const section of liveState.sections) {
      const task = (section.tasks as any[]).find((t: any) => t.id === cardLink);
      if (task?.description) {
        cardDescription = task.description;
        break;
      }
    }
    const totalCards = poll.tasks.length;
    const currentCardIndex = poll.currentIdx + 1;
    const totalInvitees = poll.invitees.length;

    const inviteesList = poll.invitees.map((inviteeId: string) => {
      const userObj = state.users.find((u: any) => u.id === inviteeId);
      const points = currentTask.votes[inviteeId];
      const hasVoted = points !== undefined;
      return {
        id: inviteeId,
        name: userObj ? userObj.name : "Участник",
        hasVoted,
        score: hasVoted ? points : "",
      };
    });

    const votedCount = inviteesList.filter((i: any) => i.hasVoted).length;

    // Auto-reveal when all invited have voted
    const allVoted = totalInvitees > 0 && votedCount === totalInvitees;
    const isRevealed = poll.isRevealed || allVoted;

    let averageScore = 0;
    if (isRevealed && votedCount > 0) {
      const sum = Object.values(currentTask.votes).reduce(
        (acc: number, val) => acc + (Number(val) || 0),
        0,
      );
      averageScore = parseFloat((sum / votedCount).toFixed(1));
      if (this.finalScore === null) {
        this.finalScore = Math.round(averageScore);
      }
    }

    const myId = state.myLink as string;
    const myVote = currentTask.votes[myId];

    const deck = [1, 2, 3, 5, 8, 13, 21];
    const isLastCard = currentCardIndex === totalCards;

    const roleLabels: Record<string, string> = {
      admin: "Администратор",
      voter: "Участник",
      observer: "Наблюдатель",
    };

    const ctx = {
      isVoteModal: true,
      userMode,
      roleLabel: roleLabels[userMode],
      isAdmin: userMode === "admin",
      isVoter: userMode === "voter",
      isObserver: userMode === "observer",
      currentCardIndex,
      totalCards,
      activeCardTitle: cardTitle,
      activeCardDescription: cardDescription,
      votedCount,
      totalInvitees,
      inviteesList,
      isRevealed,
      averageScore,
      deck,
      myVote,
      selectedVote: this.selectedVote,
      finalScore: this.finalScore,
      isLastCard,
    };

    this.overlay.innerHTML = template(ctx);

    const closeBtn = this.overlay.querySelector("#btn-close-poll-vote");
    closeBtn?.addEventListener("click", () => {
      this.destroyOverlay();
    });

    // Voter: deck buttons + submit
    if (userMode === "voter" && myVote === undefined) {
      const deckBtns = this.overlay.querySelectorAll(".poll-deck-btn");
      deckBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const points = parseInt(btn.getAttribute("data-points")!);
          this.selectedVote = points;
          this.renderActivePoll(_appDiv, state);
        });
      });

      const submitVoteBtn = this.overlay.querySelector(
        "#btn-poll-submit-vote",
      ) as HTMLButtonElement;
      submitVoteBtn?.addEventListener("click", async () => {
        if (this.selectedVote === null) return;
        submitVoteBtn.disabled = true;
        try {
          await pollsApi.vote(state.boardId!, { points: this.selectedVote });
          this.selectedVote = null;
          this.renderActivePoll(_appDiv, state);
        } catch {
          Toast.error("Ошибка при отправке голоса");
          submitVoteBtn.disabled = false;
        }
      });
    }

    // Admin controls
    if (userMode === "admin") {
      const revealBtn = this.overlay.querySelector("#btn-poll-reveal");
      revealBtn?.addEventListener("click", () => {
        appDispatcher.dispatch({
          type: "KANBAN_REVEAL_POLL",
        });
      });

      const terminateBtn = this.overlay.querySelector("#btn-poll-terminate");
      terminateBtn?.addEventListener("click", () => {
        showConfirmModal({
          title: "Завершить голосование",
          text: "Голосование будет закрыто. Оценки, которые вы уже выставили, сохранятся.",
          confirmLabel: "Завершить",
          onConfirm: async () => {
              try {
                await pollsApi.closePoll(state.boardId!);
                this.destroyOverlay();
                Toast.success("Голосование закрыто");
                await KanbanActions.fetchKanban(state.boardId!, true);
              } catch {
              Toast.error("Не удалось закрыть голосование");
            }
          },
        });
      });

      if (isRevealed) {
        // Final score deck
        const deckBtns = this.overlay.querySelectorAll(".poll-deck-btn");
        deckBtns.forEach((btn) => {
          btn.addEventListener("click", () => {
            const points = parseInt(btn.getAttribute("data-points")!);
            this.finalScore = points;
            this.renderActivePoll(_appDiv, state);
          });
        });

        const nextBtn = this.overlay.querySelector(
          "#btn-poll-next",
        ) as HTMLButtonElement;
        nextBtn?.addEventListener("click", async () => {
          nextBtn.disabled = true;
          try {
            if (this.finalScore !== null) {
              await kanbanApi.updateTaskPoints(cardLink, { points: this.finalScore });
            }

            if (isLastCard) {
              await pollsApi.closePoll(state.boardId!);
              this.destroyOverlay();
              Toast.success("Все задачи оценены!");
              await KanbanActions.fetchKanban(state.boardId!, true);
            } else {
              await pollsApi.nextCard(state.boardId!);
            }
            this.finalScore = null;
          } catch {
            Toast.error("Ошибка при сохранении оценки или переходе");
            nextBtn.disabled = false;
          }
        });
      }
    }
  }

  private static showSummaryModal(_appDiv: HTMLElement, state: any) {
    const results = state.lastPollResults as PollState;
    if (!results) return;

    if (this.overlay?.querySelector('#modal-poll-summary')) return;

    this.destroyOverlay();

    this.overlay = document.createElement("div");
    this.overlay.id = "poll-overlay-container";
    document.body.appendChild(this.overlay);

    this.overlay.innerHTML = template({
      isSummaryModal: true,
    });

    const closeBtn = this.overlay.querySelector("#btn-close-poll-summary");
    const okBtn = this.overlay.querySelector("#btn-ok-poll-summary");

    const close = () => {
      appDispatcher.dispatch({ type: "KANBAN_POLL_CLEAR" });
      this.destroyOverlay();
    };

    closeBtn?.addEventListener("click", close);
    okBtn?.addEventListener("click", close);
  }

  private static destroyOverlay() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.selectedVote = null;
    this.finalScore = null;
  }
}
