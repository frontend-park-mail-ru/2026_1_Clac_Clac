export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ApiError<T = unknown> {
  status: number;
  data: T | null;
}

export interface BaseResponse {
  status: string;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
}

export interface UserInfoResponse {
  avatar: string;
  display_name: string;
  email: string;
  link: string;
}
export interface LogInRequest {
  email: string;
  password: string;
}
export interface RegisterRequest {
  display_name: string;
  email: string;
  password: string;
  repeated_password: string;
}
export interface PasswordRecoveryRequest {
  email: string;
}
export interface RecoveryCodeRequest {
  code: string;
}
export interface NewPasswordRequest {
  password: string;
  repeated_password: string;
  token_id: string;
}

export interface ProfileResponse {
  avatar_url: string;
  description_user: string;
  display_name: string;
  email: string;
  link: string;
}
export interface MeResponse {
  user_link: string;
  profile: ProfileResponse;
}
export interface UpdateProfileRequest {
  description_user: string;
  display_name: string;
}
export interface AvatarResponse {
  avatar_url: string;
}

export interface BoardInfo {
  background: string;
  description: string;
  link: string;
  name: string;
}
export interface CreateBoardRequest {
  background?: string;
  description?: string;
  name: string;
}
export interface UpdateBoardRequest {
  background?: string;
  board_link: string;
  description?: string;
  name?: string;
}
export interface MemberInfo {
  avatar_url: string;
  description: string;
  display_name: string;
  email: string;
  link: string;
  role: string;
}
export interface GetMembersResponse {
  members: MemberInfo[];
}
export interface UploadBackgroundResponse {
  background_key: string;
}
export interface InviteInfo {
  board_link: string;
  created_at: number;
  default_role: string;
  expire_at: number;
  invite_link: string;
  status: string;
  target_user_link?: string;
}
export interface CreateInviteRequest {
  default_role: string;
  expire_seconds: number;
  user_link?: string;
}
export interface CreateInviteResponse {
  board_link: string;
  created_at: number;
  default_role: string;
  expire_at: number;
  invite_link: string;
  status: string;
  target_user_link?: string;
}
export interface AcceptInviteResponse {
  board_link: string;
  role: string;
}
export interface UpdateMemberRoleRequest {
  new_role: string;
}

export interface SectionInfo {
  color: string;
  is_mandatory: boolean;
  link: string;
  max_tasks: number;
  name: string;
  position: number;
}
export interface CreateSectionRequest {
  board_link: string;
  color?: string;
  is_mandatory?: boolean;
  max_tasks?: number;
  name: string;
}
export interface ListSectionLink {
  list_links: string[];
}

export interface SubtaskInfo {
  description: string;
  is_done: boolean;
  link: string;
  position: number;
}
export interface SubtaskResponse {
  description: string;
  is_done: boolean;
  position: number;
  subtask_link: string;
}
export interface CreateSubtaskRequest {
  description: string;
}
export interface UpdateSubtaskRequest {
  description: string;
  is_done: boolean;
}

export interface AttachmentResponse {
  attachment_link: string;
  attachment_path: string;
  display_name: string;
  position: number;
}

export interface Card {
  deadline: string;
  description: string;
  executor_link: string;
  link: string;
  points?: number;
  position: number;
  start?: string;
  status?: boolean;
  subtasks: SubtaskInfo[];
  title: string;
}

export interface CardsResponse {
  cards: Card[];
}

export interface CardResponse {
  attachments?: AttachmentResponse[];
  card_link: string;
  deadline: string;
  description: string;
  executor_link: string;
  points?: number;
  position: number;
  start: string;
  status: boolean;
  subtasks: SubtaskResponse[];
  title: string;
}

export interface CreateCardRequest {
  description?: string;
  executor_link?: string;
  section_link: string;
  title: string;
}
export interface CreateCardResponse {
  card_link: string;
  position: number;
  section_link: string;
}
export interface UpdateCardRequest {
  deadline?: string;
  description?: string;
  executor_link?: string;
  start?: string;
  title?: string;
}
export interface ReorderCardsRequest {
  position: number;
  section_link: string;
}

export interface NewStatusTask {
  done: boolean;
}

export interface NewTimeLine {
  deadline: string;
  start: string;
}

export interface CommentResponse {
  author_link: string;
  comment_link: string;
  parent_link: string;
  text: string;
  created_at: string;
}
export interface CommentsResponse {
  comments: CommentResponse[];
}
export interface CreateCommentRequest {
  parent_link?: string;
  text: string;
}
export interface CreateCommentResponse {
  comment_link: string;
}
export interface UpdateCommentRequest {
  text: string;
}

export interface VkAuthRequest {
  code: string;
  code_verifier: string;
  state: string;
  device_id?: string;
}

export interface VkAuthResponse {
  link: string;
  display_name: string;
  email: string;
}

export interface AppealInfo {
  appeal_id: number;
  appeal_link: string;
  attachment_url: string;
  attachment_key?: string;
  category: string;
  created_at: string;
  description: string;
  display_name: string;
  email: string;
  status: string;
}
export interface GetAppealsResponse {
  appeals: AppealInfo[];
  role: string;
}
export interface CreateAppealRequest {
  category: string;
  description: string;
  display_name: string;
  email: string;
}
export interface ChangeAppealStatusInfo {
  appeal_link?: string;
  new_status: string;
}
export interface AppealsStats {
  close_appeals: number;
  in_work_appeals: number;
  open_appeals: number;
}
export interface UploadAttachmentResponse {
  attachment_url: string;
}

export interface UpdateCardPointsRequest {
  points: number;
}

export interface PollTaskData {
  card_link: string;
  title?: string;
  description?: string;
}

export interface GetPollResponse {
  admin_link: string;
  current_idx?: number;
  tasks: PollTaskData[];
  invitees: string[];
}

export interface CreatePollRequest {
  card_links: string[];
  invitees: string[];
}

export interface VotePollRequest {
  points: number;
}
