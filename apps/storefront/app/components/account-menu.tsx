"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type User = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
};

type AuthMode = "login" | "register";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const authChangedEvent = "storefront-auth-changed";

export function AccountMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void loadUser();
    window.addEventListener(authChangedEvent, loadUser);

    return () => {
      window.removeEventListener(authChangedEvent, loadUser);
      clearCloseTimer();
    };
  }, []);

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openMenu() {
    clearCloseTimer();
    setIsMenuOpen(true);
  }

  function scheduleCloseMenu() {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setIsMenuOpen(false), 100);
  }

  async function loadUser() {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setUser(null);
      return;
    }

    const response = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      setUser((await response.json()) as User);
    } else {
      localStorage.removeItem("authToken");
      setUser(null);
    }
  }

  function openModal(mode: AuthMode) {
    setAuthMode(mode);
    setMessage("");
    clearCloseTimer();
    setIsMenuOpen(false);
    setIsModalOpen(true);
  }

  function logout() {
    localStorage.removeItem("authToken");
    setUser(null);
    clearCloseTimer();
    setIsMenuOpen(false);
    window.dispatchEvent(new Event(authChangedEvent));
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const endpoint = authMode === "login" ? "login" : "register";
    const response = await fetch(`${apiUrl}/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        name: String(form.get("name") ?? ""),
        guestSessionId: localStorage.getItem("guestSessionId") ?? undefined
      })
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setMessage("Could not authenticate with those details.");
      return;
    }

    const result = (await response.json()) as { token: string; user: User };
    localStorage.setItem("authToken", result.token);
    localStorage.removeItem("guestSessionId");
    setUser(result.user);
    clearCloseTimer();
    setIsMenuOpen(false);
    setIsModalOpen(false);
    window.dispatchEvent(new Event(authChangedEvent));
  }

  const displayName = user?.name ?? "Guest";
  const identity = user ? "Registered customer" : "Guest visitor";

  return (
    <div
      className={isModalOpen ? "accountMenu authOpen" : "accountMenu"}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleCloseMenu}
    >
      <button
        aria-expanded={isMenuOpen}
        aria-haspopup="true"
        className="accountTrigger"
        type="button"
        onClick={() => setIsMenuOpen((open) => !open)}
        onMouseEnter={openMenu}
      >
        Account
      </button>
      <div className={isMenuOpen ? "accountDropdown open" : "accountDropdown"} role="menu">
        <div className="accountProfile">
          <div className="avatar" aria-hidden="true">
            {user ? initials(user.name) : "G"}
          </div>
          <div>
            <strong>{displayName}</strong>
            <span>{identity}</span>
            {user ? <small>{maskEmail(user.email)}</small> : null}
          </div>
        </div>

        <div className="accountLinks">
          {user ? (
            <>
              <a href="/account">Account center</a>
              <button type="button" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => openModal("login")}>
                Login
              </button>
              <button type="button" onClick={() => openModal("register")}>
                Register
              </button>
            </>
          )}
        </div>
      </div>

      {isModalOpen ? (
        <div className="modalBackdrop" role="presentation" onMouseDown={() => setIsModalOpen(false)}>
          <section
            aria-modal="true"
            className="authModal"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modalClose" type="button" aria-label="Close" onClick={() => setIsModalOpen(false)}>
              x
            </button>
            <span>Account</span>
            <h2>{authMode === "login" ? "Login" : "Register"}</h2>
            <div className="categoryTabs compactTabs">
              <button className={authMode === "login" ? "active" : ""} type="button" onClick={() => setAuthMode("login")}>
                Login
              </button>
              <button
                className={authMode === "register" ? "active" : ""}
                type="button"
                onClick={() => setAuthMode("register")}
              >
                Register
              </button>
            </div>
            <form className="formStack" onSubmit={(event) => void submitAuth(event)}>
              {authMode === "register" ? <input name="name" placeholder="Name" required /> : null}
              <input name="email" placeholder="Email" required type="email" />
              <input minLength={8} name="password" placeholder="Password" required type="password" />
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : authMode === "login" ? "Login" : "Register"}
              </button>
            </form>
            {message ? <p className="formMessage">{message}</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

export { authChangedEvent };

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) {
    return email;
  }

  return `${name.slice(0, 2)}***@${domain}`;
}
