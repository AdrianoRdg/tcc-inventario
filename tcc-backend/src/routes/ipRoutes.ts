import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma'
import { isSubnetInsideParent } from '../utils/cidrValidator';

// Instância do Prisma (em um projeto real, você pode importar de um arquivo de config central)

// Tipagens para o TypeScript entender o que vem no corpo da requisição
interface CreateSubnetBody {
  network: string;
  description?: string;
  parentId?: string;
  vlan?: number;
}

interface GetSubnetsQuerystring {
  parentId?: string;
}

interface GetChildrenParams {
  id: string;
}

interface UpdateSubnetBody {
  network?: string;
  description?: string;
  vlan?: number;
  parentId?: string | null;
}

interface UpdateSubnetParams {
  id: string;
}

interface DeleteSubnetParams {
  id: string;
}

export const ipRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

  // ==========================================================================
  // 1. Rota para CRIAR uma Sub-rede (POST /subnets)
  // ==========================================================================
  fastify.post<{ Body: CreateSubnetBody }>('/subnets', {
    schema: {
      body: {
        type: 'object',
        required: ['network'],
        properties: {
          network: { type: 'string' }, // Ex: "10.10.10.0/24"
          description: { type: 'string' },
          parentId: { type: 'string', nullable: true }, // UUID da rede pai, se houver
          vlan: { type: 'number', nullable: true } // Número da VLAN, opcional
        }
      }
    }
  }, async (request, reply) => {
    const { network, description, vlan, parentId } = request.body;

    try {
      // NOVA LÓGICA DE VALIDAÇÃO DE ESCOPO:
      if (parentId) {
        // 1. Busca quem é o pai no banco de dados
        const parentSubnet = await prisma.subnet.findUnique({
          where: { id: parentId }
        });

        // 2. Garante que o pai existe
        if (!parentSubnet) {
          return reply.status(404).send({ error: 'Rede pai não encontrada.' });
        }

        // 3. O CORAÇÃO DA SEGURANÇA: Valida a matemática de rede
        if (!isSubnetInsideParent(network, parentSubnet.network)) {
          return reply.status(400).send({ 
            error: `Conflito de CIDR: O bloco ${network} não cabe dentro do escopo da rede pai (${parentSubnet.network}).` 
          });
        }
      }

      // Se passou por tudo, salva no banco!
      const subnet = await prisma.subnet.create({
        data: { network, description, vlan, parentId },
      });

      return reply.status(201).send(subnet);
      
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(409).send({ error: 'Este bloco de rede já está cadastrado.' });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro interno ao criar sub-rede.' });
    }
  });

  // ==========================================================================
  // 2. Rota para LISTAR as Sub-redes (GET /subnets)
  // ==========================================================================
  fastify.get<{ Querystring: GetSubnetsQuerystring }>('/subnets', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          parentId: { type: 'string' } // Permite filtrar ex: /subnets?parentId=UUID
        }
      }
    }
  }, async (request, reply) => {
    
    const { parentId } = request.query;

    try {
      // Se passar parentId na query, busca as filhas daquela rede.
      // Se passar parentId=null explicitamente, busca as raízes.
      // Se não passar nada, traz tudo.
      const whereCondition = parentId !== undefined ? { parentId: parentId === 'null' ? null : parentId } : {};

      const subnets = await prisma.subnet.findMany({
        where: whereCondition,
        orderBy: {
          network: 'asc' // Ordena alfabeticamente/numericamente pelo bloco
        },
        include: {
          // Já traz a contagem de sub-redes filhas e de hosts para facilitar a interface
          _count: {
            select: { children: true }
          }
        }
      });

      return reply.send(subnets);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar sub-redes.' });
    }
  });

  // ==========================================================================
  // 3. Rota para LISTAR as Redes Filhas de um Pai (GET /subnets/:id/children)
  // ==========================================================================
  fastify.get<{ Params: GetChildrenParams }>('/subnets/:id/children', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' } // Garante que é um UUID válido
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    try {
      // 1. Opcional, mas recomendado: Verificar se a rede pai realmente existe
      const parentExists = await prisma.subnet.findUnique({
        where: { id }
      });

      if (!parentExists) {
        return reply.status(404).send({ error: 'Rede pai não encontrada.' });
      }

      // 2. Busca todas as redes onde o parentId seja igual ao ID passado na URL
      const children = await prisma.subnet.findMany({
        where: { parentId: id },
        orderBy: {
          network: 'asc' // Mantém a listagem organizada numericamente
        },
        include: {
          // Traz a contagem para a interface saber se essa filha também tem filhas
          _count: {
            select: { children: true }
          }
        }
      });

      return reply.send(children);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar redes filhas.' });
    }
  });

  // ==========================================================================
  // 4. Rota para EDITAR uma Sub-rede (PUT /subnets/:id)
  // ==========================================================================
  fastify.put<{ Params: UpdateSubnetParams; Body: UpdateSubnetBody }>('/subnets/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        properties: {
          network: { type: 'string' }, // Ex: "10.10.10.0/24"
          description: { type: 'string' },
          vlan: { type: 'number', nullable: true },
          parentId: { type: 'string', nullable: true } // UUID da rede pai, ou null para remover
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { network, description, vlan, parentId } = request.body;

    try {
      // 1. Verifica se a subnet a ser editada existe
      const existingSubnet = await prisma.subnet.findUnique({
        where: { id }
      });

      if (!existingSubnet) {
        return reply.status(404).send({ error: 'Sub-rede não encontrada.' });
      }

      // 2. Se está alterando a rede (network), valida se não duplica
      if (network && network !== existingSubnet.network) {
        const duplicateNetwork = await prisma.subnet.findUnique({
          where: { network }
        });

        if (duplicateNetwork) {
          return reply.status(409).send({ error: 'Este bloco de rede já está cadastrado.' });
        }
      }

      // 3. Se está alterando o parentId, valida a hierarquia
      if (parentId !== undefined) {
        if (parentId) {
          // Busca o novo pai
          const newParent = await prisma.subnet.findUnique({
            where: { id: parentId }
          });

          if (!newParent) {
            return reply.status(404).send({ error: 'Rede pai não encontrada.' });
          }

          // Valida a matemática de rede com o novo pai
          const networkToValidate = network || existingSubnet.network;
          if (!isSubnetInsideParent(networkToValidate, newParent.network)) {
            return reply.status(400).send({ 
              error: `Conflito de CIDR: O bloco ${networkToValidate} não cabe dentro do escopo da rede pai (${newParent.network}).` 
            });
          }

          // Valida se não está criando um ciclo (subnet como pai de si mesma)
          if (parentId === id) {
            return reply.status(400).send({ error: 'Uma sub-rede não pode ser pai de si mesma.' });
          }
        }
        // Se parentId é null ou undefined, remove a relação com o pai (torna a subnet raiz)
      }

      // 4. Se tudo passou na validação, atualiza a subnet
      const updatedSubnet = await prisma.subnet.update({
        where: { id },
        data: {
          ...(network && { network }),
          ...(description !== undefined && { description }),
          ...(vlan !== undefined && { vlan }),
          ...(parentId !== undefined && { parentId: parentId || null })
        }
      });

      return reply.send(updatedSubnet);
      
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro interno ao atualizar sub-rede.' });
    }
  });

  // ==========================================================================
  // 5. Rota para DELETAR uma Sub-rede (DELETE /subnets/:id)
  // ==========================================================================
  fastify.delete<{ Params: DeleteSubnetParams }>('/subnets/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    try {
      // 1. Verifica se a sub-rede tem filhas
      const children = await prisma.subnet.count({
        where: { parentId: id },
      });

      if (children > 0) {
        return reply.status(400).send({ 
          error: 'Não é possível deletar a sub-rede pois ela contém outras sub-redes. Remova ou reatribua as sub-redes filhas primeiro.' 
        });
      }

      // 2. Se não tiver filhas, deleta a sub-rede
      await prisma.subnet.delete({
        where: { id },
      });

      return reply.status(204).send(); // 204 No Content é uma boa prática para DELETE
      
    } catch (error: any) {
      // Trata o caso da sub-rede não ser encontrada
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Sub-rede não encontrada.' });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro interno ao deletar a sub-rede.' });
    }
  });

};