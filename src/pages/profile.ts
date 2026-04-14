import Handlebars from "handlebars";
import { authApi, profileApi } from "../api";
import { navigateTo } from "../router";
import profileTpl from "../templates/profile.hbs?raw";

const template = Handlebars.compile(profileTpl);

export const renderProfile = async (appDiv: HTMLElement): Promise<void> => {
  try {
    const res = (await profileApi.getProfile()) as any;
    const user = res.data || res;

    appDiv.innerHTML = template({ user });

    document
      .getElementById("nav-boards")
      ?.addEventListener("click", () => navigateTo("/boards"));
    document
      .getElementById("logout-btn")
      ?.addEventListener("click", async () => {
        try {
          await authApi.logout();
        } catch (err) {
          console.error("Logout error", err);
        }
        localStorage.removeItem("isAuth");
        navigateTo("/login");
      });

    const form = document.getElementById("profile-form");
    const btnSave = document.getElementById(
      "btn-save-profile",
    ) as HTMLButtonElement;
    const nameInput = document.getElementById(
      "profile-name",
    ) as HTMLInputElement;
    const descInput = document.getElementById(
      "profile-desc",
    ) as HTMLTextAreaElement;

    const checkChanges = () => {
      if (
        nameInput.value !== user.display_name ||
        descInput.value !== (user.description_user || "")
      ) {
        btnSave.classList.add("profile__btn-active");
        btnSave.classList.remove("profile__btn-disabled");
        btnSave.disabled = false;
      } else {
        btnSave.classList.add("profile__btn-disabled");
        btnSave.classList.remove("profile__btn-active");
        btnSave.disabled = true;
      }
    };

    nameInput.addEventListener("input", checkChanges);
    descInput.addEventListener("input", checkChanges);

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        btnSave.disabled = true;
        await profileApi.updateProfile({
          display_name: nameInput.value.trim(),
          description_user: descInput.value.trim(),
        });
        renderProfile(appDiv);
      } catch (e) {
        console.error("Save profile failed", e);
        btnSave.disabled = false;
      }
    });

    const avatarUpload = document.getElementById(
      "avatar-upload",
    ) as HTMLInputElement;
    const modalAvatarPreview = document.getElementById("modal-avatar-preview")!;
    let selectedFile: File | null = null;
    let selectedColor: string | null = null;

    avatarUpload?.addEventListener("change", (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
          modalAvatarPreview.innerHTML = `<img src="${event.target?.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
      }
    });

    const modalOverlay = document.getElementById("modal-overlay")!;
    const modalDelete = document.getElementById("modal-delete-avatar")!;
    const modalPhoto = document.getElementById("modal-photo")!;

    document
      .getElementById("btn-change-photo")
      ?.addEventListener("click", () => {
        modalOverlay.classList.remove("hidden");
        modalPhoto.classList.remove("hidden");
      });

    // Color picker logic in modal
    const modalColorSquares = modalPhoto.querySelectorAll(".color-square");
    modalColorSquares.forEach((square) => {
      square.addEventListener("click", () => {
        modalColorSquares.forEach((s) => s.classList.remove("active"));
        square.classList.add("active");
        selectedColor = square.getAttribute("data-color");

        // If no file selected, update SVG background color
        if (!selectedFile) {
          const svg = modalAvatarPreview.querySelector("svg");
          if (svg) {
            modalAvatarPreview.style.backgroundColor =
              getComputedStyle(square).backgroundColor;
          } else {
            // If there's an image but we want to go back to color?
            // The UI doesn't explicitly show "remove photo" inside this modal,
            // but we can at least show the color behind the SVG.
            modalAvatarPreview.style.backgroundColor =
              getComputedStyle(square).backgroundColor;
          }
        }
      });
    });

    document
      .getElementById("btn-save-photo")
      ?.addEventListener("click", async () => {
        if (selectedFile) {
          const fd = new FormData();
          fd.append("avatar", selectedFile);
          try {
            await profileApi.updateAvatar(fd);
            renderProfile(appDiv);
          } catch (err) {
            console.error("Avatar upload error", err);
          }
        } else if (selectedColor) {
          // Here we would save the color if the API supported it.
          // For now we just close the modal.
          modalOverlay.classList.add("hidden");
          modalPhoto.classList.add("hidden");
        } else {
          modalOverlay.classList.add("hidden");
          modalPhoto.classList.add("hidden");
        }
      });

    document
      .getElementById("btn-cancel-photo")
      ?.addEventListener("click", () => {
        modalOverlay.classList.add("hidden");
        modalPhoto.classList.add("hidden");
        // Reset state
        selectedFile = null;
        selectedColor = null;
      });

    document
      .getElementById("btn-delete-avatar")
      ?.addEventListener("click", () => {
        modalOverlay.classList.remove("hidden");
        modalDelete.classList.remove("hidden");
      });

    document.querySelectorAll(".modal__close-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        modalOverlay.classList.add("hidden");
        modalDelete.classList.add("hidden");
        modalPhoto.classList.add("hidden");
      });
    });

    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.add("hidden");
        modalDelete.classList.add("hidden");
        modalPhoto.classList.add("hidden");
      }
    });

    document
      .getElementById("confirm-delete-avatar")
      ?.addEventListener("click", async () => {
        try {
          await profileApi.deleteAvatar();
          renderProfile(appDiv);
        } catch (err) {
          console.error("Avatar delete error", err);
        }
      });
  } catch (err: any) {
    console.error("Profile fetch error", err);
    if (err?.status === 401) {
      localStorage.removeItem("isAuth");
      navigateTo("/login");
    }
  }
};
