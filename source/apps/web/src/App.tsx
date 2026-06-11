import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "./stores/authStore";
import { useUiStore } from "./stores/uiStore";
import { api, on401 } from "./lib/api";
import type { User, Project, Task, FileItem, PageKey } from "./lib/types";
import { Icon, type IconName } from "./lib/icons";
import { Profile } from "./components/Profile";
import { SkinCarousel } from "./components/SkinCarousel";
import { AdminPanel } from "./components/Admin";
import { Dashboard } from "./components/Dashboard";
import { Login, ProjectList, Workspace, Files, Messages, Support } from "./components/Pages";

export default function App() {
  const { token, user, login: storeLogin, logout: storeLogout, setUser: storeSetUser } = useAuthStore();
  const { view, projectId, theme, compact, personalize, toast,
    setView, setProjectId, setTheme, setCompact, setPersonalize, setToast,
    projectFilter, setProjectFilter, projectGroup, setProjectGroup,
    refreshStamp, refresh } = useUiStore();

  const [themeReady, setThemeReady] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectGroups, setProjectGroups] = useState<{ name: string; count: number }[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [acceptance, setAcceptance] = useState<any>(null);
  const [notifications, setNotifications] = useState<any>(null);
  const [admin, setAdmin] = useState<any>(null);
  const [profileVersion, setProfileVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const project = useMemo(() => projects.find((item) => item.id === projectId) || projects[0], [projects, projectId]);

  useEffect(() => {
    document.body.dataset.theme = theme;
    document.body.dataset.sidebar = compact || view === "files" || view === "support" ? "compact" : "expanded";
    document.body.dataset.personalize = personalize ? "skins" : "closed";
    document.body.dataset.view = token ? view : "login";
  }, [theme, compact, personalize, view, token]);

  useEffect(() => {
    if (!token) return;
    api("/auth/me")
      .then((data) => {
        if (data?.user) storeSetUser(data.user);
      })
      .catch(() => {});
  }, [token, storeSetUser]);

  useEffect(() => {
    if (theme === "custom") {
      const wp = localStorage.getItem("lt_wallpaper");
      const bl = localStorage.getItem("lt_wallpaper_blur") || "0";
      if (wp) {
        document.body.style.setProperty("--page-wallpaper", `url(${wp})`);
        document.body.style.setProperty("--page-blur", `${bl}px`);
        document.body.style.setProperty("--card-wallpaper", `url(${wp})`);
        const color = localStorage.getItem("lt_wallpaper_color");
        if (color) {
          document.body.style.setProperty("--card-gradient-left", `rgba(${color},0.85)`);
          const [r, g, b] = color.split(",").map(Number);
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          document.body.style.setProperty("--card-text-color", lum < 0.5 ? "#fff" : "#162033");
        }
      }
    }
  }, [theme]);

  useEffect(() => {
    if (!token || !themeReady) return;
    api("/profile", {
      method: "PATCH",
      body: JSON.stringify({
        theme,
        customWallpaper: theme === "custom" ? localStorage.getItem("lt_wallpaper") || "" : "",
        customBlur: theme === "custom" ? Number(localStorage.getItem("lt_wallpaper_blur") || "0") : 0,
      }),
    }).catch(() => {});
  }, [theme, token, themeReady]);

  async function login(username: string, password: string) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "登录失败");
    storeLogin(data.token, data.user);
    if (data.user.theme) {
      setTheme(data.user.theme);
      if (data.user.theme === "custom" && data.user.customWallpaper) {
        localStorage.setItem("lt_wallpaper", data.user.customWallpaper);
        localStorage.setItem("lt_wallpaper_blur", String(data.user.customBlur || 0));
      }
    }
    setThemeReady(true);
  }

  async function refreshData() {
    if (!token) return;
    try {
      const params = [projectFilter && `filter=${projectFilter}`, projectGroup && `group=${encodeURIComponent(projectGroup)}`].filter(Boolean).join("&");
      const [dash, projectData, groups] = await Promise.all([
        api("/dashboard-full"),
        api(`/projects${params ? `?${params}` : ""}`),
        api("/project-groups"),
      ]);
      setDashboard(dash);
      setProjects(projectData.projects || []);
      setProjectGroups(groups.groups || []);
      const currentProjectId = projectId || projectData.projects?.[0]?.id;
      if (currentProjectId) {
        setProjectId(currentProjectId);
        const [taskData, fileData, acceptanceData] = await Promise.all([
          api(`/projects/${currentProjectId}/tasks`),
          api(`/projects/${currentProjectId}/files`),
          api(`/projects/${currentProjectId}/acceptance`),
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
      if (!error.message?.includes("登录") && !error.message?.includes("重新")) {
        setToast(error.message);
      }
    }
    refresh();
  }

  useEffect(() => {
    refreshData();
  }, [token, projectId, user?.role, projectFilter, projectGroup, profileVersion]);

  useEffect(() => {
    if (!token || searchQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const id = window.setTimeout(() => {
      api(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
        .then((data) => {
          setSearchResults(data);
          setSearchOpen(true);
        })
        .catch((error) => setToast(error.message || "搜索失败"));
    }, 220);
    return () => window.clearTimeout(id);
  }, [searchQuery, token]);

  // 401 handler — show toast overlay then redirect to login
  useEffect(() => {
    on401(() => {
      const toast = document.createElement("div");
      toast.textContent = "登录状态已失效，即将返回登录页";
      toast.style.cssText = "position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:9999;padding:14px 28px;background:var(--rose,#b84c6b);color:#fff;border-radius:10px;font-size:14px;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.22);animation:toastIn 240ms ease-out";
      document.body.appendChild(toast);
      const style = document.createElement("style");
      style.textContent = "@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}";
      document.head.appendChild(style);

      setTimeout(() => {
        useAuthStore.getState().logout();
        setTimeout(() => { toast.remove(); style.remove(); }, 400);
      }, 1800);
    });
  }, []);

  useEffect(() => {
    if (!personalize) return;
    function close(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".personal-menu") && !target.closest(".account-trigger")) setPersonalize(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [personalize]);

  if (!token || !user) return <Login onLogin={login} />;

  const titles: Record<PageKey, string> = {
    dashboard: "行动仪表盘", "project-list": "项目列表", workspace: "项目工作台",
    files: "项目文件", messages: "消息同步", permissions: "管理", profile: "用户信息设置", support: "后台支撑",
  };

  return (
    <div className="app-shell">
      <Sidebar
        user={user} view={view} setView={setView} projects={projects} dashboard={dashboard}
        projectGroups={projectGroups} setProjectFilter={setProjectFilter} projectGroup={projectGroup}
        setProjectGroup={setProjectGroup} compact={compact} setCompact={setCompact}
        personalize={personalize} setPersonalize={setPersonalize} theme={theme} setTheme={setTheme}
        logout={async () => {
          try { await api("/auth/logout", { method: "POST" }); } catch {}
          storeLogout();
        }}
      />
      <main className="main">
        <header className="topbar">
          <div className="topbar-title"><h1>{titles[view as PageKey]}</h1></div>
          <label className="search">
            <Icon name="search" />
            <input
              value={searchQuery}
              placeholder="搜索项目、任务、资料、成员"
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSearchOpen(false);
              }}
            />
            {searchOpen && searchQuery.trim().length >= 2 && searchResults && (
              <SearchPopover
                results={searchResults}
                onClose={() => setSearchOpen(false)}
                onOpen={(target: { view?: PageKey; projectId?: string }) => {
                  if (target.projectId) setProjectId(target.projectId);
                  if (target.view) setView(target.view);
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
              />
            )}
          </label>
          <div className="top-actions">
            <button className="icon-btn"><Icon name="import" /></button>
            <button className="icon-btn"><Icon name="export" /></button>
            <button className="btn primary" onClick={async () => {
              await api("/projects", { method: "POST", body: JSON.stringify({ name: "新客户交付计划", group: "客户交付" }) });
              await refreshData();
              setView("project-list");
            }}><Icon name="plus" /><span>新建项目</span></button>
          </div>
        </header>
        {toast && <div className="risk-strip"><strong>系统提示</strong><span>{toast}</span><button onClick={() => setToast("")}>关闭</button></div>}
        <section className={`page ${view === "dashboard" ? "active" : ""}`}>
          <Dashboard data={dashboard} projects={projects} setView={setView} setProjectId={setProjectId} setProjectFilter={setProjectFilter} token={token} refreshStamp={refreshStamp} refresh={refreshData} view={view} />
        </section>
        <section className={`page ${view === "project-list" ? "active" : ""}`}>
          <ProjectList projects={projects} setProjectId={setProjectId} setView={setView} api={api} refresh={refreshData} filter={projectFilter} setFilter={setProjectFilter} />
        </section>
        <section className={`page ${view === "workspace" ? "active" : ""}`}>
          <Workspace key={`${project?.id || ""}-${profileVersion}`} project={project} tasks={tasks} api={api} refresh={refreshData} setView={setView} refreshStamp={refreshStamp} />
        </section>
        <section className={`page ${view === "files" ? "active" : ""}`}>
          <Files project={project} files={files} api={api} refresh={refreshData} />
        </section>
        <section className={`page ${view === "messages" ? "active" : ""}`}>
          <Messages notifications={notifications} api={api} refresh={refreshData} />
        </section>
        <section className={`page ${view === "permissions" ? "active" : ""}`}>
          <AdminPanel admin={admin} notifications={notifications} api={api} refresh={refreshData} />
        </section>
        <section className={`page ${view === "profile" ? "active" : ""}`}>
          <Profile user={user} theme={theme} setTheme={setTheme} api={api} refresh={refreshData} setUser={(u: User) => useAuthStore.getState().setUser(u)} onProfileChanged={() => setProfileVersion((v) => v + 1)} />
        </section>
        <section className={`page ${view === "support" ? "active" : ""}`}>
          <Support admin={admin} />
        </section>
      </main>
    </div>
  );
}

function SearchPopover({ results, onOpen, onClose }: any) {
  const groups = [
    ["projects", "项目", "project", (item: any) => ({ label: item.name, meta: item.group || item.status, target: { view: "workspace", projectId: item.id } })],
    ["tasks", "任务", "project", (item: any) => ({ label: item.title, meta: item.status, target: { view: "workspace", projectId: item.projectId } })],
    ["files", "文件", "doc", (item: any) => ({ label: item.name, meta: `${item.type} · v${item.version}`, target: { view: "files", projectId: item.projectId } })],
    ["users", "成员", "user", (item: any) => ({ label: item.name || item.username, meta: item.username, target: { view: "permissions" } })],
  ] as const;
  const total = groups.reduce((sum, [key]) => sum + (results?.[key]?.length || 0), 0);
  return (
    <div className="search-popover">
      <div className="search-popover-head">
        <strong>搜索结果</strong>
        <button type="button" onClick={onClose}>关闭</button>
      </div>
      {total === 0 && <p className="search-empty">没有找到匹配内容</p>}
      {groups.map(([key, title, icon, mapItem]) => {
        const items = results?.[key] || [];
        if (!items.length) return null;
        return (
          <section key={key}>
            <span>{title}</span>
            {items.map((item: any) => {
              const row = mapItem(item);
              return (
                <button type="button" key={item.id} onClick={() => onOpen(row.target)}>
                  <Icon name={icon as IconName} />
                  <strong>{row.label}</strong>
                  <em>{row.meta}</em>
                </button>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function Sidebar({ user, view, setView, projects, dashboard, projectGroups, projectGroup, setProjectFilter, setProjectGroup, compact, setCompact, personalize, setPersonalize, theme, setTheme, logout }: any) {
  const nav = [
    ["dashboard", "行动台", "dashboard", dashboard?.metrics?.todayActions || 17],
    ["project-list", "项目", "project", projects?.length || 29],
    ["files", "文件", "doc", dashboard?.metrics?.pendingFiles || 52],
    ["messages", "消息", "sync", 2],
    ["permissions", "管理", "shield", ""],
  ] as const;
  return (
    <aside className="sidebar">
      <button className="collapse-btn" onClick={() => setCompact(!compact)}><Icon name="menu" /><span>导航</span></button>
      <div className="sidebar-scroll">
        <nav className="nav">
          {nav.map(([key, label, icon, count]) => (
            <a key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}>
              <Icon name={icon as IconName} /><span>{label}</span>{count !== "" && <b>{count}</b>}
            </a>
          ))}
        </nav>
        <section className="side-group">
          <span>项目分组</span>
          <button key="all" className={!projectGroup ? "active" : ""} onClick={() => { setProjectGroup(""); setProjectFilter(""); setView("project-list"); }}>
            全部<b>{projects?.length || 0}</b>
          </button>
          {(projectGroups || []).map((g: any) => (
            <button key={g.name} className={projectGroup === g.name ? "active" : ""} onClick={() => { setProjectGroup(g.name); setProjectFilter(""); setView("project-list"); }}>
              {g.name}<b>{g.count}</b>
            </button>
          ))}
        </section>
        <section className="side-note">
          <strong>{dashboard?.metrics?.todayActions || 17}</strong><span>待处理动作</span>
          <p>{dashboard?.metrics?.riskProjects || 4} 个项目需要介入</p>
        </section>
      </div>
      <div className="account">
        <button className="account-trigger" onClick={() => setPersonalize(!personalize)}>
          {user.avatar && (user.avatar.startsWith("/uploads/") || user.avatar.startsWith("http"))
            ? <span className="avatar" style={{ backgroundImage: `url(${user.avatar})`, backgroundSize: "cover" }} />
            : <span className="avatar">{user.avatar || user.name?.[0]}</span>}
          <span className="account-copy"><strong>{user.name}</strong><em>{user.role === "SUPER_ADMIN" ? "超级管理员" : "项目成员"}</em></span>
          <Icon name="palette" />
        </button>
        <div className="personal-menu">
          <button className={`user-card-button card-theme-${theme}`} onClick={() => { setView("profile"); setPersonalize(false); }}>
            {user.avatar && (user.avatar.startsWith("/uploads/") || user.avatar.startsWith("http"))
              ? <span className="user-card-avatar" style={{ backgroundImage: `url(${user.avatar})`, backgroundSize: "cover" }} />
              : <span className="user-card-avatar">{user.avatar || user.name?.[0]}</span>}
            <span className="user-card-copy"><strong>{user.name}</strong><em>{user.signature || "把复杂协作变成可推进的小步。"}</em></span>
            <span className="user-card-badge">设置</span>
          </button>
          <SkinCarousel theme={theme} setTheme={setTheme} />
          <button className="menu-row logout-row" onClick={logout}>
            <Icon name="logout" /><span><strong>退出登录</strong><em>结束当前会话并返回登录框</em></span>
          </button>
        </div>
      </div>
    </aside>
  );
}
