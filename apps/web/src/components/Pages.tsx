import React, { useMemo, useRef, useState } from "react";
import { Icon } from "../lib/icons";
import { mapTaskStatus, type Project, type Task, type ProgressItem, type FileItem } from "./shared";
import { TaskEditModal } from "./TaskEditModal";
import autoAnimate from "@formkit/auto-animate";
import { getApiToken } from "../lib/api";

export { mapTaskStatus };

function shortDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const [year, month, day] = value.slice(0, 10).split("-");
    return year && month && day ? `${year}年${Number(month)}月${Number(day)}日` : value;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function taskDateRange(task: Task) {
  if (!task.baselineStart) return "";
  const start = shortDate(task.baselineStart);
  const end = task.baselineEnd && task.baselineEnd !== task.baselineStart ? shortDate(task.baselineEnd) : "";
  return end ? `${start} - ${end}` : start;
}

export function Login({ onLogin }: { onLogin: (username: string, password: string) => Promise<void> }) {
  const [username, setUsername] = React.useState("admin");
  const [password, setPassword] = React.useState("admin123");
  const [error, setError] = React.useState("");
  return <section className="login-screen" aria-label="登录"><form className="login-card" onSubmit={async event => { event.preventDefault(); setError(""); try { await onLogin(username, password); } catch (err: any) { setError(err.message); } }}>
    <span className="login-mark"><Icon name="shield" /></span><h2>欢迎回来</h2><p>LightTask 是轻量项目协同系统，用来推进任务、资料、消息和验收归档。</p>
    <label>账号 <input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" /></label>
    <label>密码 <input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" /></label>
    <div className="login-options"><label><input type="checkbox" defaultChecked /> 保持登录</label><a>忘记密码</a></div>
    {error && <small style={{ color: "var(--rose)" }}>{error}</small>}<button className="btn primary wide">登录工作台</button><small>暂不开放注册，新用户由管理员在管理中心创建或邀请。</small>
  </form></section>;
}

export function ProjectList({ projects, setProjectId, setView, api, refresh, filter, setFilter }: any) {
  const filters = [["", "全部"], ["mine", "我负责"], ["risk", "有风险"], ["pending_acceptance", "待验收"], ["archived", "已归档"]];
  const [selectedId, setSelectedId] = React.useState(projects[0]?.id || "");
  const [draft, setDraft] = React.useState<any>({});
  const [quick, setQuick] = React.useState({ name: "", group: "" });
  const [busy, setBusy] = React.useState("");
  const [menuProjectId, setMenuProjectId] = React.useState("");
  const [menuPanel, setMenuPanel] = React.useState<"actions" | "edit">("actions");
  const selected = projects.find((project: any) => project.id === selectedId) || projects[0];
  React.useEffect(() => {
    if (!projects.some((project: any) => project.id === selectedId)) setSelectedId(projects[0]?.id || "");
  }, [projects, selectedId]);
  React.useEffect(() => {
    if (!selected) return;
    setDraft({
      name: selected.name || "",
      group: selected.group || "",
      currentEnd: selected.currentEnd || "",
      description: selected.description || "",
      risk: selected.risk || "low",
    });
  }, [selected?.id]);

  const copyDraft = (key: string, value: string) => setDraft((prev: any) => ({ ...prev, [key]: value }));
  const openProjectMenu = (project: any) => {
    const nextOpen = menuProjectId !== project.id;
    setSelectedId(project.id);
    setDraft({
      name: project.name || "",
      group: project.group || "",
      currentEnd: project.currentEnd || "",
      description: project.description || "",
      risk: project.risk || "low",
    });
    setMenuProjectId(nextOpen ? project.id : "");
    setMenuPanel("actions");
  };
  const createProject = async () => {
    setBusy("create");
    try {
      await api("/projects", { method: "POST", body: JSON.stringify({ name: quick.name || "新项目", group: quick.group || "默认分组" }) });
      setQuick({ name: "", group: "" });
      setFilter("");
      await refresh();
    } finally {
      setBusy("");
    }
  };
  const saveProject = async () => {
    if (!selected) return;
    setBusy(`save-${selected.id}`);
    try {
      await api(`/projects/${selected.id}`, { method: "PATCH", body: JSON.stringify(draft) });
      await refresh();
      setMenuPanel("actions");
    } finally {
      setBusy("");
    }
  };
  const archiveProject = async (project: any) => {
    setBusy(`archive-${project.id}`);
    try {
      await api(`/projects/${project.id}/archive`, { method: "POST" });
      await refresh();
    } finally {
      setBusy("");
    }
  };
  const restoreProject = async (project: any) => {
    setBusy(`restore-${project.id}`);
    try {
      await api(`/projects/${project.id}/restore`, { method: "POST" });
      setFilter("");
      await refresh();
    } finally {
      setBusy("");
    }
  };
  const deleteProject = async (project: any) => {
    const ok = window.confirm(`确定删除项目「${project.name}」吗？项目将从列表中移除。`);
    if (!ok) return;
    setBusy(`delete-${project.id}`);
    try {
      await api(`/projects/${project.id}`, { method: "DELETE" });
      setSelectedId("");
      await refresh();
    } finally {
      setBusy("");
    }
  };
  const subtitle = filter === "risk" ? "存在延期或阻塞的项目" : filter === "pending_acceptance" ? "等待验收的项目" : filter === "archived" ? "已归档的项目" : "进行中的项目";

  return <>
    <div className="toolbar-row project-toolbar">
      <div className="segmented">{filters.map(([key, label]) => <button key={key} className={filter === key ? "active" : ""} onClick={() => { setFilter(key); setTimeout(refresh, 50); }}>{label}</button>)}</div>
      <div className="toolbar-actions"><button className="btn primary" disabled={busy === "create"} onClick={createProject}><Icon name="plus" />创建项目</button></div>
    </div>
    <div className="project-list-grid project-management-grid">
      <section className="panel project-board project-board-managed">
        <div className="panel-head">
          <div><h2>项目列表</h2><p>{subtitle}</p></div>
          <div className="project-board-summary"><span>{projects.length} 个项目</span><span>{projects.filter((p:any)=>p.risk !== "low").length} 个风险</span></div>
        </div>
        <div className="project-cards managed-project-cards">
          {projects.map((project: any) => {
            const completed = project.completedTaskCount ?? 0;
            const total = project.taskCount || 0;
            const riskTone = project.risk === "high" ? "risk" : project.risk === "medium" ? "warn" : "";
            const statusText = project.status === "ARCHIVED" ? "已归档" : project.risk === "high" ? "高风险" : project.risk === "medium" ? "需关注" : "正常";
            const menuOpen = menuProjectId === project.id;
            return <article key={project.id} className={`project-card managed-project-card ${selected?.id === project.id ? "active" : ""} ${menuOpen ? "menu-open" : ""}`} onClick={() => setSelectedId(project.id)}>
              <div className="project-card-top">
                <span className={`tag ${project.status === "ARCHIVED" ? "" : project.risk === "high" ? "danger" : project.risk === "medium" ? "warn" : "ok"}`}>{statusText}</span>
                <button className={`icon-btn ${menuOpen ? "active" : ""}`} title="管理项目" aria-label={`管理项目 ${project.name}`} onClick={(event) => { event.stopPropagation(); openProjectMenu(project); }}><Icon name="settings" /></button>
              </div>
              {menuOpen && <div className="project-card-menu" onClick={(event) => event.stopPropagation()}>
                {menuPanel === "actions" ? <>
                  <div className="project-card-menu-head"><strong>项目管理</strong><button className="icon-btn" aria-label="关闭项目管理菜单" onClick={() => setMenuProjectId("")}><Icon name="x" /></button></div>
                  <button onClick={() => setMenuPanel("edit")}><Icon name="edit" /><span>修改项目信息</span></button>
                  <button onClick={() => { setProjectId(project.id); setView("workspace"); }}><Icon name="project" /><span>进入工作台</span></button>
                  {project.status === "ARCHIVED"
                    ? <button disabled={busy === `restore-${project.id}`} onClick={() => restoreProject(project)}><Icon name="restore" /><span>恢复项目</span></button>
                    : <button disabled={busy === `archive-${project.id}`} onClick={() => archiveProject(project)}><Icon name="archive" /><span>归档项目</span></button>}
                  <button className="danger" disabled={busy === `delete-${project.id}`} onClick={() => deleteProject(project)}><Icon name="trash" /><span>删除项目</span></button>
                </> : <>
                  <div className="project-card-menu-head"><button className="link-btn" onClick={() => setMenuPanel("actions")}>返回</button><strong>项目信息</strong><button className="icon-btn" aria-label="关闭项目信息" onClick={() => setMenuProjectId("")}><Icon name="x" /></button></div>
                  <div className="project-menu-form">
                    <label>项目名称 <input value={draft.name || ""} onChange={event => copyDraft("name", event.target.value)} /></label>
                    <label>项目分组 <input value={draft.group || ""} onChange={event => copyDraft("group", event.target.value)} /></label>
                    <label>当前截止 <input type="date" value={draft.currentEnd || ""} onChange={event => copyDraft("currentEnd", event.target.value)} /></label>
                    <label>风险等级 <select value={draft.risk || "low"} onChange={event => copyDraft("risk", event.target.value)}><option value="low">正常</option><option value="medium">需关注</option><option value="high">高风险</option></select></label>
                    <label>项目说明 <textarea rows={3} value={draft.description || ""} onChange={event => copyDraft("description", event.target.value)} placeholder="补充交付范围、客户背景或风险说明" /></label>
                    <button className="btn primary wide" disabled={busy === `save-${project.id}`} onClick={saveProject}><Icon name="save" />保存修改</button>
                  </div>
                </>}
              </div>}
              <strong>{project.name}</strong>
              <p>{project.group} · {project.memberCount || 0} 人 · 截止 {project.currentEnd}</p>
              <div className="project-card-metrics">
                <span><b>{completed}</b>/{total} 任务</span>
                <span><b>{project.progress || 0}%</b> 进度</span>
                <span>{project.acceptanceStatus || "未验收"}</span>
              </div>
              <div className="progress-section"><div className="progress-row"><span className="progress-fraction"><span className={`done-num ${completed===0&&total>0?'risk':''}`}>{completed}</span><span className="sep">/</span><span className="total-num">{total}</span><span className="label">任务完成</span></span><strong className="progress-meter-value">{project.progress}%</strong></div><div className="progress-meter-track"><div className={`progress-meter-fill ${completed===total&&total>0?'done':riskTone}`} style={{width:`${Math.min(100,Math.max(0,project.progress||0))}%`}} /></div></div>
              <div className="project-card-actions" onClick={(event) => event.stopPropagation()}>
                <button onClick={() => { setProjectId(project.id); setView("workspace"); }}>进入工作台</button>
                {project.status === "ARCHIVED" ? <button className="link-btn" disabled={busy === `restore-${project.id}`} onClick={() => restoreProject(project)}><Icon name="restore" />恢复</button> : <button className="link-btn" disabled={busy === `archive-${project.id}`} onClick={() => archiveProject(project)}><Icon name="archive" />归档</button>}
                <button className="link-btn danger" disabled={busy === `delete-${project.id}`} onClick={() => deleteProject(project)}><Icon name="trash" />删除</button>
              </div>
            </article>;
          })}
          {!projects.length && <div className="project-empty-state"><Icon name="project" /><strong>暂无项目</strong><span>创建项目后可管理成员、任务、文件和验收节点。</span></div>}
        </div>
      </section>
      <aside className="panel project-manager-panel">
        <div className="panel-head slim"><h2>项目管理</h2><span>{selected ? selected.name : "未选择"}</span></div>
        <div className="quick-create-box">
          <strong>快速创建</strong>
          <label>项目名称 <input value={quick.name} onChange={event => setQuick(prev => ({ ...prev, name: event.target.value }))} placeholder="新客户交付计划" /></label>
          <label>项目分组 <input value={quick.group} onChange={event => setQuick(prev => ({ ...prev, group: event.target.value }))} placeholder="客户交付" /></label>
          <button className="btn primary wide" disabled={busy === "create"} onClick={createProject}><Icon name="plus" />创建项目</button>
        </div>
        <div className="invite-box"><Icon name="user" /><span>项目管理支持编辑基本信息、调整风险、归档恢复和删除项目。</span></div>
      </aside>
    </div>
  </>;
}

function TaskCreateModal({ project, api, refresh, members, tasks, onClose }: any) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultAssignee = members.length > 0 ? (members[0]?.userId || "u_admin") : "u_admin";
  const [title, setTitle] = React.useState("");
  const [assignees, setAssignees] = React.useState<string[]>([defaultAssignee]);
  const [priority, setPriority] = React.useState("medium");
  const [baselineStart, setBaselineStart] = React.useState(today);
  const [baselineEnd, setBaselineEnd] = React.useState("");
  const [currentEnd, setCurrentEnd] = React.useState("");
  const [note, setNote] = React.useState("");
  const [deps, setDeps] = React.useState<string[]>([]);
  const [files, setFiles] = React.useState<File[]>([]);
  const [saving, setSaving] = React.useState(false);

  function toggleDep(taskId: string) {
    setDeps(prev => prev.includes(taskId) ? prev.filter(d => d !== taskId) : [...prev, taskId]);
  }
  function addAssignee() { setAssignees(prev => [...prev, defaultAssignee]); }
  function removeAssignee(i: number) { setAssignees(prev => prev.filter((_, idx) => idx !== i)); }
  function updateAssignee(i: number, v: string) { setAssignees(prev => prev.map((a, idx) => idx === i ? v : a)); }

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const body: any = { title, priority, note, dependencyIds: deps };
      if (baselineStart) body.baselineStart = baselineStart;
      if (baselineEnd) body.baselineEnd = baselineEnd;
      if (currentEnd) body.currentEnd = currentEnd;
      const validAssignees = assignees.filter(Boolean);
      if (validAssignees.length > 0) {
        body.assignments = validAssignees.map(uid => ({
          userId: uid,
          planStart: baselineStart || today,
          planEnd: baselineEnd || today,
          currentEnd: currentEnd || baselineEnd || today
        }));
      }
      const res = await api(`/projects/${project.id}/tasks`, { method: "POST", body: JSON.stringify(body) });
      if (files.length && res.task) {
        const form = new FormData();
        files.forEach(f => form.append("files", f));
        const response = await fetch(`/api/projects/${project.id}/files/upload`, {
          method: "POST",
          headers: { authorization: `Bearer ${localStorage.getItem("lt_token")}` },
          body: form
        });
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        if (!response.ok) throw new Error(data?.message || "文件上传失败");
      }
      onClose();
      await refresh();
    } catch (error: any) {
      alert(error.message || "创建任务失败");
    } finally {
      setSaving(false);
    }
  }

  return <div className="modal-overlay" onClick={onClose}>
    <div className="modal-card" onClick={e => e.stopPropagation()}>
      <div className="modal-head">
        <strong>创建任务</strong>
        <span>{project.group} / {project.name}</span>
      </div>
      <div className="modal-body">
        <label className="modal-field">任务名称 <span className="required">*</span>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="输入任务标题" autoFocus /></label>

        <div className="modal-row">
          <label className="modal-field">优先级
            <select value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="high">高</option><option value="medium">中</option><option value="low">低</option>
            </select></label>
          <label className="modal-field">关联文件
            <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} /></label>
        </div>

        <div className="modal-field">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>负责人</span>
            <button className="link-btn" onClick={addAssignee}><Icon name="plus" />添加</button>
          </div>
          <div className="assignee-list">
            {assignees.map((uid, i) => <div key={i} className="assignee-row">
              <select value={uid} onChange={e => updateAssignee(i, e.target.value)}>
                {members.map((m: any) => <option key={m.userId} value={m.userId}>{m.user?.name || m.userId}</option>)}
              </select>
              {assignees.length > 1 && <button className="link-btn danger" onClick={() => removeAssignee(i)}>✕</button>}
            </div>)}
          </div>
        </div>

        <div className="modal-row modal-row-3">
          <label className="modal-field">原计划开始<input type="date" value={baselineStart} onChange={e => setBaselineStart(e.target.value)} /></label>
          <label className="modal-field">原计划结束<input type="date" value={baselineEnd} onChange={e => setBaselineEnd(e.target.value)} /></label>
          <label className="modal-field">当前计划结束<input type="date" value={currentEnd} onChange={e => setCurrentEnd(e.target.value)} /></label>
        </div>

        <div className="modal-field">
          <span>依赖任务</span>
          <div className="dep-list">
            {tasks.filter((t: any) => t.status !== "DELETED").map((t: any) => <label key={t.id} className="dep-chip">
              <input type="checkbox" checked={deps.includes(t.id)} onChange={() => toggleDep(t.id)} />
              <span>{t.title}</span>
            </label>)}
            {!tasks.length && <em style={{fontSize:12,color:"var(--muted)"}}>暂无其他任务</em>}
          </div>
        </div>

        <label className="modal-field">备注
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="任务描述或注意事项" /></label>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn primary" onClick={handleCreate} disabled={saving || !title.trim()}>
          <Icon name="plus" />{saving ? "创建中..." : "创建任务"}
        </button>
      </div>
    </div>
  </div>;
}

export function Workspace({ project, tasks, api, refresh, setView, refreshStamp }: any) {
  const [wsTab, setWsTab] = React.useState("overview");
  const [timeline, setTimeline] = React.useState<any[]>([]);
  const [projectDetail, setProjectDetail] = React.useState<any>(null);
  const [showNewTask, setShowNewTask] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<any>(null);
  const timelineRef = React.useRef<HTMLDivElement>(null);
  const kanbanRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (timelineRef.current) autoAnimate(timelineRef.current, { duration: 250, easing: 'ease-out' });
    if (kanbanRef.current) autoAnimate(kanbanRef.current, { duration: 200, easing: 'ease-out' });
  }, []);
  const [dragTask, setDragTask] = React.useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = React.useState<string | null>(null);
  const colStatusMap: Record<string, string> = { "待处理": "TODO", "进行中": "DOING", "阻塞": "BLOCKED", "已完成": "DONE" };

  const clickPos = React.useRef({ x: 0, y: 0, taskId: '' });

  function handleDragStart(e: React.DragEvent, taskId: string) { e.dataTransfer.setData("text/plain", taskId); e.dataTransfer.effectAllowed = "move"; setDragTask(taskId); }
  function handleTaskDown(e: React.MouseEvent, taskId: string) { clickPos.current = { x: e.clientX, y: e.clientY, taskId }; }
  function handleTaskUp(task: any, e: React.MouseEvent) {
    const dx = Math.abs(e.clientX - clickPos.current.x);
    const dy = Math.abs(e.clientY - clickPos.current.y);
    if (dx < 5 && dy < 5 && clickPos.current.taskId === task.id) setEditingTask(task);
  }
  const dragEnterCount = React.useRef<Record<string, number>>({});
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }
  function handleDragEnter(e: React.DragEvent, col: string) { e.preventDefault(); dragEnterCount.current[col] = (dragEnterCount.current[col] || 0) + 1; setDragOverCol(col); }
  function handleDragLeave(e: React.DragEvent, col: string) { dragEnterCount.current[col] = (dragEnterCount.current[col] || 1) - 1; if (dragEnterCount.current[col] <= 0) setDragOverCol(null); }
  async function handleDrop(e: React.DragEvent, col: string) {
    e.preventDefault();
    setDragOverCol(null); setDragTask(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    const newStatus = colStatusMap[col] || "TODO";
    const task = tasks.find((t: Task) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    const oldStatus = task.status;
    task.status = newStatus;
    setTimeline(prev => [{ id: 'opt_' + Date.now(), projectId: project.id, type: 'task.status_changed', actorName: '你', message: `任务状态变更：${task.title} → ${col}`, color: 'blue', createdAt: new Date().toISOString() }, ...prev]);
    api(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) }).then(() => refresh()).catch(() => { task.status = oldStatus; refresh(); });
  }

  React.useEffect(() => {
    if (!project?.id) return;
    api(`/projects/${project.id}`).then((d: any) => { setProjectDetail(d); setTimeline(d.timeline || []); }).catch(() => {});
  }, [project?.id, refreshStamp]);

  const members = projectDetail?.members || [];
  const tl = timeline.length ? timeline : [];
  const tabs = [["overview","概览"],["tasks","任务"]];

  if (!project) return null;
  return <div className="workspace-layout"><section className="panel workspace-main"><div className="project-title"><div><span>{project.group} / {project.name}</span><h2>项目工作台</h2></div><div className="toolbar-actions"><button className="btn"><Icon name="user" />邀请</button><button className="btn" onClick={() => setView("files")}><Icon name="paperclip" />资料</button><button className="btn primary" onClick={() => setShowNewTask(true)}><Icon name="plus" />任务</button></div></div>
    <div className="tabs">{tabs.map(([key, label]) => <button key={key} className={wsTab === key ? "active" : ""} onClick={() => setWsTab(key)}>{label}</button>)}</div>

    {showNewTask && <TaskCreateModal project={project} api={api} refresh={refresh} members={members} tasks={tasks} onClose={() => setShowNewTask(false)} />}
    {editingTask && <TaskEditModal task={editingTask} project={project} api={api} refresh={refresh} members={members} tasks={tasks} onClose={() => setEditingTask(null)} />}

    <div className="workspace-content">
      {wsTab === "overview" && (() => { const stats = projectDetail?.stats || {}; const progressPercent = stats.progressPercent ?? 0; const completed = stats.completedTasks || 0; const total = stats.tasks || 0; const riskTone = project.risk === "high" ? "risk" : project.risk === "medium" ? "warn" : ""; const circumference = 2 * Math.PI * 40; const offset = circumference * (1 - progressPercent / 100); return <div style={{display:"grid",gap:12}}><div className="overview-progress-hero"><div className="hero-left"><span>项目进度总览</span><strong>{progressPercent}%</strong><p>{project.risk === "high" ? "风险项目，需要立即介入" : project.risk === "medium" ? "存在延期风险，持续关注" : total === 0 ? "暂无任务，创建第一个任务开始推进" : completed === total ? "所有任务已完成！准备验收" : "按计划推进中"}</p></div><div className="hero-right"><svg className="overview-progress-ring" viewBox="0 0 96 96"><circle className="bg" cx="48" cy="48" r="40"/><circle className={`fill ${riskTone} ${completed===total&&total>0?'done':''}`} cx="48" cy="48" r="40" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={offset}/></svg><span className="hero-right-text">{completed}<span style={{fontSize:14,color:"var(--muted)",fontWeight:400}}>/{total}</span></span></div></div><div className="overview-stats-grid"><article className="overview-stat-card accent-teal"><span>任务完成</span><strong>{completed}/{total}</strong><em>已完成 / 全部任务</em></article><article className="overview-stat-card accent-blue"><span>项目文件</span><strong>{stats.files || 0}</strong><em>文档、表格、附件</em></article><article className="overview-stat-card accent-violet"><span>验收项</span><strong>{stats.acceptance || 0}</strong><em>待验收 / 已通过</em></article><article className="overview-stat-card accent-amber"><span>项目成员</span><strong>{members.length}</strong><em>协同推进项目</em></article></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div className="progress-meter"><div className="progress-meter-track"><div className={`progress-meter-fill ${riskTone} ${completed===total&&total>0?'done':''}`} style={{width:`${Math.min(100,Math.max(0,progressPercent))}%`}} /></div></div><div className="delivery-steps"><i className="done">原计划 {project.baselineEnd}</i><i className="active">当前计划 {project.currentEnd}</i><i>实际节点</i><i>验收</i></div></div>{project.description && <p style={{margin:0,color:"var(--muted)",fontSize:13,lineHeight:1.7}}>{project.description}</p>}</div>; })()}

      {wsTab === "tasks" && <div className="task-columns drag-board" ref={kanbanRef}>{["待处理", "进行中", "阻塞", "已完成"].map(status => { const columnTasks = tasks.filter((t: Task) => mapTaskStatus(t.status) === status); return <article key={status} className={`drop-col ${dragOverCol === status ? "drag-over" : ""}`} onDragOver={handleDragOver} onDragEnter={e => handleDragEnter(e, status)} onDragLeave={e => handleDragLeave(e, status)} onDrop={e => handleDrop(e, status)}><h3>{status} <span>{columnTasks.length}</span></h3>{columnTasks.map((task: Task) => <div className={`task ${dragTask === task.id ? "dragging" : ""} ${task.status === "DONE" ? "done" : task.status === "BLOCKED" ? "danger" : ""}`} key={task.id} draggable onDragStart={e => handleDragStart(e, task.id)} onDragEnd={() => setDragTask(null)} onMouseDown={e => handleTaskDown(e, task.id)} onMouseUp={e => handleTaskUp(task, e)}>
  <div className="task-head"><strong>{task.title}</strong><b className={`task-status-dot ${task.status === "DONE" ? "ok" : task.status === "BLOCKED" ? "warn" : ""}`}>{task.status === "TODO" ? "待处理" : task.status === "DOING" ? "进行中" : task.status === "DONE" ? "已完成" : "阻塞"}</b></div>
  <div className="task-meta">
    {task.baselineStart && <span className="task-date"><Icon name="clock" />{taskDateRange(task)}</span>}
    {task.currentEnd && task.baselineEnd && task.currentEnd > task.baselineEnd && <span className="task-delay">延至 {shortDate(task.currentEnd)}</span>}
  </div>
  {(task.progressItems || []).length > 0 && <div className="task-members">{(task.progressItems || []).map((p: ProgressItem) => { const member = members.find((m: any) => m.userId === p.userId); const name = member?.user?.name || p.userId; return <span key={p.id} className="task-member-tag">{name} · {p.progress}%</span>; })}</div>}
  {task.note && <div className="task-note">{task.note}</div>}
</div>)}</article>})}</div>}

          </div></section>

    <aside className="panel timeline" ref={timelineRef}>
      <div className="panel-head slim"><h2>项目成员</h2><span style={{fontSize:11,color:"var(--muted)"}}>{members.length} 人</span></div>
      <div className="member-cards">
        {members.map((m: any) => {
          const av = m.user?.avatar || '';
          const isImg = av.startsWith('/uploads/') || av.startsWith('http');
          const userTheme = m.user?.theme || 'letter';
          return <div key={m.userId} className={`user-card-button member-card-item card-theme-${userTheme}`} style={{minHeight:72,padding:10,gap:10,gridTemplateColumns:'42px 1fr',fontSize:13}}>
            {isImg ? <span className="user-card-avatar" style={{backgroundImage:`url(${av})`,backgroundSize:'cover',width:42,height:42}} /> : <span className="user-card-avatar" style={{width:42,height:42,fontSize:18}}>{m.user?.name?.[0] || '?'}</span>}
            <span className="user-card-copy"><strong>{m.user?.name || m.userId}</strong><em>{m.user?.signature || '暂无签名'}</em></span>
          </div>;
        })}
      </div>
      <div className="panel-head slim" style={{marginTop:12}}><h2>变更时间线</h2></div>
      {tl.map((ev: any) => <article key={ev.id} className={`event ${ev.type?.includes("task") ? "task-event" : ev.type?.includes("doc") ? "doc-event" : ev.type?.includes("member") ? "member-event" : "task-event"}`}><time>{ev.createdAt ? new Date(ev.createdAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) : ""}</time><strong>{ev.message}</strong><span>{ev.actorName} · {ev.type}</span></article>)}</aside></div>;
}

export function Files({ project, files, api, refresh }: any) {
  const [activeId, setActiveId] = useState(files[0]?.id || "");
  const [busy, setBusy] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);
  const active = useMemo(() => files.find((file: FileItem) => file.id === activeId) || files[0], [files, activeId]);
  if (!project) return null;

  async function createDoc() {
    setBusy("create");
    try {
      await api(`/projects/${project.id}/files`, { method: "POST", body: JSON.stringify({ name: "新协作文档", type: "WORD_DOC", content: "# 新协作文档" }) });
      await refresh();
    } finally {
      setBusy("");
    }
  }

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const form = new FormData();
    Array.from(fileList).forEach((file) => form.append("files", file));
    setBusy("upload");
    try {
      const response = await fetch(`/api/projects/${project.id}/files/upload`, {
        method: "POST",
        headers: { authorization: `Bearer ${getApiToken()}` },
        body: form,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "上传失败");
      }
      await refresh();
    } finally {
      setBusy("");
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  async function downloadActive() {
    if (!active) return;
    setBusy("download");
    try {
      const response = await fetch(`/api/project-files/${active.id}/download`, {
        headers: { authorization: `Bearer ${getApiToken()}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "下载失败");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = active.name || "project-file";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy("");
    }
  }

  async function deleteActive() {
    if (!active) return;
    setBusy("delete");
    try {
      await api(`/project-files/${active.id}`, { method: "PATCH", body: JSON.stringify({ deleted: true }) });
      await refresh();
    } finally {
      setBusy("");
    }
  }

  return <div className="editor-shell"><aside className="doc-tree"><div className="file-tree-head"><h3>项目文件</h3><button disabled={busy === "create"} onClick={createDoc}><Icon name="plus" /></button></div><div className="file-actions"><button disabled={busy === "create"} onClick={createDoc}><Icon name="plus" /><span>新建</span></button><button disabled={busy === "upload"} onClick={() => uploadRef.current?.click()}><Icon name="import" /><span>{busy === "upload" ? "上传中" : "上传"}</span></button><button disabled={!active || busy === "download"} onClick={downloadActive}><Icon name="export" /><span>导出</span></button><input ref={uploadRef} type="file" multiple style={{display:"none"}} onChange={(event) => uploadFiles(event.target.files)} /></div>{files.map((file: FileItem) => <button key={file.id} className={`file-item ${active?.id === file.id ? "active" : ""}`} onClick={() => setActiveId(file.id)}><Icon name={file.type === "SHEET" ? "sheet" : "doc"} /><span><strong>{file.name}</strong><em>{file.type} · v{file.version}</em></span></button>)}<button className="file-item collection"><Icon name="project" /><span><strong>文件收集箱</strong><em>按成员和任务归集</em></span></button></aside><section className="editor-main"><div className="editor-title file-title"><span>{project.name} / 项目文件</span><strong>{active?.name || "暂无文件"}</strong><em>已保存最新版本 · 关联任务 · 点击左侧表格文件可直接切换编辑</em><div className="file-meta-pills"><b>{active?.type === "SHEET" ? "表格" : active?.type === "ATTACHMENT" ? "附件" : "Word"}</b><b>可编辑</b><b>版本 v{active?.version || 0}</b></div></div><div className="icon-ribbon"><button><Icon name="save" /></button><button onClick={() => uploadRef.current?.click()}><Icon name="import" /></button><button disabled={!active || busy === "download"} onClick={downloadActive}><Icon name="export" /></button><button><Icon name="comment" /></button><button><Icon name="more" /></button><span /></div><article className="paper"><h1>{active?.name || "暂无项目文件"}</h1><h2>1. 项目协作文档</h2><p>{active?.content || "团队可以在块编辑器中直接输入内容，并通过评论、修订、版本回溯和项目时间线保持协同痕迹。"}</p><blockquote>协作说明：提交物、版本、评论与验收记录均由后端保存和授权。</blockquote><pre>npm run build\nnpx prisma validate</pre><table><tbody><tr><th>模块</th><th>协作行为</th><th>导出</th></tr><tr><td>标题</td><td>生成大纲</td><td>md/html</td></tr><tr><td>代码块</td><td>评论锚点</td><td>保留语言</td></tr></tbody></table></article></section><aside className="doc-aside"><div className="panel-head slim"><h2>辅助栏</h2><button className="link-btn">折叠</button></div><div className="aside-tabs"><button className="active">大纲</button><button>评论</button><button>版本</button><button>属性</button><button>提交物</button></div><article className="file-property"><strong>{active?.name || "项目文档"}</strong><span>创建者 当前用户 · 版本 v{active?.version || 0}</span><div><button disabled={!active}>重命名</button><button className="danger" disabled={!active || busy === "delete"} onClick={deleteActive}>删除</button></div></article><ol><li className="active">项目协作文档</li><li>提交物</li><li>参考资料</li></ol><article className="submission-card"><strong>任务提交物</strong><span>提交、补交、撤回和验收均通过后端权限控制。</span><button>打开收集箱</button></article></aside></div>;
}

export function Messages({ notifications, api, refresh }: any) {
  const [appId, setAppId] = useState("cli_aaa33790a1785bee");
  const [appSecret, setAppSecret] = useState("");
  const [creatorContact, setCreatorContact] = useState("");
  const [contactType, setContactType] = useState("mobile");
  const [dailyTime, setDailyTime] = useState("18:00");
  const [dailyPreview, setDailyPreview] = useState<any>(null);
  const [testText, setTestText] = useState("LightTask 飞书机器人测试消息");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const feishuChannel = notifications?.channels?.find((item: any) => item.type === "feishu" || item.id === "nc_feishu");
  const feishuAppKey = notifications?.keys?.find((item: any) => (item.channelId === feishuChannel?.id || item.channelId === "nc_feishu") && item.type === "feishu_app");
  const feishuWebhookKey = notifications?.keys?.find((item: any) => (item.channelId === feishuChannel?.id || item.channelId === "nc_feishu") && item.type === "webhook");
  const feishuKey = feishuAppKey || feishuWebhookKey;
  const logs = notifications?.logs || [];
  const callback = notifications?.callback || {};
  const dailyRule = notifications?.rules?.find((rule: any) => rule.event === "daily.report");
  const upcomingRules = [
    ["task.near_due", "任务临期提醒", "即将到期前提醒负责人"],
    ["task.due", "任务到期提醒", "到期当天提醒处理"],
    ["task.overdue", "任务过期提醒", "逾期后持续提示风险"],
    ["project.invite", "邀请加入项目", "成员加入项目时通知"],
  ];
  const parseDailyConfig = () => {
    try { return JSON.parse(dailyRule?.targets?.[0] || "{}"); } catch { return {}; }
  };
  const dailyConfig = parseDailyConfig();

  React.useEffect(() => {
    if (feishuChannel?.config?.appId) setAppId(feishuChannel.config.appId);
    if (feishuChannel?.config?.creatorContact) setCreatorContact(feishuChannel.config.creatorContact);
    if (feishuChannel?.config?.contactType) setContactType(feishuChannel.config.contactType);
  }, [feishuChannel?.config?.appId, feishuChannel?.config?.creatorContact, feishuChannel?.config?.contactType]);

  React.useEffect(() => {
    if (dailyConfig.sendTime) setDailyTime(dailyConfig.sendTime);
    if (dailyConfig.creatorContact) setCreatorContact(dailyConfig.creatorContact);
    if (dailyConfig.contactType) setContactType(dailyConfig.contactType);
  }, [dailyRule?.id, dailyRule?.updatedAt]);

  React.useEffect(() => {
    let active = true;
    api("/admin/notification-daily-report/preview")
      .then((data: any) => { if (active) setDailyPreview(data); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [notifications?.logs?.[0]?.id]);

  async function saveFeishuApp() {
    setBusy("save");
    setNote("");
    try {
      const body = { name: "飞书应用凭据", channelId: feishuChannel?.id || "nc_feishu", channel: "feishu", type: "feishu_app", appId, secret: appSecret, creatorContact, contactType };
      if (feishuAppKey?.id) await api(`/admin/notification-keys/${feishuAppKey.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await api("/admin/notification-keys", { method: "POST", body: JSON.stringify(body) });
      setAppSecret("");
      setNote("飞书应用凭据已保存");
      await refresh();
    } catch (error: any) {
      setNote(error.message || "保存失败");
    } finally {
      setBusy("");
    }
  }

  async function sendTest() {
    setBusy("test");
    setNote("");
    try {
      await api("/admin/notification-test", { method: "POST", body: JSON.stringify({ channel: "feishu", mode: "app", message: testText, creatorContact, contactType }) });
      setNote("测试消息已发送给创建者");
      await refresh();
    } catch (error: any) {
      setNote(error.message || "验证失败");
      await refresh();
    } finally {
      setBusy("");
    }
  }

  async function saveDailyReport() {
    setBusy("daily-save");
    setNote("");
    try {
      await api("/admin/notification-daily-report", { method: "POST", body: JSON.stringify({ sendTime: dailyTime, creatorContact, contactType, enabled: true }) });
      setNote("日报推送规则已保存");
      await refresh();
    } catch (error: any) {
      setNote(error.message || "保存日报规则失败");
    } finally {
      setBusy("");
    }
  }

  async function sendDailyReport() {
    setBusy("daily-send");
    setNote("");
    try {
      const data = await api("/admin/notification-daily-report/send", { method: "POST", body: JSON.stringify({ sendTime: dailyTime, creatorContact, contactType }) });
      setDailyPreview(data);
      setNote("日报已发送给创建者");
      await refresh();
    } catch (error: any) {
      setNote(error.message || "日报发送失败");
      await refresh();
    } finally {
      setBusy("");
    }
  }

  async function bootstrapReminderRules() {
    setBusy("bootstrap");
    setNote("");
    try {
      await api("/admin/notification-reminders/bootstrap", { method: "POST", body: JSON.stringify({}) });
      setNote("任务提醒和邀请规则已启用");
      await refresh();
    } catch (error: any) {
      setNote(error.message || "启用提醒规则失败");
    } finally {
      setBusy("");
    }
  }

  async function checkCallback() {
    setBusy("callback-check");
    setNote("");
    try {
      const data = await api("/admin/notification-callback/check", { method: "POST", body: JSON.stringify({}) });
      setNote(data.ok ? "回调接口自检通过，下一步请在飞书后台填写公网 HTTPS 回调地址" : "回调接口自检失败");
      await refresh();
    } catch (error: any) {
      setNote(error.message || "回调自检失败");
    } finally {
      setBusy("");
    }
  }

  async function copyCallbackUrl() {
    const text = callback.url || `${window.location.origin.replace(/\/$/, "")}/api/feishu/card-callback`;
    await navigator.clipboard?.writeText(text);
    setNote("回调地址已复制");
  }

  const report = dailyPreview?.report || {};
  const previewText = dailyPreview?.text || "日报预览会根据当前项目、任务、进度和文件提交情况实时生成。";

  return <div className="message-grid">
    <section className="message-main">
      <div className="message-hero panel">
        <div><h2>消息推送</h2><p>统一管理飞书机器人、日报和后续任务提醒规则。</p></div>
        <button className="btn primary" onClick={saveDailyReport}><Icon name="save" />保存日报规则</button>
      </div>

      <div className="message-layout">
        <section className="panel message-channel-panel">
          <div className="panel-head slim"><div><h2>飞书通道</h2><p>{feishuAppKey ? `应用凭据 ${feishuAppKey.secretMasked}` : "配置应用凭据后可发送给创建者"}</p></div><b className={feishuKey && feishuChannel?.enabled !== false ? "ok-dot" : "warn-dot"}>{feishuKey ? "已配置" : "待配置"}</b></div>
          <div className="feishu-config compact">
            <label>App ID<input value={appId} onChange={event => setAppId(event.target.value)} placeholder="cli_xxx" /></label>
            <label>App Secret<input type="password" value={appSecret} onChange={event => setAppSecret(event.target.value)} placeholder={feishuAppKey ? "留空表示沿用已保存密钥" : "输入飞书 App Secret"} /></label>
            <label>创建者手机号或邮箱<input value={creatorContact} onChange={event => setCreatorContact(event.target.value)} placeholder="用于自动获取 open_id" /></label>
            <label>识别方式<select value={contactType} onChange={event => setContactType(event.target.value)}>
              <option value="mobile">手机号</option>
              <option value="email">邮箱</option>
            </select></label>
            <label className="span-2">测试内容<input value={testText} onChange={event => setTestText(event.target.value)} /></label>
            <div className="span-2">
              <button disabled={!appId || !appSecret || !creatorContact || busy === "save"} onClick={saveFeishuApp}>{busy === "save" ? "保存中" : "保存凭据"}</button>
              <button disabled={(!feishuAppKey && !appSecret) || !creatorContact || busy === "test"} onClick={sendTest}>{busy === "test" ? "发送中" : "发送测试"}</button>
            </div>
            {note && <em className="span-2">{note}</em>}
          </div>
        </section>

        <section className="panel daily-report-panel">
          <div className="panel-head slim"><div><h2>日报推送</h2><p>按当前任务条、进度和提交物实时生成日报。</p></div><b className={dailyRule?.enabled !== false ? "ok-dot" : "warn-dot"}>{dailyRule ? "已启用" : "未保存"}</b></div>
          <div className="daily-report-grid">
            <div className="daily-report-settings">
              <label>推送时间<input type="time" value={dailyTime} onChange={event => setDailyTime(event.target.value)} /></label>
              <label>接收人<input value={creatorContact} onChange={event => setCreatorContact(event.target.value)} placeholder="手机号或邮箱" /></label>
              <label>识别方式<select value={contactType} onChange={event => setContactType(event.target.value)}><option value="mobile">手机号</option><option value="email">邮箱</option></select></label>
              <div><button className="btn primary" disabled={!creatorContact || busy === "daily-send"} onClick={sendDailyReport}><Icon name="sync" />{busy === "daily-send" ? "发送中" : "立即发送日报"}</button><button disabled={busy === "daily-save"} onClick={saveDailyReport}>保存设置</button></div>
            </div>
            <div className="daily-report-summary">
              <article><span>今日待处理</span><strong>{report.pendingToday ?? "-"}</strong></article>
              <article><span>整体进度</span><strong>{report.overallProgress ?? "-"}%</strong></article>
              <article><span>风险项目</span><strong>{report.riskProjects ?? "-"}</strong></article>
              <article><span>待收集文件</span><strong>{report.pendingFiles ?? "-"}</strong></article>
            </div>
            <pre>{previewText}</pre>
          </div>
        </section>
      </div>

      <section className="panel callback-panel">
        <div className="panel-head slim">
          <div><h2>飞书卡片回调</h2><p>配置后，飞书卡片按钮才会回写系统数据。</p></div>
          <b className={callback.configured ? "ok-dot" : "warn-dot"}>{callback.configured ? "公网已配置" : "待配置公网地址"}</b>
        </div>
        <div className="callback-config-grid">
          <div>
            <span>回调请求地址</span>
            <strong>{callback.url || "未配置 PUBLIC_BASE_URL"}</strong>
            <em>{callback.hint || "飞书无法访问 localhost，需要公网 HTTPS 域名。"}</em>
          </div>
          <div className="callback-actions">
            <button onClick={copyCallbackUrl} disabled={!callback.url}>复制地址</button>
            <button onClick={checkCallback} disabled={busy === "callback-check"}>{busy === "callback-check" ? "检测中" : "本地自检"}</button>
          </div>
        </div>
        <div className="callback-steps">
          <span>1. 部署后配置 `PUBLIC_BASE_URL=https://你的公网域名`</span>
          <span>2. 飞书开放平台进入应用的“事件与回调 / 卡片回调”</span>
          <span>3. 填写上方回调请求地址并保存发布</span>
        </div>
      </section>

      <section className="panel notification-rule-panel">
        <div className="panel-head slim"><div><h2>推送规则</h2><p>日报、任务提醒和邀请通知共用同一套飞书通道与日志。</p></div><button className="btn" disabled={busy === "bootstrap"} onClick={bootstrapReminderRules}><Icon name="plus" />{busy === "bootstrap" ? "启用中" : "启用提醒规则"}</button></div>
        <div className="rule-cards">
          <article className="rule-card active"><span>已接入</span><strong>日报推送</strong><em>{dailyRule ? `每天 ${dailyConfig.sendTime || dailyTime} 发送给创建者` : "保存后启用"}</em></article>
          {upcomingRules.map(([event, title, desc]) => {
            const rule = notifications?.rules?.find((item: any) => item.event === event);
            return <article className={`rule-card ${rule?.enabled ? "active" : "muted"}`} key={event}><span>{rule?.enabled ? "已接入" : "待启用"}</span><strong>{title}</strong><em>{rule?.enabled ? "飞书交互卡片已启用" : desc}</em></article>;
          })}
        </div>
        <table className="clean-table compact-table"><thead><tr><th>规则</th><th>提醒对象</th><th>通道</th><th>状态</th><th>配置</th></tr></thead><tbody>{(notifications?.rules || []).map((rule: any) => <tr key={rule.id}><td>{rule.event}</td><td>{rule.targetMode}</td><td>{rule.channel}</td><td>{rule.enabled ? "启用" : "停用"}</td><td>{rule.event === "daily.report" ? `${dailyConfig.sendTime || dailyTime} 日报` : "待触发"}</td></tr>)}</tbody></table>
      </section>
    </section>
    <aside className="panel log-panel">
      <div className="panel-head slim"><h2>发送日志</h2><button className="link-btn">筛选</button></div>
      {logs.length === 0 && <p className="dashboard-empty">暂无发送日志</p>}
      {logs.map((log: any) => <article className={`log ${log.status === "success" ? "ok" : "warn"}`} key={log.id}><strong>{log.event}</strong><span>{log.message}</span><time>{log.createdAt ? new Date(log.createdAt).toLocaleString("zh-CN", { hour12: false }) : ""}</time></article>)}
    </aside>
  </div>;
}

export function Support({ admin }: any) {
  return <div className="support-grid"><section className="panel"><div className="panel-head"><div><h2>后台支撑能力</h2><p>该页仅面向管理员和技术实现，不进入普通用户主导航。</p></div><button className="btn">查看监控</button></div><div className="service-map"><article>Web Client<span>React / Vite</span></article><i /><article>Progress API<span>成员进度 / 上报 / 甘特</span></article><i /><article>Submission Hub<span>任务提交物 / 文件收集箱</span></article><i /><article>Event Center<span>时间线 / 审计 / 定向提醒</span></article></div><div className="job-list"><article><strong>成员进度快慢计算</strong><span>完成 · 12 个成员节点</span><b>100%</b></article><article><strong>任务提交物扫描</strong><span>排队中 · 2 个 docx 文件</span><b>2</b></article><article><strong>定向提醒重试队列</strong><span>等待 1 条微信公众号提醒</span><b>1</b></article></div></section><aside className="panel"><div className="panel-head slim"><h2>服务状态</h2><button className="link-btn">详情</button></div>{["PostgreSQL", "Redis / Queue", "轻量导出 Worker", "本地文件存储"].map((item, index) => <article className="status-line" key={item}><strong>{item}</strong><span>{index === 0 ? "12ms" : index === 1 ? "23ms" : index === 2 ? `${admin?.worker || 1} 个任务排队` : "18.4GB"}</span><b className={index === 2 ? "warn-dot" : "ok-dot"}>{index === 2 ? "繁忙" : "正常"}</b></article>)}</aside></div>;
}

function Metric({ label, value, hint }: { label: string; value: React.ReactNode; hint: string }) {
  return <article><span>{label}</span><strong>{value}</strong><em>{hint}</em></article>;
}
