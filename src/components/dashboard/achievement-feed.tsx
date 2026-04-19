import { cn } from "@/lib/utils"

export interface AchievementItem {
  id: string
  employeeId: string
  employeeName: string
  team: string
  achievementEmoji: string
  achievementName: string
  earnedAt: string
}

interface Props {
  achievements: AchievementItem[]
}

const TEAM_BORDER: Record<string, string> = {
  management: "border-l-[#8b5cf6]",
  design: "border-l-[#3b82f6]",
  production: "border-l-[#22c55e]",
}

const TEAM_TEXT: Record<string, string> = {
  management: "text-[#8b5cf6]",
  design: "text-[#3b82f6]",
  production: "text-[#22c55e]",
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
    <div
      className="rounded-2xl p-5 h-full flex flex-col"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <h3 className="text-sm font-semibold text-[#1e293b] mb-3">成就动态 🎖️</h3>

      {achievements.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[#64748b] text-center leading-relaxed">
            暂无最新成就，AI员工们正在努力中！
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto">
          {achievements.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className={cn("flex items-center gap-3 rounded-xl p-3 border-l-4", TEAM_BORDER[item.team] ?? "border-l-[#64748b]")}
              style={{ background: "rgba(255,255,255,0.6)" }}
            >
              <span className="text-xl flex-shrink-0">{item.achievementEmoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={cn("text-xs font-semibold", TEAM_TEXT[item.team] ?? "text-[#64748b]")}>{item.employeeName}</span>
                  <span className="text-xs text-[#1e293b]">获得</span>
                  <span className="text-xs font-medium text-[#1e293b]">{item.achievementName}</span>
                </div>
                <p className="text-xs text-[#64748b] mt-0.5">{relativeTime(item.earnedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
