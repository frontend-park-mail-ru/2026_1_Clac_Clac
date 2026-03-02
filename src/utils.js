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
        eyeSlash?.classList.add('hidden');
        eye?.classList.remove('hidden');
      } else {
        input.type = 'password';
        eyeSlash?.classList.remove('hidden');
        eye?.classList.add('hidden');
      }
    }
  });
};
