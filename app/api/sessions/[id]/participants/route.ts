import { NextRequest, NextResponse } from "next/server";
import { getSessionById } from "@/lib/db/queries";
import { upsertParticipant } from "@/lib/db/queries";
import { z } from "zod";

const BodySchema = z.object({
  clientToken: z.string().uuid(),
});

// POST /api/sessions/[id]/participants — join or re-join a session
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "clientToken (UUID) is required" } },
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
      { error: { code: "SESSION_NOT_ACTIVE", message: "Session is not active" } },
      { status: 400 }
    );
  }

  const participant = await upsertParticipant(id, parsed.data.clientToken);
  return NextResponse.json({ participantId: participant.id });
}
