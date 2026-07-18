export const databasePackageName = "@ecommerce/database";

export type SystemSetting = {
  id: string;
  key: string;
  value: string | null;
  createdAt: Date;
  updatedAt: Date;
};

