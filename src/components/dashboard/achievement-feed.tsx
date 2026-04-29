import { cn } from "@/lib/utils"
import { NdAchievementBadge } from "@/components/netdragon"

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

/** 成就 key → badge asset id,未登记的成就回退到 emoji 展示 */
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

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "今天"
  if (days === 1) return "昨天"
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  return `${Math.floor(days / 30)}个月前`
}

export function AchievementFeed({ achievements }: Props) {
  return (
    <div className="flex h-full flex-col rounded-nd-lg bg-nd-surface/75 p-5 shadow-nd-sm backdrop-blur-[12px]">
      <h3 className="mb-3 text-sm font-semibold text-nd-ink">成就动态 🎖️</h3>

      {achievements.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-center text-sm leading-relaxed text-nd-ink-soft">
            暂无最新成就,AI 员工们正在努力中!
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto">
          {achievements.slice(0, 5).map((item) => {
            const assetId = ACHIEVEMENT_ASSET_MAP[item.achievementKey]
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 rounded-nd-md border-l-4 bg-nd-surface/60 p-3",
                  TEAM_BORDER[item.team] ?? "border-l-nd-ink-soft",
                )}
              >
                {assetId ? (
                  <NdAchievementBadge
                    assetId={assetId}
                    name={item.achievementName}
                    description={`${item.employeeName}·${relativeTime(item.earnedAt)}`}
                    rank="gold"
                    size={36}
                    className="flex-shrink-0"
                  />
                ) : (
                  <span className="flex-shrink-0 text-xl" aria-hidden="true">
                    {item.achievementEmoji}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className={cn("text-xs font-semibold", TEAM_TEXT[item.team] ?? "text-nd-ink-soft")}>
                      {item.employeeName}
                    </span>
                    <span className="text-xs text-nd-ink">获得</span>
                    <span className="text-xs font-medium text-nd-ink">{item.achievementName}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-nd-ink-soft">{relativeTime(item.earnedAt)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
