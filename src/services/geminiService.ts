import { GoogleGenAI, Type } from "@google/genai";
import {
  GeminiTriageResponse,
  TaskCategory,
  Priority,
  AccountType,
  ItemType,
  NoteCategory,
  NoteChecklistItem,
  NoteOrganizeMode,
  ExtractedNoteTaskDraft,
  TaskAiAssistResponse,
  DailyBriefingResponse,
  Task,
  SimilarResolution,
} from "@/types";
import { aiCache } from "@/lib/aiCache";
import { normalizeCategory, STANDARD_CATEGORIES } from "@/lib/categories";

const SYSTEM_PROMPT = `Você é o assistente executivo e arquiteto de demandas sênior do MontLife.
Sua missão é REESCREVER e ESTRUTURAR qualquer entrada em linguagem natural (áudios transcritos, mensagens informais de WhatsApp/Teams, rascunhos confusos ou relatos longos) em uma demanda objetiva, direta ao ponto, com título apropriado e sub-tarefas práticas de execução.

REGRAS CRÍTICAS DE TRANSFORMAÇÃO (OBRIGATÓRIO):
- NUNCA copie, repita ou apenas corrija vírgulas do texto original mantendo a mesma redação coloquial do usuário.
- Você DEVE reescrever ativamente a mensagem para deixá-la MAIS OBJETIVA, CLARA, DIRETA e PROFISSIONAL do que o rascunho original.
- Elimine saudações, rodeios, hesitações, repetições e expressões informais (ex: "gostaria de", "preciso que", "seria algo assim", "resumindo", "tipo", "me ajuda", "ver esse negócio", "a forma que eles fazem").
- Mantenha 100% dos dados técnicos reais mencionados (nomes de sistemas, códigos de relatórios como 1207/1215, tabelas, regras de cálculo, métricas, áreas ou pessoas envolvidas).

1. TÍTULO APROPRIADO, CLARO & ACIONÁVEL ('refined_title'):
   - Crie um título conciso, específico e orientado ao entregável final (máximo 70 caracteres).
   - Comece sempre com verbo no infinitivo ou substantivo técnico direto (ex: "Implementar", "Corrigir", "Parametrizar", "Atualizar", "Revisar", "Configurar", "Pagar", "Solicitar").
   - Nunca reutilize aberturas informais do prompt original (jamais comece com "No power bi inserir...", "Preciso atualizar...", "Ver erro de...").
   - Exemplos:
     • Entrada: "No power bi de suprimentos inserir atualização do Tempo (Lead Time), seria data emissão x data de saida, tem no totvs no 1207 e no 1215 resumindo... média de NFs de mês para dia"
       -> Título: "Implementar Lead Time e Média Diária de NFs no Power BI de Suprimentos"
     • Entrada: "Ajustar o relatório 1207 do totvs que tá travando quando puxa saída"
       -> Título: "Otimizar Desempenho e Parâmetros do Relatório 1207 no TOTVS RM"

2. DESCRIÇÃO OBJETIVA, DIRETA E EM TEXTO CORRIDO ('structured_description'):
   - Reescreva a solicitação do zero em 1 parágrafo objetivo e direto (ou no máximo 2 parágrafos curtos caso envolva frentes distintas), sempre em TEXTO CORRIDO fluido.
   - Vá direto ao que precisa ser feito, com qual sistema/regra, por quê e para quem validar — sem redundâncias e sem frases vagas.
   - Garanta ortografia, pontuação e concordância perfeitas em português corporativo claro.
   - É ESTRITAMENTE PROIBIDO usar:
     • Marcadores ou listas com '-', '*', '•' ou números ('1.', '2.').
     • Linhas divisórias ('---'), markdown em negrito ('**'), cabeçalhos ou emojis decorativos.
   - Exemplo de reescrita objetiva:
     "Atualizar o painel de Suprimentos no Power BI para incluir o indicador de Lead Time de faturamento (intervalo entre data de emissão e data de saída das notas fiscais) e alterar a medida de média de NFs de mensal para diária. Os dados e regras devem ser conciliados com as consultas 1207 e 1215 do TOTVS RM e validados com Suprimentos e Faturamento."

3. TAREFAS PRÁTICAS PARA CONCLUIR A DEMANDA ('validation_steps'):
   - Gere de 3 a 5 tarefas objetivas, sequenciais e específicas para este caso real, guiando o usuário desde o diagnóstico/levantamento até a validação final e entrega.
   - Mencione os sistemas, códigos, telas ou validações citados pelo usuário em vez de frases genéricas vazias.
   - Escreva cada item SEM numeração no início (NÃO coloque "1. ", "2. " nem "-" no texto da etapa).

4. CONTEXTO & CLASSIFICAÇÃO:
   - 'account_type': 'work' (TOTVS, Power BI, relatórios, TI, rotinas corporativas/escolares) ou 'personal' (saúde, casa, compras, finanças pessoais).
   - 'item_type': 'task' (demanda operacional/técnica), 'activity' (reunião, treinamento, atendimento agendado, compromisso ou evento com pessoas) ou 'reminder' (lembrete pontual).
   - 'extracted_due_date_iso': Data/hora ISO 8601 de início (ou prazo) se mencionada pelo usuário, ou null.
   - 'extracted_end_date_iso': Se o usuário mencionar horário de término (ex: "das 14h às 16h", "de 9h até 10:30") ou duração (ex: "reunião de 1h às 15h"), retorne a data/hora ISO 8601 do término; caso contrário null.
   - 'category': Escolha OBRIGATORIAMENTE uma destas categorias oficiais do MontLife:
     • 'Sistemas ERP' | 'BI & Analytics' | 'Finanças & Tesouraria' | 'Recursos Humanos & DP' | 'Secretaria & Acadêmico' | 'Infraestrutura & TI' | 'Comunicação & Avisos' | 'Gestão & Contratos' | 'Automações & Scripts' | 'Vida Pessoal & Casa' | 'Saúde & Bem-estar' | 'Estudos & Carreira' | 'Operações & Demandas'
   - 'priority': 'P1' (crítica/parado), 'P2' (alta), 'P3' (média/padrão), 'P4' (baixa/planejada).
   - 'search_tags': 3 a 5 tags técnicas limpas e curtas.
   - 'learning_queries': 2 termos de busca objetivos para documentação ou tutoriais relacionados.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    refined_title: {
      type: Type.STRING,
      description: "Título claro, profissional e acionável para a tarefa.",
    },
    structured_description: {
      type: Type.STRING,
      description: "Mensagem simples, concisa e melhorada ortograficamente em texto corrido (prosa fluida contínua sem tópicos, hífens ou listas), trazendo todos os pontos solicitados.",
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
      description: "Categoria padronizada do MontLife ('Sistemas ERP', 'BI & Analytics', 'Finanças & Tesouraria', 'Recursos Humanos & DP', 'Secretaria & Acadêmico', 'Infraestrutura & TI', 'Comunicação & Avisos', 'Gestão & Contratos', 'Automações & Scripts', 'Vida Pessoal & Casa', 'Saúde & Bem-estar', 'Estudos & Carreira', 'Operações & Demandas').",
    },
    priority: {
      type: Type.STRING,
      enum: ["P1", "P2", "P3", "P4"],
      description: "P1: Urgente, P2: Alta, P3: Média, P4: Baixa.",
    },
    extracted_due_date_iso: {
      type: Type.STRING,
      nullable: true,
      description: "Data/hora ISO 8601 de início ou prazo específico mencionado, ou null.",
    },
    extracted_end_date_iso: {
      type: Type.STRING,
      nullable: true,
      description: "Data/hora ISO 8601 de término de reunião/treinamento/agendamento quando informada (ou calculada por duração citada), ou null.",
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
1. category: Escolha ESTRITAMENTE uma destas categorias padronizadas do MontLife: 'Sistemas ERP', 'BI & Analytics', 'Finanças & Tesouraria', 'Recursos Humanos & DP', 'Secretaria & Acadêmico', 'Infraestrutura & TI', 'Comunicação & Avisos', 'Gestão & Contratos', 'Automações & Scripts', 'Vida Pessoal & Casa', 'Saúde & Bem-estar', 'Estudos & Carreira', ou 'Operações & Demandas'.
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
    text.includes("treinament") ||
    text.includes("capacit") ||
    text.includes("encontro") ||
    text.includes("aula") ||
    text.includes("treino") ||
    text.includes("consulta") ||
    text.includes("alinhamento") ||
    text.includes("entrevista") ||
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

  const cleanCategory = normalizeCategory(category);
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
 * Intelligent heuristic to extract start/due date and optional end date from Portuguese text
 * e.g., "amanhã das 14h às 16h", "dia 20/11 de 09:30 até 11:00", "hoje às 15h"
 */
export function extractScheduleRangeHeuristic(text: string): {
  startIso: string | null;
  endIso: string | null;
} {
  const lower = text.toLowerCase();
  const now = new Date();

  const applyTime = (base: Date, hourStr: string, minStr?: string) => {
    const d = new Date(base);
    const h = Math.min(23, Math.max(0, parseInt(hourStr, 10) || 0));
    const m = minStr ? Math.min(59, Math.max(0, parseInt(minStr, 10) || 0)) : 0;
    d.setHours(h, m, 0, 0);
    return d;
  };

  // Determine base calendar day first
  let baseDay: Date | null = null;
  let hasExplicitDay = false;

  if (lower.includes("hoje")) {
    baseDay = new Date(now);
    hasExplicitDay = true;
  } else if (lower.includes("amanhã") || lower.includes("amanha")) {
    baseDay = new Date(now);
    baseDay.setDate(baseDay.getDate() + 1);
    hasExplicitDay = true;
  } else {
    const dateMatch = lower.match(/(?:dia|até|ate|em|para)?\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1;
      const rawYear = dateMatch[3] ? parseInt(dateMatch[3], 10) : now.getFullYear();
      const year = rawYear < 100 ? 2000 + rawYear : rawYear;
      baseDay = new Date(year, month, day, 18, 0, 0, 0);
      hasExplicitDay = true;
    } else {
      const weekdays = [
        { name: "domingo", day: 0 },
        { name: "segunda", day: 1 },
        { name: "terça", day: 2 },
        { name: "terca", day: 2 },
        { name: "quarta", day: 3 },
        { name: "quinta", day: 4 },
        { name: "sexta", day: 5 },
        { name: "sábado", day: 6 },
        { name: "sabado", day: 6 },
      ];
      for (const wd of weekdays) {
        if (lower.includes(wd.name)) {
          const target = new Date(now);
          const currentDay = target.getDay();
          let diff = wd.day - currentDay;
          if (diff <= 0) diff += 7;
          target.setDate(target.getDate() + diff);
          target.setHours(18, 0, 0, 0);
          baseDay = target;
          hasExplicitDay = true;
          break;
        }
      }
    }
  }

  // Time range patterns: "das 14h às 16h", "de 14:30 a 16:00", "14h até 15h30", "14:00 - 15:00"
  const rangeMatch = lower.match(
    /(?:das?|de)?\s*(\d{1,2})(?:[:h](\d{2})|h)?\s*(?:às|as|até|ate|a|-)\s*(\d{1,2})(?:[:h](\d{2})|h)/i
  );
  if (rangeMatch) {
    const refDay = baseDay || new Date(now);
    const start = applyTime(refDay, rangeMatch[1], rangeMatch[2]);
    const end = applyTime(refDay, rangeMatch[3], rangeMatch[4]);
    if (end.getTime() <= start.getTime()) {
      end.setDate(end.getDate() + 1);
    }
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  }

  // "em X horas" ou "daqui a X horas"
  const inHoursMatch = lower.match(/(?:em|daqui\s+a)\s+(\d+)\s+hora/);
  if (inHoursMatch) {
    const hours = parseInt(inHoursMatch[1], 10);
    const target = new Date(now.getTime() + hours * 3600 * 1000);
    return { startIso: target.toISOString(), endIso: null };
  }

  // Single time mention e.g. "às 14h30", "as 15:00", "14h"
  const singleTimeMatch = lower.match(/(?:às|as)\s*(\d{1,2})(?:[:h](\d{2})|h)?/);
  if (singleTimeMatch) {
    const refDay = baseDay || new Date(now);
    const start = applyTime(refDay, singleTimeMatch[1], singleTimeMatch[2]);
    return { startIso: start.toISOString(), endIso: null };
  }

  if (hasExplicitDay && baseDay) {
    baseDay.setHours(18, 0, 0, 0);
    return { startIso: baseDay.toISOString(), endIso: null };
  }

  return { startIso: null, endIso: null };
}

export function extractDeadlinesHeuristic(text: string): string | null {
  return extractScheduleRangeHeuristic(text).startIso;
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
    const has1207 = lower.includes("1207");
    const has1215 = lower.includes("1215");
    const reportCode = has1207 && has1215 ? "1207 e 1215" : has1207 ? "1207" : has1215 ? "1215" : "";
    if (reportCode) {
      return `Otimizar e Parametrizar Relatório ${reportCode} no TOTVS RM`;
    }
    if (lower.includes("patch") || lower.includes("release")) {
      return "Aplicação e Homologação de Patch no TOTVS RM";
    }
    if (lower.includes("relat") || lower.includes("papeleta")) {
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

  // Strip conversational leading words (preserva verbos acionáveis)
  title = title
    .replace(/^(?:no|na|em|para|por\s+favor|favor|preciso\s+que|solicito|gostaria\s+de|seria\s+bom)\s+/i, "")
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
 * Converte qualquer texto, lista com marcadores ou bloco estruturado em texto corrido (prosa fluida contínua),
 * eliminando hífens, marcadores, numerações, divisores e cabeçalhos artificiais, preservando todos os pontos com clareza.
 */
export function cleanToContinuousProse(text: string): string {
  if (!text) return "";
  let clean = text.trim();

  // 1. Remove cabeçalhos artificiais e emojis
  clean = clean.replace(/📋\s*Resumo\s+Executivo:?/gi, "");
  clean = clean.replace(/🎯\s*Requisitos\s*(?:&|e)?\s*Regras\s+de\s+Negócio:?/gi, "");
  clean = clean.replace(/🔗\s*Sistemas\s*(?:&|e)?\s*Fontes\s+Envolvidas:?/gi, "");
  clean = clean.replace(/•\s*Sistemas\s*(?:&|e)?\s*Ferramentas:?/gi, "");
  clean = clean.replace(/•\s*Setores\s+Impactados:?/gi, "");
  clean = clean.replace(/^#+\s+/gm, "");
  clean = clean.replace(/---+/g, " ");

  // 2. Normaliza quebras de linha e remove marcadores de tópicos (- , * , • , 1. )
  const rawLines = clean.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const sentences: string[] = [];

  for (const line of rawLines) {
    let stripped = line.replace(/^(?:[-*•]|\d+\.|\([a-z0-9]+\)|[a-z]\))\s+/i, "").trim();
    // Transforma títulos de bullets em texto integrado (ex: "**Otimização:** texto" -> "Otimização: texto")
    stripped = stripped.replace(/^\*\*([^*]+)\*\*:\s*/i, "$1: ");
    stripped = stripped.replace(/\*\*/g, "");
    if (stripped) {
      if (!/[.!?:;]$/.test(stripped)) {
        stripped += ".";
      }
      sentences.push(stripped);
    }
  }

  const result = sentences.join(" ").replace(/\s{2,}/g, " ").trim();
  return result;
}

/**
 * Autonomous NLP Structured Description Synthesizer:
 * Transforma comandos em texto corrido simples, conciso e coeso, cobrindo todos os pontos com alto padrão corporativo.
 */
export function synthesizeStructuredDescription(
  rawInput: string,
  title: string,
  category: TaskCategory
): string {
  const clean = rawInput.trim();
  if (!clean) return "";
  const lower = clean.toLowerCase();

  const isPowerBi = lower.includes("power bi") || lower.includes("dashboard") || lower.includes("dax");
  const isTotvs = lower.includes("totvs") || lower.includes(" rm") || lower.includes("protheus");
  const isLeadTime = lower.includes("lead time") || (lower.includes("tempo") && (lower.includes("emiss") || lower.includes("saida") || lower.includes("fatur")));
  const isMediaNf = (lower.includes("média") || lower.includes("media")) && (lower.includes("nf") || lower.includes("nota"));

  if (isPowerBi && (isLeadTime || isMediaNf)) {
    const parts: string[] = [
      "Atualização do painel analítico de Suprimentos no Power BI com foco na implementação do indicador de Lead Time de faturamento, apurado pelo intervalo entre a data de emissão e a data de saída das notas fiscais."
    ];
    if (lower.includes("1207") || lower.includes("1215") || isTotvs) {
      parts.push("Os dados e regras devem ser conciliados com base nas consultas operacionais 1207 e 1215 do TOTVS RM.");
    }
    if (isMediaNf) {
      parts.push("A granularidade da medida de média de emissão de notas fiscais deve ser ajustada da periodicidade mensal para a apuração diária.");
    }
    parts.push("A homologação dos números será conduzida em alinhamento com os setores de Suprimentos e Faturamento.");
    return parts.join(" ");
  }

  if (isTotvs && (lower.includes("patch") || lower.includes("release"))) {
    return "Aplicação e homologação técnica de pacote de atualização no TOTVS RM, realizando backup preventivo da base de dados e executando bateria de testes regressivos nas rotinas integradas para assegurar a conformidade e estabilidade do ambiente corporativo.";
  }

  if (isTotvs && (lower.includes("1207") || lower.includes("1215") || lower.includes("relat"))) {
    const code = lower.includes("1207") ? "1207" : lower.includes("1215") ? "1215" : "";
    const reportPart = code ? `no relatório operacional ${code}` : "no relatório operacional";
    return `Parametrização e ajuste técnico ${reportPart} do TOTVS RM, revisando filtros, parâmetros de consulta e consistência dos dados gerados frente às tabelas do ERP para garantir a integridade das informações gerenciais.`;
  }

  // Fallback geral em texto corrido objetivo e direto
  const condensed = clean
    .replace(/^(?:oi|olá|ola|bom dia|boa tarde|boa noite|pessoal)[,!\s]+/i, "")
    .replace(/^(?:gostaria\s+(?:de\s+)?|preciso\s+(?:que\s+|de\s+)?|queria\s+(?:que\s+)?|solicito\s+(?:que\s+)?|seria\s+bom\s+(?:se\s+)?|por\s+favor[,]?\s*|favor\s+|tem\s+como\s+|pode(?:ria)?\s+)+/i, "")
    .replace(/\b(?:resumindo|algo\s+assim|tipo\s+assim|mais\s+ou\s+menos|na\s+verdade)\b[,:\s]*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const polished = cleanToContinuousProse(condensed || clean);
  if (!polished) return "";
  return polished.charAt(0).toUpperCase() + polished.slice(1);
}

function cleanStepPrefix(step: string): string {
  return (step || "")
    .replace(/^\s*(?:\d+[.)]\s*|[-*•]+\s*)+/, "")
    .trim();
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
      steps.push("Baixar o pacote de atualização e verificar documentação de notas de release.");
      steps.push("Aplicar o patch no ambiente de homologação e validar a integridade dos serviços.");
      steps.push("Executar testes regressivos nas principais rotinas impactadas.");
      steps.push("Agendar a aplicação em produção e notificar a equipe.");
    } else {
      steps.push("Inspecionar as regras de negócio, tabelas e parâmetros da rotina no TOTVS RM.");
      steps.push("Aplicar os ajustes ou configurações necessárias em ambiente de homologação.");
      steps.push("Executar testes de validação dos processos e relatórios impactados.");
      steps.push("Confirmar o funcionamento correto com o usuário solicitante e documentar na Wiki.");
    }
    return steps;
  }

  // 3. Recursos Humanos / DP
  if (/\brh\b/.test(t) || t.includes("recursos humanos") || t.includes("folha") || t.includes("colaborador")) {
    steps.push("Alinhar com o setor de Recursos Humanos os requisitos e critérios da demanda.");
    steps.push("Parametrizar e validar os registros no módulo de RH do sistema.");
    steps.push("Realizar testes de consistência em ambiente de testes.");
    steps.push("Confirmar homologação com a equipe de RH.");
    return steps;
  }

  // 4. Finanças & Tesouraria
  if (t.includes("pagar") || t.includes("comprar") || t.includes("financeir") || t.includes("tesouraria") || t.includes("boleto")) {
    steps.push("Conferir os valores, comprovantes fiscais e datas de vencimento.");
    steps.push("Obter autorização da coordenação ou área responsável.");
    steps.push("Executar o pagamento ou lançamento e realizar a conciliação.");
    steps.push("Arquivar o comprovante e notificar os envolvidos.");
    return steps;
  }

  // 5. Demanda Geral
  const focus = title && title.length <= 55 ? ` (${title})` : "";
  steps.push(`Levantar o escopo técnico, pré-requisitos e acessos necessários${focus}.`);
  steps.push("Executar os ajustes, configurações ou tratativas principais da solicitação.");
  steps.push("Realizar testes práticos para confirmar o resultado esperado.");
  steps.push("Validar a entrega com os envolvidos e encerrar a demanda.");

  return steps;
}

/**
 * Intelligent fallback triage for manual user input.
 */
function fallbackTriage(rawInput: string): GeminiTriageResponse {
  const heuristic = classifyTaskHeuristic(rawInput);
  const { startIso, endIso } = extractScheduleRangeHeuristic(rawInput);

  const title = synthesizeRefinedTitle(rawInput);
  const description = synthesizeStructuredDescription(rawInput, title, heuristic.category);
  const validationSteps = synthesizeValidationSteps(rawInput, title).map(cleanStepPrefix).filter(Boolean);

  return {
    refined_title: title,
    structured_description: description,
    validation_steps: validationSteps,
    account_type: heuristic.account_type,
    item_type: heuristic.item_type,
    category: heuristic.category,
    priority: heuristic.priority,
    extracted_due_date_iso: startIso,
    extracted_end_date_iso: endIso,
    search_tags: heuristic.tags,
    learning_queries: heuristic.learning_queries,
  };
}

// Active production Gemini model cascade (fastest production 2.5 & latest aliases first)
const PRIMARY_FLASH_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.5-pro",
];

const MODEL_CALL_TIMEOUT_MS = 15000;

function getSaoPauloDateString(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function isInvalidApiKeyError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err || "")).toLowerCase();
  const status = typeof (err as any)?.status === "number" ? (err as any).status : 0;
  return (
    status === 401 ||
    status === 403 ||
    msg.includes("api_key_invalid") ||
    msg.includes("api key not valid") ||
    msg.includes("permission_denied")
  );
}

async function callGenerateWithTimeout(
  ai: GoogleGenAI,
  modelName: string,
  contents: string,
  config: Record<string, any>
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`Timeout after ${MODEL_CALL_TIMEOUT_MS}ms on ${modelName}`)),
        MODEL_CALL_TIMEOUT_MS
      );
    });
    return await Promise.race([
      ai.models.generateContent({
        model: modelName,
        contents,
        config,
      }),
      timeoutPromise,
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

let cachedWorkingModel: string | null = null;
let cachedDiscoveredModels: { models: string[]; fetchedAt: number } | null = null;

async function discoverLiveFlashModels(ai: GoogleGenAI): Promise<string[]> {
  const now = Date.now();
  if (cachedDiscoveredModels && now - cachedDiscoveredModels.fetchedAt < 60 * 60 * 1000) {
    return cachedDiscoveredModels.models;
  }

  try {
    const pager = await ai.models.list({ config: { pageSize: 50 } });
    const rawModels = Array.isArray(pager?.page) ? pager.page : [];
    const textModels = rawModels
      .filter((m) => {
        const name = (m.name || "").toLowerCase();
        const supportsGenerate =
          !Array.isArray(m.supportedActions) ||
          m.supportedActions.includes("generateContent");
        return (
          supportsGenerate &&
          name.includes("gemini") &&
          !name.includes("embedding") &&
          !name.includes("image") &&
          !name.includes("audio") &&
          !name.includes("tts") &&
          !name.includes("veo") &&
          !name.includes("robotics") &&
          !name.includes("live") &&
          !name.includes("gemini-1.") &&
          !name.includes("gemini-2.0")
        );
      })
      .map((m) => (m.name || "").replace(/^models\//, ""))
      .filter(Boolean);

    // Prioritize flash models first, newest sorted descending
    const sorted = textModels.sort((a, b) => {
      const aFlash = a.includes("flash") ? 1 : 0;
      const bFlash = b.includes("flash") ? 1 : 0;
      if (aFlash !== bFlash) return bFlash - aFlash;
      return b.localeCompare(a);
    });

    const top = sorted.slice(0, 5);
    cachedDiscoveredModels = { models: top, fetchedAt: now };
    return top;
  } catch (err) {
    console.warn("Failed to dynamically list Gemini models:", err);
    return [];
  }
}

function extractRawText(response: any): string {
  if (!response) return "";
  const raw = typeof response.text === "function" ? response.text() : response.text;
  return typeof raw === "string" ? raw : "";
}

function extractJsonObject(raw: string): string | null {
  if (!raw) return null;
  let cleaned = raw.trim();
  // Strip optional markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
    return cleaned;
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }
  return null;
}

async function generateWithActiveGeminiModels(
  ai: GoogleGenAI,
  contents: string,
  config: Record<string, any>
): Promise<{ text: string; modelUsed: string } | null> {
  const orderedCandidates = Array.from(
    new Set([
      ...(cachedWorkingModel ? [cachedWorkingModel] : []),
      ...PRIMARY_FLASH_MODELS,
    ])
  );

  for (const modelName of orderedCandidates) {
    try {
      const response = await callGenerateWithTimeout(ai, modelName, contents, config);
      const respText = extractRawText(response).trim();
      if (respText) {
        cachedWorkingModel = modelName;
        return { text: respText, modelUsed: modelName };
      }
    } catch (modelErr: any) {
      if (cachedWorkingModel === modelName) {
        cachedWorkingModel = null;
      }
      if (isInvalidApiKeyError(modelErr)) {
        console.warn(`[Gemini] Invalid API key detected on ${modelName}; aborting cascade.`);
        return null;
      }
      const msg = modelErr?.message || String(modelErr);
      console.warn(`[Gemini] Model ${modelName} failed:`, msg.slice(0, 220));
    }
  }

  // Last-resort dynamic discovery in case project/region uses a different active alias
  const discovered = await discoverLiveFlashModels(ai);
  for (const modelName of discovered) {
    if (orderedCandidates.includes(modelName)) continue;
    try {
      const response = await callGenerateWithTimeout(ai, modelName, contents, config);
      const respText = extractRawText(response).trim();
      if (respText) {
        cachedWorkingModel = modelName;
        return { text: respText, modelUsed: modelName };
      }
    } catch (modelErr: any) {
      if (isInvalidApiKeyError(modelErr)) {
        return null;
      }
      const msg = modelErr?.message || String(modelErr);
      console.warn(`[Gemini] Discovered model ${modelName} failed:`, msg.slice(0, 220));
    }
  }

  return null;
}

export interface TriageExecutionResult {
  triage: GeminiTriageResponse;
  source: "gemini" | "cache" | "fallback";
  modelUsed?: string;
  errorReason?: string;
}

/**
 * Triages free-text input using Gemini with schema enforcement and full diagnostics.
 * Cache key is versioned (triage_v2:) and NEVER persists offline/error fallbacks.
 */
export async function triageInputWithGeminiDetailed(
  rawInput: string,
  apiKey?: string,
  options?: { forceFresh?: boolean }
): Promise<TriageExecutionResult> {
  const cleanInput = (rawInput || "").trim();
  if (!cleanInput || cleanInput.length < 3) {
    return {
      triage: fallbackTriage(cleanInput),
      source: "fallback",
      errorReason: cleanInput ? "Entrada muito curta para triagem por IA." : "Entrada vazia.",
    };
  }

  const hasRelativeTemporalRef =
    /(?:hoje|amanh[ãa]|ontem|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo|pr[óo]xim|semana|m[êe]s|daqui|agora)/i.test(
      cleanInput
    );
  const dateBucket = hasRelativeTemporalRef ? `${getSaoPauloDateString()}:` : "";
  const cacheKey = `triage_v4:${dateBucket}${cleanInput}`;

  // 1. Check persistent AI Cache (ONLY when not forcing fresh AI)
  if (!options?.forceFresh) {
    const cached = await aiCache.getAsync<GeminiTriageResponse>(cacheKey);
    if (cached && cached.tokensSaved > 0 && cached.data?.refined_title) {
      return {
        triage: cached.data,
        source: "cache",
      };
    }
  }

  const key = (apiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!key || key === "sua_chave_da_gemini_api") {
    return {
      triage: fallbackTriage(cleanInput),
      source: "fallback",
      errorReason: "Chave GEMINI_API_KEY não configurada no ambiente.",
    };
  }

  try {
    const now = new Date();
    const promptWithContext = `Data e hora atual de referência: ${now.toISOString()} (${now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", year: "numeric", month: "long", day: "numeric" })} às ${now.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}).
Fuso horário do usuário: America/Sao_Paulo (UTC-03:00). Sempre gere datas ISO coerentes com este fuso.

Reescreva e estruture a solicitação abaixo tornando o texto objetivo e direto (sem copiar a redação informal), crie um título apropriado começando com verbo de ação, extraia o prazo se houver e gere 3 a 5 sub-tarefas práticas específicas para ajudar o usuário a concluir esta demanda:

"""
${cleanInput}
"""`;

    const ai = new GoogleGenAI({ apiKey: key });
    const generation = await generateWithActiveGeminiModels(ai, promptWithContext, {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.25,
      maxOutputTokens: 2048,
    });

    if (!generation) {
      return {
        triage: fallbackTriage(cleanInput),
        source: "fallback",
        errorReason: "Nenhum modelo Gemini ativo respondeu à requisição.",
      };
    }

    const jsonStr = extractJsonObject(generation.text);
    if (!jsonStr) {
      return {
        triage: fallbackTriage(cleanInput),
        source: "fallback",
        modelUsed: generation.modelUsed,
        errorReason: "Resposta do modelo Gemini não retornou JSON válido.",
      };
    }

    const parsed = JSON.parse(jsonStr) as GeminiTriageResponse;
    const heuristicFallback = fallbackTriage(cleanInput);

    parsed.refined_title =
      (parsed.refined_title || "")
        .replace(/^\*\*|\*\*$/g, "")
        .replace(/\.+$/, "")
        .trim() || heuristicFallback.refined_title;

    if (parsed.structured_description) {
      parsed.structured_description = cleanToContinuousProse(parsed.structured_description);
    } else {
      parsed.structured_description = heuristicFallback.structured_description;
    }

    if (!parsed.item_type) {
      parsed.item_type = heuristicFallback.item_type;
    }

    parsed.category = normalizeCategory(parsed.category || heuristicFallback.category);

    const cleanedSteps = Array.isArray(parsed.validation_steps)
      ? parsed.validation_steps.map(cleanStepPrefix).filter(Boolean)
      : [];
    parsed.validation_steps =
      cleanedSteps.length > 0 ? cleanedSteps : heuristicFallback.validation_steps;

    const heuristicSchedule = extractScheduleRangeHeuristic(cleanInput);
    if (!parsed.extracted_due_date_iso) {
      parsed.extracted_due_date_iso = heuristicSchedule.startIso;
    }
    if (!parsed.extracted_end_date_iso && heuristicSchedule.endIso) {
      parsed.extracted_end_date_iso = heuristicSchedule.endIso;
    }

    if (!Array.isArray(parsed.search_tags) || parsed.search_tags.length === 0) {
      parsed.search_tags = heuristicFallback.search_tags;
    }

    if (!Array.isArray(parsed.learning_queries) || parsed.learning_queries.length === 0) {
      parsed.learning_queries = heuristicFallback.learning_queries;
    }

    // Cache ONLY genuine Gemini responses
    aiCache.set(cacheKey, parsed, 450);

    return {
      triage: parsed,
      source: "gemini",
      modelUsed: generation.modelUsed,
    };
  } catch (error: any) {
    console.warn("Gemini API call failed, using autonomous heuristic classifier:", error);
    return {
      triage: fallbackTriage(cleanInput),
      source: "fallback",
      errorReason: error?.message || "Erro na chamada à API do Gemini.",
    };
  }
}

/**
 * Triages free-text input using Gemini with schema enforcement,
 * falling back gracefully to heuristic classification if key has no quota.
 */
export async function triageInputWithGemini(
  rawInput: string,
  apiKey?: string,
  options?: { forceFresh?: boolean }
): Promise<GeminiTriageResponse> {
  const result = await triageInputWithGeminiDetailed(rawInput, apiKey, options);
  return result.triage;
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
  const cacheKey = `cat_v2:${cleanTitle}:${cleanNotes.slice(0, 40)}:${accountTypeHint || ""}`;
  const cached = await aiCache.getAsync<any>(cacheKey);
  if (cached && cached.tokensSaved > 0) {
    return cached.data;
  }

  // 3. SHORT OR TRIVIAL TITLES (0 TOKENS): Skip LLM calls
  if (cleanTitle.length <= 4 || /^(ok|teste|tarefa|item|\d+)$/i.test(cleanTitle)) {
    return {
      category: heuristic.category,
      tags: heuristic.tags.length > 0 ? heuristic.tags : ["Geral"],
      priority: heuristic.priority,
      item_type: heuristic.item_type,
      learning_queries: heuristic.learning_queries,
    };
  }

  // 4. MICRO-PROMPT LLM PATH
  const key = (apiKey || process.env.GEMINI_API_KEY || "").trim();
  if (key && key !== "sua_chave_da_gemini_api" && key.length > 10) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const prompt = `Título: ${cleanTitle}\nNotas: ${cleanNotes.slice(0, 120)}\nContexto: ${accountTypeHint || "work"}`;

      const generation = await generateWithActiveGeminiModels(ai, prompt, {
        systemInstruction: MICRO_CATEGORIZATION_PROMPT,
        responseMimeType: "application/json",
        responseSchema: MICRO_CATEGORIZATION_SCHEMA,
        temperature: 0.1,
        maxOutputTokens: 400,
      });

      const jsonStr = generation ? extractJsonObject(generation.text) : null;
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        if (parsed.category) {
          const result = {
            category: normalizeCategory(parsed.category),
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

  // 5. Fallback Heuristic (do not persist fallback into AI cache)
  return {
    category: heuristic.category,
    tags: heuristic.tags.length > 0 ? heuristic.tags : ["Geral"],
    priority: heuristic.priority,
    item_type: heuristic.item_type,
    learning_queries: heuristic.learning_queries,
  };
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

  const key = (apiKey || process.env.GEMINI_API_KEY || "").trim();
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

    const generation = await generateWithActiveGeminiModels(ai, prompt, {
      temperature: 0.3,
      maxOutputTokens: 1200,
    });

    return generation?.text || fallbackSummary;
  } catch (err) {
    console.warn("Failed to generate executive summary with Gemini:", err);
    return fallbackSummary;
  }
}

// ==========================================
// 2. NOTES AI ENGINE (ORGANIZE & EXTRACT TASKS)
// ==========================================

const ORGANIZE_NOTE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    refined_title: { type: Type.STRING },
    organized_content: { type: Type.STRING },
    ai_summary: { type: Type.STRING },
    key_decisions: { type: Type.ARRAY, items: { type: Type.STRING } },
    checklist_items: { type: Type.ARRAY, items: { type: Type.STRING } },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggested_category: {
      type: Type.STRING,
      enum: ["geral", "reuniao", "ideia", "checklist"],
    },
    demand_readiness: {
      type: Type.STRING,
      enum: ["pronta", "parcial", "referencia"],
    },
  },
  required: [
    "refined_title",
    "organized_content",
    "ai_summary",
    "key_decisions",
    "checklist_items",
    "tags",
    "suggested_category",
    "demand_readiness",
  ],
};

function buildNoteContextText(params: {
  title?: string;
  content?: string;
  checklist?: NoteChecklistItem[];
  category?: NoteCategory;
}): string {
  const parts: string[] = [];
  if (params.title?.trim()) parts.push(`Título atual: ${params.title.trim()}`);
  if (params.category && params.category !== "geral") {
    parts.push(`Escopo/Modo atual: ${params.category}`);
  }
  if (params.content?.trim()) parts.push(`Conteúdo:\n${params.content.trim()}`);
  if (params.checklist && params.checklist.length > 0) {
    const checklistLines = params.checklist
      .map((item) => `- [${item.checked ? "x" : " "}] ${item.text}`)
      .join("\n");
    parts.push(`Itens de checklist existentes:\n${checklistLines}`);
  }
  return parts.join("\n\n").trim();
}

function inferNoteCategoryHeuristic(text: string, current?: NoteCategory): NoteCategory {
  if (current && current !== "geral") return current;
  const lower = text.toLowerCase();
  if (/\b(reuni[aã]o|ata|pauta|alinhamento|participantes|combinado|call|meet)\b/.test(lower)) {
    return "reuniao";
  }
  if (/\b(ideia|sugest[aã]o|melhoria|brainstorm|proposta|poderia|seria legal)\b/.test(lower)) {
    return "ideia";
  }
  if (/\b(checklist|lista de verifica|passo a passo|itens pendentes)\b/.test(lower)) {
    return "checklist";
  }
  return "geral";
}

export async function organizeNoteWithAI(params: {
  title: string;
  content: string;
  checklist?: NoteChecklistItem[];
  category?: NoteCategory;
  mode?: NoteOrganizeMode;
  apiKey?: string;
}): Promise<{
  refined_title: string;
  organized_content: string;
  ai_summary: string;
  key_decisions: string[];
  checklist_items: string[];
  tags: string[];
  suggested_category: NoteCategory;
  demand_readiness: "pronta" | "parcial" | "referencia";
  ai_source: "gemini" | "cache" | "fallback";
}> {
  const mode: NoteOrganizeMode = params.mode || "auto";
  const contextText = buildNoteContextText(params);
  const rawLines = (params.content || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const fallbackResult = () => {
    const fallbackTitle =
      params.title?.trim() ||
      synthesizeRefinedTitle(rawLines[0] || params.content || "Anotação Rápida");
    const actionVerbs =
      /^(?:fazer|enviar|verificar|ajustar|implementar|cobrar|agendar|atualizar|revisar|criar|pagar|ligar|validar|confirmar|solicitar|responder|corrigir|configurar|montar)\b/i;
    const candidateActions = rawLines
      .map((l) => cleanStepPrefix(l))
      .filter((l) => l.length >= 6 && (actionVerbs.test(l) || rawLines.length <= 6))
      .slice(0, 6);
    const heuristic = classifyTaskHeuristic(fallbackTitle, params.content || "");
    const firstSummary = rawLines.slice(0, 2).join(" ").slice(0, 220);
    const suggestedCat = inferNoteCategoryHeuristic(`${fallbackTitle} ${params.content}`, params.category);

    let organizedText = rawLines.join("\n") || (params.content || "").trim();
    if (mode === "topics" && rawLines.length > 0) {
      organizedText = rawLines.map((l) => `• ${cleanStepPrefix(l)}`).join("\n");
    } else if (mode === "demand_scope") {
      organizedText = [
        `Objetivo:\n${fallbackTitle}`,
        `Contexto & Detalhes:\n${rawLines.join(" ") || params.content.trim()}`,
        candidateActions.length > 0
          ? `Próximos Passos / Critérios:\n${candidateActions.map((c) => `• ${c}`).join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    } else if (mode === "summary") {
      organizedText = firstSummary || organizedText;
    }

    return {
      refined_title: fallbackTitle,
      organized_content: organizedText,
      ai_summary: firstSummary || "Anotação organizada localmente.",
      key_decisions: rawLines.slice(0, 3).map((l) => cleanStepPrefix(l)).filter(Boolean),
      checklist_items: mode === "checklist" ? candidateActions : [],
      tags: heuristic.tags.slice(0, 4),
      suggested_category: suggestedCat,
      demand_readiness: (candidateActions.length > 0 ? "pronta" : "referencia") as
        | "pronta"
        | "parcial"
        | "referencia",
      ai_source: "fallback" as const,
    };
  };

  if (!contextText || contextText.length < 4) {
    return fallbackResult();
  }

  const key = (params.apiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!key || key === "sua_chave_da_gemini_api") {
    return fallbackResult();
  }

  const modeInstructions: Record<NoteOrganizeMode, string> = {
    auto: "Reorganize de forma completa, clara e escaneável (usando pequenos blocos temáticos ou tópicos limpos quando fizer sentido, sem markdown pesado como **). Foque em deixar fácil de consultar depois ou transformar em demanda.",
    topics: "Estruture TODO o conteúdo em tópicos curtos e bem agrupados por tema usando marcadores '• '. Elimine repetições mantendo 100% dos fatos, nomes, códigos e números.",
    summary: "Condense a anotação em um resumo executivo super enxuto (3 a 6 linhas ou 3 a 5 bullets curtos) preservando apenas o essencial, decisões e pendências.",
    demand_scope: "Transforme esta anotação solta em um ESCOPO DE DEMANDA pronto para execução, estruturado exatamente com os blocos:\nObjetivo:\nContexto:\nO que precisa ser feito:\nCritérios de validação:\nDeixe direto, profissional e pronto para virar uma demanda com 1 clique.",
    checklist: "Mantenha o 'organized_content' fiel e limpo (apenas corrigindo clareza), e concentre-se em extrair TODOS os itens acionáveis e pendências em 'checklist_items' (de 2 a 10 itens objetivos).",
    polish: "Corrija apenas ortografia, pontuação, concordância e fluidez (ideal para anotações rápidas ou ditadas por voz), preservando fielmente a estrutura e o tom do autor sem reescrever o sentido.",
  };

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const prompt = `Você é o assistente de organização de anotações rápidas do MontLife.
O usuário usa as anotações para registrar coisas rápidas no dia a dia (rascunhos livres, lembretes, ideias soltas, pontos de conversa/reunião) com o objetivo de manter tudo bem organizado e poder transformar em demanda quando precisar.

MODO SOLICITADO: ${mode}
INSTRUÇÃO ESPECÍFICA DO MODO:
${modeInstructions[mode]}

Retorne estritamente o JSON:
1. 'refined_title': Título claro, objetivo e fácil de buscar depois (máximo 65 caracteres).
2. 'organized_content': Texto organizado conforme a instrução do modo acima (mantenha 100% dos dados reais, sistemas, códigos, datas, valores e pessoas mencionados; evite asteriscos **).
3. 'ai_summary': Síntese executiva em 1 ou 2 frases curtas.
4. 'key_decisions': Lista curta (0 a 5 itens) com decisões, definições ou conclusões importantes (retorne [] se for apenas lembrete/rascunho simples).
5. 'checklist_items': ${
      mode === "checklist"
        ? "Lista prática (2 a 10 itens) com todas as ações concretas e pendências identificadas (sem numeração ou hífen no início)."
        : "Retorne OBRIGATORIAMENTE um array vazio [] (o usuário NÃO solicitou criação de checklist neste modo)."
    }
6. 'tags': 2 a 4 tags curtas em minúsculas para organização e busca.
7. 'suggested_category': classifique se a nota se encaixa melhor em 'geral' (anotação livre padrão), 'reuniao', 'ideia' ou 'checklist'. Use 'geral' sempre que for uma nota rápida comum.
8. 'demand_readiness':
   - 'pronta' se já contém ação clara pronta para virar demanda no fluxo;
   - 'parcial' se tem potencial para virar demanda mas falta detalhar algo;
   - 'referencia' se é apenas anotação informativa/consulta rápida.

Anotação:
"""
${contextText}
"""`;

    const generation = await generateWithActiveGeminiModels(ai, prompt, {
      responseMimeType: "application/json",
      responseSchema: ORGANIZE_NOTE_SCHEMA,
      temperature: 0.25,
      maxOutputTokens: 2000,
    });

    const jsonStr = generation ? extractJsonObject(generation.text) : null;
    if (!jsonStr) return fallbackResult();

    const parsed = JSON.parse(jsonStr);
    const fb = fallbackResult();
    const validCat: NoteCategory = ["geral", "reuniao", "ideia", "checklist"].includes(
      parsed.suggested_category
    )
      ? parsed.suggested_category
      : fb.suggested_category;
    const validReadiness: "pronta" | "parcial" | "referencia" = [
      "pronta",
      "parcial",
      "referencia",
    ].includes(parsed.demand_readiness)
      ? parsed.demand_readiness
      : fb.demand_readiness;

    return {
      refined_title: (parsed.refined_title || "").trim() || fb.refined_title,
      organized_content: (parsed.organized_content || "").trim() || fb.organized_content,
      ai_summary: (parsed.ai_summary || "").trim() || fb.ai_summary,
      key_decisions: Array.isArray(parsed.key_decisions)
        ? parsed.key_decisions.map((s: string) => cleanStepPrefix(s)).filter(Boolean)
        : fb.key_decisions,
      checklist_items:
        mode === "checklist"
          ? Array.isArray(parsed.checklist_items)
            ? parsed.checklist_items.map((s: string) => cleanStepPrefix(s)).filter(Boolean)
            : fb.checklist_items
          : [],
      tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags.slice(0, 5) : fb.tags,
      suggested_category: validCat,
      demand_readiness: validReadiness,
      ai_source: "gemini",
    };
  } catch (err) {
    console.warn("organizeNoteWithAI failed, using heuristic fallback:", err);
    return fallbackResult();
  }
}

const BATCH_ORGANIZE_NOTES_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    updates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          ai_summary: { type: Type.STRING },
          demand_readiness: {
            type: Type.STRING,
            enum: ["pronta", "parcial", "referencia"],
          },
        },
        required: ["id", "title", "tags", "ai_summary", "demand_readiness"],
      },
    },
  },
  required: ["updates"],
};

export async function batchOrganizeNotesWithAI(
  notes: { id: string; title: string; content: string; category?: NoteCategory; tags?: string[] }[],
  apiKey?: string
): Promise<{
  updates: {
    id: string;
    title: string;
    tags: string[];
    ai_summary: string;
    demand_readiness: "pronta" | "parcial" | "referencia";
  }[];
  ai_source: "gemini" | "fallback";
}> {
  const candidates = notes
    .filter((n) => n && n.id && ((n.title || "").trim() || (n.content || "").trim()))
    .slice(0, 15);

  const buildFallback = () => ({
    updates: candidates.map((n) => {
      const firstLine = (n.content || "").split(/\r?\n/).find((l) => l.trim())?.trim() || "";
      const needsTitle =
        !n.title?.trim() || n.title === "Sem título" || n.title === "Anotação Rápida";
      const cleanTitle = needsTitle
        ? synthesizeRefinedTitle(firstLine || n.content || "Anotação")
        : n.title.trim();
      const heur = classifyTaskHeuristic(cleanTitle, n.content || "");
      const mergedTags = Array.from(new Set([...(n.tags || []), ...heur.tags])).slice(0, 4);
      const hasAction =
        /\b(fazer|enviar|verificar|ajustar|implementar|cobrar|agendar|atualizar|revisar|criar|corrigir|solicitar)\b/i.test(
          `${cleanTitle} ${n.content}`
        );
      return {
        id: n.id,
        title: cleanTitle,
        tags: mergedTags,
        ai_summary: firstLine.slice(0, 160) || cleanTitle,
        demand_readiness: (hasAction ? "pronta" : "referencia") as
          | "pronta"
          | "parcial"
          | "referencia",
      };
    }),
    ai_source: "fallback" as const,
  });

  if (candidates.length === 0) return { updates: [], ai_source: "fallback" };

  const key = (apiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!key || key === "sua_chave_da_gemini_api") return buildFallback();

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const listText = candidates
      .map(
        (n, i) =>
          `${i + 1}. ID=${n.id} | Título="${n.title || "(vazio)"}" | Conteúdo="${(n.content || "").slice(0, 260).replace(/\s+/g, " ")}"`
      )
      .join("\n");

    const prompt = `Você é o organizador inteligente do Bloco de Notas do MontLife.
Para cada anotação abaixo (use EXATAMENTE o ID informado), gere:
- 'title': mantenha o título se já estiver bom e específico, ou crie um título claro e direto (máx 60 chars) se estiver vazio/genérico ("Sem título", "Anotação Rápida", etc.).
- 'tags': 2 a 4 tags curtas em minúsculas para facilitar a busca.
- 'ai_summary': resumo curto de 1 frase objetiva.
- 'demand_readiness': 'pronta' (tem tarefa clara para virar demanda), 'parcial' (pode virar demanda) ou 'referencia' (apenas consulta/registro).

Anotações:
${listText}`;

    const generation = await generateWithActiveGeminiModels(ai, prompt, {
      responseMimeType: "application/json",
      responseSchema: BATCH_ORGANIZE_NOTES_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 2000,
    });

    const jsonStr = generation ? extractJsonObject(generation.text) : null;
    if (!jsonStr) return buildFallback();

    const parsed = JSON.parse(jsonStr);
    const validIds = new Set(candidates.map((c) => c.id));
    const updates = Array.isArray(parsed.updates)
      ? parsed.updates
          .filter((u: any) => u && validIds.has(u.id))
          .map((u: any) => ({
            id: String(u.id),
            title: String(u.title || "").trim(),
            tags: Array.isArray(u.tags)
              ? u.tags
                  .filter((t: unknown): t is string => typeof t === "string" && t.trim().length > 0)
                  .slice(0, 4)
              : [],
            ai_summary: String(u.ai_summary || "").trim(),
            demand_readiness: (["pronta", "parcial", "referencia"].includes(u.demand_readiness)
              ? u.demand_readiness
              : "referencia") as "pronta" | "parcial" | "referencia",
          }))
      : [];

    if (updates.length === 0) return buildFallback();
    return { updates, ai_source: "gemini" };
  } catch (err) {
    console.warn("batchOrganizeNotesWithAI failed, using fallback:", err);
    return buildFallback();
  }
}

const EXTRACT_NOTE_TASKS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    key_decisions: { type: Type.ARRAY, items: { type: Type.STRING } },
    tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          account_type: { type: Type.STRING, enum: ["work", "personal"] },
          item_type: { type: Type.STRING, enum: ["task", "activity", "reminder"] },
          category: { type: Type.STRING },
          priority: { type: Type.STRING, enum: ["P1", "P2", "P3", "P4"] },
          extracted_due_date_iso: { type: Type.STRING, nullable: true },
          extracted_end_date_iso: { type: Type.STRING, nullable: true },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          validation_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
          source_excerpt: { type: Type.STRING, nullable: true },
        },
        required: [
          "title",
          "description",
          "account_type",
          "item_type",
          "category",
          "priority",
          "tags",
          "validation_steps",
        ],
      },
    },
  },
  required: ["summary", "key_decisions", "tasks"],
};

export async function extractTasksFromNoteWithAI(params: {
  title: string;
  content: string;
  checklist?: NoteChecklistItem[];
  category?: NoteCategory;
  accountType?: AccountType;
  apiKey?: string;
}): Promise<{
  summary: string;
  key_decisions: string[];
  tasks: ExtractedNoteTaskDraft[];
  ai_source: "gemini" | "cache" | "fallback";
}> {
  const contextText = buildNoteContextText(params);
  const defaultAccount: AccountType =
    String(params.accountType || "").toLowerCase().includes("pess") ||
    String(params.accountType || "") === "personal"
      ? "personal"
      : "work";

  const buildDraftFromText = (rawItemText: string): ExtractedNoteTaskDraft => {
    const fb = fallbackTriage(rawItemText);
    return {
      title: fb.refined_title,
      description: fb.structured_description || rawItemText,
      account_type: params.accountType ? defaultAccount : fb.account_type,
      item_type: fb.item_type,
      category: normalizeCategory(fb.category),
      priority: fb.priority,
      extracted_due_date_iso: fb.extracted_due_date_iso,
      extracted_end_date_iso: fb.extracted_end_date_iso || null,
      tags: fb.search_tags,
      validation_steps: fb.validation_steps || [],
      source_excerpt: rawItemText.slice(0, 120),
    };
  };

  const fallbackResult = () => {
    const openChecklist = (params.checklist || []).filter(
      (c) => !c.checked && !c.linked_task_id && c.text.trim().length > 3
    );
    const lines = (params.content || "")
      .split(/\r?\n/)
      .map((l) => cleanStepPrefix(l))
      .filter((l) => l.length >= 8);

    const candidates =
      openChecklist.length > 0
        ? openChecklist.map((c) => c.text.trim())
        : lines.length > 0
        ? lines
        : [params.title || params.content].filter((x) => Boolean(x && x.trim()));

    const drafts = candidates.slice(0, 6).map(buildDraftFromText);

    return {
      summary:
        lines.slice(0, 2).join(" ").slice(0, 200) ||
        params.title ||
        "Demandas extraídas da anotação.",
      key_decisions: lines.slice(0, 3),
      tasks: drafts,
      ai_source: "fallback" as const,
    };
  };

  if (!contextText || contextText.length < 4) {
    return fallbackResult();
  }

  const key = (params.apiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!key || key === "sua_chave_da_gemini_api") {
    return fallbackResult();
  }

  try {
    const now = new Date();
    const ai = new GoogleGenAI({ apiKey: key });
    const prompt = `Data e hora atual de referência: ${now.toISOString()} (${now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", year: "numeric", month: "long", day: "numeric" })} às ${now.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}).
Fuso horário do usuário: America/Sao_Paulo (UTC-03:00).

Analise a anotação abaixo (ideias, ata de reunião ou checklist) e extraia TODAS as demandas acionáveis distintas (entre 1 e 8 demandas), ignorando itens já concluídos [x] quando houver pendências claras.

Para cada demanda extraída:
- 'title': Título acionável começando com verbo no infinitivo (máx 70 caracteres).
- 'description': Descrição clara e objetiva em texto corrido (sem bullets ou markdown).
- 'account_type': 'work' ou 'personal' (contexto padrão da nota: ${defaultAccount}).
- 'item_type': 'task', 'activity' ou 'reminder'.
- 'category': ESTRITAMENTE uma de: ${STANDARD_CATEGORIES.map((c) => `'${c}'`).join(", ")}.
- 'priority': 'P1' | 'P2' | 'P3' | 'P4'.
- 'extracted_due_date_iso' e 'extracted_end_date_iso': ISO 8601 quando houver data/horário mencionado, senão null.
- 'tags': 2 a 4 tags curtas.
- 'validation_steps': 2 a 4 passos práticos objetivos (sem numeração no início).
- 'source_excerpt': trecho curto da nota que originou esta demanda.

Anotação:
"""
${contextText}
"""`;

    const generation = await generateWithActiveGeminiModels(ai, prompt, {
      responseMimeType: "application/json",
      responseSchema: EXTRACT_NOTE_TASKS_SCHEMA,
      temperature: 0.25,
      maxOutputTokens: 2800,
    });

    const jsonStr = generation ? extractJsonObject(generation.text) : null;
    if (!jsonStr) return fallbackResult();

    const parsed = JSON.parse(jsonStr);
    const rawTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    if (rawTasks.length === 0) return fallbackResult();

    const normalizedTasks: ExtractedNoteTaskDraft[] = rawTasks.slice(0, 8).map((t: any) => {
      const sourceText = `${t.title || ""} ${t.description || ""} ${t.source_excerpt || ""}`.trim();
      const schedule = extractScheduleRangeHeuristic(sourceText);
      const cleanSteps = Array.isArray(t.validation_steps)
        ? t.validation_steps.map(cleanStepPrefix).filter(Boolean)
        : [];
      return {
        title: (t.title || "").trim() || synthesizeRefinedTitle(sourceText),
        description: cleanToContinuousProse(t.description || "") || (t.title || "").trim(),
        account_type: t.account_type === "personal" ? "personal" : "work",
        item_type: t.item_type === "activity" || t.item_type === "reminder" ? t.item_type : "task",
        category: normalizeCategory(t.category),
        priority: ["P1", "P2", "P3", "P4"].includes(t.priority) ? t.priority : "P3",
        extracted_due_date_iso: t.extracted_due_date_iso || schedule.startIso || null,
        extracted_end_date_iso: t.extracted_end_date_iso || schedule.endIso || null,
        tags: Array.isArray(t.tags) ? t.tags.slice(0, 5) : [],
        validation_steps:
          cleanSteps.length > 0
            ? cleanSteps
            : synthesizeValidationSteps(sourceText, t.title || "").map(cleanStepPrefix),
        source_excerpt: typeof t.source_excerpt === "string" ? t.source_excerpt : undefined,
      };
    });

    return {
      summary: (parsed.summary || "").trim() || params.title || "Demandas extraídas da nota.",
      key_decisions: Array.isArray(parsed.key_decisions)
        ? parsed.key_decisions.map((d: string) => cleanStepPrefix(d)).filter(Boolean)
        : [],
      tasks: normalizedTasks,
      ai_source: "gemini",
    };
  } catch (err) {
    console.warn("extractTasksFromNoteWithAI failed, using fallback:", err);
    return fallbackResult();
  }
}

// ==========================================
// 3. TASK AI ASSISTANT (REFINE / ACTION PLAN / DIAGNOSE)
// ==========================================

const TASK_ASSIST_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    refined_title: { type: Type.STRING, nullable: true },
    structured_description: { type: Type.STRING, nullable: true },
    validation_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
    technical_guidance: { type: Type.STRING },
    priority_suggestion: { type: Type.STRING, enum: ["P1", "P2", "P3", "P4"], nullable: true },
    category_suggestion: { type: Type.STRING, nullable: true },
    tags_suggestion: { type: Type.ARRAY, items: { type: Type.STRING } },
    estimated_effort: { type: Type.STRING, nullable: true },
  },
  required: ["technical_guidance", "validation_steps"],
};

export async function assistTaskWithAI(
  task: Task,
  similarResolutions: SimilarResolution[] = [],
  mode: "refine" | "action_plan" | "diagnose" = "action_plan",
  apiKey?: string
): Promise<TaskAiAssistResponse> {
  const baseText = `${task.title}\n${task.description || ""}`.trim();
  const cacheKey = `assist_v1:${mode}:${task.id}:${baseText.slice(0, 140)}:${similarResolutions.length}`;

  const cached = await aiCache.getAsync<TaskAiAssistResponse>(cacheKey);
  if (cached && cached.tokensSaved > 0 && cached.data?.technical_guidance) {
    return { ...cached.data, ai_source: "cache" };
  }

  const buildFallbackAssist = (): TaskAiAssistResponse => {
    const fb = fallbackTriage(baseText || task.title);
    const wikiHint =
      similarResolutions.length > 0
        ? ` Foram encontradas ${similarResolutions.length} resolução(ões) semelhante(s) na Wiki (ex.: "${similarResolutions[0].title}") que podem acelerar o atendimento.`
        : "";
    return {
      refined_title: fb.refined_title,
      structured_description: fb.structured_description || task.description,
      validation_steps:
        fb.validation_steps && fb.validation_steps.length > 0
          ? fb.validation_steps
          : synthesizeValidationSteps(baseText, task.title).map(cleanStepPrefix),
      technical_guidance:
        mode === "diagnose"
          ? `Análise estruturada para "${task.title}": revise os pré-requisitos na categoria ${normalizeCategory(task.category)} e valide em homologação antes da entrega final.${wikiHint}`
          : mode === "refine"
          ? `Sugestão de texto mais objetivo e plano de validação prontos para aplicar.${wikiHint}`
          : `Plano de execução sequencial sugerido para concluir "${task.title}" dentro do SLA.${wikiHint}`,
      priority_suggestion: task.priority,
      category_suggestion: normalizeCategory(task.category),
      tags_suggestion: Array.from(new Set([...(task.tags || []), ...(fb.search_tags || [])])).slice(0, 5),
      estimated_effort: task.priority === "P1" ? "30–60 min" : "1–2 horas",
      ai_source: "fallback",
      model_used: null,
    };
  };

  const key = (apiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!key || key === "sua_chave_da_gemini_api") {
    return buildFallbackAssist();
  }

  try {
    const wikiContext =
      similarResolutions.length > 0
        ? `\n\nResoluções anteriores semelhantes na Wiki Técnica:\n${similarResolutions
            .slice(0, 3)
            .map((r, i) => `${i + 1}. "${r.title}": ${r.resolution_notes.slice(0, 240)}`)
            .join("\n")}`
        : "";

    const existingSteps =
      task.validation_steps && task.validation_steps.length > 0
        ? `\nEtapas atuais: ${task.validation_steps.map((s) => `${s.completed ? "[x]" : "[ ]"} ${s.text}`).join(" | ")}`
        : "";

    const modeGoal =
      mode === "refine"
        ? "Reescreva 'refined_title' e 'structured_description' em português executivo super claro e objetivo (texto corrido sem bullets), sugira categoria/prioridade/tags ideais e 3–5 etapas práticas."
        : mode === "diagnose"
        ? "Faça um diagnóstico técnico prático em 'technical_guidance' destacando causas prováveis, riscos/cuidados e como aproveitar eventuais resoluções da Wiki, além de 3–5 passos de verificação."
        : "Monte um plano de ação concreto e detalhado com 4–6 'validation_steps' sequenciais específicos para esta demanda, 'estimated_effort' e orientação prática em 'technical_guidance'.";

    const prompt = `${modeGoal}

Demanda atual:
- Título: ${task.title}
- Descrição: ${task.description || "(sem descrição)"}
- Categoria atual: ${task.category}
- Prioridade atual: ${task.priority}
- Tags: ${(task.tags || []).join(", ") || "(nenhuma)"}${existingSteps}${wikiContext}

Categorias válidas: ${STANDARD_CATEGORIES.join(", ")}.
Retorne estritamente o JSON do schema.`;

    const ai = new GoogleGenAI({ apiKey: key });
    const generation = await generateWithActiveGeminiModels(ai, prompt, {
      responseMimeType: "application/json",
      responseSchema: TASK_ASSIST_SCHEMA,
      temperature: 0.25,
      maxOutputTokens: 1600,
    });

    const jsonStr = generation ? extractJsonObject(generation.text) : null;
    if (!jsonStr) return buildFallbackAssist();

    const parsed = JSON.parse(jsonStr);
    const fb = buildFallbackAssist();

    const result: TaskAiAssistResponse = {
      refined_title:
        typeof parsed.refined_title === "string" && parsed.refined_title.trim()
          ? parsed.refined_title.trim()
          : fb.refined_title,
      structured_description:
        typeof parsed.structured_description === "string" && parsed.structured_description.trim()
          ? cleanToContinuousProse(parsed.structured_description)
          : fb.structured_description,
      validation_steps:
        Array.isArray(parsed.validation_steps) && parsed.validation_steps.length > 0
          ? parsed.validation_steps.map(cleanStepPrefix).filter(Boolean)
          : fb.validation_steps,
      technical_guidance: (parsed.technical_guidance || "").trim() || fb.technical_guidance,
      priority_suggestion: ["P1", "P2", "P3", "P4"].includes(parsed.priority_suggestion)
        ? parsed.priority_suggestion
        : task.priority,
      category_suggestion: parsed.category_suggestion
        ? normalizeCategory(parsed.category_suggestion)
        : normalizeCategory(task.category),
      tags_suggestion:
        Array.isArray(parsed.tags_suggestion) && parsed.tags_suggestion.length > 0
          ? parsed.tags_suggestion.slice(0, 5)
          : fb.tags_suggestion,
      estimated_effort:
        typeof parsed.estimated_effort === "string" && parsed.estimated_effort.trim()
          ? parsed.estimated_effort.trim()
          : fb.estimated_effort,
      ai_source: "gemini",
      model_used: generation?.modelUsed || null,
    };

    aiCache.set(cacheKey, result, 380, 12 * 60 * 60 * 1000);
    return result;
  } catch (err) {
    console.warn("assistTaskWithAI failed, using fallback:", err);
    return buildFallbackAssist();
  }
}

// ==========================================
// 4. DAILY EXECUTIVE BRIEFING AI
// ==========================================

const DAILY_BRIEFING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    greeting: { type: Type.STRING },
    focus_summary: { type: Type.STRING },
    top_priorities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          task_id: { type: Type.STRING },
          title: { type: Type.STRING },
          reason: { type: Type.STRING },
          urgency: { type: Type.STRING, enum: ["alta", "media", "normal"] },
        },
        required: ["task_id", "title", "reason", "urgency"],
      },
    },
    quick_tip: { type: Type.STRING },
  },
  required: ["greeting", "focus_summary", "top_priorities", "quick_tip"],
};

export async function generateDailyBriefingWithAI(
  tasks: Task[],
  pinnedNotesCount: number = 0,
  apiKey?: string
): Promise<DailyBriefingResponse> {
  const now = new Date();
  const todayStr = getSaoPauloDateString(now);
  const openTasks = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELED");

  const priorityRank: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

  let overdue = 0;
  let dueToday = 0;

  for (const t of openTasks) {
    const dueStr = t.scheduled_start || t.current_due_date;
    if (!dueStr) continue;
    try {
      const dueDate = new Date(dueStr);
      const dueDayStr = getSaoPauloDateString(dueDate);
      if (dueDayStr === todayStr) {
        dueToday++;
      } else if (dueDate.getTime() < now.getTime()) {
        overdue++;
      }
    } catch {
      // ignore invalid date
    }
  }

  const rankedOpen = [...openTasks]
    .sort((a, b) => {
      const dueA = a.scheduled_start || a.current_due_date || "9999-12-31";
      const dueB = b.scheduled_start || b.current_due_date || "9999-12-31";
      const dateA = new Date(dueA).getTime();
      const dateB = new Date(dueB).getTime();
      const isOverA = dateA < now.getTime() ? 0 : 1;
      const isOverB = dateB < now.getTime() ? 0 : 1;
      if (isOverA !== isOverB) return isOverA - isOverB;
      const pDiff = (priorityRank[a.priority] ?? 2) - (priorityRank[b.priority] ?? 2);
      if (pDiff !== 0) return pDiff;
      return dateA - dateB;
    })
    .slice(0, 12);

  const hourSp = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }).format(now)
  );
  const baseGreeting =
    hourSp < 12 ? "Bom dia!" : hourSp < 18 ? "Boa tarde!" : "Boa noite!";

  const buildFallbackBriefing = (): DailyBriefingResponse => {
    const top = rankedOpen.slice(0, 3).map((t) => {
      const dueStr = t.scheduled_start || t.current_due_date;
      const isOver = dueStr ? new Date(dueStr).getTime() < now.getTime() : false;
      const urgency: "alta" | "media" | "normal" =
        t.priority === "P1" || isOver ? "alta" : t.priority === "P2" ? "media" : "normal";
      return {
        task_id: t.id,
        title: t.title,
        reason: isOver
          ? `Prazo vencido (${t.priority} • ${t.category})`
          : `Prioridade ${t.priority} • ${t.category}`,
        urgency,
      };
    });

    return {
      greeting: `${baseGreeting} Resumo do seu dia`,
      focus_summary:
        openTasks.length === 0
          ? "Nenhuma demanda aberta no momento. Aproveite para revisar suas anotações fixadas."
          : `Você tem ${openTasks.length} demanda(s) em aberto (${overdue} atrasada(s) e ${dueToday} com prazo para hoje). Foque primeiro nos itens críticos.`,
      top_priorities: top,
      quick_tip:
        pinnedNotesCount > 0
          ? `Você tem ${pinnedNotesCount} anotação(ões) fixada(s) no Bloco de Notas — converta ideias pendentes em demandas quando estiver pronta.`
          : "Use o Bloco de Notas no celular durante reuniões para capturar pontos e transformá-los em demandas com 1 clique.",
      stats: {
        overdue,
        due_today: dueToday,
        open_total: openTasks.length,
      },
      ai_source: "fallback",
      generated_at: now.toISOString(),
    };
  };

  if (rankedOpen.length === 0) {
    return buildFallbackBriefing();
  }

  const signature = rankedOpen.map((t) => `${t.id}:${t.status}:${t.priority}`).join("|");
  const cacheKey = `briefing_v1:${todayStr}:${pinnedNotesCount}:${signature}`;
  const cached = await aiCache.getAsync<DailyBriefingResponse>(cacheKey);
  if (cached && cached.tokensSaved > 0 && cached.data?.focus_summary) {
    return {
      ...cached.data,
      stats: { overdue, due_today: dueToday, open_total: openTasks.length },
      ai_source: "cache",
    };
  }

  const key = (apiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!key || key === "sua_chave_da_gemini_api") {
    return buildFallbackBriefing();
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const tasksSummary = rankedOpen
      .map((t) => {
        const due = t.scheduled_start || t.current_due_date || "sem prazo";
        return `ID=${t.id} | [${t.priority}] | ${t.status} | Cat=${t.category} | Prazo=${due} | Título=${t.title}`;
      })
      .join("\n");

    const prompt = `Gere um briefing executivo curto e motivador em português para agora (${baseGreeting}, data ${todayStr}).
Métricas atuais: ${openTasks.length} abertas, ${overdue} atrasadas, ${dueToday} vencem hoje, ${pinnedNotesCount} notas fixadas.

Lista das principais demandas em aberto (use EXATAMENTE os IDs fornecidos em 'task_id'):
${tasksSummary}

Retorne:
- 'greeting': saudação curta (máx 40 chars).
- 'focus_summary': orientação direta do foco do dia em 1–2 frases.
- 'top_priorities': até 3 demandas mais estratégicas com 'task_id' exato da lista acima, 'title' curto, 'reason' (motivo prático curto) e 'urgency' ('alta'|'media'|'normal').
- 'quick_tip': 1 dica rápida de produtividade.`;

    const generation = await generateWithActiveGeminiModels(ai, prompt, {
      responseMimeType: "application/json",
      responseSchema: DAILY_BRIEFING_SCHEMA,
      temperature: 0.3,
      maxOutputTokens: 900,
    });

    const jsonStr = generation ? extractJsonObject(generation.text) : null;
    if (!jsonStr) return buildFallbackBriefing();

    const parsed = JSON.parse(jsonStr);
    const validIds = new Set(rankedOpen.map((t) => t.id));
    const parsedTop = Array.isArray(parsed.top_priorities)
      ? parsed.top_priorities
          .filter((p: any) => p && validIds.has(p.task_id))
          .slice(0, 3)
          .map((p: any) => ({
            task_id: String(p.task_id),
            title: String(p.title || rankedOpen.find((t) => t.id === p.task_id)?.title || ""),
            reason: String(p.reason || "Prioridade recomendada"),
            urgency: (["alta", "media", "normal"].includes(p.urgency) ? p.urgency : "media") as
              | "alta"
              | "media"
              | "normal",
          }))
      : [];

    const fb = buildFallbackBriefing();
    const result: DailyBriefingResponse = {
      greeting: (parsed.greeting || "").trim() || fb.greeting,
      focus_summary: (parsed.focus_summary || "").trim() || fb.focus_summary,
      top_priorities: parsedTop.length > 0 ? parsedTop : fb.top_priorities,
      quick_tip: (parsed.quick_tip || "").trim() || fb.quick_tip,
      stats: {
        overdue,
        due_today: dueToday,
        open_total: openTasks.length,
      },
      ai_source: "gemini",
      generated_at: now.toISOString(),
    };

    aiCache.set(cacheKey, result, 300, 6 * 60 * 60 * 1000);
    return result;
  } catch (err) {
    console.warn("generateDailyBriefingWithAI failed, using fallback:", err);
    return buildFallbackBriefing();
  }
}
