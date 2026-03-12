import Handlebars from 'handlebars';
import { setInputError, setGlobalError, validateEmail, validatePassword } from '../utils.js';
import { navigateTo } from '../main.js';
import { apiClient } from '../api.js';

const resEmail = await fetch('/src/templates/password_recovery_email.hbs');
const tplEmail = await resEmail.text();

const resCode = await fetch('/src/templates/password_recovery_code.hbs');
const tplCode = await resCode.text();

const resNewPass = await fetch('/src/templates/password_recovery_new_pass.hbs');
const tplNewPass = await resNewPass.text();

const renderStepEmail = Handlebars.compile(tplEmail);
const renderStepCode = Handlebars.compile(tplCode);
const renderStepNewPass = Handlebars.compile(tplNewPass);

let recoveryState = {
  email: '',
  code: ''
};

/**
 * Отрисовывает первый шаг восстановления пароля: ввод адреса электронной почты.
 * 
 * @param {HTMLElement} appDiv - DOM-контейнер для рендеринга.
 */
const stepEmail = (appDiv) => {
  appDiv.innerHTML = renderStepEmail({});

  const form = document.getElementById('recovery-email-form');
  const emailInput = document.getElementById('email');
  const submitBtn = document.getElementById('recovery-submit');
  const backLink = document.getElementById('back-link-email');

  if (backLink) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('login');
    });
  }

  /**
   * Проверяет наличие введенного адреса электронной почты и разблокирует/блокирует кнопку.
   */
  const checkForm = () => {
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
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();

      if (!email) {
        setInputError('email', 'Введите адрес электронной почты');
        return;
      } else if (!validateEmail(email)) {
        setInputError('email', 'Неверный формат email');
        return;
      }

      setGlobalError(null);

      try {
        submitBtn.disabled = true;
        await apiClient.post('/forgot-password', { email });
        recoveryState.email = email;
        stepCode(appDiv);
      } catch (err) {
        const errMsg = err.data?.message || err.data?.error;
        if (errMsg === 'user does not exists') {
          setGlobalError('Пользователь не найден');
        } else {
          setGlobalError(errMsg || 'Не удалось отправить код');
        };
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
};

/**
 * Отрисовывает второй шаг восстановления пароля: ввод кода подтверждения.
 * 
 * @param {HTMLElement} appDiv - DOM-контейнер для рендеринга.
 */
const stepCode = (appDiv) => {
  appDiv.innerHTML = renderStepCode({ email: recoveryState.email });

  const form = document.getElementById('recovery-code-form');
  const codeInput = document.getElementById('code');
  const submitBtn = form.querySelector('button[type="submit"]');
  const resendLink = document.getElementById('resend-link');
  let timerSpan = document.getElementById('timer');

  /**
   * Проверяет заполненность поля кода и активирует/деактивирует кнопку подтверждения.
   */
  const checkForm = () => {
    if (submitBtn && codeInput) {
      submitBtn.disabled = !codeInput.value.trim();
    }
  };

  if (codeInput) {
    codeInput.addEventListener('input', checkForm);
  }
  checkForm();

  let timeLeft = 59;
  let timerInterval = null;

  /**
   * Обновляет обратный отсчет таймера для повторной отправки кода.
   */
  const updateTimer = () => {
    if (timeLeft > 0) {
      timeLeft--;
      if (timerSpan) {
        timerSpan.textContent = `0:${timeLeft.toString().padStart(2, '0')}`;
      }
    } else {
      if (timerInterval) clearInterval(timerInterval);
      if (resendLink) {
        resendLink.innerHTML = '<a href="#" id="resend-action">Отправить повторно</a>';
        const action = document.getElementById('resend-action');
        if (action) {
          action.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
              await apiClient.post('/forgot-password', { email: recoveryState.email });
              stepCode(appDiv);
            } catch {
              setInputError('code', 'Не удалось отправить код повторно');
            }
          });
        }
      }
    }
  };
  timerInterval = setInterval(updateTimer, 1000);

  const backLink = document.getElementById('back-link');
  if (backLink) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      stepEmail(appDiv);
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = codeInput.value.trim();

      if (!code || code.length < 4) {
        setInputError('code', 'Введите код из письма');
        return;
      }

      try {
        submitBtn.disabled = true;
        await apiClient.post('/check-code', { code });
        if (timerInterval) clearInterval(timerInterval);
        recoveryState.code = code;
        stepNewPass(appDiv);
      } catch {
        setInputError('code', 'Неверный или недействительный код');
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
const stepNewPass = (appDiv) => {
  appDiv.innerHTML = renderStepNewPass({});

  const form = document.getElementById('recovery-pass-form');
  const password = document.getElementById('password');
  const repeatPassword = document.getElementById('repeatPassword');
  const submitBtn = form.querySelector('button[type="submit"]');

  /**
   * Проверяет заполненность полей нового пароля и разблокирует кнопку отправки.
   */
  const checkForm = () => {
    if (submitBtn && password && repeatPassword) {
      submitBtn.disabled = !(password.value.trim() && repeatPassword.value.trim());
    }
  };

  if (form) {
    form.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', checkForm);
    });
  }
  checkForm();

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
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
        navigateTo('login');
      } catch (err) {
        const errMsg = err.data?.message || err.data?.error;
        setGlobalError(errMsg || 'Не удалось сохранить новый пароль');
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
export const renderPasswordRecovery = (appDiv) => {
  recoveryState = { email: '', code: '' };
  stepEmail(appDiv);
};
