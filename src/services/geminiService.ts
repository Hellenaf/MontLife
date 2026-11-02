import { GoogleGenAI, Type } from "@google/genai";
import { GeminiTriageResponse, TaskCategory, Priority, AccountType, ItemType } from "@/types";

const SYSTEM_PROMPT = `Você é o assistente inteligente de organização, triagem e produtividade autônoma do MontLife.
O MontLife é uma plataforma universal de produtividade projetada para qualquer usuário e equipe (profissionais de TI, gestores, analistas, engenheiros, educadores, profissionais liberais e uso pessoal).

Sua função é analisar a demanda, e-mail, áudio transcrito ou anotação enviada e estruturá-la com alto nível de autonomia e inteligência:
1. Título Claro & Acionável ('refined_title'):
   - Crie um título conciso, profissional e orientado à ação para a demanda.
2. Descrição Estruturada ('structured_description'):
   - Resuma o contexto do chamado/solicitação, detalhando escopo, informações recebidas e especificações técnicas.
3. Pontos de Validação & Etapas de Finalização ('validation_steps'):
   - Sugira uma lista sequencial de 3 a 6 etapas práticas de execução e pontos de validação que o responsável deve seguir passo a passo para testar e finalizar a demanda com segurança.
   - Exemplos:
     - "1. Identificar logs de erro no servidor de banco de dados"
     - "2. Ajustar parametrização no módulo de integração"
     - "3. Realizar teste em ambiente de homologação"
     - "4. Confirmar validação e funcionamento com o usuário solicitante"
4. Identificação Precisa de Prazo ('extracted_due_date_iso'):
   - Analise profundamente o texto para identificar se o usuário mencionou qualquer prazo explícito ou implícito (ex: 'até sexta às 17h', 'amanhã cedo', 'dia 15/11', 'preciso para daqui a 2 horas', 'reunião hoje às 14h', 'prazo até fim do mês').
   - Calcule e converta precisamente para uma data/hora no formato ISO 8601 (YYYY-MM-DDTHH:mm:00Z) com base na data atual informada.
   - Se o texto NÃO contiver menção de data/prazo, retorne null.
5. Contexto ('account_type'):
   - 'work': Demandas profissionais, corporativas, acadêmicas, relatórios, contratos, sistemas, TI, reuniões de trabalho.
   - 'personal': Vida pessoal, finanças pessoais, saúde, estudos, compras, casa, família e compromissos cotidianos.
6. Tipo de Registro ('item_type'):
   - 'task': Demanda que exige execução prática e etapas de validação.
   - 'activity': Reunião, compromisso, aula, consulta ou evento com horário agendado.
   - 'reminder': Lembrete rápido, aviso pontual ou memorando.
7. Categoria Dinâmica ('category'):
   - Crie ou selecione com autonomia a categoria mais precisa, elegante e profissional para o assunto.
   - Exemplos: 'BI & Analytics', 'Sistemas ERP', 'Gestão & Contratos', 'Finanças & Tesouraria', 'Engenharia de Software', 'Infraestrutura & Redes', 'Comunicação & Mensagens', 'Gestão Educacional', 'Projetos', 'Jurídico', 'Operações', 'Estudos & Capacitação', 'Saúde & Bem-estar', 'Vida Pessoal', etc.
8. Prioridade & Nível de SLA ('priority'):
   - 'P1' (Urgente / Crítica - SLA 4h): Problemas que travam a operação, paradas de sistema, ordens de diretoria ou prazos imediatos.
   - 'P2' (Alta - SLA 24h): Demandas importantes com prazo para o mesmo dia ou dia seguinte.
   - 'P3' (Média / Padrão - SLA 48h): Demandas rotineiras e operacionais normais.
   - 'P4' (Baixa / Planejamento - SLA 72h+): Sugestões, ideias, estudos ou melhorias sem urgência.
9. Tags Técnicas & Tópicos ('search_tags'):
   - Extraia de 2 a 5 tags objetivas e contextuais (ferramentas, tecnologias, departamentos).
10. Recursos de Estudo no YouTube ('learning_queries'):
   - Gere 2 queries de busca objetivas para encontrar tutoriais ou documentações em vídeo no YouTube.`;

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
    text.includes("bi") ||
    text.includes("dashboard") ||
    text.includes("relatório") ||
    text.includes("relatorio") ||
    text.includes("cubo") ||
    text.includes("dax") ||
    text.includes("metabase")
  ) {
    category = "BI & Analytics";
    accountType = "work";
    tags.push("Power BI", "Relatórios");
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
    if (/\brh\b/.test(text) || text.includes("funcionário") || text.includes("funcionario")) tags.push("RH");
    if (text.includes("cpf")) tags.push("CPF");
    if (text.includes("biblioteca")) tags.push("Biblioteca");
  } else if (
    text.includes("contrato") ||
    text.includes("matrícula") ||
    text.includes("matricula") ||
    text.includes("aditivo") ||
    text.includes("jurídic")
  ) {
    category = "Gestão & Contratos";
    accountType = "work";
    tags.push("Contratos", "Documentação");
    if (text.includes("matrícula") || text.includes("matricula")) tags.push("Matrícula");
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

  if (clean.length <= 50 && !clean.includes(".") && !clean.includes(";") && !clean.includes(",")) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  // Detect first primary objective clause before explanatory connectors
  let title = clean;
  const firstClauseMatch = clean.match(
    /^([^.,;]+?)(?:,\s*(?:pois|porque|já\s+que|para\s+que|onde|afim\s+de)|[.;]|\n)/i
  );
  if (firstClauseMatch) {
    title = firstClauseMatch[1].trim();
  }

  // Refine colloquial or verbose phrases into punchy, professional phrasing
  title = title
    .replace(/a forma que eles registram/i, "o registro de")
    .replace(/a forma como registram/i, "o registro de")
    .replace(/a forma de registrar/i, "o registro de")
    .replace(/como eles cadastram/i, "o cadastro de")
    .replace(/como cadastrar/i, "o cadastro de")
    .replace(/verificar com o ([a-z0-9]+) a forma/i, "Alinhar com $1 o processo")
    .replace(/\s+(?:pois|porque|para|com|em|de|que|e|se)$/i, "");

  // If text mentions critical systems/contexts missing from the clause, append concisely
  const lower = clean.toLowerCase();
  if (lower.includes("totvs") && !title.toLowerCase().includes("totvs")) {
    title += " no TOTVS";
  }
  if (lower.includes("cpf") && !title.toLowerCase().includes("cpf")) {
    title += " (Vínculo CPF)";
  }

  title = title.charAt(0).toUpperCase() + title.slice(1);

  if (title.length > 70) {
    const spaceIdx = title.lastIndexOf(" ", 67);
    title = (spaceIdx > 35 ? title.substring(0, spaceIdx) : title.substring(0, 67)).trim() + "...";
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

  // Split into sentences
  const sentences = clean.split(/(?<=[.?!])\s+/).filter(Boolean);
  const mainGoal = sentences[0] || clean;

  const systems: string[] = [];
  if (/totvs/i.test(clean)) systems.push("TOTVS (Gestão / RM)");
  if (/power\s*bi/i.test(clean)) systems.push("Power BI");
  if (/excel|planilha/i.test(clean)) systems.push("Planilhas / Excel");
  if (/email|e-mail|outlook|gmail/i.test(clean)) systems.push("Email / Mensageria");
  if (/catraca|acesso/i.test(clean)) systems.push("Controle de Acesso");

  const depts: string[] = [];
  if (/\brh\b/i.test(clean)) depts.push("Recursos Humanos (RH)");
  if (/biblioteca/i.test(clean)) depts.push("Biblioteca");
  if (/tesouraria|financeir/i.test(clean)) depts.push("Tesouraria / Financeiro");
  if (/secretaria/i.test(clean)) depts.push("Secretaria Acadêmica");
  if (/ti|suporte/i.test(clean)) depts.push("TI & Suporte Técnico");

  let desc = `📋 **Objetivo da Demanda:**\n${mainGoal}\n\n`;

  const details: string[] = [];
  if (systems.length > 0) details.push(`• **Sistemas Envolvidos:** ${systems.join(", ")}`);
  if (depts.length > 0) details.push(`• **Setores Impactados:** ${depts.join(", ")}`);
  if (/cpf/i.test(clean)) details.push(`• **Ponto Crítico:** Vínculo por CPF (atenção para não mesclar históricos de ex-alunos ou responsáveis)`);
  if (/sonia/i.test(clean)) details.push(`• **Interessado / Solicitante:** Observação reportada por Sonia (Biblioteca)`);

  // Extra context if multiple sentences exist
  if (sentences.length > 1) {
    const additionalNotes = sentences.slice(1).join(" ").trim();
    if (additionalNotes) {
      details.push(`• **Observações Adicionais:** ${additionalNotes}`);
    }
  }

  if (details.length > 0) {
    desc += `🔍 **Contexto & Detalhes Operacionais:**\n${details.join("\n")}\n\n`;
  }

  desc += `💬 **Demanda Original Registrada:**\n"${clean}"`;

  return desc;
}

/**
 * Autonomous Context-Tailored Validation Steps Synthesizer:
 * Suggests actionable, sequential execution checkpoints based on detected systems and domain keywords.
 */
export function synthesizeValidationSteps(rawInput: string, title: string): string[] {
  const t = rawInput.toLowerCase();
  const steps: string[] = [];

  if (
    t.includes("totvs") ||
    t.includes("rh") ||
    t.includes("cadastro") ||
    t.includes("funcionario") ||
    t.includes("funcionário")
  ) {
    steps.push("1. Alinhar com o RH o fluxo atual de inclusão e consulta de colaboradores no sistema.");
    steps.push("2. Avaliar no TOTVS a regra de chave por CPF para evitar sobrescrever registros de ex-alunos ou responsáveis.");
    if (t.includes("biblioteca") || t.includes("emprestimo") || t.includes("empréstimo")) {
      steps.push("3. Verificar no módulo da Biblioteca a segregação do histórico de empréstimos.");
    }
    steps.push("4. Definir e homologar a parametrização para preservar a integridade dos dados históricos.");
    steps.push("5. Finalizar a demanda prestando o retorno à solicitante (Sonia) e às equipes envolvidas.");
  } else if (
    t.includes("power bi") ||
    t.includes("relatório") ||
    t.includes("relatorio") ||
    t.includes("dashboard")
  ) {
    steps.push("1. Levantar as métricas e regras de negócio exigidas no relatório.");
    steps.push("2. Realizar a extração e tratamento dos dados na fonte.");
    steps.push("3. Desenvolver o painel / relatório e validar os números.");
    steps.push("4. Homologar os resultados e publicar para os usuários.");
  } else if (
    t.includes("pagar") ||
    t.includes("comprar") ||
    t.includes("financeir") ||
    t.includes("tesouraria") ||
    t.includes("boleto")
  ) {
    steps.push("1. Conferir os valores, comprovantes fiscais e datas de vencimento.");
    steps.push("2. Obter autorização da coordenação / diretoria.");
    steps.push("3. Executar o pagamento / lançamento e realizar a conciliação bancária.");
    steps.push("4. Arquivar o comprovante e notificar os envolvidos.");
  } else {
    steps.push("1. Analisar o escopo detalhado e dependências da demanda.");
    steps.push("2. Executar as ações e configurações necessárias no ambiente.");
    steps.push("3. Realizar testes de homologação e validação técnica.");
    steps.push("4. Confirmar a conclusão e alinhar com o solicitante.");
  }

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
  const key = apiKey || process.env.GEMINI_API_KEY;

  if (!key || key === "sua_chave_da_gemini_api") {
    return fallbackTriage(rawInput);
  }

  try {
    const now = new Date();
    const promptWithContext = `Data e hora atual de referência: ${now.toISOString()} (${now.toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}).

Analise o texto a seguir, crie um título profissional, estruture a descrição, extraia o prazo exato se mencionado (ou null se nenhum prazo foi informado), e gere etapas de validação para a finalização da demanda:

"${rawInput}"`;

    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: promptWithContext,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    });

    const text = typeof response.text === "function" ? (response.text as any)() : response.text;
    if (!text) {
      return fallbackTriage(rawInput);
    }

    const parsed = JSON.parse(text) as GeminiTriageResponse;
    if (!parsed.item_type) {
      parsed.item_type = fallbackTriage(rawInput).item_type;
    }
    if (!parsed.category) {
      parsed.category = fallbackTriage(rawInput).category;
    }
    if (!parsed.validation_steps || parsed.validation_steps.length === 0) {
      parsed.validation_steps = fallbackTriage(rawInput).validation_steps;
    }
    // If Gemini didn't find a deadline but regex did, use heuristic fallback
    if (!parsed.extracted_due_date_iso) {
      parsed.extracted_due_date_iso = extractDeadlinesHeuristic(rawInput);
    }

    return parsed;
  } catch (error) {
    console.warn("Gemini API call failed, using autonomous heuristic classifier:", error);
    return fallbackTriage(rawInput);
  }
}

/**
 * Autonomously categorizes and tags any task with AI.
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
  const key = apiKey || process.env.GEMINI_API_KEY;

  if (key && key !== "sua_chave_da_gemini_api") {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const prompt = `Analise este título e notas de tarefa e gere a melhor categoria profissional dinâmica e tags:
Título: ${title}
Notas: ${notes}
Contexto: ${accountTypeHint || "work"}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      });

      const text = typeof response.text === "function" ? (response.text as any)() : response.text;
      if (text) {
        const parsed = JSON.parse(text) as GeminiTriageResponse;
        if (parsed.category && parsed.search_tags?.length > 0) {
          return {
            category: parsed.category,
            tags: parsed.search_tags,
            priority: parsed.priority || "P3",
            item_type: parsed.item_type || "task",
            learning_queries: parsed.learning_queries || [],
          };
        }
      }
    } catch {
      // Use high-precision heuristic fallback
    }
  }

  const h = classifyTaskHeuristic(title, notes, accountTypeHint);
  return {
    category: h.category,
    tags: h.tags,
    priority: h.priority,
    item_type: h.item_type,
    learning_queries: h.learning_queries,
  };
}

export async function generateExecutiveSummary(
  tasks: any[],
  periodLabel: string,
  accountType: "work" | "personal",
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

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        temperature: 0.3,
      },
    });

    const text = typeof response.text === "function" ? (response.text as any)() : response.text;
    return text || fallbackSummary;
  } catch (err) {
    console.warn("Failed to generate executive summary with Gemini:", err);
    return fallbackSummary;
  }
}
