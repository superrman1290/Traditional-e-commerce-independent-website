"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { SiteNav } from "./components/site-nav";

type Product = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  category: { name: string; slug: string } | null;
  images: Array<{ url: string; altText: string | null }>;
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

type Category = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function StorefrontHomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function loadCatalog() {
      const [categoryResponse, productResponse] = await Promise.all([
        fetch(`${apiUrl}/categories`),
        fetch(`${apiUrl}/products`)
      ]);

      setCategories(await categoryResponse.json());
      setProducts(await productResponse.json());
    }

    void loadCatalog();
  }, []);

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategory ? product.category?.slug === selectedCategory : true;
      const term = query.trim().toLowerCase();
      const matchesQuery = term
        ? `${product.name} ${product.summary ?? ""}`.toLowerCase().includes(term)
        : true;

      return matchesCategory && matchesQuery;
    });
  }, [products, query, selectedCategory]);

  return (
    <main className="shell">
      <SiteNav />

      <section className="catalogHeader">
        <div>
          <p>Stage 2</p>
          <h1>Product catalog</h1>
        </div>
        <input
          aria-label="Search products"
          placeholder="Search products"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </section>

      <div className="categoryTabs" aria-label="Product categories">
        <button
          className={selectedCategory === "" ? "active" : ""}
          type="button"
          onClick={() => setSelectedCategory("")}
        >
          All
        </button>
        {categories
          .filter((category) => category.isActive)
          .map((category) => (
            <button
              className={selectedCategory === category.slug ? "active" : ""}
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.slug)}
            >
              {category.name}
            </button>
          ))}
      </div>

      <section className="productGrid" aria-label="Product list">
        {visibleProducts.map((product) => {
          const firstSku = product.skus[0];
          const image = product.images[0];

          return (
            <article className="productCard" key={product.id}>
              {image ? (
                <Image
                  src={image.url}
                  alt={image.altText ?? product.name}
                  width={640}
                  height={480}
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              ) : null}
              <div className="productBody">
                <span>{product.category?.name ?? "Uncategorized"}</span>
                <h2>{product.name}</h2>
                <p>{product.summary}</p>
                <div className="productMeta">
                  <strong>¥{firstSku?.price ?? "0.00"}</strong>
                  <small>{firstSku ? `Available ${firstSku.availableStock}` : "No SKU"}</small>
                </div>
                <a className="detailLink" href={`/products/${product.slug}`}>
                  View details
                </a>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
