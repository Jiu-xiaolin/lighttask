import React from "react";
import { Icon } from "../lib/icons";

function Metric({ label, value, hint }: { label: string; value: React.ReactNode; hint: string }) {
  return <article><span>{label}</span><strong>{value}</strong><em>{hint}</em></article>;
}

function Gantt() {
  const rows = [["学习章节 A", "teal", "林 · 提前 1 天", 2, 4], ["需求冻结", "violet", "王 · 计划内", 2, 5], ["接口联调", "blue", "陈 · 慢 2 天", 3, 6], ["预算表格", "amber", "多人协同", 4, 7], ["成果文件", "violet", "4/6 已交", 3, 5], ["上线验收", "rose", "阻塞", 6, 7]];
  return <div className="gantt"><div className="gantt-head"><span>任务</span>{["06/02", "06/03", "06/04", "06/05", "06/06", "06/07"].map(day => <b key={day}>{day}</b>)}</div>{rows.map(([task, tone, label, start, end]) => <div className="gantt-row" key={task as string}><span>{task}</span><i className={`bar ${tone}`} style={{ gridColumn: `${start} / ${end}` }}>{label}</i></div>)}</div>;
}

export function Dashboard({ data, projects, setView }: any) {
  const metrics = data?.metrics || {};
  const myProgress = data?.myProgress || [];
  return <>
    <div className="metrics"><Metric label="今日待处理" value={metrics.todayActions || 17} hint="7 条需要今天完成" /><Metric label="我的进度偏差" value="+2 天" hint="预计 06/19 完成" /><Metric label="待收集文件" value={metrics.pendingFiles || 9} hint="3 人还未提交成果" /><Metric label="风险项目" value={metrics.riskProjects || 4} hint="2 个影响验收" /></div>
    <section className="panel my-progress-panel"><div className="my-progress-copy"><span>我的进度</span><strong>本周 68% · 比计划慢 2 天</strong><p>当前负责 {myProgress.length || 12} 个任务。系统按原计划、当前计划和实际节点计算预计完成日期。</p></div><div className="progress-stats"><article><b>今日</b><strong>8/10</strong><span>完成</span></article><article><b>本周</b><strong>34/50</strong><span>完成</span></article><article><b>本月</b><strong>126</strong><span>节点</span></article><article className="warn"><b>偏差</b><strong>+2 天</strong><span>慢于计划</span></article></div><div className="personal-mini-gantt"><div><span>原计划</span><i style={{ width: "72%" }} /></div><div><span>当前计划</span><i className="amber-line" style={{ width: "84%" }} /></div><div><span>实际进度</span><i className="teal-line" style={{ width: "61%" }} /></div></div></section>
    <div className="dashboard-grid"><section className="panel gantt-panel"><div className="panel-head"><div><h2>关键路径甘特图</h2><p>默认看主线，高级对比进入视图设置</p></div><div className="segmented"><button className="active">日</button><button>月</button><button>季度</button><button>年</button></div></div><div className="gantt-filterbar"><button className="active"><Icon name="project" />项目主线</button><button><Icon name="dashboard" />我负责</button><button className="warn"><Icon name="alert" />只看延期</button><button><Icon name="user" />成员</button><div className="view-menu"><button><Icon name="filter" />视图设置</button><span>原计划 · 当前进度 · 团队节点</span></div></div><div className="member-filter-strip"><span>当前视图：项目主线</span><div><i>林</i><i>王</i><i>陈</i><i>周</i><b>+2</b></div><em>成员节点聚合 · 点击头像展开个人甘特</em></div><Gantt /><div className="risk-strip"><strong>成员延期风险</strong><span>接口联调延期到 06/07，成果文件还有 2 人未提交，预计验收慢 2 天。</span><button onClick={() => setView("workspace")}>查看成员甘特</button></div></section><aside className="panel queue-panel"><div className="panel-head slim"><h2>今日待处理</h2><button className="link-btn">全部</button></div>{["陈艺上报延期", "2 份 Word 成果未提交", "预算表格评论待确认", "学习任务今日完成 8 项"].map((title, index) => <article key={title} className={`queue ${["danger", "warn", "ok", "info"][index]}`}><strong>{title}</strong><span>{["接口联调延期到 06/07，影响上线验收", "客户交付平台，张/周还未上传", "6 个单元格填色更新，3 条评论待处理", "预计 06/19 完成，慢于计划 2 天"][index]}</span><div><button onClick={() => setView(index === 1 ? "files" : "workspace")}>打开</button><button>定向提醒</button></div></article>)}</aside></div>
    <section className="panel progress-panel"><div className="panel-head slim"><h2>项目进度详情</h2><button className="link-btn">筛选风险</button></div><div className="progress-list">{(projects.length ? projects : [{ name: "客户交付平台", progress: 71, group: "任务 36/51 · 文档 18 · 表格 6 · 风险 2" }, { name: "产品研发冲刺", progress: 64, group: "任务 42/66 · 文档 11 · 表格 4 · 风险 3" }]).map((project: any) => <article key={project.id || project.name}><strong>{project.name}</strong><span>{project.group || project.description}</span><b>{project.progress}%</b><i style={{ width: `${project.progress}%` }} /></article>)}</div></section>
  </>;
}
