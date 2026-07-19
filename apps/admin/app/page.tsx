"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

type Product = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  category: { name: string } | null;
  skus: Array<{
    id: string;
    skuCode: string;
    name: string;
    price: string;
    stockQuantity: number;
    lockedStockQuantity: number;
    availableStock: number;
    lowStockThreshold: number;
    isActive: boolean;
  }>;
};

type ShipmentForm = {
  carrierName: string;
  carrierCode: string;
  trackingNumber: string;
  trackingUrl: string;
};

type AfterSaleRequest = {
  id: string;
  orderNo: string;
  userEmail: string;
  type: "REFUND" | "RETURN_REFUND";
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED";
  amount: string;
  reason: string;
  adminNote: string | null;
  createdAt: string;
  refundStatus: string | null;
};

type MarketingRecords = {
  contacts: Array<{
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: "NEW" | "READ" | "REPLIED";
    createdAt: string;
  }>;
  subscriptions: Array<{
    id: string;
    email: string;
    source: string | null;
    isActive: boolean;
    createdAt: string;
  }>;
  reminders: Array<{
    id: string;
    email: string | null;
    status: "PENDING" | "SENT" | "SKIPPED";
    scheduledAt: string;
    itemCount: number;
    userEmail: string | null;
  }>;
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
    isActive: boolean;
    sortOrder: number;
  }>;
};

type AnalyticsDashboard = {
  period: {
    from: string;
    to: string;
    days: number;
  };
  metrics: {
    revenue: string;
    revenueChange: string;
    orderCount: number;
    averageOrderValue: string;
    pageViews: number;
    visitors: number;
    checkoutStarts: number;
    conversionRate: string;
    activeUsers: number;
  };
  dailySales: Array<{
    date: string;
    revenue: string;
    orders: number;
  }>;
  productSales: Array<{
    productId: string;
    productName: string;
    productSlug: string;
    quantity: number;
    revenue: string;
  }>;
  trafficSources: Array<{
    source: string;
    count: number;
  }>;
  behaviorEvents: Array<{
    eventType: string;
    count: number;
  }>;
  orderStatusCounts: Array<{
    status: string;
    count: number;
  }>;
  securityChecklist: Array<{
    key: string;
    label: string;
    status: string;
  }>;
  launchReadiness: {
    backupCommand: string;
    deploymentGuide: string;
    privacyPolicy: string;
    termsOfService: string;
  };
};

type Order = {
  id: string;
  orderNo: string;
  status: "PENDING_PAYMENT" | "PAID" | "SHIPPED" | "COMPLETED" | "CLOSED";
  subtotalAmount: string;
  shippingFee: string;
  discountAmount: string;
  totalAmount: string;
  paidAmount: string | null;
  paidCurrency: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  completedAt: string | null;
  expiresAt: string;
  createdAt: string;
  shipment: {
    carrierName: string;
    carrierCode: string | null;
    trackingNumber: string;
    trackingUrl: string | null;
    shippedAt: string;
    autoConfirmAt: string;
    confirmedAt: string | null;
  } | null;
  items: Array<{
    productName: string;
    skuName: string;
    quantity: number;
    lineTotal: string;
  }>;
  payments: Array<{
    id: string;
    provider: "TEST" | "STRIPE";
    status: "PENDING" | "SUCCEEDED" | "FAILED" | "CLOSED";
    amount: string;
    currency: string;
    failureReason: string | null;
    callbacks: Array<{
      isVerified: boolean;
      processingResult: string | null;
    }>;
    refunds: Array<{
      id: string;
      amount: string;
      currency: string;
      status: string;
      providerRefundId: string | null;
    }>;
  }>;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000";

export default function AdminHomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [afterSales, setAfterSales] = useState<AfterSaleRequest[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [marketing, setMarketing] = useState<MarketingRecords>({
    contacts: [],
    subscriptions: [],
    reminders: [],
    faqs: []
  });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shipmentForms, setShipmentForms] = useState<Record<string, ShipmentForm>>({});
  const [form, setForm] = useState({
    name: "Handmade incense burner",
    slug: "handmade-incense-burner",
    categoryName: "Traditional crafts",
    categorySlug: "traditional-crafts",
    skuCode: "INCENSE-BURNER-BRONZE",
    skuName: "Bronze finish",
    price: "189.00",
    stockQuantity: "12"
  });

  function setShipmentField(orderId: string, field: keyof ShipmentForm, value: string) {
    setShipmentForms((current) => ({
      ...current,
      [orderId]: {
        carrierName: "",
        carrierCode: "",
        trackingNumber: "",
        trackingUrl: "",
        ...current[orderId],
        [field]: value
      }
    }));
  }

  async function loadProducts() {
    const response = await fetch(`${apiUrl}/admin/products`);
    setProducts(await response.json());
  }

  async function loadOrders() {
    const response = await fetch(`${apiUrl}/admin/orders`);
    if (response.ok) {
      setOrders(await response.json());
    }
  }

  async function loadAfterSales() {
    const response = await fetch(`${apiUrl}/admin/after-sales`);
    if (response.ok) {
      setAfterSales((await response.json()) as AfterSaleRequest[]);
    }
  }

  async function loadMarketing() {
    const response = await fetch(`${apiUrl}/admin/marketing`);
    if (response.ok) {
      setMarketing((await response.json()) as MarketingRecords);
    }
  }

  async function loadAnalytics() {
    const response = await fetch(`${apiUrl}/admin/analytics`);
    if (response.ok) {
      setAnalytics((await response.json()) as AnalyticsDashboard);
    }
  }

  async function refreshAll() {
    await Promise.all([loadProducts(), loadOrders(), loadAfterSales(), loadMarketing(), loadAnalytics()]);
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  const totals = useMemo(() => {
    const skuCount = products.reduce((sum, product) => sum + product.skus.length, 0);
    const availableStock = products.reduce(
      (sum, product) => sum + product.skus.reduce((skuSum, sku) => skuSum + sku.availableStock, 0),
      0
    );
    const lockedStock = products.reduce(
      (sum, product) => sum + product.skus.reduce((skuSum, sku) => skuSum + sku.lockedStockQuantity, 0),
      0
    );
    const pendingOrders = orders.filter((order) => order.status === "PENDING_PAYMENT").length;
    const paidOrders = orders.filter((order) => order.status === "PAID").length;
    const shippedOrders = orders.filter((order) => order.status === "SHIPPED").length;
    const completedOrders = orders.filter((order) => order.status === "COMPLETED").length;
    const requestedAfterSales = afterSales.filter((request) => request.status === "REQUESTED").length;

    return {
      skuCount,
      availableStock,
      lockedStock,
      pendingOrders,
      paidOrders,
      shippedOrders,
      completedOrders,
      requestedAfterSales
    };
  }, [afterSales, orders, products]);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const payload = {
      name: form.name,
      slug: form.slug,
      summary: "Created from the admin catalog form.",
      description: "Used to validate product, SKU and inventory operations.",
      status: "ACTIVE",
      category: {
        name: form.categoryName,
        slug: form.categorySlug
      },
      images: [
        {
          url: "https://images.unsplash.com/photo-1523264067855-7b9941f18ca9?auto=format&fit=crop&w=1200&q=80",
          altText: form.name
        }
      ],
      options: [
        {
          name: "Color",
          values: [form.skuName]
        }
      ],
      skus: [
        {
          skuCode: form.skuCode,
          name: form.skuName,
          optionSignature: { Color: form.skuName },
          price: form.price,
          stockQuantity: Number(form.stockQuantity),
          lowStockThreshold: 3
        }
      ]
    };

    const response = await fetch(`${apiUrl}/admin/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setMessage(response.ok ? "Product saved." : "Product could not be saved.");
    setIsSubmitting(false);
    await loadProducts();
  }

  async function updateStatus(productId: string, status: ProductStatus) {
    await fetch(`${apiUrl}/admin/products/${productId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    await loadProducts();
  }

  async function adjustInventory(skuId: string, quantity: number) {
    await fetch(`${apiUrl}/admin/inventory/adjustments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skuId, quantity, note: "Admin manual adjustment" })
    });
    await loadProducts();
  }

  async function closeExpiredOrders() {
    const response = await fetch(`${apiUrl}/admin/orders/expire`, { method: "POST" });
    const result = response.ok ? ((await response.json()) as { closedCount: number }) : { closedCount: 0 };
    setMessage(`Closed ${result.closedCount} expired orders.`);
    await refreshAll();
  }

  async function createRefund(paymentId: string, amount: string) {
    const response = await fetch(`${apiUrl}/admin/payments/${paymentId}/refunds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, reason: "Admin payment refund record" })
    });
    setMessage(response.ok ? "Refund record created." : "Refund could not be created.");
    await refreshAll();
  }

  async function createShipment(orderId: string) {
    const payload = shipmentForms[orderId] ?? {
      carrierName: "",
      carrierCode: "",
      trackingNumber: "",
      trackingUrl: ""
    };

    const response = await fetch(`${apiUrl}/admin/orders/${orderId}/shipment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setMessage(response.ok ? "Shipment created." : "Shipment could not be created.");
    await refreshAll();
  }

  async function updateAfterSale(requestId: string, status: AfterSaleRequest["status"]) {
    const response = await fetch(`${apiUrl}/admin/after-sales/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNote: `Admin marked ${status.toLowerCase()}` })
    });

    setMessage(response.ok ? "After-sales request updated." : "After-sales request could not be updated.");
    await refreshAll();
  }

  async function updateContactStatus(contactId: string, status: "NEW" | "READ" | "REPLIED") {
    const response = await fetch(`${apiUrl}/admin/contact-messages/${contactId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    setMessage(response.ok ? "Contact message updated." : "Contact message could not be updated.");
    await loadMarketing();
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <strong>Commerce Admin</strong>
        <a href="#products">Products</a>
        <a href="#inventory">Inventory</a>
        <a href="#orders">Orders</a>
        <a href="#after-sales">After-sales</a>
        <a href="#marketing">Marketing</a>
        <a href="#analytics">Analytics</a>
        <a href="#launch">Launch</a>
        <a href={storefrontUrl}>Storefront</a>
      </aside>

      <section className="workspace">
        <header className="pageHeader">
          <div>
            <p>Stage 7</p>
            <h1>Operations, Analytics And Launch</h1>
          </div>
          <button type="button" onClick={() => void refreshAll()}>
            Refresh
          </button>
        </header>

        <div className="metrics">
          <article>
            <span>Products</span>
            <strong>{products.length}</strong>
          </article>
          <article>
            <span>SKUs</span>
            <strong>{totals.skuCount}</strong>
          </article>
          <article>
            <span>Available stock</span>
            <strong>{totals.availableStock}</strong>
          </article>
          <article>
            <span>Pending orders</span>
            <strong>{totals.pendingOrders}</strong>
          </article>
          <article>
            <span>Paid orders</span>
            <strong>{totals.paidOrders}</strong>
          </article>
          <article>
            <span>Shipped orders</span>
            <strong>{totals.shippedOrders}</strong>
          </article>
          <article>
            <span>Completed orders</span>
            <strong>{totals.completedOrders}</strong>
          </article>
          <article>
            <span>After-sales</span>
            <strong>{totals.requestedAfterSales}</strong>
          </article>
          <article>
            <span>Contacts</span>
            <strong>{marketing.contacts.length}</strong>
          </article>
          <article>
            <span>30-day revenue</span>
            <strong>CNY {analytics?.metrics.revenue ?? "0.00"}</strong>
          </article>
          <article>
            <span>Conversion</span>
            <strong>{analytics?.metrics.conversionRate ?? "0.00"}%</strong>
          </article>
          <article>
            <span>Page views</span>
            <strong>{analytics?.metrics.pageViews ?? 0}</strong>
          </article>
        </div>

        {analytics ? (
          <section className="table" id="analytics" aria-label="Analytics dashboard">
            <div className="sectionHeader">
              <div>
                <p>
                  {new Date(analytics.period.from).toLocaleDateString()} - {new Date(analytics.period.to).toLocaleDateString()}
                </p>
                <h2>Analytics</h2>
              </div>
            </div>

            <article>
              <div className="productRow">
                <div>
                  <span>Sales overview</span>
                  <h2>Revenue and conversion</h2>
                </div>
              </div>
              <div className="analyticsGrid">
                <div>
                  <span>Revenue change</span>
                  <strong>{analytics.metrics.revenueChange}%</strong>
                </div>
                <div>
                  <span>Orders</span>
                  <strong>{analytics.metrics.orderCount}</strong>
                </div>
                <div>
                  <span>Average order value</span>
                  <strong>CNY {analytics.metrics.averageOrderValue}</strong>
                </div>
                <div>
                  <span>Visitors</span>
                  <strong>{analytics.metrics.visitors}</strong>
                </div>
                <div>
                  <span>Checkout starts</span>
                  <strong>{analytics.metrics.checkoutStarts}</strong>
                </div>
                <div>
                  <span>Active users</span>
                  <strong>{analytics.metrics.activeUsers}</strong>
                </div>
              </div>
            </article>

            <article>
              <div className="productRow">
                <div>
                  <span>Product sales ranking</span>
                  <h2>Top products</h2>
                </div>
              </div>
              <div className="marketingTable compact">
                {analytics.productSales.map((item) => (
                  <div key={item.productId}>
                    <strong>{item.productName}</strong>
                    <span>{item.productSlug}</span>
                    <span>{item.quantity} sold</span>
                    <span>CNY {item.revenue}</span>
                  </div>
                ))}
              </div>
            </article>

            <article>
              <div className="productRow">
                <div>
                  <span>Traffic source analysis</span>
                  <h2>Sources and behavior</h2>
                </div>
              </div>
              <div className="splitTables">
                <div className="marketingTable compact">
                  {analytics.trafficSources.map((source) => (
                    <div key={source.source}>
                      <strong>{source.source}</strong>
                      <span>Traffic</span>
                      <span>{source.count}</span>
                      <span>events</span>
                    </div>
                  ))}
                </div>
                <div className="marketingTable compact">
                  {analytics.behaviorEvents.map((event) => (
                    <div key={event.eventType}>
                      <strong>{event.eventType}</strong>
                      <span>Behavior</span>
                      <span>{event.count}</span>
                      <span>events</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article>
              <div className="productRow">
                <div>
                  <span>Daily sales amount</span>
                  <h2>Sales trend</h2>
                </div>
              </div>
              <div className="marketingTable compact">
                {analytics.dailySales.map((day) => (
                  <div key={day.date}>
                    <strong>{day.date}</strong>
                    <span>Revenue</span>
                    <span>CNY {day.revenue}</span>
                    <span>{day.orders} order(s)</span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        {analytics ? (
          <section className="table" id="launch" aria-label="Launch readiness">
            <div className="sectionHeader">
              <div>
                <p>Security, backup and deployment</p>
                <h2>Launch readiness</h2>
              </div>
            </div>

            <article>
              <div className="productRow">
                <div>
                  <span>Security checklist</span>
                  <h2>Production checks</h2>
                </div>
              </div>
              <div className="marketingTable compact">
                {analytics.securityChecklist.map((item) => (
                  <div key={item.key}>
                    <strong>{item.label}</strong>
                    <span>{item.key}</span>
                    <span>{item.status}</span>
                    <span>Stage 7</span>
                  </div>
                ))}
              </div>
            </article>

            <article>
              <div className="productRow">
                <div>
                  <span>Backup and policies</span>
                  <h2>Deployment assets</h2>
                </div>
              </div>
              <div className="marketingTable compact">
                <div>
                  <strong>{analytics.launchReadiness.backupCommand}</strong>
                  <span>Database backup</span>
                  <span>PowerShell script</span>
                  <span>Git ignored output</span>
                </div>
                <div>
                  <strong>{analytics.launchReadiness.deploymentGuide}</strong>
                  <span>Deployment guide</span>
                  <span>HTTPS and env</span>
                  <span>Required</span>
                </div>
                <div>
                  <strong>{analytics.launchReadiness.privacyPolicy}</strong>
                  <span>Privacy policy</span>
                  <span>Storefront</span>
                  <span>Linked</span>
                </div>
                <div>
                  <strong>{analytics.launchReadiness.termsOfService}</strong>
                  <span>User agreement</span>
                  <span>Storefront</span>
                  <span>Linked</span>
                </div>
              </div>
            </article>
          </section>
        ) : null}

        <form className="editor" id="products" onSubmit={(event) => void createProduct(event)}>
          <input aria-label="Product name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input aria-label="Product slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
          <input
            aria-label="Category name"
            value={form.categoryName}
            onChange={(event) => setForm({ ...form, categoryName: event.target.value })}
          />
          <input
            aria-label="Category slug"
            value={form.categorySlug}
            onChange={(event) => setForm({ ...form, categorySlug: event.target.value })}
          />
          <input aria-label="SKU code" value={form.skuCode} onChange={(event) => setForm({ ...form, skuCode: event.target.value })} />
          <input aria-label="SKU name" value={form.skuName} onChange={(event) => setForm({ ...form, skuName: event.target.value })} />
          <input aria-label="Sale price" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
          <input
            aria-label="Stock"
            min="0"
            type="number"
            value={form.stockQuantity}
            onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })}
          />
          <button disabled={isSubmitting} type="submit">
            Save product
          </button>
          {message ? <p>{message}</p> : null}
        </form>

        <section className="table" id="inventory" aria-label="Product management">
          {products.map((product) => (
            <article key={product.id}>
              <div className="productRow">
                <div>
                  <span>{product.category?.name ?? "Uncategorized"}</span>
                  <h2>{product.name}</h2>
                  <small>{product.slug}</small>
                </div>
                <div className="actions">
                  <strong>{product.status}</strong>
                  <button
                    type="button"
                    onClick={() => void updateStatus(product.id, product.status === "ACTIVE" ? "DRAFT" : "ACTIVE")}
                  >
                    {product.status === "ACTIVE" ? "Unpublish" : "Publish"}
                  </button>
                </div>
              </div>

              <div className="skuTable">
                {product.skus.map((sku) => (
                  <div key={sku.id}>
                    <span>{sku.skuCode}</span>
                    <strong>{sku.name}</strong>
                    <span>CNY {sku.price}</span>
                    <span>
                      Current {sku.stockQuantity} / Locked {sku.lockedStockQuantity} / Available {sku.availableStock}
                    </span>
                    <button type="button" onClick={() => void adjustInventory(sku.id, 1)}>
                      In +1
                    </button>
                    <button type="button" onClick={() => void adjustInventory(sku.id, -1)}>
                      Out -1
                    </button>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="table" id="orders" aria-label="Order management">
          <div className="sectionHeader">
            <div>
              <p>Checkout orders</p>
              <h2>Orders</h2>
            </div>
            <button type="button" onClick={() => void closeExpiredOrders()}>
              Close expired
            </button>
          </div>

          {orders.map((order) => (
            <article key={order.id}>
              <div className="productRow">
                <div>
                  <span>{order.status}</span>
                  <h2>{order.orderNo}</h2>
                  <small>Created {new Date(order.createdAt).toLocaleString()}</small>
                </div>
                <div className="actions">
                  <strong>CNY {order.totalAmount}</strong>
                  <small>
                    {order.paidAt ? `Paid ${new Date(order.paidAt).toLocaleString()}` : `Expires ${new Date(order.expiresAt).toLocaleString()}`}
                  </small>
                </div>
              </div>

              <div className="orderTable">
                {order.items.map((item) => (
                  <div key={`${order.id}-${item.productName}-${item.skuName}`}>
                    <strong>{item.productName}</strong>
                    <span>{item.skuName}</span>
                    <span>x {item.quantity}</span>
                    <span>CNY {item.lineTotal}</span>
                  </div>
                ))}
              </div>

              {order.shipment ? (
                <div className="shipmentTable">
                  <div>
                    <strong>{order.shipment.carrierName}</strong>
                    <span>{order.shipment.carrierCode ?? "No carrier code"}</span>
                  </div>
                  <div>
                    <strong>{order.shipment.trackingNumber}</strong>
                    <span>{order.shipment.trackingUrl ?? "No tracking URL"}</span>
                  </div>
                  <div>
                    <strong>Shipped</strong>
                    <span>{new Date(order.shipment.shippedAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <strong>Auto confirm</strong>
                    <span>{new Date(order.shipment.autoConfirmAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <strong>Confirmed</strong>
                    <span>{order.shipment.confirmedAt ? new Date(order.shipment.confirmedAt).toLocaleString() : "-"}</span>
                  </div>
                </div>
              ) : null}

              {order.status === "PAID" ? (
                <form
                  className="shipmentForm"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void createShipment(order.id);
                  }}
                >
                  <input
                    aria-label={`Carrier name for ${order.orderNo}`}
                    placeholder="Carrier name"
                    value={shipmentForms[order.id]?.carrierName ?? ""}
                    onChange={(event) => setShipmentField(order.id, "carrierName", event.target.value)}
                  />
                  <input
                    aria-label={`Carrier code for ${order.orderNo}`}
                    placeholder="Carrier code"
                    value={shipmentForms[order.id]?.carrierCode ?? ""}
                    onChange={(event) => setShipmentField(order.id, "carrierCode", event.target.value)}
                  />
                  <input
                    aria-label={`Tracking number for ${order.orderNo}`}
                    placeholder="Tracking number"
                    value={shipmentForms[order.id]?.trackingNumber ?? ""}
                    onChange={(event) => setShipmentField(order.id, "trackingNumber", event.target.value)}
                  />
                  <input
                    aria-label={`Tracking URL for ${order.orderNo}`}
                    placeholder="Tracking URL"
                    value={shipmentForms[order.id]?.trackingUrl ?? ""}
                    onChange={(event) => setShipmentField(order.id, "trackingUrl", event.target.value)}
                  />
                  <button type="submit">Create shipment</button>
                </form>
              ) : null}

              <div className="paymentTable">
                {order.payments.map((payment) => (
                  <div key={payment.id}>
                    <strong>{payment.provider}</strong>
                    <span>{payment.status}</span>
                    <span>
                      {payment.currency} {payment.amount}
                    </span>
                    <span>
                      {payment.callbacks[0]?.processingResult ?? payment.failureReason ?? "No callback"}
                    </span>
                    <span>{payment.refunds[0] ? `Refund ${payment.refunds[0].status}` : "No refund"}</span>
                    <button
                      disabled={payment.status !== "SUCCEEDED"}
                      type="button"
                      onClick={() => void createRefund(payment.id, payment.amount)}
                    >
                      Refund
                    </button>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="table" id="after-sales" aria-label="After-sales management">
          <div className="sectionHeader">
            <div>
              <p>Refund and return requests</p>
              <h2>After-sales</h2>
            </div>
          </div>

          {afterSales.map((request) => (
            <article key={request.id}>
              <div className="productRow">
                <div>
                  <span>{request.status}</span>
                  <h2>{request.orderNo}</h2>
                  <small>
                    {request.userEmail} / {new Date(request.createdAt).toLocaleString()}
                  </small>
                </div>
                <div className="actions">
                  <strong>
                    {request.type} CNY {request.amount}
                  </strong>
                  <button type="button" onClick={() => void updateAfterSale(request.id, "APPROVED")}>
                    Approve
                  </button>
                  <button type="button" onClick={() => void updateAfterSale(request.id, "REJECTED")}>
                    Reject
                  </button>
                  <button type="button" onClick={() => void updateAfterSale(request.id, "COMPLETED")}>
                    Complete
                  </button>
                </div>
              </div>
              <div className="adminNote">
                <strong>{request.reason}</strong>
                <span>{request.adminNote ?? "No admin note"}</span>
                <span>{request.refundStatus ? `Refund ${request.refundStatus}` : "No refund record linked"}</span>
              </div>
            </article>
          ))}
        </section>

        <section className="table" id="marketing" aria-label="Marketing management">
          <div className="sectionHeader">
            <div>
              <p>Contacts, subscriptions, reminders and FAQ</p>
              <h2>Marketing</h2>
            </div>
          </div>

          <article>
            <div className="productRow">
              <div>
                <span>Contact form</span>
                <h2>Messages</h2>
              </div>
            </div>
            <div className="marketingTable">
              {marketing.contacts.map((contact) => (
                <div key={contact.id}>
                  <strong>{contact.subject}</strong>
                  <span>
                    {contact.name} / {contact.email}
                  </span>
                  <span>{contact.message}</span>
                  <span>{contact.status}</span>
                  <button type="button" onClick={() => void updateContactStatus(contact.id, "READ")}>
                    Mark read
                  </button>
                  <button type="button" onClick={() => void updateContactStatus(contact.id, "REPLIED")}>
                    Mark replied
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article>
            <div className="productRow">
              <div>
                <span>Email subscriptions</span>
                <h2>Newsletter</h2>
              </div>
            </div>
            <div className="marketingTable compact">
              {marketing.subscriptions.map((subscription) => (
                <div key={subscription.id}>
                  <strong>{subscription.email}</strong>
                  <span>{subscription.source ?? "storefront"}</span>
                  <span>{subscription.isActive ? "Active" : "Inactive"}</span>
                  <span>{new Date(subscription.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </article>

          <article>
            <div className="productRow">
              <div>
                <span>Abandoned cart reminders</span>
                <h2>Cart reminders</h2>
              </div>
            </div>
            <div className="marketingTable compact">
              {marketing.reminders.map((reminder) => (
                <div key={reminder.id}>
                  <strong>{reminder.email ?? reminder.userEmail ?? "No email"}</strong>
                  <span>{reminder.status}</span>
                  <span>{reminder.itemCount} item(s)</span>
                  <span>{new Date(reminder.scheduledAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </article>

          <article>
            <div className="productRow">
              <div>
                <span>Frequently asked questions</span>
                <h2>FAQ</h2>
              </div>
            </div>
            <div className="marketingTable compact">
              {marketing.faqs.map((faq) => (
                <div key={faq.id}>
                  <strong>{faq.question}</strong>
                  <span>{faq.answer}</span>
                  <span>{faq.isActive ? "Active" : "Inactive"}</span>
                  <span>Sort {faq.sortOrder}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
