export const inputPartial = `
<div class="input-group">
  <div class="input-header">
    <label class="input-label" for="{{id}}">{{label}}</label>
    {{#if forgotPassword}}
    <a href="#" class="forgot-link">Забыли пароль?</a>
    {{/if}}
  </div>
  <div class="input-wrapper">
    <input 
      type="{{type}}" 
      id="{{id}}" 
      class="input-field" 
      placeholder="{{placeholder}}" 
      {{#if disabled}}disabled{{/if}}
    >
    
    {{#if isPassword}}
    <button type="button" class="toggle-password-btn" data-target="{{id}}">
      <svg class="icon-eye-slash" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>
      <svg class="icon-eye hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    </button>
    {{/if}}
  </div>
  <span id="{{id}}-error" class="input-error-msg"></span>
</div>
`;
