export const setInputError = (id, message) => {
  const input = document.getElementById(id);
  const errorMsg = document.getElementById(`${id}-error`);

  if (!input || !errorMsg) {
    return;
  }

  if (message) {
    input.classList.add('error');
    errorMsg.textContent = message;
    errorMsg.classList.add('visible');
  } else {
    input.classList.remove('error');
    errorMsg.classList.remove('visible');
  }
};

export const setGlobalError = (message) => {
  const globalError = document.getElementById('global-error');
  const globalErrorText = document.getElementById('global-error-text');

  if (!globalError || !globalErrorText) {
    return;
  }

  if (message) {
    globalErrorText.textContent = message;
    globalError.classList.remove('hidden');
  } else {
    globalError.classList.add('hidden');
    globalErrorText.textContent = '';
  }
};

export const validateEmail = (email) => {
  if (email.length > 128) {
    return false;
  }

  for (const char of email) {
    if (char.trim() === '') {
      return false;
    }
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }

  const [local, domain] = parts;
  if (local.length === 0) {
    return false;
  }

  if (!domain.slice(1, -1).includes('.')) {
    return false;
  }

  return true;
};

export const validatePassword = (password) => {
  if (password.length < 8) {
    return 'Минимум 8 символов';
  }
  if (password.length > 128) {
    return 'Максимум 128 символов';
  }
  for (let i = 0; i < password.length; i++) {
    if (password.charCodeAt(i) > 127) {
      return 'Разрешены только латинские буквы, цифры и спецсимволы';
    }
  }
  return null;
};

export const initGlobalListeners = () => {
  document.body.addEventListener('click', (e) => {
    const target = e.target;
    const btn = target.closest('.toggle-password-btn');

    if (btn) {
      const inputId = btn.getAttribute('data-target');

      if (!inputId) {
        return;
      }

      const input = document.getElementById(inputId);
      const eyeSlash = btn.querySelector('.icon-eye-slash');
      const eye = btn.querySelector('.icon-eye');

      if (input.type === 'password') {
        input.type = 'text';
        if (eyeSlash) {
          eyeSlash.classList.add('hidden');
        }
        if (eye) {
          eye.classList.remove('hidden');
        }
      } else {
        input.type = 'password';
        if (eyeSlash) {
          eyeSlash.classList.remove('hidden');
        }
        if (eye) {
          eye.classList.add('hidden');
        }
      }
    }
  });
};
