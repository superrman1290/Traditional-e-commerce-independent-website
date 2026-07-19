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

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
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
    } else {
      localStorage.removeItem("authToken");
      setUser(null);
      setAddresses([]);
      setOrders([]);
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

  function logout() {
    localStorage.removeItem("authToken");
    setUser(null);
    setAddresses([]);
    setMessage("Signed out.");
    window.dispatchEvent(new Event(authChangedEvent));
  }

  return (
    <main className="shell">
      <SiteNav />

      <section className="accountLayout">
        <div className="detailPanel">
          <span>Stage 5</span>
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
                </article>
              ))}
            </div>
          ) : (
            <p>Login to view order logistics.</p>
          )}
        </div>
      </section>
    </main>
  );
}
