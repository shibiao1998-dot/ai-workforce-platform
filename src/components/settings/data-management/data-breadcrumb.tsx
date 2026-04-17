"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export interface DataBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function DataBreadcrumb({ items }: DataBreadcrumbProps) {
  if (items.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && <ChevronRight className="size-3.5 shrink-0" />}
            {isLast ? (
              <span className="font-semibold text-foreground">{item.label}</span>
            ) : (
              <button
                type="button"
                onClick={item.onClick}
                className={cn(
                  "hover:text-foreground transition-colors",
                  item.onClick && "cursor-pointer underline-offset-2 hover:underline"
                )}
              >
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
