import { apiClient } from "./client";
import { BaseResponse, CreatePollRequest, VotePollRequest } from "./types";

export const pollsApi = {
  createPoll: (boardLink: string, data: CreatePollRequest) =>
    apiClient.post<BaseResponse, CreatePollRequest>(
      `/boards/${boardLink}/polls`,
      data,
    ),

  vote: (boardLink: string, data: VotePollRequest) =>
    apiClient.put<BaseResponse, VotePollRequest>(
      `/boards/${boardLink}/polls`,
      data,
    ),

  closePoll: (boardLink: string) =>
    apiClient.delete<BaseResponse>(`/boards/${boardLink}/polls`),

  nextCard: (boardLink: string) =>
    apiClient.post<BaseResponse, null>(`/boards/${boardLink}/polls/next`, null),
};
