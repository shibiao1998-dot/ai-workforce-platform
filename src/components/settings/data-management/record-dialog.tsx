"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface RecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FieldDef[];
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}

export function RecordDialog({
  open,
  onOpenChange,
  title,
  fields,
  initialValues,
  onSubmit,
}: RecordDialogProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 每次打开时重置表单
  useEffect(() => {
    if (open) {
      const init: Record<string, unknown> = {};
      fields.forEach((f) => {
        init[f.key] = initialValues?.[f.key] ?? "";
      });
      setValues(init);
      setError(null);
    }
  }, [open, initialValues, fields]);

  function set(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // 校验必填
    for (const f of fields) {
      if (f.required && !values[f.key]) {
        setError(`${f.label} 不能为空`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-1">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label htmlFor={`field-${field.key}`}>
                {field.label}
                {field.required && (
                  <span className="text-destructive ml-0.5">*</span>
                )}
              </Label>

              {field.type === "select" ? (
                <Select
                  value={String(values[field.key] ?? "")}
                  onValueChange={(v) => set(field.key, v ?? "")}
                >
                  <SelectTrigger id={`field-${field.key}`} className="w-full">
                    <SelectValue placeholder={field.placeholder ?? `请选择${field.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "textarea" ? (
                <textarea
                  id={`field-${field.key}`}
                  value={String(values[field.key] ?? "")}
                  onChange={(e) => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
                />
              ) : (
                <Input
                  id={`field-${field.key}`}
                  type={field.type === "number" ? "number" : "text"}
                  value={String(values[field.key] ?? "")}
                  onChange={(e) =>
                    set(
                      field.key,
                      field.type === "number"
                        ? e.target.value === "" ? "" : Number(e.target.value)
                        : e.target.value
                    )
                  }
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter className="border-0 bg-transparent px-0 pb-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "提交中..." : "确认"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
