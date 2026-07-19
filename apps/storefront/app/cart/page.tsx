"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { SiteNav } from "../components/site-nav";

type Cart = {
  id: string;
  totalQuantity: number;
  totalAmount: string;
  hasPriceChanges: boolean;
  hasStockIssues: boolean;
  canCheckout: boolean;
  items: Array<{
    id: string;
    productName: string;
    productSlug: string;
    skuName: string;
    quantity: number;
    snapshotUnitPrice: string;
    currentUnitPrice: string;
    lineTotal: string;
    availableStock: number;
    priceChanged: boolean;
    insufficientStock: boolean;
    unavailable: boolean;
    image: { url: string; altText: string | null } | null;
  }>;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadCart();
  }, []);

  async function getHeaders() {
    const headers = new Headers({ "Content-Type": "application/json" });
    const token = localStorage.getItem("authToken");

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      return headers;
    }

    const guestSessionId = await getGuestSessionId();
    headers.set("X-Guest-Session-Id", guestSessionId);
    return headers;
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

  async function loadCart() {
    setMessage("");
    const response = await fetch(`${apiUrl}/cart`, { headers: await getHeaders() });
    if (response.ok) {
      setCart((await response.json()) as Cart);
    }
  }

  async function updateQuantity(itemId: string, quantity: number) {
    const response = await fetch(`${apiUrl}/cart/items/${itemId}`, {
      method: "PATCH",
      headers: await getHeaders(),
      body: JSON.stringify({ quantity })
    });

    if (response.ok) {
      setCart((await response.json()) as Cart);
      setMessage("");
    } else {
      setMessage("Quantity exceeds available stock.");
    }
  }

  async function removeItem(itemId: string) {
    const response = await fetch(`${apiUrl}/cart/items/${itemId}`, {
      method: "DELETE",
      headers: await getHeaders()
    });

    if (response.ok) {
      setCart((await response.json()) as Cart);
    }
  }

  return (
    <main className="shell">
      <SiteNav />

      <section className="catalogHeader">
        <div>
          <p>Stage 2</p>
          <h1>Cart</h1>
        </div>
        <div className="cartSummary">
          <strong>¥{cart?.totalAmount ?? "0.00"}</strong>
          <small>{cart?.totalQuantity ?? 0} items</small>
        </div>
      </section>

      {message ? <p className="formMessage">{message}</p> : null}

      <section className="cartList" aria-label="Cart items">
        {cart?.items.length ? (
          cart.items.map((item) => (
            <article className="cartItem" key={item.id}>
              {item.image ? (
                <Image src={item.image.url} alt={item.image.altText ?? item.productName} width={160} height={120} />
              ) : null}
              <div>
                <a href={`/products/${item.productSlug}`}>
                  <strong>{item.productName}</strong>
                </a>
                <span>{item.skuName}</span>
                <div className="cartBadges">
                  {item.priceChanged ? (
                    <mark>Price changed from ¥{item.snapshotUnitPrice} to ¥{item.currentUnitPrice}</mark>
                  ) : null}
                  {item.insufficientStock ? <mark>Only {item.availableStock} available</mark> : null}
                  {item.unavailable ? <mark>Unavailable</mark> : null}
                </div>
              </div>
              <input
                aria-label={`Quantity for ${item.productName}`}
                min={1}
                type="number"
                value={item.quantity}
                onChange={(event) => void updateQuantity(item.id, Number(event.target.value))}
              />
              <strong>¥{item.lineTotal}</strong>
              <button type="button" onClick={() => void removeItem(item.id)}>
                Remove
              </button>
            </article>
          ))
        ) : (
          <div className="emptyState">
            <h2>Your cart is empty</h2>
            <a className="detailLink" href="/">
              Browse products
            </a>
          </div>
        )}
      </section>

      {cart?.items.length ? (
        <footer className="cartFooter">
          <span>{cart.canCheckout ? "Cart is ready for checkout." : "Resolve price or stock issues first."}</span>
          {cart.canCheckout ? (
            <a className="detailLink" href="/checkout">
              Checkout
            </a>
          ) : (
            <button disabled type="button">
              Checkout
            </button>
          )}
        </footer>
      ) : null}
    </main>
  );
}
