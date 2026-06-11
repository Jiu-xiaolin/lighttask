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
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const helpers = await importTsModule("./ganttOverlay.ts");

test("positions today marker by the actual minute within the day", () => {
  const axis = {
    getTimeLeft(value) {
      const date = new Date(value.valueOf());
      return date.getHours() * 60 + date.getMinutes();
    },
  };

  const marker = helpers.computeTodayMarker({
    axis,
    now: new Date("2026-06-11T22:48:00"),
    chartLeft: 120,
    chartRight: 1680,
    chartTop: 40,
    chartHeight: 420,
    scrollX: 30,
  });

  assert.equal(marker.left, 1458);
  assert.equal(marker.visible, true);
});

test("keeps the baseline label after the line end on the same y-axis", () => {
  const axis = { getTimeLeft: () => 320 };

  const label = helpers.computeBaselineLabel({
    axis,
    endTime: "2026-06-12T12:00:00",
    chartLeft: 100,
    chartRight: 700,
    chartTop: 32,
    chartBottom: 500,
    headerHeight: 62,
    rowHeight: 44,
    taskIndex: 2,
    scrollX: 0,
    scrollY: 0,
  });

  assert.equal(label.left, 434);
  assert.equal(label.top, 231.4);
  assert.equal(label.visible, true);
});

test("extends the timeline enough for a lightweight baseline label", () => {
  assert.equal(helpers.getBaselineLabelTailDays("minute", 24 * 58), 0.25);
  assert.equal(helpers.getBaselineLabelTailDays("day", 38), 4);
  assert.equal(helpers.getBaselineLabelTailDays("week", 13), 10);
  assert.equal(helpers.getBaselineLabelTailDays("month", 10), 20);
  assert.ok(helpers.getBaselineLabelTailDays("day", 12) > 9);
});
