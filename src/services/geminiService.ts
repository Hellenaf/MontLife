import { GoogleGenAI, Type } from "@google/genai";
import { GeminiTriageResponse, TaskCategory, Priority, AccountType, ItemType } from "@/types";

const SYSTEM_PROMPT = `Você é o assistente inteligente de organização, triagem e produtividade autônoma do MontLife.
O MontLife é uma plataforma universal de produtividade projetada para qualquer usuário e equipe (profissionais de TI, gestores, analistas, engenheiros, educadores, profissionais liberais e uso pessoal).

Sua função é analisar a demanda ou anotação enviada e estruturá-la com alto nível de autonomia e inteligência:
1. Contexto ('account_type'):
   - 'work': Demandas profissionais, corporativas, acadêmicas, relatórios, contratos, sistemas, TI, reuniões de trabalho.
   - 'personal': Vida pessoal, finanças pessoais, saúde, estudos, compras, casa, família e compromissos cotidianos.
2. Tipo de Registro ('item_type'):
   - 'task': Tarefa ou entrega prática que exige ação ou resolução técnica com passos claros.
   - 'activity': Reunião, compromisso, aula, consulta ou evento com horário agendado.
   - 'reminder': Lembrete rápido, aviso pontual ou memorando.
3. Categoria Dinâmica ('category'):
   - Crie ou selecione com autonomia a categoria mais precisa, elegante e profissional para o assunto.
   - Exemplos: 'BI & Analytics', 'Sistemas ERP', 'Gestão & Contratos', 'Finanças & Tesouraria', 'Engenharia de Software', 'Infraestrutura & Redes', 'Comunicação & Mensagens', 'Gestão Educacional', 'Projetos', 'Jurídico', 'Operações', 'Estudos & Capacitação', 'Saúde & Bem-estar', 'Vida Pessoal', etc.
   - O campo é livre e dinâmico: adapte à realidade do usuário.
4. Prioridade ('priority'):
   - 'P1' (Urgente / Crítica - SLA 4h), 'P2' (Alta - SLA 24h), 'P3' (Média / Padrão - SLA 3 dias), 'P4' (Baixa / Planejamento - SLA 7 dias).
5. Tags Técnicas & Tópicos ('search_tags'):
   - Extraia de 2 a 5 tags objetivas e contextuais (ferramentas, tecnologias, áreas, departamentos ou palavras-chave).
6. Recursos de Estudo no YouTube ('learning_queries'):
   - Gere 2 queries de busca específicas e objetivas para encontrar tutoriais ou documentações em vídeo no YouTube que facilitem a execução dessa tarefa.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    refined_title: {
      type: Type.STRING,
      description: "Título claro, profissional e acionável para a tarefa.",
    },
    structured_description: {
      type: Type.STRING,
      description: "Passos sugeridos, checklist ou contexto organizado da tarefa.",
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
 * Intelligent fallback triage for manual user input.
 */
function fallbackTriage(rawInput: string): GeminiTriageResponse {
  const heuristic = classifyTaskHeuristic(rawInput);

  let title = rawInput.trim();
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  } else {
    title =
      heuristic.item_type === "reminder"
        ? "Novo Lembrete"
        : heuristic.item_type === "activity"
        ? "Nova Atividade"
        : "Nova Tarefa";
  }

  return {
    refined_title: title,
    structured_description: `Contexto operacional registrado: ${rawInput}\n\nChecklist sugerido:\n- [ ] Avaliar escopo da demanda\n- [ ] Executar etapas necessárias\n- [ ] Registrar conclusão no MontLife`,
    account_type: heuristic.account_type,
    item_type: heuristic.item_type,
    category: heuristic.category,
    priority: heuristic.priority,
    extracted_due_date_iso: null,
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
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: rawInput,
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
