#!/usr/bin/env node
// Hit Google Digital Asset Links API and assert our Android package is linked.
const SITE = process.env.SITE || "https://www.lexiclash.live";
const PKG = process.env.PACKAGE || "live.lexiclash.app";
const REL = "delegate_permission/common.handle_all_urls";

const url = new URL("https://digitalassetlinks.googleapis.com/v1/statements:list");
url.searchParams.set("source.web.site", SITE);
url.searchParams.set("relation", REL);

const res = await fetch(url);
if (!res.ok) {
  console.error(`FAIL: ${res.status} ${await res.text()}`);
  process.exit(1);
}
const data = await res.json();
const stmts = data.statements || [];
const match = stmts.find(
  (s) => s.target?.androidApp?.packageName === PKG && (s.relation || []).includes(REL)
);
if (!match) {
  console.error(`FAIL: no statement linking ${SITE} -> ${PKG}`);
  console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}
const fps = match.target.androidApp.certificate?.sha256Fingerprint;
console.log(`OK: ${SITE} -> ${PKG}`);
console.log(`  sha256: ${Array.isArray(fps) ? fps.join(", ") : fps}`);
if (data.debugString) console.log(data.debugString);
