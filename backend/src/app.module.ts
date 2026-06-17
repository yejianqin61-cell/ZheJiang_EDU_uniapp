import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PaperModule } from './modules/paper/paper.module';
import { OrderModule } from './modules/order/order.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ExportModule } from './modules/export/export.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';
import { AdminModule } from './modules/admin/admin.module';
import { PrintModule } from './modules/print/print.module';
import { ContributionModule } from './modules/contribution/contribution.module';
import { BalanceModule } from './modules/balance/balance.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Rate limiting: 60 requests/minute globally, burst up to 10
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    // Database: SQLite for local dev, PostgreSQL for production
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbType = config.get<string>('DB_TYPE', 'sqlite');
        if (dbType === 'postgres') {
          return {
            type: 'postgres',
            host: config.get<string>('DB_HOST', 'localhost'),
            port: config.get<number>('DB_PORT', 5432),
            username: config.get<string>('DB_USER', 'postgres'),
            password: config.get<string>('DB_PASSWORD', 'postgres'),
            database: config.get<string>('DB_NAME', 'ai_paper'),
            autoLoadEntities: true,
            synchronize: false,
          };
        }
        // SQL.js — pure JS SQLite, no native deps.
        // Use DB_PATH env var to override (e.g. ':memory:' for isolated tests).
        return {
          type: 'sqljs',
          location: process.env.DB_PATH ?? 'dev.db',
          autoSave: process.env.DB_PATH === ':memory:' ? false : true,
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),

    // BullMQ — only when Redis is configured
    ...(process.env.REDIS_HOST
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              connection: {
                host: config.get<string>('REDIS_HOST', 'localhost'),
                port: config.get<number>('REDIS_PORT', 6379),
              },
            }),
          }),
        ]
      : []),

    AuthModule,
    UserModule,
    PaperModule,
    OrderModule,
    PaymentModule,
    ExportModule,
    KnowledgeBaseModule,
    AdminModule,
    PrintModule,
    ContributionModule,
    BalanceModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
