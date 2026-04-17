"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OutputPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  output: {
    title: string;
    type: string;
    content: string | null;
    url: string | null;
  } | null;
}

export function OutputPreviewDialog({ open, onOpenChange, output }: OutputPreviewDialogProps) {
  if (!output) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{output.title}</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          {output.content && (
            <div className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
              {output.content}
            </div>
          )}
          {output.url && output.type === "media" && (
            <video src={output.url} controls className="w-full rounded-md" />
          )}
          {output.url && output.type !== "media" && (
            <div className="text-sm text-muted-foreground">
              <a href={output.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {output.url}
              </a>
            </div>
          )}
          {!output.content && !output.url && (
            <p className="text-sm text-muted-foreground">暂无预览内容</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
