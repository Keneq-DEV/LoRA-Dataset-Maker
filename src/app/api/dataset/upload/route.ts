import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import {
  ensureDatasetDir,
  DATASET_DIR,
  INPUT_IMAGE_EXT,
  OUTPUT_IMAGE_EXT,
} from "@/lib/dataset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll("files");
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No se recibieron archivos." },
        { status: 400 },
      );
    }
    await ensureDatasetDir();

    // Build the set of existing file names.
    const existingSync = new Set<string>();
    const entries = await fs
      .readdir(DATASET_DIR, { withFileTypes: true })
      .catch(() => []);
    for (const e of entries) {
      if (e.isFile()) existingSync.add(e.name);
    }

    let saved = 0;
    let replaced = 0;
    let converted = 0;

    for (const file of files) {
      if (!(file instanceof File)) continue;
      const safeName = file.name.replace(/[\\/:*?"<>|]/g, "_");
      const ext = path.extname(safeName).toLowerCase();

      // .txt files: save as-is.
      if (ext === ".txt") {
        const wasExisting = existingSync.has(safeName);
        const buf = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(path.join(DATASET_DIR, safeName), buf);
        existingSync.add(safeName);
        if (wasExisting) replaced++;
        else saved++;
        continue;
      }

      // Images: convert to PNG if needed.
      if (!INPUT_IMAGE_EXT.includes(ext)) continue;

      const baseName = path.basename(safeName, ext);
      const pngName = `${baseName}${OUTPUT_IMAGE_EXT}`;
      const wasExisting = existingSync.has(pngName);
      const dest = path.join(DATASET_DIR, pngName);
      const buf = Buffer.from(await file.arrayBuffer());

      if (ext === OUTPUT_IMAGE_EXT) {
        // Already PNG — save directly.
        await fs.writeFile(dest, buf);
      } else {
        // Try to convert to PNG with sharp. If it fails (unsupported
        // format), save the original as-is.
        try {
          await sharp(buf).png({ compressionLevel: 9 }).toFile(dest);
          converted++;
        } catch {
          await fs.writeFile(path.join(DATASET_DIR, safeName), buf);
        }
      }
      existingSync.add(pngName);
      if (wasExisting) replaced++;
      else saved++;
    }

    return NextResponse.json({ ok: true, saved, replaced, converted });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
