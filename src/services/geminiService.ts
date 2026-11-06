import { GoogleGenAI, Type } from "@google/genai";
import { GeminiTriageResponse, TaskCategory, Priority, AccountType, ItemType } from "@/types";
import { aiCache } from "@/lib/aiCache";

const SYSTEM_PROMPT = `Você é o assistente executivo e arquiteto de demandas sênior do MontLife.
Sua missão é transformar qualquer entrada em linguagem natural (áudios transcritos, mensagens informais de WhatsApp/Teams, rascunhos rápidos ou comandos falados com gírias e vícios) em uma demanda corporativa impecável de alto nível executivo.

CRITÉRIOS OBRIGATÓRIOS DE QUALIDADE:

1. TÍTULO CLARO, PROFISSIONAL & ACIONÁVEL ('refined_title'):
   - Crie um título conciso, elegante e orientado ao entregável final (máximo 70 caracteres).
   - Inicie sempre com verbo de ação ou substantivo técnico forte (ex: "Implementar", "Parametrizar", "Atualizar", "Corrigir", "Homologar").
   - Exemplos de excelência:
     • Entrada informal: "No power bi de suprimentos inserir atualização do Tempo (Lead Time)... média de NFs de mês para dia"
       -> Título: "Implementar Métricas de Lead Time e Média Diária de NFs no Power BI de Suprimentos"
     • Entrada informal: "Ajustar o relatório 1207 do totvs que tá travando a saída"
       -> Título: "Otimizar e Parametrizar Consulta/Relatório 1207 no TOTVS RM"
   - JAMAIS repita construções coloquiais ("No power bi inserir...", "seria algo assim", "resumindo", "fazer tal coisa").

2. DESCRIÇÃO ESTRUTURADA DE ALTO PADRÃO ('structured_description'):
   - A descrição NUNCA deve ser um parágrafo genérico e NUNCA deve colar o texto bruto no objetivo.
   - Siga rigorosamente a seguinte estrutura em Markdown:

📋 Resumo Executivo:
[Síntese técnica e profissional em 1 ou 2 períodos explicando o que será realizado e o objetivo principal da demanda]

---

🎯 Requisitos & Regras de Negócio:
1. [Requisito 1 detalhado com regras de cálculo, fórmulas, filtros ou parâmetros citados]
2. [Requisito 2 detalhado, periodicidade, granularidade ou regras operacionais]

---

🔗 Sistemas & Fontes Envolvidas:
• Sistemas & Ferramentas: [Ex: Power BI (Painel e Modelo Semântico), TOTVS RM (Consultas 1207/1215), SQL, etc.]
• Setores Impactados: [Ex: Suprimentos, Compras e Expedição, TI, etc.]

3. PONTOS DE VALIDAÇÃO & CHECKLIST ('validation_steps'):
   - Gere de 3 a 5 etapas práticas, sequenciais e técnicas para que a demanda seja homologada e concluída com sucesso:
     • Mapear fontes de dados ou tabelas necessárias no sistema...
     • Desenvolver regra de negócio / medida DAX / código...
     • Testar amostragem confrontando com o ERP/base real...
     • Homologar com o solicitante / equipe responsável e publicar...

4. CONTEXTO & CLASSIFICAÇÃO:
   - 'account_type': 'work' (TOTVS, Power BI, relatórios, contratos, TI, rotinas escolares) ou 'personal' (saúde, finanças pessoais, compras).
   - 'item_type': 'task' (demanda técnica/operacional), 'activity' (reunião/evento) ou 'reminder' (lembrete).
   - 'category': Nome curto e técnico (ex: 'BI & Analytics', 'Sistemas ERP', 'TI & Suporte', 'Finanças & Contas', 'Secretaria Acadêmica').
   - 'priority': 'P1' (crítica), 'P2' (alta), 'P3' (média/padrão), 'P4' (baixa/planejada).
   - 'search_tags': Array com 3 a 5 tags técnicas limpas (ex: ["PowerBI", "TOTVS-RM", "Suprimentos", "LeadTime", "DAX"]).
   - 'learning_queries': 2 buscas focadas para tutoriais e melhores práticas.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    refined_title: {
      type: Type.STRING,
      description: "Título claro, profissional e acionável para a tarefa.",
    },
    structured_description: {
      type: Type.STRING,
      description: "Contexto organizado e resumo da solicitação.",
    },
    validation_steps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de 3 a 6 etapas e pontos de validação práticos para finalizar a demanda com sucesso.",
    },
    account_type: {
      type: Type.STRING,
      enum: ["work", "personal"],
      description: "Define se a tarefa vai para a conta Google de Trabalho ou Pessoal.",
    },
    item_type: {
      type: Type.STRING,
      enum: ["task", "activity", "reminder"],
      description: "Tipo de registro: 'task', 'activity' ou 'reminder'.",
    },
    category: {
      type: Type.STRING,
      description: "Categoria dinâmica concisa e profissional que melhor define o assunto da tarefa.",
    },
    priority: {
      type: Type.STRING,
      enum: ["P1", "P2", "P3", "P4"],
      description: "P1: Urgente, P2: Alta, P3: Média, P4: Baixa.",
    },
    extracted_due_date_iso: {
      type: Type.STRING,
      nullable: true,
      description: "Data/hora ISO 8601 se o usuário mencionou prazo específico, ou null.",
    },
    search_tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Tags contextuais e técnicas para indexar a demanda.",
    },
    learning_queries: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2 queries de busca para encontrar tutoriais no YouTube.",
    },
  },
  required: [
    "refined_title",
    "structured_description",
    "validation_steps",
    "account_type",
    "item_type",
    "category",
    "priority",
    "search_tags",
    "learning_queries",
  ],
};

// Ultra-lightweight micro prompt for fast categorization (~80 tokens vs ~1500 tokens)
const MICRO_CATEGORIZATION_PROMPT = `Você é um categorizador veloz do MontLife.
Dado um título e notas de uma tarefa, determine objetivamente:
1. category: Categoria profissional curta (ex: 'Sistemas ERP', 'TI & Suporte', 'RH & DP', 'Finanças & Contas', 'Secretaria Acadêmica', 'Comunicação', 'Biblioteca', 'Projetos', 'Estudos', 'Saúde & Bem-estar', 'Vida Pessoal').
2. tags: Array com 1 a 3 tags contextuais.
3. item_type: 'task', 'activity' ou 'reminder'.
4. priority: 'P1', 'P2', 'P3' ou 'P4'.
Retorne estritamente o JSON especificado.`;

const MICRO_CATEGORIZATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    category: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    priority: { type: Type.STRING, enum: ["P1", "P2", "P3", "P4"] },
    item_type: { type: Type.STRING, enum: ["task", "activity", "reminder"] },
  },
  required: ["category", "tags", "priority", "item_type"],
};

/**
 * Autonomous heuristic classifier that categorizes any task with high fidelity
 * when Gemini API quota is reached, key is offline, or during high-throughput imports.
 */
export function classifyTaskHeuristic(
  title: string,
  notes: string = "",
  accountTypeHint?: AccountType
): {
  account_type: AccountType;
  item_type: ItemType;
  category: TaskCategory;
  priority: Priority;
  tags: string[];
  learning_queries: string[];
} {
  const text = `${title} ${notes}`.toLowerCase();

  let accountType: AccountType = accountTypeHint || "work";
  let itemType: ItemType = "task";
  let category: TaskCategory = "Operações & Geral";
  let priority: Priority = "P3";
  const tags: string[] = [];

  // 1. Detect Item Type
  if (
    text.includes("lembr") ||
    text.includes("esquec") ||
    text.includes("aviso") ||
    text.includes("pagar") ||
    text.includes("comprar") ||
    text.includes("ligar") ||
    text.includes("tomar") ||
    text.includes("pegar")
  ) {
    itemType = "reminder";
  } else if (
    text.includes("reuni") ||
    text.includes("encontro") ||
    text.includes("aula") ||
    text.includes("treino") ||
    text.includes("consulta") ||
    text.includes("alinhamento") ||
    text.includes("call") ||
    text.includes("evento") ||
    text.includes("missa") ||
    text.includes("culto")
  ) {
    itemType = "activity";
  } else {
    itemType = "task";
  }

  // 2. High-precision contextual domains for dynamic categories & tags
  if (
    text.includes("power bi") ||
    /\bbi\b/.test(text) ||
    text.includes("dashboard") ||
    text.includes("relatório") ||
    text.includes("relatorio") ||
    text.includes("cubo") ||
    text.includes("dax") ||
    text.includes("lead time") ||
    text.includes("metabase")
  ) {
    category = "BI & Analytics";
    accountType = "work";
    tags.push("Power BI", "Relatórios");
    if (text.includes("totvs") || text.includes(" rm")) tags.push("TOTVS RM");
    if (text.includes("lead time")) tags.push("Lead Time");
    if (text.includes("suprimento") || text.includes("compras")) tags.push("Suprimentos");
    if (text.includes("fatur") || text.includes("saida") || text.includes("saída") || text.includes("nf")) tags.push("Faturamento");
    if (text.includes("1207") || text.includes("1215")) tags.push("Consultas 1207/1215");
    if (text.includes("tesouraria")) tags.push("Tesouraria");
    if (text.includes("bolsa")) tags.push("Bolsas");
  } else if (
    text.includes("totvs") ||
    text.includes(" rm") ||
    text.includes("patch") ||
    text.includes("protheus") ||
    text.includes("erp") ||
    text.includes("portal do aluno")
  ) {
    category = "Sistemas ERP";
    accountType = "work";
    tags.push("TOTVS RM", "ERP");
    if (text.includes("patch")) tags.push("Patch");
    if (text.includes("portal")) tags.push("Portal");
    if (text.includes("1207") || text.includes("1215")) tags.push("Consultas 1207/1215");
    if (text.includes("suprimento") || text.includes("compras")) tags.push("Suprimentos");
    if (text.includes("fatur")) tags.push("Faturamento");
    if (/\brh\b/.test(text) || text.includes("colaborador") || text.includes("funcionário") || text.includes("funcionario")) tags.push("RH", "Funcionários");
    if (text.includes("cpf")) tags.push("CPF");
    if (text.includes("biblioteca")) tags.push("Biblioteca");
  } else if (
    text.includes("contrato") ||
    text.includes("aditivo") ||
    text.includes("jurídic")
  ) {
    category = "Gestão & Contratos";
    accountType = "work";
    tags.push("Contratos", "Documentação");
  } else if (
    text.includes("secretaria") ||
    text.includes("matrícula") ||
    text.includes("matricula") ||
    text.includes("histórico escolar") ||
    text.includes("declaracao escolar") ||
    text.includes("declaração escolar")
  ) {
    category = "Secretaria Acadêmica";
    accountType = "work";
    tags.push("Secretaria", "Matrícula");
  } else if (
    text.includes("classapp") ||
    text.includes("agendaedu") ||
    text.includes("email") ||
    text.includes("e-mail") ||
    text.includes("mensagem") ||
    text.includes("comunicação") ||
    text.includes("comunicado")
  ) {
    category = "Comunicação & Mensagens";
    accountType = "work";
    tags.push("Comunicação");
    if (text.includes("classapp")) tags.push("Classapp");
    if (text.includes("extração") || text.includes("extracao")) tags.push("Extração de Dados");
  } else if (
    text.includes("tesouraria") ||
    text.includes("bolsa") ||
    text.includes("financeir") ||
    text.includes("fatura") ||
    text.includes("banco") ||
    text.includes("pagamento") ||
    text.includes("cobrança")
  ) {
    category = "Finanças & Tesouraria";
    tags.push("Finanças");
    if (text.includes("tesouraria")) tags.push("Tesouraria");
    if (text.includes("bolsa")) tags.push("Bolsas");
  } else if (
    text.includes("ingresso") ||
    text.includes("venda") ||
    text.includes("evento") ||
    text.includes("festa") ||
    text.includes("show") ||
    text.includes("agendamento")
  ) {
    category = "Eventos & Vendas";
    tags.push("Eventos", "Ingressos");
  } else if (
    text.includes("aluno") ||
    text.includes("professor") ||
    text.includes("pedagógic") ||
    text.includes("escola") ||
    text.includes("colégio") ||
    text.includes("cnd") ||
    text.includes("ndc")
  ) {
    category = "Gestão Educacional";
    accountType = "work";
    tags.push("Educação", "Alunos");
  } else if (
    text.includes("servidor") ||
    text.includes("rede") ||
    text.includes("switch") ||
    text.includes("wifi") ||
    text.includes("hardware") ||
    text.includes("impressora") ||
    text.includes("cabo") ||
    text.includes("infra")
  ) {
    category = "Infraestrutura & Redes";
    accountType = "work";
    tags.push("Infraestrutura", "Hardware");
  } else if (
    text.includes("script") ||
    text.includes("python") ||
    text.includes("código") ||
    text.includes("api") ||
    text.includes("automação") ||
    text.includes("automacao") ||
    text.includes("bot") ||
    text.includes("carta senha")
  ) {
    category = "Engenharia & Automações";
    accountType = "work";
    tags.push("Automação", "Scripts");
  } else if (
    text.includes("estudo") ||
    text.includes("curso") ||
    text.includes("livro") ||
    text.includes("inglês") ||
    text.includes("espanhol") ||
    text.includes("certificação") ||
    text.includes("leitura")
  ) {
    category = "Estudos & Capacitação";
    accountType = accountTypeHint || "personal";
    tags.push("Estudos", "Capacitação");
  } else if (
    text.includes("saúde") ||
    text.includes("saude") ||
    text.includes("médic") ||
    text.includes("dentista") ||
    text.includes("treino") ||
    text.includes("remédio") ||
    text.includes("consulta")
  ) {
    category = "Saúde & Bem-estar";
    accountType = "personal";
    tags.push("Saúde", "Pessoal");
  } else if (
    text.includes("casa") ||
    text.includes("supermercado") ||
    text.includes("mercado") ||
    text.includes("reforma") ||
    text.includes("limpeza") ||
    text.includes("família")
  ) {
    category = "Vida Pessoal & Casa";
    accountType = "personal";
    tags.push("Casa", "Pessoal");
  } else {
    // Dynamic fallback based on account type
    if (accountType === "personal") {
      category = "Vida Pessoal";
      tags.push("Pessoal");
    } else {
      category = "Suporte & Demandas";
      tags.push("Geral");
    }
  }

  // Priority detection
  if (
    text.includes("urgente") ||
    text.includes("parou") ||
    text.includes("fora do ar") ||
    text.includes("crítico") ||
    text.includes("não dá para fazer") ||
    text.includes("imediato")
  ) {
    priority = "P1";
  } else if (
    text.includes("importante") ||
    text.includes("diretoria") ||
    text.includes("prazo curto") ||
    text.includes("amanhã")
  ) {
    priority = "P2";
  } else if (
    text.includes("quando der") ||
    text.includes("planejar") ||
    text.includes("ideia") ||
    text.includes("futuro")
  ) {
    priority = "P4";
  }

  const cleanCategory = category;
  const learningQueries = [
    `${cleanCategory} ${tags[0] || ""} tutorial e melhores práticas`,
    `Como resolver e estruturar ${title.slice(0, 40)}`,
  ];

  return {
    account_type: accountType,
    item_type: itemType,
    category: cleanCategory,
    priority,
    tags: Array.from(new Set(tags)),
    learning_queries: learningQueries,
  };
}

/**
 * Intelligent heuristic to extract deadline from Portuguese text
 */
export function extractDeadlinesHeuristic(text: string): string | null {
  const lower = text.toLowerCase();
  const now = new Date();

  // "em X horas" ou "daqui a X horas"
  const inHoursMatch = lower.match(/(?:em|daqui\s+a)\s+(\d+)\s+hora/);
  if (inHoursMatch) {
    const hours = parseInt(inHoursMatch[1], 10);
    const target = new Date(now.getTime() + hours * 3600 * 1000);
    return target.toISOString();
  }

  // "hoje às HH(:mm)?"
  const hojeMatch = lower.match(/hoje\s+(?:às|as)?\s*(\d{1,2})(?::(\d{2}))?/);
  if (hojeMatch) {
    const h = parseInt(hojeMatch[1], 10);
    const m = hojeMatch[2] ? parseInt(hojeMatch[2], 10) : 0;
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    return target.toISOString();
  }

  // "amanhã"
  if (lower.includes("amanhã") || lower.includes("amanha")) {
    const target = new Date(now);
    target.setDate(target.getDate() + 1);
    const timeMatch = lower.match(/amanh[ãa]\s+(?:às|as)?\s*(\d{1,2})(?::(\d{2}))?/);
    if (timeMatch) {
      const h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      target.setHours(h, m, 0, 0);
    } else {
      target.setHours(18, 0, 0, 0);
    }
    return target.toISOString();
  }

  // Dias da semana: "até sexta", "para quinta"
  const weekdays = [
    { name: "domingo", day: 0 },
    { name: "segunda", day: 1 },
    { name: "terça", day: 2 },
    { name: "quarta", day: 3 },
    { name: "quinta", day: 4 },
    { name: "sexta", day: 5 },
    { name: "sábado", day: 6 },
  ];

  for (const wd of weekdays) {
    if (lower.includes(wd.name)) {
      const target = new Date(now);
      const currentDay = target.getDay();
      let diff = wd.day - currentDay;
      if (diff <= 0) diff += 7;
      target.setDate(target.getDate() + diff);
      target.setHours(18, 0, 0, 0);
      return target.toISOString();
    }
  }

  // "dia DD/MM" ou "até DD/MM"
  const dateMatch = lower.match(/(?:dia|até|ate)\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : now.getFullYear();
    const target = new Date(year, month, day, 18, 0, 0);
    return target.toISOString();
  }

  return null;
}

/**
 * Autonomous NLP Title Synthesizer:
 * Extracts a concise, professional title from verbose, unstructured natural language messages.
 */
export function synthesizeRefinedTitle(rawInput: string): string {
  const clean = rawInput.trim().replace(/\s+/g, " ");
  if (!clean) return "Nova Demanda";

  const lower = clean.toLowerCase();

  // 1. High-precision Power BI / Analytics & Reports
  if (lower.includes("power bi") || lower.includes("dashboard") || lower.includes("painel") || lower.includes("dax")) {
    const isLeadTime = lower.includes("lead time") || (lower.includes("tempo") && (lower.includes("emiss") || lower.includes("saida") || lower.includes("fatur")));
    const isMediaNf = (lower.includes("média") || lower.includes("media")) && (lower.includes("nf") || lower.includes("nota"));
    const isSuprimentos = lower.includes("suprimento") || lower.includes("compras");
    const isFaturamento = lower.includes("fatur") || lower.includes("venda");
    const isEstoque = lower.includes("estoque");
    const isFinanceiro = lower.includes("financeir") || lower.includes("tesouraria");

    let context = "";
    if (isSuprimentos) context = "de Suprimentos";
    else if (isFaturamento) context = "de Faturamento";
    else if (isEstoque) context = "de Estoque";
    else if (isFinanceiro) context = "Financeiro";

    if (isLeadTime && isMediaNf) {
      return `Implementar Métricas de Lead Time e Média Diária de NFs no Power BI${context ? " " + context : ""}`;
    }
    if (isLeadTime) {
      return `Implementar Métricas de Lead Time no Power BI${context ? " " + context : ""}`;
    }
    if (isMediaNf) {
      return `Ajustar Medida de Média de NFs no Power BI${context ? " " + context : ""}`;
    }
    if (lower.includes("atualiz") || lower.includes("ajust") || lower.includes("inserir")) {
      return `Atualizar Indicadores no Power BI${context ? " " + context : ""}`;
    }
    return `Desenvolver Dashboard no Power BI${context ? " " + context : ""}`;
  }

  // 2. TOTVS RM / ERP Systems
  if (lower.includes("totvs") || lower.includes(" rm") || lower.includes("protheus") || lower.includes("erp")) {
    if (lower.includes("patch") || lower.includes("release")) {
      return "Aplicação e Homologação de Patch no TOTVS RM";
    }
    if (lower.includes("1207") || lower.includes("1215") || lower.includes("relat") || lower.includes("papeleta")) {
      return "Ajuste e Homologação de Relatório no TOTVS RM";
    }
    if (lower.includes("matrícula") || lower.includes("matricula") || lower.includes("secretaria")) {
      return "Parametrização de Processos de Matrícula no TOTVS RM";
    }
    if (lower.includes("boleto") || lower.includes("remessa") || lower.includes("retorno") || lower.includes("financeir")) {
      return "Manutenção e Homologação Financeira no TOTVS RM";
    }
    if (/\brh\b/.test(lower) || lower.includes("folha") || lower.includes("colaborador") || lower.includes("funcionário")) {
      return "Parametrização do Módulo de Recursos Humanos no TOTVS RM";
    }
    return "Análise e Parametrização de Rotina no TOTVS RM";
  }

  // 3. Infrastructure, Networks & Hardware
  if (lower.includes("servidor") || lower.includes("rede") || lower.includes("switch") || lower.includes("wifi") || lower.includes("impressora")) {
    return "Manutenção e Suporte à Infraestrutura de TI";
  }

  // 4. Communication & School Tools (ClassApp, Agenda Edu)
  if (lower.includes("classapp") || lower.includes("agendaedu") || lower.includes("comunicado")) {
    return "Gestão e Envio de Comunicações Escolares";
  }

  // 5. Personal / Financial / Studies
  if (lower.includes("pagar") || lower.includes("boleto") || lower.includes("fatura")) {
    const obj = clean.split(/[.,;\n]/)[0].replace(/^(?:lembrete|pagar|fazer\s+o\s+pagamento)\s+/i, "").trim();
    return `Pagamento de ${obj ? obj.charAt(0).toUpperCase() + obj.slice(1) : "Fatura"}`;
  }

  // 6. Natural Language Objective Cleaning
  let title = clean;
  const firstClauseMatch = clean.match(
    /^([^.,;]+?)(?:,\s*(?:pois|porque|já\s+que|para\s+que|onde|afim\s+de|seria|resumindo)|[.;]|\n)/i
  );
  if (firstClauseMatch) {
    title = firstClauseMatch[1].trim();
  }

  // Strip conversational leading words
  title = title
    .replace(/^(?:no|na|em|para|por\s+favor|favor|preciso\s+que|solicito|gostaria\s+de|inserir|fazer|ajustar)\s+/i, "")
    .replace(/a forma que eles registram/i, "o registro de")
    .replace(/a forma como registram/i, "o registro de")
    .replace(/a forma de registrar/i, "o registro de")
    .replace(/como eles cadastram/i, "o cadastro de")
    .trim();

  title = title.charAt(0).toUpperCase() + title.slice(1);

  if (title.length > 65) {
    const spaceIdx = title.lastIndexOf(" ", 62);
    title = (spaceIdx > 30 ? title.substring(0, spaceIdx) : title.substring(0, 62)).trim() + "...";
  }

  return title;
}

/**
 * Autonomous NLP Structured Description Synthesizer:
 * Transforms raw message dumps into structured enterprise-grade Markdown with objectives and context.
 */
export function synthesizeStructuredDescription(
  rawInput: string,
  title: string,
  category: TaskCategory
): string {
  const clean = rawInput.trim();
  if (!clean) return "";
  const lower = clean.toLowerCase();

  // 1. Synthesize clear objective & requirements
  let executiveSummary = "";
  const requirements: string[] = [];

  const isPowerBi = lower.includes("power bi") || lower.includes("dashboard") || lower.includes("dax");
  const isTotvs = lower.includes("totvs") || lower.includes(" rm") || lower.includes("protheus");
  const isLeadTime = lower.includes("lead time") || (lower.includes("tempo") && (lower.includes("emiss") || lower.includes("saida") || lower.includes("fatur")));
  const isMediaNf = (lower.includes("média") || lower.includes("media")) && (lower.includes("nf") || lower.includes("nota"));

  if (isPowerBi && (isLeadTime || isMediaNf)) {
    executiveSummary = "Atualização do painel analítico de Suprimentos no Power BI para inclusão do indicador de Lead Time de faturamento e ajuste na periodicidade de apuração da média de emissão de Notas Fiscais.";
    if (isLeadTime) {
      requirements.push("Cálculo de Lead Time: Criar indicador mensurando o intervalo entre a Data de Emissão e a Data de Saída / Faturamento da Nota Fiscal (`Lead Time = Data Saída − Data Emissão`).");
    }
    if (lower.includes("1207") || lower.includes("1215") || isTotvs) {
      requirements.push("Mapeamento no TOTVS RM: Extrair e cruzar as informações com base nas consultas/relatórios 1207 e 1215 do TOTVS RM.");
    }
    if (isMediaNf) {
      requirements.push("Ajuste na Medida de Média de NFs: Alterar a granularidade da medida DAX atual de média de Notas Fiscais, migrando da visão mensal (NFs/Mês) para visão diária (NFs/Dia).");
    }
  } else if (isTotvs && (lower.includes("patch") || lower.includes("release"))) {
    executiveSummary = "Aplicação e homologação técnica de pacote de atualização (patch) no ambiente do TOTVS RM, visando estabilidade e conformidade das rotinas.";
    requirements.push("Efetuar backup preventivo da base e validar dependências do pacote de atualização.");
    requirements.push("Aplicar o pacote em ambiente de homologação e executar bateria de testes regressivos nas rotinas integradas.");
  } else if (isTotvs && (lower.includes("1207") || lower.includes("1215") || lower.includes("relat"))) {
    executiveSummary = "Parametrização e ajuste em relatório operacional do TOTVS RM para correção de regras de negócio e integridade de dados.";
    requirements.push("Inspecionar os parâmetros da consulta e filtros aplicados no gerador de relatórios do TOTVS RM.");
    requirements.push("Validar consistência dos dados gerados com as tabelas do banco de dados.");
  } else {
    let primary = clean.split(/[.?!;\n]/)[0].trim();
    primary = primary
      .replace(/^(?:no|na|em|para|por\s+favor|favor|preciso\s+que|solicito)\s+/i, "")
      .replace(/,\s*(?:seria|resumindo|algo\s+assim).*$/i, "")
      .trim();
    executiveSummary = `${primary.charAt(0).toUpperCase() + primary.slice(1)}.`;
    requirements.push(`Executar as especificações técnicas da demanda: ${clean.replace(/[\n\r]+/g, " ").slice(0, 150)}`);
  }

  // 2. Identify Systems & Data Sources
  const systems: string[] = [];
  if (lower.includes("power bi") || lower.includes("dashboard")) systems.push("Power BI (Painel e Modelo Semântico)");
  if (lower.includes("totvs") || lower.includes(" rm")) {
    if (lower.includes("1207") || lower.includes("1215")) {
      systems.push("TOTVS RM (Consultas/Relatórios 1207 e 1215)");
    } else {
      systems.push("TOTVS RM (ERP Corporativo)");
    }
  }
  if (lower.includes("sql") || lower.includes("banco")) systems.push("Banco de Dados Relacional");
  if (lower.includes("excel") || lower.includes("planilha")) systems.push("Planilhas / Excel");
  if (lower.includes("classapp")) systems.push("ClassApp");

  // 3. Identify Sectors & Departments
  const depts: string[] = [];
  if (lower.includes("suprimento") || lower.includes("compras")) depts.push("Suprimentos, Compras e Expedição");
  if (lower.includes("fatur") || lower.includes("nf") || lower.includes("saida") || lower.includes("saída")) {
    if (!depts.includes("Suprimentos, Compras e Expedição")) depts.push("Faturamento & Expedição");
  }
  if (lower.includes("tesouraria") || lower.includes("financeir")) depts.push("Financeiro & Tesouraria");
  if (lower.includes("secretaria")) depts.push("Secretaria Acadêmica");
  if (/\brh\b/.test(lower) || lower.includes("recursos humanos")) depts.push("Recursos Humanos (RH)");
  if (depts.length === 0) depts.push("TI & Suporte Técnico");

  let desc = `📋 Resumo Executivo:\n${executiveSummary}\n\n`;
  desc += `---\n\n`;
  desc += `🎯 Requisitos & Regras de Negócio:\n`;
  requirements.forEach((req, idx) => {
    desc += `${idx + 1}. ${req}\n`;
  });
  desc += `\n---\n\n`;
  desc += `🔗 Sistemas & Fontes Envolvidas:\n`;
  if (systems.length > 0) desc += `• Sistemas & Ferramentas: ${systems.join(", ")}\n`;
  desc += `• Setores Impactados: ${depts.join(", ")}\n`;

  return desc;
}

/**
 * Autonomous Context-Tailored Validation Steps Synthesizer:
 * Suggests actionable, sequential execution checkpoints based on detected systems and domain keywords.
 */
export function synthesizeValidationSteps(rawInput: string, title: string): string[] {
  const t = rawInput.toLowerCase();
  const steps: string[] = [];

  // 1. Power BI / Analytics / Reports
  if (t.includes("power bi") || t.includes("dashboard") || t.includes("dax") || t.includes("lead time")) {
    if (t.includes("totvs") || t.includes("1207") || t.includes("1215")) {
      steps.push("Mapear os campos de data de emissão e data de saída nas consultas 1207 e 1215 do TOTVS RM.");
    } else {
      steps.push("Mapear as fontes de dados e tabelas necessárias no modelo relacional do Power BI.");
    }
    steps.push("Criar e calibrar as medidas DAX necessárias (Lead Time médio e métricas operacionais).");
    if (t.includes("média") || t.includes("media") || t.includes("dia")) {
      steps.push("Ajustar a fórmula da média de NFs para apuração em granularidade diária.");
    }
    steps.push("Confrontar amostragem dos dados do Power BI com os registros do ERP para validar consistência.");
    const solicitante = t.includes("suprimento") ? "Suprimentos" : t.includes("fatur") ? "Faturamento" : "solicitante";
    steps.push(`Homologar o painel atualizado com a equipe de ${solicitante} e publicar no workspace.`);
    return steps;
  }

  // 2. TOTVS RM (ERP Geral / Relatórios / Fiscal)
  if (t.includes("totvs") || t.includes(" rm") || t.includes("patch") || t.includes("protheus")) {
    if (t.includes("patch") || t.includes("release")) {
      steps.push("1. Baixar o pacote de atualização e verificar documentação de notas de release.");
      steps.push("2. Aplicar o patch no ambiente de homologação e validar a integridade dos serviços.");
      steps.push("3. Executar testes regressivos nas principais rotinas impactadas.");
      steps.push("4. Agendar a aplicação em produção e notificar a equipe.");
    } else {
      steps.push("1. Inspecionar as regras de negócio, tabelas e parâmetros da rotina no TOTVS RM.");
      steps.push("2. Aplicar os ajustes ou configurações necessárias em ambiente de homologação.");
      steps.push("3. Executar testes de validação dos processos e relatórios impactados.");
      steps.push("4. Confirmar o funcionamento correto com o usuário solicitante e documentar na Wiki.");
    }
    return steps;
  }

  // 3. Recursos Humanos / DP
  if (/\brh\b/.test(t) || t.includes("recursos humanos") || t.includes("folha") || t.includes("colaborador")) {
    steps.push("1. Alinhar com o setor de Recursos Humanos os requisitos e critérios da demanda.");
    steps.push("2. Parametrizar e validar os registros no módulo de RH do sistema.");
    steps.push("3. Realizar testes de consistência em ambiente de testes.");
    steps.push("4. Confirmar homologação com a equipe de RH.");
    return steps;
  }

  // 4. Finanças & Tesouraria
  if (t.includes("pagar") || t.includes("comprar") || t.includes("financeir") || t.includes("tesouraria") || t.includes("boleto")) {
    steps.push("1. Conferir os valores, comprovantes fiscais e datas de vencimento.");
    steps.push("2. Obter autorização da coordenação / diretoria responsável.");
    steps.push("3. Executar o pagamento / lançamento e realizar a conciliação bancária.");
    steps.push("4. Arquivar o comprovante e notificar os envolvidos.");
    return steps;
  }

  // 5. Demanda Geral
  steps.push("1. Analisar o escopo detalhado e dependências da demanda.");
  steps.push("2. Executar as ações e configurações necessárias no ambiente.");
  steps.push("3. Realizar testes de homologação e validação técnica.");
  steps.push("4. Confirmar a conclusão e alinhar com o solicitante.");

  return steps;
}

/**
 * Intelligent fallback triage for manual user input.
 */
function fallbackTriage(rawInput: string): GeminiTriageResponse {
  const heuristic = classifyTaskHeuristic(rawInput);
  const detectedDueDate = extractDeadlinesHeuristic(rawInput);

  const title = synthesizeRefinedTitle(rawInput);
  const description = synthesizeStructuredDescription(rawInput, title, heuristic.category);
  const validationSteps = synthesizeValidationSteps(rawInput, title);

  return {
    refined_title: title,
    structured_description: description,
    validation_steps: validationSteps,
    account_type: heuristic.account_type,
    item_type: heuristic.item_type,
    category: heuristic.category,
    priority: heuristic.priority,
    extracted_due_date_iso: detectedDueDate,
    search_tags: heuristic.tags,
    learning_queries: heuristic.learning_queries,
  };
}

/**
 * Triages free-text input using Gemini with schema enforcement,
 * falling back gracefully to heuristic classification if key has no quota.
 */
export async function triageInputWithGemini(
  rawInput: string,
  apiKey?: string
): Promise<GeminiTriageResponse> {
  const cleanInput = (rawInput || "").trim();
  if (!cleanInput) {
    return fallbackTriage("");
  }

  // 1. Check persistent AI Cache (0 TOKENS)
  const cached = await aiCache.getAsync<GeminiTriageResponse>(cleanInput);
  if (cached) {
    return cached.data;
  }

  // 2. Ultra-fast Zero-Token Path for simple phrases (0 TOKENS)
  // For short or direct commands (<= 7 words, e.g. "Reunião amanhã às 14h", "Pagar fatura até dia 15", "Comprar café"),
  // the heuristic handles it with high fidelity and zero token cost!
  const words = cleanInput.split(/\s+/).filter(Boolean);
  if (words.length <= 7 && !cleanInput.includes("\n") && cleanInput.length <= 70) {
    const fastResult = fallbackTriage(cleanInput);
    aiCache.set(cleanInput, fastResult, 0);
    return fastResult;
  }

  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key || key === "sua_chave_da_gemini_api") {
    const fallback = fallbackTriage(cleanInput);
    aiCache.set(cleanInput, fallback, 0);
    return fallback;
  }

  try {
    const now = new Date();
    const promptWithContext = `Data e hora atual de referência: ${now.toISOString()} (${now.toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}).

Analise o texto a seguir, crie um título profissional, estruture a descrição, extraia o prazo exato se mencionado (ou null se nenhum prazo foi informado), e gere etapas de validação para a finalização da demanda:

"${cleanInput}"`;

    const ai = new GoogleGenAI({ apiKey: key });
    let text: string | null = null;
    const candidateModels = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptWithContext,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.2,
            maxOutputTokens: 850,
          },
        });
        const respText = typeof response.text === "function" ? (response.text as any)() : response.text;
        if (respText && respText.trim().startsWith("{")) {
          text = respText;
          break;
        }
      } catch (modelErr) {
        console.warn(`Model ${modelName} call failed, trying next candidate:`, modelErr);
      }
    }
    if (!text) {
      const fallback = fallbackTriage(cleanInput);
      aiCache.set(cleanInput, fallback, 0);
      return fallback;
    }

    const parsed = JSON.parse(text) as GeminiTriageResponse;
    if (!parsed.item_type) {
      parsed.item_type = fallbackTriage(cleanInput).item_type;
    }
    if (!parsed.category) {
      parsed.category = fallbackTriage(cleanInput).category;
    }
    if (!parsed.validation_steps || parsed.validation_steps.length === 0) {
      parsed.validation_steps = fallbackTriage(cleanInput).validation_steps;
    }
    if (!parsed.extracted_due_date_iso) {
      parsed.extracted_due_date_iso = extractDeadlinesHeuristic(cleanInput);
    }

    aiCache.set(cleanInput, parsed, 420);
    return parsed;
  } catch (error) {
    console.warn("Gemini API call failed, using autonomous heuristic classifier:", error);
    const fallback = fallbackTriage(cleanInput);
    aiCache.set(cleanInput, fallback, 0);
    return fallback;
  }
}

/**
 * Autonomously categorizes and tags any task with AI.
 * Uses a 3-layer hybrid architecture: Heuristic (0 tokens) -> Cache (0 tokens) -> Micro-prompt (~80 tokens).
 */
export async function categorizeTaskWithAI(
  title: string,
  notes: string = "",
  accountTypeHint?: AccountType,
  apiKey?: string
): Promise<{
  category: TaskCategory;
  tags: string[];
  priority: Priority;
  item_type: ItemType;
  learning_queries: string[];
}> {
  const cleanTitle = (title || "").trim();
  const cleanNotes = (notes || "").trim();

  // 1. FAST PATH (0 TOKENS): High-Precision Domain Heuristic
  const heuristic = classifyTaskHeuristic(cleanTitle, cleanNotes, accountTypeHint);
  const isGeneric =
    heuristic.category === "Operações & Geral" ||
    heuristic.category === "Suporte & Demandas" ||
    heuristic.category === "Vida Pessoal";

  // If heuristic recognized a specific domain (TOTVS, RH, Financeiro, Biblioteca, Secretaria, etc.),
  // return immediately with ZERO token cost!
  if (!isGeneric && heuristic.tags.length > 0) {
    return {
      category: heuristic.category,
      tags: heuristic.tags,
      priority: heuristic.priority,
      item_type: heuristic.item_type,
      learning_queries: heuristic.learning_queries,
    };
  }

  // 2. CACHE PATH (0 TOKENS): Check Persistent AI Cache
  const cacheKey = `cat:${cleanTitle}:${cleanNotes.slice(0, 40)}:${accountTypeHint || ""}`;
  const cached = await aiCache.getAsync<any>(cacheKey);
  if (cached) {
    return cached.data;
  }

  // 3. SHORT OR TRIVIAL TITLES (0 TOKENS): Skip LLM calls
  if (cleanTitle.length <= 4 || /^(ok|teste|tarefa|item|\d+)$/i.test(cleanTitle)) {
    const trivialResult = {
      category: heuristic.category,
      tags: heuristic.tags.length > 0 ? heuristic.tags : ["Geral"],
      priority: heuristic.priority,
      item_type: heuristic.item_type,
      learning_queries: heuristic.learning_queries,
    };
    aiCache.set(cacheKey, trivialResult, 0);
    return trivialResult;
  }

  // 4. MICRO-PROMPT LLM PATH (~80 TOKENS vs ~1500 tokens):
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (key && key !== "sua_chave_da_gemini_api" && key.length > 10) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const prompt = `Título: ${cleanTitle}\nNotas: ${cleanNotes.slice(0, 100)}\nContexto: ${accountTypeHint || "work"}`;

      let text: string | null = null;
      for (const m of ["gemini-1.5-flash", "gemini-2.0-flash"]) {
        try {
          const response = await ai.models.generateContent({
            model: m,
            contents: prompt,
            config: {
              systemInstruction: MICRO_CATEGORIZATION_PROMPT,
              responseMimeType: "application/json",
              responseSchema: MICRO_CATEGORIZATION_SCHEMA,
              temperature: 0.1,
              maxOutputTokens: 90,
            },
          });
          const respText = typeof response.text === "function" ? (response.text as any)() : response.text;
          if (respText) {
            text = respText;
            break;
          }
        } catch {
          // Try next model
        }
      }
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.category) {
          const result = {
            category: parsed.category,
            tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : heuristic.tags,
            priority: (parsed.priority as Priority) || heuristic.priority,
            item_type: (parsed.item_type as ItemType) || heuristic.item_type,
            learning_queries: [
              `${parsed.category} tutorial`,
              `Como organizar ${cleanTitle.slice(0, 30)}`,
            ],
          };
          aiCache.set(cacheKey, result, 75);
          return result;
        }
      }
    } catch {
      // Fallback seamlessly to heuristic
    }
  }

  // 5. Fallback Heuristic
  const fallbackResult = {
    category: heuristic.category,
    tags: heuristic.tags.length > 0 ? heuristic.tags : ["Geral"],
    priority: heuristic.priority,
    item_type: heuristic.item_type,
    learning_queries: heuristic.learning_queries,
  };
  aiCache.set(cacheKey, fallbackResult, 0);
  return fallbackResult;
}

export async function generateExecutiveSummary(
  tasks: any[],
  periodLabel: string,
  accountType: AccountType,
  apiKey?: string
): Promise<string> {
  const completed = tasks.filter((t) => t.status === "COMPLETED");
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "WAITING");

  const fallbackSummary = `### Síntese Executiva de Atividades — ${periodLabel}
**Contexto:** ${accountType === "work" ? "Operações Profissionais & Projetos (Trabalho)" : "Gestão Pessoal & Estudos"}

#### 1. Visão Geral das Entregas
No período analisado (${periodLabel}), foram registradas e gerenciadas **${tasks.length} atividades**, das quais **${completed.length} foram concluídas com sucesso**. O fluxo de trabalho manteve estabilidade e alta taxa de resolução.

#### 2. Destaques Operacionais
- **Atividades Ativas / Em Andamento:** ${inProgress.length} demandas em acompanhamento contínuo.
- **Categorias mais recorrentes:** ${Array.from(new Set(tasks.map((t) => t.category))).slice(0, 4).join(", ") || "Geral"}.
- **Autonomia & Organização:** Sistema indexado dinamicamente com categorização automática e busca indexada de resolução.

*Relatório consolidado pelo MontLife Intelligence.*`;

  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key || key === "sua_chave_da_gemini_api") {
    return fallbackSummary;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const prompt = `Gere uma síntese executiva em Markdown para o período "${periodLabel}" no contexto "${accountType}".
Total de demandas: ${tasks.length}
Concluídas: ${completed.length}
Em andamento: ${inProgress.length}
Categorias presentes: ${Array.from(new Set(tasks.map((t) => t.category))).join(", ")}
Títulos de exemplo: ${tasks.slice(0, 10).map((t) => t.title).join("; ")}
Use tom executivo, claro e objetivo.`;

    let text: string | null = null;
    for (const m of ["gemini-1.5-flash", "gemini-2.0-flash"]) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: prompt,
          config: {
            temperature: 0.3,
          },
        });
        const respText = typeof response.text === "function" ? (response.text as any)() : response.text;
        if (respText) {
          text = respText;
          break;
        }
      } catch {
        // Try next candidate
      }
    }
    return text || fallbackSummary;
  } catch (err) {
    console.warn("Failed to generate executive summary with Gemini:", err);
    return fallbackSummary;
  }
}
