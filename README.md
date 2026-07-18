# Traditional Ecommerce Independent Website

单商户 B2C 实物商品电商独立站。当前仓库处于 **阶段 0：项目骨架**，只包含可运行的工程基础设施，不包含商品、购物车、订单或支付业务功能。

## 技术栈

- Monorepo: npm workspaces
- 前台: Next.js + TypeScript
- 后台: Next.js + TypeScript
- API: NestJS + TypeScript
- 数据库: PostgreSQL + Prisma
- 缓存/队列预留: Redis
- 本地文件存储: MinIO
- 测试: Vitest + Playwright
- CI: GitHub Actions

## 目录结构

```text
apps/
  storefront/        用户购物前台
  admin/             商家运营后台
  api/               后端 API
packages/
  database/          Prisma schema、迁移和数据库包入口
  shared/            公共类型和工具
  ui/                公共 UI 组件
  config/            公共配置读取
docker-compose.yml
docs/
  PRD.md
  STAGE_0.md
```

## Windows 本地启动

1. 安装 Node.js 20.11 或更高版本、Docker Desktop 和 Git。
2. 复制环境变量文件：

```powershell
Copy-Item .env.example .env
```

3. 启动基础设施：

```powershell
docker compose up -d
```

4. 安装依赖：

```powershell
npm install
```

如果 PowerShell 提示 `npm.ps1 cannot be loaded because running scripts is disabled`，可改用：

```powershell
npm.cmd install
```

5. 生成 Prisma Client：

```powershell
npm run prisma:generate
```

6. 启动三个应用：

```powershell
npm run dev
```

默认地址：

- 前台: http://localhost:3000
- 后台: http://localhost:3001
- API 健康检查: http://localhost:4000/health
- PostgreSQL: localhost:5433
- MinIO 控制台: http://localhost:9001
- Redis: localhost:6380

## 验证命令

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

## Prisma

Prisma schema 位于 `packages/database/prisma/schema.prisma`。本阶段提供基础 `system_settings` 表，用于验证迁移链路，不承载后续电商业务数据。

常用命令：

```powershell
npm run prisma:generate
npm run prisma:migrate
```

## 环境变量

所有本地开发环境变量记录在 `.env.example`，包括：

- `DATABASE_URL`
- `POSTGRES_PORT`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `REDIS_URL`
- `REDIS_PORT`
- `MINIO_ROOT_USER`
- `MINIO_ROOT_PASSWORD`
- `MINIO_ENDPOINT`
- `MINIO_BUCKET`
- `STOREFRONT_URL`
- `ADMIN_URL`
- `API_URL`
- `API_PORT`

## 当前阶段已知问题

- `npm run dev` 是长运行命令，需要使用 `Ctrl+C` 停止。
- 需要 Docker Desktop 正常运行后，PostgreSQL、Redis 和 MinIO 才能启动。
- 阶段 0 尚未接入真实业务表、认证、订单、支付或文件上传功能。
