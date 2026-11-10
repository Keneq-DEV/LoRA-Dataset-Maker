import { NextRequest, NextResponse } from "next/server";
import { deleteEntry } from "@/lib/dataset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body as { name?: string };
    if (!name) {
      return NextResponse.json({ error: "Falta 'name'." }, { status: 400 });
    }
    await deleteEntry(name);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
