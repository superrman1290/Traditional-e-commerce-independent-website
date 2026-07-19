# Traditional Ecommerce Independent Website

单商户 B2C 实物商品电商独立站。当前仓库已完成 **阶段 3：结算、运费和订单**。

## 当前功能

- Monorepo: npm workspaces
- 前台：Next.js + TypeScript，商品列表、商品详情、账户、地址、购物车和结算页
- 后台：Next.js + TypeScript，商品、SKU、库存和订单查看
- API：NestJS + TypeScript，健康检查、商品、库存、认证、地址、购物车、结算和订单
- 数据库：PostgreSQL + Prisma migrations
- 缓存/队列预留：Redis
- 本地文件存储：MinIO
- 测试：Vitest + Playwright
- CI：GitHub Actions

阶段 3 不包含支付、发货、物流、确认收货或售后功能。

## 目录结构

```text
apps/
  storefront/        用户购物前台
  admin/             商家运营后台
  api/               后端 API
packages/
  database/          Prisma schema、迁移和 seed
  shared/            公共类型和工具
  ui/                公共 UI 组件
  config/            公共配置读取
docs/
  PRD.md
  STAGE_0.md
  STAGE_1.md
  STAGE_2.md
  STAGE_3.md
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

5. 生成 Prisma Client、应用迁移并写入种子数据：

```powershell
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
```

6. 启动三个应用：

```powershell
npm run dev
```

默认地址：

- 前台：http://localhost:3000
- 后台：http://localhost:3001
- API 健康检查：http://localhost:4000/health
- PostgreSQL：localhost:5433
- Redis：localhost:6380
- MinIO 控制台：http://localhost:9001

如果本机 `3000` 已被其他项目占用，可在 `apps/storefront` 下临时运行：

```powershell
node ..\..\node_modules\next\dist\bin\next dev -p 3002
```

## API

公开接口：

- `GET /health`
- `GET /categories`
- `GET /products`
- `GET /products/:slug`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /guest-sessions`
- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/:id`
- `DELETE /cart/items/:id`
- `POST /cart/merge`
- `GET /addresses`
- `POST /addresses`
- `PATCH /addresses/:id`
- `DELETE /addresses/:id`
- `GET /checkout/summary`
- `POST /orders`
- `GET /orders`
- `GET /orders/:id`
- `POST /orders/expire`

后台接口：

- `GET /admin/products`
- `POST /admin/products`
- `PATCH /admin/products/:id/status`
- `POST /admin/inventory/adjustments`
- `GET /admin/inventory/records`
- `GET /admin/orders`
- `POST /admin/orders/expire`

购物车接口优先读取 `Authorization: Bearer <token>`。未登录时使用 `X-Guest-Session-Id`。结算和订单接口需要登录。

## 数据库

阶段 3 新增业务表：

- `shipping_templates`
- `coupons`
- `orders`
- `order_items`

常用命令：

```powershell
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run db:seed
```

## 验证命令

```powershell
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## 已知问题

- `npm run dev` 是长运行命令，需要使用 `Ctrl+C` 停止。
- 当前后台接口尚未接入登录和权限控制。
- 当前商品图片使用远程 Unsplash URL；生产环境应替换为 MinIO/S3 等对象存储中的商家图片。
- 在 Windows 上如果一边运行 Next dev 服务一边执行 `next build`，`.next` 缓存可能出现开发产物错位；重启 dev 服务并清理对应应用的 `.next` 可恢复。
