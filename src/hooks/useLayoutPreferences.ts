"use client";

import { useState, useEffect, useCallback } from "react";

export type DensityMode = "comfortable" | "compact";

export interface SplitRatios {
  demandas: number; // default 55
  agenda: number; // default 65
  anotacoes: number; // default 32
  kanbanDetail: number; // default 38 (right panel %)
  wikiLeft: number; // default 24
}

export interface OverviewShortcut {
  id: string;
  label: string;
  href: string;
  description: string;
}

export const DEFAULT_OVERVIEW_SHORTCUTS: OverviewShortcut[] = [
  { id: "sc-meu-dia", label: "Planejar Meu Dia", href: "/meu-dia", description: "Prioridades e agenda de hoje" },
  { id: "sc-demandas", label: "Demandas Ativas", href: "/demandas", description: "Lista + detalhes lado a lado" },
  { id: "sc-agenda", label: "Agenda & Meet", href: "/agenda", description: "Calendário e compromissos" },
  { id: "sc-anotacoes", label: "Nova Anotação", href: "/anotacoes", description: "Captura livre com IA" },
];

export interface LayoutPreferences {
  sidebarCollapsed: boolean;
  taskDensity: DensityMode;
  splitRatios: SplitRatios;
  overviewShortcuts: OverviewShortcut[];
  defaultReminderMinutes: number;
  autoBriefingOnOverview: boolean;
}

const DEFAULT_PREFERENCES: LayoutPreferences = {
  sidebarCollapsed: false,
  taskDensity: "comfortable",
  splitRatios: {
    demandas: 55,
    agenda: 65,
    anotacoes: 32,
    kanbanDetail: 38,
    wikiLeft: 24,
  },
  overviewShortcuts: DEFAULT_OVERVIEW_SHORTCUTS,
  defaultReminderMinutes: 30,
  autoBriefingOnOverview: false,
};

const STORAGE_KEY = "montlife_layout_preferences_v4";

export function useLayoutPreferences() {
  const [prefs, setPrefs] = useState<LayoutPreferences>(DEFAULT_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setPrefs({
          ...DEFAULT_PREFERENCES,
          ...parsed,
          splitRatios: {
            ...DEFAULT_PREFERENCES.splitRatios,
            ...(parsed.splitRatios || {}),
          },
          overviewShortcuts:
            Array.isArray(parsed.overviewShortcuts) && parsed.overviewShortcuts.length > 0
              ? parsed.overviewShortcuts
              : DEFAULT_OVERVIEW_SHORTCUTS,
        });
      }
    } catch {
      // Ignore parse error
    } finally {
      setHydrated(true);
    }
  }, []);

  const persist = useCallback((next: LayoutPreferences) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota error
    }
  }, []);

  const updatePrefs = useCallback(
    (updater: Partial<LayoutPreferences> | ((prev: LayoutPreferences) => LayoutPreferences)) => {
      setPrefs((prev) => {
        const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const toggleSidebar = useCallback(() => {
    updatePrefs((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  }, [updatePrefs]);

  const setSplitRatio = useCallback(
    (moduleKey: keyof SplitRatios, ratio: number) => {
      const clamped = Math.max(20, Math.min(80, Math.round(ratio * 10) / 10));
      updatePrefs((prev) => ({
        ...prev,
        splitRatios: {
          ...prev.splitRatios,
          [moduleKey]: clamped,
        },
      }));
    },
    [updatePrefs]
  );

  const setTaskDensity = useCallback(
    (density: DensityMode) => {
      updatePrefs({ taskDensity: density });
    },
    [updatePrefs]
  );

  const resetPreferences = useCallback(() => {
    setPrefs(DEFAULT_PREFERENCES);
    persist(DEFAULT_PREFERENCES);
  }, [persist]);

  return {
    prefs,
    hydrated,
    updatePrefs,
    toggleSidebar,
    setSplitRatio,
    setTaskDensity,
    resetPreferences,
  };
}

