import { Skill } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Zap, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkillsTabProps {
  skills: Skill[];
}

function StarRating({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i < level
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

function SkillMetricsRow({ skill }: { skill: Skill }) {
  const skillMetrics = skill.skillMetrics;
  if (!skillMetrics || skillMetrics.length === 0) return null;

  // 取最新 period 的数据
  const latest = [...skillMetrics].sort((a, b) => b.period.localeCompare(a.period))[0];

  return (
    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-0.5">
        <Zap className="size-3" />
        调用 {latest.invocationCount}次
      </span>
      {latest.successRate !== null && (
        <span className="flex items-center gap-0.5">
          <CheckCircle className="size-3" />
          成功率 {Math.round(latest.successRate * 100)}%
        </span>
      )}
      {latest.avgResponseTime !== null && (
        <span className="flex items-center gap-0.5">
          <Clock className="size-3" />
          响应 {latest.avgResponseTime.toFixed(1)}s
        </span>
      )}
    </div>
  );
}

function groupByCategory(skills: Skill[]): Record<string, Skill[]> {
  return skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    const cat = skill.category ?? "其他";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});
}

export function SkillsTab({ skills }: SkillsTabProps) {
  if (skills.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          暂无技能数据
        </CardContent>
      </Card>
    );
  }

  const grouped = groupByCategory(skills);

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(grouped).map(([category, categorySkills]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col divide-y divide-border">
              {categorySkills.map((skill) => (
                <div key={skill.id} className="flex items-start justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{skill.name}</span>
                    {skill.description && (
                      <span className="text-xs text-muted-foreground">{skill.description}</span>
                    )}
                    <SkillMetricsRow skill={skill} />
                  </div>
                  <StarRating level={skill.level} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
