import { Task } from "@/types";
import { parseISO, isSameDay, getHours, getMinutes } from "date-fns";

/**
 * Retorna a data operacional exata em que a tarefa deve aparecer no calendário:
 * 1. Se foi adiada/estendida: utiliza o ÚLTIMO PRAZO estendido.
 * 2. Se tem prazo (current_due_date ou original_due_date): utiliza o prazo final.
 * 3. Se NÃO TEM PRAZO: registra no dia em que foi criada (created_at).
 */
export function getTaskScheduleDate(task: Task): string {
  // 1. Último prazo estendido
  if (task.deadline_extensions && task.deadline_extensions.length > 0) {
    const lastExtension = task.deadline_extensions[task.deadline_extensions.length - 1];
    if (lastExtension?.new_date && lastExtension.new_date.trim()) {
      return lastExtension.new_date;
    }
  }

  // 2. Prazo atual / limite da tarefa
  if (task.current_due_date && task.current_due_date.trim()) {
    return task.current_due_date;
  }

  // 3. Prazo original
  if (task.original_due_date && task.original_due_date.trim()) {
    return task.original_due_date;
  }

  // 4. Sem prazo: registra na data em que foi criada
  if (task.created_at && task.created_at.trim()) {
    return task.created_at;
  }

  return new Date().toISOString();
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
    // Fallback: se falhar, tenta created_at
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
    // Se a tarefa não tem prazo definido e está caindo em created_at, tratar como dia todo
    if (!task.current_due_date && !task.original_due_date) {
      return true;
    }

    const scheduleDateStr = getTaskScheduleDate(task);
    if (!scheduleDateStr.includes("T")) return true; // formato YYYY-MM-DD

    const date = parseISO(scheduleDateStr);
    return getHours(date) === 0 && getMinutes(date) === 0;
  } catch {
    return true;
  }
}
