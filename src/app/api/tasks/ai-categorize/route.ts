import { NextResponse } from "next/server";
import { getTasksFromDb, saveTaskToDb } from "@/services/taskService";
import { categorizeTaskWithAI } from "@/services/geminiService";
import { fetchYouTubeResources } from "@/services/googleService";
import { aiCache } from "@/lib/aiCache";

export async function POST() {
  try {
    const tasks = await getTasksFromDb();
    let updatedCount = 0;
    let tokensSaved = 0;

    for (const task of tasks) {
      const cacheKey = `cat:${task.title}:${task.description || ""}:${task.account_type}`;
      const cached = aiCache.get<any>(cacheKey);

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
        aiCache.set(cacheKey, aiData, 300);
      }

      let hasChanges = false;

      if (task.category !== aiData.category) {
        task.category = aiData.category;
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
        await saveTaskToDb(task);
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Categorização concluída. ${updatedCount} tarefas atualizadas com categorias autônomas e tags.`,
      updated_count: updatedCount,
      tokens_saved_estimate: tokensSaved,
    });
  } catch (error: unknown) {
    console.error("POST /api/tasks/ai-categorize error:", error);
    return NextResponse.json(
      { success: false, error: "Falha na auto-categorização das tarefas" },
      { status: 500 }
    );
  }
}
