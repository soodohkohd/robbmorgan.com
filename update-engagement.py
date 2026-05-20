#!/usr/bin/env python3
"""
update-engagement.py — regenerate engagement.svg from App Insights
custom events. Companion to update-traffic.py.

Surfaces what users actually DO on the site over the past 7 days:
which hotspots get clicked, which blog posts get read, which music
tracks play, etc. Each event type renders as a horizontal bar chart;
empty sections are skipped.

Usage:  ./update-engagement.py
Requires: az CLI logged in, Python 3.8+.
"""

import json
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

AI_APP = "robbmorgan"
AI_RG = "sdk"
DAYS = 7
OUT = Path(__file__).parent / "engagement.svg"


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


def fetch_events():
    """Pull every custom event from the last DAYS days. Returns a dict
    of {event_name: [customDimensions, ...]} where customDimensions is
    a parsed dict per event."""
    kql = (
        "customEvents "
        "| where timestamp > ago(7d) "
        "| project name, customDimensions"
    )
    data = ai_query(kql)
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
        # Truncate long labels gracefully
        display_label = label if len(label) <= 32 else label[:29] + "…"
        out.append(f'  <text x="{LEFT}" y="{y}" class="bar-label">{display_label}</text>')
        out.append(f'  <rect x="{BAR_X}" y="{bar_y}" width="{bar_w:.1f}" height="16" rx="2" class="bar"/>')
        out.append(f'  <text x="{BAR_X + bar_w + 8:.1f}" y="{y}" class="bar-value">{count}</text>')
        y += 24
    y += 16  # gap before next section
    return ("\n".join(out), y)


def render(today, sections, summary_line) -> str:
    body_chunks = []
    y = 96  # below title + subtitle + summary line
    for title, rows in sections:
        frag, y = render_bar_section(y, title, rows)
        if frag:
            body_chunks.append(frag)
    chart_h = max(y + 24, 200)

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

  <text x="{LEFT}" y="30" class="title">Engagement — past {DAYS} days</text>
  <text x="{LEFT}" y="48" class="subtitle">App Insights "{AI_APP}" custom events · generated {today.isoformat()}</text>
  <text x="{LEFT}" y="72" class="summary">{summary_line}</text>

{chr(10).join(body_chunks) if body_chunks else f'  <text x="{LEFT}" y="120" class="empty">No custom events captured in the past {DAYS} days yet.</text>'}
</svg>
"""


def main() -> None:
    today = datetime.now(timezone.utc).date()
    print("Querying App Insights custom events...", file=sys.stderr)
    events = fetch_events()

    # Build per-section bar lists. Order matters — most-actionable first.
    sections = []

    sections.append(("Hotspot clicks (which desk objects get explored)",
                     count_by(events.get("hotspot_click", []), "spot")))

    sections.append(("Thoughts posts (which essays get opened)",
                     count_by(events.get("blog_post_select", []), "slug")))

    sections.append(("Mobile apps (which apps get viewed)",
                     count_by(events.get("mobile_app_select", []), "slug")))

    # Music: combine audio plays + video opens into one section, mark video
    # rows with a suffix so they're distinguishable.
    music_rows = (
        [(t, c) for t, c in count_by(events.get("music_play", []), "title")] +
        [(f"{t} (video)", c) for t, c in count_by(events.get("music_video_open", []), "title")]
    )
    music_rows.sort(key=lambda x: -x[1])
    sections.append(("Music plays (audio + video opens)", music_rows))

    # Time-of-day picker usage — bucket by "time via via" for a single label
    tod_rows = [(f"{time} ({via})", c) for (time, via), c in count_pairs(events.get("time_of_day_set", []), "time", "via")]
    sections.append(("Time-of-day picker usage", tod_rows))

    # Sound toggle (truthy=on, falsy=off)
    sound_rows = [(f"sound {'on' if str(v).lower() == 'true' else 'off'}", c)
                  for v, c in count_by(events.get("sound_toggle", []), "playing")]
    sections.append(("Ambient sound toggle", sound_rows))

    # Easter egg — just a count, no breakdown
    egg = len(events.get("easter_egg_not_me", []))
    if egg:
        sections.append(("Easter egg: NOT ME!", [("times revealed", egg)]))

    # Summary line shows top-level counts so the headline is at-a-glance.
    summary_parts = []
    for label, key in [
        ("hotspot clicks", "hotspot_click"),
        ("post opens", "blog_post_select"),
        ("music plays", "music_play"),
        ("app views", "mobile_app_select"),
        ("easter eggs", "easter_egg_not_me"),
    ]:
        n = len(events.get(key, []))
        if n:
            summary_parts.append(f"{n} {label}")
    summary_line = " · ".join(summary_parts) if summary_parts else "No custom events captured yet."

    # Print summary to stderr so the user sees what was processed.
    print(f"  Window: past {DAYS} days (UTC)", file=sys.stderr)
    for name, items in events.items():
        print(f"    {name}: {len(items)} events", file=sys.stderr)
    if not events:
        print("    (none yet — wait a few hours after deploy, or generate some interactions)", file=sys.stderr)

    svg = render(today, sections, summary_line)
    OUT.write_text(svg)
    print(f"Wrote {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
