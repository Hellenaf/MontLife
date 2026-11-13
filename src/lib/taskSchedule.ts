import { Task, GoogleCalendarEventItem } from "@/types";
import { parseISO, isSameDay, getHours, getMinutes, format } from "date-fns";

export function isValidIsoDate(val?: string | null): boolean {
  if (!val || typeof val !== "string" || !val.trim()) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

/**
 * Converte uma data ISO para o formato aceito por <input type="datetime-local" /> (hora local).
 */
export function toDateTimeLocalValue(val?: string | null): string {
  if (!isValidIsoDate(val)) return "";
  try {
    return format(parseISO(val as string), "yyyy-MM-dd'T'HH:mm");
  } catch {
    try {
      return format(new Date(val as string), "yyyy-MM-dd'T'HH:mm");
    } catch {
      return "";
    }
  }
}

/**
 * Retorna a data operacional exata em que a tarefa deve aparecer no calendário:
 * 1. Se foi adiada/estendida: utiliza o ÚLTIMO PRAZO estendido.
 * 2. Se possui scheduled_start definido: utiliza scheduled_start.
 * 3. Se tem prazo (current_due_date ou original_due_date): utiliza o prazo final.
 * 4. Se NÃO TEM PRAZO: registra no dia em que foi criada (created_at).
 */
export function getTaskScheduleDate(task: Task): string {
  // 1. Último prazo estendido
  if (task.deadline_extensions && task.deadline_extensions.length > 0) {
    const lastExtension = task.deadline_extensions[task.deadline_extensions.length - 1];
    if (lastExtension?.new_date && lastExtension.new_date.trim()) {
      return lastExtension.new_date;
    }
  }

  // 2. Horário de início explicitamente agendado
  if (isValidIsoDate(task.scheduled_start)) {
    return task.scheduled_start as string;
  }

  // 3. Prazo atual / limite da tarefa
  if (task.current_due_date && task.current_due_date.trim()) {
    return task.current_due_date;
  }

  // 4. Prazo original
  if (task.original_due_date && task.original_due_date.trim()) {
    return task.original_due_date;
  }

  // 5. Sem prazo: registra na data em que foi criada
  if (task.created_at && task.created_at.trim()) {
    return task.created_at;
  }

  return new Date().toISOString();
}

/**
 * Retorna a data/hora ISO de término do agendamento quando existente e válida.
 */
export function getTaskScheduleEnd(task: Task): string | null {
  if (!isValidIsoDate(task.scheduled_end)) return null;
  const startStr = getTaskScheduleDate(task);
  if (!isValidIsoDate(startStr)) return task.scheduled_end as string;

  const startMs = new Date(startStr).getTime();
  const endMs = new Date(task.scheduled_end as string).getTime();

  // Caso a tarefa tenha sido adiada após o agendamento inicial sem atualizar scheduled_end diretamente,
  // garante que não retorne um término anterior ao início.
  if (endMs <= startMs) {
    return null;
  }

  return task.scheduled_end as string;
}

/**
 * Indica se a tarefa possui janela explícita de início e término agendada.
 */
export function hasScheduledTimeRange(task: Task): boolean {
  return Boolean(getTaskScheduleEnd(task));
}

/**
 * Verifica se a tarefa está agendada para o dia especificado
 */
export function isTaskScheduledForDay(task: Task, day: Date): boolean {
  try {
    const scheduleDateStr = getTaskScheduleDate(task);
    const date = parseISO(scheduleDateStr);
    return isSameDay(date, day);
  } catch {
    try {
      if (task.created_at) {
        return isSameDay(parseISO(task.created_at), day);
      }
    } catch {}
    return false;
  }
}

/**
 * Verifica se a tarefa é de dia inteiro ou se tem horário específico
 */
export function isTaskAllDay(task: Task): boolean {
  try {
    if (!task.scheduled_start && !task.current_due_date && !task.original_due_date) {
      return true;
    }

    const scheduleDateStr = getTaskScheduleDate(task);
    if (!scheduleDateStr.includes("T")) return true; // formato YYYY-MM-DD

    const date = parseISO(scheduleDateStr);
    const isStartMidnight = getHours(date) === 0 && getMinutes(date) === 0;
    if (!isStartMidnight) return false;

    const endStr = getTaskScheduleEnd(task);
    if (endStr) {
      const endDate = parseISO(endStr);
      if (getHours(endDate) !== 0 || getMinutes(endDate) !== 0) {
        return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * Formata intervalo de horário amigável para exibição (ex: "14:00 - 16:00", "14:00" ou "Dia todo").
 */
export function formatTaskTimeRange(task: Task): string {
  if (isTaskAllDay(task)) {
    return "Dia todo";
  }

  try {
    const startStr = getTaskScheduleDate(task);
    const startDate = parseISO(startStr);
    const startFmt = format(startDate, "HH:mm");
    const endStr = getTaskScheduleEnd(task);

    if (endStr) {
      const endDate = parseISO(endStr);
      const endFmt = format(endDate, "HH:mm");
      if (isSameDay(startDate, endDate)) {
        return `${startFmt} - ${endFmt}`;
      }
      return `${startFmt} - ${format(endDate, "dd/MM HH:mm")}`;
    }

    return startFmt;
  } catch {
    return "Horário agendado";
  }
}

/**
 * Formata a antecedência do lembrete em texto legível em Português.
 */
export function formatReminderLeadTime(minutes?: number | null): string {
  if (minutes === null || minutes === undefined || isNaN(minutes) || minutes < 0) {
    return "30 min antes";
  }
  const m = Math.round(minutes);
  if (m === 0) return "No horário";
  if (m < 60) return `${m} min antes`;
  if (m % 1440 === 0) {
    const days = m / 1440;
    return days === 1 ? "1 dia antes" : `${days} dias antes`;
  }
  if (m % 60 === 0) {
    const hours = m / 60;
    return hours === 1 ? "1h antes" : `${hours}h antes`;
  }
  const hours = Math.floor(m / 60);
  const rem = m % 60;
  return `${hours}h ${rem}min antes`;
}

/**
 * Retorna a data/hora exata em que o aviso de lembrete deve ser disparado,
 * ou null se o lembrete estiver desativado.
 */
export function getTaskReminderDate(task: Task): Date | null {
  if (task.reminder_enabled !== true) return null;
  const startStr = getTaskScheduleDate(task);
  if (!isValidIsoDate(startStr)) return null;

  const startMs = new Date(startStr).getTime();
  const leadMinutes =
    typeof task.reminder_minutes_before === "number" && task.reminder_minutes_before >= 0
      ? task.reminder_minutes_before
      : 30;

  return new Date(startMs - leadMinutes * 60_000);
}

/**
 * Gera um link exclusivo no padrão oficial do Google Meet (ex: https://meet.google.com/abc-defg-hij)
 */
export function generateGoogleMeetLink(): string {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const part = (len: number) =>
    Array.from({ length: len }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
  return `https://meet.google.com/${part(3)}-${part(4)}-${part(3)}`;
}

export function isValidGoogleMeetLink(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  return Boolean(url.match(/^https?:\/\/(meet\.google\.com|meet\.app\.goo\.gl)\/[a-z0-9\-_]+/i));
}

export interface ScheduleConflictItem {
  id: string;
  title: string;
  start: string;
  end: string;
  type: "task" | "google_event";
  timeRangeLabel: string;
}

/**
 * Detecta conflitos de horário entre a data/hora proposta e as demandas existentes ou compromissos do Google Agenda.
 */
export function findScheduleConflicts(
  proposedStart: string | null | undefined,
  proposedEnd: string | null | undefined,
  tasks: Task[] = [],
  gcalEvents: GoogleCalendarEventItem[] = [],
  excludeTaskId?: string
): ScheduleConflictItem[] {
  if (!isValidIsoDate(proposedStart)) return [];

  const pStart = new Date(proposedStart as string).getTime();
  const pEnd = isValidIsoDate(proposedEnd)
    ? new Date(proposedEnd as string).getTime()
    : pStart + 60 * 60_000;

  if (pEnd <= pStart) return [];

  const conflicts: ScheduleConflictItem[] = [];

  // 1. Checa demandas MontLife
  for (const t of tasks) {
    if (t.id === excludeTaskId) continue;
    if (t.status === "COMPLETED" || t.status === "CANCELED") continue;
    if (isTaskAllDay(t)) continue;

    const tStartStr = getTaskScheduleDate(t);
    if (!isValidIsoDate(tStartStr)) continue;

    const tStart = new Date(tStartStr).getTime();
    const tEndStr = getTaskScheduleEnd(t);
    const tEnd = tEndStr && isValidIsoDate(tEndStr)
      ? new Date(tEndStr).getTime()
      : tStart + 60 * 60_000;

    // Condição de sobreposição: A.start < B.end && A.end > B.start
    if (tStart < pEnd && tEnd > pStart) {
      conflicts.push({
        id: t.id,
        title: t.title,
        start: tStartStr,
        end: tEndStr || new Date(tEnd).toISOString(),
        type: "task",
        timeRangeLabel: formatTaskTimeRange(t),
      });
    }
  }

  // 2. Checa eventos do Google Calendar
  for (const ev of gcalEvents) {
    if (ev.allDay) continue;
    if (!ev.start || !isValidIsoDate(ev.start)) continue;

    const evStart = new Date(ev.start).getTime();
    const evEnd = ev.end && isValidIsoDate(ev.end)
      ? new Date(ev.end).getTime()
      : evStart + 60 * 60_000;

    if (evStart < pEnd && evEnd > pStart) {
      const startFmt = format(parseISO(ev.start), "HH:mm");
      const endFmt = ev.end && isValidIsoDate(ev.end) ? format(parseISO(ev.end), "HH:mm") : "";
      conflicts.push({
        id: ev.id,
        title: ev.summary || "Compromisso Google Agenda",
        start: ev.start,
        end: ev.end || new Date(evEnd).toISOString(),
        type: "google_event",
        timeRangeLabel: endFmt ? `${startFmt} - ${endFmt}` : startFmt,
      });
    }
  }

  return conflicts;
}
