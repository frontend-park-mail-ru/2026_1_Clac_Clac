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
  // private formId: string; // Удаляем это поле
  private schema: ValidationSchema;
  private onValidityChange?: (isValid: boolean) => void;
  private setErrorFn: SetErrorFn;

  constructor(
    // formId: string, // Удаляем этот аргумент
    schema: ValidationSchema,
    onError: SetErrorFn,
    onValidityChange?: (isValid: boolean) => void
  ) {
    // this.formId = formId; // Удаляем присваивание
    this.schema = schema;
    this.setErrorFn = onError;
    this.onValidityChange = onValidityChange;
  }

  public validate(): boolean {
    let isFormValid = true;

    for (const [fieldId, rules] of Object.entries(this.schema)) {
      // Ищем элемент по fieldId напрямую. 
      // Это предполагает, что ID полей уникальны на всей странице, что обычно верно для форм.
      const field = document.getElementById(fieldId) as HTMLInputElement | null;
      if (!field) continue;

      const value = field.value.trim();
      const error = this.checkFieldRules(value, rules);

      if (error) {
        this.setErrorFn(fieldId, error);
        isFormValid = false;
      } else {
        this.setErrorFn(fieldId, null);
      }
    }

    if (this.onValidityChange) {
      this.onValidityChange(isFormValid);
    }

    return isFormValid;
  }

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

  public clearErrors(): void {
    for (const fieldId of Object.keys(this.schema)) {
      this.setErrorFn(fieldId, null);
    }
  }

  public attachLiveValidation(): void {
    for (const fieldId of Object.keys(this.schema)) {
      const field = document.getElementById(fieldId) as HTMLInputElement | null;
      if (!field) continue;

      field.addEventListener('input', () => {
        const value = field.value.trim();
        const rules = this.schema[fieldId];
        const error = this.checkFieldRules(value, rules);
        
        this.setErrorFn(fieldId, error);
        
        if (this.onValidityChange) {
          this.onValidityChange(this.validate());
        }
      });
    }
  }
}