import { apiClient } from "./client";
import {
  ApiResponse,
  GetAppealsResponse,
  CreateAppealRequest,
  ChangeAppealStatusInfo,
  AppealsStats,
  UploadAttachmentResponse,
} from "./types";

const categoryMap: Record<string, string> = {
  "Баг": "bug",
  "Предложение": "proposal",
  "Продуктовая проблема": "complaint"
};

export const supportApi = {
  getTickets: () => apiClient.get<ApiResponse<GetAppealsResponse>>("/appeals"),
  createTicket: (data: CreateAppealRequest) => {
    const categoryKey = categoryMap[data.category] || data.category;
    return apiClient.post<ApiResponse<{ appeal_link: string }>, CreateAppealRequest>(
      "/appeals",
      { ...data, category: categoryKey }
    );
  },
  updateTicket: (link: string, data: ChangeAppealStatusInfo) =>
    apiClient.patch<ApiResponse<string>, ChangeAppealStatusInfo>(`/appeals/${link}`, data),
  deleteTicket: (link: string) => apiClient.delete<ApiResponse<string>>(`/appeals/${link}`),
  getStatistics: () => apiClient.get<ApiResponse<AppealsStats>>("/appeals/stats"),
  uploadAttachment: (link: string, formData: FormData) =>
    apiClient.put<ApiResponse<UploadAttachmentResponse>, FormData>(`/appeals/${link}/attachment`, formData),
};
