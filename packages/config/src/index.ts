export type RuntimeConfig = {
  apiPort: number;
  apiUrl: string;
  adminUrl: string;
  storefrontUrl: string;
};

export function getRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    apiPort: Number(env.API_PORT ?? 4000),
    apiUrl: env.API_URL ?? "http://localhost:4000",
    adminUrl: env.ADMIN_URL ?? "http://localhost:3001",
    storefrontUrl: env.STOREFRONT_URL ?? "http://localhost:3000"
  };
}

