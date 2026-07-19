# 阶段 3：结算、运费和订单

## 交付范围

- 前台结算页。
- 运费模板。
- 优惠码。
- 订单创建。
- 商品快照和地址快照。
- 下单时锁定库存。
- 订单超时关闭并释放锁定库存。
- 后台订单查看。

## 不包含

- 支付渠道、支付回调、支付状态流转。
- 发货、物流、确认收货、售后。

## API

- `GET /checkout/summary`
- `POST /orders`
- `GET /orders`
- `GET /orders/:id`
- `POST /orders/expire`
- `GET /admin/orders`
- `POST /admin/orders/expire`

订单接口需要 `Authorization: Bearer <token>`。订单创建只读取服务端购物车、SKU 当前价格、地址和优惠码配置，忽略前端金额参数。

## 验收重点

- 前端不能通过修改金额参数影响订单金额。
- 下单事务中使用数据库原子更新锁定库存，库存不足会阻止订单创建。
- 订单超时关闭会释放 `locked_stock_quantity`。
- `idempotencyKey` 和 `cartId` 唯一约束共同防止重复提交创建重复订单。

## Git 标签

```text
v0.4.0-checkout-order
```

