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

Linux 服务器从 GitHub 拉取并自动部署：

```bash
curl -fsSL https://raw.githubusercontent.com/Jiu-xiaolin/lighttask/main/install-linux.sh | bash
```

指定安装目录：

```bash
curl -fsSL https://raw.githubusercontent.com/Jiu-xiaolin/lighttask/main/install-linux.sh | bash -s -- --dir /opt/lighttask
```

```powershell
cd source
.\deploy-docker.cmd
```

Linux:

```bash
cd source
chmod +x ./deploy-docker.sh
./deploy-docker.sh --rebuild
```

本地开发环境：

```powershell
cd source
.\start-dev.cmd
```

Linux 部署后配置公网访问地址：

```bash
cd /opt/lighttask/source
./scripts/configure-public-url.sh http://your-server-ip:8080
```
