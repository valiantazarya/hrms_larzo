import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private configService: ConfigService) {
    const connectionString = configService.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    // Parse SQL Server connection string or use individual config
    let sqlConfig: any;

    if (connectionString.startsWith('sqlserver://')) {
      // Parse SQL Server connection string
      const parts = connectionString.replace('sqlserver://', '').split(';');
      const serverPart = parts[0].split(':');
      const config: Record<string, string> = {};
      
      parts.slice(1).forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) config[key.trim()] = value.trim();
      });
      
      sqlConfig = {
        user: config.user || configService.get<string>('DB_USER') || 'sa',
        password: config.password || configService.get<string>('DB_PASSWORD') || 'HrmsPassword123!',
        database: config.database || configService.get<string>('DB_NAME') || 'larzo_hrms',
        server: serverPart[0] || configService.get<string>('DB_HOST') || 'localhost',
        port: parseInt(serverPart[1] || config.port || '1433'),
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000,
        },
        options: {
          encrypt: config.encrypt === 'true' || configService.get<string>('DB_ENCRYPT') === 'true',
          trustServerCertificate: config.trustServerCertificate !== 'false' && configService.get<string>('DB_TRUST_CERT') !== 'false',
        },
      };
    } else {
      // Use individual environment variables or defaults
      sqlConfig = {
        user: configService.get<string>('DB_USER') || 'sa',
        password: configService.get<string>('DB_PASSWORD') || 'HrmsPassword123!',
        database: configService.get<string>('DB_NAME') || 'larzo_hrms',
        server: configService.get<string>('DB_HOST') || 'localhost',
        port: parseInt(configService.get<string>('DB_PORT') || '1433'),
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000,
        },
        options: {
          encrypt: configService.get<string>('DB_ENCRYPT') === 'true',
          trustServerCertificate: configService.get<string>('DB_TRUST_CERT') !== 'false',
        },
      };
    }
    
    const adapter = new PrismaMssql(sqlConfig);
    // Prisma 7 requires adapter for SQL Server
    super({ adapter } as any);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

