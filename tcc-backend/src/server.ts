import fastify from 'fastify'
import { hostRoutes } from './routes/hosts'
import { ipRoutes } from './routes/ipRoutes'
import { topologyRoutes } from './routes/topologyRoutes'

const app = fastify({
  // logger: true, // Mantém logs detalhados das requisições no terminal
})

// Rota Raiz (Health Check) - Adicionada aqui!
app.get('/', async () => {
  return { status: 'API do Inventário de Rede Online!', version: '1.0.0' }
})

// Registro de rotas
app.register(hostRoutes)
app.register(ipRoutes);
app.register(topologyRoutes);

const start = async () => {
  try {
    // Escuta na porta 3333 e aceita conexões externas (importante para Docker ou testes em outros dispositivos)
    await app.listen({ port: 3333, host: '0.0.0.0' })
    console.log('🚀 Server HTTP running on http://localhost:3333')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()