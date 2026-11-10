import { NextRequest, NextResponse } from "next/server";
import { triageInputWithGeminiDetailed } from "@/services/geminiService";
import { findSimilarCompletedTasks, getTasksFromDb } from "@/services/taskService";
import { fetchYouTubeResources } from "@/services/googleService";
import { calculateSlaDueDate } from "@/lib/sla";
import { findSimilarTasks } from "@/lib/taskDeduplication";
import { getSessionUser } from "@/lib/session";
import { GeminiTriageResponse } from "@/types";

// In-memory sliding window rate limiter: max 25 calls per user per minute
const triageRateLimits = new Map<string, number[]>();

function checkTriageRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const timestamps = triageRateLimits.get(userId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);
  if (validTimestamps.length >= 25) {
    return false;
  }
  validTimestamps.push(now);
  triageRateLimits.set(userId, validTimestamps);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Não autorizado. Faça login para usar a triagem por IA." },
        { status: 401 }
      );
    }

    if (!checkTriageRateLimit(userId)) {
      return NextResponse.json(
        { success: false, error: "Limite de requisições por minuto atingido. Aguarde alguns instantes." },
        { status: 429 }
      );
    }

    const { raw_input, force_fresh_ai } = await req.json();

    if (!raw_input || typeof raw_input !== "string" || raw_input.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Comando em linguagem natural não fornecido." },
        { status: 400 }
      );
    }

    const cleanInput = raw_input.trim();

    // 1. Run Gemini Triage (versioned cache, respects force_fresh_ai, never caches fallback errors)
    const triageResult = await triageInputWithGeminiDetailed(cleanInput, undefined, {
      forceFresh: Boolean(force_fresh_ai),
    });
    const triage: GeminiTriageResponse = triageResult.triage;
    const fromCache = triageResult.source === "cache";
    const aiUsed = triageResult.source === "gemini" || triageResult.source === "cache";
    const tokensSaved = fromCache ? 450 : 0;

    if (triageResult.source === "fallback" && triageResult.errorReason) {
      console.warn("[POST /api/triage] Fallback heuristic used:", triageResult.errorReason);
    }

    // 2. High-precision semantic deduplication & similarity scan against database
    const allDbTasks = await getTasksFromDb(userId);
    const similarTasks = findSimilarTasks(
      triage.refined_title || cleanInput,
      triage.structured_description || "",
      allDbTasks,
      0.65
    );

    // 3. Similar past resolved problems for knowledge base suggestions
    const similarResolutions = await findSimilarCompletedTasks(
      triage.search_tags || [],
      cleanInput,
      userId
    );

    // 4. Curate learning resources / documentation & YouTube
    const learningResources = await fetchYouTubeResources(triage.learning_queries || []);

    // 5. Always calculate SLA due date relative to the CURRENT moment (or future explicit date)
    const isFutureIso = (iso?: string) => {
      if (!iso) return false;
      try {
        return new Date(iso).getTime() > Date.now();
      } catch {
        return false;
      }
    };

    const calculatedDueDate =
      (triage.extracted_due_date_iso && isFutureIso(triage.extracted_due_date_iso))
        ? triage.extracted_due_date_iso
        : calculateSlaDueDate(triage.priority || "P3");

    return NextResponse.json({
      success: true,
      triage,
      calculated_due_date: calculatedDueDate,
      similar_tasks: similarTasks,
      similar_resolutions: similarResolutions,
      learning_resources: learningResources,
      optimization: {
        from_cache: fromCache,
        from_db: false,
        tokens_saved: tokensSaved,
        ai_used: aiUsed,
        ai_source: triageResult.source,
        model_used: triageResult.modelUsed || null,
        warning: triageResult.errorReason || null,
      },
    });
  } catch (error: unknown) {
    console.error("POST /api/triage error:", error);
    return NextResponse.json(
      { success: false, error: "Falha no processamento de triagem pela IA" },
      { status: 500 }
    );
  }
}
