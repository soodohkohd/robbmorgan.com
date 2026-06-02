#!/usr/bin/env python3
"""
update-search.py — where does robbmorgan.com sit in Google?

Queries the Google Search Console "Search Analytics" API for the
robbmorgan.com property and prints, for a chosen timeframe:

  • top SEARCH QUERIES (keywords) people typed, with your average
    Google POSITION (rank), impressions, clicks and CTR;
  • top PAGES of yours that appeared in results; and
  • the best query→page pairs (which page ranked for which keyword).

This is ground truth from Google itself — not a guess — but note Search
Console data lags ~2-3 days, so very recent days are empty. The default
window is the trailing 28 days (Search Console's own default).

Usage:
  ./update-search.py            # trailing 28 days (default)
  ./update-search.py 7          # trailing 7 days
  ./update-search.py 28         # trailing 28 days
  ./update-search.py 90         # trailing 90 days (~3 months)
  ./update-search.py month      # current month, month-to-date
  ./update-search.py ytd        # current year, year-to-date
  ./update-search.py 16m        # trailing 16 months (Google's max history)
  ./update-search.py inspect    # per-route INDEXING status (URL Inspection API)

Companion to update-traffic.py / update-engagement.py, but those hit
Azure App Insights (your own analytics); this one hits Google's index.

------------------------------------------------------------------
ONE-TIME SETUP (OAuth — recommended; you sign in as yourself once)
------------------------------------------------------------------
This path authenticates as the human Search Console OWNER, so it
sidesteps the service-account "email not found" propagation delay in
Search Console's Add-user dialog. After a single browser consent it's
fully headless (a refresh token is cached locally).

1. Create/reuse a Google Cloud project at
   https://console.cloud.google.com/ and ENABLE the
   "Google Search Console API" (APIs & Services → Library).
2. APIs & Services → OAuth consent screen → User type "External" →
   fill the required app-name/email fields → Save. Under "Test users",
   ADD YOUR OWN Google email (the one that owns robbmorgan.com in
   Search Console). (Publishing isn't required; a test user can grant
   consent.)
3. APIs & Services → Credentials → Create Credentials → OAuth client
   ID → Application type "Desktop app" → Create → Download JSON.
   Save it as  oauth-client.json  in this repo root (gitignored).
4. Run this script. A browser opens once; sign in with that same
   Google account and approve read-only Search Console access. A
   gsc-token.json is written and reused on every later run.

ALTERNATIVE SETUP (service account — needs propagation, no browser):
   Create a service account, download its JSON key as
   gsc-credentials.json here, then add its client_email as a user in
   Search Console → Settings → Users and permissions. The script uses
   this automatically if no oauth-client.json/gsc-token.json is present.

Run with the project venv:
  .venv-gsc/bin/python update-search.py 28
(or just ./update-search.py — it re-execs into that venv).
"""

from __future__ import annotations

import os
import sys
import warnings
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

# The Google + urllib3 libs spam warnings about macOS system Python 3.9
# being EOL and LibreSSL not being OpenSSL; both are harmless here and
# clutter the report. Silence them.
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", message=".*OpenSSL.*")
warnings.filterwarnings("ignore", message=".*LibreSSL.*")

ROOT = Path(__file__).parent

# Re-exec into the project venv if the Google libs live there but not in
# the interpreter we were launched with. Lets `./update-search.py` just
# work regardless of which python the shebang resolved to. We detect
# "am I already in the venv?" via sys.prefix rather than comparing
# interpreter paths — a venv's bin/python is usually a symlink to the
# base python, so path-resolve would falsely report them equal.
_VENV_DIR = ROOT / ".venv-gsc"
_VENV_PY = _VENV_DIR / "bin" / "python"
_IN_VENV = Path(sys.prefix).resolve() == _VENV_DIR.resolve()
if not _IN_VENV and _VENV_PY.exists():
    try:
        import googleapiclient  # noqa: F401
    except ImportError:
        os.execv(str(_VENV_PY), [str(_VENV_PY), *sys.argv])

# Auth: two supported paths, OAuth preferred (it uses YOUR own owner
# access, so it sidesteps the service-account "email not found"
# propagation delay in Search Console's Add-user dialog).
#   OAuth  — oauth-client.json (downloaded "Desktop" OAuth client) +
#            gsc-token.json (auto-written after the one-time consent).
#   ServiceAccount (fallback) — gsc-credentials.json (key file), only
#            usable once its email is added as a Search Console user.
OAUTH_CLIENT_PATH = Path(os.environ.get("GSC_OAUTH_CLIENT", ROOT / "oauth-client.json"))
TOKEN_PATH = Path(os.environ.get("GSC_TOKEN", ROOT / "gsc-token.json"))
CRED_PATH = Path(os.environ.get("GSC_CREDENTIALS", ROOT / "gsc-credentials.json"))
# Optional explicit property override, e.g. GSC_SITE='sc-domain:robbmorgan.com'
SITE_OVERRIDE = os.environ.get("GSC_SITE")
DOMAIN = "robbmorgan.com"
SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]

# Google Search Console finalizes data ~2-3 days late; the most recent
# couple of days are usually empty. We still ask through "today" so the
# window matches what you expect, but flag the lag in the header.
DATA_LAG_DAYS = 3

# Routes to check in `inspect` mode — mirror app.routes.ts (drop the ''
# wildcard 404). '' is the homepage. Keep in sync if routes change.
ROUTES = [
    "", "resume", "novels", "web-apps", "mobile-apps", "blog",
    "music", "contact", "certs", "photos", "rocket", "the-desk",
]


# ---------- Timeframe parsing ----------

def parse_timeframe(arg: str | None) -> tuple[date, date, str]:
    """Resolve the CLI arg into (start, end_inclusive, label).

    Search Console dates are INCLUSIVE on both ends, unlike the App
    Insights scripts' exclusive end.
    """
    today = datetime.now(timezone.utc).date()

    if arg is None or arg.lower() in {"28", "default"}:
        return (today - timedelta(days=27), today, "trailing 28 days")

    if arg.lower() == "ytd":
        return (today.replace(month=1, day=1), today, f"{today.year} year-to-date")

    if arg.lower() == "month":
        return (today.replace(day=1), today, today.strftime("%B %Y") + " (month-to-date)")

    if arg.lower() in {"16m", "16months", "max"}:
        # ~16 months is Google's retention ceiling.
        return (today - timedelta(days=485), today, "trailing 16 months")

    try:
        n = int(arg)
        if n < 1:
            raise ValueError
    except ValueError:
        print(f"Invalid timeframe: {arg!r}", file=sys.stderr)
        print("Usage: ./update-search.py [N | month | ytd | 16m]", file=sys.stderr)
        sys.exit(2)

    return (today - timedelta(days=n - 1), today, f"trailing {n} day{'s' if n != 1 else ''}")


# ---------- Search Console client ----------

def _oauth_credentials():
    """Authenticate as the human owner via OAuth.

    First run opens a browser for a one-time consent and writes a
    refresh token to gsc-token.json; later runs load + silently refresh
    it, so the script stays headless. This path never touches Search
    Console's user list, so it avoids the service-account propagation
    delay entirely.
    """
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from google_auth_oauthlib.flow import InstalledAppFlow

    creds = None
    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    if not creds or not creds.valid:
        refreshed = False
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                refreshed = True
            except Exception:
                # An app left in "Testing" status expires its refresh token
                # after 7 days; the refresh then fails with invalid_grant.
                # Fall through to a fresh browser consent instead of dying.
                creds = None
        if not refreshed and not (creds and creds.valid):
            print("Opening a browser for one-time Google sign-in…", file=sys.stderr)
            flow = InstalledAppFlow.from_client_secrets_file(
                str(OAUTH_CLIENT_PATH), SCOPES
            )
            # port=0 grabs a free localhost port for the redirect.
            creds = flow.run_local_server(port=0)
        TOKEN_PATH.write_text(creds.to_json())
        print(f"Saved login token to {TOKEN_PATH.name} (reused on future runs).",
              file=sys.stderr)
    return creds


def build_service():
    try:
        from googleapiclient.discovery import build
    except ImportError:
        print(
            "Google API libraries not found. They live in the .venv-gsc/ "
            "virtualenv next to this script — run via:\n"
            "  .venv-gsc/bin/python update-search.py\n"
            "or recreate the venv:\n"
            "  python3 -m venv .venv-gsc && .venv-gsc/bin/pip install "
            "google-api-python-client google-auth google-auth-oauthlib",
            file=sys.stderr,
        )
        sys.exit(1)

    # Prefer OAuth (your own owner access); fall back to service account.
    if OAUTH_CLIENT_PATH.exists() or TOKEN_PATH.exists():
        creds = _oauth_credentials()
    elif CRED_PATH.exists():
        from google.oauth2 import service_account
        creds = service_account.Credentials.from_service_account_file(
            str(CRED_PATH), scopes=SCOPES
        )
    else:
        print(
            "No credentials found. Set up ONE of:\n"
            f"  • OAuth (recommended): download a 'Desktop' OAuth client JSON "
            f"and save it as {OAUTH_CLIENT_PATH.name} in the repo root.\n"
            f"  • Service account: save the key as {CRED_PATH.name} and add its "
            "email as a Search Console user.\n"
            "See the ONE-TIME SETUP block at the top of this file.",
            file=sys.stderr,
        )
        sys.exit(1)

    # cache_discovery=False avoids a noisy warning on newer oauth stacks.
    return build("searchconsole", "v1", credentials=creds, cache_discovery=False)


def resolve_site(service) -> str:
    """Pick the right Search Console property for robbmorgan.com.

    A property is either a Domain property ('sc-domain:robbmorgan.com')
    or a URL-prefix property ('https://robbmorgan.com/'). We list the
    properties the service account can see and choose the best match,
    preferring a domain property (it aggregates http/https/www).
    """
    if SITE_OVERRIDE:
        return SITE_OVERRIDE

    resp = service.sites().list().execute()
    entries = resp.get("siteEntry", [])
    if not entries:
        print(
            "The service account can't see any Search Console properties.\n"
            "Did you add its email as a user in Search Console → Settings → "
            "Users and permissions? (See setup step 4 in this file.)",
            file=sys.stderr,
        )
        sys.exit(1)

    candidates = [e["siteUrl"] for e in entries if DOMAIN in e["siteUrl"]]
    if not candidates:
        avail = ", ".join(e["siteUrl"] for e in entries)
        print(
            f"No property matching '{DOMAIN}' is visible to the service "
            f"account. Visible properties: {avail}\n"
            "Set GSC_SITE to the exact property string to override.",
            file=sys.stderr,
        )
        sys.exit(1)

    # Prefer a domain property; else the https root; else whatever's first.
    candidates.sort(key=lambda s: (not s.startswith("sc-domain:"), len(s)))
    return candidates[0]


def query(service, site, start, end, dimensions, row_limit=25):
    body = {
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "dimensions": dimensions,
        "rowLimit": row_limit,
        # Web only — drops image/video/news surfaces so "position" reads
        # like a normal text-result rank.
        "type": "web",
    }
    resp = service.searchanalytics().query(siteUrl=site, body=body).execute()
    return resp.get("rows", [])


# ---------- Rendering ----------

def trunc(s: str, n: int) -> str:
    return s if len(s) <= n else s[: n - 1] + "…"


def shorten_url(u: str) -> str:
    """Strip scheme + host so pages read as '/novels', '/' etc."""
    for prefix in ("https://", "http://"):
        if u.startswith(prefix):
            u = u[len(prefix):]
    if "/" in u:
        u = "/" + u.split("/", 1)[1]
    return u or "/"


def print_queries(rows):
    if not rows:
        print("  (no query data in this window)")
        return
    print(f"  {'#':>2}  {'keyword':<40} {'pos':>5} {'impr':>7} {'clicks':>7} {'ctr':>6}")
    print(f"  {'-'*2}  {'-'*40} {'-'*5} {'-'*7} {'-'*7} {'-'*6}")
    for i, r in enumerate(rows, 1):
        kw = trunc(r["keys"][0], 40)
        pos = r.get("position", 0)
        impr = int(r.get("impressions", 0))
        clicks = int(r.get("clicks", 0))
        ctr = r.get("ctr", 0) * 100
        print(f"  {i:>2}  {kw:<40} {pos:>5.1f} {impr:>7} {clicks:>7} {ctr:>5.1f}%")


def print_pages(rows):
    if not rows:
        print("  (no page data in this window)")
        return
    print(f"  {'#':>2}  {'page':<34} {'pos':>5} {'impr':>7} {'clicks':>7} {'ctr':>6}")
    print(f"  {'-'*2}  {'-'*34} {'-'*5} {'-'*7} {'-'*7} {'-'*6}")
    for i, r in enumerate(rows, 1):
        page = trunc(shorten_url(r["keys"][0]), 34)
        pos = r.get("position", 0)
        impr = int(r.get("impressions", 0))
        clicks = int(r.get("clicks", 0))
        ctr = r.get("ctr", 0) * 100
        print(f"  {i:>2}  {page:<34} {pos:>5.1f} {impr:>7} {clicks:>7} {ctr:>5.1f}%")


def print_query_page(rows):
    if not rows:
        print("  (no query→page data in this window)")
        return
    print(f"  {'keyword':<34} {'→ page':<22} {'pos':>5} {'impr':>6}")
    print(f"  {'-'*34} {'-'*22} {'-'*5} {'-'*6}")
    for r in rows:
        kw = trunc(r["keys"][0], 34)
        page = trunc(shorten_url(r["keys"][1]), 22)
        pos = r.get("position", 0)
        impr = int(r.get("impressions", 0))
        print(f"  {kw:<34} {page:<22} {pos:>5.1f} {impr:>6}")


# ---------- URL inspection (indexing status) ----------

def site_origin(site: str) -> str:
    """Turn a property string into a URL origin we can prepend routes to.

    'https://robbmorgan.com/'      → 'https://robbmorgan.com'
    'sc-domain:robbmorgan.com'     → 'https://robbmorgan.com'
    """
    if site.startswith("sc-domain:"):
        return "https://" + site[len("sc-domain:"):]
    return site.rstrip("/")


def inspect_route(service, site, url):
    """Call the URL Inspection API for one URL. Returns the
    indexStatusResult dict, or {'_error': msg} on failure."""
    body = {"inspectionUrl": url, "siteUrl": site, "languageCode": "en-US"}
    try:
        resp = service.urlInspection().index().inspect(body=body).execute()
        return resp.get("inspectionResult", {}).get("indexStatusResult", {})
    except Exception as e:  # quota, permission, transient — keep going
        return {"_error": str(e).split("\n")[0][:80]}


def run_inspect(service, site) -> None:
    origin = site_origin(site)
    print(f'Google Search Console · URL inspection · {site}', file=sys.stderr)
    print('Checking whether each route is actually in Google\'s index '
          '(URL Inspection API).\n', file=sys.stderr)

    print(f"  {'page':<14} {'indexed?':<10} {'coverage state':<34} {'last crawl':<12}")
    print(f"  {'-'*14} {'-'*10} {'-'*34} {'-'*12}")

    indexed = 0
    for path in ROUTES:
        url = origin + "/" + path
        r = inspect_route(service, site, url)
        label = "/" + path if path else "/"

        if "_error" in r:
            print(f"  {label:<14} {'ERROR':<10} {r['_error']:<34} {'-':<12}")
            continue

        verdict = r.get("verdict", "?")              # PASS / NEUTRAL / FAIL
        coverage = r.get("coverageState", "unknown")  # human-readable status
        is_indexed = verdict == "PASS"
        if is_indexed:
            indexed += 1
        mark = "YES" if is_indexed else "no"

        crawl = r.get("lastCrawlTime", "")
        crawl = crawl[:10] if crawl else "never"

        print(f"  {label:<14} {mark:<10} {trunc(coverage,34):<34} {crawl:<12}")

    print()
    print(f"  {indexed}/{len(ROUTES)} routes indexed by Google.")
    print()
    print("Legend — common coverage states:", file=sys.stderr)
    print("  'Submitted and indexed'           → live in Google. Good.", file=sys.stderr)
    print("  'Crawled - currently not indexed'  → Google saw it, chose not to "
          "index (thin/low-value, or still deciding).", file=sys.stderr)
    print("  'Discovered - currently not indexed' → Google knows the URL but "
          "hasn't crawled it yet.", file=sys.stderr)
    print("  'URL is unknown to Google'         → never discovered. Submit via "
          "sitemap / Request Indexing.", file=sys.stderr)


# ---------- main ----------

def main() -> None:
    arg = sys.argv[1] if len(sys.argv) > 1 else None

    if arg and arg.lower() == "inspect":
        service = build_service()
        site = resolve_site(service)
        run_inspect(service, site)
        return

    start, end, label = parse_timeframe(arg)

    service = build_service()
    site = resolve_site(service)

    print(f'Google Search Console · {site} · {label}', file=sys.stderr)
    print(f'Window: {start.isoformat()} → {end.isoformat()} '
          f'(data lags ~{DATA_LAG_DAYS} days, so the last few days read as empty)',
          file=sys.stderr)
    print(file=sys.stderr)

    totals = query(service, site, start, end, [], row_limit=1)
    if totals:
        t = totals[0]
        print(f"TOTALS  impressions {int(t.get('impressions',0))} · "
              f"clicks {int(t.get('clicks',0))} · "
              f"avg position {t.get('position',0):.1f} · "
              f"CTR {t.get('ctr',0)*100:.1f}%")
    else:
        print("TOTALS  (no impressions in this window — site may be very new "
              "to Google, or not yet indexed)")
    print()

    print("TOP KEYWORDS (what people searched, and where you ranked)")
    print_queries(query(service, site, start, end, ["query"], row_limit=25))
    print()

    print("TOP PAGES (which of your URLs appeared in Google)")
    print_pages(query(service, site, start, end, ["page"], row_limit=20))
    print()

    print("KEYWORD → PAGE (which page Google served for each search)")
    print_query_page(query(service, site, start, end, ["query", "page"], row_limit=25))
    print()

    print("Reminder: 'pos' is your average Google rank (1 = top of page 1; "
          "~11+ = page 2). Higher impressions at a high position = an easy "
          "win to chase.", file=sys.stderr)


if __name__ == "__main__":
    main()
