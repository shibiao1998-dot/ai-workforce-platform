"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SummaryCard {
  label: string;
  value: string | number;
  change?: { value: string; positive: boolean };
}

export interface DataSummaryCardsProps {
  cards: SummaryCard[];
}

export function DataSummaryCards({ cards }: DataSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="rounded-lg border bg-card p-4 shadow-sm"
        >
          <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
          <p className="text-2xl font-bold leading-none">{card.value}</p>
          {card.change && (
            <p
              className={cn(
                "mt-1.5 flex items-center gap-0.5 text-xs font-medium",
                card.change.positive ? "text-green-600" : "text-red-500"
              )}
            >
              {card.change.positive ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {card.change.value}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
