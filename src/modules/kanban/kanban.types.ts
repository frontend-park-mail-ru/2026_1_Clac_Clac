export interface BoardUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Task {
  id: string;
  title: string;
  due_date: string | null;
  time: string | null;
  executor: string | null;
  executor_id?: string | null;
}

export interface Section {
  id: string;
  section_name: string;
  color: string;
  colorHex: string;
  tasks: Task[];
  max_tasks?: number;
  is_mandatory?: boolean;
}

export interface KanbanState {
  boardId: string | null;
  boardName: string;
  users: BoardUser[];
  sections: Section[];
  isLoading: boolean;
  error: string | null;
}

export const KANBAN_COLORS: Record<string, string> = {
  white: "#ffffff",
  grey: "#9ca3af",
  red: "#f87171",
  orange: "#fb923c",
  blue: "#60a5fa",
  green: "#4ade80",
  purple: "#a5b4fc",
  pink: "#f9a8d4",
};

export interface ApiError extends Error {
  status: number;
  data: { message: string; error: string };
}

export interface RawUser {
  id: string;
  user_link: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  name: string;
}

export interface RawSection {
  id: string;
  section_link: string;
  section_name: string;
  color: string;
  max_tasks?: number;
  is_mandatory?: boolean;
}

export interface RawTask {
  id: string;
  card_link: string;
  link_card: string;
  title: string;
  link_executer: string;
  executer_link: string;
  executer_name: string;
  name_executer: string;
  dead_line: string;
  data_dead_line: string;
}

export interface FetchKanbanSuccessPayload {
  boardId: string;
  boardName: string;
  users: BoardUser[];
  sections: Section[];
}

export interface FetchKanbanErrorPayload {
  error: string;
}
