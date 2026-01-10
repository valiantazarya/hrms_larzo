const { PrismaClient } = require('@prisma/client');
const { PrismaMssql } = require('@prisma/adapter-mssql');

// Parse SQL Server connection string
const connectionString = process.env.DATABASE_URL || '';
let sqlConfig;

if (connectionString.startsWith('sqlserver://')) {
  const parts = connectionString.replace('sqlserver://', '').split(';');
  const serverPart = parts[0].split(':');
  const config = {};
  
  parts.slice(1).forEach(part => {
    const [key, value] = part.split('=');
    if (key && value) config[key.trim()] = value.trim();
  });
  
  sqlConfig = {
    user: config.user || 'sa',
    password: config.password || 'HrmsPassword123!',
    database: config.database || 'larzo_hrms',
    server: serverPart[0] || 'localhost',
    port: parseInt(serverPart[1] || config.port || '1433'),
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    options: {
      encrypt: config.encrypt === 'true',
      trustServerCertificate: config.trustServerCertificate !== 'false',
    },
  };
} else {
  sqlConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'HrmsPassword123!',
    database: process.env.DB_NAME || 'larzo_hrms',
    server: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
    },
  };
}

const adapter = new PrismaMssql(sqlConfig);
const prisma = new PrismaClient({ adapter });

async function getResetToken() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'owner@contoh.com' },
      select: { resetToken: true, resetTokenExpires: true },
    });
    
    if (user && user.resetToken) {
      console.log('Reset Token:', user.resetToken);
      console.log('Expires:', user.resetTokenExpires);
      return user.resetToken;
    } else {
      console.log('No reset token found. Please run forgot-password first.');
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

getResetToken();
