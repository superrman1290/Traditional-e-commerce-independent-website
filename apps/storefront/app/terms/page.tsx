import { SiteNav } from "../components/site-nav";

export default function TermsPage() {
  return (
    <main className="shell">
      <SiteNav />

      <section className="policyPage">
        <p>Launch readiness</p>
        <h1>User Agreement</h1>
        <article>
          <h2>Orders</h2>
          <p>
            Orders are created after the server validates SKU availability, address information, shipping fees and coupon
            eligibility. Final payable amounts are always calculated by the API.
          </p>
        </article>
        <article>
          <h2>Payment and delivery</h2>
          <p>
            Payment records are stored separately from business orders. Delivery status is based on merchant shipment
            records and customer receipt confirmation.
          </p>
        </article>
        <article>
          <h2>After-sales</h2>
          <p>
            Paid, shipped or completed orders may submit refund or return-refund requests. The merchant reviews each
            request before issuing payment refund records.
          </p>
        </article>
        <article>
          <h2>Account responsibility</h2>
          <p>
            Customers are responsible for keeping login credentials secure and for providing accurate contact and delivery
            information.
          </p>
        </article>
      </section>
    </main>
  );
}
