import Handlebars from "handlebars";
import { boardsApi, kanbanApi } from "../api";
import sectionTpl from "../templates/section.hbs?raw";
import { navigateTo } from "../router";
import { Toast } from "../utils/toast";
import { renderKanban, clearKanbanCache } from "./kanban";

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

  // FIRST: render the board background
  try {
    await renderKanban(appDiv);
  } catch (err) {
    console.error("Board render error", err);
  }

  // SECOND: append the section side panel
  const sectionOverlayContainer = document.createElement("div");
  sectionOverlayContainer.id = "section-overlay-container";
  appDiv.appendChild(sectionOverlayContainer);

  sectionOverlayContainer.innerHTML = template({
    board_name: boardName,
    section: {
      section_link: sectionId,
      section_name: sectionData.section_name || "Без названия",
      color: sectionData.color || "white",
      max_tasks: sectionData.max_tasks || 100,
      is_mandatory: sectionData.is_mandatory || false,
      position: sectionData.position || 1,
    },
  });

  const sectionNode = sectionOverlayContainer;

  // Local state for color to avoid DOM lookups
  let selectedColor = sectionData.color || "white";

  // Manual Save Logic
  const handleSave = async () => {
    const btnSave = sectionNode.querySelector(
      "#btn-save-section",
    ) as HTMLButtonElement;
    try {
      btnSave.disabled = true;
      btnSave.textContent = "Сохранение...";

      const name = (
        sectionNode.querySelector("#section-name-input") as HTMLInputElement
      ).value.trim();
      const maxTasks = parseInt(
        (
          sectionNode.querySelector(
            "#section-max-tasks-input",
          ) as HTMLInputElement
        ).value,
      );
      const isMandatory = (
        sectionNode.querySelector(
          "#section-mandatory-input",
        ) as HTMLInputElement
      ).checked;

      const payload = {
        section_link: sectionId,
        section_name: name || "Без названия",
        color: selectedColor,
        max_tasks: isNaN(maxTasks) ? 100 : maxTasks,
        is_mandatory: isMandatory,
        position: sectionData.position || 1,
      };

      await kanbanApi.updateSection(sectionId, payload);
      clearKanbanCache();
      Toast.success("Секция сохранена");
      navigateTo(`/board?id=${boardId}`);
    } catch (err) {
      console.error("Update section error", err);
      const isBacklog =
        sectionData.section_name?.toLowerCase().includes("бэклог") ||
        sectionData.section_name?.toLowerCase().includes("backlog");
      if (isBacklog) {
        Toast.error("НЕЛЬЗЯ ИЗМЕНЯТЬ БЭКЛОГ");
      } else {
        Toast.error("Ошибка при сохранении");
      }
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = "Сохранить";
    }
  };

  sectionNode
    .querySelector("#btn-save-section")
    ?.addEventListener("click", handleSave);

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

  // Color picker logic (only local updates)
  const colorDots = sectionNode.querySelectorAll(".color-dot");
  colorDots.forEach((dot) => {
    const dotColor = dot.getAttribute("data-color");
    if (dotColor === selectedColor) {
      dot.classList.add("active");
    }

    dot.addEventListener("click", () => {
      colorDots.forEach((d) => d.classList.remove("active"));
      dot.classList.add("active");
      if (dotColor) {
        selectedColor = dotColor;
      }
    });
  });

  // Options Menu
  const optionsBtn = sectionNode.querySelector("#btn-section-options");
  optionsBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const existingMenu = document.querySelector(".context-menu");
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.innerHTML = `<div class="context-menu__item context-menu__item--danger" id="ctx-delete-section">Удалить секцию</div>`;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
    menu.style.left = `${rect.left + window.scrollX - 150}px`;

    document.body.appendChild(menu);

    menu.querySelector("#ctx-delete-section")?.addEventListener("click", () => {
      const modalOverlay = document.getElementById("modal-overlay-section")!;
      const modalDelete = document.getElementById("modal-delete-section")!;
      const nameInput = sectionNode.querySelector(
        "#section-name-input",
      ) as HTMLInputElement;
      document.getElementById("delete-section-name")!.textContent =
        nameInput.value;

      modalOverlay.classList.remove("hidden");
      modalDelete.classList.remove("hidden");

      (
        document.getElementById("btn-confirm-delete-section") as HTMLElement
      ).onclick = async () => {
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

  // Close modals
  sectionNode.querySelectorAll(".modal__close-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.getElementById("modal-overlay-section")?.classList.add("hidden");
      document.getElementById("modal-delete-section")?.classList.add("hidden");
    }),
  );
};
