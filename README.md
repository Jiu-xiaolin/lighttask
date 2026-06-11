# LightTask

这个仓库已整理为两个主目录：

- `source/`：可运行的项目源码、Docker 部署文件、启动脚本和环境变量模板。
- `project-files/`：开发文档、产品说明和许可证等项目资料。

开发或部署时请先进入源码目录：

```powershell
cd source
npm install
npm run build
```

Docker 一键部署：

```powershell
cd source
.\deploy-docker.cmd
```

本地开发环境：

```powershell
cd source
.\start-dev.cmd
```
