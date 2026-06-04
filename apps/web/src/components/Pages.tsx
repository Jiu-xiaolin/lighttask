import React from "react";
import { Icon } from "../lib/icons";
import { mapTaskStatus, acceptanceText, type Project, type Task, type ProgressItem, type FileItem } from "./shared";
import autoAnimate from "@formkit/auto-animate";

export { mapTaskStatus, acceptanceText };

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
  return <><div className="toolbar-row"><div className="segmented">{filters.map(([key, label]) => <button key={key} className={filter === key ? "active" : ""} onClick={() => { setFilter(key); setTimeout(refresh, 50); }}>{label}</button>)}</div><div className="toolbar-actions"><button className="btn primary" onClick={async () => { await api("/projects", { method: "POST", body: JSON.stringify({ name: "新项目", group: "默认分组" }) }); setFilter(""); await refresh(); }}><Icon name="plus" />创建项目</button></div></div><div className="project-list-grid"><section className="panel project-board"><div className="panel-head"><div><h2>项目列表</h2><p>{filter === "risk" ? "存在延期或阻塞的项目" : filter === "pending_acceptance" ? "等待验收的项目" : filter === "archived" ? "已归档的项目" : "进行中的项目"}</p></div><span style={{fontSize:12,color:"var(--muted)"}}>{projects.length} 个项目</span></div><div className="project-cards">{projects.map((project: any) => <article key={project.id} className="project-card"><span className={`tag ${project.risk === "high" ? "danger" : project.risk === "medium" ? "warn" : "ok"}`}>{project.status === "ARCHIVED" ? "已归档" : project.risk === "high" ? "高风险" : project.risk === "medium" ? "需关注" : "正常"}</span><strong>{project.name}</strong><p>{project.group} · {project.memberCount || 0} 人 · {project.taskCount || 0} 个任务</p><div className="project-flags"><em>{project.progress}%</em><em>截止 {project.currentEnd}</em></div><progress value={project.progress} max="100" /><div><button onClick={() => { setProjectId(project.id); setView("workspace"); }}>进入工作台</button>{project.status !== "ARCHIVED" && <button className="link-btn" onClick={async () => { await api(`/projects/${project.id}/archive`, { method: "POST" }); await refresh(); }}>归档</button>}</div></article>)}</div></section><aside className="panel create-panel"><div className="panel-head slim"><h2>快速创建</h2></div><label>项目名称 <input id="quick-project-name" placeholder="新客户交付计划" /></label><label>项目分组 <input id="quick-project-group" placeholder="客户交付" /></label><button className="btn primary wide" onClick={async () => { const name = (document.querySelector("#quick-project-name") as HTMLInputElement)?.value || "新项目"; const group = (document.querySelector("#quick-project-group") as HTMLInputElement)?.value || "默认分组"; await api("/projects", { method: "POST", body: JSON.stringify({ name, group }) }); await refresh(); }}><Icon name="plus" />创建项目</button><div className="invite-box"><Icon name="user" /><span>创建后可邀请成员，自动生成成员进度和文件收集箱。</span></div></aside></div></>;
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
    // Create task
    const res = await api(`/projects/${project.id}/tasks`, { method: "POST", body: JSON.stringify(body) });
    // Upload files if any
    if (files.length && res.task) {
      const form = new FormData();
      files.forEach(f => form.append('files', f));
      await fetch(`/api/projects/${project.id}/files`, {
        method: "POST",
        headers: { authorization: `Bearer ${localStorage.getItem("lt_token")}` },
        body: form
      }).catch(() => {});
    }
    setSaving(false); onClose();
    await refresh();
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

function TaskEditModal({ task, project, api, refresh, members, tasks, onClose }: any) {
  const [title, setTitle] = React.useState(task.title || "");
  const [priority, setPriority] = React.useState(task.priority || "medium");
  const [baselineStart, setBaselineStart] = React.useState(task.baselineStart || "");
  const [baselineEnd, setBaselineEnd] = React.useState(task.baselineEnd || "");
  const [currentEnd, setCurrentEnd] = React.useState(task.currentEnd || "");
  const [note, setNote] = React.useState(task.note || "");
  const [deps, setDeps] = React.useState<string[]>(task.dependencyIds || []);
  const [saving, setSaving] = React.useState(false);

  function toggleDep(taskId: string) {
    setDeps(prev => prev.includes(taskId) ? prev.filter(d => d !== taskId) : [...prev, taskId]);
  }

  async function handleSave() {
    setSaving(true);
    const body: any = { title, priority, note, dependencyIds: deps };
    if (baselineStart) body.baselineStart = baselineStart;
    if (baselineEnd) body.baselineEnd = baselineEnd;
    if (currentEnd) body.currentEnd = currentEnd;
    await api(`/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify(body) });
    setSaving(false); onClose();
    await refresh();
  }

  async function handleDelete() {
    if (!confirm("确定删除此任务？")) return;
    await api(`/tasks/${task.id}`, { method: "DELETE" });
    onClose();
    await refresh();
  }

  return <div className="modal-overlay" onClick={onClose}>
    <div className="modal-card" onClick={e => e.stopPropagation()}>
      <div className="modal-head">
        <strong>编辑任务</strong>
        <span>{project.group} / {project.name}</span>
      </div>
      <div className="modal-body">
        <label className="modal-field">任务名称
          <input value={title} onChange={e => setTitle(e.target.value)} /></label>
        <div className="modal-row">
          <label className="modal-field">优先级
            <select value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="high">高</option><option value="medium">中</option><option value="low">低</option>
            </select></label>
          <label className="modal-field">状态
            <select value={task.status} onChange={async e => { await api(`/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status: e.target.value }) }); await refresh(); }}>
              <option value="TODO">待处理</option><option value="DOING">进行中</option><option value="DONE">已完成</option><option value="BLOCKED">阻塞</option>
            </select></label>
        </div>
        <div className="modal-row modal-row-3">
          <label className="modal-field">原计划开始<input type="date" value={baselineStart} onChange={e => setBaselineStart(e.target.value)} /></label>
          <label className="modal-field">原计划结束<input type="date" value={baselineEnd} onChange={e => setBaselineEnd(e.target.value)} /></label>
          <label className="modal-field">当前计划结束<input type="date" value={currentEnd} onChange={e => setCurrentEnd(e.target.value)} /></label>
        </div>
        <div className="modal-field">
          <span>依赖任务</span>
          <div className="dep-list">
            {tasks.filter((t: any) => t.id !== task.id && t.status !== "DELETED").map((t: any) => <label key={t.id} className="dep-chip">
              <input type="checkbox" checked={deps.includes(t.id)} onChange={() => toggleDep(t.id)} />
              <span>{t.title}</span>
            </label>)}
          </div>
        </div>
        <label className="modal-field">备注
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} /></label>
      </div>
      <div className="modal-foot" style={{justifyContent:"space-between"}}>
        <button className="btn danger" onClick={handleDelete}>删除任务</button>
        <div style={{display:"flex",gap:8}}>
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn primary" onClick={handleSave} disabled={saving || !title.trim()}>
            <Icon name="save" />{saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  </div>;
}

export function Workspace({ project, tasks, api, refresh, setView }: any) {
  const [wsTab, setWsTab] = React.useState("overview");
  const [timeline, setTimeline] = React.useState<any[]>([]);
  const [projectDetail, setProjectDetail] = React.useState<any>(null);
  const [fileCollection, setFileCollection] = React.useState<any>(null);
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
  const droppingRef = React.useRef(false);

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
    setDragOverCol(null);
    setDragTask(null);
    if (droppingRef.current) return;
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    const newStatus = colStatusMap[col] || "TODO";
    const task = tasks.find((t: Task) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    droppingRef.current = true;
    const oldStatus = task.status;
    task.status = newStatus;
    // Optimistic timeline entry
    setTimeline(prev => [{ id: 'opt_' + Date.now(), projectId: project.id, type: 'task.status_changed', actorName: '你', message: `任务状态变更：${task.title} → ${col}`, color: 'blue', createdAt: new Date().toISOString() }, ...prev]);
    try { await api(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) }); await refresh(); }
    catch { task.status = oldStatus; await refresh(); }
    finally { droppingRef.current = false; }
  }

  React.useEffect(() => {
    if (!project?.id) return;
    api(`/projects/${project.id}`).then((d: any) => { setProjectDetail(d); setTimeline(d.timeline || []); }).catch(() => {});
    api(`/projects/${project.id}/file-collection`).then((d: any) => setFileCollection(d)).catch(() => {});
  }, [project?.id]);

  const members = projectDetail?.members || [];
  const tl = timeline.length ? timeline : [];
  const tabs = [["overview","概览"],["tasks","任务"],["progress","成员进度"],["submissions","提交物"],["files","资料"],["acceptance","验收"]];

  if (!project) return null;
  return <div className="workspace-layout"><section className="panel workspace-main"><div className="project-title"><div><span>{project.group} / {project.name}</span><h2>项目工作台</h2></div><div className="toolbar-actions"><button className="btn"><Icon name="user" />邀请</button><button className="btn" onClick={() => setView("files")}><Icon name="paperclip" />资料</button><button className="btn primary" onClick={() => setShowNewTask(true)}><Icon name="plus" />任务</button></div></div>
    <div className="tabs">{tabs.map(([key, label]) => <button key={key} className={wsTab === key ? "active" : ""} onClick={() => setWsTab(key)}>{label}</button>)}</div>

    {showNewTask && <TaskCreateModal project={project} api={api} refresh={refresh} members={members} tasks={tasks} onClose={() => setShowNewTask(false)} />}
    {editingTask && <TaskEditModal task={editingTask} project={project} api={api} refresh={refresh} members={members} tasks={tasks} onClose={() => setEditingTask(null)} />}

    <div className="workspace-content">
      {wsTab === "overview" && <div className="focus-card"><span>项目概览</span><strong>{project.risk === "medium" || project.risk === "high" ? "存在延期或阻塞风险" : "项目进展正常"}</strong><p>{project.description || ""}</p><div className="delivery-steps"><i className="done">原计划 {project.baselineEnd}</i><i className="active">当前计划 {project.currentEnd}</i><i>实际节点</i><i>验收</i></div><div className="acceptance-mini"><strong>项目统计</strong><em>任务 {projectDetail?.stats?.tasks || 0} · 文件 {projectDetail?.stats?.files || 0} · 验收项 {projectDetail?.stats?.acceptance || 0} · 成员 {members.length}</em></div></div>}

      {wsTab === "tasks" && <div className="task-columns drag-board" ref={kanbanRef}>{["待处理", "进行中", "阻塞", "已完成"].map(status => { const columnTasks = tasks.filter((t: Task) => mapTaskStatus(t.status) === status); return <article key={status} className={`drop-col ${dragOverCol === status ? "drag-over" : ""}`} onDragOver={handleDragOver} onDragEnter={e => handleDragEnter(e, status)} onDragLeave={e => handleDragLeave(e, status)} onDrop={e => handleDrop(e, status)}><h3>{status} <span>{columnTasks.length}</span></h3>{columnTasks.map((task: Task) => <div className={`task ${dragTask === task.id ? "dragging" : ""} ${task.status === "DONE" ? "done" : task.status === "BLOCKED" ? "danger" : ""}`} key={task.id} draggable onDragStart={e => handleDragStart(e, task.id)} onDragEnd={() => setDragTask(null)} onMouseDown={e => handleTaskDown(e, task.id)} onMouseUp={e => handleTaskUp(task, e)}>
  <div className="task-head"><strong>{task.title}</strong></div>
  <div className="task-meta">
    {task.baselineStart && <span className="task-date">{task.baselineStart}{task.baselineEnd !== task.baselineStart ? ` → ${task.baselineEnd}` : ''}</span>}
    <b className={`task-status-dot ${task.status === "DONE" ? "ok" : task.status === "BLOCKED" ? "warn" : ""}`}>{task.status === "TODO" ? "待处理" : task.status === "DOING" ? "进行中" : task.status === "DONE" ? "已完成" : "阻塞"}</b>
  </div>
  {(task.progressItems || []).length > 0 && <div className="task-members">{(task.progressItems || []).map((p: ProgressItem) => <span key={p.id} className="task-member-tag">{p.userId === "u_admin" ? "林" : p.userId === "u_member" ? "树" : "?"} · {p.progress}%</span>)}</div>}
  {task.note && <div className="task-note">{task.note}</div>}
</div>)}</article>})}</div>}

      {wsTab === "progress" && <div className="progress-list">
        {tasks.flatMap((t: Task) => (t.progressItems || []).map((p: ProgressItem) => ({ ...p, taskTitle: t.title }))).map((item: any) => {
          const member = members.find((m: any) => m.userId === item.userId);
          const deltaLabel = item.deltaDays ? (item.deltaDays > 0 ? `+${item.deltaDays}天` : `${item.deltaDays}天`) : "—";
          return <article key={item.id} className={item.status === "DELAYED" || item.status === "BLOCKED" ? "warn" : ""}>
            <div className="progress-member"><strong>{member?.user?.name || item.userId}</strong><em>{item.taskTitle}</em></div>
            <div className="progress-detail"><span>{item.planEnd} → {item.currentEnd}</span><b className={item.deltaDays && item.deltaDays > 0 ? "slow" : "fast"}>{deltaLabel}</b><em>{item.status} · {item.progress}%</em></div>
          </article>;
        })}
      </div>}

      {wsTab === "submissions" && <div>
        {fileCollection ? <div>{fileCollection.collection?.map((member: any) => <article key={member.userId} className="submission-card"><strong>{member.userName}</strong><span>已交 {member.submitted}/{member.count} · {member.items?.map((i: any) => i.name).join(', ')}</span></article>)}</div> : <p style={{color:"var(--muted)"}}>暂无提交物数据</p>}
      </div>}

      {wsTab === "files" && <div><p style={{color:"var(--muted)"}}>项目文件请点击顶部"资料"按钮查看完整文件管理界面。</p></div>}

      {wsTab === "acceptance" && <div className="acceptance-report compact-deferred"><div className="block-head"><strong>验收统计</strong></div><div className="acceptance-metrics"><article><span>项目状态</span><strong>{project.acceptanceStatus === "approved" ? "已通过" : project.acceptanceStatus === "in_review" ? "验收中" : "待验收"}</strong><em>{acceptanceText(project)}</em></article></div><div><button className="btn primary" onClick={async () => { await api(`/projects/${project.id}/acceptance/start`, { method: "POST" }); await refresh(); }}>发起验收</button></div></div>}
    </div></section>

    <aside className="panel timeline" ref={timelineRef}><div className="panel-head slim"><h2>变更时间线</h2></div>{tl.map((ev: any) => <article key={ev.id} className={`event ${ev.type?.includes("task") ? "task-event" : ev.type?.includes("doc") ? "doc-event" : ev.type?.includes("member") ? "member-event" : "task-event"}`}><time>{ev.createdAt ? new Date(ev.createdAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) : ""}</time><strong>{ev.message}</strong><span>{ev.actorName} · {ev.type}</span></article>)}</aside></div>;
}

export function Files({ project, files, api, refresh }: any) {
  if (!project) return null;
  const active = files[0];
  return <div className="editor-shell"><aside className="doc-tree"><div className="file-tree-head"><h3>项目文件</h3><button onClick={async () => { await api(`/projects/${project.id}/files`, { method: "POST", body: JSON.stringify({ name: "新协作文档", content: "# 新协作文档" }) }); await refresh(); }}><Icon name="plus" /></button></div><div className="file-actions"><button><Icon name="plus" /><span>新建</span></button><button><Icon name="import" /><span>上传</span></button><button><Icon name="export" /><span>导出</span></button></div>{files.map((file: FileItem, index: number) => <button key={file.id} className={`file-item ${index === 0 ? "active" : ""}`}><Icon name={file.type === "SHEET" ? "sheet" : "doc"} /><span><strong>{file.name}</strong><em>{file.type} · v{file.version}</em></span></button>)}<button className="file-item collection"><Icon name="project" /><span><strong>文件收集箱</strong><em>按成员和任务归集</em></span></button></aside><section className="editor-main"><div className="editor-title file-title"><span>{project.name} / 项目文件</span><strong>{active?.name || "Webpack利用.docx"}</strong><em>已保存最新版本 · 关联任务 · 点击左侧表格文件可直接切换编辑</em><div className="file-meta-pills"><b>Word</b><b>可编辑</b><b>版本 v{active?.version || 18}</b></div></div><div className="icon-ribbon">{["save", "import", "export", "comment", "more"].map(icon => <button key={icon}><Icon name={icon as any} /></button>)}<span /></div><article className="paper"><h1>{active?.name || "Webpack利用"}</h1><h2>1. 项目协作文档</h2><p>{active?.content || "团队可以在块编辑器中直接输入内容，并通过评论、修订、版本回溯和项目时间线保持协同痕迹。"}</p><blockquote>协作说明：提交物、版本、评论与验收记录均由后端保存和授权。</blockquote><pre>npm run build\nnpx prisma validate</pre><table><tbody><tr><th>模块</th><th>协作行为</th><th>导出</th></tr><tr><td>标题</td><td>生成大纲</td><td>md/html</td></tr><tr><td>代码块</td><td>评论锚点</td><td>保留语言</td></tr></tbody></table></article></section><aside className="doc-aside"><div className="panel-head slim"><h2>辅助栏</h2><button className="link-btn">折叠</button></div><div className="aside-tabs"><button className="active">大纲</button><button>评论</button><button>版本</button><button>属性</button><button>提交物</button></div><article className="file-property"><strong>{active?.name || "项目文档"}</strong><span>创建者 林初 · 最后保存 12:30</span><div><button>重命名</button><button className="danger">删除</button></div></article><ol><li className="active">项目协作文档</li><li>提交物</li><li>参考资料</li></ol><article className="submission-card"><strong>任务提交物</strong><span>提交、补交、撤回和验收均通过后端权限控制。</span><button>打开收集箱</button></article></aside></div>;
}

export function Messages({ notifications, api, refresh }: any) {
  return <div className="message-grid"><section className="panel"><div className="panel-head"><div><h2>消息同步</h2><p>任务下发、成员完成/延期、文件提交和项目完成可定向提醒指定成员。</p></div><button className="btn primary" onClick={async () => { await api("/admin/notification-rules", { method: "POST", body: JSON.stringify({ event: "task.progress_remind", channel: "feishu" }) }); await refresh(); }}><Icon name="plus" />新建规则</button></div><div className="channel-row"><article><Icon name="sync" /><strong>飞书机器人</strong><span>已启用 · 支持指定成员</span><b className="ok-dot">正常</b></article><article><Icon name="sync" /><strong>微信公众号</strong><span>项目完成通知</span><b className="warn-dot">需关注</b></article></div><div className="collapsed-rule-editor"><strong>定向提醒已收起</strong><span>编辑规则时展开：全部成员、负责人、创建者、自定义成员、不提醒。</span><button>编辑当前规则</button></div><table className="clean-table"><thead><tr><th>规则</th><th>提醒对象</th><th>触发</th><th>状态</th><th>最后发送</th></tr></thead><tbody>{(notifications?.rules || []).map((rule: any) => <tr key={rule.id}><td>{rule.event}</td><td>{rule.targetMode}</td><td>{rule.channel}</td><td>{rule.enabled ? "启用" : "停用"}</td><td>待触发</td></tr>)}</tbody></table></section><aside className="panel log-panel"><div className="panel-head slim"><h2>发送日志</h2><button className="link-btn">筛选</button></div>{(notifications?.logs || []).map((log: any) => <article className="log ok" key={log.id}>{log.event}：{log.message}</article>)}<article className="log warn">微信失败：张宁未关注公众号</article></aside></div>;
}

export function Support({ admin }: any) {
  return <div className="support-grid"><section className="panel"><div className="panel-head"><div><h2>后台支撑能力</h2><p>该页仅面向管理员和技术实现，不进入普通用户主导航。</p></div><button className="btn">查看监控</button></div><div className="service-map"><article>Web Client<span>React / Vite</span></article><i /><article>Progress API<span>成员进度 / 上报 / 甘特</span></article><i /><article>Submission Hub<span>任务提交物 / 文件收集箱</span></article><i /><article>Event Center<span>时间线 / 审计 / 定向提醒</span></article></div><div className="job-list"><article><strong>成员进度快慢计算</strong><span>完成 · 12 个成员节点</span><b>100%</b></article><article><strong>任务提交物扫描</strong><span>排队中 · 2 个 docx 文件</span><b>2</b></article><article><strong>定向提醒重试队列</strong><span>等待 1 条微信公众号提醒</span><b>1</b></article></div></section><aside className="panel"><div className="panel-head slim"><h2>服务状态</h2><button className="link-btn">详情</button></div>{["PostgreSQL", "Redis / Queue", "轻量导出 Worker", "本地文件存储"].map((item, index) => <article className="status-line" key={item}><strong>{item}</strong><span>{index === 0 ? "12ms" : index === 1 ? "23ms" : index === 2 ? `${admin?.worker || 1} 个任务排队` : "18.4GB"}</span><b className={index === 2 ? "warn-dot" : "ok-dot"}>{index === 2 ? "繁忙" : "正常"}</b></article>)}</aside></div>;
}

function Metric({ label, value, hint }: { label: string; value: React.ReactNode; hint: string }) {
  return <article><span>{label}</span><strong>{value}</strong><em>{hint}</em></article>;
}
