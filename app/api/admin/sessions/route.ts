import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/auth";
import { getServiceClient } from "@/lib/db/client";
import { parseQuestionsMarkdown } from "@/lib/md/parser";
import { readFileSync } from "fs";
import { join } from "path";
import { randomInt } from "crypto";

function generateCode(): string {
  return String(randomInt(100000, 999999));
}

// POST /api/admin/sessions — create a new session
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid admin code" } },
      { status: 401 }
    );
  }

  let mdContent: string;
  try {
    mdContent = readFileSync(join(process.cwd(), "questions.md"), "utf-8");
  } catch {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "questions.md not found in repo root" } },
      { status: 400 }
    );
  }

  const { questions, errors } = parseQuestionsMarkdown(mdContent);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "questions.md has errors", details: errors } },
      { status: 400 }
    );
  }
  if (questions.length === 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "questions.md has no valid questions" } },
      { status: 400 }
    );
  }

  const db = getServiceClient();

  // Generate unique 6-digit code
  let code = generateCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data } = await db.from("sessions").select("id").eq("code", code).maybeSingle();
    if (!data) break;
    code = generateCode();
    attempts++;
  }

  const { data: session, error } = await db
    .from("sessions")
    .insert({
      code,
      questions_source: "questions.md",
      questions_snapshot: questions as unknown as never,
      current_question_index: 0,
      status: "active",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[sessions POST]", error);
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to create session" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ session }, { status: 201 });
}
