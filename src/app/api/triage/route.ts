import { NextRequest, NextResponse } from "next/server";
import { triageInputWithGemini } from "@/services/geminiService";
import { findSimilarCompletedTasks, getTasksFromDb } from "@/services/taskService";
import { fetchYouTubeResources } from "@/services/googleService";
import { calculateSlaDueDate } from "@/lib/sla";
import { aiCache } from "@/lib/aiCache";
import { findSimilarTasks } from "@/lib/taskDeduplication";
import { getSessionUser } from "@/lib/session";
import { GeminiTriageResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;
    const { raw_input, force_fresh_ai } = await req.json();

    if (!raw_input || typeof raw_input !== "string" || raw_input.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Comando em linguagem natural não fornecido." },
        { status: 400 }
      );
    }

    const cleanInput = raw_input.trim();
    let triage: GeminiTriageResponse;
    let fromCache = false;
    let tokensSaved = 0;

    // 1. In-Memory AI Cache Lookup: Check if this exact input was recently triaged (unless user forced fresh)
    if (!force_fresh_ai) {
      const cached = aiCache.get<GeminiTriageResponse>(cleanInput);
      if (cached) {
        fromCache = true;
        tokensSaved = cached.tokensSaved;
        triage = cached.data;
      } else {
        triage = await triageInputWithGemini(cleanInput);
        aiCache.set(cleanInput, triage, 450);
      }
    } else {
      triage = await triageInputWithGemini(cleanInput);
      aiCache.set(cleanInput, triage, 450);
    }

    // 2. High-precision semantic deduplication & similarity scan against database
    const allDbTasks = await getTasksFromDb(userId);
    const similarTasks = findSimilarTasks(
      triage.refined_title || cleanInput,
      triage.structured_description || "",
      allDbTasks,
      0.38
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
