export const registerTpl = `
<div class="auth-page">
  <div class="auth-form-container">
    <h1 class="auth-title">Регистрация</h1>

    <form id="register-form">
      {{> input id="name" label="Имя" type="text" placeholder="Ваше имя" }}
      {{> input id="email" label="Email" type="email" placeholder="example@email.com" }}
      {{> input id="password" label="Пароль" type="password" placeholder="Минимум 8 символов" isPassword=true }}
      {{> input id="repeatPassword" label="Повторите пароль" type="password" placeholder="Минимум 8 символов" isPassword=true }}

      <div class="terms-group mt-05 mb-1">
        <div class="terms-checkbox-wrapper">
          <input type="checkbox" id="terms" class="cursor-pointer">
          <label for="terms" class="terms-label">
            Я согласен с <a href="#">условиями использования</a> & <a href="#">политикой конфиденциальности</a>
          </label>
        </div>
        <span id="terms-error" class="input-error-msg"></span>
      </div>

      <button type="submit" class="btn btn-primary">Зарегистрироваться</button>

      <p class="auth-footer-text mt-1">
        Есть аккаунт? <a href="#" id="link-login">Войти</a>
      </p>

      <!-- TODO: Реализовать регистрацию через VK ID к РК2
      <div class="divider">
        <div class="divider-line"></div>Или<div class="divider-line"></div>
      </div>
      <button type="button" class="btn btn-vk">
        <b>VK</b> Зарегистрироваться через VK ID
      </button>
      -->
    </form>
  </div>

  <div class="auth-logo-container">
    <div class="auth-logo-content">
      <img src="/public/logo.svg" alt="NeXus Logo" class="auth-logo mb-1" />
      <p class="auth-subtitle">Центр управления проектами</p>
    </div>
  </div>
</div>
`;
