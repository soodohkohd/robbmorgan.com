#!/usr/bin/env python3
"""
update-traffic.py — regenerate traffic.svg from App Insights data.

Queries the "robbmorgan" Application Insights component for unique users
per day over the past 7 calendar days (UTC) and writes a bar-chart SVG
to traffic.svg in the repo root.

Usage:  ./update-traffic.py
Requires: az CLI logged in, Python 3.8+.

The "Users" metric matches what the Azure portal's Usage > Users blade
shows: union(pageViews, customEvents) | dcount(user_Id).
"""

import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

AI_APP = "robbmorgan"
AI_RG = "sdk"
DAYS = 7
OUT = Path(__file__).parent / "traffic.svg"


def run_az(*args: str) -> str:
    result = subprocess.run(["az", *args], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"az failed: {result.stderr.strip()}", file=sys.stderr)
        sys.exit(1)
    return result.stdout


def ai_query(kql: str) -> dict:
    # --offset is required: the CLI silently caps the time window otherwise.
    raw = run_az(
        "monitor", "app-insights", "query",
        "--app", AI_APP, "-g", AI_RG,
        "--analytics-query", kql,
        "--offset", "7d",
        "-o", "json",
    )
    return json.loads(raw)


def query_daily_users(start, end_exclusive):
    kql = (
        f"union pageViews, customEvents "
        f"| where timestamp between (datetime({start.isoformat()}) .. datetime({end_exclusive.isoformat()})) "
        f"| summarize Users = dcount(user_Id) by Day = startofday(timestamp) "
        f"| order by Day asc"
    )
    data = ai_query(kql)
    by_day = {}
    for row in data["tables"][0]["rows"]:
        d = datetime.fromisoformat(row[0].replace("Z", "+00:00")).date()
        by_day[d] = int(row[1])
    return by_day


def query_period_total(start, end_exclusive) -> int:
    kql = (
        f"union pageViews, customEvents "
        f"| where timestamp between (datetime({start.isoformat()}) .. datetime({end_exclusive.isoformat()})) "
        f"| summarize Users = dcount(user_Id)"
    )
    data = ai_query(kql)
    rows = data["tables"][0]["rows"]
    return int(rows[0][0]) if rows else 0


def query_ai_creation_date():
    raw = run_az(
        "monitor", "app-insights", "component", "show",
        "--app", AI_APP, "-g", AI_RG,
        "--query", "creationDate", "-o", "tsv",
    )
    return datetime.fromisoformat(raw.strip()).date()


def nice_max(v: int) -> int:
    """Round value up to a nice axis max."""
    for cap in (5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500, 1000):
        if v <= cap:
            return cap
    return ((v // 1000) + 1) * 1000


def render_svg(by_day, total, today, start, ai_created) -> str:
    days = [start + timedelta(days=i) for i in range(DAYS)]
    max_users = max((by_day.get(d, 0) for d in days), default=0)
    y_max = nice_max(max_users) if max_users > 0 else 5

    chart_w, chart_h = 720, 340
    chart_top, chart_bottom = 80, 260
    chart_left, chart_right = 60, 700
    band_w = (chart_right - chart_left) / DAYS
    bar_pad = 10
    bar_w = band_w - 2 * bar_pad

    def y_of(v: int) -> float:
        if v <= 0:
            return chart_bottom - 1
        return chart_bottom - (v / y_max) * (chart_bottom - chart_top)

    def h_of(v: int) -> float:
        if v <= 0:
            return 1
        return (v / y_max) * (chart_bottom - chart_top)

    # Ticks at 0, 25%, 50%, 75%, 100% of y_max — dedup for small ranges.
    ticks = sorted({0, y_max // 4, y_max // 2, 3 * y_max // 4, y_max})

    out = []
    out.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {chart_w} {chart_h}" '
        f'width="{chart_w}" height="{chart_h}" '
        f'font-family="-apple-system, BlinkMacSystemFont, system-ui, sans-serif">'
    )
    out.append("""  <style>
    .title { font-size: 16px; font-weight: 700; fill: #2a2a2a; }
    .subtitle { font-size: 11px; fill: #6a6a6a; }
    .axis { stroke: #c8c8c8; stroke-width: 1; }
    .gridline { stroke: #e8e8e8; stroke-width: 1; stroke-dasharray: 2,3; }
    .bar { fill: #b8860b; }
    .bar-zero { fill: #e8d8b8; }
    .day-label { font-size: 11px; fill: #4a4a4a; text-anchor: middle; }
    .value-label { font-size: 11px; font-weight: 600; fill: #2a2a2a; text-anchor: middle; }
    .axis-label { font-size: 10px; fill: #8a8a8a; text-anchor: end; }
    .footer { font-size: 11px; fill: #6a6a6a; }
  </style>""")

    out.append(f'  <text x="40" y="28" class="title">Unique users by day — past {DAYS} days</text>')
    out.append(
        f'  <text x="40" y="44" class="subtitle">'
        f'union(pageViews, customEvents) · dcount(user_Id) · App Insights "{AI_APP}" · '
        f'generated {today.isoformat()}</text>'
    )

    out.append(f'  <line x1="{chart_left}" y1="{chart_bottom}" x2="{chart_right}" y2="{chart_bottom}" class="axis" />')
    out.append(f'  <line x1="{chart_left}" y1="{chart_top}" x2="{chart_left}" y2="{chart_bottom}" class="axis" />')

    for t in ticks:
        y = y_of(t) if t > 0 else chart_bottom
        if t > 0:
            out.append(f'  <line x1="{chart_left}" y1="{y:.1f}" x2="{chart_right}" y2="{y:.1f}" class="gridline" />')
        out.append(f'  <text x="{chart_left - 6}" y="{y + 4:.1f}" class="axis-label">{t}</text>')

    for i, d in enumerate(days):
        users = by_day.get(d, 0)
        x = chart_left + i * band_w + bar_pad
        cx = x + bar_w / 2
        y = y_of(users)
        h = h_of(users)
        bar_class = "bar-zero" if users == 0 else "bar"
        out.append(f'  <rect x="{x:.1f}" y="{y:.1f}" width="{bar_w:.1f}" height="{h:.1f}" class="{bar_class}" />')
        label_y = y - 8 if users > 0 else chart_bottom - 8
        out.append(f'  <text x="{cx:.1f}" y="{label_y:.1f}" class="value-label">{users}</text>')
        day_text = d.strftime("%b %-d") + ("*" if d == today else "")
        out.append(f'  <text x="{cx:.1f}" y="{chart_bottom + 18}" class="day-label">{day_text}</text>')

    notes = []
    pre_ai_days = [d for d in days if d < ai_created]
    if pre_ai_days:
        if len(pre_ai_days) == 1:
            notes.append(
                f'No data {pre_ai_days[0].strftime("%b %-d")}: '
                f'App Insights resource didn\'t yet exist (created {ai_created.isoformat()}).'
            )
        else:
            notes.append(
                f'No data {pre_ai_days[0].strftime("%b %-d")}–{pre_ai_days[-1].strftime("%b %-d")}: '
                f'App Insights resource didn\'t yet exist (created {ai_created.isoformat()}).'
            )
    notes.append(
        f'* today (partial). Period total: {total} unique users '
        f'(some span multiple days, so this is ≤ sum of daily bars).'
    )
    for i, n in enumerate(notes):
        out.append(f'  <text x="40" y="{304 + i * 16}" class="footer">{n}</text>')

    out.append("</svg>")
    return "\n".join(out) + "\n"


def main() -> None:
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=DAYS - 1)
    end_exclusive = today + timedelta(days=1)

    print("Querying App Insights...", file=sys.stderr)
    by_day = query_daily_users(start, end_exclusive)
    total = query_period_total(start, end_exclusive)
    ai_created = query_ai_creation_date()

    print(f"  Window: {start.isoformat()} → {today.isoformat()} ({DAYS} days)", file=sys.stderr)
    for d in (start + timedelta(days=i) for i in range(DAYS)):
        print(f"    {d.isoformat()}: {by_day.get(d, 0)} users", file=sys.stderr)
    print(f"  Period total: {total}", file=sys.stderr)
    print(f"  AI resource created: {ai_created.isoformat()}", file=sys.stderr)

    svg = render_svg(by_day, total, today, start, ai_created)
    OUT.write_text(svg)
    print(f"Wrote {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
