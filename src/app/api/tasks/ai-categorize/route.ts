import { NextRequest, NextResponse } from "next/server";
import { getTasksFromDb, saveTaskToDb } from "@/services/taskService";
import { categorizeTaskWithAI } from "@/services/geminiService";
import { fetchYouTubeResources } from "@/services/googleService";
import { aiCache } from "@/lib/aiCache";
import { getSessionUser } from "@/lib/session";
import { normalizeCategory } from "@/lib/categories";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const tasks = await getTasksFromDb(userId);
    let updatedCount = 0;
    let tokensSaved = 0;

    // Filter to ONLY process tasks that genuinely need categorization (generic or missing tags)
    // Skips already established categories to prevent redundant token burning
    // Limit to max 5 tasks per batch to ensure conscious, controlled API consumption
    const tasksToProcess = tasks
      .filter((t) => {
        const isGeneric =
          !t.category ||
          t.category === "Geral" ||
          t.category === "Operações & Geral" ||
          t.category === "Suporte & Demandas" ||
          !t.tags ||
          t.tags.length === 0 ||
          (t.tags.length === 1 && t.tags[0].includes("google-task"));
        return isGeneric;
      })
      .slice(0, 5);

    for (const task of tasksToProcess) {
      const cacheKey = `cat:${task.title}:${task.description || ""}:${task.account_type}`;
      const cached = await aiCache.getAsync<any>(cacheKey);

      let aiData;
      if (cached) {
        aiData = cached.data;
        tokensSaved += cached.tokensSaved;
      } else {
        aiData = await categorizeTaskWithAI(
          task.title,
          task.description,
          task.account_type
        );
        aiCache.set(cacheKey, aiData, 75);
      }

      let hasChanges = false;

      const normalizedCategory = normalizeCategory(aiData.category);
      if (task.category !== normalizedCategory) {
        task.category = normalizedCategory;
        hasChanges = true;
      }

      // Merge or update tags
      const currentTags = new Set(task.tags || []);
      for (const t of aiData.tags) {
        currentTags.add(t);
      }
      currentTags.delete("google-tasks");
      currentTags.delete("google-tasks-sync");

      const newTagsArray = Array.from(currentTags);
      if (newTagsArray.join(",") !== (task.tags || []).join(",")) {
        task.tags = newTagsArray;
        hasChanges = true;
      }

      // Ensure YouTube learning resources are populated
      if (!task.learning_resources?.youtube_videos?.length) {
        task.learning_resources = await fetchYouTubeResources(aiData.learning_queries);
        hasChanges = true;
      }

      if (hasChanges) {
        await saveTaskToDb(task, userId);
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      updated_count: updatedCount,
      evaluated_count: tasksToProcess.length,
      tokens_saved_estimate: tokensSaved,
      message: `${updatedCount} tarefas refinadas com sucesso.`,
    });
  } catch (error: unknown) {
    console.error("POST /api/tasks/ai-categorize error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao categorizar tarefas com IA" },
      { status: 500 }
    );
  }
}
