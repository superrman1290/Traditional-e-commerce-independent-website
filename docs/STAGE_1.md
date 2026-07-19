# 阶段 1：商品和库存

本阶段只交付商品和库存能力，不实现用户、购物车、订单或支付。

## 已交付

- 商品分类表和公开分类查询
- 商品主表、商品图片、规格项、规格值
- 多 SKU 商品模型
- 每个 SKU 独立价格、库存、锁定库存、库存预警值
- 库存调整接口，调整时写入库存流水
- 后台商品列表、商品创建、上下架、SKU 库存调整
- 前台商品列表和商品详情页
- 下架商品从公开商品接口和详情接口隐藏
- 阶段 1 seed 数据

## 验收重点

- 同一商品可以有多个 SKU
- 每个 SKU 有独立价格和库存
- 下架商品不能从前台接口查看
- 库存变化有 `inventory_records` 流水记录

## 本地验收

```powershell
docker compose up -d
npm install
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run dev
```

打开：

- 前台商品列表: http://localhost:3000
- 后台商品管理: http://localhost:3001
- API 商品列表: http://localhost:4000/products

如果 `3000` 已被占用，可临时使用：

```powershell
cd apps/storefront
node node_modules/next/dist/bin/next dev -p 3002
```

