---
version: alpha
name: AI Workforce Platform Dashboard
description: NetDragon-style operating cockpit for an internal AI workforce platform.
colors:
  primary: "#1266f9"
  background: "#070b1f"
  surface: "#101a3a"
  ndInk: "#eef5ff"
  ndInkSoft: "#9aa9bd"
  ndSurface: "#101a3a"
  ndCanvas: "#070b1f"
  ndLine: "#2f3b57"
  ndPrimary: "#1266f9"
  ndPrimaryDeep: "#163c9c"
  ndSecondary: "#10c6af"
  ndAccent: "#f9ae2f"
  ndViolet: "#9859e7"
  ndEmerald: "#1fbe7d"
  ndSapphire: "#1266f9"
  ndVoid: "#0a0d1f"
  ndVoidEdge: "#13ecd1"
  ndGoldLine: "#d8b14f"
  ndDanger: "#e3343a"
  ndGlassBg: "#0d1530"
  ndGlassBorder: "#3ee2de"
typography:
  body:
    fontFamily: "Geist, HarmonyOS Sans SC, PingFang SC, Noto Sans CJK SC, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.57
  display:
    fontFamily: "Geist Mono, HarmonyOS Sans SC, monospace"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1
  sectionTitle:
    fontFamily: "HarmonyOS Sans SC, PingFang SC, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: 6px
  md: 10px
  lg: 16px
  xl: 24px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  dashboard-hero:
    backgroundColor: "{colors.ndVoid}"
    textColor: "#ffffff"
    rounded: "{rounded.xl}"
    padding: 32px
  metric-card:
    backgroundColor: "{colors.ndSurface}"
    textColor: "{colors.ndInk}"
    rounded: "{rounded.lg}"
    padding: 20px
  glass-panel:
    backgroundColor: "{colors.ndGlassBg}"
    textColor: "{colors.ndInk}"
    rounded: "{rounded.lg}"
    padding: 20px
---

## Overview

The dashboard is a flagship operating cockpit, not a generic SaaS analytics page. It should make the AI workforce feel like a live command center: one strong cinematic hero, dense but legible operating metrics, visible production flow, team status, and recent work evidence.

The cockpit should read as one deep operating environment. Avoid mixing a cinematic dark hero with pure white analytics cards. If a lower panel needs contrast, use translucent dark glass, cyan-blue borders, and controlled accent color rather than switching back to a light admin surface.

## Colors

Use three visual layers.

Layer 1 is daily operation: `ndCanvas`, `ndSurface`, `ndInk`, `ndInkSoft`, and `ndLine`. Most dashboard cards and charts live here, but in the cockpit route this layer is a deep ink surface rather than white.

Layer 2 is brand signal: `ndPrimary`, `ndSecondary`, `ndAccent`, `ndViolet`, `ndEmerald`, and `ndSapphire`. Use it for KPI ribbons, team identity, chart intensity, status dots, and active flow.

Layer 3 is the flagship highlight: `ndVoid` and `ndVoidEdge`. This layer belongs to the hero, mission pulse chart, and rare high-emphasis modules. Do not scatter unrelated dark blocks; make the whole cockpit cohesive through shared dark tokens.

Avoid beige, brown, flat gray dashboards, or pure monochrome blue. NetDragon here means electric blue, technology cyan, amber gold, deep ink blue, and restrained team colors.

## Typography

Use Chinese system sans for labels and body text. Use the display font only for numbers, counters, and short cockpit readouts. Do not use display typography for paragraphs.

Dashboard headings should stay compact. The cockpit is for scanning and repeated operational use, so avoid oversized marketing copy below the hero.

## Layout & Spacing

The desktop dashboard follows five bands:

1. Asymmetric command deck: hero operating summary plus spotlight employee panel.
2. KPI matrix as a compact metric rail.
3. Production flow plus team health drill-down.
4. Evidence panels: wide activity pulse chart plus stacked achievements and recent tasks.
5. Drill-down overlays and drawers.

Use 24px page padding and 16px grid gaps on desktop. Cards should align to a predictable grid; avoid nested decorative cards. Each repeated panel should be a single card-like surface, not a card inside another card.

The lower evidence panels must not look empty. If a visualization has no usable data, show a designed empty state with the reason and next expected signal.

## Elevation & Depth

Use soft cold-blue shadows rather than gray drop shadows. Glass panels can use translucent white and blur, but they must still have clear borders and enough contrast against the canvas.

Motion is reserved for flow or live-state indicators. Use `.nd-flow` for production flow and subtle progress emphasis. Respect reduced motion.

## Shapes

Use 16px radius for dashboard panels and metric cards. Use 24px only for the hero or large flagship containers. Small status chips and badge shells can use full radius.

Do not over-round compact work panels. The dashboard should feel precise and operational, not playful.

## Components

Hero: use a dark cinematic image with a readable gradient overlay. It should be the only dominant Layer 3 block on the page. Pair it with a darker spotlight crew panel so visual assets are visible in the first viewport.

Metric cards: use white surface, compact labels, Orbitron values, and a thin top brand ribbon. Sparkline contrast must be visible at a glance.

Production flow: use a horizontal process line with live energy movement. Zero-count nodes remain visible but subdued. Below the flow, show team-level progress controls instead of a second row of generic cards.

Evidence panels: activity, achievements, and recent tasks should share the same dark glass treatment so the bottom band reads as one system. Replace the old heatmap with a high-impact activity pulse chart: 30-day production curve, team energy bands, and top active operators. It should occupy more horizontal space than the feed columns and should not leave a large blank chart region.

Charts: prefer NetDragon colors over default orange or generic ECharts palettes. Empty charts must render an intentional empty state instead of a blank canvas.

## Do's and Don'ts

Do make the cockpit feel live, quantified, and scan-friendly.

Do keep real business data visible: task volume, adoption, accuracy, savings, production nodes, team health, achievements, and recent work.

Do use visual assets where they explain the product or reinforce the command-center mood.

Don't turn every section into a dark hero block.

Don't add marketing hero layouts, decorative blobs, or large explanatory copy.

Don't let lower dashboard panels fall back to generic white cards with inline gray styles.

Don't show a large blank chart region; an empty state is better than unexplained whitespace.
