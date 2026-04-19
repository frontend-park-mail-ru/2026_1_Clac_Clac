import Handlebars from 'handlebars';
import tplEmail from '../../templates/password_recovery_email.hbs?raw';
import tplCode from '../../templates/password_recovery_code.hbs?raw';
import tplNewPass from '../../templates/password_recovery_new_pass.hbs?raw';
import { passwordRecoveryStore } from './PasswordRecoveryStore';
import { PasswordRecoveryActions } from './PasswordRecoveryActions';
import { PasswordRecoveryState, PasswordRecoveryStep } from './passwordRecovery.types';
import { setInputError, setGlobalError } from '../../utils';

const renderStepEmail = Handlebars.compile(tplEmail);
const renderStepCode = Handlebars.compile(tplCode);
const renderStepNewPass = Handlebars.compile(tplNewPass);

export class PasswordRecoveryView {
  private appDiv: HTMLElement;
  private boundUpdate: () => void;
  private currentStep: PasswordRecoveryStep | null = null;

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
    this.boundUpdate = this.update.bind(this);
  }

  public mount() {
    PasswordRecoveryActions.resetState();
    passwordRecoveryStore.on('change', this.boundUpdate);
    this.update();
  }

  public unmount() {
    passwordRecoveryStore.off('change', this.boundUpdate);
  }

  private update() {
    const state = passwordRecoveryStore.getState();

    if (this.currentStep !== state.step) {
      this.currentStep = state.step;
      this.renderStep(state.step, state);
    }

    this.updateErrors(state);
    this.updateStateUI(state);
  }

  private renderStep(step: PasswordRecoveryStep, state: PasswordRecoveryState) {
    if (step === PasswordRecoveryStep.EMAIL) {
      this.appDiv.innerHTML = renderStepEmail({});
      this.attachEmailListeners();
    } else if (step === PasswordRecoveryStep.CODE) {
      this.appDiv.innerHTML = renderStepCode({ email: state.email });
      this.attachCodeListeners();
    } else if (step === PasswordRecoveryStep.NEW_PASS) {
      this.appDiv.innerHTML = renderStepNewPass({});
      this.attachNewPassListeners();
    }

    const emailInput = document.getElementById('email') as HTMLInputElement | null;
    if (emailInput && state.email && step === PasswordRecoveryStep.EMAIL) {
      emailInput.value = state.email;
    }
  }

  private attachEmailListeners() {
    const form = document.getElementById('recovery-email-form') as HTMLFormElement | null;
    const emailInput = document.getElementById('email') as HTMLInputElement | null;
    const submitBtn = document.getElementById('recovery-submit') as HTMLButtonElement | null;
    const backLink = document.getElementById('back-link-email') as HTMLAnchorElement | null;

    if (backLink) {
      backLink.addEventListener('click', (e) => {
        e.preventDefault();
        PasswordRecoveryActions.goBack();
      });
    }

    if (emailInput && submitBtn) {
      emailInput.addEventListener('input', () => {
        submitBtn.disabled = !emailInput.value.trim();
      });
      submitBtn.disabled = !emailInput.value.trim();
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (emailInput) {
          PasswordRecoveryActions.sendEmail(emailInput.value.trim());
        }
      });
    }
  }

  private attachCodeListeners() {
    const form = document.getElementById('recovery-code-form') as HTMLFormElement | null;
    const codeInput = document.getElementById('code') as HTMLInputElement | null;
    const submitBtn = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
    const backLink = document.getElementById('back-link') as HTMLAnchorElement | null;

    if (codeInput && submitBtn) {
      codeInput.addEventListener('input', () => {
        submitBtn.disabled = !codeInput.value.trim();
      });
      submitBtn.disabled = !codeInput.value.trim();
    }

    if (backLink) {
      backLink.addEventListener('click', (e) => {
        e.preventDefault();
        PasswordRecoveryActions.goBack();
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (codeInput) {
          PasswordRecoveryActions.verifyCode(codeInput.value.trim());
        }
      });
    }
  }

  private attachNewPassListeners() {
    const form = document.getElementById('recovery-pass-form') as HTMLFormElement | null;
    const password = document.getElementById('password') as HTMLInputElement | null;
    const repeatPassword = document.getElementById('repeatPassword') as HTMLInputElement | null;
    const submitBtn = form?.querySelector<HTMLButtonElement>('button[type="submit"]');

    const checkForm = () => {
      if (submitBtn && password && repeatPassword) {
        submitBtn.disabled = !(password.value.trim() && repeatPassword.value.trim());
      }
    };

    if (password) password.addEventListener('input', checkForm);
    if (repeatPassword) repeatPassword.addEventListener('input', checkForm);
    checkForm();

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (password && repeatPassword) {
          PasswordRecoveryActions.resetPassword(password.value, repeatPassword.value);
        }
      });
    }
  }

  private updateErrors(state: PasswordRecoveryState) {
    setGlobalError(state.globalError);

    if (state.step === PasswordRecoveryStep.EMAIL) {
      setInputError('email', state.fieldErrors.email);
    } else if (state.step === PasswordRecoveryStep.CODE) {
      setInputError('code', state.fieldErrors.code);
    } else if (state.step === PasswordRecoveryStep.NEW_PASS) {
      setInputError('password', state.fieldErrors.password);
      setInputError('repeatPassword', state.fieldErrors.repeatPassword);
    }
  }

  private isCurrentStepValid(step: PasswordRecoveryStep): boolean {
    switch (step) {
      case PasswordRecoveryStep.EMAIL: {
        const emailInput = document.getElementById('email') as HTMLInputElement | null;
        return Boolean(emailInput?.value.trim());
      }

      case PasswordRecoveryStep.CODE: {
        const codeInput = document.getElementById('code') as HTMLInputElement | null;
        return Boolean(codeInput?.value.trim());
      }

      case PasswordRecoveryStep.NEW_PASS: {
        const password = document.getElementById('password') as HTMLInputElement | null;
        const repeatPassword = document.getElementById('repeatPassword') as HTMLInputElement | null;
        return Boolean(password?.value.trim() && repeatPassword?.value.trim());
      }

      default:
        return false;
    }
  }

  private updateSubmitButtonUI(state: PasswordRecoveryState) {
    const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement | null;

    if (!submitBtn) return;

    if (state.isLoading) {
      submitBtn.disabled = true;
      return;
    }

    submitBtn.disabled = !this.isCurrentStepValid(state.step);
  }

  private updateTimerUI(state: PasswordRecoveryState) {
    if (state.step !== PasswordRecoveryStep.CODE) return;

    const timerSpan = document.getElementById('timer');
    const resendLink = document.getElementById('resend-link');

    if (state.timeLeft > 0) {
      if (timerSpan) {
        timerSpan.textContent = `0:${state.timeLeft.toString().padStart(2, '0')}`;
      }
      return;
    }

    if (resendLink && !resendLink.querySelector('#resend-action')) {
      resendLink.innerHTML = '<a href="#" id="resend-action">Отправить повторно</a>';
      document.getElementById('resend-action')?.addEventListener('click', (e) => {
        e.preventDefault();
        PasswordRecoveryActions.resendCode();
      });
    }
  }

  private updateStateUI(state: PasswordRecoveryState) {
    this.updateTimerUI(state);
    this.updateSubmitButtonUI(state);
  }
}
