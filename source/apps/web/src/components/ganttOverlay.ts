export type GanttTimelineUnit = "minute" | "day" | "week" | "month";

export type TodayMarkerPosition = {
  left: number;
  top: number;
  height: number;
  visible: boolean;
  edge: "left" | "center" | "right";
};

export type BaselineLabelPosition = {
  left: number;
  top: number;
  visible: boolean;
};

const BASELINE_LABEL_TAIL_DAYS: Record<GanttTimelineUnit, number> = {
  minute: 0.25,
  day: 4,
  week: 10,
  month: 20,
};

const BASELINE_LABEL_TAIL_PX = 112;
const BASELINE_LABEL_GAP_PX = 14;
const BASELINE_LABEL_WIDTH_PX = 58;

function roundPixel(value: number) {
  return Math.round(value * 10) / 10;
}

function timeValue(value: any) {
  const numeric = typeof value?.valueOf === "function" ? Number(value.valueOf()) : Number.NaN;
  if (Number.isFinite(numeric)) return numeric;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function axisTime(value: any) {
  const time = timeValue(value);
  return {
    valueOf: () => time ?? Number.NaN,
    diff(other: any, unit: "second" | "minute" | "hour" | "day" = "second") {
      const otherTime = timeValue(other);
      if (time == null || otherTime == null) return Number.NaN;
      const delta = time - otherTime;
      if (unit === "day") return delta / 86_400_000;
      if (unit === "hour") return delta / 3_600_000;
      if (unit === "minute") return delta / 60_000;
      return delta / 1000;
    },
  };
}

export function getAxisTimeLeft(axis: any, value: any) {
  const direct = Number(axis?.getTimeLeft?.(axisTime(value)));
  if (Number.isFinite(direct)) return direct;
  return null;
}

export function getBaselineLabelTailDays(unit: GanttTimelineUnit, dayWidth: number) {
  const safeDayWidth = Math.max(1, Number(dayWidth) || 1);
  return Math.max(BASELINE_LABEL_TAIL_DAYS[unit], BASELINE_LABEL_TAIL_PX / safeDayWidth);
}

export function computeTodayMarker({
  axis,
  now,
  chartLeft,
  chartRight,
  chartTop,
  chartHeight,
  scrollX,
}: {
  axis: any;
  now: Date;
  chartLeft: number;
  chartRight: number;
  chartTop: number;
  chartHeight: number;
  scrollX: number;
}): TodayMarkerPosition | null {
  const rawLeft = getAxisTimeLeft(axis, now);
  if (rawLeft == null) return null;
  const left = chartLeft + rawLeft - scrollX;
  const visible = left >= chartLeft - 1 && left <= chartRight + 1;
  const edge = left - chartLeft < 86 ? "left" : chartRight - left < 110 ? "right" : "center";
  return {
    left: roundPixel(left),
    top: roundPixel(chartTop),
    height: roundPixel(chartHeight),
    visible,
    edge,
  };
}

export function computeBaselineLabel({
  axis,
  endTime,
  chartLeft,
  chartRight,
  chartTop,
  chartBottom,
  headerHeight,
  rowHeight,
  taskIndex,
  scrollX,
  scrollY,
  baselineOffset = 6,
  baselineHeight = 1.25,
}: {
  axis: any;
  endTime: any;
  chartLeft: number;
  chartRight: number;
  chartTop: number;
  chartBottom: number;
  headerHeight: number;
  rowHeight: number;
  taskIndex: number;
  scrollX: number;
  scrollY: number;
  baselineOffset?: number;
  baselineHeight?: number;
}): BaselineLabelPosition | null {
  const rawEndLeft = getAxisTimeLeft(axis, endTime);
  if (rawEndLeft == null || taskIndex < 0) return null;
  const left = chartLeft + rawEndLeft - scrollX + BASELINE_LABEL_GAP_PX;
  const lineY = chartTop + headerHeight + rowHeight * taskIndex + rowHeight - baselineHeight / 2 + baselineOffset - scrollY;
  const visible =
    left >= chartLeft - BASELINE_LABEL_WIDTH_PX &&
    left <= chartRight + BASELINE_LABEL_WIDTH_PX &&
    lineY >= chartTop + headerHeight - 16 &&
    lineY <= chartBottom + 16;
  return {
    left: roundPixel(left),
    top: roundPixel(lineY),
    visible,
  };
}
