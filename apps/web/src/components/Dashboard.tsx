import React from "react";
import { Icon } from "../lib/icons";

function Metric({ label, value, hint }: { label: string; value: React.ReactNode; hint: string }) {
  return <article><span>{label}</span><strong>{value}</strong><em>{hint}</em></article>;
}

function Gantt() {
  const rows = [["学习章节 A", "teal", "林 · 提前 1 天", 2, 4], ["需求冻结", "violet", "王 · 计划内", 2, 5], ["接口联调", "blue", "陈 · 慢 2 天", 3, 6], ["预算表格", "amber", "多人协同", 4, 7], ["成果文件", "violet", "4/6 已交", 3, 5], ["上线验收", "rose", "阻塞", 6, 7]];
  return <div className="gantt"><div className="gantt-head"><span>任务</span>{["06/02", "06/03", "06/04", "06/05", "06/06", "06/07"].map(day => <b key={day}>{day}</b>)}</div>{rows.map(([task, tone, label, start, end]) => <div className="gantt-row" key={task as string}><span>{task}</span><i className={`bar ${tone}`} style={{ gridColumn: `${start} / ${end}` }}>{label}</i></div>)}</div>;
}

export function Dashboard({ data, projects, setView, setProjectId, setProjectFilter }: any) {
  const metrics = data?.metrics || {};
  const pendingActions = data?.pendingActions || [];
  const riskItems = data?.riskItems || [];
  const myProgress = data?.myProgress || [];
  const deltaDays = metrics.myDeltaDays || 0;
  const completion = metrics.myCompletion || 0;

  return <>
    <div className="metrics">
      <article onClick={() => setView("workspace")} style={{cursor:"pointer"}}><span>今日待处理</span><strong>{metrics.todayActions || 0}</strong><em>{pendingActions.length} 项待处理</em></article>
      <article><span>我的进度偏差</span><strong>{deltaDays > 0 ? `+${deltaDays} 天` : deltaDays === 0 ? "准时" : `${deltaDays} 天`}</strong><em>完成率 {completion}%</em></article>
      <article onClick={() => setView("files")} style={{cursor:"pointer"}}><span>待收集文件</span><strong>{metrics.pendingFiles || 0}</strong><em>需关注提交物</em></article>
      <article onClick={() => { setProjectFilter("risk"); setView("project-list"); }} style={{cursor:"pointer"}}><span>风险项目</span><strong>{metrics.riskProjects || 0}</strong><em>{riskItems.length} 个需介入</em></article>
    </div>
    <section className="panel my-progress-panel"><div className="my-progress-copy"><span>我的进度</span><strong>完成率 {completion}% · {deltaDays > 0 ? `比计划慢 ${deltaDays} 天` : deltaDays === 0 ? "按计划推进" : `提前 ${Math.abs(deltaDays)} 天`}</strong><p>当前负责 {myProgress.length || 0} 个任务。</p></div><div className="progress-stats">{myProgress.slice(0, 4).map((p: any) => <article key={p.id} className={p.status === "DELAYED" || p.status === "BLOCKED" ? "warn" : ""}><b>{p.status}</b><strong>{p.progress}%</strong><span>{p.note || p.currentEnd}</span></article>)}</div></section>
    <div className="dashboard-grid"><section className="panel gantt-panel"><div className="panel-head"><div><h2>关键路径甘特图</h2><p>默认看主线，高级对比进入视图设置</p></div><div className="segmented"><button className="active">日</button><button>月</button><button>季度</button><button>年</button></div></div><div className="gantt-filterbar"><button className="active"><Icon name="project" />项目主线</button><button><Icon name="dashboard" />我负责</button><button className="warn"><Icon name="alert" />只看延期</button><button><Icon name="user" />成员</button><div className="view-menu"><button><Icon name="filter" />视图设置</button><span>原计划 · 当前进度 · 团队节点</span></div></div><Gantt /><div className="risk-strip"><strong>风险提示</strong><span>{riskItems.length ? riskItems.map((r:any) => r.name).join('、') + ' 存在风险' : '当前无高风险项目'}</span><button onClick={() => { setProjectFilter("risk"); setView("project-list"); }}>查看风险项目</button></div></section><aside className="panel queue-panel"><div className="panel-head slim"><h2>今日待处理</h2><button className="link-btn" onClick={() => setView("workspace")}>全部</button></div>{pendingActions.slice(0, 5).map((item: any, index: number) => <article key={item.taskId} className={`queue ${item.status === "BLOCKED" ? "danger" : "ok"}`}><strong>{item.title}</strong><span>{item.projectName} · {item.action}</span><div><button onClick={() => { setProjectId(item.projectId); setView("workspace"); }}>打开</button></div></article>)}</aside></div>
    <section className="panel progress-panel"><div className="panel-head slim"><h2>项目进度详情</h2><button className="link-btn" onClick={() => { setProjectFilter("risk"); setView("project-list"); }}>筛选风险</button></div><div className="progress-list">{(projects.length ? projects : []).slice(0, 8).map((project: any) => <article key={project.id} onClick={() => { setProjectId(project.id); setView("workspace"); }} style={{cursor:"pointer"}}><strong>{project.name}</strong><span>{project.group} · {project.taskCount || 0} 任务</span><b>{project.progress}%</b><i style={{ width: `${project.progress}%`, background: project.risk === "high" ? "var(--rose)" : project.risk === "medium" ? "var(--amber)" : "var(--teal)" }} /></article>)}</div></section>
  </>;
}
