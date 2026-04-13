import Handlebars from 'handlebars';
import { setInputError, setGlobalError, validateEmail, validatePassword } from '../utils';
import { apiClient } from '../api';

import tplEmail from '../templates/password_recovery_email.hbs?raw';
import tplCode from '../templates/password_recovery_code.hbs?raw';
import tplNewPass from '../templates/password_recovery_new_pass.hbs?raw';
import { navigateTo } from '../router';

const renderStepEmail = Handlebars.compile(tplEmail);
const renderStepCode = Handlebars.compile(tplCode);
const renderStepNewPass = Handlebars.compile(tplNewPass);

interface RecoveryState {
  email: string;
  code: string;
}

let recoveryState: RecoveryState = {
  email: '',
  code: ''
};

/**
 * Отрисовывает первый шаг восстановления пароля: ввод адреса электронной почты.
 * 
 * @param {HTMLElement} appDiv - DOM-контейнер для рендеринга.
 */
const stepEmail = (appDiv: HTMLElement): void => {
  appDiv.innerHTML = renderStepEmail({});

  const form = document.getElementById('recovery-email-form') as HTMLFormElement | null;
  const emailInput = document.getElementById('email') as HTMLInputElement | null;
  const submitBtn = document.getElementById('recovery-submit') as HTMLButtonElement | null;
  const backLink = document.getElementById('back-link-email') as HTMLAnchorElement | null;

  if (backLink) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('/login');
    });
  }

  /**
   * Проверяет наличие введенного адреса электронной почты и разблокирует/блокирует кнопку.
   */
  const checkForm = (): void => {
    if (submitBtn && emailInput) {
      submitBtn.disabled = !emailInput.value.trim();
    }
  };

  if (emailInput && recoveryState.email) {
    emailInput.value = recoveryState.email;
  }
  if (emailInput) {
    emailInput.addEventListener('input', checkForm);
  }
  checkForm();

  if (form) {
    form.addEventListener('submit', async (e: SubmitEvent) => {
      e.preventDefault();
      if (!emailInput || !submitBtn) {
        return;
      }

      const email = emailInput.value.trim();
      if (!validateEmail(email)) {
        setInputError('email', 'Неверный формат email');
        return;
      }
      setGlobalError(null);

      try {
        submitBtn.disabled = true;
        await apiClient.post('/forgot-password', { email });
        recoveryState.email = email;
        stepCode(appDiv);
      } catch (err: any) {
        if (err.status === 429) {
          setGlobalError('Слишком много попыток. Подождите немного.');
        } else if (err.status === 404) {
          setGlobalError('Пользователь не найден');
        } else {
          setGlobalError(err.data?.message || err.data?.error || 'Не удалось отправить код');
        }
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
};

const stepCode = (appDiv: HTMLElement): void => {
  appDiv.innerHTML = renderStepCode({ email: recoveryState.email });

  const form = document.getElementById('recovery-code-form') as HTMLFormElement | null;
  const codeInput = document.getElementById('code') as HTMLInputElement | null;
  const submitBtn = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
  const resendLink = document.getElementById('resend-link') as HTMLElement | null;
  const timerSpan = document.getElementById('timer') as HTMLElement | null;

  /**
   * Проверяет заполненность поля кода и активирует/деактивирует кнопку подтверждения.
   */
  const checkForm = (): void => {
    if (submitBtn && codeInput) {
      submitBtn.disabled = !codeInput.value.trim();
    }
  };

  if (codeInput) {
    codeInput.addEventListener('input', checkForm);
  }
  checkForm();

  let timeLeft = 59;
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Обновляет обратный отсчет таймера для повторной отправки кода.
   */
  const updateTimer = (): void => {
    if (timeLeft > 0) {
      timeLeft--;
      if (timerSpan) {
        timerSpan.textContent = `0:${timeLeft.toString().padStart(2, '0')}`;
      }
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      if (resendLink) {
        resendLink.innerHTML = '<a href="#" id="resend-action">Отправить повторно</a>';
        document.getElementById('resend-action')?.addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            await apiClient.post('/forgot-password', { email: recoveryState.email });
            stepCode(appDiv);
          } catch (err) {
            setInputError('code', 'Не удалось отправить код повторно');
            console.error('Resend code error:', err);
          }
        });
      }
    }
  };

  timerInterval = setInterval(updateTimer, 1000);

  document.getElementById('back-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    stepEmail(appDiv);
  });

  if (form) {
    form.addEventListener('submit', async (e: SubmitEvent) => {
      e.preventDefault();
      if (!codeInput || !submitBtn) {
        return;
      }
      const code = codeInput.value.trim();

      try {
        submitBtn.disabled = true;
        await apiClient.post('/check-code', { code });
        if (timerInterval) {
          clearInterval(timerInterval);
        }
        recoveryState.code = code;
        stepNewPass(appDiv);
      } catch (err) {
        setInputError('code', 'Неверный или недействительный код');
        console.error('Verify code error:', err);
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
};

/**
 * Отрисовывает третий шаг восстановления: ввод нового пароля.
 * 
 * @param {HTMLElement} appDiv - DOM-контейнер для рендеринга.
 */
const stepNewPass = (appDiv: HTMLElement): void => {
  appDiv.innerHTML = renderStepNewPass({});

  const form = document.getElementById('recovery-pass-form') as HTMLFormElement | null;
  const password = document.getElementById('password') as HTMLInputElement | null;
  const repeatPassword = document.getElementById('repeatPassword') as HTMLInputElement | null;
  const submitBtn = form?.querySelector<HTMLButtonElement>('button[type="submit"]');

  /**
   * Проверяет заполненность полей нового пароля и разблокирует кнопку отправки.
   */
  const checkForm = (): void => {
    if (submitBtn && password && repeatPassword) {
      submitBtn.disabled = !(password.value.trim() && repeatPassword.value.trim());
    }
  };

  form?.querySelectorAll('input').forEach(input => input.addEventListener('input', checkForm));
  checkForm();

  if (form) {
    form.addEventListener('submit', async (e: SubmitEvent) => {
      e.preventDefault();
      if (!password || !repeatPassword || !submitBtn) {
        return;
      }

      let hasError = false;
      setInputError('password', null);
      setInputError('repeatPassword', null);
      setGlobalError(null);

      const passErrorMsg = validatePassword(password.value);
      if (passErrorMsg) {
        setInputError('password', passErrorMsg);
        hasError = true;
      }

      if (password.value !== repeatPassword.value) {
        setInputError('repeatPassword', 'Пароли не совпадают');
        hasError = true;
      }

      if (hasError) {
        return;
      }

      try {
        submitBtn.disabled = true;
        await apiClient.post('/reset-password', {
          token_id: recoveryState.code,
          password: password.value,
          repeated_password: repeatPassword.value
        });
        navigateTo('/login');
      } catch (err: any) {
        setGlobalError(err.data?.message || err.data?.error || 'Не удалось сохранить новый пароль');
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
};

/**
 * Отрисовывает страницу восстановления пароля с самого начала.
 * 
 * @param {HTMLElement} appDiv - DOM-контейнер, в который будет встроен HTML-код страницы.
 */
export const renderPasswordRecovery = (appDiv: HTMLElement): void => {
  recoveryState = { email: '', code: '' };
  stepEmail(appDiv);
};
