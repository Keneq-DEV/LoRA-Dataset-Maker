import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { getImagePath } from "@/lib/dataset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get("name");
    if (!name) {
      return NextResponse.json(
        { error: "Falta 'name'." },
        { status: 400 },
      );
    }
    const imgPath = getImagePath(name);

    // Read file stats for ETag (modification time + size).
    const stat = await fs.stat(imgPath);
    const etag = `"${name}-${stat.size}-${stat.mtimeMs}"`;

    // If the client sent a matching If-None-Match, respond 304 (not modified)
    // — the browser uses its cached copy. This makes "Actualizar" instant
    // because images that haven't changed don't get re-downloaded.
    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=300, must-revalidate",
        },
      });
    }

    const buf = await fs.readFile(imgPath);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        ETag: etag,
        // Allow browser caching for 5 minutes, but revalidate with ETag.
        // If the image file changes (different mtime/size), the ETag changes
        // and the browser fetches the new version.
        "Cache-Control": "public, max-age=300, must-revalidate",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 404 });
  }
}
