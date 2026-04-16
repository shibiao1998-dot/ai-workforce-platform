"use client";

import { useState } from "react";
import { VersionLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

interface VersionTabProps {
  versionLogs: VersionLog[];
  employeeId: string;
  onAdd: (log: { version: string; date: string; changelog: string }) => Promise<void>;
}

export function VersionTab({ versionLogs, employeeId: _employeeId, onAdd }: VersionTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [version, setVersion] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [changelog, setChangelog] = useState("");

  const sorted = [...versionLogs].sort((a, b) => b.version.localeCompare(a.version));

  function resetForm() {
    setVersion("");
    setDate(new Date().toISOString().slice(0, 10));
    setChangelog("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!version.trim() || !changelog.trim()) return;
    setSubmitting(true);
    try {
      await onAdd({ version: version.trim(), date, changelog: changelog.trim() });
      resetForm();
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus />
          新增版本
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>新增版本</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ver-version">版本号</Label>
                  <Input
                    id="ver-version"
                    placeholder="例：v1.2.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ver-date">日期</Label>
                  <Input
                    id="ver-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ver-changelog">更新日志</Label>
                <Textarea
                  id="ver-changelog"
                  placeholder="描述本次版本的主要变更..."
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  disabled={submitting}
                >
                  取消
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "提交中..." : "提交"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            暂无版本记录
          </CardContent>
        </Card>
      ) : (
        <div className="relative flex flex-col gap-0 pl-6">
          {/* Vertical timeline line */}
          <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
          {sorted.map((log) => (
            <div key={log.id} className="relative flex flex-col gap-1 pb-6 last:pb-0">
              {/* Timeline dot */}
              <div className="absolute -left-4 top-1.5 size-2.5 rounded-full border-2 border-primary bg-background" />
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground">{log.version}</span>
                <span className="text-xs text-muted-foreground">{log.date}</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{log.changelog}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
