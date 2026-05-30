import Handlebars from "handlebars";
import loginTpl from "../../templates/login.hbs?raw";
import { setGlobalError, validateEmail, setInputError, } from "../../utils";
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
  private isSubmitted = false;

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
  }

  public setAppDiv(appDiv: HTMLElement): void {
    this.appDiv = appDiv;
  }

  public mount(): void {
    this.appDiv.innerHTML = template({});

    this.submitBtn = this.appDiv.querySelector<HTMLButtonElement>("#login-submit");
    this.emailInput = this.appDiv.querySelector<HTMLInputElement>("#email");
    this.passwordInput = this.appDiv.querySelector<HTMLInputElement>("#password");

    this.initValidation();
    this.attachEventListeners();

    const vkBtn = this.appDiv.querySelector<HTMLButtonElement>("#vk-login-btn");
    vkBtn?.addEventListener("click", () => {
      LoginActions.loginWithVK();
    });
  }

  public updateUI(state: LoginState): void {
    if (this.submitBtn) {
      this.submitBtn.disabled = state.isLoading;
      this.submitBtn.textContent = state.isLoading ? "Вход..." : "Войти";
    }

    const hasFieldErrors = state.fieldErrors.email || state.fieldErrors.password;

    if (hasFieldErrors) {
      setGlobalError(null);
      setInputError("email", state.globalError ?? null);
      setInputError("password", state.globalError ?? null);
    } else {
      setGlobalError(state.globalError);
      setInputError("email", null);
      setInputError("password", null);
    }
  }

  private initValidation(): void {
    const loginSchema: ValidationSchema = {
      email: [
        { required: true, message: "Введите email, например, name@domain.com" },
        {
          customValidator: (value: string) =>
            validateEmail(value) ? null : "Неверный email, например, name@domain.com",
          message: "Неверный email, например, name@domain.com",
        },
      ],
      password: [{ required: true, message: "Введите пароль" }],
    };

    this.formValidator = new FormValidator(
      loginSchema,
      (fieldId: string, message: string | null) => {
        if (this.isSubmitted) {
          setInputError(fieldId, message);
        }
      },
      (_: boolean) => { }
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
      this.isSubmitted = true;

      if (!this.formValidator?.validate()) {
        return;
      }

      const email = this.emailInput?.value.trim() || "";
      const password = this.passwordInput?.value.trim() || "";

      LoginActions.login(email, password);
    });
  }
}
