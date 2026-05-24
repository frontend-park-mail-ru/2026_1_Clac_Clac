import { apiClient } from "./client";
import {
  BaseResponse,
  ApiResponse,
  BoardInfo,
  CreateBoardRequest,
  UpdateBoardRequest,
  GetMembersResponse,
  UploadBackgroundResponse,
  InviteInfo,
  CreateInviteRequest,
  CreateInviteResponse,
  AcceptInviteResponse,
  UpdateMemberRoleRequest,
} from "./types";

export const boardsApi = {
  getBoards: () => apiClient.get<ApiResponse<BoardInfo[]>>("/boards"),
  getBoard: (link: string) => apiClient.get<ApiResponse<BoardInfo>>(`/boards/${link}`),
  createBoard: (data: CreateBoardRequest) =>
    apiClient.post<ApiResponse<BoardInfo>, CreateBoardRequest>("/boards", data),
  updateBoard: (link: string, data: UpdateBoardRequest) =>
    apiClient.put<BaseResponse, UpdateBoardRequest>(`/boards/${link}`, data),
  updateBoardBackground: (link: string, formData: FormData) =>
    apiClient.put<ApiResponse<UploadBackgroundResponse>, FormData>(`/boards/${link}/background`, formData),
  deleteBoard: (link: string) => apiClient.delete<BaseResponse>(`/boards/${link}`),
  getBoardUsers: (link: string) =>
    apiClient.get<ApiResponse<GetMembersResponse>>(`/boards/${link}/users`),

  removeMember: (boardLink: string, userLink: string) =>
    apiClient.delete<BaseResponse>(`/boards/${boardLink}/members/${userLink}`),

  updateMemberRole: (boardLink: string, userLink: string, data: UpdateMemberRoleRequest) =>
    apiClient.put<BaseResponse, UpdateMemberRoleRequest>(`/boards/${boardLink}/members/${userLink}/role`, data),

  getInvites: (link: string) =>
    apiClient.get<ApiResponse<InviteInfo[]>>(`/boards/${link}/invites`),

  createInvite: (link: string, data: CreateInviteRequest) =>
    apiClient.post<ApiResponse<CreateInviteResponse>, CreateInviteRequest>(`/boards/${link}/invites`, data),

  acceptInvite: (inviteLink: string) =>
    apiClient.post<ApiResponse<AcceptInviteResponse>, null>(`/invites/${inviteLink}`),

  closeInvite: (inviteLink: string) =>
    apiClient.delete<BaseResponse>(`/invites/${inviteLink}`),
};
