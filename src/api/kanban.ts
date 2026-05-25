import { apiClient } from "./client";
import {
  BaseResponse,
  ApiResponse,
  SectionInfo,
  ListSectionLink,
  CreateSectionRequest,
  CardsResponse,
  CardResponse,
  CreateCardRequest,
  CreateCardResponse,
  UpdateCardRequest,
  ReorderCardsRequest,
  NewStatusTask,
  NewTimeLine,
  CommentsResponse,
  CreateCommentRequest,
  CreateCommentResponse,
  UpdateCommentRequest,
  SubtaskResponse,
  CreateSubtaskRequest,
  UpdateSubtaskRequest,
  AttachmentResponse,
  UpdateCardPointsRequest,
} from "./types";

export const kanbanApi = {
  getSections: (boardLink: string) =>
    apiClient.get<ApiResponse<SectionInfo[]>>(`/boards/${boardLink}/sections`),
  reorderSections: (boardLink: string, data: ListSectionLink) =>
    apiClient.patch<BaseResponse, ListSectionLink>(
      `/boards/${boardLink}/sections/reorder`,
      data,
    ),
  createSection: (data: CreateSectionRequest) =>
    apiClient.post<ApiResponse<SectionInfo>, CreateSectionRequest>(
      "/sections",
      data,
    ),
  getSection: (sectionLink: string) =>
    apiClient.get<ApiResponse<SectionInfo>>(`/sections/${sectionLink}`),
  updateSection: (sectionLink: string, data: Partial<SectionInfo>) =>
    apiClient.put<BaseResponse, Partial<SectionInfo>>(
      `/sections/${sectionLink}`,
      data,
    ),
  deleteSection: (sectionLink: string) =>
    apiClient.delete<BaseResponse>(`/sections/${sectionLink}`),

  getTasks: (sectionLink: string) =>
    apiClient.get<ApiResponse<CardsResponse>>(`/sections/${sectionLink}/cards`),
  getTask: (taskLink: string) =>
    apiClient.get<ApiResponse<CardResponse>>(`/cards/${taskLink}`),
  createTask: (data: CreateCardRequest) =>
    apiClient.post<ApiResponse<CreateCardResponse>, CreateCardRequest>(
      "/cards",
      data,
    ),
  updateTask: (taskLink: string, data: UpdateCardRequest) =>
    apiClient.put<BaseResponse, UpdateCardRequest>(`/cards/${taskLink}`, data),
  deleteTask: (taskLink: string) =>
    apiClient.delete<BaseResponse>(`/cards/${taskLink}`),
  reorderTask: (taskLink: string, data: ReorderCardsRequest) =>
    apiClient.patch<BaseResponse, ReorderCardsRequest>(
      `/cards/${taskLink}/reorder`,
      data,
    ),

  updateTaskStatus: (taskLink: string, data: NewStatusTask) =>
    apiClient.patch<BaseResponse, NewStatusTask>(
      `/cards/${taskLink}/status`,
      data,
    ),
  updateTaskTimeline: (taskLink: string, data: NewTimeLine) =>
    apiClient.patch<BaseResponse, NewTimeLine>(
      `/cards/${taskLink}/timeline`,
      data,
    ),

  updateTaskPoints: (taskLink: string, data: UpdateCardPointsRequest) =>
    apiClient.put<BaseResponse, UpdateCardPointsRequest>(
      `/cards/${taskLink}/points`,
      data,
    ),

  uploadAttachment: (taskLink: string, formData: FormData) =>
    apiClient.post<ApiResponse<AttachmentResponse>, FormData>(
      `/cards/${taskLink}/attachments`,
      formData,
    ),
  deleteAttachment: (attachmentLink: string) =>
    apiClient.delete<BaseResponse>(`/attachments/${attachmentLink}`),

  getComments: (taskLink: string) =>
    apiClient.get<ApiResponse<CommentsResponse>>(`/cards/${taskLink}/comments`),
  createComment: (taskLink: string, data: CreateCommentRequest) =>
    apiClient.post<ApiResponse<CreateCommentResponse>, CreateCommentRequest>(
      `/cards/${taskLink}/comments`,
      data,
    ),
  updateComment: (commentLink: string, data: UpdateCommentRequest) =>
    apiClient.put<BaseResponse, UpdateCommentRequest>(
      `/comments/${commentLink}`,
      data,
    ),
  deleteComment: (commentLink: string) =>
    apiClient.delete<BaseResponse>(`/comments/${commentLink}`),

  createSubtask: (taskLink: string, data: CreateSubtaskRequest) =>
    apiClient.post<ApiResponse<SubtaskResponse>, CreateSubtaskRequest>(
      `/cards/${taskLink}/subtasks`,
      data,
    ),
  updateSubtask: (subtaskLink: string, data: UpdateSubtaskRequest) =>
    apiClient.put<BaseResponse, UpdateSubtaskRequest>(
      `/subtasks/${subtaskLink}`,
      data,
    ),
  deleteSubtask: (subtaskLink: string) =>
    apiClient.delete<BaseResponse>(`/subtasks/${subtaskLink}`),
};
