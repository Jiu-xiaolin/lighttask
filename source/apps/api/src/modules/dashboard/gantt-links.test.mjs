import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTsModule(relativePath) {
  const url = new URL(relativePath, import.meta.url);
  const source = await readFile(url, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const links = await importTsModule("./gantt-links.ts");

test("keeps legacy dependency ids as FS links", () => {
  assert.deepEqual(
    links.dependencyTokensToLinks("task_b", ["task_a"], new Set(["task_a", "task_b"])),
    [{ id: "ln_task_a_task_b_FS", from: "task_a", to: "task_b", type: "FS" }],
  );
});

test("allows multiple endpoint types between the same pair", () => {
  assert.deepEqual(
    links.dependencyTokensToLinks("task_b", ["task_a", "task_a:SS", "task_a:FF"], new Set(["task_a", "task_b"])),
    [
      { id: "ln_task_a_task_b_FS", from: "task_a", to: "task_b", type: "FS" },
      { id: "ln_task_a_task_b_SS", from: "task_a", to: "task_b", type: "SS" },
      { id: "ln_task_a_task_b_FF", from: "task_a", to: "task_b", type: "FF" },
    ],
  );
});

test("upserts and deletes one typed relation without touching siblings", () => {
  const withSs = links.upsertDependencyToken(["task_a"], "task_a", "SS");
  assert.deepEqual(withSs, ["task_a", "task_a:SS"]);

  const withoutSs = links.removeDependencyToken(withSs, "task_a", "SS");
  assert.deepEqual(withoutSs, ["task_a"]);

  const withoutFs = links.removeDependencyToken(["task_a", "task_a:SS"], "task_a", "FS");
  assert.deepEqual(withoutFs, ["task_a:SS"]);
});
