"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Product = {
  name: string;
  slug: string;
  summary: string | null;
  description: string;
  category: { name: string } | null;
  images: Array<{ url: string; altText: string | null }>;
  options: Array<{ name: string; values: Array<{ value: string }> }>;
  skus: Array<{
    skuCode: string;
    name: string;
    price: string;
    compareAtPrice: string | null;
    availableStock: number;
    isActive: boolean;
    optionSignature: Record<string, string>;
  }>;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function ProductDetailClient({ slug }: { slug: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSkuCode, setSelectedSkuCode] = useState("");

  useEffect(() => {
    async function loadProduct() {
      const response = await fetch(`${apiUrl}/products/${slug}`);
      if (response.ok) {
        const nextProduct = (await response.json()) as Product;
        setProduct(nextProduct);
        setSelectedSkuCode(nextProduct.skus.find((sku) => sku.isActive)?.skuCode ?? "");
      }
    }

    void loadProduct();
  }, [slug]);

  const selectedSku = useMemo(
    () => product?.skus.find((sku) => sku.skuCode === selectedSkuCode),
    [product, selectedSkuCode]
  );

  if (!product) {
    return (
      <main className="shell">
        <p>商品加载中</p>
      </main>
    );
  }

  const image = product.images[0];

  return (
    <main className="shell">
      <nav className="nav" aria-label="主导航">
        <strong>Traditional Commerce</strong>
        <div>
          <a href="/">返回商品</a>
        </div>
      </nav>

      <section className="detailLayout">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? product.name}
            width={960}
            height={720}
            sizes="(max-width: 640px) 100vw, 55vw"
          />
        ) : null}
        <div className="detailPanel">
          <span>{product.category?.name ?? "未分类"}</span>
          <h1>{product.name}</h1>
          <p>{product.description}</p>

          <div className="skuChooser">
            {product.skus.map((sku) => (
              <button
                className={sku.skuCode === selectedSkuCode ? "active" : ""}
                disabled={!sku.isActive || sku.availableStock <= 0}
                key={sku.skuCode}
                type="button"
                onClick={() => setSelectedSkuCode(sku.skuCode)}
              >
                {sku.name}
              </button>
            ))}
          </div>

          <div className="priceRow">
            <strong>¥{selectedSku?.price ?? "0.00"}</strong>
            {selectedSku?.compareAtPrice ? <del>¥{selectedSku.compareAtPrice}</del> : null}
            <small>可售库存 {selectedSku?.availableStock ?? 0}</small>
          </div>

          <dl className="specList">
            {selectedSku
              ? Object.entries(selectedSku.optionSignature).map(([name, value]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{value}</dd>
                  </div>
                ))
              : null}
          </dl>
        </div>
      </section>
    </main>
  );
}

