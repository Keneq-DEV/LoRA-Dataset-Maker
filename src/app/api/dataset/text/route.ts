import { NextRequest, NextResponse } from "next/server";
import { readTextFile, writeTextFile } from "@/lib/dataset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const base = req.nextUrl.searchParams.get("name");
    if (!base) {
      return NextResponse.json({ error: "Falta 'name'." }, { status: 400 });
    }
    const content = await readTextFile(base);
    return NextResponse.json({ content });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, content } = body as { name?: string; content?: string };
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Falta 'name'." }, { status: 400 });
    }
    await writeTextFile(name, content ?? "");
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
