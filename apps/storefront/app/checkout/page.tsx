"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { SiteNav } from "../components/site-nav";

type Address = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  district: string | null;
  line1: string;
  isDefault: boolean;
};

type CheckoutSummary = {
  cart: {
    items: Array<{
      id: string;
      productName: string;
      productSlug: string;
      skuName: string;
      quantity: number;
      unitPrice: string;
      lineTotal: string;
      image: { url: string; altText: string | null } | null;
    }>;
  };
  subtotalAmount: string;
  shippingFee: string;
  discountAmount: string;
  totalAmount: string;
  coupon: { code: string; name: string } | null;
  shippingTemplate: { name: string } | null;
};

type Order = {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: string;
  expiresAt: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function CheckoutPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const idempotencyKey = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const existing = sessionStorage.getItem("checkoutIdempotencyKey");
    if (existing) {
      return existing;
    }

    const next = crypto.randomUUID();
    sessionStorage.setItem("checkoutIdempotencyKey", next);
    return next;
  }, []);

  useEffect(() => {
    void loadAddresses();
  }, []);

  useEffect(() => {
    if (selectedAddressId) {
      void loadSummary(selectedAddressId, couponCode);
    }
  }, [couponCode, selectedAddressId]);

  function getAuthHeaders() {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Login is required before checkout.");
    }

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  }

  async function loadAddresses() {
    try {
      const response = await fetch(`${apiUrl}/addresses`, { headers: getAuthHeaders() });
      if (!response.ok) {
        throw new Error("Login is required before checkout.");
      }

      const nextAddresses = (await response.json()) as Address[];
      setAddresses(nextAddresses);
      const defaultAddress = nextAddresses.find((address) => address.isDefault) ?? nextAddresses[0];
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load checkout.");
    }
  }

  async function loadSummary(addressId: string, code: string) {
    try {
      const params = new URLSearchParams({ addressId });
      if (code.trim()) {
        params.set("couponCode", code.trim());
      }

      const response = await fetch(`${apiUrl}/checkout/summary?${params.toString()}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error("Could not calculate checkout.");
      }

      setSummary((await response.json()) as CheckoutSummary);
      setMessage("");
    } catch (error) {
      setSummary(null);
      setMessage(error instanceof Error ? error.message : "Could not calculate checkout.");
    }
  }

  async function submitOrder() {
    if (!selectedAddressId || !idempotencyKey) {
      setMessage("Select a shipping address first.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const response = await fetch(`${apiUrl}/orders`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        addressId: selectedAddressId,
        couponCode: couponCode.trim() || undefined,
        idempotencyKey
      })
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setMessage("Order could not be created. Refresh cart and try again.");
      return;
    }

    const created = (await response.json()) as Order;
    setOrder(created);
    sessionStorage.removeItem("checkoutIdempotencyKey");
  }

  return (
    <main className="shell">
      <SiteNav />

      <section className="catalogHeader">
        <div>
          <p>Stage 3</p>
          <h1>Checkout</h1>
        </div>
        <a className="detailLink" href="/cart">
          Back to cart
        </a>
      </section>

      {message ? <p className="formMessage">{message}</p> : null}

      {order ? (
        <section className="checkoutSuccess">
          <span>Order created</span>
          <h2>{order.orderNo}</h2>
          <p>Status: {order.status}</p>
          <strong>CNY {order.totalAmount}</strong>
          <small>Stock is locked until {new Date(order.expiresAt).toLocaleString()}.</small>
        </section>
      ) : (
        <section className="checkoutLayout">
          <div className="detailPanel">
            <span>Shipping address</span>
            <h2>Delivery</h2>
            {addresses.length ? (
              <div className="addressList">
                {addresses.map((address) => (
                  <label className="addressOption" key={address.id}>
                    <input
                      checked={selectedAddressId === address.id}
                      name="addressId"
                      type="radio"
                      onChange={() => setSelectedAddressId(address.id)}
                    />
                    <span>
                      <strong>{address.label}</strong>
                      {address.recipientName}, {address.phone}
                      <br />
                      {address.province} {address.city} {address.district} {address.line1}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p>
                Add a shipping address in <a href="/account">Account</a> before checkout.
              </p>
            )}
          </div>

          <div className="detailPanel">
            <span>Coupon</span>
            <h2>Discount</h2>
            <div className="couponRow">
              <input
                aria-label="Coupon code"
                placeholder="STAGE3"
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value)}
              />
              <button type="button" onClick={() => void loadSummary(selectedAddressId, couponCode)}>
                Apply
              </button>
            </div>
            {summary?.coupon ? <p className="formMessage">Applied {summary.coupon.code}</p> : null}
          </div>

          <aside className="orderSummary">
            <span>Order summary</span>
            <h2>Total</h2>
            <div className="summaryItems">
              {summary?.cart.items.map((item) => (
                <article key={item.id}>
                  {item.image ? (
                    <Image src={item.image.url} alt={item.image.altText ?? item.productName} width={96} height={72} />
                  ) : null}
                  <div>
                    <strong>{item.productName}</strong>
                    <small>
                      {item.skuName} x {item.quantity}
                    </small>
                  </div>
                  <span>CNY {item.lineTotal}</span>
                </article>
              ))}
            </div>
            <dl className="totalsList">
              <div>
                <dt>Subtotal</dt>
                <dd>CNY {summary?.subtotalAmount ?? "0.00"}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>CNY {summary?.shippingFee ?? "0.00"}</dd>
              </div>
              <div>
                <dt>Discount</dt>
                <dd>- CNY {summary?.discountAmount ?? "0.00"}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>CNY {summary?.totalAmount ?? "0.00"}</dd>
              </div>
            </dl>
            <button disabled={!summary || !addresses.length || isSubmitting} type="button" onClick={() => void submitOrder()}>
              {isSubmitting ? "Creating..." : "Submit order"}
            </button>
          </aside>
        </section>
      )}
    </main>
  );
}

