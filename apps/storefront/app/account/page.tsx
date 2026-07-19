"use client";

import { FormEvent, useEffect, useState } from "react";
import { authChangedEvent } from "../components/account-menu";
import { SiteNav } from "../components/site-nav";

type User = {
  id: string;
  email: string;
  name: string;
};

type Address = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  district: string | null;
  line1: string;
  postalCode: string | null;
  isDefault: boolean;
};

type Order = {
  id: string;
  orderNo: string;
  status: "PENDING_PAYMENT" | "PAID" | "SHIPPED" | "COMPLETED" | "CLOSED";
  totalAmount: string;
  paidAt: string | null;
  shippedAt: string | null;
  completedAt: string | null;
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
};

type Favorite = {
  id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    summary: string | null;
    images: Array<{ url: string; altText: string | null }>;
    skus: Array<{ price: string; availableStock: number }>;
  };
};

type AfterSaleRequest = {
  id: string;
  orderNo: string;
  type: "REFUND" | "RETURN_REFUND";
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED";
  amount: string;
  reason: string;
  adminNote: string | null;
  createdAt: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [afterSales, setAfterSales] = useState<AfterSaleRequest[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadSession();
    window.addEventListener(authChangedEvent, loadSession);

    return () => window.removeEventListener(authChangedEvent, loadSession);
  }, []);

  async function loadSession() {
    const token = localStorage.getItem("authToken");
    if (!token) {
      return;
    }

    const response = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      setUser((await response.json()) as User);
      await loadAddresses(token);
      await loadOrders(token);
      await loadFavorites(token);
      await loadAfterSales(token);
    } else {
      localStorage.removeItem("authToken");
      setUser(null);
      setAddresses([]);
      setOrders([]);
      setFavorites([]);
      setAfterSales([]);
    }
  }

  async function loadAddresses(token = localStorage.getItem("authToken")) {
    if (!token) {
      return;
    }

    const response = await fetch(`${apiUrl}/addresses`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      setAddresses((await response.json()) as Address[]);
    }
  }

  async function loadOrders(token = localStorage.getItem("authToken")) {
    if (!token) {
      return;
    }

    const response = await fetch(`${apiUrl}/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      setOrders((await response.json()) as Order[]);
    }
  }

  async function loadFavorites(token = localStorage.getItem("authToken")) {
    if (!token) {
      return;
    }

    const response = await fetch(`${apiUrl}/favorites`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      setFavorites((await response.json()) as Favorite[]);
    }
  }

  async function loadAfterSales(token = localStorage.getItem("authToken")) {
    if (!token) {
      return;
    }

    const response = await fetch(`${apiUrl}/after-sales`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      setAfterSales((await response.json()) as AfterSaleRequest[]);
    }
  }

  async function submitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem("authToken");
    if (!token) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const response = await fetch(`${apiUrl}/addresses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        label: String(form.get("label") ?? ""),
        recipientName: String(form.get("recipientName") ?? ""),
        phone: String(form.get("phone") ?? ""),
        province: String(form.get("province") ?? ""),
        city: String(form.get("city") ?? ""),
        district: String(form.get("district") ?? ""),
        line1: String(form.get("line1") ?? ""),
        postalCode: String(form.get("postalCode") ?? ""),
        isDefault: form.get("isDefault") === "on"
      })
    });

    if (response.ok) {
      event.currentTarget.reset();
      await loadAddresses(token);
      setMessage("Address saved.");
    }
  }

  async function confirmReceipt(orderId: string) {
    const token = localStorage.getItem("authToken");
    if (!token) {
      return;
    }

    const response = await fetch(`${apiUrl}/orders/${orderId}/confirm-receipt`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      setMessage("Receipt confirmed.");
      await loadOrders(token);
    } else {
      setMessage("Could not confirm receipt.");
    }
  }

  async function removeFavorite(productId: string) {
    const token = localStorage.getItem("authToken");
    if (!token) {
      return;
    }

    const response = await fetch(`${apiUrl}/favorites/${productId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      setMessage("Favorite removed.");
      await loadFavorites(token);
    }
  }

  async function submitAfterSale(event: FormEvent<HTMLFormElement>, order: Order) {
    event.preventDefault();
    const token = localStorage.getItem("authToken");
    if (!token) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const response = await fetch(`${apiUrl}/after-sales`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        orderId: order.id,
        type: String(form.get("type") ?? "REFUND"),
        amount: String(form.get("amount") ?? order.totalAmount),
        reason: String(form.get("reason") ?? ""),
        returnTrackingNumber: String(form.get("returnTrackingNumber") ?? "")
      })
    });

    setMessage(response.ok ? "After-sales request submitted." : "Could not submit after-sales request.");
    if (response.ok) {
      event.currentTarget.reset();
      await loadAfterSales(token);
    }
  }

  function logout() {
    localStorage.removeItem("authToken");
    setUser(null);
    setAddresses([]);
    setOrders([]);
    setFavorites([]);
    setAfterSales([]);
    setMessage("Signed out.");
    window.dispatchEvent(new Event(authChangedEvent));
  }

  return (
    <main className="shell">
      <SiteNav />

      <section className="accountLayout">
        <div className="detailPanel">
          <span>Stage 6</span>
          <h1>{user ? "Account" : "Guest account"}</h1>
          {user ? (
            <>
              <p>{user.name}</p>
              <p>{user.email}</p>
              <button type="button" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <p>Hover Account in the top navigation to login or register.</p>
          )}
          {message ? <p className="formMessage">{message}</p> : null}
        </div>

        <div className="detailPanel">
          <span>Shipping addresses</span>
          <h2>Address book</h2>
          {user ? (
            <>
              <form className="formGrid" onSubmit={(event) => void submitAddress(event)}>
                <input name="label" placeholder="Label" required />
                <input name="recipientName" placeholder="Recipient" required />
                <input name="phone" placeholder="Phone" required />
                <input name="province" placeholder="Province" required />
                <input name="city" placeholder="City" required />
                <input name="district" placeholder="District" />
                <input className="fullSpan" name="line1" placeholder="Street address" required />
                <input name="postalCode" placeholder="Postal code" />
                <label className="checkRow">
                  <input name="isDefault" type="checkbox" />
                  Default
                </label>
                <button type="submit">Save address</button>
              </form>

              <div className="addressList">
                {addresses.map((address) => (
                  <article className="addressItem" key={address.id}>
                    <strong>
                      {address.label}
                      {address.isDefault ? " · Default" : ""}
                    </strong>
                    <span>
                      {address.recipientName}, {address.phone}
                    </span>
                    <span>
                      {address.province} {address.city} {address.district} {address.line1}
                    </span>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p>Login to manage shipping addresses.</p>
          )}
        </div>

        <div className="detailPanel fullSpan">
          <span>Orders and logistics</span>
          <h2>My orders</h2>
          {user ? (
            <div className="orderList">
              {orders.map((order) => (
                <article className="orderItem" key={order.id}>
                  <div className="orderItemHead">
                    <div>
                      <strong>{order.orderNo}</strong>
                      <span>{order.status}</span>
                    </div>
                    <strong>CNY {order.totalAmount}</strong>
                  </div>
                  <dl className="orderMeta">
                    <div>
                      <dt>Created</dt>
                      <dd>{new Date(order.createdAt).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>Paid</dt>
                      <dd>{order.paidAt ? new Date(order.paidAt).toLocaleString() : "-"}</dd>
                    </div>
                    <div>
                      <dt>Shipped</dt>
                      <dd>{order.shippedAt ? new Date(order.shippedAt).toLocaleString() : "-"}</dd>
                    </div>
                    <div>
                      <dt>Completed</dt>
                      <dd>{order.completedAt ? new Date(order.completedAt).toLocaleString() : "-"}</dd>
                    </div>
                  </dl>
                  {order.shipment ? (
                    <div className="shipmentBox">
                      <div>
                        <strong>{order.shipment.carrierName}</strong>
                        <span>{order.shipment.carrierCode ?? "Carrier code not set"}</span>
                      </div>
                      <div>
                        <span>Tracking number</span>
                        <strong>{order.shipment.trackingNumber}</strong>
                      </div>
                      <div>
                        <span>Auto confirm</span>
                        <strong>{new Date(order.shipment.autoConfirmAt).toLocaleString()}</strong>
                      </div>
                      <div className="shipmentActions">
                        {order.shipment.trackingUrl ? (
                          <a className="detailLink" href={order.shipment.trackingUrl} target="_blank" rel="noreferrer">
                            Track package
                          </a>
                        ) : null}
                        {order.status === "SHIPPED" ? (
                          <button type="button" onClick={() => void confirmReceipt(order.id)}>
                            Confirm receipt
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : order.status === "PAID" ? (
                    <p className="mutedCopy">Awaiting shipment.</p>
                  ) : null}
                  {["PAID", "SHIPPED", "COMPLETED"].includes(order.status) ? (
                    <form className="afterSaleForm" onSubmit={(event) => void submitAfterSale(event, order)}>
                      <select name="type" aria-label={`After-sale type for ${order.orderNo}`}>
                        <option value="REFUND">Refund</option>
                        <option value="RETURN_REFUND">Return and refund</option>
                      </select>
                      <input name="amount" placeholder="Amount" defaultValue={order.totalAmount} />
                      <input name="returnTrackingNumber" placeholder="Return tracking number" />
                      <input className="fullSpan" name="reason" placeholder="Reason" required />
                      <button type="submit">Submit after-sales</button>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p>Login to view order logistics.</p>
          )}
        </div>

        <div className="detailPanel">
          <span>Favorites</span>
          <h2>Saved products</h2>
          {user ? (
            <div className="favoriteList">
              {favorites.map((favorite) => (
                <article className="favoriteItem" key={favorite.id}>
                  <div>
                    <a href={`/products/${favorite.product.slug}`}>
                      <strong>{favorite.product.name}</strong>
                    </a>
                    <span>{favorite.product.summary ?? "No summary"}</span>
                  </div>
                  <strong>CNY {favorite.product.skus[0]?.price ?? "0.00"}</strong>
                  <button type="button" onClick={() => void removeFavorite(favorite.product.id)}>
                    Remove
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p>Login to view favorites.</p>
          )}
        </div>

        <div className="detailPanel">
          <span>After-sales</span>
          <h2>Requests</h2>
          {user ? (
            <div className="afterSaleList">
              {afterSales.map((request) => (
                <article className="addressItem" key={request.id}>
                  <strong>
                    {request.orderNo} / {request.type}
                  </strong>
                  <span>
                    {request.status} / CNY {request.amount}
                  </span>
                  <span>{request.reason}</span>
                  {request.adminNote ? <span>{request.adminNote}</span> : null}
                </article>
              ))}
            </div>
          ) : (
            <p>Login to view after-sales requests.</p>
          )}
        </div>
      </section>
    </main>
  );
}
