import { NextRequest, NextResponse } from "next/server";
import { triageInputWithGemini } from "@/services/geminiService";
import { findSimilarCompletedTasks } from "@/services/taskService";
import { fetchYouTubeResources } from "@/services/googleService";
import { calculateSlaDueDate } from "@/lib/sla";

export async function POST(req: NextRequest) {
  try {
    const { raw_input } = await req.json();

    if (!raw_input || typeof raw_input !== "string" || raw_input.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Comando em linguagem natural não fornecido." },
        { status: 400 }
      );
    }

    // Step 1: Run Gemini triage with structured output
    const triage = await triageInputWithGemini(raw_input.trim());

    // Step 2: Check for similar past resolved problems (Mont Ops Knowledge Base)
    const similarResolutions = await findSimilarCompletedTasks(
      triage.search_tags,
      raw_input
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
    });
  } catch (error: unknown) {
    console.error("POST /api/triage error:", error);
    return NextResponse.json(
      { success: false, error: "Falha no processamento de triagem pela IA" },
      { status: 500 }
    );
  }
}

