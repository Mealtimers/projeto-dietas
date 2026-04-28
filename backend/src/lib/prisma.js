const { PrismaClient } = require('@prisma/client');
const { attachMiddleware } = require('./supabasePublisher');

const prisma = global.prisma || new PrismaClient();

// Anexa o middleware de publish no Supabase apenas uma vez.
if (!global.__supabaseMiddlewareAttached) {
  attachMiddleware(prisma);
  global.__supabaseMiddlewareAttached = true;
}

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

module.exports = prisma;
