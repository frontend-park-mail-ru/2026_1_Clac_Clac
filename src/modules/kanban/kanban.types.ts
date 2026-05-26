import { SubtaskInfo } from "../../api";

export interface BoardUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  due_date: string | null;
  time: string | null;
  executor: string | null;
  executor_id?: string | null;
  subtasks?: SubtaskInfo[];
  subtasksCount?: number;
  subtasksDone?: number;
  progressPercent?: number;
  subtasksProgressText?: string;
  progressPercentStyle?: string;
  hasSubtasks?: boolean;
  position: number;
  points?: number;
  pointsColor?: string;
}

export interface Section {
  id: string;
  section_name: string;
  color: string;
  colorHex: string;
  tasks: Task[];
  max_tasks?: number;
  is_mandatory?: boolean;
  position?: number;
}

export interface PollState {
  isActive: boolean;
  adminLink: string;
  currentIdx: number;
  tasks: PollTask[];
  invitees: string[];
  isRevealed: boolean;
  finalPoints?: number;
}

export interface PollTask {
  cardLink: string;
  title: string;
  votes: Record<string, number>;
}

export interface KanbanState {
  boardId: string | null;
  boardName: string;
  users: BoardUser[];
  sections: Section[];
  isLoading: boolean;
  error: string | null;
  myRole?: string;
  myLink?: string;
  poll?: PollState | null;
  lastPollResults?: PollState | null;
  isSelectionMode?: boolean;
  selectedCards?: Set<string>;
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
  link: string;
  name: string;
  color?: string;
  position: number;
  max_tasks?: number;
  is_mandatory?: boolean;
}

export interface RawTask {
  id: string;
  card_link: string;
  link_card: string;
  link?: string;
  title: string;
  link_executer: string;
  executer_link: string;
  executor_link?: string;
  executer_name: string;
  name_executer: string;
  dead_line: string;
  data_dead_line: string;
  deadline?: string;
  subtasks?: SubtaskInfo[];
}

export interface FetchKanbanSuccessPayload {
  boardId: string;
  boardName: string;
  users: BoardUser[];
  sections: Section[];
  myRole?: string;
  myLink?: string;
}

export interface FetchKanbanErrorPayload {
  error: string;
}
