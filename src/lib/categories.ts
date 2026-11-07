import { Task } from "@/types";

/**
 * Matriz concisa e padronizada de categorias oficiais do MontLife.
 * Enxuta e alinhada para evitar fragmentação e sinônimos redundantes criados pela IA.
 */
export const STANDARD_CATEGORIES: string[] = [
  "Sistemas ERP",
  "BI & Analytics",
  "Finanças & Tesouraria",
  "Recursos Humanos & DP",
  "Secretaria & Acadêmico",
  "Infraestrutura & TI",
  "Comunicação & Avisos",
  "Gestão & Contratos",
  "Automações & Scripts",
  "Vida Pessoal & Casa",
  "Saúde & Bem-estar",
  "Estudos & Carreira",
  "Operações & Demandas",
];

/**
 * Normaliza qualquer categoria, sinônimo livre ou variação gerada pela IA
 * para a categoria canônica padronizada correspondente.
 */
export function normalizeCategory(category?: string | null): string {
  if (!category || typeof category !== "string") {
    return "Operações & Demandas";
  }

  const clean = category.trim();
  if (!clean) return "Operações & Demandas";

  // Correspondência exata inicial
  const exact = STANDARD_CATEGORIES.find(
    (c) => c.toLowerCase() === clean.toLowerCase()
  );
  if (exact) return exact;

  const lower = clean.toLowerCase();

  // 1. BI & Analytics (Power BI, Dashboards, Cubos, DAX, Relatórios analíticos)
  if (
    lower.includes("power bi") ||
    lower.includes("analytics") ||
    lower.includes("dashboard") ||
    lower.includes("dax") ||
    lower.includes("relatório") ||
    lower.includes("relatorio") ||
    lower.includes("metabase") ||
    lower.includes("cubo") ||
    /\bbi\b/.test(lower)
  ) {
    return "BI & Analytics";
  }

  // 2. Sistemas ERP (TOTVS RM, Protheus, Patches, rotinas de ERP)
  if (
    lower.includes("totvs") ||
    lower.includes("protheus") ||
    lower.includes("patch") ||
    lower.includes("erp") ||
    /\brm\b/.test(lower)
  ) {
    return "Sistemas ERP";
  }

  // 3. Finanças & Tesouraria (Bancos, Notas fiscais, Boletos, Cobrança, Tesouraria)
  if (
    lower.includes("finan") ||
    lower.includes("tesouraria") ||
    lower.includes("banco") ||
    lower.includes("fatur") ||
    lower.includes("boleto") ||
    lower.includes("cobran") ||
    lower.includes("pagamento") ||
    lower.includes("contas a pagar") ||
    lower.includes("contas a receber") ||
    lower.includes("fiscal")
  ) {
    return "Finanças & Tesouraria";
  }

  // 4. Recursos Humanos & DP (RH, DP, Colaboradores, Folha de pagamento, Ponto)
  if (
    lower.includes("recursos humanos") ||
    lower.includes("colaborador") ||
    lower.includes("funcionário") ||
    lower.includes("funcionario") ||
    lower.includes("folha") ||
    lower.includes("admissão") ||
    lower.includes("demissão") ||
    lower.includes("ponto") ||
    /\brh\b/.test(lower) ||
    /\bdp\b/.test(lower)
  ) {
    return "Recursos Humanos & DP";
  }

  // 5. Secretaria & Acadêmico (Alunos, Matrícula, Histórico, Biblioteca, Pedagógico)
  if (
    lower.includes("secretaria") ||
    lower.includes("acadêmic") ||
    lower.includes("academic") ||
    lower.includes("matrícula") ||
    lower.includes("matricula") ||
    lower.includes("histórico") ||
    lower.includes("historico") ||
    lower.includes("aluno") ||
    lower.includes("educacion") ||
    lower.includes("pedagóg") ||
    lower.includes("pedagog") ||
    lower.includes("escola") ||
    lower.includes("colégio") ||
    lower.includes("colegio") ||
    lower.includes("biblioteca") ||
    lower.includes("acervo")
  ) {
    return "Secretaria & Acadêmico";
  }

  // 6. Infraestrutura & TI (Redes, Servidores, Hardware, Wifi, Impressoras, Suporte Técnico)
  if (
    lower.includes("infra") ||
    lower.includes("rede") ||
    lower.includes("servidor") ||
    lower.includes("hardware") ||
    lower.includes("switch") ||
    lower.includes("wifi") ||
    lower.includes("impressora") ||
    lower.includes("cabo") ||
    lower.includes("suporte técnico") ||
    lower.includes("suporte tecnico") ||
    /\bti\b/.test(lower)
  ) {
    return "Infraestrutura & TI";
  }

  // 7. Comunicação & Avisos (Classapp, Mensagens, Comunicados, E-mails, Notificações)
  if (
    lower.includes("comunica") ||
    lower.includes("classapp") ||
    lower.includes("agendaedu") ||
    lower.includes("mensagem") ||
    lower.includes("comunicado") ||
    lower.includes("notifica") ||
    lower.includes("e-mail") ||
    lower.includes("email")
  ) {
    return "Comunicação & Avisos";
  }

  // 8. Gestão & Contratos (Contratos, Jurídico, Compras corporativas, Suprimentos)
  if (
    lower.includes("contrato") ||
    lower.includes("aditivo") ||
    lower.includes("jurídic") ||
    lower.includes("juridic") ||
    lower.includes("compras") ||
    lower.includes("suprimento") ||
    lower.includes("fornecedor") ||
    lower.includes("cotação") ||
    lower.includes("cotacao")
  ) {
    return "Gestão & Contratos";
  }

  // 9. Automações & Scripts (Python, Bots, APIs, Engenharia de software, Automações)
  if (
    lower.includes("automa") ||
    lower.includes("script") ||
    lower.includes("python") ||
    lower.includes("bot") ||
    lower.includes("api") ||
    lower.includes("código") ||
    lower.includes("codigo") ||
    lower.includes("engenharia") ||
    lower.includes("desenvolvimento")
  ) {
    return "Automações & Scripts";
  }

  // 10. Saúde & Bem-estar (Médicos, Dentista, Treino, Remédios, Consultas, Exames)
  if (
    lower.includes("saúde") ||
    lower.includes("saude") ||
    lower.includes("médic") ||
    lower.includes("medic") ||
    lower.includes("dentista") ||
    lower.includes("treino") ||
    lower.includes("remédio") ||
    lower.includes("remedio") ||
    lower.includes("consulta") ||
    lower.includes("exame") ||
    lower.includes("bem-estar") ||
    lower.includes("bem estar")
  ) {
    return "Saúde & Bem-estar";
  }

  // 11. Estudos & Carreira (Cursos, Livros, Capacitação, Certificações, Idiomas)
  if (
    lower.includes("estudo") ||
    lower.includes("curso") ||
    lower.includes("capacita") ||
    lower.includes("certifica") ||
    lower.includes("livro") ||
    lower.includes("leitura") ||
    lower.includes("inglês") ||
    lower.includes("ingles") ||
    lower.includes("carreira")
  ) {
    return "Estudos & Carreira";
  }

  // 12. Vida Pessoal & Casa (Casa, Família, Supermercado, Despesas domésticas)
  if (
    lower.includes("vida pessoal") ||
    lower.includes("pessoal") ||
    lower.includes("casa") ||
    lower.includes("família") ||
    lower.includes("familia") ||
    lower.includes("supermercado") ||
    lower.includes("mercado") ||
    lower.includes("limpeza") ||
    lower.includes("reforma")
  ) {
    return "Vida Pessoal & Casa";
  }

  // 13. Operações & Demandas (Default fallback para rotinas operacionais e gerais)
  return "Operações & Demandas";
}

/**
 * Retorna lista deduplicada e alinhada de todas as categorias:
 * categorias padrão enxutas + categorias normalizadas das demandas.
 */
export function getAllCategories(tasks: Task[] = []): string[] {
  const set = new Set<string>(STANDARD_CATEGORIES);
  if (Array.isArray(tasks)) {
    for (const t of tasks) {
      if (t.category && typeof t.category === "string" && t.category.trim()) {
        set.add(normalizeCategory(t.category));
      }
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
