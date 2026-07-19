# 阶段 5：发货和订单完成

## 交付范围

- 后台发货
- 物流公司
- 物流单号
- 用户查看物流信息
- 用户确认收货
- 自动确认收货
- 订单完成

## API

- `POST /admin/orders/:id/shipment`
- `POST /orders/:id/confirm-receipt`
- `GET /orders`
- `GET /orders/:id`
- `GET /admin/orders`

## 规则

- 订单只有在 `PAID` 状态下才能发货。
- 发货后订单状态变为 `SHIPPED`。
- 用户确认收货后订单状态变为 `COMPLETED`。
- 系统会在自动确认时间到达后自动完成订单。

## Git 标签

```text
v0.6.0-shipping
```
