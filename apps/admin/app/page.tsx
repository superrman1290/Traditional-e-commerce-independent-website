const metrics = [
  { label: "今日销售额", value: "0.00" },
  { label: "今日订单量", value: "0" },
  { label: "待发货", value: "0" }
];

export default function AdminHomePage() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <strong>Commerce Admin</strong>
        <a href="#">概览</a>
        <a href="#">商品</a>
        <a href="#">订单</a>
      </aside>

      <section className="workspace">
        <header>
          <p>阶段 0</p>
          <h1>运营后台已就绪</h1>
        </header>

        <div className="metrics">
          {metrics.map((metric) => (
            <article key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

