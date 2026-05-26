#!/usr/bin/env python3
"""
update-traffic.py — regenerate traffic.svg from App Insights data.

Queries the "robbmorgan" Application Insights component for unique users
over a user-specified timeframe and writes a bar-chart SVG to
traffic.svg in the repo root. For single-day windows (default) it skips
the SVG and just prints today's stats to stderr.

Usage:
  ./update-traffic.py             # today only (console, no SVG written)
  ./update-traffic.py today       # synonym for the above
  ./update-traffic.py 7           # past 7 days (daily bars)
  ./update-traffic.py 30          # past 30 days (daily bars)
  ./update-traffic.py month       # current month, month-to-date (daily bars)
  ./update-traffic.py ytd         # current year, year-to-date (monthly bars)

Requires: az CLI logged in, Python 3.8+.

The "Users" metric matches what the Azure portal's Usage > Users blade
shows: union(pageViews, customEvents) | dcount(user_Id).
"""

from __future__ import annotations

import json
import subprocess
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

AI_APP = "robbmorgan"
AI_RG = "sdk"
OUT = Path(__file__).parent / "traffic.svg"


# ---------- Timeframe parsing ----------

def parse_timeframe(arg: str | None) -> tuple[date, date, str, str]:
    """Resolve the CLI arg into (start, end_exclusive, granularity, label).
    granularity is 'day' for short windows, 'month' for year-to-date.
    """
    today = datetime.now(timezone.utc).date()
    end_exclusive = today + timedelta(days=1)

    if arg is None or arg.lower() == "today":
        return (today, end_exclusive, "day", "today")

    if arg.lower() == "ytd":
        start = today.replace(month=1, day=1)
        return (start, end_exclusive, "month", f"{today.year} year-to-date")

    if arg.lower() == "month":
        start = today.replace(day=1)
        return (start, end_exclusive, "day",
                today.strftime("%B %Y") + " (month-to-date)")

    try:
        n = int(arg)
        if n < 1:
            raise ValueError
    except ValueError:
        print(f"Invalid timeframe: {arg!r}", file=sys.stderr)
        print("Usage: ./update-traffic.py [N | today | month | ytd]", file=sys.stderr)
        sys.exit(2)

    start = today - timedelta(days=n - 1)
    return (start, end_exclusive, "day", f"past {n} day{'s' if n != 1 else ''}")


# ---------- az CLI helpers ----------

def run_az(*args: str) -> str:
    result = subprocess.run(["az", *args], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"az failed: {result.stderr.strip()}", file=sys.stderr)
        sys.exit(1)
    return result.stdout


def ai_query(kql: str, lookback_days: int) -> dict:
    # --offset is required: the CLI silently caps the time window otherwise.
    # Pad the offset so YTD (~365d) and other long windows fit.
    offset = f"{max(35, lookback_days + 5)}d"
    raw = run_az(
        "monitor", "app-insights", "query",
        "--app", AI_APP, "-g", AI_RG,
        "--analytics-query", kql,
        "--offset", offset,
        "-o", "json",
    )
    return json.loads(raw)


def query_period_buckets(start, end_exclusive, granularity):
    """Returns dict period_start_date -> unique users.
    granularity='day'   buckets are calendar days
    granularity='month' buckets are calendar months (period_start = 1st of month)
    """
    bucket_fn = "startofday(timestamp)" if granularity == "day" else "startofmonth(timestamp)"
    kql = (
        f"union pageViews, customEvents "
        f"| where timestamp between (datetime({start.isoformat()}) .. datetime({end_exclusive.isoformat()})) "
        f"| summarize Users = dcount(user_Id) by Period = {bucket_fn} "
        f"| order by Period asc"
    )
    lookback = (end_exclusive - start).days
    data = ai_query(kql, lookback)
    by_period = {}
    for row in data["tables"][0]["rows"]:
        d = datetime.fromisoformat(row[0].replace("Z", "+00:00")).date()
        by_period[d] = int(row[1])
    return by_period


def query_period_total(start, end_exclusive) -> int:
    kql = (
        f"union pageViews, customEvents "
        f"| where timestamp between (datetime({start.isoformat()}) .. datetime({end_exclusive.isoformat()})) "
        f"| summarize Users = dcount(user_Id)"
    )
    lookback = (end_exclusive - start).days
    data = ai_query(kql, lookback)
    rows = data["tables"][0]["rows"]
    return int(rows[0][0]) if rows else 0


def query_ai_creation_date():
    raw = run_az(
        "monitor", "app-insights", "component", "show",
        "--app", AI_APP, "-g", AI_RG,
        "--query", "creationDate", "-o", "tsv",
    )
    return datetime.fromisoformat(raw.strip()).date()


# ---------- Period helpers ----------

def days_in_range(start, end_exclusive):
    """Inclusive start, exclusive end. Returns list of dates."""
    n = (end_exclusive - start).days
    return [start + timedelta(days=i) for i in range(n)]


def months_in_range(start, end_exclusive):
    """Returns list of first-of-month dates from start's month
    through (end_exclusive - 1 day)'s month, inclusive."""
    months = []
    cursor = start.replace(day=1)
    last_day = end_exclusive - timedelta(days=1)
    last_month = last_day.replace(day=1)
    while cursor <= last_month:
        months.append(cursor)
        if cursor.month == 12:
            cursor = cursor.replace(year=cursor.year + 1, month=1)
        else:
            cursor = cursor.replace(month=cursor.month + 1)
    return months


# ---------- SVG rendering ----------

def nice_max(v: int) -> int:
    """Round value up to a nice axis max."""
    for cap in (5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500, 1000):
        if v <= cap:
            return cap
    return ((v // 1000) + 1) * 1000


def render_svg(periods, by_period, total, today, granularity, label, ai_created) -> str:
    num_bars = len(periods)
    max_users = max((by_period.get(p, 0) for p in periods), default=0)
    y_max = nice_max(max_users) if max_users > 0 else 5

    chart_w, chart_h = 720, 340
    chart_top, chart_bottom = 80, 260
    chart_left, chart_right = 60, 700
    band_w = (chart_right - chart_left) / num_bars
    # Padding scales with bar count — wide bars get more breathing room.
    bar_pad = 10 if num_bars <= 12 else (5 if num_bars <= 20 else 2)
    bar_w = band_w - 2 * bar_pad

    def y_of(v: int) -> float:
        if v <= 0:
            return chart_bottom - 1
        return chart_bottom - (v / y_max) * (chart_bottom - chart_top)

    def h_of(v: int) -> float:
        if v <= 0:
            return 1
        return (v / y_max) * (chart_bottom - chart_top)

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
    .value-label-small { font-size: 9px; font-weight: 600; fill: #2a2a2a; text-anchor: middle; }
    .axis-label { font-size: 10px; fill: #8a8a8a; text-anchor: end; }
    .footer { font-size: 11px; fill: #6a6a6a; }
  </style>""")

    title_kind = "month" if granularity == "month" else "day"
    out.append(f'  <text x="40" y="28" class="title">Unique users by {title_kind} — {label}</text>')
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

    # Label cadence: every bar when <= 12, every 5th day when 13-31, every
    # 7th day for longer daily windows. Monthly granularity always labels
    # every month. Today's bar always gets a label + asterisk.
    if granularity == "month":
        labeled_indices = set(range(num_bars))
    elif num_bars <= 12:
        labeled_indices = set(range(num_bars))
    elif num_bars <= 31:
        labeled_indices = {i for i, p in enumerate(periods) if p.day in {1, 5, 10, 15, 20, 25, 30}}
    else:
        labeled_indices = {i for i, p in enumerate(periods) if (p - periods[0]).days % 7 == 0}

    # Value-label font: shrink when bars get narrow.
    value_class = "value-label" if num_bars <= 14 else "value-label-small"

    today_period = today if granularity == "day" else today.replace(day=1)

    for i, p in enumerate(periods):
        users = by_period.get(p, 0)
        x = chart_left + i * band_w + bar_pad
        cx = x + bar_w / 2
        y = y_of(users)
        h = h_of(users)
        bar_class = "bar-zero" if users == 0 else "bar"
        out.append(f'  <rect x="{x:.1f}" y="{y:.1f}" width="{bar_w:.1f}" height="{h:.1f}" class="{bar_class}" />')

        is_today = (p == today_period)
        # Value labels: every bar for monthly/short daily, non-zero only for dense daily.
        show_value = users > 0 or num_bars <= 7
        if show_value:
            label_y = y - 6
            out.append(f'  <text x="{cx:.1f}" y="{label_y:.1f}" class="{value_class}">{users}</text>')

        if i in labeled_indices or is_today:
            if granularity == "month":
                day_text = p.strftime("%b") + ("*" if is_today else "")
            else:
                day_text = (p.strftime("%b %-d") if num_bars <= 12 else str(p.day)) + ("*" if is_today else "")
            out.append(f'  <text x="{cx:.1f}" y="{chart_bottom + 18}" class="day-label">{day_text}</text>')

    notes = []
    pre_ai_periods = [p for p in periods if (
        (granularity == "day" and p < ai_created) or
        (granularity == "month" and p.replace(day=28) + timedelta(days=4) < ai_created.replace(day=1))
    )]
    if pre_ai_periods and granularity == "day":
        if len(pre_ai_periods) == 1:
            notes.append(
                f'No data {pre_ai_periods[0].strftime("%b %-d")}: '
                f'App Insights resource didn\'t yet exist (created {ai_created.isoformat()}).'
            )
        else:
            notes.append(
                f'No data {pre_ai_periods[0].strftime("%b %-d")}–{pre_ai_periods[-1].strftime("%b %-d")}: '
                f'App Insights resource didn\'t yet exist (created {ai_created.isoformat()}).'
            )
    elif pre_ai_periods and granularity == "month":
        notes.append(
            f'No data before {ai_created.strftime("%b %Y")}: '
            f'App Insights resource was created {ai_created.isoformat()}.'
        )
    period_word = "month" if granularity == "month" else "day"
    notes.append(
        f'* current {period_word} (partial). Period total: {total} unique users '
        f'(some span multiple {period_word}s, so this is ≤ sum of bars).'
    )
    for i, n in enumerate(notes):
        out.append(f'  <text x="40" y="{304 + i * 16}" class="footer">{n}</text>')

    out.append("</svg>")
    return "\n".join(out) + "\n"


# ---------- main ----------

def main() -> None:
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    start, end_exclusive, granularity, label = parse_timeframe(arg)
    today = datetime.now(timezone.utc).date()

    print(f"Querying App Insights ({label})...", file=sys.stderr)
    by_period = query_period_buckets(start, end_exclusive, granularity)
    total = query_period_total(start, end_exclusive)
    ai_created = query_ai_creation_date()

    if granularity == "month":
        periods = months_in_range(start, end_exclusive)
    else:
        periods = days_in_range(start, end_exclusive)

    print(f"  Window: {start.isoformat()} → {today.isoformat()} ({label})", file=sys.stderr)
    for p in periods:
        key = p.strftime("%Y-%m") if granularity == "month" else p.isoformat()
        print(f"    {key}: {by_period.get(p, 0)} users", file=sys.stderr)
    print(f"  Period total: {total}", file=sys.stderr)
    print(f"  AI resource created: {ai_created.isoformat()}", file=sys.stderr)

    if len(periods) <= 1:
        print("(single-period window — SVG not regenerated)", file=sys.stderr)
        return

    svg = render_svg(periods, by_period, total, today, granularity, label, ai_created)
    OUT.write_text(svg)
    print(f"Wrote {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
