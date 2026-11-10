import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { getDatasetDir } from "@/lib/dataset";

const execAsync = promisify(exec);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const dir = getDatasetDir();
    const platform = process.platform;
    let cmd: string;
    if (platform === "win32") {
      // Windows: open with Explorer. Quote the path.
      cmd = `explorer.exe "${dir}"`;
    } else if (platform === "darwin") {
      // macOS: open with Finder.
      cmd = `open "${dir}"`;
    } else {
      // Linux and others.
      cmd = `xdg-open "${dir}"`;
    }
    await execAsync(cmd);
    return NextResponse.json({ ok: true, dir, platform });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
