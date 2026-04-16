import { KpiCard } from "./kpi-card";

interface SummaryData {
  totalEmployees: number;
  activeEmployees: number;
  activeRate: number;
  monthlyTaskCount: number;
  humanTimeSavedHours: number;
  humanTimeSavedCost: number;
  avgAdoptionRate: number;
  avgAccuracyRate: number;
  projectsCovered: number;
}

export function KpiSection({ data }: { data: SummaryData }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        title="AI员工"
        numericValue={data.activeEmployees}
        displaySuffix={`/${data.totalEmployees}`}
        subtitle={`在岗率 ${Math.round(data.activeRate * 100)}%`}
        accent="blue"
        trend="up"
        trendLabel="较上月 +2"
      />
      <KpiCard
        title="本月任务量"
        numericValue={data.monthlyTaskCount}
        subtitle="已完成任务数"
        accent="green"
        trend="up"
        trendLabel="较上月 +18%"
      />
      <KpiCard
        title="节省人力"
        numericValue={data.humanTimeSavedHours}
        displaySuffix="h"
        decimals={1}
        subtitle={`约 ¥${data.humanTimeSavedCost.toLocaleString()}`}
        accent="yellow"
        trend="up"
        trendLabel="等效人天"
      />
      <KpiCard
        title="平均采纳率"
        numericValue={Math.round(data.avgAdoptionRate * 100)}
        displaySuffix="%"
        subtitle="AI产出被采用比例"
        accent="purple"
        trend="up"
        trendLabel="较上月 +3%"
      />
      <KpiCard
        title="平均准确率"
        numericValue={Math.round(data.avgAccuracyRate * 100)}
        displaySuffix="%"
        subtitle="一次性通过质检"
        accent="green"
        trend="neutral"
        trendLabel="持平"
      />
      <KpiCard
        title="覆盖业务数"
        numericValue={data.projectsCovered}
        subtitle="涉及任务类型数"
        accent="blue"
        trend="up"
        trendLabel="本月新增 15"
      />
    </div>
  );
}
