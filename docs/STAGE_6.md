# 阶段 6：售后和营销

## 交付范围

- 退款申请
- 退货退款申请
- 商品收藏
- 优惠券展示
- 满减活动展示
- 限时折扣展示
- 邮件订阅
- 弃购提醒
- 联系表单
- 常见问题

## API

- `GET /marketing`
- `POST /newsletter-subscriptions`
- `POST /contact-messages`
- `GET /favorites`
- `POST /favorites`
- `DELETE /favorites/:productId`
- `POST /cart/reminders`
- `POST /after-sales`
- `GET /after-sales`
- `GET /admin/marketing`
- `PATCH /admin/contact-messages/:id/status`
- `GET /admin/after-sales`
- `PATCH /admin/after-sales/:id`

## 新增数据表

- `after_sale_requests`
- `favorites`
- `newsletter_subscriptions`
- `contact_messages`
- `faq_entries`
- `abandoned_cart_reminders`

## 规则

- 售后申请只允许已付款、已发货或已完成订单提交。
- 退款金额不能超过订单已付金额。
- 商品收藏需要登录。
- 弃购提醒会记录当前活跃购物车，并默认安排在 24 小时后提醒。
- 优惠券、满减和限时折扣复用 `coupons` 表。

## Git 标签

```text
v0.7.0-marketing-after-sales
```
