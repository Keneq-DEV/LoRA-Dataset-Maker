# LoRA Dataset Maker

A professional, dark-themed tool for organizing image datasets for LoRA training. Rename, convert, and caption your images — all in one place, with a clean monochrome UI.

![LoRA Dataset Maker](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-teal) ![Sharp](https://img.shields.io/badge/Sharp-latest-green)

---

## Features

### Dataset Management
- **Load folders** — point the app at any folder on your machine; images and `.txt` files are copied into the workspace
- **Upload files** — drag-and-drop or file picker to add individual images
- **Auto-convert to PNG** — JPG, JPEG, WEBP, GIF, BMP, TIFF, AVIF, and JXL are automatically converted to PNG on load using `sharp`
- **No duplication** — loading the same folder twice replaces files instead of creating `_1` copies

### Process & Renumber
- **Sequential renaming** — all images are renamed to a clean numeric sequence (`000.png`, `001.png`, `002.png`...)
- **Smart padding** — auto mode uses a minimum of 3 digits (`000`–`999`), and automatically grows to 4 digits (`0000`–`1000`) when the dataset exceeds 999 images, re-padding the entire set
- **Padding options** — auto, no padding, or fixed 3/4/5 digits
- **Custom start index** — begin numbering from any number
- **Prompt preservation** — existing `.txt` files keep their content; missing `.txt` files are created empty

### Prompt Editor
- **Side-by-side layout** — dataset grid on the left, prompt editor on the right
- **Live preview** — large image preview with the textarea below
- **Character/line/tag counter** — real-time stats for your prompts
- **Dirty indicator** — shows when changes are unsaved
- **Visual save feedback** — button turns to "Saved ✓" for 2 seconds after saving

### Quality of Life
- **8 languages** — English, Spanish, Chinese, Japanese, Portuguese, Russian, French, German
- **First-run language picker** — choose your language on first launch
- **Language switcher** — change language anytime from the header
- **Delete confirmation** — native popup prevents accidental deletion
- **ETag caching** — fast refresh; unchanged images aren't re-downloaded
- **Open folder button** — jump straight to the dataset folder in your file explorer
- **Responsive** — resizable panels on desktop, stacked layout on mobile

---

## Quick Start

### Prerequisites
- **Node.js 18+** — download from [nodejs.org](https://nodejs.org) (LTS recommended)

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/lora-dataset-maker.git
cd lora-dataset-maker

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Using the Release ZIP

1. Download and extract the `LoRA-Dataset-Maker.zip`
2. Double-click `iniciar.bat` (Windows) or run `./iniciar.sh` (Linux/Mac)
3. The first run installs dependencies (requires internet, ~20 seconds)
4. The browser opens automatically at `http://localhost:3000`

---

## How to Use

### 1. Load Your Dataset

Three ways to add images:

| Method | How |
|---|---|
| **Folder path** | Type the absolute path in the top bar and press Enter or click "Load folder" |
| **Upload** | Click "Upload files" and select multiple files |
| **Drag & drop** | Drag images and `.txt` files directly onto the dataset panel |

**Supported formats:** PNG, JPG, JPEG, WEBP, GIF, BMP, TIFF, AVIF, JXL

All non-PNG images are automatically converted to PNG on load.

### 2. Process & Renumber

Click **"Process & renumber"** to:

1. Rename all images sequentially (`000.png`, `001.png`, ... `N.png`)
2. Convert any remaining non-PNG files to PNG
3. Create empty `.txt` files for images that don't have one
4. Preserve the content of existing `.txt` files (only the filename changes)

**Padding modes:**
- **Auto (recommended)** — minimum 3 digits, grows automatically
  - 1–999 images → `000.png` ... `998.png` (3 digits)
  - 1000+ images → `0000.png` ... `1000.png` (4 digits, re-pads everything)
  - 10000+ images → `00000.png` ... `10000.png` (5 digits)
- **No padding** — `0.png`, `1.png`, `2.png`...
- **Fixed 3/4/5 digits** — force a specific width

### 3. Edit Prompts

- Click any image in the left panel to select it
- The right panel shows a large preview and a textarea for the prompt
- Type your prompt/tags and click **Save**
- The prompt is saved as `{image_name}.txt` in the `datasets/` folder

### 4. Delete

- Hover over an image card and click the trash icon → confirmation popup appears
- Or use "Delete pair" in the right panel to delete the selected image + its `.txt`

### 5. Where Are My Files?

The dataset is stored in `datasets/` inside the project folder. The full path is shown in the bottom stats bar — click it to open the folder in your file explorer.

---

## Configuration

### Language
On first launch, you'll be asked to choose a language. You can change it later using the globe icon in the header.

Supported languages:
| Code | Language | Flag |
|---|---|---|
| `en` | English | 🇺🇸 |
| `es` | Español | 🇪🇸 |
| `zh` | 中文 | 🇨🇳 |
| `ja` | 日本語 | 🇯🇵 |
| `pt` | Português | 🇧🇷 |
| `ru` | Русский | 🇷🇺 |
| `fr` | Français | 🇫🇷 |
| `de` | Deutsch | 🇩🇪 |

The choice is saved in `localStorage` and persists across sessions.

### Port
The app runs on port 3000 by default. To change it, edit the port in `iniciar.bat` or run:
```bash
npx next dev -p 3001
```

---

## Project Structure

```
lora-dataset-maker/
├── iniciar.bat              # Windows launcher (double-click to run)
├── iniciar.sh               # Linux/Mac launcher
├── package.json             # Slim dependencies (~550 MB installed)
├── next.config.ts           # devIndicators disabled
├── src/
│   ├── app/
│   │   ├── api/dataset/
│   │   │   ├── scan/        # Load folder by path
│   │   │   ├── upload/      # Upload files (auto-convert to PNG)
│   │   │   ├── list/        # List dataset (with mtime for cache-busting)
│   │   │   ├── file/        # Serve image (ETag caching)
│   │   │   ├── text/        # Read/write prompt .txt
│   │   │   ├── process/     # Renumber + convert + create .txt
│   │   │   ├── delete/      # Delete image + .txt pair
│   │   │   ├── info/        # Get workspace directory path
│   │   │   └── open-folder/ # Open dataset folder in OS explorer
│   │   ├── globals.css      # Dark monochrome theme
│   │   ├── layout.tsx       # Root layout with I18nProvider
│   │   └── page.tsx         # Main UI
│   ├── components/ui/       # 10 shadcn/ui components (only used ones)
│   ├── hooks/
│   │   ├── use-i18n.tsx     # i18n context + hook
│   │   ├── use-mobile.ts    # Responsive breakpoint detection
│   │   └── use-toast.ts     # Toast notifications
│   └── lib/
│       ├── dataset.ts       # Core logic (scan, process, convert, delete)
│       ├── i18n.ts          # 8-language translations
│       └── utils.ts         # Tailwind class merge utility
└── datasets/                # Your dataset lives here (auto-created)
```

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 16** | Framework (App Router, Turbopack) |
| **React 19** | UI library |
| **TypeScript 5** | Type safety |
| **Tailwind CSS 4** | Styling (dark monochrome theme) |
| **shadcn/ui** | UI components (10 used, 37 removed) |
| **sharp** | Image format conversion to PNG |
| **lucide-react** | Icons |
| **react-resizable-panels** | Resizable split panels |

---

## Troubleshooting

### "Node.js is not installed"
Download Node.js 18+ from [nodejs.org](https://nodejs.org) and install it. Then run `start.bat` again.

### "Error installing dependencies"
- Check your internet connection
- If behind a proxy: `npm config set proxy http://your-proxy:port`
- Delete `node_modules/` and `package-lock.json`, then retry

### Port 3000 is already in use
Edit `iniciar.bat` and change `3000` to another port (e.g., `3001`).

### Images don't appear
Click the "Refresh" button in the stats bar.

### Reset everything
Delete the contents of the `datasets/` folder. The app recreates it empty on next launch.

### Sharp installation warning
If you see `npm warn install-scripts sharp`, the `.npmrc` file in the project allows sharp's install script automatically. If it still fails, run:
```bash
npm install-scripts approve sharp
```

---

## Performance

| Metric | Value |
|---|---|
| ZIP size | ~40 KB |
| Installed dependencies | ~550 MB (was 1.2 GB before optimization) |
| npm packages | 411 (was 847 before optimization) |
| Dev server startup | ~300ms |
| Image refresh | Instant (ETag caching, 304 responses) |

---

## License

MIT — free for personal and commercial use.

---

## Acknowledgments

Built for the LoRA training community. Technical terms (LoRA, PNG, prompt, dataset) are kept in English across all 8 languages because they are universally used in the AI/ML community.
# LoRA-Dataset-Maker
