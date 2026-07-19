import { Module } from "@nestjs/common";
import { AddressesController } from "./addresses.controller";
import { AddressesService } from "./addresses.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";
import { HealthController } from "./health.controller";
import { PrismaService } from "./prisma.service";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";

@Module({
  controllers: [HealthController, ProductsController, AuthController, CartController, AddressesController],
  providers: [PrismaService, ProductsService, AuthService, CartService, AddressesService]
})
export class AppModule {}
