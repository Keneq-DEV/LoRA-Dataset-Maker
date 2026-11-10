"use client";

import * as React from "react";
import {
  FolderOpen,
  Upload,
  Wand2,
  Trash2,
  Save,
  FileText,
  ImageIcon,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Hash,
  Globe,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/hooks/use-i18n";
import { LANGUAGES, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DatasetEntry {
  name: string;
  image: string;
  text: string | null;
  hasText: boolean;
  textPreview: string | null;
  mtime: number;
}

interface DatasetList {
  entries: DatasetEntry[];
  total: number;
  withText: number;
  withoutText: number;
  nonPng: number;
}

type SortMode = "index" | "name" | "withText" | "withoutText";

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Home() {
  const { toast } = useToast();
  const { t, lang, setLang, needsSelection } = useI18n();
  const currentLang = LANGUAGES.find((l) => l.code === lang);
  const [dataset, setDataset] = React.useState<DatasetList | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<DatasetEntry | null>(null);
  const [sortMode, setSortMode] = React.useState<SortMode>("index");
  const [folderPath, setFolderPath] = React.useState("");
  const [processOpen, setProcessOpen] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [workspaceDir, setWorkspaceDir] = React.useState<string>("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Load the workspace directory path (so we can show the user where files
  // are being saved).
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/dataset/info", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data.dir) setWorkspaceDir(data.dir);
      } catch {
        // ignore — non-critical
      }
    })();
  }, []);

  // Refresh the dataset listing from the server.
  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dataset/list", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar");
      setDataset(data);
      // If the currently selected entry no longer exists, clear it.
      if (selected && !data.entries.find((e: DatasetEntry) => e.image === selected.image)) {
        setSelected(null);
      }
    } catch (e) {
      toast({
        title: t("error"),
        description: e instanceof Error ? e.message : t("unknownError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selected, toast, t]);

  React.useEffect(() => {
    refresh();
    // Run once on mount only.
  }, []);

  // Load a folder by path.
  const handleLoadFolder = async () => {
    if (!folderPath.trim()) {
      toast({
        title: t("emptyPath"),
        description: t("enterPath"),
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/dataset/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: folderPath.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al escanear");
      const parts: string[] = [];
      if (data.copied > 0) parts.push(t("newFiles", { n: data.copied }));
      if (data.replaced > 0) parts.push(t("replaced", { n: data.replaced }));
      if (data.converted > 0) parts.push(t("convertedToPng", { n: data.converted }));
      if (data.skipped > 0) parts.push(t("ignored", { n: data.skipped }));
      toast({
        title: t("folderLoaded"),
        description: parts.length > 0 ? parts.join(" · ") : t("noChanges"),
      });
      await refresh();
    } catch (e) {
      toast({
        title: t("errorLoadingFolder"),
        description: e instanceof Error ? e.message : t("unknownError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Upload files via the file input.
  const handleUploadFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setLoading(true);
    try {
      const form = new FormData();
      for (const f of arr) form.append("files", f);
      const res = await fetch("/api/dataset/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al subir");
      const parts: string[] = [];
      if (data.saved > 0) parts.push(t("newFiles", { n: data.saved }));
      if (data.replaced > 0) parts.push(t("replaced", { n: data.replaced }));
      if (data.converted > 0) parts.push(t("convertedToPng", { n: data.converted }));
      toast({
        title: t("filesUploaded"),
        description: parts.length > 0 ? parts.join(" · ") : t("noChanges"),
      });
      await refresh();
    } catch (e) {
      toast({
        title: t("errorUploading"),
        description: e instanceof Error ? e.message : t("unknownError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Drag-and-drop on the dropzone.
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Process the dataset: renumber, convert to PNG, ensure .txt exists.
  const handleProcess = async (opts: {
    padWidth: number;
    startIndex: number;
  }) => {
    setProcessing(true);
    try {
      const res = await fetch("/api/dataset/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar");
      const parts: string[] = [];
      if (data.renamed > 0) parts.push(t("renamed", { n: data.renamed }));
      if (data.converted > 0) parts.push(t("converted", { n: data.converted }));
      if (data.textCreated > 0) parts.push(t("txtCreated", { n: data.textCreated }));
      if (data.textPreserved > 0) parts.push(t("txtPreserved", { n: data.textPreserved }));
      toast({
        title: t("datasetProcessed"),
        description: parts.join(" · "),
      });
      setSelected(null);
      setProcessOpen(false);
      await refresh();
    } catch (e) {
      toast({
        title: t("error"),
        description: e instanceof Error ? e.message : t("unknownError"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Delete an entry.
  const handleDelete = async (entry: DatasetEntry) => {
    try {
      const res = await fetch("/api/dataset/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: entry.image }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      toast({ title: t("deleted"), description: t("deletedDesc", { name: entry.image }) });
      if (selected?.image === entry.image) setSelected(null);
      await refresh();
    } catch (e) {
      toast({
        title: t("errorDeleting"),
        description: e instanceof Error ? e.message : t("unknownError"),
        variant: "destructive",
      });
    }
  };

  // Sorted entries for display.
  const sortedEntries = React.useMemo(() => {
    if (!dataset) return [];
    const arr = [...dataset.entries];
    switch (sortMode) {
      case "name":
        arr.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "withText":
        arr.sort((a, b) => Number(b.hasText) - Number(a.hasText) || a.name.localeCompare(b.name));
        break;
      case "withoutText":
        arr.sort((a, b) => Number(a.hasText) - Number(b.hasText) || a.name.localeCompare(b.name));
        break;
      case "index":
      default:
        // Already sorted by index from the backend.
        break;
    }
    return arr;
  }, [dataset, sortMode]);

  const isEmpty = (dataset?.total ?? 0) === 0;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      {needsSelection && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-center">{t("chooseLanguage")}</h2>
            <p className="mt-1 text-sm text-muted-foreground text-center">{t("chooseLanguageDesc")}</p>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className="flex flex-col items-center gap-2 rounded-md border border-border p-4 transition-colors hover:border-foreground/40 hover:bg-accent"
                >
                  <span className="text-3xl">{l.flag}</span>
                  <span className="text-sm font-medium">{l.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Top bar */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card/40 px-3 py-2 backdrop-blur-sm md:h-16 md:flex-nowrap md:gap-4 md:px-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-md bg-foreground text-background">
            <Layers className="size-4.5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-tight">
              {t("title")}
            </span>
            <span className="hidden text-[11px] text-muted-foreground font-mono sm:block">
              {t("subtitle")}
            </span>
          </div>
        </div>

        <div className="hidden mx-2 h-6 w-px bg-border md:block" />

        {/* Folder path input */}
        <div className="flex flex-1 min-w-[180px] items-center gap-2">
          <div className="relative flex-1">
            <FolderOpen className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLoadFolder();
              }}
              placeholder={t("pathPlaceholder")}
              className="h-9 pl-9 font-mono text-[13px] bg-background/60"
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleLoadFolder}
            disabled={loading}
            variant="secondary"
            size="sm"
            className="h-9 shrink-0"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <FolderOpen className="size-4" />}
            <span className="ml-1.5 hidden sm:inline">{t("loadFolder")}</span>
          </Button>
        </div>

        {/* Upload */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.txt"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleUploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="h-9 shrink-0"
        >
          <Upload className="size-4" />
          <span className="ml-1.5 hidden md:inline">{t("uploadFiles")}</span>
        </Button>

        {/* Language switcher */}
        <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
          <SelectTrigger className="h-9 w-[120px] shrink-0 text-[12px]">
            <Globe className="size-4" />
            <span className="truncate">
              {currentLang?.flag} {currentLang?.name}
            </span>
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.flag} {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Process */}
        <Dialog open={processOpen} onOpenChange={setProcessOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={loading || processing || isEmpty}
              size="sm"
              className="h-9 shrink-0"
            >
              <Wand2 className="size-4" />
              <span className="ml-1.5">{t("process")}</span>
            </Button>
          </DialogTrigger>
          <ProcessDialog
            processing={processing}
            onConfirm={handleProcess}
            total={dataset?.total ?? 0}
          />
        </Dialog>
      </header>

      {/* Stats strip */}
      <div className="flex h-10 shrink-0 items-center gap-3 overflow-x-auto scrollbar-dark border-b border-border bg-card/20 px-3 text-[12px] text-muted-foreground md:gap-4 md:px-4">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <ImageIcon className="size-3.5" />
          <span className="font-mono">{dataset?.total ?? 0}</span>
          <span>{t("images")}</span>
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <CheckCircle2 className="size-3.5 text-foreground/70" />
          <span className="font-mono">{dataset?.withText ?? 0}</span>
          <span>{t("withPrompt")}</span>
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <AlertCircle className="size-3.5 text-foreground/50" />
          <span className="font-mono">{dataset?.withoutText ?? 0}</span>
          <span>{t("withoutPrompt")}</span>
        </div>
        {(dataset?.nonPng ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Hash className="size-3.5" />
            <span className="font-mono">{dataset?.nonPng}</span>
            <span>{t("nonPng")}</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2 whitespace-nowrap">
          {workspaceDir && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 max-w-[280px] px-2 text-[12px]"
              onClick={async () => {
                try {
                  const r = await fetch("/api/dataset/open-folder", {
                    method: "POST",
                  });
                  const d = await r.json();
                  if (!r.ok) throw new Error(d.error || "Error");
                  toast({
                    title: t("folderOpened"),
                    description: t("folderOpenedDesc"),
                  });
                } catch (e) {
                  toast({
                    title: t("couldNotOpen"),
                    description: `Ruta: ${workspaceDir}`,
                    variant: "default",
                  });
                }
              }}
              title={workspaceDir}
            >
              <FolderOpen className="size-3.5 shrink-0" />
              <span className="truncate font-mono">{workspaceDir}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[12px]"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {/* Main split */}
      <div className="flex-1 min-h-0">
        {isEmpty ? (
          <EmptyState
            dragOver={dragOver}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onPickUpload={() => fileInputRef.current?.click()}
            onPickFolder={() => {
              const input = document.createElement("input");
              (input as HTMLInputElement).type = "text";
              input.focus();
              setFolderPath("");
              document.querySelector<HTMLInputElement>('input[placeholder^="/ruta"]')?.focus();
            }}
          />
        ) : isMobile ? (
          // Mobile: stacked vertical layout with the dataset grid taking the
          // top portion and the prompt editor below.
          <div className="flex h-full flex-col">
            <div className="h-[45%] min-h-0 border-b border-border">
              <DatasetPanel
                entries={sortedEntries}
                selected={selected}
                onSelect={setSelected}
                onDelete={handleDelete}
                loading={loading}
                sortMode={sortMode}
                onSortChange={setSortMode}
                total={dataset?.total ?? 0}
                withText={dataset?.withText ?? 0}
                withoutText={dataset?.withoutText ?? 0}
                dragOver={dragOver}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              />
            </div>
            <div className="flex-1 min-h-0">
              <PromptPanel
                entry={selected}
                onSaved={refresh}
                onDeleted={() => {
                  if (selected) handleDelete(selected);
                }}
              />
            </div>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" autoSaveId="lora-dataset">
            <ResizablePanel defaultSize={45} minSize={28} maxSize={70}>
              <DatasetPanel
                entries={sortedEntries}
                selected={selected}
                onSelect={setSelected}
                onDelete={handleDelete}
                loading={loading}
                sortMode={sortMode}
                onSortChange={setSortMode}
                total={dataset?.total ?? 0}
                withText={dataset?.withText ?? 0}
                withoutText={dataset?.withoutText ?? 0}
                dragOver={dragOver}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={55} minSize={30} maxSize={72}>
              <PromptPanel
                entry={selected}
                onSaved={refresh}
                onDeleted={() => {
                  if (selected) handleDelete(selected);
                }}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Process dialog
// ---------------------------------------------------------------------------

function ProcessDialog({
  processing,
  onConfirm,
  total,
}: {
  processing: boolean;
  onConfirm: (opts: { padWidth: number; startIndex: number }) => void;
  total: number;
}) {
  const { t } = useI18n();
  const [padMode, setPadMode] = React.useState<"auto" | "none" | "3" | "4" | "5">("auto");
  const [startIndex, setStartIndex] = React.useState("0");

  const startIdx = Math.max(0, parseInt(startIndex || "0", 10));

  // Compute the effective padding that the server will apply, so we can show
  // a faithful preview in the dialog. Auto = min 3 digits, grows as needed.
  const effectivePad = React.useMemo(() => {
    if (padMode === "auto") {
      if (total === 0) return 3;
      const maxIndex = startIdx + total - 1;
      const digitsNeeded = String(maxIndex).length;
      return Math.max(3, digitsNeeded);
    }
    if (padMode === "none") return 1;
    return parseInt(padMode, 10);
  }, [padMode, startIdx, total]);

  // The padWidth sent to the server. 0 means "auto" (server computes).
  const padWidth = padMode === "auto" ? 0 : effectivePad;

  // Preview names.
  const firstName = String(startIdx).padStart(effectivePad, "0");
  const lastName = total > 0
    ? String(startIdx + total - 1).padStart(effectivePad, "0")
    : "—";

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Wand2 className="size-4" />
          {t("processTitle")}
        </DialogTitle>
        <DialogDescription>
          {t("processDesc")}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label className="text-[13px]">{t("numbering")}</Label>
          <Select value={padMode} onValueChange={(v) => setPadMode(v as typeof padMode)}>
            <SelectTrigger className="font-mono text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{t("auto")}</SelectItem>
              <SelectItem value="none">{t("noPadding")}</SelectItem>
              <SelectItem value="3">{t("pad3")}</SelectItem>
              <SelectItem value="4">{t("pad4")}</SelectItem>
              <SelectItem value="5">{t("pad5")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {padMode === "auto"
              ? t("autoDesc")
              : padMode === "none"
                ? t("noPaddingDesc")
                : t("paddingFixedDesc", {
                    n: padMode,
                    ex1: "0".repeat(parseInt(padMode, 10) - 1) + "0",
                    ex2: "0".repeat(parseInt(padMode, 10) - 1) + "1",
                  })}
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-[13px]">{t("startIndex")}</Label>
          <Input
            type="number"
            min={0}
            value={startIndex}
            onChange={(e) => setStartIndex(e.target.value)}
            className="font-mono text-[13px]"
          />
          <p className="text-[11px] text-muted-foreground">
            {t("startIndexDesc")}
          </p>
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-3 text-[12px] text-muted-foreground">
          <div className="mb-1.5 font-medium text-foreground">{t("preview")}</div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px]">
            <span className="text-foreground">{total}</span>
            <span>{t("images")} →</span>
            <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-foreground">{firstName}.png</span>
            <span className="text-muted-foreground">...</span>
            <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-foreground">{lastName}.png</span>
          </div>
          <div className="mt-1.5 text-[11px]">
            {t("paddingEffective", { n: effectivePad })}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          onClick={() =>
            onConfirm({
              padWidth,
              startIndex: startIdx,
            })
          }
          disabled={processing || total === 0}
        >
          {processing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Wand2 className="size-4" />
          )}
          {processing ? t("processing") : t("processBtn")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onPickUpload,
}: {
  dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onPickUpload: () => void;
  onPickFolder: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "flex w-full max-w-2xl flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-16 text-center transition-colors",
          dragOver
            ? "border-foreground/60 bg-foreground/5"
            : "border-border bg-card/30",
        )}
      >
        <div className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
          <ImageIcon className="size-7" />
        </div>
        <h2 className="mt-6 text-lg font-semibold tracking-tight">
          {t("emptyTitle")}
        </h2>
        <p className="mt-2 max-w-md text-[13px] text-muted-foreground leading-relaxed">
          {t("emptyDesc")}
        </p>
        <div className="mt-6 flex items-center gap-2">
          <Button variant="secondary" onClick={onPickUpload}>
            <Upload className="size-4" />
            {t("uploadFiles")}
          </Button>
        </div>
        <p className="mt-6 text-[11px] text-muted-foreground">
          {t("emptyHint")}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dataset panel (left)
// ---------------------------------------------------------------------------

function DatasetPanel({
  entries,
  selected,
  onSelect,
  onDelete,
  loading,
  sortMode,
  onSortChange,
  total,
  withText,
  withoutText,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  entries: DatasetEntry[];
  selected: DatasetEntry | null;
  onSelect: (e: DatasetEntry) => void;
  onDelete: (e: DatasetEntry) => void;
  loading: boolean;
  sortMode: SortMode;
  onSortChange: (m: SortMode) => void;
  total: number;
  withText: number;
  withoutText: number;
  dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col bg-card/20">
      {/* Panel header */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <span className="text-[13px] font-medium">{t("dataset")}</span>
        <Badge variant="secondary" className="h-5 font-mono text-[11px]">
          {total}
        </Badge>
        <div className="ml-auto flex items-center gap-1">
          <Select value={sortMode} onValueChange={(v) => onSortChange(v as SortMode)}>
            <SelectTrigger className="h-7 w-[140px] text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="index">{t("sortIndex")}</SelectItem>
              <SelectItem value="name">{t("sortName")}</SelectItem>
              <SelectItem value="withText">{t("sortWithText")}</SelectItem>
              <SelectItem value="withoutText">{t("sortWithoutText")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scrollable grid */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto scrollbar-dark p-3 transition-colors",
          dragOver && "bg-foreground/5",
        )}
      >
        {entries.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
            {loading ? t("loading") : t("noImages")}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {entries.map((entry) => (
              <DatasetCard
                key={`${entry.image}-${entry.mtime}`}
                entry={entry}
                selected={selected?.image === entry.image}
                onSelect={() => onSelect(entry)}
                onDelete={() => onDelete(entry)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DatasetCard({
  entry,
  selected,
  onSelect,
  onDelete,
}: {
  entry: DatasetEntry;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const [imgError, setImgError] = React.useState(false);
  const isNonPng = !entry.image.toLowerCase().endsWith(".png");

  // Reset error state when the image or its mtime changes (e.g. after
  // processing replaces the file with a new version).
  React.useEffect(() => {
    setImgError(false);
  }, [entry.image, entry.mtime]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-md border bg-card transition-all",
        "hover:border-foreground/30 hover:bg-accent/40",
        selected
          ? "border-foreground ring-1 ring-foreground/40"
          : "border-border",
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted/40 checkerboard-bg">
        {imgError ? (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            <ImageIcon className="size-6 opacity-50" />
          </div>
        ) : (
          <img
            src={`/api/dataset/file?name=${encodeURIComponent(entry.image)}&v=${entry.mtime}`}
            alt={entry.image}
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
            onError={() => setImgError(true)}
          />
        )}

        {/* Status badges (top-right) */}
        <div className="absolute right-1.5 top-1.5 flex flex-col gap-1">
          {entry.hasText ? (
            <span className="grid size-5 place-items-center rounded-sm bg-foreground text-background shadow">
              <FileText className="size-3" />
            </span>
          ) : (
            <span className="grid size-5 place-items-center rounded-sm border border-foreground/40 bg-background/80 text-muted-foreground backdrop-blur-sm">
              <FileText className="size-3 opacity-50" />
            </span>
          )}
          {isNonPng && (
            <span className="rounded-sm bg-foreground/80 px-1 py-0.5 text-[9px] font-mono uppercase text-background shadow">
              {entry.image.split(".").pop()}
            </span>
          )}
        </div>

        {/* Hover delete — shows a native confirmation popup before deleting.
            Using window.confirm() because it's 100% reliable (Radix Dialog
            had auto-close issues when triggered from inside a clickable card). */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            const ok = window.confirm(
              t("deleteConfirm", { name: entry.image }),
            );
            if (ok) onDelete();
          }}
          className="absolute left-1.5 top-1.5 grid size-5 place-items-center rounded-sm bg-background/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity hover:text-foreground group-hover:opacity-100"
          aria-label={t("deletePair")}
        >
          <Trash2 className="size-3" />
        </button>
      </div>

      {/* Filename */}
      <div className="flex items-center justify-between gap-1 px-2 py-1.5">
        <span className="truncate font-mono text-[11px] text-foreground/90">
          {entry.name}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          .{entry.image.split(".").pop()?.toLowerCase()}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prompt panel (right)
// ---------------------------------------------------------------------------

function PromptPanel({
  entry,
  onSaved,
  onDeleted,
}: {
  entry: DatasetEntry | null;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [content, setContent] = React.useState("");
  const [loadingText, setLoadingText] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  // Load the .txt content when the entry changes.
  React.useEffect(() => {
    if (!entry) {
      setContent("");
      setDirty(false);
      return;
    }
    let cancelled = false;
    setLoadingText(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/dataset/text?name=${encodeURIComponent(entry.name)}`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Error al leer prompt");
        setContent(data.content ?? "");
        setDirty(false);
      } catch (e) {
        if (!cancelled) {
          toast({
            title: t("error"),
            description: e instanceof Error ? e.message : t("unknownError"),
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoadingText(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entry, toast, t]);

  const [justSaved, setJustSaved] = React.useState(false);

  const handleSave = async () => {
    if (!entry) return;
    setSaving(true);
    try {
      const res = await fetch("/api/dataset/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: entry.name, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      setDirty(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      toast({
        title: t("promptSaved"),
        description: t("promptSavedDesc", { name: entry.name }),
      });
      onSaved();
    } catch (e) {
      toast({
        title: t("errorSaving"),
        description: e instanceof Error ? e.message : t("unknownError"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!entry) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background p-8 text-center">
        <div className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
          <FileText className="size-7" />
        </div>
        <h3 className="mt-5 text-base font-medium">{t("noSelection")}</h3>
        <p className="mt-1.5 max-w-xs text-[13px] text-muted-foreground">
          {t("selectImageHint")}
        </p>
      </div>
    );
  }

  const charCount = content.length;
  const lineCount = content ? content.split("\n").length : 0;
  const tagCount = content.match(/<[^>]+>/g)?.length ?? 0;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Panel header */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <span className="text-[13px] font-medium">{t("promptEditor")}</span>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="h-5 font-mono text-[11px]">
            {entry.image}
          </Badge>
          {entry.hasText ? (
            <Badge className="h-5 gap-1 text-[11px]">
              <FileText className="size-3" />
              {entry.name}.txt
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="h-5 gap-1 border-dashed text-[11px] text-muted-foreground"
            >
              <FileText className="size-3" />
              {entry.name}.txt
            </Badge>
          )}
        </div>
      </div>

      {/* Image preview */}
      <div className="shrink-0 border-b border-border bg-muted/20 p-4">
        <div className="relative mx-auto max-h-[280px] max-w-full overflow-hidden rounded-md border border-border bg-muted/40 checkerboard-bg">
          <img
            src={`/api/dataset/file?name=${encodeURIComponent(entry.image)}&v=${entry.mtime}`}
            alt={entry.image}
            className="mx-auto block max-h-[280px] w-auto max-w-full object-contain"
          />
        </div>
      </div>

      {/* Prompt editor */}
      <div className="flex flex-1 min-h-0 flex-col p-4">
        <div className="mb-2 flex items-center justify-between">
          <Label htmlFor="prompt-textarea" className="text-[13px] font-medium">
            {t("promptLabel")}
          </Label>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
            <span>{charCount} {t("chars")}</span>
            <span>{lineCount} {t("lines")}</span>
            {tagCount > 0 && <span>{tagCount} {t("tags")}</span>}
            {dirty && (
              <span className="flex items-center gap-1 text-foreground">
                <span className="size-1.5 rounded-full bg-foreground" />
                {t("unsaved")}
              </span>
            )}
          </div>
        </div>

        <div className="relative flex-1 min-h-0">
          {loadingText ? (
            <div className="grid size-full place-items-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Textarea
              id="prompt-textarea"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setDirty(true);
              }}
              placeholder={t("promptPlaceholder")}
              className="size-full resize-none rounded-md border-border bg-card/40 font-mono text-[13px] leading-relaxed scrollbar-dark"
              spellCheck={false}
            />
          )}
        </div>

        {/* Action bar */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={saving || loadingText || !dirty}
            size="sm"
            className={cn(justSaved && "bg-foreground/20 text-foreground")}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : justSaved ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            {justSaved ? t("saved") : t("save")}
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setContent("");
                setDirty(true);
              }}
              disabled={saving || loadingText}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
              {t("clear")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!entry) return;
                const ok = window.confirm(
                  t("deleteConfirm", { name: entry.image }),
                );
                if (ok) onDeleted();
              }}
              disabled={saving || loadingText}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
              {t("deletePair")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
