export type AccountType = "work" | "personal";

export type TaskCategory =
  | "TOTVS RM"
  | "Google Workspace"
  | "Suporte TI"
  | "Automações & Scripts"
  | "Infra & Hardware"
  | "Catequese"
  | "Idiomas & Estudos"
  | "Finanças & Pessoal";

export type Priority = "P1" | "P2" | "P3" | "P4";

export type TaskStatus =
  | "TRIAGE"
  | "TODO"
  | "IN_PROGRESS"
  | "WAITING"
  | "COMPLETED"
  | "CANCELED";

export interface DeadlineExtension {
  extended_at: string;
  previous_date: string;
  new_date: string;
  reason: string;
}

export interface YouTubeVideo {
  title: string;
  url: string;
  thumbnail: string;
  channel: string;
}

export interface LearningResources {
  youtube_videos: YouTubeVideo[];
  search_queries: string[];
}

export interface Task {
  id: string;
  raw_input: string;
  title: string;
  description: string;
  account_type: AccountType;
  category: TaskCategory;
  tags: string[];
  priority: Priority;
  status: TaskStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  original_due_date: string;
  current_due_date: string;
  extension_count: number;
  deadline_extensions: DeadlineExtension[];
  resolution_notes: string | null;
  cancel_reason: string | null;
  google_task_id: string | null;
  google_calendar_event_id: string | null;
  learning_resources: LearningResources;
  met_original_sla: boolean | null;
}

export interface ConnectedAccount {
  id: AccountType;
  email: string;
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
  default_tasklist_id?: string;
  last_sync_at: string;
  is_connected: boolean;
}

export interface GeminiTriageResponse {
  refined_title: string;
  structured_description: string;
  account_type: AccountType;
  category: TaskCategory;
  priority: Priority;
  extracted_due_date_iso: string | null;
  search_tags: string[];
  learning_queries: string[];
}

export interface SimilarResolution {
  task_id: string;
  title: string;
  completed_at: string;
  resolution_notes: string;
  matched_tags: string[];
}

export interface AnalyticsMetrics {
  total_tasks: number;
  work_count: number;
  personal_count: number;
  completed_count: number;
  in_progress_count: number;
  waiting_count: number;
  todo_count: number;
  sla_on_time_pct: number;
  sla_extended_pct: number;
  sla_breached_pct: number;
  categories_distribution: Record<string, number>;
  knowledge_base_reuse_count: number;
}

