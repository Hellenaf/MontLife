import { addHours, addDays, isWeekend, formatISO, parseISO, isAfter } from "date-fns";
import { Priority, TaskStatus } from "@/types";

/**
 * Calculates automatic due date (SLA) based on priority
 * P1: Critical / Urgent (+4 hours)
 * P2: High (+24 hours / next day)
 * P3: Medium / Routine (+3 business days)
 * P4: Low / Planning (+7 days)
 */
export function calculateSlaDueDate(priority: Priority, baseDate: Date = new Date()): string {
  switch (priority) {
    case "P1":
      return formatISO(addHours(baseDate, 4));

    case "P2":
      return formatISO(addHours(baseDate, 24));

    case "P3": {
      // 3 business days (skip Saturday and Sunday)
      let count = 0;
      let current = new Date(baseDate);
      while (count < 3) {
        current = addDays(current, 1);
        if (!isWeekend(current)) {
          count++;
        }
      }
      return formatISO(current);
    }

    case "P4":
    default:
      return formatISO(addDays(baseDate, 7));
  }
}

/**
 * Returns SLA prefix for Google Tasks synchronization
 */
export function getGoogleTaskPrefix(status: TaskStatus): string {
  switch (status) {
    case "IN_PROGRESS":
      return "[▶️] ";
    case "WAITING":
      return "[⏳] ";
    case "COMPLETED":
      return "[✅] ";
    case "TODO":
    case "TRIAGE":
    case "CANCELED":
    default:
      return "";
  }
}

/**
 * Strips known Mont Ops prefixes from Google Tasks title
 */
export function stripGoogleTaskPrefix(title: string): string {
  return title.replace(/^\[(▶️|⏳|✅)\]\s*/, "");
}

/**
 * Formats a clean title with the status prefix for Google Tasks
 */
export function formatGoogleTaskTitle(title: string, status: TaskStatus): string {
  const cleanTitle = stripGoogleTaskPrefix(title);
  return `${getGoogleTaskPrefix(status)}${cleanTitle}`;
}

/**
 * Checks if a task is overdue relative to now
 */
export function isTaskOverdue(dueDateIso: string, status: TaskStatus): boolean {
  if (status === "COMPLETED" || status === "CANCELED") return false;
  return isAfter(new Date(), parseISO(dueDateIso));
}

/**
 * Checks if task met the original SLA
 */
export function checkMetOriginalSla(
  originalDueDateIso: string,
  completedAtIso: string | null
): boolean {
  if (!completedAtIso) return false;
  const originalDue = parseISO(originalDueDateIso);
  const completedAt = parseISO(completedAtIso);
  return !isAfter(completedAt, originalDue);
}

