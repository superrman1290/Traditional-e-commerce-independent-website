export type AppName = "storefront" | "admin" | "api";

export type ServiceHealth = {
  status: "ok";
  service: AppName;
  timestamp: string;
};

export function createServiceHealth(service: AppName): ServiceHealth {
  return {
    status: "ok",
    service,
    timestamp: new Date().toISOString()
  };
}

