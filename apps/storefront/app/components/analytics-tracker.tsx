"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getAnonymousId() {
  const storageKey = "anonymousVisitorId";
  const existing = localStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const nextId = crypto.randomUUID();
  localStorage.setItem(storageKey, nextId);
  return nextId;
}

function readTrafficSource(searchParams: URLSearchParams) {
  const utmSource = searchParams.get("utm_source");
  const referrerHost = document.referrer ? new URL(document.referrer).host : "";

  return {
    source: utmSource ?? referrerHost ?? "direct",
    medium: searchParams.get("utm_medium") ?? undefined,
    campaign: searchParams.get("utm_campaign") ?? undefined,
    referrer: document.referrer || undefined
  };
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const payload = {
      eventType: "PAGE_VIEW",
      path: `${pathname}${params.size ? `?${params.toString()}` : ""}`,
      anonymousId: getAnonymousId(),
      guestSessionId: localStorage.getItem("guestSessionId") ?? undefined,
      ...readTrafficSource(params)
    };

    const body = JSON.stringify(payload);
    const endpoint = `${apiUrl}/analytics/events`;

    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      return;
    }

    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    });
  }, [pathname, searchParams]);

  return null;
}
