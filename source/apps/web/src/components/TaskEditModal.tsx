import React from "react";
import { Icon } from "../lib/icons";

export function TaskEditModal({ task, project, api, refresh, members, tasks, onClose }: any) {
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
        <span>{project?.group ? `${project.group} / ${project.name}` : ""}</span>
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
