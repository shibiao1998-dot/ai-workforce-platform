import { cn } from "@/lib/utils"
import { NdAchievementBadge } from "@/components/netdragon"
import { Card } from "@/components/ui/card"

export interface AchievementItem {
  id: string
  employeeId: string
  employeeName: string
  team: string
  achievementKey: string
  achievementEmoji: string
  achievementName: string
  earnedAt: string
}

interface Props {
  achievements: AchievementItem[]
  renderedAtMs: number
  className?: string
}

const TEAM_BORDER: Record<string, string> = {
  management: "border-l-nd-violet",
  design: "border-l-nd-sapphire",
  production: "border-l-nd-emerald",
}

const TEAM_TEXT: Record<string, string> = {
  management: "text-nd-violet",
  design: "text-nd-sapphire",
  production: "text-nd-emerald",
}

/** 成就 key → badge asset id，未登记的成就回退到字母徽标 */
const ACHIEVEMENT_ASSET_MAP: Record<string, string> = {
  first_perfect: "badge-quality-gold",
  seven_flame: "badge-reliability-gold",
  flash_hand: "badge-efficiency-gold",
  mvp: "badge-weekly-top",
  perfectionist: "badge-quality-gold",
  all_rounder: "badge-innovation-gold",
  team_star: "badge-collab-gold",
  fast_growth: "badge-efficiency-gold",
}

function fallbackInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "A"
}

function relativeTime(isoDate: string, renderedAtMs: number): string {
  const diff = renderedAtMs - new Date(isoDate).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "今天"
  if (days === 1) return "昨天"
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  return `${Math.floor(days / 30)}个月前`
}

export function AchievementFeed({ achievements, renderedAtMs, className }: Props) {
  return (
    <Card variant="glass" className={cn("flex h-full flex-col gap-0 p-5", className)}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-nd-primary">荣誉记录</div>
          <h3 className="mt-1 text-sm font-semibold text-nd-ink">成就动态</h3>
        </div>
        <span className="text-xs text-nd-ink-soft">最近 {Math.min(achievements.length, 5)} 条</span>
      </div>

      {achievements.length === 0 ? (
        <div className="flex min-h-[220px] flex-1 items-center justify-center rounded-nd-lg border border-dashed border-[color:var(--color-nd-glass-border)] bg-nd-surface/45">
          <p className="text-center text-sm leading-relaxed text-nd-ink-soft">
            暂无最新成就，完成高质量任务后会在这里记录。
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {achievements.slice(0, 5).map((item) => {
            const assetId = ACHIEVEMENT_ASSET_MAP[item.achievementKey]
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 rounded-nd-md border border-[color:var(--color-nd-glass-border)]/55 border-l-4 bg-nd-surface/60 p-3 shadow-nd-xs transition-all duration-300 hover:-translate-y-0.5 hover:bg-nd-surface/85",
                  TEAM_BORDER[item.team] ?? "border-l-nd-ink-soft",
                )}
              >
                {assetId ? (
                  <NdAchievementBadge
                    assetId={assetId}
                    name={item.achievementName}
                    description={`${item.employeeName}·${relativeTime(item.earnedAt, renderedAtMs)}`}
                    rank="gold"
                    size={36}
                    className="flex-shrink-0"
                  />
                ) : (
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[color:var(--color-nd-primary)]/20 bg-[color:var(--color-nd-primary)]/10 text-xs font-bold text-nd-primary"
                    aria-hidden="true"
                  >
                    {fallbackInitial(item.achievementName)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className={cn("text-xs font-semibold", TEAM_TEXT[item.team] ?? "text-nd-ink-soft")}>
                      {item.employeeName}
                    </span>
                    <span className="text-xs text-nd-ink">获得</span>
                    <span className="text-xs font-medium text-nd-ink">{item.achievementName}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-nd-ink-soft">{relativeTime(item.earnedAt, renderedAtMs)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
