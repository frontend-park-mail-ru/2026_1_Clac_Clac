import { apiClient } from "./client";
import {
  BaseResponse,
  ApiResponse,
  UserInfoResponse,
  LogInRequest,
  RegisterRequest,
  PasswordRecoveryRequest,
  RecoveryCodeRequest,
  NewPasswordRequest,
  MeResponse,
  VkAuthRequest,
  VkAuthResponse,
} from "./types";

export const authApi = {
  checkAuth: () => apiClient.get<ApiResponse<MeResponse>>("/me"),
  login: (data: LogInRequest) =>
    apiClient.post<ApiResponse<UserInfoResponse>, LogInRequest>("/login", data),
  register: (data: RegisterRequest) =>
    apiClient.post<ApiResponse<UserInfoResponse>, RegisterRequest>("/register", data),
  logout: () => apiClient.post<BaseResponse>("/logout"),
  forgotPassword: (data: PasswordRecoveryRequest) =>
    apiClient.post<BaseResponse, PasswordRecoveryRequest>("/forgot-password", data),
  checkCode: (data: RecoveryCodeRequest) =>
    apiClient.post<BaseResponse, RecoveryCodeRequest>("/check-code", data),
  resetPassword: (data: NewPasswordRequest) =>
    apiClient.post<BaseResponse, NewPasswordRequest>("/reset-password", data),
  vkAuth: (data: VkAuthRequest) =>
    apiClient.post<ApiResponse<VkAuthResponse>, VkAuthRequest>("/oauth/vk", data),
};
