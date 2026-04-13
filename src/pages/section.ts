import Handlebars from "handlebars";
import { boardsApi, kanbanApi } from "../api";
import sectionTpl from "../templates/section.hbs?raw";
import { navigateTo } from "../router";
import { Toast } from "../utils/toast";
import { renderKanban } from "./kanban";

const template = Handlebars.compile(sectionTpl);

export const renderSection = async (appDiv: HTMLElement): Promise<void> => {
  const urlParams = new URLSearchParams(window.location.search);
  const sectionId = urlParams.get("sectionId");
  const boardId = urlParams.get("boardId");

  if (!sectionId || sectionId === "null" || !boardId || boardId === "null") {
    return navigateTo("/boards");
  }

  let boardName = "Без названия";
  let sectionData: any = null;

  try {
    const boardRes = (await boardsApi.getBoard(boardId)) as any;
    if (boardRes?.data?.name) {
      boardName = boardRes.data.name;
    }

    const sectionRes = (await kanbanApi.getSection(sectionId)) as any;
    sectionData = sectionRes?.data || sectionRes;
  } catch (err) {
    console.error("Fetch error", err);
    Toast.error("Ошибка при загрузке данных");
  }

  if (!sectionData) {
    return navigateTo(`/board?id=${boardId}`);
  }

  try {
    await renderKanban(appDiv);
  } catch (err) {
    console.error("Board render error", err);
  }

  const sectionOverlayContainer = document.createElement("div");
  sectionOverlayContainer.id = "section-overlay-container";
  appDiv.appendChild(sectionOverlayContainer);

  sectionOverlayContainer.innerHTML = template({
    board_name: boardName,
    section: {
      section_link: sectionId,
      section_name: sectionData.section_name || "Без названия",
      color: sectionData.color || "#666666",
      max_tasks: sectionData.max_tasks || 100,
      is_mandatory: sectionData.is_mandatory || false,
      position: sectionData.position || 1,
    },
  });

  const sectionNode = sectionOverlayContainer;

  const updateSection = async (updates: any) => {
    try {
      const payload = {
        section_link: sectionId,
        section_name:
          updates.section_name !== undefined
            ? updates.section_name
            : (
                sectionNode.querySelector(
                  "#section-name-input",
                ) as HTMLInputElement
              ).value,
        color:
          updates.color !== undefined
            ? updates.color
            : (
                sectionNode.querySelector(
                  "#section-color-input",
                ) as HTMLInputElement
              ).value,
        max_tasks: parseInt(
          updates.max_tasks !== undefined
            ? updates.max_tasks
            : (
                sectionNode.querySelector(
                  "#section-max-tasks-input",
                ) as HTMLInputElement
              ).value,
        ),
        is_mandatory:
          updates.is_mandatory !== undefined
            ? updates.is_mandatory
            : (
                sectionNode.querySelector(
                  "#section-mandatory-input",
                ) as HTMLInputElement
              ).checked,
        position: sectionData.position || 1,
      };

      await kanbanApi.updateSection(sectionId, payload);
      await renderKanban(appDiv);
      appDiv.appendChild(sectionOverlayContainer);
    } catch (err) {
      console.error("Update section error", err);
      Toast.error("Ошибка при сохранении");
    }
  };

  sectionNode
    .querySelector("#btn-back-section")
    ?.addEventListener("click", () => navigateTo(`/board?id=${boardId}`));

  sectionNode
    .querySelector("#section-overlay")
    ?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        navigateTo(`/board?id=${boardId}`);
      }
    });

  const nameInput = sectionNode.querySelector(
    "#section-name-input",
  ) as HTMLInputElement;
  nameInput?.addEventListener("blur", () => {
    if (nameInput.value.trim() !== sectionData.section_name) {
      updateSection({ section_name: nameInput.value.trim() });
    }
  });

  sectionNode
    .querySelector("#section-max-tasks-input")
    ?.addEventListener("change", (e) => {
      updateSection({ max_tasks: (e.target as HTMLInputElement).value });
    });

  sectionNode
    .querySelector("#section-color-input")
    ?.addEventListener("change", (e) => {
      updateSection({ color: (e.target as HTMLInputElement).value });
    });

  sectionNode
    .querySelector("#section-mandatory-input")
    ?.addEventListener("change", (e) => {
      updateSection({ is_mandatory: (e.target as HTMLInputElement).checked });
    });

  const optionsBtn = sectionNode.querySelector("#btn-section-options");
  optionsBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const existingMenu = document.querySelector(".context-menu");
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.innerHTML = `<div class="context-menu__item context-menu__item--danger" id="ctx-delete-section">Удалить список</div>`;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
    menu.style.left = `${rect.left + window.scrollX - 150}px`;

    document.body.appendChild(menu);

    menu.querySelector("#ctx-delete-section")?.addEventListener("click", () => {
      const modalOverlay = document.getElementById("modal-overlay-section")!;
      const modalDelete = document.getElementById("modal-delete-section")!;
      document.getElementById("delete-section-name")!.textContent =
        nameInput.value;

      modalOverlay.classList.remove("hidden");
      modalDelete.classList.remove("hidden");

      document.getElementById("btn-confirm-delete-section")!.onclick =
        async () => {
          try {
            await kanbanApi.deleteSection(sectionId);
            navigateTo(`/board?id=${boardId}`);
          } catch (err) {
            Toast.error("Ошибка при удалении");
          }
        };
      menu.remove();
    });
  });

  const globalClickHandler = () => {
    document.querySelector(".context-menu")?.remove();
  };
  document.addEventListener("click", globalClickHandler);

  sectionNode.querySelectorAll(".modal__close-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.getElementById("modal-overlay-section")?.classList.add("hidden");
      document.getElementById("modal-delete-section")?.classList.add("hidden");
    }),
  );
};
