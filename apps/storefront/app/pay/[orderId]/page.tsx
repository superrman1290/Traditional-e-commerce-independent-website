import { PayClient } from "./pay-client";

export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <PayClient orderId={orderId} />;
}
