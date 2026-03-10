import Handlebars from 'handlebars';
import { setInputError, setGlobalError, validateEmail, validatePassword } from '../utils.js';
import { navigateTo } from '../main.js';

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

const stepEmail = (appDiv) => {
  appDiv.innerHTML = renderStepEmail({});

  const form = document.getElementById('recovery-email-form');
  const emailInput = document.getElementById('email');
  const submitBtn = document.getElementById('recovery-submit');

  const checkForm = () => {
    if (submitBtn && emailInput) {
      submitBtn.disabled = !emailInput.value.trim();
    }
  };

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
      recoveryState.email = email;
      stepCode(appDiv);
    });
  }
};

const stepCode = (appDiv) => {
  appDiv.innerHTML = renderStepCode({ email: recoveryState.email });

  const form = document.getElementById('recovery-code-form');
  const codeInput = document.getElementById('code');
  const submitBtn = form.querySelector('button[type="submit"]');
  const resendLink = document.getElementById('resend-link');
  let timerSpan = document.getElementById('timer');

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
  const updateTimer = () => {
    if (timeLeft > 0) {
      timeLeft--;
      if (timerSpan) {
        timerSpan.textContent = `0:${timeLeft.toString().padStart(2, '0')}`;
      }
    } else {
      clearInterval(timerInterval);
      if (resendLink) {
        resendLink.innerHTML = '<a href="#" id="resend-action">Отправить повторно</a>';
        const action = document.getElementById('resend-action');
        if (action) {
          action.addEventListener('click', (e) => {
            e.preventDefault();
            stepCode(appDiv);
          });
        }
      }
    }
  };
  let timerInterval = setInterval(updateTimer, 1000);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = codeInput.value.trim();

      if (!code || code.length < 4) {
        setInputError('code', 'Введите код из письма');
        return;
      }

      if (code !== '123456') {
        setInputError('code', 'Неверный код');
        return;
      }

      clearInterval(timerInterval);
      recoveryState.code = code;
      stepNewPass(appDiv);
    });
  }
};

const stepNewPass = (appDiv) => {
  appDiv.innerHTML = renderStepNewPass({});

  const form = document.getElementById('recovery-pass-form');
  const password = document.getElementById('password');
  const repeatPassword = document.getElementById('repeatPassword');
  const submitBtn = form.querySelector('button[type="submit"]');

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

      navigateTo('login');
    });
  }
};

export const renderPasswordRecovery = (appDiv) => {
  recoveryState = { email: '', code: '' };
  stepEmail(appDiv);
};
