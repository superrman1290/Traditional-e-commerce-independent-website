import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { PrismaService } from "./prisma.service";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";

@Module({
  controllers: [HealthController, ProductsController],
  providers: [PrismaService, ProductsService]
})
export class AppModule {}
