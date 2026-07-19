"use client";

import { FormEvent, useEffect, useState } from "react";

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

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function AccountPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [user, setUser] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadSession();
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
    } else {
      localStorage.removeItem("authToken");
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

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const form = new FormData(event.currentTarget);
    const endpoint = mode === "login" ? "login" : "register";
    const body = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      name: String(form.get("name") ?? ""),
      guestSessionId: localStorage.getItem("guestSessionId") ?? undefined
    };

    const response = await fetch(`${apiUrl}/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      setMessage("Could not authenticate with those details.");
      return;
    }

    const result = (await response.json()) as { token: string; user: User };
    localStorage.setItem("authToken", result.token);
    localStorage.removeItem("guestSessionId");
    setUser(result.user);
    setMessage("Signed in. Guest cart has been merged.");
    await loadAddresses(result.token);
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

  function logout() {
    localStorage.removeItem("authToken");
    setUser(null);
    setAddresses([]);
    setMessage("Signed out.");
  }

  return (
    <main className="shell">
      <nav className="nav" aria-label="Main navigation">
        <strong>Traditional Commerce</strong>
        <div>
          <a href="/">Products</a>
          <a href="/cart">Cart</a>
        </div>
      </nav>

      <section className="accountLayout">
        <div className="detailPanel">
          <span>Stage 2</span>
          <h1>{user ? "Account" : "Sign in"}</h1>
          {user ? (
            <>
              <p>{user.name}</p>
              <p>{user.email}</p>
              <button type="button" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="categoryTabs compactTabs">
                <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>
                  Login
                </button>
                <button
                  className={mode === "register" ? "active" : ""}
                  type="button"
                  onClick={() => setMode("register")}
                >
                  Register
                </button>
              </div>
              <form className="formStack" onSubmit={(event) => void submitAuth(event)}>
                {mode === "register" ? <input name="name" placeholder="Name" required /> : null}
                <input name="email" placeholder="Email" required type="email" />
                <input minLength={8} name="password" placeholder="Password" required type="password" />
                <button type="submit">{mode === "login" ? "Login" : "Register"}</button>
              </form>
            </>
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
      </section>
    </main>
  );
}

