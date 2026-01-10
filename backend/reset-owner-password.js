const { PrismaClient } = require('@prisma/client');
const { PrismaMssql } = require('@prisma/adapter-mssql');
const bcrypt = require('bcrypt');

// Load environment variables
require('dotenv').config();

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

async function resetOwnerPassword() {
  try {
    // First, check if user exists
    const user = await prisma.user.findUnique({
      where: { email: 'owner@contoh.com' },
    });
    
    if (!user) {
      console.log('❌ User not found. Checking all users...');
      const allUsers = await prisma.user.findMany({
        select: { email: true, role: true },
      });
      console.log('Available users:', allUsers);
      return;
    }
    
    console.log('Found user:', user.email, 'Role:', user.role);
    
    const newPassword = 'NewPassword123!';
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { email: 'owner@contoh.com' },
      data: { passwordHash },
    });
    
    console.log('✅ Password reset successfully!');
    console.log('Email: owner@contoh.com');
    console.log('New Password: NewPassword123!');
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

resetOwnerPassword();
