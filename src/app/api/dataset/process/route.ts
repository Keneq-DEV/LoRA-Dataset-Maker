import { NextRequest, NextResponse } from "next/server";
import { processDataset, ProcessOptions } from "@/lib/dataset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const opts: ProcessOptions = {
      padWidth: typeof body.padWidth === "number" ? body.padWidth : 0,
      startIndex: typeof body.startIndex === "number" ? body.startIndex : 0,
    };
    const result = await processDataset(opts);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
