#!/usr/bin/env node
// Merge a Play-App-Signing deployment cert into public/.well-known/assetlinks.json.
// Usage: node scripts/update-assetlinks-from-cert.mjs path/to/deployment_cert.der
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const der = process.argv[2];
if (!der) {
  console.error("usage: update-assetlinks-from-cert.mjs <path-to-deployment_cert.der>");
  process.exit(1);
}

const keytool = process.env.KEYTOOL || "keytool";
const out = execFileSync(keytool, ["-printcert", "-file", resolve(der)], {
  encoding: "utf8",
});
const m = out.match(/SHA256:\s+([0-9A-F:]{95})/i);
if (!m) {
  console.error("Could not parse SHA-256 from keytool output:\n" + out);
  process.exit(1);
}
const sha = m[1].toUpperCase();

const path = resolve("public/.well-known/assetlinks.json");
const json = JSON.parse(readFileSync(path, "utf8"));
const target = json[0]?.target;
if (!target || target.namespace !== "android_app") {
  console.error("Unexpected assetlinks.json shape");
  process.exit(1);
}
const existing = new Set(target.sha256_cert_fingerprints || []);
existing.add(sha);
target.sha256_cert_fingerprints = [...existing].sort();
writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
console.log(`Added ${sha}`);
console.log(`Total fingerprints: ${target.sha256_cert_fingerprints.length}`);
