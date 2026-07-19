"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteNav } from "../../components/site-nav";

type Order = {
  id: string;
  orderNo: string;
  status: "PENDING_PAYMENT" | "PAID" | "SHIPPED" | "COMPLETED" | "CLOSED";
  totalAmount: string;
  paidAt: string | null;
  expiresAt: string;
};

type Payment = {
  id: string;
  provider: "TEST" | "STRIPE";
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CLOSED";
  amount: string;
  currency: string;
  checkoutUrl: string | null;
  failureReason: string | null;
  createdAt: string;
  callbacks: Array<{
    id: string;
    providerEventId: string;
    isVerified: boolean;
    processingResult: string | null;
  }>;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function PayClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<"TEST" | "STRIPE">("TEST");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingPayment = useMemo(
    () => payments.find((payment) => payment.status === "PENDING") ?? null,
    [payments]
  );

  useEffect(() => {
    void loadPaymentState();
  }, []);

  function getAuthHeaders() {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Login is required before payment.");
    }

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  }

  async function loadPaymentState() {
    try {
      const headers = getAuthHeaders();
      const [orderResponse, paymentsResponse] = await Promise.all([
        fetch(`${apiUrl}/orders/${orderId}`, { headers }),
        fetch(`${apiUrl}/orders/${orderId}/payments`, { headers })
      ]);

      if (!orderResponse.ok || !paymentsResponse.ok) {
        throw new Error("Could not load payment.");
      }

      setOrder((await orderResponse.json()) as Order);
      setPayments((await paymentsResponse.json()) as Payment[]);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load payment.");
    }
  }

  async function createPayment() {
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`${apiUrl}/payments`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          orderId,
          provider: selectedProvider,
          idempotencyKey: `pay-${orderId}-${selectedProvider}-${crypto.randomUUID()}`
        })
      });

      if (!response.ok) {
        throw new Error(selectedProvider === "STRIPE" ? "Stripe is not configured." : "Could not create payment.");
      }

      const payment = (await response.json()) as Payment;
      setPayments((current) => [payment, ...current.filter((item) => item.id !== payment.id)]);
      setMessage(payment.checkoutUrl ? `Payment created: ${payment.checkoutUrl}` : "Payment created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create payment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function simulate(outcome: "success" | "failed", amount?: string) {
    if (!pendingPayment) {
      setMessage("Create a test payment first.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`${apiUrl}/payments/test/simulate`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ paymentId: pendingPayment.id, outcome, amount })
      });

      if (!response.ok) {
        throw new Error("Payment callback was rejected.");
      }

      setMessage(outcome === "success" ? "Payment succeeded." : "Payment failed. You can create another payment.");
      await loadPaymentState();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not simulate payment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <SiteNav />

      <section className="catalogHeader">
        <div>
          <p>Stage 4</p>
          <h1>Payment</h1>
        </div>
        <a className="detailLink" href="/account">
          Account
        </a>
      </section>

      {message ? <p className="formMessage">{message}</p> : null}

      <section className="paymentLayout">
        <div className="detailPanel">
          <span>Order</span>
          <h2>{order?.orderNo ?? "Loading..."}</h2>
          <strong className="paymentAmount">CNY {order?.totalAmount ?? "0.00"}</strong>
          <dl className="specList">
            <div>
              <dt>Status</dt>
              <dd>{order?.status ?? "-"}</dd>
            </div>
            <div>
              <dt>Paid at</dt>
              <dd>{order?.paidAt ? new Date(order.paidAt).toLocaleString() : "-"}</dd>
            </div>
            <div>
              <dt>Expires</dt>
              <dd>{order?.expiresAt ? new Date(order.expiresAt).toLocaleString() : "-"}</dd>
            </div>
          </dl>
        </div>

        <div className="orderSummary">
          <span>Payment channel</span>
          <h2>Create payment</h2>
          <div className="paymentProviderTabs">
            <button
              className={selectedProvider === "TEST" ? "active" : ""}
              type="button"
              onClick={() => setSelectedProvider("TEST")}
            >
              Test
            </button>
            <button
              className={selectedProvider === "STRIPE" ? "active" : ""}
              type="button"
              onClick={() => setSelectedProvider("STRIPE")}
            >
              Stripe
            </button>
          </div>
          <button disabled={isSubmitting || order?.status !== "PENDING_PAYMENT"} type="button" onClick={() => void createPayment()}>
            {isSubmitting ? "Working..." : "Create payment"}
          </button>
          <button disabled={isSubmitting || !pendingPayment || pendingPayment.provider !== "TEST"} type="button" onClick={() => void simulate("success")}>
            Simulate success
          </button>
          <button disabled={isSubmitting || !pendingPayment || pendingPayment.provider !== "TEST"} type="button" onClick={() => void simulate("failed")}>
            Simulate failure
          </button>
          <button disabled={isSubmitting || !pendingPayment || pendingPayment.provider !== "TEST"} type="button" onClick={() => void simulate("success", "0.01")}>
            Simulate amount mismatch
          </button>
        </div>
      </section>

      <section className="paymentHistory">
        <div className="sectionTitle">
          <p>Payment attempts</p>
          <h2>History</h2>
        </div>
        {payments.map((payment) => (
          <article key={payment.id}>
            <div>
              <strong>{payment.provider}</strong>
              <span>{payment.status}</span>
              <small>{new Date(payment.createdAt).toLocaleString()}</small>
            </div>
            <div>
              <strong>
                {payment.currency} {payment.amount}
              </strong>
              <small>{payment.failureReason ?? payment.checkoutUrl ?? "Awaiting callback"}</small>
            </div>
            {payment.callbacks.length ? (
              <small>
                Last callback: {payment.callbacks[0]?.processingResult} / verified{" "}
                {payment.callbacks[0]?.isVerified ? "yes" : "no"}
              </small>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
