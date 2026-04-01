"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2, FileSpreadsheet } from "lucide-react";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function CSVImportDialog({ open, onOpenChange, onImported }: CSVImportDialogProps) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; updated: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setError("");

    const text = await file.text();
    setCsvText(text);
  };

  const handleImport = async () => {
    if (!csvText) return;
    setImporting(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/influencer-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv_text: csvText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "导入失败");
      setResult(data);
      onImported();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "导入失败");
    }
    setImporting(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setResult(null);
    setError("");
    setFileName("");
    setCsvText("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            批量导入达人
          </DialogTitle>
          <DialogDescription>
            从蝉妈妈、千瓜、新榜等工具导出的 CSV/Excel 文件导入达人数据
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File upload area */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,.tsv"
              className="hidden"
              onChange={handleFileSelect}
            />
            {fileName ? (
              <div className="space-y-2">
                <FileSpreadsheet className="h-8 w-8 mx-auto text-emerald-500" />
                <p className="text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground">点击更换文件</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  点击上传 CSV 文件
                </p>
                <p className="text-xs text-muted-foreground">
                  支持蝉妈妈、千瓜、新榜等工具导出的格式
                </p>
              </div>
            )}
          </div>

          {/* Expected format hint */}
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">支持的字段（自动匹配列名）：</p>
            <p>达人名称/昵称, 平台, 粉丝数, 互动率, 品类/分类, 报价/价格</p>
          </div>

          {/* Result */}
          {result && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-3 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-emerald-700 dark:text-emerald-400">
                  导入完成
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                  新增 {result.imported} 人 · 更新 {result.updated} 人 · 共处理 {result.total} 条
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? "完成" : "取消"}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={importing || !csvText}>
              {importing ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-4 w-4" />
              )}
              {importing ? "导入中..." : "开始导入"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
