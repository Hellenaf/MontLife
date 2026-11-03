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

/**
 * Normalizes text for robust token-level similarity comparison
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

const STOP_WORDS = new Set([
  "para", "com", "uma", "este", "esta", "isso", "pelo", "pela",
  "onde", "quando", "como", "fazer", "deve", "sobre", "qual",
  "mais", "muito", "estou", "está", "estao", "foram", "pelo",
  "preciso", "solicito", "favor", "urgente", "favor", "demanda"
]);

/**
 * Computes Jaccard word token overlap between two strings
 */
function jaccardSimilarity(tokensA: string[], tokensB: string[]): { score: number; common: string[] } {
  if (tokensA.length === 0 || tokensB.length === 0) return { score: 0, common: [] };

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection: string[] = [];

  for (const token of setA) {
    if (setB.has(token)) {
      intersection.push(token);
    }
  }

  const union = new Set([...tokensA, ...tokensB]);
  const score = union.size > 0 ? intersection.length / union.size : 0;
  return { score, common: intersection };
}

/**
 * Normalized substring match bonus
 */
function substringBonus(a: string, b: string): number {
  const cleanA = a.toLowerCase().trim();
  const cleanB = b.toLowerCase().trim();
  if (!cleanA || !cleanB) return 0;

  if (cleanA === cleanB) return 1.0;
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) {
    const minLen = Math.min(cleanA.length, cleanB.length);
    const maxLen = Math.max(cleanA.length, cleanB.length);
    return (minLen / maxLen) * 0.9;
  }
  return 0;
}

/**
 * Scans existing tasks for duplicates or semantically similar items.
 * Used during task creation to warn the user, suggest past resolutions,
 * and allow one-click recurrence registration.
 */
export function findSimilarTasks(
  inputTitle: string,
  inputDescription: string = "",
  existingTasks: Task[] = [],
  threshold: number = 0.4
): SimilarTaskMatch[] {
  if (!inputTitle || existingTasks.length === 0) return [];

  const inputTokens = tokenize(`${inputTitle} ${inputDescription}`);
  const matches: SimilarTaskMatch[] = [];

  for (const task of existingTasks) {
    const taskTokens = tokenize(`${task.title} ${task.description || ""} ${task.raw_input || ""}`);
    const { score: jaccardScore, common } = jaccardSimilarity(inputTokens, taskTokens);
    const titleSubScore = substringBonus(inputTitle, task.title);

    // Tag match bonus
    const taskTags = (task.tags || []).map((t) => t.toLowerCase());
    const tagMatches = inputTokens.filter((tok) => taskTags.some((tag) => tag.includes(tok)));

    // Combined weighted score
    const combinedScore = Math.min(
      1.0,
      jaccardScore * 0.55 + titleSubScore * 0.35 + (tagMatches.length > 0 ? 0.15 : 0)
    );

    if (combinedScore >= threshold || titleSubScore >= 0.75) {
      matches.push({
        task,
        similarityScore: combinedScore,
        matchedTerms: Array.from(new Set([...common, ...tagMatches])),
        isExactMatch: titleSubScore >= 0.95 || combinedScore >= 0.9,
        hasPreviousResolution: Boolean(task.status === "COMPLETED" && task.resolution_notes),
        previousResolutionNotes: task.resolution_notes || null,
        recurrenceCount: task.recurrence_count || 1,
      });
    }
  }

  // Sort by highest similarity
  return matches.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 5);
}

