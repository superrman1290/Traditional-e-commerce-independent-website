import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { ProductStatus } from "@prisma/client";
import type { CreateProductInput, InventoryAdjustmentInput } from "./products.service";
import { ProductsService } from "./products.service";

@Controller()
export class ProductsController {
  constructor(@Inject(ProductsService) private readonly productsService: ProductsService) {}

  @Get("categories")
  listCategories() {
    return this.productsService.listCategories();
  }

  @Get("products")
  listProducts(@Query("category") categorySlug?: string) {
    return this.productsService.listPublicProducts(categorySlug);
  }

  @Get("products/:slug")
  getProduct(@Param("slug") slug: string) {
    return this.productsService.getPublicProduct(slug);
  }

  @Get("admin/products")
  listAdminProducts() {
    return this.productsService.listAdminProducts();
  }

  @Post("admin/products")
  createProduct(@Body() body: CreateProductInput) {
    return this.productsService.createProduct(body);
  }

  @Patch("admin/products/:id/status")
  updateProductStatus(@Param("id") id: string, @Body("status") status: ProductStatus) {
    return this.productsService.updateProductStatus(id, status);
  }

  @Post("admin/inventory/adjustments")
  adjustInventory(@Body() body: InventoryAdjustmentInput) {
    return this.productsService.adjustInventory(body);
  }

  @Get("admin/inventory/records")
  listInventoryRecords(@Query("skuId") skuId?: string) {
    return this.productsService.listInventoryRecords(skuId);
  }
}
