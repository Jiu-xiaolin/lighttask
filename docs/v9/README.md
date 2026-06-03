# LightTask v9 文档索引

v9 是当前收敛版本，用来替代前面分散的阶段性文档，作为后续继续出效果图、拆任务、写代码和评审设计的基准。

## 文档结构

- [product-memory-v9.md](product-memory-v9.md)：产品记忆，记录当前不可偏移的定位、体验原则、模块边界和技术取向。
- [function-tree-v9.md](function-tree-v9.md)：功能树，从全局框架到项目生命周期、项目资料、消息和管理的完整层级。
- [design-style-v9.md](design-style-v9.md)：全局视觉风格、低饱和主题、布局比例、动效和图标规则。
- [module-details-v9.md](module-details-v9.md)：各功能模块的页面目标、重点信息、交互逻辑、隐藏信息和日志事件。
- [implementation-framework-v9.md](implementation-framework-v9.md)：整体实现框架、推荐技术栈、实时协同、数据模型、权限和部署路线。

## 当前产品一句话

LightTask 是一个轻量级多人项目协同系统，以行动仪表盘、项目工作台、项目资料协同、变更时间线、消息同步和验收归档为核心，强调清晰、优雅、低干扰的操作体验。

## v9 核心变化

- 全局不再以单个编辑器为中心，而是回到项目协同系统本身。
- v9 收敛为项目生命周期闭环：创建项目、邀请成员、拆解任务、协同执行、留痕提醒、风险处理、验收归档。
- 新增高端简约登录页，第一版只保留一个账号密码登录框，框内保留一句系统简介，不设计注册和产品展示侧栏。
- 左侧导航支持矩形缩小为图标栏，主功能区随之优雅扩展。
- 个性化是登录后的功能，入口只保留在左下角头像用户卡片中，以卡片式切换皮肤；用户卡片可进入头像、卡片背景、签名和密码设置。
- 项目变更时间线固定为右侧边栏，不再占据主工作区。
- 在线文档和表格收敛为项目资料，不再作为割裂的独立产品。
- 文档编辑器贴近轻量 Word 协作场景，工具区图标化，支持 Markdown 快捷输入、评论、版本和轻量导入导出。
- 表格编辑器贴近轻量在线表格高频场景，工具区图标化，强调公式栏、冻结、筛选、CSV/简单 XLSX 和协同。
- 表格转储、大批量数据迁移和高保真 Office/WPS 转换不进入核心版，只作为后置插件能力。
- 系统支撑能力不作为普通用户主导航，只保留给管理员或技术实现文档。
- 用户管理、权限管理、服务器监控、飞书/微信 Key 设置与状态融合进管理中心。

## 视觉参考

当前 v9 文档继承 v8 效果图作为视觉基准，后续如需重新出图，应按 v9 文档进一步收敛：

- [仪表盘参考图](../../mockups-v8/images/01-dashboard.png)
- [项目工作台参考图](../../mockups-v8/images/02-project-workspace.png)
- [在线文档参考图](../../mockups-v8/images/03-online-doc-editor.png)
- [在线表格参考图](../../mockups-v8/images/04-online-sheet-editor.png)
- [个性化菜单参考图](../../mockups-v8/images/16-personalization-menu.png)
- [皮肤轮播参考图](../../mockups-v8/images/17-personalization-skin-carousel.png)
- [收起侧栏参考图](../../mockups-v8/images/19-sidebar-compact-dashboard.png)
