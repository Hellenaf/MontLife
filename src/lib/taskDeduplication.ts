import { Task } from "@/types";

export interface SimilarTaskMatch {
  task: Task;
  similarityScore: number; // 0.0 to 1.0
  matchedTerms: string[];
  isExactMatch: boolean;
  hasPreviousResolution: boolean;
  previousResolutionNotes: string | null;
  recurrenceCount: number;
}

const PORTUGUESE_STOP_WORDS = new Set([
  "a", "o", "as", "os", "de", "do", "da", "dos", "das",
  "em", "no", "na", "nos", "nas", "para", "pra", "pro", "com", "por",
  "um", "uma", "uns", "umas", "e", "ou", "que", "se", "seu", "sua",
  "seus", "suas", "meu", "minha", "este", "esta", "estes", "estas",
  "esse", "essa", "esses", "essas", "aquele", "aquela", "isso", "isto",
  "pelo", "pela", "pelos", "pelas", "onde", "quando", "como", "qual",
  "quais", "quem", "fazer", "deve", "sobre", "mais", "muito", "estou",
  "esta", "estao", "foram", "foi", "sera", "serao", "preciso", "solicito",
  "favor", "urgente", "demanda", "tarefa", "atividade", "chamado", "item",
  // Termos operacionais genéricos que não devem causar falsos positivos de similaridade isolados:
  "relatorio", "relatorios", "sistema", "sistemas",
  "ajuste", "ajustes", "ajustar", "atualizar", "atualizacao", "atualizacoes",
  "verificar", "verificacao", "validar", "validacao", "criar", "criacao",
  "corrigir", "correcao", "novo", "nova", "novos", "novas",
  "rotina", "rotinas", "processo", "processos", "dados", "base",
  "tela", "telas", "erro", "falha", "problema", "duvida",
  "geral", "modulo", "campo", "campos", "implementar", "implementacao",
  "painel", "dashboard"
]);

/**
 * Normalizes text for robust token-level and substring comparison.
 * Removes accents, lowercases, and replaces non-alphanumeric with space.
 */
export function normalizeClean(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenizes text and strips common stop words.
 */
export function tokenize(text: string): string[] {
  const clean = normalizeClean(text);
  if (!clean) return [];
  return clean
    .split(" ")
    .filter((word) => word.length >= 2 && !PORTUGUESE_STOP_WORDS.has(word));
}

/**
 * Stems common Portuguese endings for better root matching
 * (e.g., "redefinir" / "redefinicao" -> "redefin", "impressora" / "impressoras" -> "impressor")
 */
function getStem(word: string): string {
  if (word.length <= 4) return word;
  return word
    .replace(/(cao|coes|mentos|mento|ando|endo|indo|aram|eram|iram|arem|erem|irem|aria|eria|iria|asse|esse|isse)$/, "")
    .replace(/(ada|ado|adas|ados|oso|osa|osos|osas|vel|veis)$/, "")
    .replace(/(ar|er|ir|as|es|os|s)$/, "");
}

/**
 * Computes Levenshtein edit distance between two short strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row: number[] = [];
  for (let i = 0; i <= b.length; i++) {
    row[i] = i;
  }

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      let val: number;
      if (a.charAt(i - 1) === b.charAt(j - 1)) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

/**
 * Checks if two tokens are equivalent either by exact equality, common stem, or small typo.
 */
function areTokensSimilar(t1: string, t2: string): boolean {
  if (t1 === t2) return true;
  if (t1.length >= 4 && t2.length >= 4) {
    const s1 = getStem(t1);
    const s2 = getStem(t2);
    if (s1 === s2 || (s1.length >= 4 && s2.length >= 4 && (s1.startsWith(s2) || s2.startsWith(s1)))) {
      return true;
    }
    const maxDist = Math.min(t1.length, t2.length) >= 6 ? 2 : 1;
    if (levenshteinDistance(t1, t2) <= maxDist) {
      return true;
    }
  }
  return false;
}

/**
 * Bigram Dice Coefficient for character-level similarity (robust to typos & word ordering)
 */
function diceCoefficient(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const clean1 = normalizeClean(str1).replace(/\s+/g, "");
  const clean2 = normalizeClean(str2).replace(/\s+/g, "");
  if (clean1 === clean2) return 1.0;
  if (clean1.length < 2 || clean2.length < 2) return 0;

  const bigrams1 = new Map<string, number>();
  for (let i = 0; i < clean1.length - 1; i++) {
    const bigram = clean1.substring(i, i + 2);
    bigrams1.set(bigram, (bigrams1.get(bigram) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < clean2.length - 1; i++) {
    const bigram = clean2.substring(i, i + 2);
    const count = bigrams1.get(bigram) || 0;
    if (count > 0) {
      bigrams1.set(bigram, count - 1);
      intersection++;
    }
  }

  return (2.0 * intersection) / (clean1.length - 1 + clean2.length - 1);
}

/**
 * Computes flexible token overlap and containment between two token lists.
 */
function computeTokenOverlap(
  tokensA: string[],
  tokensB: string[]
): { score: number; containment: number; matched: string[] } {
  if (tokensA.length === 0 || tokensB.length === 0) {
    return { score: 0, containment: 0, matched: [] };
  }

  const matchedA: string[] = [];
  const usedB = new Set<number>();

  for (const tA of tokensA) {
    for (let i = 0; i < tokensB.length; i++) {
      if (!usedB.has(i) && areTokensSimilar(tA, tokensB[i])) {
        usedB.add(i);
        matchedA.push(tA);
        break;
      }
    }
  }

  const minTokens = Math.min(tokensA.length, tokensB.length);
  const maxTokens = Math.max(tokensA.length, tokensB.length);
  const unionCount = tokensA.length + tokensB.length - matchedA.length;

  const jaccard = unionCount > 0 ? matchedA.length / unionCount : 0;
  const containment = minTokens > 0 ? matchedA.length / minTokens : 0;
  const overlapRatio = maxTokens > 0 ? matchedA.length / maxTokens : 0;

  // Blended token score
  const score = Math.max(jaccard, containment * 0.85, overlapRatio);

  return { score, containment, matched: matchedA };
}

/**
 * Extracts identifying numeric/alphanumeric codes (e.g. "1207", "1215", "rm12", "nf1040").
 */
function extractCodesAndNumbers(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\b(?:\d{2,}|[a-z]{1,4}\d{2,}|\d{2,}[a-z]{1,4})\b/gi) || [];
  return Array.from(new Set(matches.map((m) => m.toLowerCase())));
}

/**
 * Scans existing tasks for duplicates or semantically similar items.
 * Uses high-precision matching (threshold 0.65), differentiates technical codes (e.g. 1207 vs 1215),
 * and prevents false positives caused by single common words.
 */
export function findSimilarTasks(
  inputTitle: string,
  inputDescription: string = "",
  existingTasks: Task[] = [],
  threshold: number = 0.65
): SimilarTaskMatch[] {
  const cleanInputTitle = normalizeClean(inputTitle);
  if (!cleanInputTitle || !existingTasks || existingTasks.length === 0) return [];

  const inputTitleTokens = tokenize(inputTitle);
  const inputDescTokens = tokenize(inputDescription);
  const allInputTokens = Array.from(new Set([...inputTitleTokens, ...inputDescTokens]));
  const inputCodes = extractCodesAndNumbers(inputTitle);

  const matches: SimilarTaskMatch[] = [];

  for (const task of existingTasks) {
    if (!task || !task.id) continue;

    const taskCleanTitle = normalizeClean(task.title || "");
    const taskCleanRaw = normalizeClean(task.raw_input || "");

    // 1. Exact Match Check
    const isDirectMatch =
      cleanInputTitle === taskCleanTitle ||
      (cleanInputTitle.length > 5 && cleanInputTitle === taskCleanRaw);

    if (isDirectMatch) {
      matches.push({
        task,
        similarityScore: 1.0,
        matchedTerms: inputTitleTokens,
        isExactMatch: true,
        hasPreviousResolution: Boolean(task.status === "COMPLETED" && task.resolution_notes),
        previousResolutionNotes: task.resolution_notes || null,
        recurrenceCount: task.recurrence_count || 1,
      });
      continue;
    }

    // 2. Technical Code Mismatch Check (CRITICAL: Diferencia Relatório 1207 de 1215, chamados, etc.)
    const taskCodes = extractCodesAndNumbers(task.title || "");
    if (inputCodes.length > 0 && taskCodes.length > 0) {
      const hasSharedCode = inputCodes.some((code) => taskCodes.includes(code));
      if (!hasSharedCode) {
        // Códigos distintos indicam itens ou relatórios completamente diferentes -> não é duplicata
        continue;
      }
    }

    // 3. Substring & Containment on Titles
    let substringScore = 0;
    if (cleanInputTitle.length > 5 && taskCleanTitle.length > 5) {
      if (taskCleanTitle.includes(cleanInputTitle) || cleanInputTitle.includes(taskCleanTitle)) {
        const minLen = Math.min(cleanInputTitle.length, taskCleanTitle.length);
        const maxLen = Math.max(cleanInputTitle.length, taskCleanTitle.length);
        substringScore = (minLen / maxLen) * 0.95;
      }
    }

    // 4. Token Overlap on Titles (Primary!)
    const taskTitleTokens = tokenize(task.title || "");
    const titleOverlap = computeTokenOverlap(inputTitleTokens, taskTitleTokens);

    // 5. Character Bigram Dice on Titles
    const titleDice = diceCoefficient(cleanInputTitle, taskCleanTitle);

    // Requisito de relevância: se não for match direto nem alta correlação global (dice >= 0.82),
    // exige pelo menos 2 termos significativos não genéricos para evitar falsos positivos
    if (titleDice < 0.82 && titleOverlap.matched.length < 2) {
      continue;
    }

    // 6. Best Title Similarity Signal
    const bestTitleSignal = Math.max(
      substringScore,
      titleOverlap.containment >= 0.75 ? titleOverlap.containment * 0.92 : titleOverlap.score,
      titleDice * 0.88
    );

    // 7. Context corroboration (Description & Tags bonus)
    const taskDescTokens = tokenize(task.description || "");
    const taskTags = (task.tags || []).map((t) => normalizeClean(t));
    const descOverlap = computeTokenOverlap(allInputTokens, taskDescTokens);

    const tagMatches = allInputTokens.filter((tok) =>
      taskTags.some((tag) => tag.includes(tok) || areTokensSimilar(tag, tok))
    );

    let contextBonus = 0;
    if (descOverlap.matched.length > 0) {
      contextBonus += Math.min(0.12, descOverlap.matched.length * 0.04);
    }
    if (tagMatches.length > 0) {
      contextBonus += Math.min(0.12, tagMatches.length * 0.04);
    }

    // Combined score: Title is 88% of weight, context is up to 12% bonus
    const combinedScore = Math.min(1.0, bestTitleSignal * 0.88 + contextBonus);

    const isExact =
      bestTitleSignal >= 0.92 ||
      (inputTitleTokens.length >= 2 && titleOverlap.containment === 1.0 && titleDice >= 0.82);

    if (combinedScore >= threshold || isExact) {
      const allMatchedTerms = Array.from(
        new Set([...titleOverlap.matched, ...tagMatches, ...descOverlap.matched])
      );

      matches.push({
        task,
        similarityScore: combinedScore,
        matchedTerms: allMatchedTerms,
        isExactMatch: isExact,
        hasPreviousResolution: Boolean(task.status === "COMPLETED" && task.resolution_notes),
        previousResolutionNotes: task.resolution_notes || null,
        recurrenceCount: task.recurrence_count || 1,
      });
    }
  }

  // Sort by highest similarity
  return matches.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 5);
}
