# NetInventory — TCC UFRA

Sistema distribuído de inventário de rede e descoberta de topologia, desenvolvido como Trabalho de Conclusão de Curso em Engenharia de Computação na UFRA.

## Visão geral

O projeto é composto por dois módulos principais:

| Módulo | Tecnologia | Função |
|---|---|---|
| `tcc-backend` | Fastify + TypeScript + Prisma + PostgreSQL | API REST — CRUD de hosts e sub-redes (IPAM), proxy para o worker Python |
| `tcc-python` | FastAPI + Python + Netmiko | Worker de coleta LLDP via SSH multithread |

A topologia é renderizada no frontend React (repositório separado) usando a biblioteca `vis-network`.

---

## Pré-requisitos

- **Node.js** ≥ 20 e **npm** ≥ 10
- **Python** ≥ 3.10 e **pip**
- **PostgreSQL** ≥ 15 em execução local ou via Docker
- Acesso SSH aos dispositivos de rede (MikroTik / Huawei com LLDP habilitado)

---

## tcc-backend (API Fastify/TypeScript)

### 1. Instalar dependências

```bash
cd tcc-backend
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz de `tcc-backend/`:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/netinventory"
```

> O Prisma 7 lê a URL de conexão via `prisma.config.ts`. Certifique-se de que `DATABASE_URL` está exportada no ambiente antes de rodar qualquer comando Prisma.

### 3. Aplicar migrations e gerar o client Prisma

```bash
# Aplica todas as migrations pendentes e gera o Prisma Client
npm run db:migrate

# Ou, em ambientes sem suporte a migrations (ex.: staging rápido):
npm run db:push
```

### 4. Rodar em modo de desenvolvimento

```bash
npm run dev
```

O servidor sobe com `tsx watch` e recarrega automaticamente em `http://localhost:3000`.

### 5. Build de produção

```bash
npm run build   # compila TypeScript → dist/
npm start       # executa dist/server.js com Node.js
```

### Scripts disponíveis

| Script | Comando | Descrição |
|---|---|---|
| `dev` | `tsx watch src/server.ts` | Dev com hot-reload |
| `build` | `tsc` | Compila para `dist/` |
| `start` | `node dist/server.js` | Executa build de produção |
| `db:migrate` | `prisma migrate dev` | Aplica migrations e regenera client |
| `db:generate` | `prisma generate` | Regenera apenas o Prisma Client |
| `db:push` | `prisma db push` | Sincroniza schema sem criar migration |
| `db:studio` | `prisma studio` | Abre GUI visual do banco |

---

## tcc-python (Worker FastAPI/Netmiko)

### 1. Instalar dependências

```bash
cd tcc-python
pip install fastapi uvicorn netmiko
```

> Recomendado usar um virtualenv:
> ```bash
> python -m venv .venv
> source .venv/bin/activate
> pip install fastapi uvicorn netmiko
> ```

### 2. Rodar a API

```bash
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

A API estará disponível em `http://localhost:8000`.

### Arquivo `mkhw.py`

Script auxiliar de coleta direta (fora do contexto FastAPI). Pode ser usado para testar a conectividade SSH e a coleta LLDP em dispositivos isolados:

```bash
python mkhw.py
```

---

## Ordem de inicialização recomendada

```
1. PostgreSQL        →  certifique-se de que o serviço está rodando
2. tcc-backend       →  npm run dev  (porta 3000)
3. tcc-python        →  uvicorn api:app --reload  (porta 8000)
4. tcc-frontend      →  npm run dev  (porta 5173)  [repositório separado]
```

---

## Estrutura do repositório

```
tcc-inventario/
├── tcc-backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Modelos: Host, Subnet (IPAM hierárquico)
│   │   └── migrations/            # Histórico de migrations
│   ├── prisma.config.ts           # Config Prisma 7 com PrismaPg adapter
│   ├── src/
│   │   ├── server.ts              # Entry point Fastify
│   │   ├── lib/prisma.ts          # Singleton do Prisma Client
│   │   ├── routes/
│   │   │   ├── hosts.ts           # CRUD de dispositivos
│   │   │   ├── ipRoutes.ts        # CRUD de sub-redes (IPAM)
│   │   │   └── topologyRoutes.ts  # Proxy para o worker Python
│   │   └── utils/cidrValidator.ts
│   ├── package.json
│   └── tsconfig.json
└── tcc-python/
    ├── api.py                     # FastAPI: endpoints de descoberta LLDP
    ├── mkhw.py                    # Script de coleta MikroTik/Huawei
    └── topologia.json             # Saída de exemplo da topologia
```

---

## Tecnologias

- **Fastify 5** — framework HTTP para Node.js de alta performance
- **Prisma 7** — ORM com adapter `@prisma/adapter-pg` para PostgreSQL nativo
- **FastAPI** — framework Python assíncrono para a API de coleta
- **Netmiko** — biblioteca SSH multivendor (MikroTik, Huawei VRP)
- **PostgreSQL** — banco de dados relacional com suporte ao tipo `inet`

---

## Autores

- Adriano Rodrigues  
- Willian Evangelista Brito  

Orientador: [nome do orientador] — UFRA, Paragominas/PA
