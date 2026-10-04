import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { en } from "./en.ts";
import { makeI18n } from "./index.ts";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(tsx?|mjs)$/.test(f) && !f.endsWith(".test.ts") ? [p] : [];
  });
}

test("varje text i t(...) har en engelsk översättning", () => {
  const missing = new Set<string>();
  const re = /\bt\(\s*(["`])((?:\\.|(?!\1)[^\\])*)\1/g;
  for (const f of [...files("app"), ...files("components"), ...files("lib")]) {
    for (const m of readFileSync(f, "utf8").matchAll(re)) {
      if (m[1] === "`" && m[2].includes("${")) continue;
      const key = m[1] === '"' ? (JSON.parse(`"${m[2]}"`) as string) : m[2].replace(/\\(`|\\)/g, "$1");
      if (!(key in en)) missing.add(`${f}: ${key}`);
    }
  }
  // Meddelanden från serveråtgärder översätts när de visas.
  for (const m of readFileSync("app/actions.ts", "utf8").matchAll(/\b(?:error|ok):\s*"((?:\\.|[^"\\])*)"|return "((?:\\.|[^"\\])*)";/g)) {
    const key = JSON.parse(`"${m[1] ?? m[2]}"`) as string;
    if (!(key in en)) missing.add(`app/actions.ts: ${key}`);
  }
  assert.deepEqual([...missing], []);
});

test("översättning med variabler och datum", () => {
  const sv = makeI18n("sv");
  const e = makeI18n("en");
  assert.equal(e.t("Varje dag"), "Every day");
  assert.equal(sv.t("Varje dag"), "Varje dag");
  assert.equal(e.t("Finns inte {x}", { x: 1 }), "Finns inte 1");
  assert.equal(e.date("2026-11-04"), "4 Nov");
  assert.equal(sv.date("2026-11-04"), "4 nov.");
});
