# 阶段 0：项目骨架

本阶段只交付项目运行骨架，不提前实现商品、购物车、订单或支付业务功能。

## 交付范围

- Monorepo 根目录和 npm workspaces
- `apps/storefront` 用户购物前台
- `apps/admin` 运营后台
- `apps/api` NestJS API，包含 `GET /health`
- `packages/database` Prisma schema 和基础迁移
- `packages/shared` 公共类型与工具
- `packages/ui` 公共 UI 组件
- `packages/config` 公共配置读取
- PostgreSQL、Redis、MinIO 的 Docker Compose
- ESLint、TypeScript、Vitest、Playwright 基础配置
- GitHub Actions CI
- Windows 本地启动说明

## 验收命令

```bash
docker compose up -d
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

