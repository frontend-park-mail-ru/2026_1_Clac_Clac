import Handlebars from "handlebars";
import loginTpl from "../../templates/login.hbs?raw";
import config from "../../config";
import { setGlobalError, validateEmail, setInputError } from "../../utils";
import { FormValidator, ValidationSchema } from "../../utils/validator";
import { navigateTo } from "../../router";
import { LoginActions } from "./LoginActions";
import { LoginState } from "./login.types";

const template = Handlebars.compile(loginTpl);

export class LoginView {
  private appDiv: HTMLElement;
  private submitBtn: HTMLButtonElement | null = null;
  private emailInput: HTMLInputElement | null = null;
  private passwordInput: HTMLInputElement | null = null;
  private formValidator: FormValidator | null = null;

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
  }

  public setAppDiv(appDiv: HTMLElement): void {
    this.appDiv = appDiv;
  }

  public mount(): void {
    this.appDiv.innerHTML = template({
      vkAuthUrl: config.vkAuthUrl,
    });

    this.submitBtn = this.appDiv.querySelector<HTMLButtonElement>("#login-submit");
    this.emailInput = this.appDiv.querySelector<HTMLInputElement>("#email");
    this.passwordInput = this.appDiv.querySelector<HTMLInputElement>("#password");

    this.initValidation();
    this.attachEventListeners();
  }

  public updateUI(state: LoginState): void {
    if (this.submitBtn) {
      this.submitBtn.disabled = state.isLoading || !this.formValidator?.validate();
      this.submitBtn.textContent = state.isLoading ? "Вход..." : "Войти";
    }

    setGlobalError(state.globalError);

    if (state.fieldErrors.email) {
      this.emailInput?.classList.add("input-group__field--error");
    } else {
      this.emailInput?.classList.remove("input-group__field--error");
    }

    if (state.fieldErrors.password) {
      this.passwordInput?.classList.add("input-group__field--error");
    } else {
      this.passwordInput?.classList.remove("input-group__field--error");
    }
  }

  private initValidation(): void {
    const loginSchema: ValidationSchema = {
      email: [
        { required: true, message: "Введите адрес электронной почты" },
        {
          customValidator: (value: string) =>
            validateEmail(value) ? null : "Неверный формат email",
          message: "Неверный формат email",
        },
      ],
      password: [{ required: true, message: "Введите пароль" }],
    };

    this.formValidator = new FormValidator(
      loginSchema,
      (fieldId: string, message: string | null) => {
        setInputError(fieldId, message);
      },
      (isValid: boolean) => {
        if (this.submitBtn) {
          this.submitBtn.disabled = !isValid;
        }
      }
    );

    this.formValidator.attachLiveValidation();
  }

  private attachEventListeners(): void {
    const form = this.appDiv.querySelector<HTMLFormElement>("#login-form");
    const linkRegister = this.appDiv.querySelector<HTMLElement>("#link-register");
    const forgotLink = this.appDiv.querySelector<HTMLElement>(".forgot-link");

    this.emailInput?.addEventListener("input", () => LoginActions.clearError());
    this.passwordInput?.addEventListener("input", () => LoginActions.clearError());

    linkRegister?.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();
      navigateTo("/register");
    });

    forgotLink?.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();
      navigateTo("/forgot-password");
    });

    form?.addEventListener("submit", (e: SubmitEvent) => {
      e.preventDefault();

      if (!this.formValidator?.validate()) {
        return;
      }

      const email = this.emailInput?.value.trim() || "";
      const password = this.passwordInput?.value.trim() || "";

      LoginActions.login(email, password);
    });
  }
}
