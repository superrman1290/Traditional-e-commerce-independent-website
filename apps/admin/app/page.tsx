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

type Order = {
  id: string;
  orderNo: string;
  status: "PENDING_PAYMENT" | "CLOSED";
  subtotalAmount: string;
  shippingFee: string;
  discountAmount: string;
  totalAmount: string;
  expiresAt: string;
  createdAt: string;
  items: Array<{
    productName: string;
    skuName: string;
    quantity: number;
    lineTotal: string;
  }>;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000";

export default function AdminHomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  async function refreshAll() {
    await Promise.all([loadProducts(), loadOrders()]);
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

    return { skuCount, availableStock, lockedStock, pendingOrders };
  }, [orders, products]);

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

  return (
    <main className="shell">
      <aside className="sidebar">
        <strong>Commerce Admin</strong>
        <a href="#products">Products</a>
        <a href="#inventory">Inventory</a>
        <a href="#orders">Orders</a>
        <a href={storefrontUrl}>Storefront</a>
      </aside>

      <section className="workspace">
        <header className="pageHeader">
          <div>
            <p>Stage 3</p>
            <h1>Catalog, Inventory And Orders</h1>
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
        </div>

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
                  <small>Expires {new Date(order.expiresAt).toLocaleString()}</small>
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
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
