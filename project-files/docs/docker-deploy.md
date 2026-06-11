# LightTask Docker 一键部署

## 快速启动

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

首次启动会自动复制 `.env.docker.example` 为 `.env.docker`，并生成 `JWT_SECRET` 与 `SECRET_ENCRYPTION_KEY`。
如果你不用脚本，必须先手动准备 `.env.docker`，否则 compose 会因为缺少生产密钥而拒绝启动。

## 服务入口

- Web: `http://localhost:8080`
- API: `http://localhost:3000/api/health/ready`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

端口、管理员账号、飞书配置和公网回调域名都在 `.env.docker` 中修改。

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

## 飞书回调

如果要使用飞书交互卡片，把 `.env.docker` 中的 `PUBLIC_BASE_URL` 配置为公网 HTTPS 域名，例如：

```env
PUBLIC_BASE_URL=https://lighttask.example.com
```

然后在飞书开放平台配置卡片回调：

```text
https://lighttask.example.com/api/feishu/card-callback
```
