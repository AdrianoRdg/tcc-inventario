import 'dotenv/config' // <-- Adicione esta linha no topo!
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Se imprimir 'undefined' no terminal, era esse o problema!
console.log("🔗 URL carregada:", process.env.DATABASE_URL) 

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'dev' ? ['query', 'error'] : ['error'],
})