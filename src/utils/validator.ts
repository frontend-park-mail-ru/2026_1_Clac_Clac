export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  customValidator?: (value: string) => string | null;
  message: string;
}

export type ValidationSchema = Record<string, ValidationRule[]>;

type SetErrorFn = (fieldId: string, message: string | null) => void;

export class FormValidator {
  constructor(
    private readonly schema: ValidationSchema,
    private readonly onError: SetErrorFn,
    private readonly onValidityChange?: (isValid: boolean) => void
  ) {

  }

  /**
   * Выполняет активную проверку всех полей. 
   * Подсвечивает ошибки во всех невалидных полях.
   * Возвращает true, если форма валидна.
   */
  public validate(): boolean {
    let isFormValid = true;

    for (const [fieldId, rules] of Object.entries(this.schema)) {
      const field = this.getField(fieldId);
      if (!field) {
        continue;
      }

      const error = this.checkFieldRules(field.value.trim(), rules);
      this.onError(fieldId, error);

      if (error) {
        isFormValid = false;
      }
    }

    this.onValidityChange?.(isFormValid);
    return isFormValid;
  }

  /**
   * Сбрасывает все визуальные ошибки формы.
   */
  public clearErrors(): void {
    for (const fieldId of Object.keys(this.schema)) {
      this.onError(fieldId, null);
    }
  }

  /**
   * Подвешивает слушатели на поля для проверки на лету.
   */
  public attachLiveValidation(): void {
    for (const [fieldId, rules] of Object.entries(this.schema)) {
      const field = this.getField(fieldId);
      if (!field) {
        continue;
      }

      field.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        const error = this.checkFieldRules(target.value.trim(), rules);

        this.onError(fieldId, error);

        this.onValidityChange?.(this.isFormValidPassively());
      });
    }
  }

  /**
   * Фоновая проверка формы без вызова коллбека отображения ошибок (onError).
   */
  private isFormValidPassively(): boolean {
    for (const [fieldId, rules] of Object.entries(this.schema)) {
      const field = this.getField(fieldId);
      if (!field) {
        continue;
      }

      if (this.checkFieldRules(field.value.trim(), rules) !== null) {
        return false;
      }
    }
    return true;
  }

  /**
   * Логика проверки конкретного поля по его правилам.
   */
  private checkFieldRules(value: string, rules: ValidationRule[]): string | null {
    for (const rule of rules) {
      if (rule.required && !value) {
        return rule.message;
      }
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return rule.message;
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return rule.message;
      }
      if (rule.customValidator) {
        const customError = rule.customValidator(value);
        if (customError !== null) {
          return customError;
        }
      }
    }
    return null;
  }

  /**
   * Вспомогательный метод для безопасного получения поля формы (input или textarea).
   */
  private getField(fieldId: string): HTMLInputElement | HTMLTextAreaElement | null {
    return document.getElementById(fieldId) as HTMLInputElement | HTMLTextAreaElement | null;
  }
}
