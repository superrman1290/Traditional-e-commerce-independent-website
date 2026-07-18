import { Controller, Get } from "@nestjs/common";

export type HealthResponse = {
  status: "ok";
  service: "api";
  timestamp: string;
};

@Controller()
export class HealthController {
  @Get("health")
  getHealth(): HealthResponse {
    return {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString()
    };
  }
}

