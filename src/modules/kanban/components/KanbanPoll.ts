import Handlebars from "handlebars";
import pollTpl from "../../../templates/poll.hbs?raw";
import { appDispatcher } from "../../../core/Dispatcher";
import { kanbanApi, pollsApi } from "../../../api";
import { Toast } from "../../../utils/toast";
import { KanbanActions } from "../KanbanActions";
import { currentUser } from "../../../main";
import { showConfirmModal } from "../../../utils/confirmModal";

const template = Handlebars.compile(pollTpl);

export class KanbanPoll {
  private static overlay: HTMLElement | null = null;
  private static selectedVote: number | null = null;
  private static finalScore: number | null = null;

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
            Toast.error("Выберите хотя бы одну задачу для оценки");
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
        .querySelectorAll<HTMLInputElement>(".kanban-card-select-checkbox")
        .forEach((cb) => {
          cb.addEventListener(
            "change",
            (e) => {
              e.stopPropagation();
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

    if (state.poll && state.poll.isActive) {
      const myEmail = (currentUser?.email || "").toLowerCase().trim();
      const me = state.users.find(
        (u: any) => u.email.toLowerCase().trim() === myEmail,
      );
      const isInvited = me && state.poll.invitees.includes(me.id);
      const isAdmin =
        state.myRole === "admin" ||
        state.myRole === "owner" ||
        state.myRole === "creator";

      if (isInvited || isAdmin) {
        this.renderActivePoll(appDiv, state);
      }
    } else {
      this.destroyOverlay();
    }
  }

  private static openStartModal(appDiv: HTMLElement, state: any) {
    this.destroyOverlay();

    this.overlay = document.createElement("div");
    this.overlay.id = "poll-overlay-container";
    appDiv.appendChild(this.overlay);

    const inviteesSet = new Set<string>();
    const members = state.users;

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
        closeAll();
      } catch (e: any) {
        Toast.error(e.data?.message || "Ошибка при создании голосования");
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Начать голосование";
      }
    });
  }

  private static openActivePollModal(appDiv: HTMLElement, state: any) {
    this.renderActivePoll(appDiv, state);
  }

  private static renderActivePoll(appDiv: HTMLElement, state: any) {
    if (!state.poll) return;

    if (!this.overlay) {
      this.overlay = document.createElement("div");
      this.overlay.id = "poll-overlay-container";
      appDiv.appendChild(this.overlay);
    }

    const poll = state.poll;
    const activeCardLink = poll.activeCardLink;
    const myEmail = (currentUser?.email || "").toLowerCase().trim();
    const me = state.users.find(
      (u: any) => u.email.toLowerCase().trim() === myEmail,
    );
    const myId = me ? me.id : "";

    let cardTitle = "Без названия";
    for (const section of state.sections) {
      const t = section.tasks.find((task: any) => task.id === activeCardLink);
      if (t) {
        cardTitle = t.title;
        break;
      }
    }

    const totalCards = poll.cardLinks.length;
    const currentCardIndex = poll.cardLinks.indexOf(activeCardLink) + 1;
    const totalInvitees = poll.invitees.length;

    const inviteesList = poll.invitees.map((inviteeId: string) => {
      const userObj = state.users.find((u: any) => u.id === inviteeId);
      const points = poll.answers[inviteeId];
      const hasVoted = points !== undefined;
      return {
        id: inviteeId,
        name: userObj ? userObj.name : "Участник",
        hasVoted,
        score: hasVoted ? points : "",
      };
    });

    const votedCount = inviteesList.filter((i: any) => i.hasVoted).length;

    // Авто-раскрытие результатов, когда все проголосовали
    const allVoted = votedCount === totalInvitees;
    const isRevealed = poll.isRevealed || allVoted;

    let averageScore = 0;
    if (isRevealed && votedCount > 0) {
      const sum = Object.values(poll.answers).reduce(
        (acc: number, val: any) => acc + (Number(val) || 0),
        0,
      );
      averageScore = parseFloat((sum / votedCount).toFixed(1));
    }

    const isAdmin =
      state.myRole === "admin" ||
      state.myRole === "owner" ||
      state.myRole === "creator";
    const roleLabel = isAdmin ? "Администратор" : "Участник";

    const deck = [1, 2, 3, 5, 8, 13, 21];
    const myVote = poll.answers[myId];

    this.overlay.innerHTML = template({
      isVoteModal: true,
      roleLabel,
      isAdmin,
      currentCardIndex,
      totalCards,
      activeCardTitle: cardTitle,
      votedCount,
      totalInvitees,
      inviteesList,
      isRevealed,
      averageScore,
      deck,
      myVote,
      selectedVote: this.selectedVote,
      finalScore: this.finalScore,
      isLastCard: currentCardIndex === totalCards,
    });

    const closeBtn = this.overlay.querySelector("#btn-close-poll-vote");
    closeBtn?.addEventListener("click", () => this.destroyOverlay());

    // Логика обычного участника
    if (!isAdmin && !myVote) {
      const deckBtns = this.overlay.querySelectorAll(".poll-deck-btn");
      deckBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const points = parseInt(btn.getAttribute("data-points")!);
          this.selectedVote = points;
          this.renderActivePoll(appDiv, state);
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
          this.renderActivePoll(appDiv, state);
        } catch {
          Toast.error("Ошибка при отправке голоса");
          submitVoteBtn.disabled = false;
        }
      });
    }

    if (isAdmin) {
      const revealBtn = this.overlay.querySelector("#btn-poll-reveal");
      revealBtn?.addEventListener("click", () => {
        appDispatcher.dispatch({
          type: "KANBAN_REVEAL_POLL",
        });
      });

      const terminateBtn = this.overlay.querySelector("#btn-poll-terminate");
      terminateBtn?.addEventListener("click", () => {
        showConfirmModal({
          title: "Завершить досрочно",
          text: "Вы действительно хотите закрыть комнату оценки до завершения всех задач?",
          confirmLabel: "Завершить",
          onConfirm: async () => {
            try {
              await pollsApi.closePoll(state.boardId!);
              Toast.success("Голосование досрочно закрыто");
              this.destroyOverlay();
              KanbanActions.fetchKanban(state.boardId!, true);
            } catch {
              Toast.error("Не удалось закрыть комнату");
            }
          },
        });
      });

      if (isRevealed) {
        const deckBtns = this.overlay.querySelectorAll(".poll-deck-btn");
        deckBtns.forEach((btn) => {
          btn.addEventListener("click", async () => {
            const points = parseInt(btn.getAttribute("data-points")!);
            this.finalScore = points;
            this.renderActivePoll(appDiv, state);

            try {
              await kanbanApi.updateTaskPoints(activeCardLink, { points });
              Toast.success(`Оценка ${points} SP установлена`);
            } catch {
              Toast.error("Не удалось отправить итоговую оценку");
            }
          });
        });

        const nextBtn = this.overlay.querySelector(
          "#btn-poll-next",
        ) as HTMLButtonElement;
        nextBtn?.addEventListener("click", async () => {
          nextBtn.disabled = true;
          const isLast = currentCardIndex === totalCards;
          try {
            if (isLast) {
              await pollsApi.closePoll(state.boardId!);
              Toast.success("Все задачи оценены!");
              this.destroyOverlay();
            } else {
              await pollsApi.nextCard(state.boardId!);
            }
            this.finalScore = null;
            KanbanActions.fetchKanban(state.boardId!, true);
          } catch {
            Toast.error("Ошибка переключения на следующую задачу");
            nextBtn.disabled = false;
          }
        });
      }
    }
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
