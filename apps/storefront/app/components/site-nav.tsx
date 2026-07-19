import { AccountMenu } from "./account-menu";

export function SiteNav() {
  return (
    <nav className="nav" aria-label="Main navigation">
      <strong>Traditional Commerce</strong>
      <div className="navLinks">
        <a href="/">Products</a>
        <a href="/support">Support</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/cart">Cart</a>
        <AccountMenu />
      </div>
    </nav>
  );
}
