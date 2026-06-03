const state = {
  token: localStorage.getItem("lighttask_token") || "",
  user: JSON.parse(localStorage.getItem("lighttask_user") || "null"),
  view: "login",
  theme: localStorage.getItem("lighttask_theme") || "letter",
  data: {
    dashboard: null,
    projects: [],
    members: [],
    tasks: [],
    files: [],
    submissions: [],
    timeline: [],
    rules: [],
    logs: [],
    users: [],
    health: null,
    acceptanceItems: [],
    acceptanceReports: []
  },
  selectedProjectId: localStorage.getItem("lighttask_project") || "p_alpha",
  selectedFileId: "",
  selectedFileMode: "document"
};

const titles = {
  login: "登录",
  global: "全局框架",
  dashboard: "行动仪表盘",
  "project-list": "项目列表",
  workspace: "项目工作台",
  files: "项目文件",
  messages: "消息同步",
  permissions: "管理",
  profile: "用户信息设置",
  support: "后台支撑"
};

const statusText = {
  todo: "待处理",
  doing: "进行中",
  done: "已完成",
  completed: "已完成",
  delayed: "延期",
  blocked: "阻塞",
  abandoned: "放弃",
  submitted: "已提交",
  needs_revision: "需修改",
  accepted: "已验收"
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function icon(name) {
  return `<svg><use href="#${name}"></use></svg>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function jsonBody(body) {
  return body === undefined ? undefined : JSON.stringify(body);
}

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(state.token ? { authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    if ([401, 403].includes(response.status) && data?.error?.code?.startsWith("SESSION")) clearSession(false);
    throw new Error(data?.error?.message || "请求失败");
  }
  return data;
}

function selectedProject() {
  return state.data.projects.find((project) => project.id === state.selectedProjectId) || state.data.projects[0] || null;
}

function taskAssignments(task) {
  return task.assignments || [];
}

function memberName(userId) {
  const member = state.data.members.find((item) => item.userId === userId);
  return member?.user?.name || state.data.users.find((user) => user.id === userId)?.name || userId;
}

function parseSheet(content) {
  try {
    const parsed = JSON.parse(content || "[]");
    return Array.isArray(parsed) ? parsed : [["字段", "值"], ["内容", String(content || "")]];
  } catch {
    return [["字段", "值"], ["内容", content || ""]];
  }
}

function applyUser(user) {
  state.user = user;
  state.theme = user.theme || state.theme || "letter";
  document.body.dataset.theme = state.theme;
  localStorage.setItem("lighttask_user", JSON.stringify(user));
  localStorage.setItem("lighttask_theme", state.theme);
  const avatar = user.avatar || user.name?.slice(0, 1) || "林";
  const role = user.role === "super_admin" ? "超级管理员" : "普通用户";
  $$(".avatar, .user-card-avatar, .profile-card-preview .avatar").forEach((node) => {
    node.textContent = avatar;
  });
  $$(".account-copy strong, .user-card-copy strong, .profile-card-preview strong").forEach((node) => {
    node.textContent = user.name || "LightTask";
  });
  $$(".account-copy em, .profile-card-preview em").forEach((node) => {
    node.textContent = role;
  });
  $$(".user-card-copy em, .profile-card-preview p, .signature-input").forEach((node) => {
    if ("value" in node) node.value = user.signature || "把复杂协作变成可推进的小步。";
    else node.textContent = user.signature || "把复杂协作变成可推进的小步。";
  });
}

function setView(view, options = {}) {
  state.view = view;
  document.body.dataset.view = view;
  if (view !== "global") document.body.dataset.personalize = "closed";
  if (options.sidebar) document.body.dataset.sidebar = options.sidebar;
  if (!document.body.dataset.sidebar) document.body.dataset.sidebar = view === "files" ? "compact" : "expanded";
  $$(".page").forEach((page) => page.classList.toggle("active", page.id === view));
  const activeNav = view === "profile" || view === "support" ? "" : view;
  $$("[data-nav]").forEach((item) => item.classList.toggle("active", item.dataset.nav === activeNav));
  const title = $("#page-title");
  if (title) title.textContent = titles[view] || "仪表盘";
  history.replaceState(null, "", view === "login" ? "/" : `/?view=${encodeURIComponent(view)}`);
  if (state.token && view !== "login") renderCurrentView();
}

function setSession(token, user) {
  state.token = token;
  localStorage.setItem("lighttask_token", token);
  applyUser(user);
}

function clearSession(updateView = true) {
  state.token = "";
  state.user = null;
  localStorage.removeItem("lighttask_token");
  localStorage.removeItem("lighttask_user");
  if (updateView) setView("login", { sidebar: "expanded" });
}

async function refreshAll() {
  const [dashboard, projectData] = await Promise.all([api("/dashboard/summary"), api("/projects")]);
  state.data.dashboard = dashboard;
  state.data.projects = projectData.projects || [];
  if (!selectedProject()) state.selectedProjectId = state.data.projects[0]?.id || "";
  localStorage.setItem("lighttask_project", state.selectedProjectId);
  await refreshProject();
  await refreshAdminData();
}

async function refreshProject() {
  const project = selectedProject();
  if (!project) return;
  const [members, tasks, files, submissions, timeline, acceptanceItems, reports] = await Promise.all([
    api(`/projects/${project.id}/members`),
    api(`/projects/${project.id}/tasks`),
    api(`/projects/${project.id}/files`),
    api(`/projects/${project.id}/submissions`),
    api(`/projects/${project.id}/timeline`),
    api(`/projects/${project.id}/acceptance/items`),
    api(`/projects/${project.id}/acceptance/report`)
  ]);
  state.data.members = members.members || [];
  state.data.tasks = tasks.tasks || [];
  state.data.files = files.files || [];
  state.data.submissions = submissions.submissions || [];
  state.data.timeline = timeline.events || [];
  state.data.acceptanceItems = acceptanceItems.items || [];
  state.data.acceptanceReports = reports.reports || [];
  if (!state.selectedFileId || !state.data.files.some((file) => file.id === state.selectedFileId)) {
    state.selectedFileId = state.data.files[0]?.id || "";
  }
}

async function refreshAdminData() {
  try {
    const [rules, logs] = await Promise.all([api("/notification-rules"), api("/notification-logs")]);
    state.data.rules = rules.rules || [];
    state.data.logs = logs.logs || [];
  } catch {
    state.data.rules = [];
    state.data.logs = [];
  }
  if (state.user?.role !== "super_admin") return;
  try {
    const [users, health] = await Promise.all([api("/admin/users"), api("/admin/health")]);
    state.data.users = users.users || [];
    state.data.health = health.health;
  } catch {
    state.data.users = [];
    state.data.health = null;
  }
}

function renderCurrentView() {
  const renderers = {
    dashboard: renderDashboard,
    "project-list": renderProjectList,
    workspace: renderWorkspace,
    files: renderFiles,
    messages: renderMessages,
    permissions: renderPermissions,
    profile: renderProfile,
    global: renderGlobal,
    support: renderSupport
  };
  renderers[state.view]?.();
}

function renderDashboard() {
  const root = $("#dashboard");
  if (!root) return;
  const metrics = state.data.dashboard?.metrics || {};
  const my = state.data.dashboard?.myProgress || {};
  const gantt = state.data.dashboard?.gantt || [];
  root.innerHTML = `
    <div class="metrics">
      <article><span>活跃项目</span><strong>${metrics.activeProjects ?? 0}</strong><em>当前可见项目</em></article>
      <article><span>我的进度</span><strong>${metrics.myProgress ?? 0}</strong><em>已完成成员节点</em></article>
      <article><span>待收集文件</span><strong>${metrics.pendingFiles ?? 0}</strong><em>提交物和附件</em></article>
      <article><span>风险项目</span><strong>${metrics.riskProjects ?? 0}</strong><em>需要介入</em></article>
    </div>
    <section class="panel my-progress-panel">
      <div class="my-progress-copy"><span>我的进度</span><strong>预计 ${my.expectedFinish || "-"} 完成 · ${formatDelta(my.deltaDays)}</strong><p>按原计划、当前计划和实际完成节点计算快慢天数。</p></div>
      <div class="progress-stats">
        <article><b>今日</b><strong>${my.todayDone ?? 0}</strong><span>完成</span></article>
        <article><b>本周</b><strong>${my.weekDone ?? 0}</strong><span>完成</span></article>
        <article><b>本月</b><strong>${my.monthDone ?? 0}</strong><span>节点</span></article>
        <article class="${(my.deltaDays || 0) > 0 ? "warn" : ""}"><b>偏差</b><strong>${formatDelta(my.deltaDays)}</strong><span>${(my.deltaDays || 0) > 0 ? "慢于计划" : "快于计划"}</span></article>
      </div>
      <div class="personal-mini-gantt">
        <div><span>原计划</span><i style="width:72%"></i></div>
        <div><span>当前计划</span><i class="amber-line" style="width:84%"></i></div>
        <div><span>实际进度</span><i class="teal-line" style="width:61%"></i></div>
      </div>
    </section>
    <div class="dashboard-grid">
      <section class="panel gantt-panel">
        <div class="panel-head"><div><h2>任务甘特图</h2><p>日、月、季度、年维度共用真实任务数据，默认显示项目主线。</p></div><div class="segmented"><button class="active">日</button><button>月</button><button>季度</button><button>年</button></div></div>
        <div class="gantt-filterbar">
          <button class="active">${icon("i-project")}项目主线</button><button>${icon("i-dashboard")}我负责</button><button class="warn">${icon("i-alert")}只看延期</button><button>${icon("i-user-plus")}成员</button>
          <div class="view-menu"><button>${icon("i-filter")}视图设置</button><span>原计划 · 当前进度 · 团队节点</span></div>
        </div>
        <div class="member-filter-strip"><span>当前视图：项目主线</span><div>${state.data.members.slice(0, 5).map((m) => `<i>${escapeHtml(m.user?.avatar || m.user?.name?.slice(0, 1) || "员")}</i>`).join("")}<b>+${Math.max(0, state.data.members.length - 5)}</b></div><em>点击头像可展开个人甘特</em></div>
        <div class="gantt">${renderGantt(gantt.slice(0, 7))}</div>
        <div class="risk-strip"><strong>风险提示</strong><span>${riskSummary()}</span><button data-action="open-workspace">查看工作台</button></div>
      </section>
      <aside class="panel queue-panel">
        <div class="panel-head slim"><h2>待处理动作</h2><button class="link-btn" data-action="open-workspace">全部</button></div>
        ${renderQueue()}
      </aside>
    </div>
    <section class="panel progress-panel">
      <div class="panel-head slim"><h2>项目进度详情</h2><button class="link-btn" data-action="open-projects">查看项目</button></div>
      <div class="progress-list">${state.data.projects.map(renderProgressCard).join("")}</div>
    </section>
  `;
}

function renderGantt(tasks) {
  const rows = tasks.length ? tasks : state.data.tasks;
  return `
    <div class="gantt-head"><span>任务</span><b>06/02</b><b>06/03</b><b>06/04</b><b>06/05</b><b>06/06</b><b>06/07</b></div>
    ${rows.map((task, index) => {
      const colStart = 2 + (index % 4);
      const colEnd = Math.min(8, colStart + 2 + (index % 2));
      const cls = task.status === "done" ? "teal" : task.status === "delayed" ? "amber" : task.status === "blocked" ? "rose" : index % 2 ? "violet" : "blue";
      const assignment = task.assignments?.[0];
      return `<div class="gantt-row"><span>${escapeHtml(task.title)}</span><i class="bar ${cls}" style="grid-column:${colStart} / ${colEnd}">${escapeHtml(statusText[task.status] || task.status)}${assignment ? ` · ${escapeHtml(memberName(assignment.userId))}` : ""}</i>${assignment?.deltaDays ? `<b class="milestone ${assignment.deltaDays > 0 ? "delay" : ""}" style="grid-column:${colEnd}">${formatDelta(assignment.deltaDays)}</b>` : ""}</div>`;
    }).join("")}
  `;
}

function renderQueue() {
  const delayed = state.data.tasks.filter((task) => task.assignments?.some((item) => ["delayed", "blocked"].includes(item.status)));
  const submissions = state.data.submissions.filter((item) => item.status === "submitted");
  const queues = [
    { cls: "danger", title: "延期/阻塞任务", text: `${delayed.length} 个成员节点需要介入`, action: "查看甘特" },
    { cls: "warn", title: "待验收提交物", text: `${submissions.length} 份成果等待创建者验收`, action: "文件收集箱" },
    { cls: "ok", title: "最近文档版本", text: `${state.data.files.length} 个项目文件可在线编辑`, action: "打开文件" },
    { cls: "info", title: "消息规则", text: `${state.data.rules.length} 条提醒规则启用`, action: "消息设置" }
  ];
  return queues.map((item) => `<article class="queue ${item.cls}"><strong>${item.title}</strong><span>${item.text}</span><div><button data-action="${item.action === "打开文件" ? "open-files" : "open-workspace"}">${item.action}</button></div></article>`).join("");
}

function renderProgressCard(project) {
  const progress = Number(project.progress || 0);
  return `<article><strong>${escapeHtml(project.name)}</strong><span>${escapeHtml(project.group)} · ${escapeHtml(project.currentEnd || "-")} 完成 · 风险 ${escapeHtml(project.risk || "low")}</span><b>${progress}%</b><i style="width:${Math.max(4, progress)}%"></i></article>`;
}

function renderProjectList() {
  const root = $("#project-list");
  if (!root) return;
  root.innerHTML = `
    <div class="toolbar-row"><div class="segmented"><button class="active">全部</button><button>我负责</button><button>有风险</button><button>待验收</button><button>已归档</button></div><div class="toolbar-actions"><button class="btn">${icon("i-filter")}筛选</button><button class="btn primary" data-action="create-project">${icon("i-plus")}创建项目</button></div></div>
    <div class="project-list-grid">
      <section class="panel project-board">
        <div class="panel-head"><div><h2>项目列表</h2><p>卡片展示关键项目，低频信息自动收起。</p></div><button class="link-btn">紧凑列表</button></div>
        <div class="project-cards">${state.data.projects.map((project) => `
          <article class="project-card ${project.id === state.selectedProjectId ? "active" : ""}" data-project-id="${project.id}">
            <span class="tag ${project.risk === "low" ? "ok" : "warn"}">${escapeHtml(project.status)}</span>
            <strong>${escapeHtml(project.name)}</strong>
            <p>${escapeHtml(project.description || "暂无描述")}</p>
            <div class="avatars">${state.data.members.slice(0, 4).map((m) => `<i>${escapeHtml(m.user?.avatar || "员")}</i>`).join("")}</div>
            <progress value="${project.progress || 0}" max="100"></progress>
            <div class="project-flags"><em>${formatDelta(daysBetween(project.baselineEnd, project.currentEnd))}</em><em>${escapeHtml(project.group)}</em></div>
            <button data-action="select-project" data-project-id="${project.id}">进入工作台</button>
          </article>`).join("")}</div>
      </section>
      <aside class="panel create-panel"><h2>快速创建</h2><label>项目名称<input id="quickProjectName" placeholder="例如：客户交付二期" /></label><label>计划结束<input id="quickProjectEnd" type="date" value="2026-07-12" /></label><button class="btn primary wide" data-action="create-project-form">${icon("i-plus")}创建项目</button></aside>
    </div>
  `;
}

function renderWorkspace() {
  const root = $("#workspace");
  const project = selectedProject();
  if (!root || !project) return;
  const columns = [
    ["todo", "待处理"],
    ["doing", "进行中"],
    ["done", "已完成"],
    ["delayed", "延期"],
    ["blocked", "阻塞"]
  ];
  root.innerHTML = `
    <div class="workspace-layout">
      <section class="panel kanban">
        <div class="panel-head"><div><h2>${escapeHtml(project.name)}</h2><p>任务块可拖动变更状态，成员进度和提交物在任务内处理。</p></div><div class="toolbar-actions"><button class="btn" data-action="invite-member">${icon("i-user-plus")}邀请成员</button><button class="btn primary" data-action="create-task">${icon("i-plus")}创建任务</button></div></div>
        <div class="quick-task-row"><input id="quickTaskTitle" placeholder="新任务名称，例如：整理验收资料" /><select id="quickTaskUser">${state.data.members.map((m) => `<option value="${m.userId}">${escapeHtml(m.user?.name || m.userId)}</option>`).join("")}</select><button data-action="create-task">添加</button></div>
        <div class="drop-board">${columns.map(([key, label]) => renderKanbanColumn(key, label)).join("")}</div>
      </section>
      <aside class="panel timeline"><div class="panel-head slim"><h2>变更时间线</h2><button class="link-btn">筛选</button></div>${state.data.timeline.slice(0, 12).map(renderTimelineEvent).join("")}</aside>
    </div>
  `;
  bindDynamicDrag();
}

function renderKanbanColumn(status, label) {
  const tasks = state.data.tasks.filter((task) => normalizedTaskStatus(task) === status);
  return `<section class="drop-col" data-status="${status}"><h3>${label} <span>${tasks.length}</span></h3>${tasks.map(renderTaskCard).join("")}<div class="drop-placeholder">拖到这里</div></section>`;
}

function normalizedTaskStatus(task) {
  if (task.assignments?.some((item) => item.status === "blocked")) return "blocked";
  if (task.assignments?.some((item) => item.status === "delayed")) return "delayed";
  if (task.status === "done" || task.status === "completed") return "done";
  return task.status || "todo";
}

function renderTaskCard(task) {
  const assignments = taskAssignments(task);
  return `<article class="task" draggable="true" data-task-id="${task.id}" data-task="${escapeHtml(task.title)}">
    <strong>${escapeHtml(task.title)}</strong>
    <span>${escapeHtml(task.priority || "medium")} · ${escapeHtml(task.currentEnd || task.baselineEnd || "-")}</span>
    ${assignments.map((item) => `<div class="assignment-row"><i>${escapeHtml(memberName(item.userId).slice(0, 1))}</i><span>${escapeHtml(memberName(item.userId))} · ${escapeHtml(statusText[item.status] || item.status)} · ${formatDelta(item.deltaDays)}</span></div>`).join("")}
    <div class="task-actions">${assignments.slice(0, 1).map((item) => `
      <button data-action="assignment-complete" data-assignment-id="${item.id}" title="完成">${icon("i-check")}</button>
      <button data-action="assignment-delay" data-assignment-id="${item.id}" title="延期">${icon("i-clock")}</button>
      <button data-action="assignment-block" data-assignment-id="${item.id}" title="阻塞">${icon("i-alert")}</button>
      <button data-action="assignment-submit" data-assignment-id="${item.id}" title="上传成果">${icon("i-paperclip")}</button>
      <button data-action="assignment-continue" data-assignment-id="${item.id}" title="继续下一项">${icon("i-sync")}</button>
      <button data-action="assignment-rest" data-assignment-id="${item.id}" title="休息一下">${icon("i-user")}</button>
      <button data-action="assignment-remind" data-assignment-id="${item.id}" title="提醒创建者">${icon("i-message")}</button>
      <button data-action="assignment-abandon" data-assignment-id="${item.id}" title="放弃">${icon("i-close")}</button>`).join("")}
    </div>
  </article>`;
}

function renderTimelineEvent(event) {
  const cls = event.color === "red" ? "task-event" : event.color === "green" ? "accept-event" : event.color === "purple" ? "doc-event" : "member-event";
  return `<article class="event ${cls}"><time>${new Date(event.createdAt).toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</time><strong>${escapeHtml(event.actorName || "系统")}</strong><span>${escapeHtml(event.message)}</span></article>`;
}

function renderFiles() {
  const root = $("#files");
  if (!root) return;
  const activeFile = state.data.files.find((file) => file.id === state.selectedFileId) || state.data.files[0] || null;
  root.innerHTML = `
    <div class="editor-shell">
      <aside class="doc-tree">
        <div class="file-tree-head"><h3>项目文件</h3><button data-action="create-doc" aria-label="新建文件">${icon("i-plus")}</button></div>
        <div class="file-actions"><button data-action="create-doc">${icon("i-doc")}<span>文档</span></button><button data-action="create-sheet">${icon("i-sheet")}<span>表格</span></button><button data-action="open-collection">${icon("i-project")}<span>收集箱</span></button></div>
        ${state.data.files.map((file) => renderFileItem(file, activeFile)).join("")}
        <button class="file-item collection ${state.selectedFileMode === "collection" ? "active" : ""}" data-action="open-collection">${icon("i-project")}<span><strong>文件收集箱</strong><em>${state.data.submissions.length} 份提交物</em></span></button>
      </aside>
      ${state.selectedFileMode === "collection" ? renderCollectionBox() : renderActiveFile(activeFile)}
    </div>
  `;
}

function renderFileItem(file, activeFile) {
  const symbol = file.type === "sheet" ? "i-sheet" : file.type === "submission" ? "i-paperclip" : "i-doc";
  return `<button class="file-item ${activeFile?.id === file.id && state.selectedFileMode !== "collection" ? "active" : ""}" data-action="select-file" data-file-id="${file.id}">${icon(symbol)}<span><strong>${escapeHtml(file.name)}</strong><em>${escapeHtml(file.type)} · v${file.version}</em></span></button>`;
}

function renderActiveFile(file) {
  if (!file) {
    return `<section class="editor-main"><div class="empty-state"><strong>还没有文件</strong><span>创建一个在线文档或表格开始协作。</span></div></section><aside class="doc-aside"></aside>`;
  }
  return file.type === "sheet" ? renderSheetEditor(file) : renderDocEditor(file);
}

function renderDocEditor(file) {
  return `
    <section class="editor-main">
      <div class="editor-title file-title"><span>项目文件 / 在线文档</span><strong contenteditable="true" id="activeFileName">${escapeHtml(file.name)}</strong><em>版本 v${file.version} · 支持 Markdown、评论、修订和版本记录</em><div class="file-meta-pills"><b>Word</b><b>在线编辑</b><b>v${file.version}</b></div></div>
      ${renderDocRibbon()}
      <article class="paper" contenteditable="true" id="docContent">${markdownToHtml(file.content)}</article>
    </section>
    <aside class="doc-aside">
      <div class="panel-head slim"><h2>辅助栏</h2><button class="link-btn" data-action="save-file">保存</button></div>
      <div class="aside-tabs"><button class="active">大纲</button><button>评论</button><button>版本</button><button>属性</button><button>提交物</button></div>
      <article class="file-property"><strong>${escapeHtml(file.name)}</strong><span>创建者 ${escapeHtml(memberName(file.ownerId))} · 最新 v${file.version}</span><div><button data-action="rename-file">重命名</button><button class="danger" data-action="delete-file">删除</button></div></article>
      <ol>${extractHeadings(file.content).map((heading) => `<li>${escapeHtml(heading)}</li>`).join("") || "<li class=\"active\">正文</li>"}</ol>
      ${state.data.timeline.filter((event) => event.type?.includes("document") || event.type?.includes("file")).slice(0, 3).map((event) => `<article class="version-card"><strong>${escapeHtml(event.type)}</strong><span>${escapeHtml(event.message)}</span></article>`).join("")}
    </aside>`;
}

function renderDocRibbon() {
  return `<div class="icon-ribbon">
    <button data-action="save-file" aria-label="保存">${icon("i-save")}</button><button aria-label="撤销">${icon("i-undo")}</button><button aria-label="重做">${icon("i-redo")}</button><button aria-label="打印">${icon("i-print")}</button><button aria-label="格式刷">${icon("i-brush")}</button><button aria-label="标题">${icon("i-track")}</button><span></span>
    <button aria-label="加粗">${icon("i-bold")}</button><button aria-label="斜体">${icon("i-italic")}</button><button aria-label="下划线">${icon("i-underline")}</button><button aria-label="对齐">${icon("i-align")}</button><button aria-label="列表">${icon("i-list")}</button><button aria-label="链接">${icon("i-link")}</button><button aria-label="图片">${icon("i-image")}</button><button aria-label="评论">${icon("i-comment")}</button><button aria-label="修订">${icon("i-track")}</button><button aria-label="更多">${icon("i-more")}</button>
  </div>`;
}

function renderSheetEditor(file) {
  const rows = parseSheet(file.content);
  return `
    <section class="sheet-main">
      <div class="editor-title file-title"><span>项目文件 / 在线表格</span><strong contenteditable="true" id="activeFileName">${escapeHtml(file.name)}</strong><em>版本 v${file.version} · 支持填色、评论、轻量公式和导入导出</em><div class="file-meta-pills"><b>Sheet</b><b>在线编辑</b><b>v${file.version}</b></div></div>
      <div class="icon-ribbon sheet-ribbon"><button data-action="save-file" aria-label="保存">${icon("i-save")}</button><button aria-label="撤销">${icon("i-undo")}</button><button aria-label="重做">${icon("i-redo")}</button><button aria-label="格式刷">${icon("i-brush")}</button><span></span><button aria-label="加粗">${icon("i-bold")}</button><button aria-label="斜体">${icon("i-italic")}</button><button aria-label="对齐">${icon("i-align")}</button><button aria-label="函数">${icon("i-function")}</button><button aria-label="冻结窗格">${icon("i-freeze")}</button><button aria-label="排序">${icon("i-sort")}</button><button aria-label="图表">${icon("i-chart")}</button><button aria-label="评论">${icon("i-comment")}</button><button aria-label="更多">${icon("i-more")}</button></div>
      <div class="formula"><b>fx</b><span>=SUM(D2:D6)</span></div>
      <div class="grid-sheet"><table id="sheetGrid"><thead><tr><th></th>${rows[0].map((_, index) => `<th>${String.fromCharCode(65 + index)}</th>`).join("")}</tr></thead><tbody>${rows.map((row, r) => `<tr><th>${r + 1}</th>${row.map((cell, c) => `<td contenteditable="true" class="${r === 0 && c === 0 ? "selected" : ""}">${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <div class="sheet-tabs"><button class="active">${escapeHtml(file.name.replace(/\.(xlsx|csv)$/i, ""))}</button><button>成员提交</button><button>验收统计</button><button aria-label="新增工作表">${icon("i-plus")}</button></div>
    </section>
    <aside class="sheet-aside"><div class="panel-head slim"><h2>辅助栏</h2><button class="link-btn" data-action="save-file">保存</button></div><div class="aside-tabs"><button class="active">评论</button><button>版本</button><button>历史</button><button>属性</button></div><article class="file-property"><strong>${escapeHtml(file.name)}</strong><span>创建者 ${escapeHtml(memberName(file.ownerId))} · 最新 v${file.version}</span><div><button data-action="rename-file">重命名</button><button class="danger" data-action="delete-file">删除</button></div></article><article class="compat"><strong>轻量兼容</strong><span>支持 CSV / 简单 XLSX 数据导入导出，复杂宏后置。</span><i></i></article></aside>`;
}

function renderCollectionBox() {
  return `<section class="editor-main"><div class="editor-title file-title"><span>项目文件 / 提交物</span><strong>文件收集箱</strong><em>按任务、成员、状态统一收集成果文件。</em><div class="file-meta-pills"><b>${state.data.submissions.length} 份</b><b>可验收</b></div></div><div class="collection-grid">${state.data.submissions.map((item) => `<article class="submission-card"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.userName)} · ${escapeHtml(item.taskTitle)} · ${escapeHtml(statusText[item.status] || item.status)}</span><div><button data-action="accept-submission" data-submission-id="${item.id}">${icon("i-check")}验收</button><button data-action="rework-submission" data-submission-id="${item.id}">${icon("i-alert")}退回</button></div></article>`).join("") || "<article class=\"empty-state\"><strong>暂无提交物</strong><span>成员上传成果后会出现在这里。</span></article>"}</div></section><aside class="doc-aside"><div class="panel-head slim"><h2>验收报告</h2><button class="link-btn" data-action="generate-report">生成</button></div>${state.data.acceptanceReports.slice(0, 3).map((report) => `<article class="version-card"><strong>验收报告</strong><span>${new Date(report.generatedAt).toLocaleString("zh-CN")} · ${report.memberStats.length} 名成员</span></article>`).join("")}</aside>`;
}

function renderMessages() {
  const root = $("#messages");
  if (!root) return;
  root.innerHTML = `<div class="message-grid"><section class="panel"><div class="panel-head"><div><h2>消息同步</h2><p>任务下发、完成、延期、验收支持定向提醒。</p></div><button class="btn primary" data-action="create-rule">${icon("i-plus")}新建规则</button></div><div class="channel-row"><article>${icon("i-sync")}<strong>飞书机器人</strong><span>${state.data.rules.filter((r) => r.channel === "feishu").length} 条规则</span><b class="ok-dot">正常</b></article><article>${icon("i-sync")}<strong>微信公众号</strong><span>${state.data.rules.filter((r) => r.channel === "wechat").length} 条规则</span><b class="warn-dot">需关注</b></article></div><table class="clean-table"><thead><tr><th>事件</th><th>渠道</th><th>对象</th><th>状态</th></tr></thead><tbody>${state.data.rules.map((rule) => `<tr><td>${escapeHtml(rule.event)}</td><td>${escapeHtml(rule.channel)}</td><td>${escapeHtml(rule.targetMode)}</td><td>${rule.enabled ? "启用" : "停用"}</td></tr>`).join("")}</tbody></table></section><aside class="panel log-panel"><div class="panel-head slim"><h2>发送日志</h2><button class="link-btn">筛选</button></div>${state.data.logs.slice(0, 8).map((log) => `<article class="log ok">${escapeHtml(log.channel)}：${escapeHtml(log.message)}</article>`).join("") || "<article class=\"log warn\">暂无发送日志</article>"}</aside></div>`;
}

function renderPermissions() {
  const root = $("#permissions");
  if (!root) return;
  const health = state.data.health || {};
  root.innerHTML = `<div class="admin-console"><section class="panel admin-main"><div class="panel-head"><div><h2>管理中心</h2><p>用户、权限、服务器监控、通知 Key 统一在一个管理板块。</p></div><button class="btn" data-action="create-user">${icon("i-user-plus")}新建用户</button></div><div class="admin-tabs"><button class="active">用户管理</button><button>权限管理</button><button>服务器监控</button><button>通知 Key</button></div><div class="admin-metrics"><article><span>用户</span><strong>${state.data.users.length || "-"}</strong><em>由管理员创建</em></article><article><span>权限项</span><strong>4</strong><em>进度/文件/下载/验收</em></article><article><span>服务器</span><strong>2h2g</strong><em>${escapeHtml(health.memory || "核心版")}</em></article><article><span>会话</span><strong>${escapeHtml(health.websocket || 0)}</strong><em>24h 未操作失效</em></article></div><div class="admin-split"><section class="admin-block"><div class="block-head"><strong>用户管理</strong><button data-action="create-user">新建用户</button></div><table class="clean-table compact-table"><thead><tr><th>用户</th><th>角色</th><th>状态</th><th>皮肤</th></tr></thead><tbody>${state.data.users.map((user) => `<tr><td>${escapeHtml(user.name)}</td><td>${escapeHtml(user.role)}</td><td>${user.enabled ? "启用" : "停用"}</td><td>${escapeHtml(user.theme || "-")}</td></tr>`).join("")}</tbody></table></section><section class="admin-block"><div class="block-head"><strong>权限管理</strong><button>编辑角色</button></div><div class="permission-scope-grid"><article>${icon("i-dashboard")}<strong>进度可见</strong><span>成员甘特、快慢天数、当前状态</span><b>项目授权</b></article><article>${icon("i-doc")}<strong>文件可见</strong><span>项目资料、任务提交物、版本记录</span><b>按角色</b></article><article>${icon("i-export")}<strong>文件下载</strong><span>下载、导出、归档包读取</span><b>默认收紧</b></article><article>${icon("i-check")}<strong>提交物验收</strong><span>通过、退回、验收报告</span><b>创建者</b></article></div></section></div></section><aside class="admin-side"><section class="panel admin-summary-card"><div class="panel-head slim"><h2>服务器摘要</h2><button class="link-btn">展开</button></div><article><strong>低配核心版运行中</strong><span>CPU ${escapeHtml(health.cpu || "normal")} · 内存 ${escapeHtml(health.memory || "-")} · 磁盘 ${escapeHtml(health.disk || "-")}</span><b class="ok-dot">正常</b></article></section><section class="panel admin-summary-card"><div class="panel-head slim"><h2>通知 Key</h2><button class="link-btn" data-action="open-messages">设置</button></div><article><strong>飞书 / 微信</strong><span>Key 由服务端保存，前端只显示状态。</span><button data-action="open-messages">检查状态</button></article></section></aside></div>`;
}

function renderProfile() {
  const root = $("#profile");
  if (!root || !state.user) return;
  root.innerHTML = `<div class="profile-grid"><section class="panel profile-main"><div class="panel-head"><div><h2>用户信息设置</h2><p>头像、用户卡片背景、个性签名和密码集中维护。</p></div><button class="btn primary" data-action="save-profile">${icon("i-save")}保存设置</button></div><div class="profile-editor"><section class="avatar-editor"><span class="avatar big">${escapeHtml(state.user.avatar || "林")}</span><div><strong>头像</strong><p>当前使用文字头像，可上传图片版本。</p><div class="inline-actions"><button>${icon("i-import")}上传头像</button><button>${icon("i-image")}系统头像</button></div></div></section><section class="form-section"><div class="section-title"><strong>基础资料</strong><span>显示在用户卡片和成员信息中。</span></div><label>名称 <input id="profileName" value="${escapeHtml(state.user.name || "")}" /></label><label>头像字 <input id="profileAvatar" value="${escapeHtml(state.user.avatar || "")}" /></label><textarea id="profileSignature" class="signature-input">${escapeHtml(state.user.signature || "")}</textarea></section><section class="form-section"><div class="section-title"><strong>全局皮肤</strong><span>点击卡片切换，作用于全部模块。</span></div><div class="background-picker"><button class="bg-option letter ${state.theme === "letter" ? "active" : ""}" data-action="theme" data-theme="letter"><span>书信</span></button><button class="bg-option love ${state.theme === "love" ? "active" : ""}" data-action="theme" data-theme="love"><span>情书</span></button><button class="bg-option windbell ${state.theme === "windbell" ? "active" : ""}" data-action="theme" data-theme="windbell"><span>风铃木</span></button><button class="bg-option custom" data-action="theme" data-theme="custom"><span>自定义</span></button></div></section><section class="form-section"><div class="section-title"><strong>修改密码</strong><span>留空则不修改。</span></div><div class="password-grid"><label>当前密码 <input id="oldPassword" type="password" autocomplete="current-password" /></label><label>新密码 <input id="newPassword" type="password" autocomplete="new-password" /></label><label>确认新密码 <input id="confirmPassword" type="password" autocomplete="new-password" /></label></div></section></div></section><aside class="panel profile-preview"><div class="panel-head slim"><h2>用户卡片预览</h2><button class="link-btn">应用当前皮肤</button></div><article class="profile-card-preview ${state.theme}"><span class="avatar big">${escapeHtml(state.user.avatar || "林")}</span><strong>${escapeHtml(state.user.name || "")}</strong><em>${state.user.role === "super_admin" ? "超级管理员" : "普通用户"}</em><p>${escapeHtml(state.user.signature || "")}</p><div class="profile-mini-actions"><button>个性化</button><button>用户设置</button></div></article><div class="profile-note"><strong>交互路径</strong><span>点击左下角头像打开用户卡片；再次点击卡片进入本页。</span></div></aside></div>`;
}

function renderGlobal() {
  $("#global").innerHTML = `<div class="hero-grid"><section class="panel global-focus"><div class="panel-head"><div><h2>全局框架</h2><p>当前系统已接入真实后端：项目、任务、文件、提交物、消息和权限都由 API 驱动。</p></div><button class="btn" data-action="open-dashboard">返回行动台</button></div><div class="layout-demo"><div class="mini-side"><span></span><i></i><i></i><i></i><i></i><i></i></div><div class="mini-content"><div class="mini-top"></div><div class="mini-large"></div><div class="mini-row"><span></span><span></span><span></span></div></div><aside class="mini-aside"><span></span><span></span><span></span></aside></div></section></div>`;
}

function renderSupport() {
  $("#support").innerHTML = `<div class="support-grid"><section class="panel"><div class="panel-head"><div><h2>后台支撑能力</h2><p>轻量部署使用 Node HTTP 服务和 JSON 存储，后续可平滑迁移 SQLite/PostgreSQL。</p></div><button class="btn" data-action="open-permissions">管理中心</button></div><div class="service-map"><article>Web Client<span>静态资源 + API</span></article><article>Progress API<span>成员进度 / 上报 / 甘特</span></article><article>Submission Hub<span>任务提交物 / 文件收集箱</span></article><article>Event Center<span>时间线 / 审计 / 定向提醒</span></article></div></section><aside class="panel"><div class="panel-head slim"><h2>服务状态</h2></div><article class="status-line"><strong>Node 服务</strong><span>运行中</span><b class="ok-dot">正常</b></article><article class="status-line"><strong>JSON Store</strong><span>轻量核心版</span><b class="ok-dot">正常</b></article></aside></div>`;
}

function markdownToHtml(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  return lines.map((line) => {
    if (line.startsWith("# ")) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
    if (line.startsWith("## ")) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
    if (line.startsWith("- ")) return `<p>• ${escapeHtml(line.slice(2))}</p>`;
    if (!line.trim()) return "<p><br></p>";
    return `<p>${escapeHtml(line)}</p>`;
  }).join("");
}

function htmlToMarkdown(node) {
  return Array.from(node.childNodes).map((child) => {
    const text = child.textContent.trim();
    if (!text) return "";
    if (child.tagName === "H1") return `# ${text}`;
    if (child.tagName === "H2") return `## ${text}`;
    if (text.startsWith("• ")) return `- ${text.slice(2)}`;
    return text;
  }).join("\n\n");
}

function extractHeadings(content) {
  return String(content || "").split(/\r?\n/).filter((line) => line.startsWith("#")).map((line) => line.replace(/^#+\s*/, ""));
}

function sheetToContent() {
  const rows = $$("#sheetGrid tbody tr").map((row) => $$("td", row).map((cell) => cell.textContent.trim()));
  return rows;
}

function formatDelta(days) {
  const value = Number(days || 0);
  if (value === 0) return "准时";
  return value > 0 ? `慢 ${value} 天` : `快 ${Math.abs(value)} 天`;
}

function riskSummary() {
  const delayed = state.data.tasks.filter((task) => task.assignments?.some((item) => ["delayed", "blocked"].includes(item.status))).length;
  const pending = state.data.submissions.filter((item) => item.status === "submitted").length;
  if (!delayed && !pending) return "当前没有明显阻塞，项目主线可继续推进。";
  return `${delayed} 个延期/阻塞节点，${pending} 份提交物待验收。`;
}

function bindDynamicDrag() {
  let dragged = null;
  $$(".drop-col .task").forEach((task) => {
    task.addEventListener("dragstart", (event) => {
      dragged = task;
      task.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
    });
    task.addEventListener("dragend", () => {
      task.classList.remove("is-dragging");
      dragged = null;
    });
  });
  $$(".drop-col").forEach((column) => {
    column.addEventListener("dragover", (event) => {
      if (!dragged) return;
      event.preventDefault();
      column.classList.add("is-over");
    });
    column.addEventListener("dragleave", () => column.classList.remove("is-over"));
    column.addEventListener("drop", async (event) => {
      event.preventDefault();
      if (!dragged) return;
      const taskId = dragged.dataset.taskId;
      const status = column.dataset.status === "done" ? "done" : column.dataset.status;
      column.classList.remove("is-over");
      await api(`/tasks/${taskId}`, { method: "PATCH", body: jsonBody({ status }) });
      await refreshProject();
      renderWorkspace();
    });
  });
}

async function handleAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  try {
    if (action === "open-dashboard") setView("dashboard", { sidebar: "expanded" });
    if (action === "open-projects") setView("project-list", { sidebar: "expanded" });
    if (action === "open-workspace") setView("workspace", { sidebar: "expanded" });
    if (action === "open-files") setView("files", { sidebar: "compact" });
    if (action === "open-messages") setView("messages", { sidebar: "expanded" });
    if (action === "open-permissions") setView("permissions", { sidebar: "expanded" });
    if (action === "select-project") await selectProject(button.dataset.projectId);
    if (action === "create-project" || action === "create-project-form") await createProject();
    if (action === "invite-member") await inviteMember();
    if (action === "create-task") await createTask();
    if (action === "assignment-complete") await assignmentAction(button.dataset.assignmentId, "complete", { note: "前端标记完成", nextAction: "rest" });
    if (action === "assignment-delay") await assignmentAction(button.dataset.assignmentId, "delay", { delayTo: "2026-06-08", reason: "前端上报延期" });
    if (action === "assignment-block") await assignmentAction(button.dataset.assignmentId, "block", { reason: "前端标记阻塞" });
    if (action === "assignment-submit") await submitAssignment(button.dataset.assignmentId);
    if (action === "assignment-continue") await assignmentAction(button.dataset.assignmentId, "continue", {});
    if (action === "assignment-rest") await assignmentAction(button.dataset.assignmentId, "rest", {});
    if (action === "assignment-remind") await assignmentAction(button.dataset.assignmentId, "remind-creator", {});
    if (action === "assignment-abandon") await assignmentAction(button.dataset.assignmentId, "abandon", { reason: "前端标记放弃" });
    if (action === "select-file") selectFile(button.dataset.fileId);
    if (action === "open-collection") openCollection();
    if (action === "create-doc") await createFile("word_doc");
    if (action === "create-sheet") await createFile("sheet");
    if (action === "save-file") await saveActiveFile();
    if (action === "rename-file") await renameActiveFile();
    if (action === "delete-file") await deleteActiveFile();
    if (action === "accept-submission") await reviewSubmission(button.dataset.submissionId, "accept");
    if (action === "rework-submission") await reviewSubmission(button.dataset.submissionId, "rework");
    if (action === "generate-report") await generateReport();
    if (action === "create-rule") await createRule();
    if (action === "create-user") await createUser();
    if (action === "save-profile") await saveProfile();
    if (action === "theme") await setTheme(button.dataset.theme);
  } catch (error) {
    toast(error.message || "操作失败");
  }
}

async function selectProject(projectId) {
  state.selectedProjectId = projectId;
  localStorage.setItem("lighttask_project", projectId);
  await refreshProject();
  setView("workspace", { sidebar: "expanded" });
}

async function createProject() {
  const name = $("#quickProjectName")?.value?.trim() || `新项目 ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  const baselineEnd = $("#quickProjectEnd")?.value || "2026-07-12";
  const result = await api("/projects", { method: "POST", body: jsonBody({ name, group: "客户交付", baselineEnd }) });
  state.selectedProjectId = result.project.id;
  await refreshAll();
  setView("workspace", { sidebar: "expanded" });
}

async function inviteMember() {
  const member = state.data.members.find((item) => item.userId === "u_member") ? "member" : "u_member";
  await api(`/projects/${state.selectedProjectId}/members/invite`, { method: "POST", body: jsonBody({ username: member, role: "editor" }) });
  await refreshProject();
  renderWorkspace();
}

async function createTask() {
  const project = selectedProject();
  const title = $("#quickTaskTitle")?.value?.trim() || "新协作任务";
  const userId = $("#quickTaskUser")?.value || state.data.members[0]?.userId || state.user.id;
  await api(`/projects/${project.id}/tasks`, { method: "POST", body: jsonBody({ title, priority: "medium", baselineStart: "2026-06-02", baselineEnd: "2026-06-07", currentStart: "2026-06-02", currentEnd: "2026-06-07", assignments: [{ userId, planStart: "2026-06-02", planEnd: "2026-06-07" }] }) });
  await refreshProject();
  renderWorkspace();
}

async function assignmentAction(id, action, body) {
  await api(`/task-assignments/${id}/${action}`, { method: "POST", body: jsonBody(body) });
  await refreshAll();
  renderCurrentView();
}

async function submitAssignment(id) {
  await api(`/task-assignments/${id}/submissions`, { method: "POST", body: jsonBody({ name: `成果文件-${Date.now().toString(36)}.docx`, fileType: "word_doc", content: "# 任务成果\n\n已完成并提交验收。" }) });
  await refreshProject();
  setView("files", { sidebar: "compact" });
  state.selectedFileMode = "collection";
  renderFiles();
}

function selectFile(fileId) {
  state.selectedFileId = fileId;
  state.selectedFileMode = "document";
  renderFiles();
}

function openCollection() {
  state.selectedFileMode = "collection";
  renderFiles();
}

async function createFile(type) {
  const name = type === "sheet" ? `协同表格-${Date.now().toString(36)}.xlsx` : `协作文档-${Date.now().toString(36)}.docx`;
  const content = type === "sheet" ? [["成员", "任务", "状态"], [state.user.name, "新任务", "待处理"]] : "# 新文档\n\n输入内容开始协作。";
  const result = await api(`/projects/${state.selectedProjectId}/files`, { method: "POST", body: jsonBody({ name, type, content }) });
  await refreshProject();
  state.selectedFileId = result.file.id;
  state.selectedFileMode = "document";
  renderFiles();
}

async function saveActiveFile() {
  const file = state.data.files.find((item) => item.id === state.selectedFileId);
  if (!file) return;
  const name = $("#activeFileName")?.textContent?.trim() || file.name;
  if (name !== file.name) await api(`/project-files/${file.id}`, { method: "PATCH", body: jsonBody({ name }) });
  if (file.type === "sheet") {
    await api(`/project-files/${file.id}/sheet`, { method: "PATCH", body: jsonBody({ cells: sheetToContent() }) });
  } else {
    await api(`/project-files/${file.id}/document`, { method: "PATCH", body: jsonBody({ content: htmlToMarkdown($("#docContent")) }) });
  }
  await refreshProject();
  renderFiles();
  toast("已保存");
}

async function renameActiveFile() {
  const file = state.data.files.find((item) => item.id === state.selectedFileId);
  const name = prompt("文件名称", file?.name || "");
  if (!file || !name) return;
  await api(`/project-files/${file.id}`, { method: "PATCH", body: jsonBody({ name }) });
  await refreshProject();
  renderFiles();
}

async function deleteActiveFile() {
  const file = state.data.files.find((item) => item.id === state.selectedFileId);
  if (!file) return;
  await api(`/project-files/${file.id}`, { method: "DELETE" });
  await refreshProject();
  renderFiles();
}

async function reviewSubmission(id, action) {
  await api(`/task-submissions/${id}/${action}`, { method: "POST", body: jsonBody({ note: action === "accept" ? "前端验收通过" : "前端退回修改" }) });
  await refreshProject();
  renderFiles();
}

async function generateReport() {
  await api(`/projects/${state.selectedProjectId}/acceptance/report/generate`, { method: "POST", body: jsonBody({ note: "前端生成验收报告" }) });
  await refreshProject();
  renderFiles();
}

async function createRule() {
  await api("/notification-rules", { method: "POST", body: jsonBody({ event: "task.submission_created", channel: "feishu", targetMode: "creator", targets: [] }) });
  await refreshAdminData();
  renderMessages();
}

async function createUser() {
  const username = `user${Date.now().toString(36).slice(-4)}`;
  await api("/admin/users", { method: "POST", body: jsonBody({ username, password: "user123", name: `协作成员${username.slice(-2)}`, role: "member" }) });
  await refreshAdminData();
  renderPermissions();
}

async function saveProfile() {
  const name = $("#profileName")?.value || state.user.name;
  const avatar = $("#profileAvatar")?.value || state.user.avatar;
  const signature = $("#profileSignature")?.value || "";
  const user = await api("/auth/me/profile", { method: "PATCH", body: jsonBody({ name, avatar, signature }) });
  applyUser(user.user);
  const oldPassword = $("#oldPassword")?.value;
  const newPassword = $("#newPassword")?.value;
  const confirm = $("#confirmPassword")?.value;
  if (newPassword || confirm || oldPassword) {
    if (newPassword !== confirm) throw new Error("两次新密码不一致");
    await api("/auth/me/password", { method: "PATCH", body: jsonBody({ oldPassword, newPassword }) });
  }
  renderProfile();
  toast("资料已保存");
}

async function setTheme(theme) {
  if (!theme) return;
  state.theme = theme;
  document.body.dataset.theme = theme;
  localStorage.setItem("lighttask_theme", theme);
  $$(".skin-card").forEach((card) => {
    const active = card.classList.contains(theme);
    card.classList.toggle("active", active);
    card.classList.toggle("ghost", !active);
  });
  $$(".bg-option").forEach((card) => card.classList.toggle("active", card.classList.contains(theme)));
  if (state.token) {
    const result = await api("/auth/me/theme", { method: "PATCH", body: jsonBody({ theme, customBackground: "", blur: 16 }) });
    applyUser(result.user);
  }
  if (state.view === "profile") renderProfile();
}

function toast(message) {
  let node = $("#toast");
  if (!node) {
    node = document.createElement("div");
    node.id = "toast";
    node.className = "toast";
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.dataset.show = "true";
  setTimeout(() => {
    node.dataset.show = "false";
  }, 1600);
}

function bindShell() {
  $("#loginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const error = $("#loginError");
    if (error) error.textContent = "";
    try {
      const data = await api("/auth/login", { method: "POST", body: jsonBody({ username: form.get("username"), password: form.get("password") }) });
      setSession(data.token, data.user);
      await refreshAll();
      setView("dashboard", { sidebar: "expanded" });
    } catch (err) {
      if (error) error.textContent = err.message;
    }
  });

  $$("[data-nav]").forEach((item) => {
    item.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!state.token) return;
      if (["files", "workspace", "dashboard", "project-list"].includes(item.dataset.nav)) await refreshAll();
      setView(item.dataset.nav, { sidebar: item.dataset.nav === "files" ? "compact" : "expanded" });
    });
  });

  $(".collapse-btn")?.addEventListener("click", () => {
    document.body.dataset.sidebar = document.body.dataset.sidebar === "compact" ? "expanded" : "compact";
  });

  $(".account-trigger")?.addEventListener("click", () => {
    document.body.dataset.personalize = document.body.dataset.personalize === "skins" ? "closed" : "skins";
  });

  $("[data-open-profile]")?.addEventListener("click", () => {
    document.body.dataset.personalize = "closed";
    setView("profile", { sidebar: document.body.dataset.sidebar || "expanded" });
  });

  $("[data-logout]")?.addEventListener("click", async () => {
    try {
      if (state.token) await api("/auth/logout", { method: "POST", body: "{}" });
    } finally {
      clearSession();
    }
  });

  $$(".skin-card").forEach((card) => {
    card.addEventListener("click", () => {
      const theme = ["letter", "love", "windbell"].find((name) => card.classList.contains(name));
      setTheme(theme);
    });
  });

  $$(".skin-arrow").forEach((button, index) => {
    button.addEventListener("click", () => {
      const order = ["letter", "love", "windbell"];
      const current = order.indexOf(document.body.dataset.theme || "letter");
      setTheme(order[(current + (index === 0 ? order.length - 1 : 1)) % order.length]);
    });
  });

  document.addEventListener("click", handleAction);
}

async function bootstrap() {
  bindShell();
  document.body.dataset.theme = state.theme;
  if (!state.token || !state.user) {
    clearSession();
    return;
  }
  try {
    const me = await api("/auth/me");
    applyUser(me.user);
    await refreshAll();
    setView("dashboard", { sidebar: "expanded" });
  } catch {
    clearSession();
  }
}

bootstrap();
