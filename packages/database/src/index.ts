export const databasePackageName = "@ecommerce/database";

export type SystemSetting = {
  id: string;
  key: string;
  value: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InventorySnapshot = {
  skuId: string;
  stockQuantity: number;
  lockedStockQuantity: number;
  availableStock: number;
};
