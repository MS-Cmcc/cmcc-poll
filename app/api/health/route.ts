import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/client";

export async function GET() {
  try {
    const db = getServiceClient();
    const { error } = await db.from("sessions").select("id", { head: true, count: "exact" });
    if (error) throw error;
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch (e) {
    console.error("[health]", e);
    return NextResponse.json({ status: "error", message: (e as Error).message }, { status: 503 });
  }
}
