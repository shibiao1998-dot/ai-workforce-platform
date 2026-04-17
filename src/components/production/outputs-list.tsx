"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, BarChart3, Film, FolderOpen, Paperclip, Eye, Download } from "lucide-react";
import { OutputPreviewDialog } from "./output-preview-dialog";

interface Output {
  id: string;
  type: "document" | "resource" | "report" | "media" | "other";
  title: string;
  content: string | null;
  url: string | null;
  createdAt: string | null;
}

const TYPE_CONFIG: Record<string, { icon: typeof FileText; color: string }> = {
  document: { icon: FileText, color: "text-blue-600" },
  report: { icon: BarChart3, color: "text-green-600" },
  media: { icon: Film, color: "text-purple-600" },
  resource: { icon: FolderOpen, color: "text-amber-600" },
  other: { icon: Paperclip, color: "text-gray-600" },
};

function formatTime(ts: string | null) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export function OutputsList({ outputs }: { outputs: Output[] }) {
  const [previewOutput, setPreviewOutput] = useState<Output | null>(null);

  if (outputs.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">暂无产出记录</p>;
  }

  return (
    <>
      <div className="divide-y">
        {outputs.map(output => {
          const config = TYPE_CONFIG[output.type] ?? TYPE_CONFIG.other;
          const Icon = config.icon;
          return (
            <div key={output.id} className="flex items-center gap-3 py-3">
              <Icon className={`h-5 w-5 flex-shrink-0 ${config.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{output.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs">{output.type}</Badge>
                  <span className="text-xs text-muted-foreground">{formatTime(output.createdAt)}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setPreviewOutput(output)}>
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  预览
                </Button>
                {output.url && (
                  <a href={output.url} download>
                    <Button variant="ghost" size="sm">
                      <Download className="h-3.5 w-3.5 mr-1" />
                      下载
                    </Button>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <OutputPreviewDialog
        open={previewOutput !== null}
        onOpenChange={(open) => { if (!open) setPreviewOutput(null); }}
        output={previewOutput}
      />
    </>
  );
}
