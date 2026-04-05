import { setInputError, validateEmail, validatePassword } from '../utils';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  customValidator?: (value: string) => string | null;
  message: string;
}

export type ValidationSchema = Record<string, ValidationRule[]>;

export class FormValidator {
  private formId: string;
  private schema: ValidationSchema;
  private onValidityChange?: (isValid: boolean) => void;

  constructor(
    formId: string,
    schema: ValidationSchema,
    onValidityChange?: (isValid: boolean) => void
  ) {
    this.formId = formId;
    this.schema = schema;
    this.onValidityChange = onValidityChange;
  }

  public validate(): boolean {
    let isFormValid = true;

    for (const [fieldId, rules] of Object.entries(this.schema)) {
      const field = document.getElementById(fieldId) as HTMLInputElement | null;
      if (!field) continue;

      const value = field.value.trim();
      const error = this.checkFieldRules(value, rules);

      if (error) {
        setInputError(fieldId, error);
        isFormValid = false;
      } else {
        setInputError(fieldId, null);
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
      setInputError(fieldId, null);
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
        
        setInputError(fieldId, error);
        
        if (this.onValidityChange) {
          this.onValidityChange(this.validate());
        }
      });
    }
  }
}