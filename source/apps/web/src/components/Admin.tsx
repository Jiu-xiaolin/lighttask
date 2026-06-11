import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../lib/icons";

function Metric({ label, value, hint }: { label: string; value: React.ReactNode; hint: string }) {
  return <article><span>{label}</span><strong>{value}</strong><em>{hint}</em></article>;
}

function UserManager({ users, api, reloadAdmin }: any) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [userProjects, setUserProjects] = useState<Record<string, any[]>>({});
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [msg, setMsg] = useState("");

  async function loadProjects(userId: string) {
    try {
      const data = await api(`/admin/users/${userId}/projects`);
      setUserProjects(prev => ({ ...prev, [userId]: data.projects || [] }));
      if (!allProjects.length) setAllProjects(data.allProjects || []);
    } catch {}
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      await api(`/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role: newRole }) });
      setEditingRole(null); setMsg("角色已更新"); setTimeout(() => setMsg(""), 2000);
      await reloadAdmin();
    } catch (e: any) { setMsg(e.message || "操作失败"); setTimeout(() => setMsg(""), 3000); }
  }

  async function handleToggleUser(userId: string, enabled: boolean) {
    await api(`/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify({ enabled: !enabled }) });
    await reloadAdmin();
  }

  async function handleAssignProject(userId: string, projectId: string, role: string) {
    await api(`/admin/users/${userId}/projects`, { method: "POST", body: JSON.stringify({ projectId, role }) });
    await loadProjects(userId);
  }

  async function handleRemoveProject(userId: string, projectId: string) {
    await api(`/admin/users/${userId}/projects/${projectId}`, { method: "DELETE" });
    await loadProjects(userId);
  }

  async function handleResetPassword(userId: string) {
    const pwd = prompt("输入新密码（至少6位）：");
    if (!pwd || pwd.length < 6) return;
    await api(`/admin/users/${userId}/reset-password`, { method: "POST", body: JSON.stringify({ password: pwd }) });
    setMsg("密码已重置"); setTimeout(() => setMsg(""), 2000);
  }

  async function handleCreateUser() {
    if (!form.name || !form.username || !form.password) return;
    try {
      await api("/admin/users", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", username: "", password: "" }); setShowCreate(false);
      setMsg("用户已创建"); setTimeout(() => setMsg(""), 2000);
      await reloadAdmin();
    } catch (e: any) { setMsg(e.message || "创建失败"); setTimeout(() => setMsg(""), 3000); }
  }

  function toggleExpand(userId: string) {
    if (expandedUser === userId) { setExpandedUser(null); return; }
    setExpandedUser(userId);
    if (!userProjects[userId]) loadProjects(userId);
  }

  const superAdmins = users.filter((u: any) => u.role === "SUPER_ADMIN" && u.enabled);
  const isOnlyAdmin = superAdmins.length <= 1;

  return <div>
    {msg && <div className="risk-strip" style={msg.includes("失败")||msg.includes("只能")||msg.includes("至少") ? {background:"var(--rose-soft)",borderColor:"rgba(211,79,99,.25)"} : {background:"var(--green-soft)",borderColor:"rgba(26,157,139,.25)"}}><strong>{msg}</strong><button onClick={() => setMsg("")}>关闭</button></div>}
    <div className="admin-split">
      <section className="admin-block">
        <div className="block-head">
          <strong>用户管理</strong>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:12,color:"var(--muted)"}}>{users.filter((u:any)=>u.enabled).length}/{users.length} 启用</span>
            <button className="btn primary" onClick={() => setShowCreate(!showCreate)}><Icon name="plus" />新建用户</button>
          </div>
        </div>
        {showCreate && <div className="create-user-panel">
          <div className="create-fields">
            <label>姓名<input value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="林栖" /></label>
            <label>账号<input value={form.username} onChange={e => setForm({...form,username:e.target.value})} placeholder="linxi" /></label>
            <label>密码<input type="password" value={form.password} onChange={e => setForm({...form,password:e.target.value})} placeholder="至少6位" /></label>
          </div>
          <div className="create-actions"><button className="btn" onClick={() => setShowCreate(false)}>取消</button><button className="btn primary" onClick={handleCreateUser}>创建用户</button></div>
        </div>}
        <div className="user-card-grid">
          {users.map((u: any) => {
            const expanded = expandedUser === u.id;
            const projects = userProjects[u.id] || [];
            const isSuperAdmin = u.role === "SUPER_ADMIN";
            return <article key={u.id} className={`user-card ${expanded ? "expanded" : ""} ${!u.enabled ? "disabled" : ""}`}>
              <div className="user-card-main" onClick={() => toggleExpand(u.id)}>
                <span className="avatar medium">{u.avatar || u.name[0]}</span>
                <div className="user-card-info">
                  <div className="user-card-name">
                    <strong>{u.name}</strong>
                    {isSuperAdmin && <span className="tag admin-tag">唯一管理员</span>}
                    <span className={`role-badge ${u.role === "SUPER_ADMIN" ? "role-admin" : "role-member"}`}>{u.role === "SUPER_ADMIN" ? "超级管理员" : "项目成员"}</span>
                  </div>
                  <div className="user-card-meta">
                    <em>@{u.username}</em><b className={u.enabled ? "ok-dot" : "warn-dot"}>{u.enabled ? "已启用" : "已停用"}</b><span>{projects.length} 个项目</span>
                  </div>
                </div>
                <div className="user-card-actions" onClick={e => e.stopPropagation()}>
                  <button className="link-btn" onClick={() => handleToggleUser(u.id, u.enabled)}>{u.enabled ? "停用" : "启用"}</button>
                  <Icon name="chevron-down" />
                </div>
              </div>
              {expanded && <div className="user-card-detail">
                <div className="detail-row">
                  <strong>系统角色</strong>
                  {editingRole === u.id ? <div className="role-edit">
                    <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}>
                      <option value="SUPER_ADMIN">超级管理员</option><option value="MEMBER">项目成员</option>
                    </select>
                    <button className="link-btn" onClick={() => setEditingRole(null)}>取消</button>
                  </div> : <div className="role-display">
                    <span className={`role-badge ${u.role === "SUPER_ADMIN" ? "role-admin" : "role-member"}`}>{u.role === "SUPER_ADMIN" ? "超级管理员" : "项目成员"}</span>
                    <button className="link-btn" onClick={() => setEditingRole(u.id)}>变更</button>
                    {isSuperAdmin && isOnlyAdmin && <em className="hint-warn">唯一管理员，不可降级</em>}
                  </div>}
                </div>
                <div className="detail-row">
                  <strong>项目分配</strong>
                  <div className="project-chips">
                    {projects.map((p: any) => <span key={p.projectId} className="project-chip">
                      <span className="chip-name">{p.group} / {p.projectName}</span><em>{p.role}</em>
                      <button onClick={() => handleRemoveProject(u.id, p.projectId)} title="移除"><Icon name="x" /></button>
                    </span>)}
                    {allProjects.filter((ap: any) => !projects.find((p: any) => p.projectId === ap.id)).length > 0 && <div className="project-add">
                      <select defaultValue="" onChange={e => { if(e.target.value) { handleAssignProject(u.id, e.target.value, "editor"); e.target.value = ""; } }}>
                        <option value="" disabled>+ 添加项目</option>
                        {allProjects.filter((ap: any) => !projects.find((p: any) => p.projectId === ap.id)).map((ap: any) => <option key={ap.id} value={ap.id}>{ap.group} / {ap.name}</option>)}
                      </select>
                    </div>}
                    {projects.length === 0 && <span className="hint-dim">未分配任何项目</span>}
                  </div>
                </div>
                <div className="detail-row danger-zone">
                  <button className="btn" onClick={() => handleResetPassword(u.id)}>重置密码</button>
                  {!isSuperAdmin && <button className="btn danger" onClick={async () => { await api(`/admin/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ enabled: false }) }); await reloadAdmin(); }}>停用用户</button>}
                </div>
              </div>}
            </article>;
          })}
        </div>
      </section>
    </div>
  </div>;
}

function PermissionManager({ roles, scopes, api, reloadAdmin }: any) {
  const [editingRole, setEditingRole] = useState<any>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [showNewRole, setShowNewRole] = useState(false);
  const [activeScope, setActiveScope] = useState<string | null>(null);

  function scopeIcon(key: string) {
    if (key === "progress.visible") return "dashboard"; if (key === "submission.accept") return "shield";
    if (key === "file.download") return "export"; return "doc";
  }
  function rolesWithScope(scopeKey: string) { return roles.filter((r: any) => (r.permissions || []).includes(scopeKey)); }

  function startEdit(role: any) { setEditingRole(role); setEditPerms([...(role.permissions || [])]); setSaved(false); }
  function cancelEdit() { setEditingRole(null); setEditPerms([]); setSaved(false); }

  async function saveEdit() {
    if (!editingRole) return;
    await api(`/admin/role-templates/${editingRole.id}`, { method: "PATCH", body: JSON.stringify({ permissions: editPerms }) });
    editingRole.permissions = editPerms; setSaved(true);
    setTimeout(() => { setSaved(false); setEditingRole(null); }, 800);
  }

  async function handleCopyRole(roleId: string) { await api(`/admin/role-templates/${roleId}/copy`, { method: "POST", body: "{}" }); await reloadAdmin(); }
  async function handleDeleteRole(roleId: string) { await api(`/admin/role-templates/${roleId}`, { method: "DELETE" }); await reloadAdmin(); }

  async function handleCreateRole() {
    if (!newRoleName.trim()) return;
    await api("/admin/role-templates", { method: "POST", body: JSON.stringify({ name: newRoleName, role: "custom", permissions: [] }) });
    setNewRoleName(""); setShowNewRole(false); await reloadAdmin();
  }

  return <div className="admin-split">
    <section className="admin-block">
      <div className="block-head"><strong>权限范围</strong><span>4 项核心权限，点击查看角色分配</span></div>
      <div className="permission-scope-grid">
        {scopes.map((scope: any) => {
          const granted = rolesWithScope(scope.key);
          return <article key={scope.id} className={activeScope === scope.key ? "active" : ""} onClick={() => setActiveScope(activeScope === scope.key ? null : scope.key)}>
            <Icon name={scopeIcon(scope.key) as any} /><strong>{scope.name}</strong><span>{scope.description || "后端强制授权"}</span>
            <div className="scope-roles"><b>{granted.length}/{roles.length} 角色持有</b><em>{granted.map((r: any) => r.name).slice(0, 3).join("、")}{granted.length > 3 ? ` +${granted.length - 3}` : ""}</em></div>
          </article>;
        })}
      </div>
      {activeScope && <div className="scope-detail">
        <div className="block-head"><strong>{scopes.find((s: any) => s.key === activeScope)?.name} — 角色分配</strong><button className="link-btn" onClick={() => setActiveScope(null)}>收起</button></div>
        <div className="scope-role-list">
          {roles.map((role: any) => {
            const has = (role.permissions || []).includes(activeScope);
            return <button key={role.id} className={`scope-role-chip ${has ? "granted" : "denied"}`}
              onClick={async () => {
                const newPerms = has ? (role.permissions || []).filter((k: string) => k !== activeScope) : [...(role.permissions || []), activeScope];
                await api(`/admin/role-templates/${role.id}`, { method: "PATCH", body: JSON.stringify({ permissions: newPerms }) });
                await reloadAdmin();
              }}>{role.name}<b>{has ? "✓" : "✗"}</b></button>;
          })}
        </div>
      </div>}
    </section>
    <section className="admin-block">
      <div className="block-head"><strong>角色模板</strong><div><button className="btn" onClick={() => setShowNewRole(!showNewRole)}><Icon name="plus" />新建角色</button></div></div>
      {showNewRole && <div className="invite-box" style={{marginBottom:12}}>
        <input placeholder="角色名称" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} style={{flex:1}} />
        <button className="btn primary" onClick={handleCreateRole}>创建</button><button className="btn" onClick={() => setShowNewRole(false)}>取消</button>
      </div>}
      <div className="role-list">
        {roles.map((role: any) => {
          const isEditing = editingRole?.id === role.id;
          const perms = isEditing ? editPerms : (role.permissions || []);
          return <article key={role.id} className={`${isEditing ? "editing" : ""} ${editingRole && !isEditing ? "dimmed" : ""}`}
            onClick={() => !isEditing && startEdit(role)}>
            <div className="role-main">
              <div className="role-info">
                <strong>{role.name}</strong>
                {role.builtin && <span className="tag ok">内置</span>}
              </div>
              <div className="role-actions" onClick={e => e.stopPropagation()}>
                <button className="link-btn" onClick={() => handleCopyRole(role.id)}>复制</button>
                {!role.builtin && <button className="link-btn danger" onClick={() => handleDeleteRole(role.id)}>删除</button>}
              </div>
            </div>
            {isEditing && <div className="role-editor">
              <div className="perm-toggle-grid">
                {scopes.map((scope: any) => <button key={scope.key} className={`perm-toggle ${editPerms.includes(scope.key) ? "on" : "off"}`}
                  onClick={e => { e.stopPropagation(); setEditPerms(prev => prev.includes(scope.key) ? prev.filter(k => k !== scope.key) : [...prev, scope.key]); setSaved(false); }}>
                  <Icon name={scopeIcon(scope.key) as any} /><div><strong>{scope.name}</strong><span>{scope.description}</span></div><b>{editPerms.includes(scope.key) ? "✓" : ""}</b>
                </button>)}
              </div>
              <div className="editor-actions">
                {saved && <span className="saved-flash">已保存</span>}
                <button className="btn" onClick={e => { e.stopPropagation(); cancelEdit(); }}>取消</button>
                <button className="btn primary" onClick={e => { e.stopPropagation(); saveEdit(); }}>保存权限</button>
              </div>
            </div>}
          </article>;
        })}
      </div>
      <div className="role-note"><span>内置角色不可删除，可复制后自定义权限。权限变更写入审计日志。</span></div>
    </section>
  </div>;
}

function ServerMonitor({ api }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try { const res = await api("/admin/health"); setData(res); setError(""); } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  function statusBadge(status: string) {
    const map: Record<string, { label: string; cls: string }> = { ok: { label: "正常", cls: "ok-dot" }, watch: { label: "关注", cls: "warn-dot" }, warn: { label: "警告", cls: "warn-dot" }, busy: { label: "繁忙", cls: "warn-dot" }, idle: { label: "空闲", cls: "ok-dot" } };
    const s = map[status] || { label: status, cls: "ok-dot" };
    return <b className={s.cls}>{s.label}</b>;
  }

  function barColor(pct: number) { if (pct > 80) return "var(--rose)"; if (pct > 60) return "var(--amber)"; return "var(--teal)"; }
  function formatBytes(b: number) { return b > 1073741824 ? `${(b/1073741824).toFixed(1)} GB` : `${Math.round(b/1048576)} MB`; }

  if (loading && !data) return <div className="admin-split"><section className="admin-block"><div className="block-head"><strong>服务器监控</strong></div><p style={{color:"var(--muted)",padding:20}}>加载中...</p></section></div>;
  if (error) return <div className="admin-split"><section className="admin-block"><div className="block-head"><strong>服务器监控</strong></div><div className="risk-strip"><strong>错误</strong><span>{error}</span><button onClick={load}>重试</button></div></section></div>;

  const sys = data?.system || {};
  const svc = data?.services || {};
  const biz = data?.business || {};

  return <div className="admin-split">
    <section className="admin-block">
      <div className="block-head"><strong>服务器监控</strong>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:11,color:"var(--muted)"}}>自动刷新 10s · {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : ""}</span>
          <button className="btn" onClick={load}>刷新</button>
        </div>
      </div>
      <div className="server-grid">
        <article className="server-card">
          <div className="server-card-head"><Icon name="dashboard" /><strong>CPU</strong>{statusBadge(sys.cpu?.status)}</div>
          <div className="server-gauge">
            <div className="gauge-ring">
              <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="var(--line)" strokeWidth="8" /><circle cx="50" cy="50" r="42" fill="none" stroke={barColor(sys.cpu?.usage || 0)} strokeWidth="8" strokeDasharray={`${(sys.cpu?.usage || 0) * 2.64} 264`} strokeLinecap="round" transform="rotate(-90 50 50)" /></svg>
              <strong>{sys.cpu?.usage || 0}%</strong>
            </div>
            <div className="gauge-detail"><span>{(sys.cpu?.load1m || 0).toFixed(1)} / {(sys.cpu?.load5m || 0).toFixed(1)} / {sys.cpu?.cores || 0} 核</span><em>{sys.cpu?.model?.split("@")[0]?.trim() || ""}</em></div>
          </div>
        </article>
        <article className="server-card">
          <div className="server-card-head"><Icon name="sheet" /><strong>内存</strong>{statusBadge(sys.memory?.status)}</div>
          <div className="server-gauge">
            <div className="gauge-ring">
              <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="var(--line)" strokeWidth="8" /><circle cx="50" cy="50" r="42" fill="none" stroke={barColor(sys.memory?.percent || 0)} strokeWidth="8" strokeDasharray={`${(sys.memory?.percent || 0) * 2.64} 264`} strokeLinecap="round" transform="rotate(-90 50 50)" /></svg>
              <strong>{sys.memory?.percent || 0}%</strong>
            </div>
            <div className="gauge-detail"><span>{sys.memory?.usedGB || 0} / {sys.memory?.totalGB || 0} GB</span><em>{formatBytes(sys.memory?.free || 0)} 可用</em></div>
          </div>
        </article>
        <article className="server-card">
          <div className="server-card-head"><Icon name="sync" /><strong>服务状态</strong></div>
          <div className="service-list">
            <div className="service-row"><span>PostgreSQL</span><em>{svc.postgresql?.latency || 0}ms</em>{statusBadge("watch")}<small>{svc.postgresql?.note}</small></div>
            <div className="service-row"><span>Redis / Queue</span><em>{svc.redis?.latency || 0}ms</em>{statusBadge("ok")}<small>{svc.redis?.note}</small></div>
            <div className="service-row"><span>WebSocket</span><em>{svc.websocket?.connections || 0} 连接</em>{statusBadge(svc.websocket?.status)}</div>
            <div className="service-row"><span>Worker</span><em>{svc.worker?.queued || 0} 排队</em>{statusBadge(svc.worker?.status)}</div>
          </div>
        </article>
        <article className="server-card">
          <div className="server-card-head"><Icon name="project" /><strong>业务概览</strong></div>
          <div className="biz-stats">
            <div className="biz-row"><span>用户</span><strong>{biz.users?.enabled || 0}/{biz.users?.total || 0}</strong></div>
            <div className="biz-row"><span>项目</span><strong>{biz.projects || 0}</strong></div>
            <div className="biz-row"><span>任务</span><strong>{biz.tasks || 0}</strong></div>
            <div className="biz-row"><span>文件</span><strong>{biz.files || 0}</strong></div>
            <div className="biz-row"><span>在线会话</span><strong>{biz.sessions || 0}</strong></div>
          </div>
        </article>
      </div>
      <div className="server-footer">
        <div className="server-info-row">
          <div><strong>运行信息</strong></div>
          <div className="info-tags">
            <span>Node {sys?.nodeVersion}</span><span>PID {sys?.pid}</span><span>{sys?.platform}</span>
            <span>运行 {sys?.uptime?.formatted}</span>
            <span className={data?.lowResourceMode ? "tag-warn" : "tag-ok"}>低配模式 {data?.lowResourceMode ? "ON" : "OFF"}</span>
            <span>数据文件 {formatBytes(data?.storage?.dataFileBytes || 0)}</span>
          </div>
        </div>
      </div>
    </section>
  </div>;
}

export function AdminPanel({ admin, notifications, api, refresh: parentRefresh }: any) {
  const [adminTab, setAdminTab] = useState("users");
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [scopes, setScopes] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function reloadAdmin() {
    setLoading(true); setError("");
    try {
      const [userData, roleData, auditData] = await Promise.all([api("/admin/users"), api("/admin/roles"), api("/admin/audit-logs")]);
      setUsers(userData.users || []); setRoles(roleData.roles || []); setScopes(roleData.scopes || []); setAuditLogs(auditData.logs || []);
    } catch (e: any) { setError(e.message || "加载失败"); }
    finally { setLoading(false); }
  }

  useEffect(() => { reloadAdmin(); }, []);

  async function handleCreateKey() {
    await api("/admin/notification-keys", { method: "POST", body: JSON.stringify({ name: "新密钥", channelId: notifications?.channels?.[0]?.id || "", type: "webhook", secret: "changeme" }) });
    parentRefresh();
  }
  async function handleDeleteKey(keyId: string) { await api(`/admin/notification-keys/${keyId}`, { method: "DELETE" }); parentRefresh(); }
  async function handleTestSend() { await api("/admin/notification-test", { method: "POST", body: JSON.stringify({ event: "test", channel: "feishu", message: "测试消息" }) }); parentRefresh(); }

  const tabs = [["users","用户管理"],["permissions","权限管理"],["server","服务器监控"],["keys","通知 Key"]];

  return <div className="admin-console"><section className="panel admin-main">
    <div className="panel-head"><div><h2>管理中心</h2><p>用户和权限优先，服务器、通知 Key 与审计默认摘要显示。</p></div><button className="btn"><Icon name="user" />新建用户</button></div>
    <div className="admin-tabs">{tabs.map(([key, label]) => <button key={key} className={adminTab === key ? "active" : ""} onClick={() => setAdminTab(key)}>{label}</button>)}</div>
    <div className="admin-metrics">
      <Metric label="用户" value={loading ? "..." : users.length} hint={`${users.filter((u: any) => u.enabled).length} 人启用`} />
      <Metric label="权限项" value={scopes.length} hint="含进度/文件/验收" />
      <Metric label="服务器" value="2h2g" hint={admin?.lowResourceMode ? "低配核心版" : "运行中"} />
      <Metric label="通知 Key" value={`${notifications?.keys?.length || 0}/2`} hint="飞书、微信已配置" />
    </div>
    {error && <div className="risk-strip"><strong>加载错误</strong><span>{error}</span><button onClick={reloadAdmin}>重试</button></div>}
    <div className="admin-scroll">
      {adminTab === "users" && <UserManager users={users} api={api} reloadAdmin={reloadAdmin} />}
      {adminTab === "permissions" && <PermissionManager roles={roles} scopes={scopes} api={api} reloadAdmin={reloadAdmin} />}
      {adminTab === "server" && <ServerMonitor api={api} />}
      {adminTab === "keys" && <div className="admin-split"><section className="admin-block">
        <div className="block-head"><strong>通知 Key 管理</strong><button className="btn" onClick={handleCreateKey}>新增 Key</button></div>
        <table className="clean-table compact-table"><thead><tr><th>名称</th><th>类型</th><th>脱敏</th><th>状态</th><th>操作</th></tr></thead><tbody>{(notifications?.keys || []).map((key: any) => <tr key={key.id}><td>{key.name}</td><td>{key.type}</td><td>{key.secretMasked}</td><td><b className={key.enabled ? "ok-dot" : "warn-dot"}>{key.enabled ? "启用" : "停用"}</b></td><td><button className="link-btn" onClick={() => handleDeleteKey(key.id)}>删除</button></td></tr>)}</tbody></table>
        {notifications?.channels?.map((ch: any) => <article key={ch.id} className="status-line"><strong>{ch.name}</strong><span>{ch.type} · {ch.enabled ? "已启用" : "已停用"}</span><b className={ch.enabled ? "ok-dot" : "warn-dot"}>{ch.enabled ? "正常" : "停用"}</b></article>)}
        <div style={{marginTop:12}}><button className="btn" onClick={handleTestSend}>测试发送</button></div>
      </section></div>}
    </div>
  </section><aside className="admin-side">
    <section className="panel admin-summary-card"><div className="panel-head slim"><h2>服务器摘要</h2><button className="link-btn" onClick={() => setAdminTab("server")}>展开</button></div><article><strong>{admin?.lowResourceMode ? "低配核心版运行中" : "等待监控数据"}</strong><span>CPU {admin?.cpu || "normal"} · memory {admin?.memory || "low-resource"} · disk local</span><b className={admin?.worker ? "warn-dot" : "ok-dot"}>{admin?.worker ? "内存关注" : "正常"}</b></article></section>
    <section className="panel admin-summary-card"><div className="panel-head slim"><h2>通知 Key</h2><button className="link-btn" onClick={() => setAdminTab("keys")}>设置</button></div><article><strong>飞书{notifications?.channels?.[0]?.enabled ? "正常" : "需关注"} · 微信{notifications?.channels?.[1]?.enabled ? "正常" : "需关注"}</strong><span>Key 已加密保存，今日发送 {notifications?.logs?.length || 0} 条。</span><button onClick={() => setAdminTab("keys")}>检查状态</button></article></section>
    <section className="panel admin-summary-card audit-panel"><div className="panel-head slim"><h2>审计摘要</h2><button className="link-btn">筛选</button></div><article><strong>今日 {auditLogs.length} 条审计记录</strong><span>权限调整和越权访问拒绝均写入审计。</span><button onClick={() => setAdminTab("users")}>查看日志</button></article></section>
  </aside></div>;
}
