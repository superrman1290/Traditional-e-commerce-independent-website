"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { SiteNav } from "../../components/site-nav";

type Product = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  description: string;
  category: { name: string } | null;
  images: Array<{ url: string; altText: string | null }>;
  options: Array<{ name: string; values: Array<{ value: string }> }>;
  skus: Array<{
    id: string;
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

function getAnonymousId() {
  const storageKey = "anonymousVisitorId";
  const existing = localStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const nextId = crypto.randomUUID();
  localStorage.setItem(storageKey, nextId);
  return nextId;
}

export function ProductDetailClient({ slug }: { slug: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSkuCode, setSelectedSkuCode] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [favoriteMessage, setFavoriteMessage] = useState("");

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

  useEffect(() => {
    if (product) {
      void trackEvent("PRODUCT_VIEW", {
        productId: product.id,
        metadata: { slug: product.slug }
      });
    }
  }, [product]);

  async function trackEvent(eventType: "PRODUCT_VIEW" | "ADD_TO_CART", extra: Record<string, unknown>) {
    await fetch(`${apiUrl}/analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        path: `/products/${slug}`,
        anonymousId: getAnonymousId(),
        guestSessionId: localStorage.getItem("guestSessionId") ?? undefined,
        ...extra
      })
    });
  }

  async function getGuestSessionId() {
    const existing = localStorage.getItem("guestSessionId");
    if (existing) {
      return existing;
    }

    const response = await fetch(`${apiUrl}/guest-sessions`, { method: "POST" });
    const session = (await response.json()) as { guestSessionId: string };
    localStorage.setItem("guestSessionId", session.guestSessionId);
    return session.guestSessionId;
  }

  async function addToCart() {
    if (!selectedSku) {
      return;
    }

    setIsAdding(true);
    setCartMessage("");

    try {
      const headers = new Headers({ "Content-Type": "application/json" });
      const token = localStorage.getItem("authToken");

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      } else {
        headers.set("X-Guest-Session-Id", await getGuestSessionId());
      }

      const response = await fetch(`${apiUrl}/cart/items`, {
        method: "POST",
        headers,
        body: JSON.stringify({ skuId: selectedSku.id, quantity })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setCartMessage("Added to cart.");
      await trackEvent("ADD_TO_CART", {
        productId: product?.id,
        metadata: {
          skuCode: selectedSku.skuCode,
          quantity
        }
      });
    } catch {
      setCartMessage("Could not add this SKU. Check stock and try again.");
    } finally {
      setIsAdding(false);
    }
  }

  async function addFavorite() {
    if (!product) {
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      setFavoriteMessage("Login to save favorites.");
      return;
    }

    const response = await fetch(`${apiUrl}/favorites`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ productId: product.id })
    });

    setFavoriteMessage(response.ok ? "Saved to favorites." : "Could not save favorite.");
  }

  if (!product) {
    return (
      <main className="shell">
        <p>Loading product...</p>
      </main>
    );
  }

  const image = product.images[0];

  return (
    <main className="shell">
      <SiteNav />

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
          <span>{product.category?.name ?? "Uncategorized"}</span>
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
            <small>Available {selectedSku?.availableStock ?? 0}</small>
          </div>

          <div className="cartActions">
            <input
              aria-label="Quantity"
              min={1}
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
            <button disabled={!selectedSku || isAdding} type="button" onClick={() => void addToCart()}>
              {isAdding ? "Adding..." : "Add to cart"}
            </button>
            <button type="button" onClick={() => void addFavorite()}>
              Favorite
            </button>
          </div>
          {cartMessage ? <p className="formMessage">{cartMessage}</p> : null}
          {favoriteMessage ? <p className="formMessage">{favoriteMessage}</p> : null}

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
