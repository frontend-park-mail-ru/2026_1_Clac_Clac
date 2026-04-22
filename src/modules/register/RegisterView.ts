import Handlebars from 'handlebars';
import registerTpl from '../../templates/register.hbs?raw';
import { setInputError, setGlobalError, validateEmail, validatePassword } from '../../utils';
import { FormValidator, ValidationSchema } from '../../utils/validator';
import { navigateTo } from '../../router';
import { registerStore } from './RegisterStore';
import { RegisterActions } from './RegisterActions';

const template = Handlebars.compile(registerTpl);

export class RegisterView {
  private appDiv: HTMLElement;
  private boundUpdate: () => void;
  private validator: FormValidator | null = null;

  constructor(appDiv: HTMLElement) {
    this.appDiv = appDiv;
    this.boundUpdate = this.update.bind(this);
  }

  public mount() {
    RegisterActions.resetState();
    this.appDiv.innerHTML = template({});

    registerStore.on('change', this.boundUpdate);
    this.attachListeners();
    this.updateUI();
  }

  public unmount() {
    registerStore.off('change', this.boundUpdate);
  }

  private update() {
    const state = registerStore.getState();

    setGlobalError(state.globalError);

    if (state.fieldErrors.email) setInputError('email', state.fieldErrors.email);
    if (state.fieldErrors.name) setInputError('name', state.fieldErrors.name);
    if (state.fieldErrors.password) setInputError('password', state.fieldErrors.password);
    if (state.fieldErrors.repeatPassword) setInputError('repeatPassword', state.fieldErrors.repeatPassword);

    this.updateUI();
  }

  private updateUI() {
    const state = registerStore.getState();
    const submitBtn = document.getElementById('register-submit') as HTMLButtonElement | null;

    if (submitBtn) {
      const name = (document.getElementById('name') as HTMLInputElement | null)?.value.trim() || '';
      const email = (document.getElementById('email') as HTMLInputElement | null)?.value.trim() || '';
      const password = (document.getElementById('password') as HTMLInputElement | null)?.value.trim() || '';
      const repeatPassword = (document.getElementById('repeatPassword') as HTMLInputElement | null)?.value.trim() || '';

      const isFilled = Boolean(name && email && password && repeatPassword);
      submitBtn.disabled = state.isLoading || !isFilled;
    }
  }

  private attachListeners() {
    const form = document.getElementById('register-form') as HTMLFormElement | null;
    const linkLogin = document.getElementById('link-login') as HTMLAnchorElement | null;

    if (linkLogin) {
      linkLogin.addEventListener('click', (e: MouseEvent) => {
        e.preventDefault();
        navigateTo('/login');
      });
    }

    const registerSchema: ValidationSchema = {
      name: [
        { required: true, message: 'Введите имя' }
      ],
      email: [
        { required: true, message: 'Введите адрес электронной почты' },
        {
          customValidator: (value: string) => validateEmail(value) ? null : 'Неверный формат email',
          message: 'Неверный формат email'
        }
      ],
      password: [
        { required: true, message: 'Введите пароль' },
        {
          customValidator: (value: string) => validatePassword(value),
          message: 'Ошибка в пароле'
        }
      ],
      repeatPassword: [
        { required: true, message: 'Повторите пароль' },
        {
          customValidator: (value: string) => {
            const password = (document.getElementById('password') as HTMLInputElement | null)?.value.trim() || '';
            return value === password ? null : 'Пароли не совпадают';
          },
          message: 'Пароли не совпадают'
        }
      ]
    };

    this.validator = new FormValidator(
      registerSchema,
      (fieldId, error) => {
        setInputError(fieldId, error);
      },
      () => {
        this.updateUI();
      }
    );

    this.validator.attachLiveValidation();

    if (form) {
      form.addEventListener('submit', (e: SubmitEvent) => {
        e.preventDefault();

        if (!this.validator?.validate()) {
          return;
        }

        const name = (document.getElementById('name') as HTMLInputElement | null)?.value.trim() ?? '';
        const email = (document.getElementById('email') as HTMLInputElement | null)?.value.trim() ?? '';
        const password = (document.getElementById('password') as HTMLInputElement | null)?.value.trim() ?? '';

        RegisterActions.registerUser(name, email, password);
      });
    }
  }
}
