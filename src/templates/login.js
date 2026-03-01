export const loginTpl = `
<div class="auth-page">
  <div class="auth-form-container">
    <h1 class="auth-title">Войти</h1>

    <div id="global-error" class="global-error-banner hidden">
      <div class="global-error-icon">!</div>
      <span id="global-error-text">Проверьте подключение и попробуйте снова</span>
    </div>

    <form id="login-form">
      {{> input id="email" label="Email" type="email" placeholder="example@email.com" }}
      {{> input id="password" label="Пароль" type="password" placeholder="Минимум 8 символов" isPassword=true forgotPassword=true }}

      <button type="submit" class="btn btn-primary mt-05">Войти</button>

      <p class="auth-footer-text mt-1">
        Нет аккаунта? <a href="#" id="link-register">Зарегистрироваться</a>
      </p>

      <!-- TODO: Реализовать авторизацию через VK ID к РК2
      <div class="divider">
        <div class="divider-line"></div>Или<div class="divider-line"></div>
      </div>
      <button type="button" class="btn btn-vk">
        <b>VK</b> Войти с VK ID
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
