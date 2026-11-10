import { NextRequest, NextResponse } from "next/server";
import { scanSourceDir } from "@/lib/dataset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path: srcPath } = body as { path?: string };
    if (!srcPath || typeof srcPath !== "string") {
      return NextResponse.json(
        { error: "Se requiere 'path' con la ruta de la carpeta." },
        { status: 400 },
      );
    }
    const result = await scanSourceDir(srcPath);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
