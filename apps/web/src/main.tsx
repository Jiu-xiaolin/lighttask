import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/main.css";
import { Icon, type IconName } from "./lib/icons";
import type { User, Project, Task, ProgressItem, FileItem, PageKey } from "./lib/types";
import { Profile } from "./components/Profile";
import { SkinCarousel } from "./components/SkinCarousel";
import { AdminPanel } from "./components/Admin";
import { Dashboard } from "./components/Dashboard";
import { Login, ProjectList, Workspace, Files, Messages, Support } from "./components/Pages";

function App() {
  const [token, setToken] = useState(localStorage.getItem("lt_token") || "");
  const [user, setUser] = useState<User | null>(() => JSON.parse(localStorage.getItem("lt_user") || "null"));
  const [view, setView] = useState<PageKey>("dashboard");
  const [theme, setThemeState] = useState(() => localStorage.getItem("lt_theme") || (JSON.parse(localStorage.getItem("lt_user") || "null") || {}).theme || "letter");
  const [themeReady, setThemeReady] = useState(false);
  function setTheme(t: string) { localStorage.setItem("lt_theme", t); setThemeState(t); }
  const [compact, setCompact] = useState(false);
  const [personalize, setPersonalize] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectGroups, setProjectGroups] = useState<{name:string,count:number}[]>([]);
  const [projectFilter, setProjectFilter] = useState("");
  const [projectGroup, setProjectGroup] = useState("");
  const [projectId, setProjectId] = useState("p_alpha");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [acceptance, setAcceptance] = useState<any>(null);
  const [notifications, setNotifications] = useState<any>(null);
  const [admin, setAdmin] = useState<any>(null);
  const [toast, setToast] = useState("");
  const project = useMemo(() => projects.find(item => item.id === projectId) || projects[0], [projects, projectId]);

  useEffect(() => {
    document.body.dataset.theme = theme;
    document.body.dataset.sidebar = compact || view === "files" || view === "support" ? "compact" : "expanded";
    document.body.dataset.personalize = personalize ? "skins" : "closed";
    document.body.dataset.view = token ? view : "login";
  }, [theme, compact, personalize, view, token]);

  useEffect(() => {
    if (theme === "custom") {
      const wp = localStorage.getItem("lt_wallpaper");
      const bl = localStorage.getItem("lt_wallpaper_blur") || "0";
      if (wp) {
        document.body.style.setProperty('--page-wallpaper', `url(${wp})`);
        document.body.style.setProperty('--page-blur', `${bl}px`);
        document.body.style.setProperty('--card-wallpaper', `url(${wp})`);
        const color = localStorage.getItem("lt_wallpaper_color");
        if (color) {
          document.body.style.setProperty('--card-gradient-left', `rgba(${color},0.85)`);
          const [r,g,b] = color.split(',').map(Number);
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          document.body.style.setProperty('--card-text-color', lum < 0.5 ? '#fff' : '#162033');
        }
      }
    }
  }, [theme]);

  // Persist theme to backend when changed (only after login + theme sync)
  useEffect(() => {
    if (!token || !themeReady) return;
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ theme, customWallpaper: theme === "custom" ? localStorage.getItem("lt_wallpaper") || "" : "", customBlur: theme === "custom" ? Number(localStorage.getItem("lt_wallpaper_blur") || "0") : 0 })
    }).catch(() => {});
  }, [theme, token, themeReady]);

  async function api(path: string, options: RequestInit = {}) {
    const response = await fetch(`/api${path}`, {
      ...options,
      headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...(options.headers || {}) }
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(data?.message || "请求失败");
    return data;
  }

  async function login(username: string, password: string) {
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "登录失败");
    localStorage.setItem("lt_token", data.token);
    localStorage.setItem("lt_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    if (data.user.theme) {
      setTheme(data.user.theme);
      if (data.user.theme === "custom" && data.user.customWallpaper) {
        localStorage.setItem("lt_wallpaper", data.user.customWallpaper);
        localStorage.setItem("lt_wallpaper_blur", String(data.user.customBlur || 0));
        document.body.style.setProperty('--page-wallpaper', `url(${data.user.customWallpaper})`);
        document.body.style.setProperty('--page-blur', `${data.user.customBlur || 0}px`);
        document.body.style.setProperty('--card-wallpaper', `url(${data.user.customWallpaper})`);
        const color = localStorage.getItem("lt_wallpaper_color");
        if (color) {
          document.body.style.setProperty('--card-gradient-left', `rgba(${color},0.85)`);
          const [r,g,b] = color.split(',').map(Number);
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          document.body.style.setProperty('--card-text-color', lum < 0.5 ? '#fff' : '#162033');
        }
      }
    }
    setThemeReady(true);
  }

  async function refresh() {
    if (!token) return;
    try {
      const params = [projectFilter && `filter=${projectFilter}`, projectGroup && `group=${encodeURIComponent(projectGroup)}`].filter(Boolean).join('&');
      const [dash, projectData, groups] = await Promise.all([api("/dashboard-full"), api(`/projects${params ? `?${params}` : ""}`), api("/project-groups")]);
      setDashboard(dash);
      setProjects(projectData.projects || []);
      setProjectGroups(groups.groups || []);
      const currentProjectId = projectId || projectData.projects?.[0]?.id;
      if (currentProjectId) {
        const [taskData, fileData, acceptanceData] = await Promise.all([
          api(`/projects/${currentProjectId}/tasks`),
          api(`/projects/${currentProjectId}/files`),
          api(`/projects/${currentProjectId}/acceptance`)
        ]);
        setTasks(taskData.tasks || []);
        setFiles(fileData.files || []);
        setAcceptance(acceptanceData);
      }
      if (user?.role === "SUPER_ADMIN") {
        const [health, notif] = await Promise.all([api("/admin/health"), api("/admin/notifications")]);
        setAdmin(health.health);
        setNotifications(notif);
      }
    } catch (error: any) {
      setToast(error.message);
    }
  }

  useEffect(() => { refresh(); }, [token, projectId, user?.role, projectFilter, projectGroup]);

  useEffect(() => {
    if (!personalize) return;
    function close(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.personal-menu') && !target.closest('.account-trigger')) {
        setPersonalize(false);
      }
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [personalize]);

  if (!token || !user) return <Login onLogin={login} />;

  const titles: Record<PageKey, string> = { dashboard: "行动仪表盘", "project-list": "项目列表", workspace: "项目工作台", files: "项目文件", messages: "消息同步", permissions: "管理", profile: "用户信息设置", support: "后台支撑" };

  return <div className="app-shell">
    <Sidebar user={user} view={view} setView={setView} projects={projects} dashboard={dashboard} projectGroups={projectGroups} setProjectFilter={setProjectFilter} projectGroup={projectGroup} setProjectGroup={setProjectGroup} compact={compact} setCompact={setCompact} personalize={personalize} setPersonalize={setPersonalize} theme={theme} setTheme={setTheme} logout={() => { localStorage.clear(); setToken(""); setUser(null); }} />
    <main className="main">
      <header className="topbar">
        <div><p>LightTask v12 / 闭环精简版</p><h1 id="page-title">{titles[view]}</h1></div>
        <label className="search"><Icon name="search" /><input placeholder="搜索项目、任务、资料、成员" /></label>
        <div className="top-actions"><button className="icon-btn"><Icon name="import" /></button><button className="icon-btn"><Icon name="export" /></button><button className="btn primary" onClick={async () => { await api("/projects", { method: "POST", body: JSON.stringify({ name: "新客户交付计划", group: "客户交付" }) }); await refresh(); setView("project-list"); }}><Icon name="plus" /><span>新建项目</span></button></div>
      </header>
      {toast && <div className="risk-strip"><strong>系统提示</strong><span>{toast}</span><button onClick={() => setToast("")}>关闭</button></div>}
      <section className={`page ${view === "dashboard" ? "active" : ""}`}><Dashboard data={dashboard} projects={projects} setView={setView} setProjectId={setProjectId} setProjectFilter={setProjectFilter} /></section>
      <section className={`page ${view === "project-list" ? "active" : ""}`}><ProjectList projects={projects} setProjectId={setProjectId} setView={setView} api={api} refresh={refresh} filter={projectFilter} setFilter={setProjectFilter} /></section>
      <section className={`page ${view === "workspace" ? "active" : ""}`}><Workspace project={project} tasks={tasks} api={api} refresh={refresh} setView={setView} /></section>
      <section className={`page ${view === "files" ? "active" : ""}`}><Files project={project} files={files} api={api} refresh={refresh} /></section>
      <section className={`page ${view === "messages" ? "active" : ""}`}><Messages notifications={notifications} api={api} refresh={refresh} /></section>
      <section className={`page ${view === "permissions" ? "active" : ""}`}><AdminPanel admin={admin} notifications={notifications} api={api} refresh={refresh} /></section>
      <section className={`page ${view === "profile" ? "active" : ""}`}><Profile user={user} theme={theme} setTheme={setTheme} api={api} refresh={refresh} setUser={setUser} /></section>
      <section className={`page ${view === "support" ? "active" : ""}`}><Support admin={admin} /></section>
    </main>
  </div>;
}

function Sidebar({ user, view, setView, projects, dashboard, projectGroups, projectGroup, setProjectFilter, setProjectGroup, compact, setCompact, personalize, setPersonalize, theme, setTheme, logout }: any) {
  const nav = [
    ["dashboard", "行动台", "dashboard", dashboard?.metrics?.todayActions || 17],
    ["project-list", "项目", "project", projects.length || 29],
    ["workspace", "工作台", "clock", dashboard?.metrics?.riskProjects || 6],
    ["files", "文件", "doc", dashboard?.metrics?.pendingFiles || 52],
    ["messages", "消息", "sync", 2],
    ["permissions", "管理", "shield", ""]
  ];
  return <aside className="sidebar">
    <button className="collapse-btn" onClick={() => setCompact(!compact)}><Icon name="menu" /><span>导航</span></button>
    <div className="sidebar-scroll">
      <nav className="nav">{nav.map(([key, label, icon, count]) => <a key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}><Icon name={icon as IconName} /><span>{label}</span>{count !== "" && <b>{count}</b>}</a>)}</nav>
      <section className="side-group"><span>项目分组</span>
        <button key="all" className={!projectGroup ? "active" : ""} onClick={() => { setProjectGroup(""); setProjectFilter(""); setView("project-list"); }}>全部<b>{projects.length}</b></button>
        {projectGroups.map((g: any) => <button key={g.name} className={projectGroup === g.name ? "active" : ""} onClick={() => { setProjectGroup(g.name); setProjectFilter(""); setView("project-list"); }}>{g.name}<b>{g.count}</b></button>)}
      </section>
      <section className="side-note"><strong>{dashboard?.metrics?.todayActions || 17}</strong><span>待处理动作</span><p>{dashboard?.metrics?.riskProjects || 4} 个项目需要介入</p></section>
    </div>
    <div className="account"><button className="account-trigger" onClick={() => setPersonalize(!personalize)}>
    {user.avatar && (user.avatar.startsWith("/uploads/") || user.avatar.startsWith("http"))
      ? <span className="avatar" style={{backgroundImage:`url(${user.avatar})`,backgroundSize:"cover"}} />
      : <span className="avatar">{user.avatar || user.name?.[0]}</span>}
    <span className="account-copy"><strong>{user.name}</strong><em>{user.role === "SUPER_ADMIN" ? "超级管理员" : "项目成员"}</em></span><Icon name="palette" /></button>
      <div className="personal-menu"><button className={`user-card-button card-theme-${theme}`} onClick={() => { setView("profile"); setPersonalize(false); }}>
    {user.avatar && (user.avatar.startsWith("/uploads/") || user.avatar.startsWith("http"))
      ? <span className="user-card-avatar" style={{backgroundImage:`url(${user.avatar})`,backgroundSize:"cover"}} />
      : <span className="user-card-avatar">{user.avatar || user.name?.[0]}</span>}
    <span className="user-card-copy"><strong>{user.name}</strong><em>{user.signature || "把复杂协作变成可推进的小步。"}</em></span><span className="user-card-badge">设置</span></button>
        <SkinCarousel theme={theme} setTheme={setTheme} />
        <button className="menu-row logout-row" onClick={logout}><Icon name="logout" /><span><strong>退出登录</strong><em>结束当前会话并返回登录框</em></span></button>
      </div>
    </div>
  </aside>;
}

createRoot(document.getElementById("root")!).render(<App />);
