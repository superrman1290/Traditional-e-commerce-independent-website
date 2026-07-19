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

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function AdminHomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "手作香器",
    slug: "handmade-incense-burner",
    categoryName: "传统手作",
    categorySlug: "traditional-crafts",
    skuCode: "INCENSE-BURNER-BRONZE",
    skuName: "青铜色",
    price: "189.00",
    stockQuantity: "12"
  });

  async function loadProducts() {
    const response = await fetch(`${apiUrl}/admin/products`);
    setProducts(await response.json());
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  const totals = useMemo(() => {
    const skuCount = products.reduce((sum, product) => sum + product.skus.length, 0);
    const availableStock = products.reduce(
      (sum, product) => sum + product.skus.reduce((skuSum, sku) => skuSum + sku.availableStock, 0),
      0
    );
    const lowStockCount = products.reduce(
      (sum, product) =>
        sum +
        product.skus.filter((sku) => sku.availableStock <= sku.lowStockThreshold).length,
      0
    );

    return { skuCount, availableStock, lowStockCount };
  }, [products]);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const payload = {
      name: form.name,
      slug: form.slug,
      summary: "后台阶段 1 创建的商品",
      description: "用于验证商品管理、SKU 规格、库存和上下架。",
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
          name: "颜色",
          values: [form.skuName]
        }
      ],
      skus: [
        {
          skuCode: form.skuCode,
          name: form.skuName,
          optionSignature: { "颜色": form.skuName },
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

    setMessage(response.ok ? "商品已保存" : "商品保存失败");
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
      body: JSON.stringify({ skuId, quantity, note: "后台手动调整" })
    });
    await loadProducts();
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <strong>Commerce Admin</strong>
        <a href="#">商品</a>
        <a href="#">库存</a>
        <a href="http://localhost:3000">前台</a>
      </aside>

      <section className="workspace">
        <header className="pageHeader">
          <div>
            <p>阶段 1</p>
            <h1>商品和库存</h1>
          </div>
          <button type="button" onClick={() => void loadProducts()}>
            刷新
          </button>
        </header>

        <div className="metrics">
          <article>
            <span>商品数</span>
            <strong>{products.length}</strong>
          </article>
          <article>
            <span>SKU 数</span>
            <strong>{totals.skuCount}</strong>
          </article>
          <article>
            <span>可售库存</span>
            <strong>{totals.availableStock}</strong>
          </article>
          <article>
            <span>库存预警</span>
            <strong>{totals.lowStockCount}</strong>
          </article>
        </div>

        <form className="editor" onSubmit={(event) => void createProduct(event)}>
          <input
            aria-label="商品名称"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <input
            aria-label="商品 slug"
            value={form.slug}
            onChange={(event) => setForm({ ...form, slug: event.target.value })}
          />
          <input
            aria-label="分类名称"
            value={form.categoryName}
            onChange={(event) => setForm({ ...form, categoryName: event.target.value })}
          />
          <input
            aria-label="分类 slug"
            value={form.categorySlug}
            onChange={(event) => setForm({ ...form, categorySlug: event.target.value })}
          />
          <input
            aria-label="SKU 编码"
            value={form.skuCode}
            onChange={(event) => setForm({ ...form, skuCode: event.target.value })}
          />
          <input
            aria-label="SKU 名称"
            value={form.skuName}
            onChange={(event) => setForm({ ...form, skuName: event.target.value })}
          />
          <input
            aria-label="销售价"
            value={form.price}
            onChange={(event) => setForm({ ...form, price: event.target.value })}
          />
          <input
            aria-label="库存"
            type="number"
            min="0"
            value={form.stockQuantity}
            onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })}
          />
          <button disabled={isSubmitting} type="submit">
            保存商品
          </button>
          {message ? <p>{message}</p> : null}
        </form>

        <section className="table" aria-label="商品管理">
          {products.map((product) => (
            <article key={product.id}>
              <div className="productRow">
                <div>
                  <span>{product.category?.name ?? "未分类"}</span>
                  <h2>{product.name}</h2>
                  <small>{product.slug}</small>
                </div>
                <div className="actions">
                  <strong>{product.status}</strong>
                  <button
                    type="button"
                    onClick={() =>
                      void updateStatus(product.id, product.status === "ACTIVE" ? "DRAFT" : "ACTIVE")
                    }
                  >
                    {product.status === "ACTIVE" ? "下架" : "上架"}
                  </button>
                </div>
              </div>

              <div className="skuTable">
                {product.skus.map((sku) => (
                  <div key={sku.id}>
                    <span>{sku.skuCode}</span>
                    <strong>{sku.name}</strong>
                    <span>¥{sku.price}</span>
                    <span>
                      当前 {sku.stockQuantity} / 锁定 {sku.lockedStockQuantity} / 可售{" "}
                      {sku.availableStock}
                    </span>
                    <button type="button" onClick={() => void adjustInventory(sku.id, 1)}>
                      入库 +1
                    </button>
                    <button type="button" onClick={() => void adjustInventory(sku.id, -1)}>
                      出库 -1
                    </button>
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
