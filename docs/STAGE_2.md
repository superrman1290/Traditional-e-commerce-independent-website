# 阶段 2：用户、地址和购物车

## 交付范围

- 用户注册、登录和登录态查询。
- 游客会话创建。
- 登录用户地址簿增删改查。
- 游客购物车和登录用户购物车。
- 登录或注册后合并游客购物车。
- 购物车查询时重新校验 SKU 当前价格、商品状态和可售库存。

## 不包含

- 结算页。
- 运费、优惠码、订单、库存锁定。
- 支付、发货、售后。

## API

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

购物车接口优先读取 `Authorization: Bearer <token>`。未登录时使用 `X-Guest-Session-Id`。

## 验收重点

- 游客添加商品后，登录或注册会把游客购物车合并到用户购物车。
- SKU 价格被后台调整后，购物车项返回 `priceChanged: true` 并保留加入时价格快照。
- SKU 当前可售库存小于购物车数量时，购物车返回 `hasStockIssues: true` 和 `canCheckout: false`。

## Git 标签

```text
v0.3.0-user-cart
```

