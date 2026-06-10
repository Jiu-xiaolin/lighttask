import React, { useEffect, useRef, useState, useMemo, useCallback, Suspense, lazy } from "react";
import { Icon } from "../lib/icons";
import { api } from "../lib/api";
import { TaskEditModal } from "./TaskEditModal";

const XGanttReact = lazy(() => import("@xpyjs/gantt-react").then(m => ({ default: m.XGanttReact })));
import "@xpyjs/gantt-core/style.css";
import type { XGanttReactRef } from "@xpyjs/gantt-react";

/* ── Design tokens (theme-aware via CSS variables) ── */
function Tk() {
  try {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const read = (name: string, fallback: string) => root.getPropertyValue(name).trim() || body.getPropertyValue(name).trim() || fallback;
    return {
      p: read("--primary", "#315f8d"),
      l: read("--line", "rgba(180,170,155,0.22)"),
      i: read("--ink", "#162033"),
      t: read("--text", "#3a4a5c"),
      m: read("--muted", "#718095"),
      g: read("--teal", "#2b7e7a"),
      b: read("--blue", "#4a7fb5"),
      a: read("--amber", "#c2853a"),
      r: read("--rose", "#b84c6b"),
      bg: read("--bg", "#f5f3ee"),
      paper: read("--paper", "#fdfcfa"),
    };
  } catch {
    return { p:"#315f8d", l:"rgba(180,170,155,0.22)", i:"#162033", t:"#3a4a5c", m:"#718095", g:"#2b7e7a", b:"#4a7fb5", a:"#c2853a", r:"#b84c6b", bg:"#f5f3ee", paper:"#fdfcfa" };
  }
}

/* ── Cell renderers ── */
const CN: Record<string,string> = { DONE:"已完成", DOING:"进行中", BLOCKED:"阻塞", TODO:"待处理" };
function cell(text: string, style: Partial<CSSStyleDeclaration>) {
  const span = document.createElement("span");
  span.textContent = text;
  Object.assign(span.style, style);
  return span;
}
function rName(r:any,tk:any){const d=r.data||{};const s=d.type==="summary";return cell(d.name||"", { fontSize:s?"13px":"12px", color:s?tk.i:tk.t, fontWeight:s?"700":"500" });}
function rAss(r:any,tk:any){const d=r.data||{};if(d.type==="summary")return cell(d.children?.length?`${d.children.length} 项任务`:"无", { fontSize:"10px", color:tk.m });return cell(d.assignee||"-", { fontSize:"11px", color:tk.m });}
function rProg(r:any,tk:any){const d=r.data||{};const p=d.progress??0;const s=d.type==="summary";const c=p>=100?tk.g:p>60?tk.b:tk.m;return cell(`${p}%`, { fontSize:s?"13px":"11px", color:c, fontWeight:"700" });}
function rStat(r:any,tk:any){const d=r.data||{};if(d.type==="summary")return cell("", {});const v=d.status||"";const bg:Record<string,string>={DONE:`color-mix(in srgb, ${tk.g} 12%, transparent)`,DOING:`color-mix(in srgb, ${tk.b} 10%, transparent)`,BLOCKED:`color-mix(in srgb, ${tk.r} 8%, transparent)`,TODO:`rgba(255,255,255,.5)`};const fg:Record<string,string>={DONE:tk.g,DOING:tk.b,BLOCKED:tk.r,TODO:tk.m};return cell(CN[v]||v, { fontSize:"10px", padding:"3px 7px", borderRadius:"99px", background:bg[v]||bg.TODO, color:fg[v]||tk.m, fontWeight:"700" });}
function rgb(value: string, fallback = "#315f8d") {
  const color = (value || fallback).trim();
  const hex = color.startsWith("#") ? color.slice(1) : fallback.slice(1);
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const int = Number.parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(int)) return rgb(fallback, "#315f8d");
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}
function mix(a: string, b: string, amount = 0.5) {
  const ca = rgb(a);
  const cb = rgb(b, "#ffffff");
  const p = Math.max(0, Math.min(1, amount));
  const r = Math.round(ca.r * p + cb.r * (1 - p));
  const g = Math.round(ca.g * p + cb.g * (1 - p));
  const blue = Math.round(ca.b * p + cb.b * (1 - p));
  return `rgb(${r}, ${g}, ${blue})`;
}
function alpha(a: string, opacity = 1) {
  const ca = rgb(a);
  return `rgba(${ca.r}, ${ca.g}, ${ca.b}, ${Math.max(0, Math.min(1, opacity))})`;
}

function ganttSkin(themeKey: string, tk: any) {
  const fallback = {
    summary: mix(tk.p, tk.paper, 0.36),
    doing: mix(tk.p, tk.paper, 0.8),
    done: mix(tk.g, tk.paper, 0.76),
    blocked: mix(tk.r, tk.paper, 0.78),
    todo: mix(tk.m, tk.paper, 0.43),
    progress: alpha(tk.paper, 0.46),
    link: mix(tk.p, tk.g, 0.5),
    baseline: mix(tk.a, tk.paper, 0.62),
    shadow: alpha(tk.i, 0.1),
  };
  const skins: Record<string, typeof fallback> = {
    default: {
      summary: "#b8cadb",
      doing: "#507daa",
      done: "#4f9a8e",
      blocked: "#c76476",
      todo: "#a8b2bf",
      progress: "rgba(255, 255, 255, 0.42)",
      link: "#7d9bb6",
      baseline: "#d6bd8a",
      shadow: "rgba(49, 95, 141, 0.16)",
    },
    love: {
      summary: "#e4b5c1",
      doing: "#b85f78",
      done: "#d18896",
      blocked: "#8f3f59",
      todo: "#c9a5af",
      progress: "rgba(255, 250, 251, 0.48)",
      link: "#cf8798",
      baseline: "#e3be88",
      shadow: "rgba(155, 83, 104, 0.17)",
    },
    windbell: {
      summary: "#cac2ee",
      doing: "#7569b6",
      done: "#66a9aa",
      blocked: "#b16d91",
      todo: "#b6b1cc",
      progress: "rgba(251, 250, 255, 0.48)",
      link: "#8d84c7",
      baseline: "#d8c08b",
      shadow: "rgba(107, 95, 157, 0.17)",
    },
    custom: {
      summary: mix(tk.p, tk.paper, 0.34),
      doing: mix(tk.p, tk.paper, 0.82),
      done: mix(tk.g, tk.paper, 0.78),
      blocked: mix(tk.r, tk.paper, 0.8),
      todo: mix(tk.m, tk.paper, 0.46),
      progress: alpha(tk.paper, 0.5),
      link: mix(tk.p, tk.b, 0.58),
      baseline: mix(tk.a, tk.paper, 0.48),
      shadow: alpha(tk.p, 0.17),
    },
  };
  return skins[themeKey] || fallback;
}

function barColor(d: any, skin: ReturnType<typeof ganttSkin>) {
  if (d.type === "summary") {
    return skin.summary;
  }
  if (d.status === "DONE") {
    return skin.done;
  }
  if (d.status === "BLOCKED") {
    return skin.blocked;
  }
  if (d.status === "DOING") {
    return skin.doing;
  }
  return skin.todo;
}
function fmtDate(value: any) {
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
function flattenTasks(groups: any[]) {
  return groups.flatMap((group: any) => group.children || []);
}
const DAY_MS = 24 * 60 * 60 * 1000;
function dateValue(value: any) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}
function clampValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
function daysBetween(start: any, end: any) {
  const a = dateValue(start);
  const b = dateValue(end);
  if (a == null || b == null) return 1;
  return Math.max(1, Math.round((b - a) / DAY_MS) + 1);
}
function buildAdaptiveTimeline(unit: "day"|"week"|"month", tasks: any[], baselines: any[], range: any, viewportWidth: number) {
  const visibleTasks = tasks.filter((task: any) => task?.startTime && task?.endTime);
  const dates = [
    ...visibleTasks.flatMap((task: any) => [task.startTime, task.endTime]),
    ...baselines.flatMap((baseline: any) => [baseline.startTime, baseline.endTime]),
    range?.startTime,
    range?.endTime,
  ].map(dateValue).filter((value): value is number => value != null).sort((a, b) => a - b);
  const spanDays = dates.length ? Math.max(1, Math.round((dates[dates.length - 1] - dates[0]) / DAY_MS) + 1) : 30;
  const taskCount = visibleTasks.length;
  const taskDurations = visibleTasks.map((task: any) => daysBetween(task.startTime, task.endTime));
  const shortRatio = taskDurations.length ? taskDurations.filter((days) => days <= 2).length / taskDurations.length : 0;
  const denseRows = taskCount >= 18;
  const roomyRows = taskCount <= 5;
  const availableWidth = Math.max(420, viewportWidth || 680);

  const minDayByUnit = unit === "day" ? 38 : unit === "week" ? 13 : 10;
  const maxDayByUnit = unit === "day" ? 58 : unit === "week" ? 24 : 18;
  const shortTaskBoost = shortRatio > 0.45 ? 4 : shortRatio > 0.2 ? 2 : 0;
  const densityRelief = denseRows ? -2 : roomyRows ? 2 : 0;
  const longRangeRelief = spanDays > 360 ? -4 : spanDays > 180 ? -2 : 0;
  const minDayWidth = clampValue(minDayByUnit + shortTaskBoost + densityRelief + longRangeRelief, unit === "day" ? 34 : 8, maxDayByUnit);
  const targetFill = roomyRows ? 0.9 : denseRows ? 1.12 : 1.02;
  const fittedDayWidth = (availableWidth * targetFill) / spanDays;
  const dayWidth = Math.round(clampValue(fittedDayWidth, minDayWidth, maxDayByUnit));
  const totalWidth = dayWidth * spanDays;
  const density = taskCount >= 24 || totalWidth > availableWidth * 3.2 ? "dense" : totalWidth > availableWidth * 1.75 ? "balanced-scroll" : "balanced";

  return {
    dayWidth,
    weekWidth: Math.round(dayWidth * 7),
    monthWidth: Math.round(dayWidth * 30.5),
    spanDays,
    taskCount,
    shortRatio,
    density,
    labelMode: density === "dense" ? "progress" : "full",
    linkOpacity: density === "dense" ? 0.32 : density === "balanced-scroll" ? 0.4 : 0.46,
    baselineLabel: density !== "dense",
    compareLabel: density === "balanced",
  };
}
function withUpdatedSummaries(groups: any[]) {
  return groups.map((project: any) => {
    const children = project.children || [];
    if (!children.length) return project;
    const starts = children.map((task: any) => task.startTime).filter(Boolean).sort();
    const ends = children.map((task: any) => task.endTime).filter(Boolean).sort();
    const done = children.filter((task: any) => task.status === "DONE").length;
    return {
      ...project,
      startTime: starts[0] || project.startTime,
      endTime: ends[ends.length - 1] || project.endTime,
      progress: Math.round((done / children.length) * 100),
      children,
    };
  });
}

/* ════════════════════════════════════════════════ */
export function Dashboard({ data, projects, setView, setProjectId, setProjectFilter, token, refreshStamp, refresh, view }: any) {
  const [dashboardStats, setDashboardStats] = useState<any>(data || null);
  const statsData = dashboardStats || data || {};
  const metrics = statsData?.metrics || {};
  const pendingActions = statsData?.pendingActions || [];
  const riskItems = statsData?.riskItems || [];
  const myProgress = statsData?.myProgress || [];
  const deltaDays = metrics.myDeltaDays || 0;
  const completion = metrics.myCompletion || 0;

  /* ── Gantt reactive data (like demo) ── */
  const [ganttTasks, setGanttTasks] = useState<any[]>([]);
  const [ganttLinks, setGanttLinks] = useState<any[]>([]);
  const [ganttBaselines, setGanttBaselines] = useState<any[]>([]);
  const [ganttLoaded, setGanttLoaded] = useState(false);
  const [mountKey, setMountKey] = useState(0);
  const [syncState, setSyncState] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [syncNote, setSyncNote] = useState("已连接数据库");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [themeKey, setThemeKey] = useState(() => document.body.dataset.theme || "default");
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [ganttViewportWidth, setGanttViewportWidth] = useState(680);
  const ganttRef = useRef<XGanttReactRef>(null);
  const ganttPanelRef = useRef<HTMLElement | null>(null);
  const fetchIdRef = useRef(0);
  const prevViewRef = useRef(view);

  useEffect(() => {
    if (data) setDashboardStats(data);
  }, [data]);

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeKey(document.body.dataset.theme || "default"));
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const panel = ganttPanelRef.current;
    if (!panel || typeof ResizeObserver === "undefined") return;
    const updateWidth = () => {
      const width = panel.getBoundingClientRect().width;
      setGanttViewportWidth(Math.max(420, Math.round(width - 448)));
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (view === "dashboard" && prevViewRef.current !== "dashboard") {
      setMountKey((k) => k + 1);
      setGanttLoaded(false);
      // Delay fetch slightly so DOM has new dimensions
      const id = ++fetchIdRef.current;
      setTimeout(() => {
        if (id !== fetchIdRef.current) return;
        api("/dashboard/gantt-v2")
          .then(d => {
            if (id !== fetchIdRef.current) return;
            setGanttTasks(d.data || []);
            setGanttLinks(d.links || []);
            setGanttBaselines(d.baselines || []);
            setGanttLoaded(true);
          }).catch(() => { if (id === fetchIdRef.current) setGanttLoaded(true); });
      }, 100);
    }
    prevViewRef.current = view;
  }, [view, token]);

  /* ── Settings (like demo) ── */
  const [settings, setSettings] = useState({
    unit: "day" as "day"|"week"|"month",
    showLinks: true,
    showProgress: true,
    showBaseline: true,
    showWeekend: true,
    density: "compact" as "compact"|"comfortable",
  });
  const viewToggleMeta = [
    ["showLinks", "依赖", "sync"],
    ["showProgress", "进度", "clock"],
    ["showBaseline", "基线", "project"],
    ["showWeekend", "周末", "dashboard"],
  ] as const;

  /* ── Fetch data ── */
  const fetchGantt = useCallback(() => {
    if (!token) return;
    const id = ++fetchIdRef.current;
    api("/dashboard/gantt-v2")
      .then(d => {
        if (id !== fetchIdRef.current) return;
        setGanttTasks(d.data || []);
        setGanttLinks(d.links || []);
        setGanttBaselines(d.baselines || []);
        setGanttLoaded(true);
      }).catch(() => { if (id === fetchIdRef.current) setGanttLoaded(true); });
  }, [token]);

  const fetchDashboardStats = useCallback(() => {
    if (!token) return Promise.resolve(null);
    return api("/dashboard/stats")
      .then((next) => {
        setDashboardStats(next);
        return next;
      })
      .catch(() => null);
  }, [token]);

  useEffect(() => { fetchGantt(); }, [fetchGantt, refreshStamp]);

  /* ── Stats ── */
  const totalTasks = useMemo(() => ganttTasks.reduce((s:number,p:any)=>s+(p.children?.length||0),0), [ganttTasks]);
  const doneTasks = useMemo(() => ganttTasks.reduce((s:number,p:any)=>s+(p.children?.filter((t:any)=>t.status==="DONE").length||0),0), [ganttTasks]);
  const flatGanttTasks = useMemo(() => flattenTasks(ganttTasks), [ganttTasks]);
  const progressStatus = useMemo(() => {
    const backendCounts = statsData?.statusCounts;
    if (backendCounts) {
      return {
        total: backendCounts.total || 0,
        done: backendCounts.done || 0,
        doing: backendCounts.doing || 0,
        blocked: backendCounts.blocked || 0,
        todo: backendCounts.todo || 0,
      };
    }
    const items = Array.isArray(myProgress) ? myProgress : [];
    return {
      total: items.length,
      done: items.filter((item:any) => item.status === "DONE").length,
      doing: items.filter((item:any) => item.status === "DOING").length,
      blocked: items.filter((item:any) => item.status === "BLOCKED" || item.status === "DELAYED").length,
      todo: items.filter((item:any) => !item.status || item.status === "TODO").length,
    };
  }, [myProgress, statsData?.statusCounts]);
  const ganttRange = useMemo(() => {
    const dates = [
      ...flatGanttTasks.flatMap((t:any) => [t.startTime, t.endTime]),
      ...ganttBaselines.flatMap((b:any) => [b.startTime, b.endTime]),
    ].filter(Boolean).sort();
    if (!dates.length) return {};
    const start = new Date(`${dates[0]}T00:00:00Z`);
    const end = new Date(`${dates[dates.length - 1]}T00:00:00Z`);
    start.setDate(start.getDate() - 3);
    end.setDate(end.getDate() + 8);
    return { startTime: start.toISOString().slice(0, 10), endTime: end.toISOString().slice(0, 10) };
  }, [flatGanttTasks, ganttBaselines]);

  const applyLocalGanttPatch = useCallback((payload: any) => {
    const moves = Array.isArray(payload?.moves) ? payload.moves : [];
    const links = Array.isArray(payload?.links) ? payload.links : [];

    if (moves.length) {
      const moveMap = new Map(moves.map((move: any) => [move.id || move.taskId, move]));
      setGanttTasks(prev => withUpdatedSummaries(prev.map((project: any) => ({
        ...project,
        children: (project.children || []).map((task: any) => {
          const move = moveMap.get(task.id) as any;
          if (!move) return task;
          const next = {
            ...task,
            startTime: move.currentStart || move.startTime || task.startTime,
            endTime: move.currentEnd || move.endTime || task.endTime,
          };
          if (selectedTask?.id === task.id) setSelectedTask(next);
          return next;
        }),
      }))));
    }

    if (links.length) {
      setGanttLinks(prev => {
        let next = [...prev];
        for (const link of links) {
          const from = link.from || link.source;
          const to = link.to || link.target;
          if (!from || !to) continue;
          next = next.filter((item: any) => (item.from || item.source) !== from || (item.to || item.target) !== to);
          if (link.action !== "delete" && link.action !== "remove") {
            next.push({ id: link.id || `ln_${from}_${to}`, from, to, type: link.type || "FS" });
          }
        }
        return next;
      });
    }
  }, [selectedTask?.id]);

  const syncGantt = useCallback(async (payload: any, success = "已同步到数据库") => {
    applyLocalGanttPatch(payload);
    setSyncState("saving");
    setSyncNote("正在保存...");
    try {
      await api("/dashboard/gantt-sync", { method: "PATCH", body: JSON.stringify(payload) });
      setSyncState("saved");
      setSyncNote(success);
      fetchDashboardStats();
      window.setTimeout(() => setSyncState("idle"), 1300);
    } catch (error: any) {
      setSyncState("error");
      setSyncNote(error?.message || "同步失败，已恢复数据");
      fetchGantt();
      fetchDashboardStats();
    }
  }, [applyLocalGanttPatch, fetchDashboardStats, fetchGantt]);

  /* ── Edit modal ── */
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editingProject, setEditingProject] = useState<any>(null);

  /* ── Task context menu ── */
  const [ctxMenu, setCtxMenu] = useState<{x:number;y:number;taskId:string;taskName:string}|null>(null);
  useEffect(() => { const h = () => setCtxMenu(null); document.addEventListener('click', h, true); return () => document.removeEventListener('click', h, true); }, []);

  /* ── Quick status ── */
  const quickSetStatus = useCallback((taskId:string, status:string) => {
    api(`/tasks/${taskId}`, { method:"PATCH", body: JSON.stringify({ status }) })
      .then(() => { fetchGantt(); fetchDashboardStats(); })
      .catch(() => {});
    setCtxMenu(null);
  }, [fetchDashboardStats, fetchGantt]);

  /* ── Open edit from ctx ── */
  const openEdit = (taskId:string) => {
    for (const p of ganttTasks) {
      const child = p.children?.find((t:any)=>t.id===taskId);
      if (child) {
        setEditingTask({...child,dependencyIds:[],note:child.note||""});
        setEditingProject({id:p.id,name:p.name});
      }
    }
    setCtxMenu(null);
  };

  const projectForTask = useCallback((taskId: string) => {
    return ganttTasks.find((project:any) => project.children?.some((task:any) => task.id === taskId));
  }, [ganttTasks]);

  const openTaskFromGantt = useCallback((row: any) => {
    const task = row?.data || row;
    if (!task?.id || task.type === "summary") return;
    const project = projectForTask(task.id);
    api(`/tasks/${task.id}`)
      .then(res => {
        const full = res.task || task;
        setEditingTask({
          ...full,
          ...task,
          currentStart: fmtDate(full.currentStart || task.currentStart || task.startTime),
          currentEnd: fmtDate(full.currentEnd || task.currentEnd || task.endTime),
          baselineStart: fmtDate(full.baselineStart || task.baselineStart),
          baselineEnd: fmtDate(full.baselineEnd || task.baselineEnd),
          dependencyIds: full.dependencyIds || [],
          note: full.note || task.note || "",
        });
        setEditingProject(project ? { id: project.id, name: project.name } : null);
      })
      .catch(() => {
        setEditingTask({ ...task, dependencyIds: [], note: task.note || "" });
        setEditingProject(project ? { id: project.id, name: project.name } : null);
      });
  }, [projectForTask]);

  const handleTaskContext = useCallback((e: MouseEvent, row: any) => {
    const task = row?.data || row;
    if (!task?.id || task.type === "summary") return;
    e.preventDefault();
    setSelectedTask(task);
    setCtxMenu({ x: e.clientX || 420, y: e.clientY || 280, taskId: task.id, taskName: task.name || task.title || "任务" });
  }, []);

  /* ── Link context menu ── */
  const [linkCtx, setLinkCtx] = useState<{x:number;y:number;link:any}|null>(null);
  const [selectedLink, setSelectedLink] = useState<any>(null);
  useEffect(() => { const h = (e:MouseEvent) => { if(!(e.target as HTMLElement).closest('.gantt-ctx-menu')){setLinkCtx(null);} }; document.addEventListener('click',h,true); return ()=>document.removeEventListener('click',h,true); }, []);

  /* ── Link handlers (like demo) ── */
  const handleContextMenuLink = useCallback((e: any, link: any) => {
    setSelectedLink(link);
    setLinkCtx({ x: e.clientX||400, y: e.clientY||300, link });
  }, []);

  const handleSelectLink = useCallback((add: any, cancel: any, all: any[]) => {
    if (add) {
      setSelectedLink(add);
      return;
    }
    if (cancel && selectedLink) {
      const selectedFrom = selectedLink.from || selectedLink.source;
      const selectedTo = selectedLink.to || selectedLink.target;
      const cancelFrom = cancel.from || cancel.source;
      const cancelTo = cancel.to || cancel.target;
      if (selectedFrom === cancelFrom && selectedTo === cancelTo) {
        setSelectedLink(all?.[all.length - 1] || null);
      }
      return;
    }
    setSelectedLink(all?.[all.length - 1] || null);
  }, [selectedLink]);

  const deleteSelectedLink = useCallback(() => {
    const l = linkCtx?.link || selectedLink;
    if (!l) {
      setSyncState("error");
      setSyncNote("请先点击一条依赖线");
      window.setTimeout(() => setSyncState("idle"), 1300);
      return;
    }
    const tId = l.to||l.target, fId = l.from||l.source;
    setGanttLinks((prev:any[])=>prev.filter((x:any)=>(x.from||x.source)!==fId||(x.to||x.target)!==tId));
    setLinkCtx(null);
    setSelectedLink(null);
    syncGantt({ links: [{ action: "delete", from: fId, to: tId }] }, "依赖已删除");
  }, [linkCtx, selectedLink, syncGantt]);

  const handleCreateLink = useCallback((link: any) => {
    const tId = link.to||link.target, fId = link.from||link.source;
    if (!tId||!fId||tId===fId) return;
    const lk = { id: `ln_${fId}_${tId}`, from: fId, to: tId, type: link.type||"FS" };
    setSelectedLink(lk);
    setGanttLinks((prev:any[]) => [...prev.filter((l:any)=>l.from!==fId||l.to!==tId), lk]);
    syncGantt({ links: [{ action: "upsert", ...lk }] }, "依赖已同步");
  }, [syncGantt]);

  const handleUpdateLink = useCallback((link: any) => {
    const tId = link.to||link.target, fId = link.from||link.source;
    if (!tId||!fId||tId===fId) return;
    syncGantt({ links: [{ action: "upsert", from: fId, to: tId, type: link.type||"FS" }] }, "依赖已更新");
  }, [syncGantt]);

  const handleMove = useCallback((result: any) => {
    const rows = Array.isArray(result) ? result : [result];
    const moves = rows
      .map((item:any) => item?.row || item)
      .filter((row:any) => row?.id && row.type !== "summary")
      .map((row:any) => ({ id: row.id, currentStart: fmtDate(row.startTime), currentEnd: fmtDate(row.endTime) }))
      .filter((move:any) => move.currentStart && move.currentEnd);
    if (!moves.length) return;
    syncGantt({ moves }, moves.length > 1 ? `${moves.length} 个任务已同步` : "任务时间已同步");
  }, [syncGantt]);

  /* ── Toolbar actions ── */
  const handleAddTask = useCallback(async () => {
    const name = prompt("任务名称：");
    if (!name) return;
    const pid = ganttTasks[0]?.id;
    if (!pid) return;
    try { await api(`/projects/${pid}/tasks`, { method:"POST", body: JSON.stringify({ title: name }) }); } catch {}
    fetchGantt();
    fetchDashboardStats();
  }, [ganttTasks, fetchDashboardStats, fetchGantt]);

  /* ── Gantt options (like demo) ── */
  const ganttOptions = useMemo(() => {
    const tk = Tk();
    const skin = ganttSkin(themeKey, tk);
    const adaptive = buildAdaptiveTimeline(settings.unit, flatGanttTasks, ganttBaselines, ganttRange, ganttViewportWidth);
    const compactTable = settings.unit === "month" || adaptive.density !== "balanced";
    const tableWidth = compactTable ? 372 : 420;
    const columns = compactTable
      ? [
          { field: "name", label: "任务", width: 174, headerAlign: "left" as any, render: (r:any)=>rName(r,tk) },
          { field: "assignee", label: "负责人", width: 60, align: "center" as any, render: (r:any)=>rAss(r,tk) },
          { field: "progress", label: "进度", width: 52, align: "center" as any, render: (r:any)=>rProg(r,tk) },
          { field: "status", label: "状态", width: 66, align: "center" as any, render: (r:any)=>rStat(r,tk) },
        ]
      : [
          { field: "name", label: "任务", width: 198, headerAlign: "left" as any, render: (r:any)=>rName(r,tk) },
          { field: "assignee", label: "负责人", width: 66, align: "center" as any, render: (r:any)=>rAss(r,tk) },
          { field: "progress", label: "进度", width: 58, align: "center" as any, render: (r:any)=>rProg(r,tk) },
          { field: "status", label: "状态", width: 74, align: "center" as any, render: (r:any)=>rStat(r,tk) },
        ];
    const rowHeight = settings.density === "comfortable" ? 48 : adaptive.density === "dense" ? 38 : 40;
    const scaleUnit: any = settings.unit === "day" ? [
      { unit: "month", format: "YYYY年 M月", height: 24 },
      { unit: "week", format: "第ww周", height: 22 },
      { unit: "day", format: "M/D", cellWidth: adaptive.dayWidth, height: 24 },
    ] : settings.unit === "week" ? [
      { unit: "year", format: "YYYY年", height: 24 },
      { unit: "month", format: "M月", height: 22 },
      { unit: "week", format: "第ww周", cellWidth: adaptive.weekWidth, height: 24 },
    ] : [
      { unit: "year", format: "YYYY年", height: 24 },
      { unit: "quarter", format: "Q[季度]", height: 22 },
      { unit: "month", format: "M月", cellWidth: adaptive.monthWidth, height: 24 },
    ];

    return {
      data: ganttTasks,
      fields: { id: "id", startTime: "startTime", endTime: "endTime", name: "name", progress: "progress", children: "children", type: "type" },
      unit: settings.unit,
      primaryColor: tk.p,
      locale: "zh",
      dateFormat: "YYYY-MM-DD",
      resize: { enabled: true },
      highlight: true,
      border: { show: true, color: tk.l },
      table: {
        width: tableWidth,
        align: "left",
        headerAlign: "left",
        ellipsis: true,
        emptyText: "-",
        columns,
      },
      scaleUnit,
      chart: { ...ganttRange, autoCellWidth: false, cellWidth: adaptive.dayWidth, backgroundColor: mix(tk.paper, tk.bg, 0.74), showVerticalLine: settings.unit !== "day" },
      header: { height: 70, backgroundColor: mix(tk.paper, tk.bg, 0.94), color: tk.m, fontSize: 11, fontWeight: 700, fontFamily: "Inter,PingFang SC,Microsoft YaHei,sans-serif" },
      expand: { show: true, enabled: true },
      selection: { enabled: true, includeSelf: true },
      drag: { enabled: (row:any) => row?.data?.type !== "summary", color: tk.m, targetBackgroundColor: tk.p, targetOpacity: 0.09, drop: { crossLevel: false } },
      collapse: { show: true, backgroundColor: mix(tk.paper, tk.bg, 0.92), radius: 7 },
      summary: { show: true, color: mix(tk.p, tk.paper, 0.28), move: { enabled: false }, mode: "expand" },
      milestone: { show: true, shape: "diamond", color: tk.a, border: { width: 1, color: tk.paper }, label: { show: false, text: "", position: "top-right", fontSize: 10, fontFamily: "Inter", color: tk.a } },
      links: {
        data: ganttLinks,
        show: settings.showLinks,
        key: "id",
        move: { enabled: true },
        create: { enabled: true, mode: "hover" as any, color: skin.link, opacity: 0.82, radius: 4, width: 2, from: (row:any)=>row?.data?.type !== "summary", to: (row:any)=>row?.data?.type !== "summary" },
        color: skin.link,
        opacity: adaptive.linkOpacity,
        distance: 20,
        gap: 7,
        dash: [0],
        width: 1,
        arrow: { width: 6, height: 5 },
        radius: 3,
        enableCycleDetection: true,
      },
      baselines: {
        show: settings.showBaseline && ganttBaselines.length > 0,
        data: ganttBaselines,
        taskKey: "taskId",
        fields: { startTime: "startTime", endTime: "endTime", name: "name", id: "id", highlight: "highlight", target: "target" },
        mode: "line",
        height: 2,
        offset: 2,
        position: "bottom",
        backgroundColor: skin.baseline,
        color: skin.baseline,
        opacity: 0.58,
        radius: 999,
        label: { show: adaptive.baselineLabel, field: "name", color: skin.baseline, fontSize: 9, fontFamily: "Inter,PingFang SC,Microsoft YaHei,sans-serif", position: "right", forceDisplay: true },
        compare: {
          enabled: true,
          tolerance: 0.5,
          mode: "indicator",
          target: "end",
          delayed: { backgroundColor: skin.blocked, opacity: 0.1 },
          ahead: { backgroundColor: skin.done, opacity: 0.09 },
          indicator: {
            show: "end",
            position: "top",
            size: 5,
            fontSize: 9,
            fontFamily: "Inter,PingFang SC,Microsoft YaHei,sans-serif",
            ahead: { show: adaptive.compareLabel, text: (diff:number)=>`提前 ${Math.abs(Math.round(diff))} 天`, color: skin.done, opacity: 0.68 },
            delayed: { show: adaptive.compareLabel, text: (diff:number)=>`延后 ${Math.abs(Math.round(diff))} 天`, color: skin.blocked, opacity: 0.68 },
            ontime: { show: false, text: "准时", color: tk.m, opacity: 0.5 },
          },
        },
      },
      weekend: { show: settings.showWeekend, backgroundColor: alpha(tk.p, 0.045), opacity: 1 },
      holiday: { show: false, opacity: 0.08 },
      bar: {
        height: settings.density === "comfortable" ? 26 : 22,
        backgroundColor: (row: any) => {
          const d = row.data || {};
          return barColor(d, skin);
        },
        radius: (row:any) => (row.data?.type === "summary" ? [5, 5, 5, 5] : 7),
        shadowColor: skin.shadow,
        shadowBlur: 4,
        shadowOffsetY: 1,
        color: tk.paper,
        fontSize: 11,
        fontFamily: "Inter,PingFang SC,Microsoft YaHei,sans-serif",
        align: "center",
        move: { enabled: (row:any) => row?.data?.type !== "summary", byUnit: true, single: { left: true, right: true, backgroundColor: alpha(tk.paper, 0.58), opacity: 0.74 }, link: { child: "none", parent: "expand" } },
        label: (row:any)=>{const d=row.data||{};if(d.type==="summary") return ""; const p=d.progress!=null?`${d.progress}%`:""; if(adaptive.labelMode==="progress") return p; const w=d.assignee||"";return w?`${w} · ${p}`:p;},
        progress: { show: settings.showProgress, backgroundColor: skin.progress, color: tk.paper, opacity: 0.66, radius: 7, textAlign: "inside", fontSize: 10 },
      },
      row: {
        height: rowHeight,
        indent: 18,
        backgroundColor: (row:any) => row.data?.type === "summary" ? mix(tk.p, tk.paper, 0.035) : alpha(tk.paper, settings.density === "comfortable" ? 0.76 : 0.68),
        hover: { backgroundColor: tk.p, opacity: 0.04 },
        select: { backgroundColor: tk.p, opacity: 0.07 },
      },
      today: { show: true, type: "line", backgroundColor: tk.r, opacity: 0.58, width: 1.2, text: { show: true, color: tk.paper, backgroundColor: tk.r, opacity: 0.78, fontSize: 9, fontFamily: "Inter" } },
      scrollbar: { showHorizontal: true, showVertical: true, track: { size: 10, radius: 999, color: alpha(tk.p, 0.04) }, thumb: { size: 34, radius: 999, color: mix(tk.p, tk.paper, 0.22) }, showDelay: 0, hideDelay: 900, showDuration: 160, hideDuration: 200, animationDuration: 120 },
    } as any;
  }, [ganttTasks, ganttLinks, ganttBaselines, ganttRange, flatGanttTasks, ganttViewportWidth, settings, themeKey]);

  const onModalClose = useCallback(() => { setEditingTask(null); fetchGantt(); fetchDashboardStats(); }, [fetchDashboardStats, fetchGantt]);

  return <>
    {editingTask && <TaskEditModal task={editingTask} project={editingProject} api={api} refresh={()=>{fetchGantt();fetchDashboardStats();}} members={[]} tasks={[]} onClose={onModalClose} />}
    {linkCtx && <div className="gantt-ctx-overlay" onClick={()=>setLinkCtx(null)}>
      <div className="gantt-ctx-menu" style={{left:linkCtx.x,top:linkCtx.y}}>
        <div className="gantt-ctx-head">依赖: {linkCtx.link.type||"FS"}</div>
        <button onClick={deleteSelectedLink} className="danger"><Icon name="x" /><span>删除依赖</span></button>
      </div>
    </div>}
    {ctxMenu && <div className="gantt-ctx-overlay" onClick={()=>setCtxMenu(null)}>
      <div className="gantt-ctx-menu" style={{left:ctxMenu.x,top:ctxMenu.y}}>
        <div className="gantt-ctx-head">{ctxMenu.taskName}</div>
        <button onClick={()=>quickSetStatus(ctxMenu.taskId,"DONE")}><Icon name="save" /><span>标记完成</span></button>
        <button onClick={()=>quickSetStatus(ctxMenu.taskId,"DOING")}><Icon name="clock" /><span>标记进行中</span></button>
        <button onClick={()=>quickSetStatus(ctxMenu.taskId,"BLOCKED")}><Icon name="alert" /><span>标记阻塞</span></button>
        <hr />
        <button onClick={()=>openEdit(ctxMenu.taskId)}><Icon name="edit" /><span>编辑</span></button>
      </div>
    </div>}

    <div className="metrics action-metrics">
      <article className="primary-action-metric" onClick={() => setView("workspace")}>
        <span>今日待处理</span>
        <strong>{metrics.todayActions||0}</strong>
        <em>{pendingActions.length ? `${pendingActions.length} 项需要推进` : "暂无阻塞动作"}</em>
      </article>
      <article className={deltaDays > 0 ? "warn" : deltaDays < 0 ? "good" : ""}>
        <span>进度偏差</span>
        <strong>{deltaDays>0?`+${deltaDays}`:deltaDays===0?"0":`${deltaDays}`}</strong>
        <em>{deltaDays>0?"天落后":deltaDays<0?"天提前":"按计划"}</em>
      </article>
      <article onClick={() => setView("files")}>
        <span>待收集文件</span>
        <strong>{metrics.pendingFiles||0}</strong>
        <em>提交物</em>
      </article>
      <article className={(metrics.riskProjects||0) > 0 ? "danger" : ""} onClick={() => { setProjectFilter("risk"); setView("project-list"); }}>
        <span>风险项目</span>
        <strong>{metrics.riskProjects||0}</strong>
        <em>{riskItems.length ? "需介入" : "稳定"}</em>
      </article>
    </div>

    <section className="panel my-progress-panel action-progress-panel">
      <div className={`progress-orb ${deltaDays>0?"lag":deltaDays<0?"ahead":""}`} style={{"--p": `${Math.min(100,Math.max(0,completion))}%`} as React.CSSProperties}>
        <strong>{completion}%</strong>
        <span>我的进度</span>
      </div>
      <div className="rhythm-main">
        <div className="rhythm-heading">
          <span>节奏状态</span>
          <strong>{deltaDays>0?`落后 ${deltaDays} 天`:deltaDays===0?"按计划":`提前 ${Math.abs(deltaDays)} 天`}</strong>
          <em>{progressStatus.total ? `${progressStatus.total} 个任务纳入今日推进` : "暂无个人任务"}</em>
        </div>
        <div className="action-progress-bar" aria-label={`我的进度 ${completion}%`}>
          <i style={{width:`${Math.min(100,Math.max(0,completion))}%`}} />
        </div>
        <div className="rhythm-meta">
          <span>完成 <b>{progressStatus.done}</b></span>
          <span>推进 <b>{progressStatus.doing}</b></span>
          <span>风险 <b>{progressStatus.blocked}</b></span>
        </div>
      </div>
      <div className="rhythm-status-grid">
        <article className="todo"><span>待办</span><strong>{progressStatus.todo}</strong></article>
        <article className="doing"><span>进行中</span><strong>{progressStatus.doing}</strong></article>
        <article className="done"><span>已完成</span><strong>{progressStatus.done}</strong></article>
        <article className="blocked"><span>风险</span><strong>{progressStatus.blocked}</strong></article>
      </div>
    </section>

    <div className="dashboard-grid">
      <section className="panel gantt-panel" ref={ganttPanelRef}>

        {/* ── Toolbar (like demo) ── */}
        <div className="dashboard-gantt-toolbar">
          <div className="dashboard-gantt-title">
            <span>关键路径</span>
            <strong>{doneTasks}/{totalTasks} 已完成</strong>
            <em className={`gantt-sync-state ${syncState}`}><i />{syncNote}</em>
          </div>
          <div className="dashboard-gantt-actions">
            <button className="btn primary" onClick={handleAddTask}><Icon name="plus" />新建任务</button>
            <div className="segmented">
              {(["day","week","month"] as Array<"day"|"week"|"month">).map(u => (
                <button key={u} className={settings.unit===u?"active":""} onClick={()=>setSettings(s=>({...s,unit:u}))}>{u==="day"?"日":u==="week"?"周":"月"}</button>
              ))}
            </div>
            <div className="gantt-view-menu-wrap">
              <button className={`btn view-menu-trigger ${viewMenuOpen ? "active" : ""}`} onClick={() => setViewMenuOpen(open => !open)} aria-expanded={viewMenuOpen}><Icon name="filter" />视图</button>
              {viewMenuOpen && <div className="gantt-view-menu">
                <div className="gantt-view-menu-head"><strong>显示项</strong><span>控制甘特辅助信息</span></div>
                {viewToggleMeta.map(([key, label, icon]) => (
                  <label key={key} className="view-menu-row">
                    <span><Icon name={icon as any} />{label}</span>
                    <input type="checkbox" checked={(settings as any)[key]} onChange={e=>setSettings(s=>({...s,[key]:e.target.checked}))} />
                  </label>
                ))}
                <button className="view-menu-row as-button" onClick={() => ganttRef.current?.jumpTo()}><span><Icon name="dashboard" />回到今天</span></button>
                <button className="view-menu-row as-button" onClick={() => setSettings(s => ({...s, density: s.density === "compact" ? "comfortable" : "compact"}))}><span><Icon name="dashboard" />{settings.density === "compact" ? "舒展行高" : "紧凑行高"}</span></button>
                {ganttLinks.length > 0 && <button className="view-menu-row as-button danger" disabled={!selectedLink} onClick={deleteSelectedLink}><span><Icon name="x" />删除依赖</span></button>}
              </div>}
            </div>
          </div>
        </div>
        <div className="gantt-fullapp-status">
          <span>{totalTasks} 个任务</span>
          <span>{ganttLinks.length} 条依赖</span>
          <span>{ganttBaselines.length} 条基线</span>
          {selectedTask && <strong>{selectedTask.name || selectedTask.title} · {selectedTask.progress || 0}%</strong>}
        </div>

        {/* ── Gantt chart ── */}
        {!ganttLoaded ? <div style={{height:460,display:"grid",placeItems:"center",color:"var(--muted)"}}>加载中…</div> :
          <Suspense fallback={<div style={{height:460,display:"grid",placeItems:"center",color:"var(--muted)"}}>加载组件中…</div>}>
            <XGanttReact key={mountKey} ref={ganttRef} style={{height:500,width:"100%"}} options={ganttOptions}
              onClickRow={(_, row:any) => setSelectedTask(row?.data || row)}
              onClickSlider={(_, row:any) => setSelectedTask(row?.data || row)}
              onDoubleClickRow={(_, row:any) => openTaskFromGantt(row)}
              onDoubleClickSlider={(_, row:any) => openTaskFromGantt(row)}
              onContextMenuRow={handleTaskContext}
              onContextMenuSlider={handleTaskContext}
              onMove={handleMove}
              onCreateLink={handleCreateLink}
              onUpdateLink={handleUpdateLink}
              onSelectLink={handleSelectLink}
              onContextMenuLink={handleContextMenuLink}
              onError={(error:any, msg?:string) => { setSyncState("error"); setSyncNote(msg || error?.message || "甘特图操作失败"); }}
            />
          </Suspense>
        }
      </section>

      <aside className="panel queue-panel">
        <div className="panel-head slim"><h2>待处理</h2><button className="link-btn" onClick={() => setView("workspace")}>全部</button></div>
        {pendingActions.length === 0 && <p className="dashboard-empty">暂无待处理动作</p>}
        {pendingActions.slice(0,4).map((item:any)=><article key={item.taskId} className={`queue ${item.status==="BLOCKED"?"danger":"ok"}`} onClick={()=>{setProjectId(item.projectId);setView("workspace");}}><strong>{item.title}</strong><span>{item.projectName}</span><b>{item.action}</b></article>)}
      </aside>
    </div>

    <section className="panel progress-panel dashboard-projects-panel"><div className="panel-head slim"><h2>重点项目</h2><button className="link-btn" onClick={()=>{setProjectFilter("risk");setView("project-list");}}>风险</button></div><div className="progress-list">{(projects.length?projects:[]).slice(0,4).map((project:any)=>{const riskTone=project.risk==="high"?"risk":project.risk==="medium"?"warn":"";return <article key={project.id} className={riskTone} onClick={()=>{setProjectId(project.id);setView("workspace");}}><div className="progress-meter"><div className="progress-meter-track"><div className={`progress-meter-fill ${riskTone}`} style={{width:`${Math.min(100,Math.max(0,project.progress||0))}%`}} /></div><strong className="progress-meter-value">{project.progress||0}%</strong></div><div className="dashboard-project-row"><strong>{project.name}</strong><span className={`task-counter ${(project.completedTaskCount??0)===0&&(project.taskCount||0)>0?"empty":""} ${(project.completedTaskCount??0)>0?"check":""}`}>{project.completedTaskCount??0}<span className="sep">/</span><span className="total">{project.taskCount||0}</span></span></div></article>;})}</div></section>
  </>;
}
