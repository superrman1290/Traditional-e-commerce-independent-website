const links = [
  { label: "分类", href: "#" },
  { label: "热卖", href: "#" },
  { label: "购物车", href: "#" },
  { label: "订单", href: "#" }
];

export default function StorefrontHomePage() {
  return (
    <main className="shell">
      <nav className="nav" aria-label="主导航">
        <strong>Traditional Commerce</strong>
        <div>
          {links.map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
      </nav>

      <section className="statusPanel">
        <p>阶段 0</p>
        <h1>前台应用已就绪</h1>
        <span>Next.js storefront is running.</span>
      </section>
    </main>
  );
}

