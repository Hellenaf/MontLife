import { NextRequest, NextResponse } from "next/server";
import { generateExecutiveSummary } from "@/services/geminiService";
import { Task, AccountType } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { tasks, period_label, account_type } = await req.json();

    if (!Array.isArray(tasks)) {
      return NextResponse.json(
        { success: false, error: "Array de tarefas inválido." },
        { status: 400 }
      );
    }

    const summary = await generateExecutiveSummary(
      tasks as Task[],
      period_label || "Período Selecionado",
      (account_type as AccountType) || "work"
    );

    return NextResponse.json({ success: true, summary });
  } catch (error: unknown) {
    console.error("POST /api/report/summary error:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao gerar síntese executiva" },
      { status: 500 }
    );
  }
}

