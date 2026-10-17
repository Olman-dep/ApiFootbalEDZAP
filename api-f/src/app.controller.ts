import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, MongooseHealthIndicator } from '@nestjs/terminus';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private health: HealthCheckService,
    private db: MongooseHealthIndicator,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @HealthCheck()
  checkHealth() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}