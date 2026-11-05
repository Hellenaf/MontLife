export type AccountType = "work" | "personal";
export type ConnectedAccountId = AccountType;

export type ItemType = "task" | "activity" | "reminder";

export type TaskCategory = string;

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

export interface WebArticleResource {
  title: string;
  url: string;
  source?: string;
  snippet?: string;
}

export interface LearningResources {
  youtube_videos: YouTubeVideo[];
  articles?: WebArticleResource[];
  search_queries: string[];
}

export interface ValidationStep {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskAttachment {
  id: string;
  name: string;
  size: number;
  type: string; // MIME type or "url" / "link"
  url: string; // Base64 data URL or external URL
  created_at: string;
  stage: "creation" | "resolution";
  is_external_link?: boolean;
}

export interface ExecutionRecord {
  id: string;
  date: string;
  notes?: string;
  method?: string;
  registered_by?: string;
}

export interface AlternativeResolution {
  id: string;
  date: string;
  method: string;
  notes: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role?: string;
}

export interface Task {
  id: string;
  user_id?: string;
  raw_input: string;
  title: string;
  description: string;
  account_type: AccountType;
  item_type?: ItemType;
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
  attachments?: TaskAttachment[];
  resolution_attachments?: TaskAttachment[];
  validation_steps?: ValidationStep[];
  recurrence_count?: number;
  execution_history?: ExecutionRecord[];
  alternative_resolutions?: AlternativeResolution[];
}

export interface ConnectedAccount {
  id: ConnectedAccountId;
  user_id?: string;
  email: string;
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
  default_tasklist_id?: string;
  last_sync_at: string | null;
  is_connected: boolean;
}

export interface GeminiTriageResponse {
  refined_title: string;
  structured_description: string;
  account_type: AccountType;
  item_type: ItemType;
  category: TaskCategory;
  priority: Priority;
  extracted_due_date_iso: string | null;
  search_tags: string[];
  learning_queries: string[];
  validation_steps?: string[];
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
  canceled_count: number;
  sla_on_time_pct: number;
  sla_extended_pct: number;
  sla_breached_pct: number;
  categories_distribution: Record<string, number>;
  knowledge_base_reuse_count: number;
}
