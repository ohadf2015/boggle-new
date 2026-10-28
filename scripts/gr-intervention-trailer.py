#!/usr/bin/env python3
"""Record product-PR Growth Radar interventions from a column-0 PR-body trailer.

    GR-Intervention: surface=/en/multiplayer kind=ux metric=frustration hypothesis="why"

--from-push (gr-intervention.yml, push to master) finds the merged PR, calls
record_intervention once per line (app lexiclash, evidence = PR URL + merge sha).
radar/* PRs are skipped (radar-merged.yml owns them). A re-run more than 26h
after merge writes nothing: the baseline is measured at call time.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

PREFIX = "GR-Intervention:"
APP = "lexiclash"
MCP_URL = "https://growthradar.app/api/mcp"
MAX_AGE = timedelta(hours=26)
CLOCK_SKEW = timedelta(minutes=5)

KINDS = (
    "title", "meta", "schema", "content", "speed", "internal_links", "llms_txt",
    "indexnow", "ux", "bugfix", "feature",
)
METRICS = (
    "impressions", "clicks", "ctr", "position", "citations", "lcp_ms", "cls",
    "conversions", "funnel_conversion", "errors", "engagement", "frustration",
    "crawler_errors", "fake_crawler_share", "not_found",
)
ALLOWED_KEYS = frozenset({"surface", "kind", "metric", "hypothesis", "summary"})


class TrailerError(ValueError):
    """A column-0 trailer is present and not usable. Fail the job; do not guess."""


def parse_fields(rest: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    i = 0
    n = len(rest)
    while i < n:
        while i < n and rest[i].isspace():
            i += 1
        if i >= n:
            break
        eq = rest.find("=", i)
        if eq < 0 or eq == i:
            raise TrailerError(f"expected key=value, got {rest[i:]!r}")
        key = rest[i:eq]
        if not key.isidentifier():
            raise TrailerError(f"bad key {key!r}")
        i = eq + 1
        if i >= n:
            raise TrailerError(f"{key} has no value")
        if rest[i] in "\"'":
            quote = rest[i]
            i += 1
            buf: list[str] = []
            closed = False
            while i < n:
                if rest[i] == "\\" and quote == '"' and i + 1 < n:
                    buf.append(rest[i + 1])
                    i += 2
                    continue
                if rest[i] == quote:
                    i += 1
                    closed = True
                    break
                buf.append(rest[i])
                i += 1
            if not closed:
                raise TrailerError(f"{key} has an unclosed quote")
            value = "".join(buf)
        else:
            j = i
            while j < n and not rest[j].isspace():
                j += 1
            value = rest[i:j]
            i = j
        if key in fields:
            raise TrailerError(f"duplicate key {key}")
        fields[key] = value
    return fields


def iter_trailer_lines(body: str):
    """Yield (lineno, line) for live trailers. Examples in fences or comments are not live."""
    in_fence = False
    in_comment = False
    for lineno, raw in enumerate(body.splitlines(), 1):
        line = raw
        if in_comment:
            end = line.find("-->")
            if end < 0:
                continue
            line = line[end + 3 :]
            in_comment = False
        if in_fence:
            if line.lstrip().startswith("```"):
                in_fence = False
            continue
        while True:
            start = line.find("<!--")
            if start < 0:
                break
            end = line.find("-->", start + 4)
            if end < 0:
                line = line[:start]
                in_comment = True
                break
            line = line[:start] + line[end + 3 :]
        if line.lstrip().startswith("```"):
            in_fence = True
            continue
        if line.startswith(PREFIX):
            yield lineno, line


def surface_key(surface: str) -> str:
    text = surface.strip().lower()
    text = text.split("?", 1)[0].split("#", 1)[0]
    if text.startswith("http://") or text.startswith("https://"):
        slash = text.find("/", text.find("//") + 2)
        text = text[slash:] if slash >= 0 else "/"
    if len(text) > 1:
        text = text.rstrip("/")
    return text


def parse_body(body: str, *, pr_url: str, sha: str, title: str) -> list[dict[str, Any]]:
    """Return record_intervention arguments, one per live trailer line."""
    rows: list[dict[str, Any]] = []
    seen: dict[str, int] = {}
    errors: list[str] = []
    for lineno, line in iter_trailer_lines(body or ""):
        rest = line[len(PREFIX) :].strip()
        if not rest:
            errors.append(f"line {lineno}: empty GR-Intervention")
            continue
        try:
            fields = parse_fields(rest)
        except TrailerError as exc:
            errors.append(f"line {lineno}: {exc}")
            continue
        unknown = sorted(set(fields) - ALLOWED_KEYS)
        if unknown:
            errors.append(
                f"line {lineno}: unknown key(s) {', '.join(unknown)} "
                "(evidence and app are set by the merger, not the trailer)"
            )
            continue
        missing = [key for key in ("surface", "kind", "metric") if not fields.get(key)]
        if missing:
            errors.append(f"line {lineno}: missing {', '.join(missing)}")
            continue
        kind = fields["kind"]
        metric = fields["metric"]
        if kind not in KINDS:
            errors.append(f"line {lineno}: kind {kind!r} is not one of {' | '.join(KINDS)}")
            continue
        if metric not in METRICS:
            errors.append(f"line {lineno}: metric {metric!r} is not one of {' | '.join(METRICS)}")
            continue
        key = f"{surface_key(fields['surface'])}\0{kind}"
        if key in seen:
            errors.append(
                f"line {lineno}: same surface+kind as line {seen[key]} "
                "(Growth Radar keeps one row per app+surface+kind per day)"
            )
            continue
        seen[key] = lineno
        hypothesis = fields.get("hypothesis") or ""
        summary = fields.get("summary") or title.strip() or hypothesis
        if not summary:
            errors.append(f"line {lineno}: no summary and the PR title is empty")
            continue
        row: dict[str, Any] = {
            "app": APP,
            "surface": fields["surface"],
            "kind": kind,
            "metric": metric,
            "summary": summary,
            "evidence": f"{pr_url} {sha}",
        }
        if hypothesis:
            row["hypothesis"] = hypothesis
        rows.append(row)
    if errors:
        raise TrailerError("\n".join(errors))
    return rows


def parse_merged_at(value: str) -> datetime:
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    parsed = datetime.fromisoformat(text)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def within_record_window(merged_at: str, now: datetime) -> bool:
    """True only while a baseline measured now is still the ship-time baseline."""
    age = now - parse_merged_at(merged_at)
    return -CLOCK_SKEW <= age <= MAX_AGE


def head_ref(pr: dict[str, Any]) -> str:
    head = pr.get("head") or {}
    if isinstance(head, dict):
        return str(head.get("ref") or "")
    return ""


def plan_pr(pr: dict[str, Any], now: datetime) -> tuple[str, list[dict[str, Any]] | str]:
    """Return ('record', rows) | ('skip', reason) | ('error', message)."""
    number = pr.get("number")
    ref = head_ref(pr)
    if ref.startswith("radar/"):
        return "skip", f"#{number} is radar/{ref.split('/', 1)[-1]} — radar-merged.yml records it"
    merged_at = pr.get("merged_at") or ""
    if not merged_at:
        return "skip", f"#{number} is not merged"
    if not within_record_window(str(merged_at), now):
        return "skip", f"#{number} merged at {merged_at}, outside the 26h record window (a later row would be a post-fix baseline)"
    sha = str(pr.get("merge_commit_sha") or "")
    url = str(pr.get("html_url") or "")
    if not sha or not url:
        return "error", f"#{number} is missing merge_commit_sha or html_url"
    try:
        rows = parse_body(
            str(pr.get("body") or ""),
            pr_url=url,
            sha=sha,
            title=str(pr.get("title") or ""),
        )
    except TrailerError as exc:
        return "error", f"#{number}: {exc}"
    if not rows:
        return "skip", f"#{number} has no GR-Intervention trailer"
    return "record", rows


def shas_for_push(event: dict[str, Any], repo: str, fetch_json: Callable[[str], Any]) -> list[str]:
    before = str(event.get("before") or "")
    after = str(event.get("after") or "")
    shas: list[str] = []
    if before and after and not set(before) <= {"0"}:
        try:
            compared = fetch_json(f"repos/{repo}/compare/{before}...{after}")
            for commit in (compared or {}).get("commits") or []:
                sha = commit.get("sha")
                if sha:
                    shas.append(sha)
        except Exception:
            shas = []
    if not shas:
        for commit in event.get("commits") or []:
            sha = commit.get("id") or commit.get("sha")
            if sha:
                shas.append(sha)
    if after and after not in shas:
        shas.append(after)
    deduped: list[str] = []
    for sha in shas:
        if sha not in deduped:
            deduped.append(sha)
    return deduped


def prs_for_shas(shas: list[str], repo: str, fetch_json: Callable[[str], Any]) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    seen: set[int] = set()
    for sha in shas:
        pulls = fetch_json(f"repos/{repo}/commits/{sha}/pulls")
        if isinstance(pulls, dict):
            raise TrailerError(f"commits/{sha}/pulls returned an object, not a list: {str(pulls)[:180]}")
        for pr in pulls or []:
            number = pr.get("number")
            if not isinstance(number, int) or number in seen:
                continue
            seen.add(number)
            found.append(pr)
    return found


def tool_text(result: dict[str, Any]) -> str:
    content = result.get("content") or []
    if content and isinstance(content[0], dict):
        return str(content[0].get("text") or "")
    return ""


def classify_rpc(status: int, payload: Any) -> tuple[str, str]:
    """Return ('ok'|'fail', message). A same-day retry is ok, not a failure."""
    if status == 401:
        return "fail", "unauthorized"
    if not isinstance(payload, dict):
        return "fail", f"HTTP {status} non-object response"
    if status >= 300 and "result" not in payload:
        err = payload.get("error")
        if isinstance(err, dict):
            return "fail", str(err.get("message") or err)
        return "fail", str(err or f"HTTP {status}")
    if payload.get("error") and "result" not in payload:
        err = payload["error"]
        if isinstance(err, dict):
            return "fail", str(err.get("message") or err)
        return "fail", str(err)
    result = payload.get("result")
    if not isinstance(result, dict):
        return "fail", "missing JSON-RPC result"
    text = tool_text(result)
    if result.get("isError"):
        return "fail", text[:500] or "isError"
    try:
        body = json.loads(text) if text else {}
    except json.JSONDecodeError:
        return "fail", f"non-json tool result: {text[:200]}"
    if isinstance(body, dict) and body.get("ok") is False:
        return "fail", str(body.get("error") or text)[:500]
    if isinstance(body, dict) and body.get("ok") is True:
        if body.get("alreadyRecordedToday"):
            return "ok", f"already recorded today id={body.get('id')}"
        return "ok", str(body.get("outcome") or f"id={body.get('id')}")[:500]
    return "fail", f"unexpected tool result: {text[:200]}"


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise TrailerError(f"refusing HTTP {code} from {MCP_URL} — a redirect drops the POST body")


def post_mcp(token: str, arguments: dict[str, Any], timeout: float = 30) -> tuple[int, Any]:
    data = json.dumps(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": "record_intervention", "arguments": arguments},
        }
    ).encode()
    req = urllib.request.Request(
        MCP_URL,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    opener = urllib.request.build_opener(_NoRedirect)
    try:
        with opener.open(req, timeout=timeout) as resp:
            raw = resp.read().decode()
            status = getattr(resp, "status", 200)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        status = exc.code
    try:
        payload = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        payload = {"error": raw[:300]}
    return status, payload


def gh_api(path: str) -> Any:
    proc = subprocess.run(
        ["gh", "api", path],
        check=False,
        capture_output=True,
        text=True,
        timeout=60,
    )
    if proc.returncode != 0:
        raise TrailerError(f"gh api {path} failed: {proc.stderr.strip()[:300]}")
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise TrailerError(f"gh api {path} returned non-json") from exc


def note(line: str) -> None:
    print(line)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as handle:
            handle.write(line + "\n")


def lookup_sha(sha: str, repo: str, now: datetime | None = None) -> int:
    """Print the record plan for one commit. Never calls record_intervention."""
    now = now or datetime.now(timezone.utc)
    prs = prs_for_shas([sha], repo, gh_api)
    if not prs:
        note(f"no PR associated with {sha}")
        return 0
    for pr in prs:
        status, detail = plan_pr(pr, now)
        if status == "record":
            note(f"would record #{pr.get('number')} ({len(detail)} line(s))")
            print(json.dumps(detail, indent=2))
        else:
            note(f"{status}: {detail}")
    return 0


def run_from_push(now: datetime | None = None) -> int:
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    repo = os.environ.get("GITHUB_REPOSITORY")
    if not event_path or not repo:
        raise TrailerError("--from-push needs GITHUB_EVENT_PATH and GITHUB_REPOSITORY")
    with open(event_path, encoding="utf-8") as handle:
        event = json.load(handle)
    now = now or datetime.now(timezone.utc)
    shas = shas_for_push(event, repo, gh_api)
    if not shas:
        note("no commits in this push")
        return 0
    prs = prs_for_shas(shas, repo, gh_api)
    if not prs:
        note("no merged PR associated with this push")
        return 0
    token = os.environ.get("GROWTH_RADAR_TOKEN") or ""
    failures: list[str] = []
    pending: list[tuple[dict[str, Any], list[dict[str, Any]]]] = []
    for pr in prs:
        status, detail = plan_pr(pr, now)
        if status == "skip":
            note(f"skip: {detail}")
            continue
        if status == "error":
            failures.append(str(detail))
            continue
        pending.append((pr, detail))  # type: ignore[arg-type]
    if pending and not token:
        failures.append("GROWTH_RADAR_TOKEN is unset; nothing recorded")
        pending = []
    for pr, rows in pending:
        for row in rows:
            try:
                http_status, payload = post_mcp(token, row)
            except Exception as exc:  # network, redirect, timeout — do not swallow the reason
                failures.append(f"#{pr.get('number')} {row['surface']}: {exc}")
                continue
            outcome, message = classify_rpc(http_status, payload)
            if outcome != "ok":
                failures.append(f"#{pr.get('number')} {row['surface']}: {message}")
                continue
            note(f"recorded #{pr.get('number')} {row['surface']} {row['kind']}/{row['metric']}: {message}")
    if failures:
        for failure in failures:
            note(f"FAIL: {failure}")
        return 1
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--from-push", action="store_true", help="record trailers for the GitHub push event")
    parser.add_argument("--lookup-sha", help="print the plan for this commit's merged PR; no API write")
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", "ohadf2015/boggle-new"))
    parser.add_argument("--body-file", help="parse one body and print the arguments (no API write)")
    parser.add_argument("--pr-url", default="https://example.test/pull/1")
    parser.add_argument("--sha", default="abc")
    parser.add_argument("--title", default="")
    args = parser.parse_args(argv)
    if args.lookup_sha:
        return lookup_sha(args.lookup_sha, args.repo)
    if args.from_push:
        return run_from_push()
    if not args.body_file:
        parser.error("pass --from-push or --body-file")
    with open(args.body_file, encoding="utf-8") as handle:
        body = handle.read()
    rows = parse_body(body, pr_url=args.pr_url, sha=args.sha, title=args.title)
    json.dump(rows, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except TrailerError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(2)
