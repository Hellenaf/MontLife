import { Task } from "@/types";

export const STANDARD_CATEGORIES: string[] = [
  "Sistemas ERP",
  "Recursos Humanos & DP",
  "BI & Analytics",
  "Biblioteca & Acervo",
  "Finanças & Tesouraria",
  "Gestão & Contratos",
  "Gestão Educacional",
  "Secretaria Acadêmica",
  "Comunicação & Mensagens",
  "Infraestrutura & Redes",
  "Engenharia & Automações",
  "Suporte & Demandas",
  "Eventos & Vendas",
  "Estudos & Capacitação",
  "Saúde & Bem-estar",
  "Vida Pessoal & Casa",
  "Agenda & Compromissos",
  "Geral & Operações",
];

/**
 * Returns a deduplicated, sorted list of all categories:
 * standard categories + any custom categories present in tasks.
 */
export function getAllCategories(tasks: Task[] = []): string[] {
  const set = new Set<string>(STANDARD_CATEGORIES);
  if (Array.isArray(tasks)) {
    for (const t of tasks) {
      if (t.category && typeof t.category === "string" && t.category.trim()) {
        set.add(t.category.trim());
      }
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

