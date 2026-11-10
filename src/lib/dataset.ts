import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

// Working directory where the active dataset lives.
export const DATASET_DIR = path.join(process.cwd(), "datasets");

// Image extensions we accept as input.
export const INPUT_IMAGE_EXT = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
  ".avif",
  ".jxl",
];

// We always normalize outputs to PNG.
export const OUTPUT_IMAGE_EXT = ".png";

export interface DatasetEntry {
  name: string; // base name without extension (e.g. "0")
  image: string; // image file name (e.g. "0.png")
  text: string | null; // text file name if exists (e.g. "0.txt")
  hasText: boolean;
  textPreview: string | null;
  mtime: number; // last modification time (ms) — used for cache-busting
}

export interface DatasetList {
  entries: DatasetEntry[];
  total: number;
  withText: number;
  withoutText: number;
  nonPng: number;
}

/**
 * Ensure the dataset directory exists.
 */
export async function ensureDatasetDir(): Promise<void> {
  await fs.mkdir(DATASET_DIR, { recursive: true });
}

/**
 * Return the absolute path of the working dataset directory (for display
 * in the UI so the user knows where their files live).
 */
export function getDatasetDir(): string {
  return DATASET_DIR;
}

/**
 * Recursively scan a source directory and copy all image files (and any
 * matching .txt files) into the working dataset directory. Sub-folders are
 * flattened so the result is a flat dataset.
 *
 * Non-PNG images are automatically converted to PNG on load using sharp,
 * so the dataset only ever contains .png files. The original format file is
 * never copied — only the converted .png lands in the dataset.
 *
 * Behavior on name collisions: if a file with the same name already exists
 * in the dataset, it is REPLACED (overwritten). This is the expected
 * behavior — loading the same folder twice does not duplicate files.
 */
export async function scanSourceDir(srcDir: string): Promise<{
  copied: number;
  replaced: number;
  converted: number;
  skipped: number;
}> {
  const abs = path.resolve(srcDir);
  let stat;
  try {
    stat = await fs.stat(abs);
  } catch {
    throw new Error(`No se pudo acceder a la carpeta: ${abs}`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`La ruta no es una carpeta: ${abs}`);
  }

  await ensureDatasetDir();
  const existing = new Set(await listAllFiles(DATASET_DIR));

  let copied = 0;
  let replaced = 0;
  let converted = 0;
  let skipped = 0;

  const stack: string[] = [abs];
  while (stack.length) {
    const current = stack.pop()!;
    const items = await fs.readdir(current, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(current, item.name);
      if (item.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!item.isFile()) continue;
      const ext = path.extname(item.name).toLowerCase();
      const isTxt = ext === ".txt";
      const isImage = INPUT_IMAGE_EXT.includes(ext);
      if (!isTxt && !isImage) {
        skipped++;
        continue;
      }

      if (isTxt) {
        // Copy .txt as-is.
        const dest = path.join(DATASET_DIR, item.name);
        const wasExisting = existing.has(item.name);
        await fs.copyFile(full, dest);
        existing.add(item.name);
        if (wasExisting) replaced++;
        else copied++;
        continue;
      }

      // Image: convert to PNG if needed.
      const baseName = path.basename(item.name, ext);
      const pngName = `${baseName}.png`;
      const dest = path.join(DATASET_DIR, pngName);
      const wasExisting = existing.has(pngName);

      if (ext === OUTPUT_IMAGE_EXT) {
        // Already PNG — just copy.
        await fs.copyFile(full, dest);
      } else {
        // Try to convert to PNG with sharp. If sharp can't handle the
        // format (e.g. some GIF/BMP variants), fall back to copying the
        // original file as-is — the process step will retry conversion.
        try {
          await sharp(full).png({ compressionLevel: 9 }).toFile(dest);
          converted++;
        } catch {
          // Sharp failed — copy original with its original extension.
          // The file won't show in the grid (grid only lists known image
          // extensions) but will be picked up by processDataset which has
          // its own retry logic.
          const origDest = path.join(DATASET_DIR, item.name);
          await fs.copyFile(full, origDest);
          existing.add(item.name);
        }
      }
      existing.add(pngName);
      if (wasExisting) replaced++;
      else copied++;
    }
  }

  return { copied, replaced, converted, skipped };
}

async function listAllFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * List the current dataset entries (image + matching .txt if any).
 */
export async function listDataset(): Promise<DatasetList> {
  await ensureDatasetDir();
  const files = await listAllFiles(DATASET_DIR);

  const imageFiles = files.filter((f) =>
    INPUT_IMAGE_EXT.includes(path.extname(f).toLowerCase()),
  );
  const txtFiles = new Set(
    files.filter((f) => path.extname(f).toLowerCase() === ".txt"),
  );

  // Sort images: PNG files that look numeric first, then by name.
  imageFiles.sort((a, b) => {
    const an = parseInt(path.basename(a, path.extname(a)), 10);
    const bn = parseInt(path.basename(b, path.extname(b)), 10);
    const aNum = Number.isNaN(an) ? null : an;
    const bNum = Number.isNaN(bn) ? null : bn;
    if (aNum !== null && bNum !== null) return aNum - bNum;
    if (aNum !== null) return -1;
    if (bNum !== null) return 1;
    return a.localeCompare(b);
  });

  const entries: DatasetEntry[] = [];
  let withText = 0;
  let withoutText = 0;
  let nonPng = 0;

  for (const img of imageFiles) {
    const baseName = path.basename(img, path.extname(img));
    const txtName = `${baseName}.txt`;
    const hasText = txtFiles.has(txtName);
    let textPreview: string | null = null;
    if (hasText) {
      try {
        const content = await fs.readFile(
          path.join(DATASET_DIR, txtName),
          "utf8",
        );
        textPreview = content.trim().slice(0, 120);
        withText++;
      } catch {
        textPreview = null;
      }
    } else {
      withoutText++;
    }
    if (path.extname(img).toLowerCase() !== OUTPUT_IMAGE_EXT) {
      nonPng++;
    }
    // Get modification time for cache-busting in the frontend.
    let mtime = 0;
    try {
      const stat = await fs.stat(path.join(DATASET_DIR, img));
      mtime = stat.mtimeMs;
    } catch {}
    entries.push({
      name: baseName,
      image: img,
      text: hasText ? txtName : null,
      hasText,
      textPreview,
      mtime,
    });
  }

  return {
    entries,
    total: entries.length,
    withText,
    withoutText,
    nonPng,
  };
}

/**
 * Get the absolute path of an image file by name.
 */
export function getImagePath(imageName: string): string {
  // Block path traversal.
  if (imageName.includes("/") || imageName.includes("\\") || imageName.includes("..")) {
    throw new Error("Nombre de archivo inválido");
  }
  return path.join(DATASET_DIR, imageName);
}

/**
 * Read a .txt file content by base name.
 */
export async function readTextFile(baseName: string): Promise<string> {
  if (baseName.includes("/") || baseName.includes("\\") || baseName.includes("..")) {
    throw new Error("Nombre de archivo inválido");
  }
  const txtPath = path.join(DATASET_DIR, `${baseName}.txt`);
  try {
    return await fs.readFile(txtPath, "utf8");
  } catch {
    return "";
  }
}

/**
 * Write a .txt file for the given base name.
 */
export async function writeTextFile(
  baseName: string,
  content: string,
): Promise<void> {
  if (baseName.includes("/") || baseName.includes("\\") || baseName.includes("..")) {
    throw new Error("Nombre de archivo inválido");
  }
  await ensureDatasetDir();
  const txtPath = path.join(DATASET_DIR, `${baseName}.txt`);
  await fs.writeFile(txtPath, content, "utf8");
}

export interface ProcessOptions {
  /** Zero-pad width. 0 means no padding (0, 1, 2...). 3 means 000, 001... */
  padWidth?: number;
  /** Starting index. Default 0. */
  startIndex?: number;
}

export interface ProcessResult {
  renamed: number;
  converted: number;
  textCreated: number;
  textPreserved: number;
  total: number;
}

/**
 * Core operation: renumber every image sequentially, convert non-PNG to PNG,
 * and ensure every image has a matching .txt file (preserve existing content,
 * create empty file when missing).
 */
export async function processDataset(
  opts: ProcessOptions = {},
): Promise<ProcessResult> {
  await ensureDatasetDir();
  const pad = opts.padWidth ?? 0;
  const start = opts.startIndex ?? 0;

  const list = await listDataset();
  if (list.entries.length === 0) {
    return {
      renamed: 0,
      converted: 0,
      textCreated: 0,
      textPreserved: 0,
      total: 0,
    };
  }

  // Determine automatic padding if user did not specify.
  // Auto mode: minimum 3 digits (000..999), grows automatically when the
  // dataset exceeds the capacity of the current padding. The whole set is
  // always re-padded from scratch, so going from 999 to 1000 images
  // renumbers everything from 000.png..999.png to 0000.png..1000.png.
  let effectivePad = pad;
  if (effectivePad === 0) {
    const count = list.entries.length;
    const maxIndex = start + count - 1;
    const digitsNeeded = String(maxIndex).length;
    effectivePad = Math.max(3, digitsNeeded);
  }

  // We rename to temporary names first to avoid collisions like 0.png -> 0.png.
  const tempDir = path.join(DATASET_DIR, `_tmp_${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  let renamed = 0;
  let converted = 0;
  let textCreated = 0;
  let textPreserved = 0;

  // Track final names so we can detect collisions (shouldn't happen, but safety).
  const usedNames = new Set<string>();

  for (let i = 0; i < list.entries.length; i++) {
    const entry = list.entries[i];
    const newIndex = start + i;
    const newName = String(newIndex).padStart(effectivePad, "0");
    const newImageName = `${newName}${OUTPUT_IMAGE_EXT}`;
    const newTxtName = `${newName}.txt`;

    // Avoid overwriting an existing different file that already has this name
    // (e.g. user already had 0.png and we're renaming 1.png to 0.png).
    if (usedNames.has(newImageName)) {
      // Append suffix to disambiguate.
      let k = 1;
      let altName = `${newName}_dup${k}`;
      while (usedNames.has(`${altName}${OUTPUT_IMAGE_EXT}`)) {
        k++;
        altName = `${newName}_dup${k}`;
      }
      // Use altName instead.
      const altImage = `${altName}${OUTPUT_IMAGE_EXT}`;
      const altTxt = `${altName}.txt`;
      await processOne(
        entry,
        altName,
        altImage,
        altTxt,
        tempDir,
        (c) => { converted += c; },
        (c) => { textCreated += c; },
        (c) => { textPreserved += c; },
      );
      usedNames.add(altImage);
      usedNames.add(altTxt);
      renamed++;
      continue;
    }

    await processOne(
      entry,
      newName,
      newImageName,
      newTxtName,
      tempDir,
      (c) => { converted += c; },
      (c) => { textCreated += c; },
      (c) => { textPreserved += c; },
    );
    usedNames.add(newImageName);
    usedNames.add(newTxtName);
    renamed++;
  }

  // Move processed files back, removing the originals.
  // First remove all original images + their txt files from dataset dir.
  for (const entry of list.entries) {
    try {
      await fs.unlink(path.join(DATASET_DIR, entry.image));
    } catch {}
    if (entry.text) {
      try {
        await fs.unlink(path.join(DATASET_DIR, entry.text));
      } catch {}
    }
  }

  // Move new files in.
  const newFiles = await fs.readdir(tempDir);
  for (const f of newFiles) {
    await fs.rename(path.join(tempDir, f), path.join(DATASET_DIR, f));
  }
  await fs.rmdir(tempDir).catch(() => {});

  return {
    renamed,
    converted,
    textCreated,
    textPreserved,
    total: list.entries.length,
  };
}

async function processOne(
  entry: DatasetEntry,
  newName: string,
  newImageName: string,
  newTxtName: string,
  tempDir: string,
  onConvert: (delta: number) => void,
  onTextCreated: (delta: number) => void,
  onTextPreserved: (delta: number) => void,
): Promise<void> {
  const srcImg = path.join(DATASET_DIR, entry.image);
  const dstImg = path.join(tempDir, newImageName);

  const ext = path.extname(entry.image).toLowerCase();
  if (ext === OUTPUT_IMAGE_EXT) {
    // Just copy/rename.
    await fs.copyFile(srcImg, dstImg);
  } else {
    // Convert to PNG with sharp. If it fails, copy the original file
    // with its original extension (it won't be .png but at least it's
    // not lost).
    try {
      await sharp(srcImg).png({ compressionLevel: 9 }).toFile(dstImg);
      onConvert(1);
    } catch {
      const origDst = path.join(tempDir, `${newName}${ext}`);
      await fs.copyFile(srcImg, origDst);
    }
  }

  // Handle the .txt side.
  if (entry.text) {
    const srcTxt = path.join(DATASET_DIR, entry.text);
    const dstTxt = path.join(tempDir, newTxtName);
    await fs.copyFile(srcTxt, dstTxt);
    onTextPreserved(1);
  } else {
    // Create an empty .txt for the new image.
    const dstTxt = path.join(tempDir, newTxtName);
    await fs.writeFile(dstTxt, "", "utf8");
    onTextCreated(1);
  }
}

/**
 * Delete an image and its companion .txt.
 */
export async function deleteEntry(imageName: string): Promise<void> {
  if (imageName.includes("/") || imageName.includes("\\") || imageName.includes("..")) {
    throw new Error("Nombre de archivo inválido");
  }
  const imgPath = path.join(DATASET_DIR, imageName);
  try {
    await fs.unlink(imgPath);
  } catch {}
  const baseName = path.basename(imageName, path.extname(imageName));
  const txtPath = path.join(DATASET_DIR, `${baseName}.txt`);
  try {
    await fs.unlink(txtPath);
  } catch {}
}

/**
 * Apply the same prompt content to every .txt file in the dataset.
 * Useful for setting a base prompt across all images.
 */
export async function applyPromptToAll(
  content: string,
  mode: "overwrite" | "append" | "only-empty",
): Promise<{ updated: number; total: number }> {
  const list = await listDataset();
  let updated = 0;
  for (const entry of list.entries) {
    const txtPath = path.join(DATASET_DIR, `${entry.name}.txt`);
    if (mode === "overwrite") {
      await fs.writeFile(txtPath, content, "utf8");
      updated++;
    } else if (mode === "append") {
      const existing = entry.hasText
        ? await fs.readFile(txtPath, "utf8")
        : "";
      const merged = existing.trim()
        ? `${existing.trim()}\n${content}`
        : content;
      await fs.writeFile(txtPath, merged, "utf8");
      updated++;
    } else if (mode === "only-empty") {
      if (!entry.hasText || (entry.textPreview ?? "").length === 0) {
        await fs.writeFile(txtPath, content, "utf8");
        updated++;
      }
    }
  }
  return { updated, total: list.total };
}
