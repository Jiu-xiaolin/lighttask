# LightTask Docker 一键部署

## 快速启动

Linux 服务器从 GitHub 拉取并自动部署：

```bash
curl -fsSL https://raw.githubusercontent.com/Jiu-xiaolin/lighttask/main/install-linux.sh | bash
```

指定目录、分支或查看日志：

```bash
curl -fsSL https://raw.githubusercontent.com/Jiu-xiaolin/lighttask/main/install-linux.sh | bash -s -- --dir /opt/lighttask --branch main --logs
```

脚本会把仓库部署到 `/opt/lighttask`，目录已存在且是 Git 仓库时会自动拉取 `main` 最新代码并重新部署。

Windows:

```powershell
cd source
.\deploy-docker.cmd
```

或：

```powershell
cd source
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\deploy-docker.ps1 -Rebuild
```

Linux:

```bash
cd source
chmod +x ./deploy-docker.sh
./deploy-docker.sh --rebuild
```

Linux 脚本会在缺少 Docker 时尝试自动安装 Docker Engine，优先使用 `docker compose`，如果系统只有旧版 `docker-compose` 也会自动兼容；缺少 OpenSSL 时会尝试通过系统包管理器安装。首次启动会自动复制 `.env.docker.example` 为 `.env.docker`，并生成 `POSTGRES_PASSWORD`、`JWT_SECRET` 与 `SECRET_ENCRYPTION_KEY`。
如果你不用脚本，必须先手动准备 `.env.docker`，否则 compose 会因为缺少生产密钥而拒绝启动。

## 服务入口

- Web: `http://localhost:8080`
- API: `http://localhost:3000/api/health/ready`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

端口、管理员账号、飞书配置和公网回调域名都在 `.env.docker` 中修改。

也可以用脚本配置公网访问地址并自动重启 API/Web：

```bash
cd /opt/lighttask/source
./scripts/configure-public-url.sh http://your-server-ip:8080
```

## 数据持久化

Docker volume:

- `postgres-data`: PostgreSQL 业务数据
- `redis-data`: Redis 缓存、提醒去重和交互状态
- `api-uploads`: 头像和项目附件

## 常用命令

```powershell
cd source
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f
docker compose --env-file .env.docker down
docker compose --env-file .env.docker up -d --build
```

也可以使用脚本查看日志：

```powershell
cd source
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\deploy-docker.ps1 -Logs
```

Linux:

```bash
cd source
./deploy-docker.sh --logs
```

## 飞书回调

如果要使用飞书交互卡片，把 `.env.docker` 中的 `PUBLIC_BASE_URL` 配置为公网 HTTPS 域名，例如：

```env
PUBLIC_BASE_URL=https://lighttask.example.com
```

然后在飞书开放平台配置卡片回调：

```text
https://lighttask.example.com/api/feishu/card-callback
```
