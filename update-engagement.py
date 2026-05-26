#!/usr/bin/env python3
"""
update-engagement.py — regenerate engagement.svg from App Insights
custom events. Companion to update-traffic.py.

Surfaces what users actually DO on the site over a user-specified
timeframe: which hotspots get clicked, which blog posts get read, which
music tracks play, etc. Each event type renders as a horizontal bar
chart; empty sections are skipped. For single-day windows (default) it
skips the SVG and just prints today's totals to stderr.

Usage:
  ./update-engagement.py             # today only (console, no SVG)
  ./update-engagement.py today       # synonym for the above
  ./update-engagement.py 7           # past 7 days
  ./update-engagement.py 30          # past 30 days
  ./update-engagement.py month       # month-to-date
  ./update-engagement.py ytd         # year-to-date

Requires: az CLI logged in, Python 3.8+.
"""

from __future__ import annotations

import json
import subprocess
import sys
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

AI_APP = "robbmorgan"
AI_RG = "sdk"
OUT = Path(__file__).parent / "engagement.svg"

# Hotspot key → user-visible label. Mirrors spots[] in
# code/src/app/landing/landing.ts. The engagement event emits the
# stable key; the report displays the label so charts read naturally
# ("Certs" rather than "roots"). Keep in sync if a key/label changes.
SPOT_LABELS = {
    "resume":      "Resume",
    "web-apps":    "Code",
    "mobile-apps": "Mobile Apps",
    "roots":       "Certs",
    "novels":      "Novels",
    "blog":        "Thoughts",
    "music":       "Music",
    "break":       "Take a Break",
    "desk":        "The Desk",
    "contact":     "Contact",
    "keyboard":    "Scenes",
    "not-me":      "NOT ME!",
    "sound":       "Sound toggle",
}


# ---------- Timeframe parsing ----------

def parse_timeframe(arg: str | None) -> tuple[date, date, str]:
    """Resolve the CLI arg into (start, end_exclusive, label)."""
    today = datetime.now(timezone.utc).date()
    end_exclusive = today + timedelta(days=1)

    if arg is None or arg.lower() == "today":
        return (today, end_exclusive, "today")

    if arg.lower() == "ytd":
        start = today.replace(month=1, day=1)
        return (start, end_exclusive, f"{today.year} year-to-date")

    if arg.lower() == "month":
        start = today.replace(day=1)
        return (start, end_exclusive, today.strftime("%B %Y") + " (month-to-date)")

    try:
        n = int(arg)
        if n < 1:
            raise ValueError
    except ValueError:
        print(f"Invalid timeframe: {arg!r}", file=sys.stderr)
        print("Usage: ./update-engagement.py [N | today | month | ytd]", file=sys.stderr)
        sys.exit(2)

    start = today - timedelta(days=n - 1)
    return (start, end_exclusive, f"past {n} day{'s' if n != 1 else ''}")


# ---------- az CLI helpers ----------

def run_az(*args: str) -> str:
    result = subprocess.run(["az", *args], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"az failed: {result.stderr.strip()}", file=sys.stderr)
        sys.exit(1)
    return result.stdout


def ai_query(kql: str, lookback_days: int) -> dict:
    # --offset is required: the CLI silently caps the time window otherwise.
    offset = f"{max(35, lookback_days + 5)}d"
    raw = run_az(
        "monitor", "app-insights", "query",
        "--app", AI_APP, "-g", AI_RG,
        "--analytics-query", kql,
        "--offset", offset,
        "-o", "json",
    )
    return json.loads(raw)


def fetch_events(start, end_exclusive):
    """Pull every custom event in the window. Returns a dict of
    {event_name: [customDimensions, ...]} where each customDimensions
    is a parsed dict per event."""
    kql = (
        f"customEvents "
        f"| where timestamp between (datetime({start.isoformat()}) .. datetime({end_exclusive.isoformat()})) "
        f"| project name, customDimensions"
    )
    lookback = (end_exclusive - start).days
    data = ai_query(kql, lookback)
    by_name = defaultdict(list)
    for row in data["tables"][0]["rows"]:
        name = row[0]
        raw = row[1]
        # customDimensions can come back as either an object or a JSON
        # string depending on CLI/portal version — handle both.
        if isinstance(raw, str):
            try:
                dims = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                dims = {}
        else:
            dims = raw or {}
        by_name[name].append(dims)
    return by_name


def count_by(events, key, fallback="?"):
    """Bucket a list of customDimensions dicts by a property, return
    a list of (label, count) sorted by count desc."""
    counts = defaultdict(int)
    for d in events:
        counts[d.get(key, fallback)] += 1
    return sorted(counts.items(), key=lambda x: -x[1])


def count_pairs(events, key1, key2):
    """Bucket by (key1, key2) — used for time_of_day_set so we can split
    picker vs mobile_cycle usage by time-of-day."""
    counts = defaultdict(int)
    for d in events:
        counts[(d.get(key1, "?"), d.get(key2, "?"))] += 1
    return sorted(counts.items(), key=lambda x: -x[1])


# ---------- SVG rendering ----------

CHART_W = 920
LEFT = 40
LABEL_W = 220             # how much horizontal space labels get
BAR_X = LEFT + LABEL_W    # where bars start
BAR_MAX_W = CHART_W - BAR_X - 80  # leave room for the count value


def render_bar_section(y: int, title: str, rows: list[tuple[str, int]]) -> tuple[str, int]:
    """Render one section. Returns (svg_fragment, next_y)."""
    if not rows:
        return ("", y)
    total = sum(c for _, c in rows)
    max_count = max(c for _, c in rows) or 1
    out = []
    out.append(f'  <text x="{LEFT}" y="{y}" class="section-title">{title} '
               f'<tspan class="section-total">— {total} event{"s" if total != 1 else ""}</tspan></text>')
    y += 24
    for label, count in rows:
        bar_w = (count / max_count) * BAR_MAX_W
        bar_y = y - 12
        display_label = label if len(label) <= 32 else label[:29] + "…"
        out.append(f'  <text x="{LEFT}" y="{y}" class="bar-label">{display_label}</text>')
        out.append(f'  <rect x="{BAR_X}" y="{bar_y}" width="{bar_w:.1f}" height="16" rx="2" class="bar"/>')
        out.append(f'  <text x="{BAR_X + bar_w + 8:.1f}" y="{y}" class="bar-value">{count}</text>')
        y += 24
    y += 16
    return ("\n".join(out), y)


def render(today, label, sections, summary_line) -> str:
    body_chunks = []
    y = 96
    for title, rows in sections:
        frag, y = render_bar_section(y, title, rows)
        if frag:
            body_chunks.append(frag)
    chart_h = max(y + 24, 200)

    empty_msg = f'  <text x="{LEFT}" y="120" class="empty">No custom events captured in {label}.</text>'

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CHART_W} {chart_h}" width="{CHART_W}" height="{chart_h}" font-family="-apple-system, BlinkMacSystemFont, system-ui, sans-serif">
  <style>
    .title       {{ font-size: 17px; font-weight: 700; fill: #2a2a2a; }}
    .subtitle    {{ font-size: 11px; fill: #6a6a6a; }}
    .summary     {{ font-size: 12px; fill: #4a4a4a; font-weight: 600; }}
    .section-title {{ font-size: 14px; font-weight: 700; fill: #2a2a2a; }}
    .section-total {{ font-size: 12px; font-weight: 400; fill: #8a8a8a; }}
    .bar-label   {{ font-size: 12px; fill: #4a4a4a; }}
    .bar         {{ fill: #b8860b; }}
    .bar-value   {{ font-size: 12px; font-weight: 600; fill: #2a2a2a; }}
    .empty       {{ font-size: 12px; fill: #8a8a8a; font-style: italic; }}
  </style>

  <text x="{LEFT}" y="30" class="title">Engagement — {label}</text>
  <text x="{LEFT}" y="48" class="subtitle">App Insights "{AI_APP}" custom events · generated {today.isoformat()}</text>
  <text x="{LEFT}" y="72" class="summary">{summary_line}</text>

{chr(10).join(body_chunks) if body_chunks else empty_msg}
</svg>
"""


# ---------- main ----------

def build_sections(events):
    sections = []

    hotspot_rows = [(SPOT_LABELS.get(spot, spot), count)
                    for spot, count in count_by(events.get("hotspot_click", []), "spot")]
    sections.append(("Hotspot clicks (which desk objects get explored)",
                     hotspot_rows))

    sections.append(("Thoughts posts (which essays get opened)",
                     count_by(events.get("blog_post_select", []), "slug")))

    sections.append(("Mobile apps (which apps get viewed)",
                     count_by(events.get("mobile_app_select", []), "slug")))

    sections.append(("Music plays (audio)",
                     count_by(events.get("music_play", []), "title")))

    tod_rows = [(f"{time} ({via})", c) for (time, via), c in count_pairs(events.get("time_of_day_set", []), "time", "via")]
    sections.append(("Time-of-day picker usage", tod_rows))

    sound_rows = [(f"sound {'on' if str(v).lower() == 'true' else 'off'}", c)
                  for v, c in count_by(events.get("sound_toggle", []), "playing")]
    sections.append(("Ambient sound toggle", sound_rows))

    # Easter egg — clicking the "Just Like Me" cover on Music opens the
    # video. Always render so the count stays visible at-a-glance.
    egg_rows = count_by(events.get("music_video_open", []), "title")
    if not egg_rows:
        egg_rows = [("(no reveals yet)", 0)]
    sections.append(("Easter egg — Just Like Me video reveal", egg_rows))

    return sections


def main() -> None:
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    start, end_exclusive, label = parse_timeframe(arg)
    today = datetime.now(timezone.utc).date()

    print(f"Querying App Insights custom events ({label})...", file=sys.stderr)
    events = fetch_events(start, end_exclusive)

    print(f"  Window: {start.isoformat()} → {today.isoformat()} ({label}, UTC)", file=sys.stderr)
    for name, items in events.items():
        print(f"    {name}: {len(items)} events", file=sys.stderr)
    if not events:
        print("    (none yet — wait a few hours after deploy, or generate some interactions)", file=sys.stderr)

    # For single-day default, skip SVG regeneration — console-only.
    if (end_exclusive - start).days <= 1:
        print("(single-day window — SVG not regenerated)", file=sys.stderr)
        return

    sections = build_sections(events)

    summary_parts = []
    for slabel, key in [
        ("hotspot clicks", "hotspot_click"),
        ("post opens", "blog_post_select"),
        ("music plays", "music_play"),
        ("app views", "mobile_app_select"),
        ("easter eggs", "music_video_open"),
    ]:
        n = len(events.get(key, []))
        if n:
            summary_parts.append(f"{n} {slabel}")
    summary_line = " · ".join(summary_parts) if summary_parts else f"No custom events captured in {label}."

    svg = render(today, label, sections, summary_line)
    OUT.write_text(svg)
    print(f"Wrote {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
