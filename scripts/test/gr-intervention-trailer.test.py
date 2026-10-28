#!/usr/bin/env python3
"""Parser and planner tests for the GR-Intervention trailer. No network."""

from __future__ import annotations

import importlib.util
import json
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "gr-intervention-trailer.py"
WORKFLOW = ROOT / ".github" / "workflows" / "gr-intervention.yml"

NOW = datetime(2026, 10, 28, 2, 0, tzinfo=timezone.utc)


def load():
    spec = importlib.util.spec_from_file_location("gr_intervention_trailer", SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {SCRIPT}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TrailerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m = load()

    def parse(self, body, title="fix(multiplayer): stop the rage"):
        return self.m.parse_body(
            body,
            pr_url="https://github.com/ohadf2015/boggle-new/pull/1500",
            sha="deadbeef",
            title=title,
        )

    def test_example_line(self):
        rows = self.parse(
            'GR-Intervention: surface=/en/multiplayer kind=ux metric=frustration hypothesis="reroll opt-in should cut rage"'
        )
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row["app"], "lexiclash")
        self.assertEqual(row["surface"], "/en/multiplayer")
        self.assertEqual(row["kind"], "ux")
        self.assertEqual(row["metric"], "frustration")
        self.assertEqual(row["hypothesis"], "reroll opt-in should cut rage")
        self.assertEqual(row["summary"], "fix(multiplayer): stop the rage")
        self.assertEqual(row["evidence"], "https://github.com/ohadf2015/boggle-new/pull/1500 deadbeef")

    def test_two_surfaces(self):
        body = "\n".join(
            [
                "GR-Intervention: surface=/en/multiplayer kind=ux metric=frustration hypothesis=\"a\"",
                "GR-Intervention: surface=/en/results kind=bugfix metric=errors summary=\"reload the stale build\"",
            ]
        )
        rows = self.parse(body)
        self.assertEqual([row["surface"] for row in rows], ["/en/multiplayer", "/en/results"])
        self.assertEqual(rows[1]["summary"], "reload the stale build")
        self.assertNotIn("hypothesis", rows[1])

    def test_fenced_blockquote_and_comment_are_not_recorded(self):
        body = "\n".join(
            [
                "See the format:",
                "```",
                "GR-Intervention: surface=/en/multiplayer kind=ux metric=frustration hypothesis=\"example\"",
                "```",
                "> GR-Intervention: surface=/ignored kind=ux metric=frustration",
                "    GR-Intervention: surface=/indented kind=ux metric=frustration",
                "<!--",
                "GR-Intervention: surface=/comment kind=ux metric=frustration",
                "-->",
                "GR-Intervention: surface=/en/daily kind=feature metric=funnel_conversion hypothesis=\"next round\"",
            ]
        )
        rows = self.parse(body)
        self.assertEqual([row["surface"] for row in rows], ["/en/daily"])

    def test_bad_kind_fails_closed(self):
        with self.assertRaises(self.m.TrailerError) as caught:
            self.parse("GR-Intervention: surface=/en/multiplayer kind=UX metric=frustration")
        self.assertIn("kind", str(caught.exception))

    def test_unknown_key_and_duplicate_surface_fail(self):
        with self.assertRaises(self.m.TrailerError):
            self.parse("GR-Intervention: surface=/x kind=ux metric=errors evidence=nope")
        with self.assertRaises(self.m.TrailerError) as caught:
            self.parse(
                "GR-Intervention: surface=/en/multiplayer kind=ux metric=frustration\n"
                "GR-Intervention: surface=/en/multiplayer/ kind=ux metric=errors"
            )
        self.assertIn("same surface+kind", str(caught.exception))

    def test_unclosed_quote_fails(self):
        with self.assertRaises(self.m.TrailerError):
            self.parse('GR-Intervention: surface=/x kind=ux metric=errors hypothesis="no end')

    def test_empty_body(self):
        self.assertEqual(self.parse(""), [])
        self.assertEqual(self.parse("No intervention recorded."), [])

    def test_window_and_radar_skip(self):
        fresh = {
            "number": 1500,
            "title": "fix(mp): cap the inline results",
            "html_url": "https://github.com/ohadf2015/boggle-new/pull/1500",
            "merge_commit_sha": "abc123",
            "merged_at": (NOW - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "head": {"ref": "boggle-new/t_example"},
            "body": 'GR-Intervention: surface=/en/results kind=ux metric=conversions hypothesis="cap stops the drop"',
        }
        status, detail = self.m.plan_pr(fresh, NOW)
        self.assertEqual(status, "record")
        self.assertEqual(detail[0]["metric"], "conversions")

        stale = dict(fresh, merged_at="2026-10-24T00:00:00Z", number=1426)
        status, detail = self.m.plan_pr(stale, NOW)
        self.assertEqual(status, "skip")
        self.assertIn("26h", detail)

        radar = dict(fresh, head={"ref": "radar/12586"}, number=1486)
        status, detail = self.m.plan_pr(radar, NOW)
        self.assertEqual(status, "skip")
        self.assertIn("radar-merged", detail)

    def test_classify_retry_is_success_and_refusal_is_not(self):
        ok, message = self.m.classify_rpc(
            200,
            {
                "jsonrpc": "2.0",
                "id": 1,
                "result": {
                    "isError": False,
                    "content": [{"type": "text", "text": json.dumps({"ok": True, "alreadyRecordedToday": True, "id": 42})}],
                },
            },
        )
        self.assertEqual(ok, "ok")
        self.assertIn("42", message)
        bad, message = self.m.classify_rpc(
            200,
            {
                "result": {
                    "isError": True,
                    "content": [{"type": "text", "text": json.dumps({"ok": False, "error": "missing metric"})}],
                }
            },
        )
        self.assertEqual(bad, "fail")
        self.assertIn("missing metric", message)
        denied, _ = self.m.classify_rpc(401, {"error": "unauthorized"})
        self.assertEqual(denied, "fail")

    def test_push_shas_dedupe_and_pr_lookup(self):
        event = {
            "before": "aaa",
            "after": "ccc",
            "commits": [{"id": "bbb"}],
        }

        def fetch(path):
            if path.endswith("compare/aaa...ccc"):
                return {"commits": [{"sha": "bbb"}, {"sha": "ccc"}]}
            raise AssertionError(path)

        self.assertEqual(self.m.shas_for_push(event, "ohadf2015/boggle-new", fetch), ["bbb", "ccc"])

        def pulls(path):
            if path.endswith("/commits/bbb/pulls"):
                return [{"number": 9, "merged_at": "2026-10-28T00:00:00Z"}]
            if path.endswith("/commits/ccc/pulls"):
                return [{"number": 9, "merged_at": "2026-10-28T00:00:00Z"}, {"number": 10}]
            raise AssertionError(path)

        found = self.m.prs_for_shas(["bbb", "ccc"], "ohadf2015/boggle-new", pulls)
        self.assertEqual([pr["number"] for pr in found], [9, 10])

    def test_workflow_is_push_to_master(self):
        text = WORKFLOW.read_text()
        self.assertIn("push:", text)
        self.assertIn("master", text)
        self.assertIn("GROWTH_RADAR_TOKEN", text)
        self.assertIn("scripts/gr-intervention-trailer.py --from-push", text)
        self.assertNotIn("pull_request:", text)


if __name__ == "__main__":
    unittest.main()
