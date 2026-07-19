import { SiteNav } from "../components/site-nav";

export default function PrivacyPage() {
  return (
    <main className="shell">
      <SiteNav />

      <section className="policyPage">
        <p>Launch readiness</p>
        <h1>Privacy Policy</h1>
        <article>
          <h2>Information we collect</h2>
          <p>
            We collect account details, delivery addresses, order records, support messages and storefront behavior events
            needed to provide shopping, payment, delivery, after-sales and security services.
          </p>
        </article>
        <article>
          <h2>How we use information</h2>
          <p>
            Data is used for order fulfillment, customer support, fraud prevention, sales analysis, product improvement,
            abandoned cart reminders and legally required record keeping.
          </p>
        </article>
        <article>
          <h2>Cookies and analytics</h2>
          <p>
            The storefront stores a local anonymous visitor identifier and sends page view events with traffic source data.
            Customers can clear browser storage to reset this identifier.
          </p>
        </article>
        <article>
          <h2>Data protection</h2>
          <p>
            Passwords are hashed, payment card data is not stored by this site, and production secrets must be provided by
            environment variables. Backups should be encrypted and kept outside Git.
          </p>
        </article>
      </section>
    </main>
  );
}
