import type { SubTaskStatus, TaskPriority, TaskStatus } from "@/lib/types";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  planned: "예정",
  in_progress: "진행 중",
  done: "완료",
  delayed: "지연",
};

export const SUBTASK_STATUS_LABEL: Record<SubTaskStatus, string> = {
  planned: "예정",
  in_progress: "진행 중",
  done: "완료",
  delayed: "지연",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

export const WEEKDAYS = ["월", "화", "수", "목", "금"] as const;

export const CATEGORIES = [
  "인사",
  "총무",
  "기획",
  "IT",
  "운영",
  "채용",
  "온보딩",
  "교육",
  "급여",
  "복리후생",
  "근태",
  "커뮤니케이션",
  "리포트",
  "기타",
] as const;
