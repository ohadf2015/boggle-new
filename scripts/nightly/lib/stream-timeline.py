#!/usr/bin/env python3
"""stream-timeline.py — collapse `claude -p --output-format stream-json` NDJSON
into a compact, greppable, wall-clock-stamped tool timeline.

WHY: lanes used to run in text output mode, which prints only the FINAL
assistant message. A lane that hung mid-tool produced no final message, so the
run log was 20 min of silence then exit 124 — we could never see WHICH MCP call
hung. This filter reads the stream-json firehose and emits ONE line per
interesting event:

    [HH:MM:SS] ● MCP init: 3 servers (sentry, supabase, posthog)
    [HH:MM:SS] ▶ Bash  {"command": "echo hi"}
    [HH:MM:SS]   ✓ Bash
    [HH:MM:SS] ▶ mcp__supabase__execute_sql  {"query": "SELECT count(*) FROM leader…
    (… then nothing — process killed at the lane wall-clock)

The LAST `▶ <tool>` with no matching `✓/✗ <tool>` is the hung call, named. Fat
tool_result bodies are dropped (only ok/err is kept) so the main log stays lean;
the full stream-json lives in the per-lane sidecar.

Reads stdin line by line, writes the timeline to stdout (autoflushed so the last
line before a hang reaches the log before the process is killed). Non-JSON lines
(CLI startup warnings, hook chatter) are skipped silently — never crash the lane.
"""
import sys
import json
import time

PREVIEW_MAX = 100


def _preview(tool_input):
    """Compact one-line preview of a tool's input (SQL / query is the useful bit)."""
    if not isinstance(tool_input, dict) or not tool_input:
        return ""
    # Surface the high-signal field first when present.
    for key in ("query", "sql", "command", "url", "path"):
        if key in tool_input and isinstance(tool_input[key], str):
            val = " ".join(tool_input[key].split())
            return val[:PREVIEW_MAX] + ("…" if len(val) > PREVIEW_MAX else "")
    blob = json.dumps(tool_input, ensure_ascii=False, separators=(",", ":"))
    return blob[:PREVIEW_MAX] + ("…" if len(blob) > PREVIEW_MAX else "")


def _emit(line):
    print(f"[{time.strftime('%H:%M:%S')}] {line}", flush=True)


def main():
    id_to_name = {}  # tool_use_id → tool name, so a tool_result can name itself
    for raw in sys.stdin:
        raw = raw.strip()
        if not raw:
            continue
        try:
            ev = json.loads(raw)
        except (ValueError, TypeError):
            continue  # CLI warning / hook chatter / partial line — ignore
        if not isinstance(ev, dict):
            continue
        etype = ev.get("type")

        if etype == "system" and ev.get("subtype") == "init":
            servers = ev.get("mcp_servers") or []
            names = ", ".join(
                s.get("name", "?") for s in servers if isinstance(s, dict)
            )
            _emit(f"● MCP init: {len(servers)} servers ({names})")
            continue

        # tool_use / tool_result live inside an assistant/user message's content.
        msg = ev.get("message")
        content = msg.get("content") if isinstance(msg, dict) else None
        if not isinstance(content, list):
            content = ev.get("content") if isinstance(ev.get("content"), list) else []

        for block in content:
            if not isinstance(block, dict):
                continue
            btype = block.get("type")
            if btype == "tool_use":
                name = block.get("name", "?")
                bid = block.get("id")
                if bid:
                    id_to_name[bid] = name
                prev = _preview(block.get("input"))
                _emit(f"▶ {name}  {prev}".rstrip())
            elif btype == "tool_result":
                name = id_to_name.get(block.get("tool_use_id"), "?")
                mark = "✗" if block.get("is_error") else "✓"
                _emit(f"  {mark} {name}")

        if etype == "result":
            sub = ev.get("subtype", "?")
            dur = ev.get("duration_ms", "?")
            turns = ev.get("num_turns", "?")
            _emit(f"◼ end: {sub} ({dur}ms, {turns} turns)")


if __name__ == "__main__":
    main()
