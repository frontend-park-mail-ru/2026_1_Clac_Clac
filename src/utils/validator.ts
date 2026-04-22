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
  ) { }

  public validate(): boolean {
    let isFormValid = true;

    for (const [fieldId, rules] of Object.entries(this.schema)) {
      const field = this.getField(fieldId);
      if (!field) continue;

      const error = this.checkFieldRules(field.value.trim(), rules);
      this.onError(fieldId, error);

      if (error) isFormValid = false;
    }

    this.onValidityChange?.(isFormValid);
    return isFormValid;
  }

  public isValid(): boolean {
    for (const [fieldId, rules] of Object.entries(this.schema)) {
      const field = this.getField(fieldId);
      if (!field) continue;

      if (this.checkFieldRules(field.value.trim(), rules) !== null) {
        return false;
      }
    }
    return true;
  }

  public clearErrors(): void {
    for (const fieldId of Object.keys(this.schema)) {
      this.onError(fieldId, null);
    }
  }

  public attachLiveValidation(): void {
    for (const [fieldId, _] of Object.entries(this.schema)) {
      const field = this.getField(fieldId);
      if (!field) continue;

      field.addEventListener('input', () => {
        this.onError(fieldId, null);
        this.onValidityChange?.(this.isValid());
      });
    }
  }

  private checkFieldRules(value: string, rules: ValidationRule[]): string | null {
    for (const rule of rules) {
      if (rule.required && !value) return rule.message;
      if (rule.minLength !== undefined && value.length < rule.minLength) return rule.message;
      if (rule.maxLength !== undefined && value.length > rule.maxLength) return rule.message;
      if (rule.customValidator) {
        const customError = rule.customValidator(value);
        if (customError !== null) return customError;
      }
    }
    return null;
  }

  private getField(fieldId: string): HTMLInputElement | HTMLTextAreaElement | null {
    return document.getElementById(fieldId) as HTMLInputElement | HTMLTextAreaElement | null;
  }
}
