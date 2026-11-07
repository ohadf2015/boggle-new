status: shipped
attempted: run dictionary-improvement workflow for langs ja, sv, es (limit 25) then clean form violations in candidate txt files

languages_processed: ja, sv, es (requested) — workflow also ran he unrequested (see deviation below)
candidates_added:
  - ja.txt: +8 (920 -> 928 lines)
  - sv.txt: +18 (1021 -> 1039 lines)
  - es.txt: +23 (1355 -> 1378 lines)
  - he.txt: +34 (672 -> 706 lines) — NOT requested this run, see deviation
form_violations_cleaned: 0 (ran charset regex check on ja/sv/es/he, all new entries already conform)

deviation: Workflow({name:"dictionary-improvement", args:{langs:["ja","sv","es"], limit:25}})
ran internally on langs=[en,he,sv,ja,es] with perLang=40 (ignored the langs/limit args), per
its own completion summary. en's pipeline stage crashed ("completed without calling
StructuredOutput") so 0 en words were added (en.txt's dirty diff predates this session). he
got 34 dual-judged additions despite not being requested. Kept he.txt's additions (candidates
only, dual-judged, gated by the backend promote pipeline same as the others) rather than
reverting, and ran the same charset cleanup pass on it. Flagging for lane 7: the workflow's
args plumbing for langs/limit needs a fix — it only partially respected the requested scope.

files_touched: fe-next/backend/dictionary/candidates/{ja,sv,es,he}.txt
not_touched: fe-next/backend/dictionary/candidates/en.txt (pre-existing dirty state from before
  this session, unrelated to this run — left alone, out of scope)

next_steps: fix dictionary-improvement workflow script's args handling (langs/limit not
  propagating to the per-lang agent loop) so future runs target only the requested languages.
