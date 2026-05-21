import { apiClient } from "./client";
import {
  BaseResponse,
  ApiResponse,
  ProfileResponse,
  UpdateProfileRequest,
  AvatarResponse,
} from "./types";

export const profileApi = {
  getProfile: () => apiClient.get<ApiResponse<ProfileResponse>>("/profiles"),
  getProfileByLink: (link: string) =>
    apiClient.get<ApiResponse<ProfileResponse>>(`/profiles/${link}`),
  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.post<BaseResponse, UpdateProfileRequest>("/profiles/info", data),
  updateAvatar: (formData: FormData) =>
    apiClient.put<ApiResponse<AvatarResponse>, FormData>("/profiles/avatar", formData),
  deleteAvatar: () => apiClient.delete<BaseResponse>("/profiles/avatar"),
};
