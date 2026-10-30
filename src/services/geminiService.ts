import { GoogleGenAI, Type } from "@google/genai";
import { GeminiTriageResponse, TaskCategory, Priority, AccountType } from "@/types";

const SYSTEM_PROMPT = `Você é o agente operacional do sistema Mont Ops. Sua função é receber uma anotação rápida da usuária e transformá-la em uma tarefa clara, profissional e estruturada. Classifique se a tarefa pertence ao contexto 'work' (TI escolar, TOTVS RM, Google Workspace, suporte a professores/alunos/pais, scripts, infraestrutura) ou 'personal' (vida pessoal, catequese, estudos de idiomas, música, finanças, casa). Importante: na comunicação escolar com famílias, nunca use os termos 'Tarefas' ou 'Entregas' para atividades de alunos; use sempre 'Lição de Casa'. Defina a prioridade (P1 a P4), extraia tags técnicas para indexação futura de resolução de problemas e gere 2 termos de busca objetivos para vídeos no YouTube ou artigos técnicos que ajudem a executar ou automatizar essa tarefa.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    refined_title: {
      type: Type.STRING,
      description: "Título claro, objetivo e acionável para a tarefa.",
    },
    structured_description: {
      type: Type.STRING,
      description: "Passos sugeridos ou contexto organizado da tarefa.",
    },
    account_type: {
      type: Type.STRING,
      enum: ["work", "personal"],
      description: "Define se a tarefa vai para a conta Google de Trabalho ou Pessoal.",
    },
    category: {
      type: Type.STRING,
      enum: [
        "TOTVS RM",
        "Google Workspace",
        "Suporte TI",
        "Automações & Scripts",
        "Infra & Hardware",
        "Catequese",
        "Idiomas & Estudos",
        "Finanças & Pessoal",
      ],
    },
    priority: {
      type: Type.STRING,
      enum: ["P1", "P2", "P3", "P4"],
      description: "P1: Urgente (4h), P2: Alta (24h), P3: Média (3 dias), P4: Baixa (7 dias).",
    },
    extracted_due_date_iso: {
      type: Type.STRING,
      nullable: true,
      description: "Data/hora ISO 8601 se o usuário mencionou prazo específico, ou null para usar o SLA automático da prioridade.",
    },
    search_tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Palavras-chave técnicas para buscar se esse problema já foi resolvido no passado.",
    },
    learning_queries: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2 queries de busca para encontrar tutoriais no YouTube ou artigos que facilitem esse processo.",
    },
  },
  required: [
    "refined_title",
    "structured_description",
    "account_type",
    "category",
    "priority",
    "search_tags",
    "learning_queries",
  ],
};

/**
 * Intelligent fallback analyzer when GEMINI_API_KEY is not set or during offline/mock use.
 */
function fallbackTriage(rawInput: string): GeminiTriageResponse {
  const lower = rawInput.toLowerCase();

  let accountType: AccountType = "work";
  let category: TaskCategory = "Suporte TI";
  let priority: Priority = "P3";

  // Context inference
  if (
    lower.includes("rm") ||
    lower.includes("totvs") ||
    lower.includes("portal") ||
    lower.includes("matrícula") ||
    lower.includes("boletim")
  ) {
    accountType = "work";
    category = "TOTVS RM";
  } else if (
    lower.includes("google") ||
    lower.includes("workspace") ||
    lower.includes("classroom") ||
    lower.includes("drive") ||
    lower.includes("email") ||
    lower.includes("gmail")
  ) {
    accountType = "work";
    category = "Google Workspace";
  } else if (
    lower.includes("script") ||
    lower.includes("python") ||
    lower.includes("api") ||
    lower.includes("automação") ||
    lower.includes("banco")
  ) {
    accountType = "work";
    category = "Automações & Scripts";
  } else if (
    lower.includes("switch") ||
    lower.includes("rede") ||
    lower.includes("impressora") ||
    lower.includes("servidor") ||
    lower.includes("wifi")
  ) {
    accountType = "work";
    category = "Infra & Hardware";
  } else if (
    lower.includes("catequese") ||
    lower.includes("igreja") ||
    lower.includes("missa") ||
    lower.includes("encontro")
  ) {
    accountType = "personal";
    category = "Catequese";
  } else if (
    lower.includes("inglês") ||
    lower.includes("espanhol") ||
    lower.includes("curso") ||
    lower.includes("estudar") ||
    lower.includes("leitura")
  ) {
    accountType = "personal";
    category = "Idiomas & Estudos";
  } else if (
    lower.includes("banco") ||
    lower.includes("conta") ||
    lower.includes("comprar") ||
    lower.includes("mercado") ||
    lower.includes("pagar") ||
    lower.includes("fatura")
  ) {
    accountType = "personal";
    category = "Finanças & Pessoal";
  }

  // Priority inference
  if (
    lower.includes("urgente") ||
    lower.includes("parou") ||
    lower.includes("fora do ar") ||
    lower.includes("crítico") ||
    lower.includes("hoje agora")
  ) {
    priority = "P1";
  } else if (
    lower.includes("amanhã") ||
    lower.includes("importante") ||
    lower.includes("diretoria") ||
    lower.includes("prazo curto")
  ) {
    priority = "P2";
  } else if (lower.includes("quando der") || lower.includes("planejar") || lower.includes("ideia")) {
    priority = "P4";
  }

  // Refined title: ensure school communication rule (use "Lição de Casa" instead of "Tarefas" / "Entregas")
  let title = rawInput
    .replace(/\b(tarefas|entregas)\b/gi, "Lição de Casa")
    .trim();
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  } else {
    title = "Nova Atividade Operacional";
  }

  // Extract tags
  const tags: string[] = [category.toLowerCase().replace(/\s+/g, "-")];
  if (lower.includes("rm")) tags.push("totvs-rm");
  if (lower.includes("sincronização")) tags.push("sincronizacao");
  if (lower.includes("notas")) tags.push("notas");
  if (lower.includes("aluno")) tags.push("alunos");
  if (lower.includes("professor")) tags.push("professores");
  if (lower.includes("senha")) tags.push("autenticacao");
  if (lower.includes("backup")) tags.push("backup");

  const learningQueries = [
    `${category} ${tags.slice(0, 2).join(" ")} tutorial e melhores práticas`,
    `Como resolver e automatizar ${category} ${tags[1] || ""}`,
  ];

  return {
    refined_title: title,
    structured_description: `Contexto operacional estruturado: ${rawInput}\n\nRecomendações e checklist:\n- [ ] Diagnosticar impacto imediato\n- [ ] Executar validação de integridade\n- [ ] Registrar resolução na Wiki técnica Mont Ops`,
    account_type: accountType,
    category,
    priority,
    extracted_due_date_iso: null,
    search_tags: tags,
    learning_queries: learningQueries,
  };
}

export async function triageInputWithGemini(
  rawInput: string,
  apiKey?: string
): Promise<GeminiTriageResponse> {
  const key = apiKey || process.env.GEMINI_API_KEY;

  if (!key || key === "sua_chave_da_gemini_api") {
    // Graceful offline/local inference
    return fallbackTriage(rawInput);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    // Use gemini-2.5-flash as specified in the PRD
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
    return parsed;
  } catch (error) {
    console.warn("Gemini API call failed, using intelligent fallback triage:", error);
    return fallbackTriage(rawInput);
  }
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
**Contexto:** ${accountType === "work" ? "Tecnologia da Informação & Operações Institucionais (Trabalho)" : "Gestão Pessoal & Estudos"}

#### 1. Visão Geral das Entregas
No período analisado (${periodLabel}), foram registradas e gerenciadas **${tasks.length} atividades**, das quais **${completed.length} foram concluídas com sucesso**. O índice de cumprimento das diretrizes de atendimento manteve estabilidade operacional e alinhamento com as prioridades do setor.

#### 2. Destaques Técnicos e Incidentes Solucionados
${completed
  .slice(0, 6)
  .map(
    (t) =>
      `* **${t.title}** (${t.category}): ${
        t.resolution_notes
          ? `*Solução técnica aplicada:* ${t.resolution_notes}`
          : t.description || "Entrega executada conforme especificação."
      }`
  )
  .join("\n")}

#### 3. Eficiência Operacional e Continuidade
${
  inProgress.length > 0
    ? inProgress
        .map((t) => `* **${t.title}** — Em andamento (${t.category}, prioridade ${t.priority}).`)
        .join("\n")
    : "* Todas as demandas do período foram finalizadas satisfatoriamente sem pendências críticas."
}

*Relatório gerado via Mont Ops para comprovação e prestação de contas executiva.*`;

  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key || key === "sua_chave_da_gemini_api") {
    return fallbackSummary;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const prompt = `Gere uma síntese executiva formal de prestação de contas para o período "${periodLabel}" com base nas seguintes atividades:
${JSON.stringify(
  tasks.map((t) => ({
    titulo: t.title,
    categoria: t.category,
    status: t.status,
    prioridade: t.priority,
    resolucao: t.resolution_notes,
    descricao: t.description,
  })),
  null,
  2
)}

O relatório destina-se à prestação de contas, auditoria de entregas e acompanhamento de produtividade pessoal e profissional para comprovar com clareza técnica e objetividade tudo o que foi realizado e demonstrar o valor gerado.
${
  accountType === "work"
    ? "IMPORTANTE: Mantenha 100% o foco profissional em TI Escolar, TOTVS RM, Google Workspace, Infraestrutura e Atendimento Institucional. NUNCA mencione termos ou tarefas pessoais."
    : ""
}
Estruture a resposta em Markdown claro e elegante com:
1. Resumo Executivo das Entregas (métricas e impacto)
2. Principais Incidentes e Soluções Técnicas (destacando os problemas diagnosticados e como foram resolvidos)
3. Confiabilidade e Cumprimento de Prazos (SLA)
4. Demandas em Andamento e Próximos Passos`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
