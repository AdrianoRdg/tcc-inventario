import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../lib/prisma'

// Definição do formato esperado no corpo da requisição de criação
interface CreateHostBody {
  name: string
  ip: string
  port: number
  login: string
  password: string
  location: string
  type: 'Switch' | 'Router' | 'Firewall' | 'AccessPoint' | 'Server'
  status: 'Online' | 'Offline'
}

// Definição do formato esperado nos parâmetros de atualização
interface UpdateHostParams {
  id: string;
}

// Definição do formato esperado no corpo da requisição de atualização
interface UpdateHostBody {
  name?: string;
  ip?: string;
  port?: number;
  login?: string;
  password?: string;
  location?: string;
  type?: 'Switch' | 'Router' | 'Firewall' | 'AccessPoint' | 'Server';
  status?: 'Online' | 'Offline';
  vlanId?: string | null;
}

// Definição do formato esperado nos parâmetros de exclusão
interface DeleteHostParams {
  id: string;
}

export async function hostRoutes(app: FastifyInstance) {
  
  // Lista todos os hosts cadastrados
  app.get('/hosts', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const hosts = await prisma.host.findMany({
        orderBy: { createdAt: 'desc' }
      })
      return reply.send(hosts)
    } catch (error) {
      app.log.error(error)
      return reply.status(500).send({ message: 'Erro ao buscar hosts.' })
    }
  })

  // Cadastra um novo host
  app.post('/hosts', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as CreateHostBody

      const host = await prisma.host.create({
        data: {
          name: body.name,
          ip: body.ip,
          port: body.port,
          login: body.login,
          password: body.password, // Em produção, considere criptografar esta senha
          location: body.location,
          type: body.type,
          status: body.status,
        },
      })

      return reply.status(201).send(host)
    } catch (error) {
      app.log.error(error)
      return reply.status(500).send({ message: 'Erro ao criar host.' })
    }
  });

  // Atualiza um host existente
  app.put<{ Params: UpdateHostParams, Body: UpdateHostBody }>('/hosts/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;

      const host = await prisma.host.update({
        where: { id },
        data: updateData,
      });

      return reply.send(host);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({ message: 'Host não encontrado.' });
      }
      app.log.error(error);
      return reply.status(500).send({ message: 'Erro ao atualizar o host.' });
    }
  });

  // Deleta um host
  app.delete<{ Params: DeleteHostParams }>('/hosts/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      await prisma.host.delete({
        where: { id },
      });

      return reply.status(204).send();
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({ message: 'Host não encontrado.' });
      }
      app.log.error(error);
      return reply.status(500).send({ message: 'Erro ao deletar o host.' });
    }
  });
}