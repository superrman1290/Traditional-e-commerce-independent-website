export type AppName = "storefront" | "admin" | "api";

export type ServiceHealth = {
  status: "ok";
  service: AppName;
  timestamp: string;
};

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
};

export type CatalogImage = {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
};

export type CatalogOptionValue = {
  id: string;
  value: string;
  position: number;
};

export type CatalogOption = {
  id: string;
  name: string;
  position: number;
  values: CatalogOptionValue[];
};

export type CatalogSku = {
  id: string;
  skuCode: string;
  name: string;
  price: string;
  compareAtPrice: string | null;
  stockQuantity: number;
  lockedStockQuantity: number;
  availableStock: number;
  lowStockThreshold: number;
  isActive: boolean;
  optionSignature: Record<string, string>;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  description: string;
  status: ProductStatus;
  category: CatalogCategory | null;
  images: CatalogImage[];
  options: CatalogOption[];
  skus: CatalogSku[];
  createdAt: string;
  updatedAt: string;
};

export function createServiceHealth(service: AppName): ServiceHealth {
  return {
    status: "ok",
    service,
    timestamp: new Date().toISOString()
  };
}
