# LightTask v10 文档索引

v10 是在 v9 项目协同闭环基础上的“成员进度版”。本版本不新增学习系统、重型网盘或工时系统，而是把第一批真实协作所需能力沉入项目任务模型：成员级任务进度、计划基线与实际进度、个人进度仪表盘、任务上报动作、任务文件提交和项目文件收集箱。

## 文档结构

- [product-memory-v10.md](product-memory-v10.md)：产品记忆，记录 v10 不可偏移的定位、体验原则、模块边界和技术取向。
- [function-tree-v10.md](function-tree-v10.md)：功能树，从全局框架到项目生命周期、成员进度、资料提交、消息和管理的完整层级。
- [design-style-v10.md](design-style-v10.md)：全局视觉风格、低饱和主题、布局比例、动效和图标规则。
- [module-details-v10.md](module-details-v10.md)：各功能模块的页面目标、重点信息、交互逻辑、隐藏信息和日志事件。
- [implementation-framework-v10.md](implementation-framework-v10.md)：整体实现框架、推荐技术栈、实时协同、数据模型、权限和部署路线。

## 当前产品一句话

LightTask v10 是一个轻量级多人项目协同系统，以项目主线、成员进度、资料提交、计划对比、消息提醒和验收复盘为核心，帮助小团队清楚知道“谁在做什么、进度快慢多少、文件交了没有、下一步该提醒谁”。

## v10 核心变化

- 保留 v9 的全局框架、登录框、头像个性化、项目工作台、项目文件、消息同步和管理中心。
- 新增成员级任务进度：一个任务可拆到多个成员，每个成员有自己的计划、实际完成、状态、提交物和说明。
- 新增计划基线、当前计划、实际进度三层时间，用于计算快/慢预期多少天。
- 仪表盘新增“我的进度”视角，展示今日、本周、本月完成情况、预计完成日期和快慢天数。
- 项目工作台新增任务上报动作：完成、延期、阻塞、放弃、休息一下、继续下一任务、上传成果、提醒创建者。
- 项目文件合并在线文档、在线表格、附件和文件收集箱；Word、表格、附件点一下即可在同一工作区打开，并支持新建、上传、重命名、删除、导出。
- 甘特图新增原计划、当前计划、成员视图和团队汇总视图，避免把所有成员节点堆在一张图里。
- 权限模型预留进度可见和文件可见的拆分，第一批界面先展示主要入口。
- 验收归档将逐步汇总成员完成时间、快慢天数和文件提交状态。

## 第一批已加入核心版

1. 成员级任务进度。
2. 计划基线 / 当前计划 / 实际进度。
3. 个人进度仪表盘。
4. 任务上报动作。
5. 项目文件统一管理：Word、表格、附件、任务提交物和项目文件收集箱。

## v10 效果图

运行 `node scripts/render-mockups-v10.cjs` 后生成：

- [登录框](../../mockups-v10/images/00-login.png)
- [全局框架与个性化](../../mockups-v10/images/01-global-shell-personalization.png)
- [仪表盘与个人进度](../../mockups-v10/images/02-dashboard.png)
- [项目列表](../../mockups-v10/images/03-project-list.png)
- [项目工作台与成员进度](../../mockups-v10/images/04-project-workspace.png)
- [项目文件：Word / 表格 / 附件统一工作区](../../mockups-v10/images/05-project-files.png)
- [消息同步](../../mockups-v10/images/06-message-sync.png)
- [管理中心](../../mockups-v10/images/07-permissions.png)
- [后台支撑](../../mockups-v10/images/08-system-support.png)
- [用户信息设置](../../mockups-v10/images/09-user-settings.png)
