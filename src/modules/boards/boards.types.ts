export interface Board {
  id: string;
  board_name: string;
  description: string;
  background: string;
  backlog: number;
  hot: number;
  members: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

export interface BoardsState {
  boards: Board[];
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface RawBoard {
  id: string;
  link: string;
  name: string;
  board_name: string;
  title: string;
  description: string;
  background: string;
  backlog: number;
  hot: number;
  members: number;
}

export interface BoardsResponse {
  data?: RawBoard | RawBoard[];
}

export interface CreateBoardResponse {
  data?: {
    link: string;
  };
}

export interface ApiError extends Error {
  status: number;
}

export interface FetchBoardsSuccessPayload {
  boards: Board[];
}

export interface FetchBoardsErrorPayload {
  error: string;
}
