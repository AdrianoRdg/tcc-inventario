import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../lib/prisma'
import axios from 'axios'

export async function topologyRoutes(app: FastifyInstance) {
  
  // Rota para disparar a descoberta/geração da topologia
  app.get('/topology', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1. Busca os hosts no banco, selecionando apenas os campos necessários
      const hosts = await prisma.host.findMany({
        select: {
          id: true,
          name: true,
          ip: true,
          port: true,
          login: true,
          password: true
        }
      })
      
      // Verifica se existem hosts cadastrados para evitar requisições vazias
      if (hosts.length === 0) {
        return reply.status(404).send({ message: 'Nenhum host encontrado para envio.' })
      }

      console.log(hosts);
      

      // 2. Define a URL da API externa que fará o processamento
      // É recomendado colocar essa URL no seu arquivo .env
      const EXTERNAL_API_URL = process.env.TOPOLOGY_ENGINE_URL || 'http://localhost:8000/topology'

      // 3. Faz o POST para a API externa enviando o array de hosts
      const response = await axios.post(EXTERNAL_API_URL, hosts, {
        headers: {
          'Content-Type': 'application/json'
        },
        // Opcional: define um timeout para não travar a requisição caso a API externa demore muito
        timeout: 60000 
      })

      // 4. Retorna o resultado gerado pela API de topologia para o client
      return reply.send(response.data)

    } catch (error: any) {
      // 5. Tratamento de erros detalhado
      app.log.error(error)

      // Se o erro for na comunicação com a API externa (Axios)
      if (axios.isAxiosError(error)) {
        return reply.status(error.response?.status || 502).send({
          message: 'Falha ao comunicar com o serviço de topologia.',
          details: error.response?.data || error.message
        })
      }

      // Se for um erro interno do Prisma ou do Fastify
      return reply.status(500).send({ message: 'Erro interno ao processar a rota de topologia.' })
    }
  })
}