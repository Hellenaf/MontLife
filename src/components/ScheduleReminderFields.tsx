"use client";

import React from "react";
import { Calendar, Clock, Bell, BellOff, Timer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ItemType } from "@/types";
import { formatReminderLeadTime, toDateTimeLocalValue } from "@/lib/taskSchedule";

interface ScheduleReminderFieldsProps {
  /** Local datetime string "yyyy-MM-dd'T'HH:mm" or ISO string */
  startValue: string;
  /** Local datetime string "yyyy-MM-dd'T'HH:mm", ISO string, or empty "" */
  endValue: string;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
  itemType?: ItemType;
  /** Optional quick shortcuts (e.g. Hoje 18h, Amanhã, etc.) */
  showQuickDateButtons?: boolean;
  onChangeStart: (nextStartLocalOrIso: string) => void;
  onChangeEnd: (nextEndLocalOrIso: string) => void;
  onChangeReminderEnabled: (enabled: boolean) => void;
  onChangeReminderMinutes: (minutes: number) => void;
  /** True when parent stores ISO strings (HeaderCommandBar / CentralQuadrant) instead of datetime-local strings (NewTaskModal) */
  valueFormat?: "local" | "iso";
  compact?: boolean;
}

const DURATION_PRESETS = [
  { label: "+30m", minutes: 30 },
  { label: "+1h", minutes: 60 },
  { label: "+1h30", minutes: 90 },
  { label: "+2h", minutes: 120 },
  { label: "+3h", minutes: 180 },
];

const REMINDER_PRESETS = [
  { label: "Na hora", minutes: 0 },
  { label: "10 min", minutes: 10 },
  { label: "15 min", minutes: 15 },
  { label: "30 min (Padrão)", minutes: 30 },
  { label: "1 hora", minutes: 60 },
  { label: "2 horas", minutes: 120 },
  { label: "1 dia", minutes: 1440 },
];

function parseDateSafe(val: string): Date | null {
  if (!val || !val.trim()) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function formatOut(date: Date, mode: "local" | "iso"): string {
  if (mode === "iso") return date.toISOString();
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function ScheduleReminderFields({
  startValue,
  endValue,
  reminderEnabled,
  reminderMinutesBefore,
  itemType = "task",
  showQuickDateButtons = false,
  onChangeStart,
  onChangeEnd,
  onChangeReminderEnabled,
  onChangeReminderMinutes,
  valueFormat = "local",
  compact = false,
}: ScheduleReminderFieldsProps) {
  const startInputVal =
    valueFormat === "iso" ? toDateTimeLocalValue(startValue) : startValue;
  const endInputVal =
    valueFormat === "iso" ? toDateTimeLocalValue(endValue) : endValue;

  const hasEndTime = Boolean(endInputVal && endInputVal.trim());
  const startDateObj = parseDateSafe(startValue || startInputVal);
  const endDateObj = parseDateSafe(endValue || endInputVal);

  const reminderTriggerDate =
    reminderEnabled && startDateObj
      ? new Date(startDateObj.getTime() - Math.max(0, reminderMinutesBefore) * 60_000)
      : null;

  const durationMinutes =
    startDateObj && endDateObj && endDateObj.getTime() > startDateObj.getTime()
      ? Math.round((endDateObj.getTime() - startDateObj.getTime()) / 60_000)
      : null;

  const handleToggleTimeRange = () => {
    if (hasEndTime) {
      onChangeEnd("");
    } else {
      const baseStart = startDateObj || new Date();
      if (!startDateObj) {
        onChangeStart(formatOut(baseStart, valueFormat));
      }
      const nextEnd = new Date(baseStart.getTime() + 60 * 60_000);
      onChangeEnd(formatOut(nextEnd, valueFormat));
      if (!reminderEnabled) {
        onChangeReminderEnabled(true);
        if (reminderMinutesBefore === null || reminderMinutesBefore === undefined || isNaN(reminderMinutesBefore)) {
          onChangeReminderMinutes(30);
        }
      }
    }
  };

  const handleStartInputChange = (rawLocal: string) => {
    if (!rawLocal) {
      onChangeStart("");
      return;
    }
    const newStart = new Date(rawLocal);
    if (isNaN(newStart.getTime())) return;

    const prevDurationMs =
      startDateObj && endDateObj && endDateObj.getTime() > startDateObj.getTime()
        ? endDateObj.getTime() - startDateObj.getTime()
        : null;

    onChangeStart(formatOut(newStart, valueFormat));

    // Keep end after start automatically (preserving duration when present)
    if (hasEndTime && endDateObj) {
      if (prevDurationMs !== null) {
        onChangeEnd(formatOut(new Date(newStart.getTime() + prevDurationMs), valueFormat));
      } else if (endDateObj.getTime() <= newStart.getTime()) {
        onChangeEnd(formatOut(new Date(newStart.getTime() + 60 * 60_000), valueFormat));
      }
    }
  };

  const handleEndInputChange = (rawLocal: string) => {
    if (!rawLocal) {
      onChangeEnd("");
      return;
    }
    const newEnd = new Date(rawLocal);
    if (isNaN(newEnd.getTime())) return;
    onChangeEnd(formatOut(newEnd, valueFormat));
  };

  const handleApplyDuration = (minutes: number) => {
    const baseStart = startDateObj || new Date();
    if (!startDateObj) {
      onChangeStart(formatOut(baseStart, valueFormat));
    }
    const nextEnd = new Date(baseStart.getTime() + minutes * 60_000);
    onChangeEnd(formatOut(nextEnd, valueFormat));
  };

  const isInvalidRange = Boolean(
    startDateObj && endDateObj && endDateObj.getTime() <= startDateObj.getTime()
  );

  return (
    <div
      className={`${
        compact ? "p-3" : "p-3.5 sm:p-4"
      } rounded-2xl bg-slate-50/90 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 space-y-3`}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider block">
              {itemType === "activity" || hasEndTime
                ? "Agendamento de Horário (Reunião / Treinamento)"
                : "Prazo, Horário & Aviso de Lembrete"}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
              Defina início, término opcional e antecedência do aviso.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleTimeRange}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer shrink-0 ${
            hasEndTime
              ? "bg-purple-600 text-white border-purple-500 shadow-xs"
              : "bg-white dark:bg-[#141520] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700 hover:border-purple-400"
          }`}
        >
          <Timer className="w-3 h-3" />
          <span>{hasEndTime ? "Com horário de término" : "+ Marcar término"}</span>
        </button>
      </div>

      {/* Start & End Inputs */}
      <div className={`grid grid-cols-1 ${hasEndTime ? "sm:grid-cols-2" : ""} gap-2.5`}>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>{hasEndTime ? "Data & Horário de Início:" : "Data & Horário / Prazo:"}</span>
          </label>
          <input
            type="datetime-local"
            value={startInputVal}
            onChange={(e) => handleStartInputChange(e.target.value)}
            className="w-full h-9 px-3 text-xs rounded-xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        {hasEndTime && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between gap-2">
              <span>Data & Horário de Término:</span>
              {durationMinutes !== null && (
                <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
                  {durationMinutes >= 60
                    ? `${Math.floor(durationMinutes / 60)}h${
                        durationMinutes % 60 ? `${durationMinutes % 60}m` : ""
                      }`
                    : `${durationMinutes} min`}
                </span>
              )}
            </label>
            <input
              type="datetime-local"
              value={endInputVal}
              min={startInputVal || undefined}
              onChange={(e) => handleEndInputChange(e.target.value)}
              className={`w-full h-9 px-3 text-xs rounded-xl bg-white dark:bg-[#141520] border ${
                isInvalidRange
                  ? "border-rose-500 focus:border-rose-500"
                  : "border-slate-200 dark:border-zinc-700 focus:border-indigo-500"
              } text-slate-900 dark:text-white focus:outline-none font-mono`}
            />
          </div>
        )}
      </div>

      {isInvalidRange && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
          O horário de término precisa ser posterior ao horário de início.
        </p>
      )}

      {/* Quick Date Shortcuts (when enabled in Details) OR Quick Duration Presets (when hasEndTime) */}
      {(hasEndTime || showQuickDateButtons) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {hasEndTime && (
            <>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mr-0.5">
                Duração rápida:
              </span>
              {DURATION_PRESETS.map((preset) => {
                const isSelected = durationMinutes === preset.minutes;
                return (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => handleApplyDuration(preset.minutes)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-purple-600 text-white border-purple-500"
                        : "bg-white dark:bg-[#141520] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700 hover:border-purple-400"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </>
          )}

          {showQuickDateButtons && !hasEndTime && (
            <>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setHours(18, 0, 0, 0);
                  onChangeStart(formatOut(d, valueFormat));
                }}
                className="px-2 py-0.5 rounded text-[10px] bg-slate-200/70 dark:bg-zinc-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                Hoje 18h
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  d.setHours(18, 0, 0, 0);
                  onChangeStart(formatOut(d, valueFormat));
                }}
                className="px-2 py-0.5 rounded text-[10px] bg-slate-200/70 dark:bg-zinc-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                Amanhã
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 4);
                  d.setHours(18, 0, 0, 0);
                  onChangeStart(formatOut(d, valueFormat));
                }}
                className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 cursor-pointer"
              >
                +4 dias
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 7);
                  d.setHours(18, 0, 0, 0);
                  onChangeStart(formatOut(d, valueFormat));
                }}
                className="px-2 py-0.5 rounded text-[10px] bg-slate-200/70 dark:bg-zinc-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                +1 semana
              </button>
            </>
          )}
        </div>
      )}

      {/* Reminder Configuration */}
      <div className="pt-2.5 border-t border-slate-200/80 dark:border-zinc-800/80 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {reminderEnabled ? (
              <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            ) : (
              <BellOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
              Aviso de Lembrete:
            </span>
          </div>

          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-[#141520] border border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                onChangeReminderEnabled(true);
                if (reminderMinutesBefore === null || reminderMinutesBefore === undefined || isNaN(reminderMinutesBefore)) {
                  onChangeReminderMinutes(30);
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                reminderEnabled
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Bell className="w-3 h-3" />
              <span>Ativo</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeReminderEnabled(false)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                !reminderEnabled
                  ? "bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-200 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <BellOff className="w-3 h-3" />
              <span>Sem lembrete</span>
            </button>
          </div>
        </div>

        {reminderEnabled ? (
          <div className="space-y-2 animate-in fade-in duration-150">
            {/* Lead time presets + custom input */}
            <div className="flex flex-wrap items-center gap-1.5">
              {REMINDER_PRESETS.map((preset) => {
                const isSelected = reminderMinutesBefore === preset.minutes;
                return (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => onChangeReminderMinutes(preset.minutes)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                        : "bg-white dark:bg-[#141520] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700 hover:border-amber-400"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}

              <div className="inline-flex items-center gap-1 bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-0.5 ml-auto sm:ml-0">
                <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                <input
                  type="number"
                  min={0}
                  max={43200}
                  value={Number.isFinite(reminderMinutesBefore) ? reminderMinutesBefore : 30}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    onChangeReminderMinutes(isNaN(parsed) || parsed < 0 ? 0 : Math.min(43200, parsed));
                  }}
                  aria-label="Minutos de antecedência do lembrete"
                  className="w-12 text-[11px] font-mono font-bold text-slate-900 dark:text-white bg-transparent focus:outline-none text-center"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  min antes
                </span>
              </div>
            </div>

            {reminderTriggerDate && (
              <div className="px-2.5 py-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Bell className="w-3 h-3 text-amber-500 shrink-0" />
                <span>
                  Lembrete programado:{" "}
                  <strong>
                    {format(reminderTriggerDate, "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </strong>{" "}
                  ({formatReminderLeadTime(reminderMinutesBefore)})
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Nenhum aviso de lembrete será disparado para este item (você pode ativar quando quiser).
          </p>
        )}
      </div>
    </div>
  );
}

