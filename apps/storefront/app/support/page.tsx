"use client";

import { FormEvent, useEffect, useState } from "react";
import { SiteNav } from "../components/site-nav";

type Marketing = {
  coupons: Array<{
    id: string;
    code: string;
    name: string;
    type: "FIXED_AMOUNT" | "PERCENTAGE";
    amount: string;
    minSubtotal: string;
    startsAt: string | null;
    endsAt: string | null;
    campaignType: "LIMITED_DISCOUNT" | "FULL_REDUCTION";
  }>;
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function SupportPage() {
  const [marketing, setMarketing] = useState<Marketing>({ coupons: [], faqs: [] });
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadMarketing() {
      const response = await fetch(`${apiUrl}/marketing`);
      if (response.ok) {
        setMarketing((await response.json()) as Marketing);
      }
    }

    void loadMarketing();
  }, []);

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(`${apiUrl}/newsletter-subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(form.get("email") ?? ""),
        source: "support"
      })
    });

    setMessage(response.ok ? "Subscription saved." : "Could not subscribe.");
    if (response.ok) {
      event.currentTarget.reset();
    }
  }

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const token = localStorage.getItem("authToken");
    const headers = new Headers({ "Content-Type": "application/json" });
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${apiUrl}/contact-messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        subject: String(form.get("subject") ?? ""),
        message: String(form.get("message") ?? "")
      })
    });

    setMessage(response.ok ? "Message sent." : "Could not send message.");
    if (response.ok) {
      event.currentTarget.reset();
    }
  }

  return (
    <main className="shell">
      <SiteNav />

      <section className="catalogHeader">
        <div>
          <p>Stage 6</p>
          <h1>Support And Offers</h1>
        </div>
      </section>

      {message ? <p className="formMessage">{message}</p> : null}

      <section className="supportLayout">
        <div className="detailPanel">
          <span>Promotions</span>
          <h2>Coupons and campaigns</h2>
          <div className="offerGrid">
            {marketing.coupons.map((coupon) => (
              <article className="offerCard" key={coupon.id}>
                <span>{coupon.campaignType === "LIMITED_DISCOUNT" ? "Limited offer" : "Full reduction"}</span>
                <h3>{coupon.name}</h3>
                <strong>{coupon.code}</strong>
                <p>
                  {coupon.type === "PERCENTAGE" ? `${coupon.amount}% off` : `CNY ${coupon.amount} off`} over CNY{" "}
                  {coupon.minSubtotal}
                </p>
                {coupon.endsAt ? <small>Ends {new Date(coupon.endsAt).toLocaleString()}</small> : null}
              </article>
            ))}
          </div>
        </div>

        <div className="detailPanel">
          <span>Email</span>
          <h2>Newsletter</h2>
          <form className="formStack" onSubmit={(event) => void subscribe(event)}>
            <input name="email" placeholder="Email" required type="email" />
            <button type="submit">Subscribe</button>
          </form>
        </div>

        <div className="detailPanel">
          <span>Contact</span>
          <h2>Contact us</h2>
          <form className="formStack" onSubmit={(event) => void submitContact(event)}>
            <input name="name" placeholder="Name" required />
            <input name="email" placeholder="Email" required type="email" />
            <input name="subject" placeholder="Subject" required />
            <textarea name="message" placeholder="Message" required />
            <button type="submit">Send</button>
          </form>
        </div>

        <div className="detailPanel">
          <span>FAQ</span>
          <h2>Common questions</h2>
          <div className="faqList">
            {marketing.faqs.map((faq) => (
              <article key={faq.id}>
                <strong>{faq.question}</strong>
                <p>{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
