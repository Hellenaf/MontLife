import { NextResponse } from "next/server";
import { getTasksFromDb, saveTaskToDb } from "@/services/taskService";
import { categorizeTaskWithAI } from "@/services/geminiService";
import { fetchYouTubeResources } from "@/services/googleService";

export async function POST() {
  try {
    const tasks = await getTasksFromDb();
    let updatedCount = 0;

    for (const task of tasks) {
      const aiData = await categorizeTaskWithAI(
        task.title,
        task.description,
        task.account_type
      );

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

    const updatedTasks = await getTasksFromDb();
    const uniqueCategories = Array.from(new Set(updatedTasks.map((t) => t.category).filter(Boolean)));

    return NextResponse.json({
      success: true,
      message: `IA organizou ${updatedCount} tarefas com sucesso!`,
      updated_count: updatedCount,
      categories: uniqueCategories,
    });
  } catch (error: unknown) {
    console.error("POST /api/tasks/ai-categorize error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao categorizar tarefas com IA" },
      { status: 500 }
    );
  }
}
