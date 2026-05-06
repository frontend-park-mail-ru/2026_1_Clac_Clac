export interface LoginState {
  isLoading: boolean;
  globalError: string | null;
  fieldErrors: {
    email?: boolean;
    password?: boolean;
  };
}

export interface ApiError {
  status: number;
  data: any;
}

export interface LoginErrorPayload {
  globalError: string;
  fieldErrors?: {
    email: boolean;
    password: boolean;
  };
}

export interface SetGlobalErrorPayload {
  error: string | null;
}
