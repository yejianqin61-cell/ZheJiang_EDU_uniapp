import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Public()
  @Get()
  async check() {
    const checks: Record<string, { status: string; latencyMs?: number }> = {};

    // DB check
    const dbStart = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      checks.db = { status: 'ok', latencyMs: Date.now() - dbStart };
    } catch (err: any) {
      checks.db = { status: 'error', latencyMs: Date.now() - dbStart };
    }

    const allOk = Object.values(checks).every((c) => c.status === 'ok');

    return {
      status: allOk ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      checks,
    };
  }
}
