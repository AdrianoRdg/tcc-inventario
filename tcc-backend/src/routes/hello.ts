import { FastifyInstance } from 'fastify'

export async function helloRoutes(app: FastifyInstance) {
  app.get('/hello', async (request, reply) => {
    return { message: 'Hello, World!' }
  })
}
