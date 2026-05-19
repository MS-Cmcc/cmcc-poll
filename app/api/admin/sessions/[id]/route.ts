import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/auth";
import { getServiceClient } from "@/lib/db/client";
import { getSessionById } from "@/lib/db/queries";
import { z } from "zod";

const PatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("next") }),
  z.object({ action: z.literal("prev") }),
  z.object({ action: z.literal("end") }),
]);

// PATCH /api/admin/sessions/[id] — next / prev / end
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid admin code" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid action" } },
      { status: 400 }
    );
  }

  const session = await getSessionById(id);
  if (!session) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found" } },
      { status: 404 }
    );
  }
  if (session.status !== "active") {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Session is not active" } },
      { status: 400 }
    );
  }

  const db = getServiceClient();
  const { action } = parsed.data;
  const total = (session.questions_snapshot as unknown[]).length;

  let update: Record<string, unknown> = {};

  if (action === "next") {
    const next = session.current_question_index + 1;
    if (next >= total) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Already at last question" } },
        { status: 400 }
      );
    }
    update = { current_question_index: next };
  } else if (action === "prev") {
    const prev = session.current_question_index - 1;
    if (prev < 0) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Already at first question" } },
        { status: 400 }
      );
    }
    update = { current_question_index: prev };
  } else if (action === "end") {
    update = { status: "ended", ended_at: new Date().toISOString() };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (db.from("sessions") as any)
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[sessions PATCH]", error);
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: "Failed to update session" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ session: updated });
}
