# 阶段 4：支付系统

## 交付范围

- 支付适配器接口。
- `TEST` 本地测试支付通道。
- `STRIPE` 正式支付通道适配器骨架。
- 支付创建。
- 支付查询。
- 支付回调验签。
- 支付回调幂等处理。
- 支付金额和币种校验。
- 支付成功后订单状态更新为 `PAID`。
- 支付成功后锁定库存正式扣减，并生成库存流水。
- 支付失败后订单保持待付款，可重新发起支付。
- 支付记录、回调记录和退款记录。
- 前台支付页。
- 后台支付记录查看和退款记录创建。

## 不包含

- 真实 Stripe SDK 网络收款。
- 发货、物流、确认收货。
- 售后申请、退款审核和退货流程。
- 支付后订单发货状态流转。

## API

- `POST /payments`
- `GET /payments/:id`
- `GET /orders/:id/payments`
- `POST /payments/test/simulate`
- `POST /payments/test/callback`
- `POST /payments/stripe/callback`
- `GET /admin/payments`
- `POST /admin/payments/:id/refunds`

`POST /payments`、`GET /payments/:id`、`GET /orders/:id/payments` 和 `POST /payments/test/simulate` 需要 `Authorization: Bearer <token>`。

支付回调通过 `X-Payment-Signature` 或请求体 `signature` 验签。`TEST` 通道签名密钥为 `TEST_PAYMENT_WEBHOOK_SECRET`，默认本地值是 `dev-test-payment-secret`。

## 新增环境变量

```text
TEST_PAYMENT_WEBHOOK_SECRET=dev-test-payment-secret
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CHECKOUT_BASE_URL=https://checkout.stripe.com/c/pay
```

## 验收重点

- 重复支付回调只记录一次业务处理，不会重复扣减库存。
- 回调金额或币种与订单支付记录不一致时，订单不会变为已支付。
- 支付成功后订单状态为 `PAID`，锁定库存转为实际扣减。
- 支付失败后订单仍为 `PENDING_PAYMENT`，可以重新发起支付。
- 信用卡信息不进入本系统数据库。

## Git 标签

```text
v0.5.0-payment
```
