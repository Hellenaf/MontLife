import { NextRequest, NextResponse } from "next/server";
import { triageInputWithGemini } from "@/services/geminiService";
import { findSimilarCompletedTasks, findDirectDbMatchForTriage } from "@/services/taskService";
import { fetchYouTubeResources } from "@/services/googleService";
import { calculateSlaDueDate } from "@/lib/sla";
import { aiCache } from "@/lib/aiCache";
import { GeminiTriageResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { raw_input } = await req.json();

    if (!raw_input || typeof raw_input !== "string" || raw_input.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Comando em linguagem natural não fornecido." },
        { status: 400 }
      );
    }

    const cleanInput = raw_input.trim();
    let triage: GeminiTriageResponse;
    let fromCache = false;
    let fromDb = false;
    let tokensSaved = 0;

    // 1. Direct DB Lookup: Reuse existing demand structure if identical or near-identical
    const dbMatch = await findDirectDbMatchForTriage(cleanInput);
    if (dbMatch) {
      fromDb = true;
      tokensSaved = 480;
      triage = {
        refined_title: dbMatch.title,
        structured_description: dbMatch.description,
        account_type: dbMatch.account_type,
        item_type: dbMatch.item_type || "task",
        category: dbMatch.category,
        priority: dbMatch.priority,
        extracted_due_date_iso: dbMatch.current_due_date,
        search_tags: dbMatch.tags || [],
        learning_queries: dbMatch.learning_resources?.search_queries || [],
        validation_steps: (dbMatch.validation_steps || []).map((v) => v.text),
      };
      // Store in memory cache for even faster subsequent hits
      aiCache.set(cleanInput, triage, 480);
    } else {
      // 2. In-Memory AI Cache Lookup: Check if previously triaged
      const cached = aiCache.get<GeminiTriageResponse>(cleanInput);
      if (cached) {
        fromCache = true;
        tokensSaved = cached.tokensSaved;
        triage = cached.data;
      } else {
        // 3. Fallback to Gemini AI invocation
        triage = await triageInputWithGemini(cleanInput);
        aiCache.set(cleanInput, triage, 450);
      }
    }

    // Step 2: Check for similar past resolved problems (Mont Ops Knowledge Base)
    const similarResolutions = await findSimilarCompletedTasks(
      triage.search_tags,
      cleanInput
    );

    // Step 3: Curate learning videos via YouTube Data API
    const learningResources = await fetchYouTubeResources(triage.learning_queries);

    // Step 4: Calculate SLA due date
    const calculatedDueDate = triage.extracted_due_date_iso || calculateSlaDueDate(triage.priority);

    return NextResponse.json({
      success: true,
      triage,
      calculated_due_date: calculatedDueDate,
      similar_resolutions: similarResolutions,
      learning_resources: learningResources,
      optimization: {
        from_cache: fromCache,
        from_db: fromDb,
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
