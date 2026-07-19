import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void
    ) => {
      const allowedOrigins = new Set([
        process.env.STOREFRONT_URL ?? "http://localhost:3000",
        process.env.ADMIN_URL ?? "http://localhost:3001"
      ]);
      const isLocalNextDev = origin ? /^http:\/\/localhost:300\d$/.test(origin) : false;

      callback(null, !origin || allowedOrigins.has(origin) || isLocalNextDev);
    }
  });

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
}

void bootstrap();
