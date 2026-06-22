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

### Ambiente de rede

O sistema requer **hosts de rede ativos e acessíveis via SSH** para que a coleta LLDP funcione. Em ambiente de laboratório, recomenda-se o uso do **EVE-NG** com imagens de dispositivos MikroTik (RouterOS) ou Huawei (VRP).

Checklist antes de rodar a coleta:

- [ ] Dispositivos ligados e com SSH habilitado
- [ ] LLDP habilitado em todas as interfaces relevantes
- [ ] Conectividade IP entre o host que roda o `tcc-python` e os dispositivos
- [ ] Credenciais SSH corretas cadastradas em cada host no sistema
- [ ] No EVE-NG: verificar que a interface de gerência (Cloud/Management) está configurada e roteável a partir da máquina host

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

## tcc-frontend (React + Vite + TypeScript)

### 1. Instalar dependências

```bash
cd tcc-frontend
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz de `tcc-frontend/`:

```env
VITE_API_URL=http://localhost:3000
VITE_PYTHON_API_URL=http://localhost:8000
```

> Todas as variáveis expostas ao browser devem ter o prefixo `VITE_`.

### 3. Rodar em modo de desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

### 4. Build de produção

```bash
npm run build    # tsc -b && vite build → dist/
npm run preview  # serve o build localmente para validação
```

### Scripts disponíveis

| Script | Descrição |
|---|---|
| `dev` | Dev server com HMR (Hot Module Replacement) |
| `build` | Compila TypeScript e gera bundle otimizado em `dist/` |
| `preview` | Serve o `dist/` localmente para testar o build |
| `lint` | Executa ESLint com regras de React Hooks e React Refresh |

---

## Uso da API

### Cadastrar um host

Antes de iniciar qualquer coleta de topologia, os dispositivos de rede precisam ser cadastrados no sistema. Cada host representa um equipamento acessível via SSH.

**`POST /hosts`**

```bash
curl -X POST http://localhost:3000/hosts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SW-CORE-RACK01",
    "ip": "10.0.0.254",
    "port": 22,
    "login": "admin",
    "password": "senha_segura_123",
    "location": "Datacenter Principal",
    "type": "Switch",
    "status": "Online"
  }'
```

**Campos obrigatórios:**

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | string | Nome de identificação do dispositivo |
| `ip` | string | Endereço IP de gerência (deve ser acessível via SSH) |
| `port` | number | Porta SSH (padrão: `22`) |
| `login` | string | Usuário SSH |
| `password` | string | Senha SSH |
| `location` | string | Localização física ou lógica do equipamento |
| `type` | string | Tipo do dispositivo: `Switch`, `Router`, `Firewall`, etc. |
| `status` | string | Estado inicial: `Online` ou `Offline` |

> **Atenção:** o IP informado deve ser alcançável a partir da máquina que roda o `tcc-python`. Em laboratórios EVE-NG, use o IP da interface de gerência dos dispositivos virtuais.

### Outros endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/hosts` | Lista todos os hosts cadastrados |
| `GET` | `/hosts/:id` | Retorna um host pelo ID |
| `PUT` | `/hosts/:id` | Atualiza um host |
| `DELETE` | `/hosts/:id` | Remove um host |
| `GET` | `/subnets` | Lista sub-redes (IPAM) |
| `POST` | `/subnets` | Cadastra uma sub-rede |
| `POST` | `/topology/collect` | Dispara coleta LLDP nos hosts Online |
| `GET` | `/topology` | Retorna a topologia coletada |

---



```
1. PostgreSQL        →  certifique-se de que o serviço está rodando
2. tcc-backend       →  npm run dev     (porta 3000)
3. tcc-python        →  uvicorn api:app --reload  (porta 8000)
4. tcc-frontend      →  npm run dev     (porta 5173)
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
├── tcc-python/
│   ├── api.py                     # FastAPI: endpoints de descoberta LLDP
│   ├── mkhw.py                    # Script de coleta MikroTik/Huawei
│   └── topologia.json             # Saída de exemplo da topologia
└── tcc-frontend/
    ├── src/
    │   ├── assets/                # Recursos estáticos (imagens, ícones)
    │   ├── components/
    │   │   ├── devices-page.tsx   # Página de gerenciamento de dispositivos
    │   │   ├── NetworkTopology.tsx # Renderização da topologia (vis-network)
    │   │   ├── sidebar.tsx        # Navegação lateral
    │   │   ├── subnet-page.tsx    # Página de gerenciamento de sub-redes (IPAM)
    │   │   └── topology-page.tsx  # Página de topologia
    │   ├── services/
    │   │   ├── api.ts             # Configuração base do axios
    │   │   ├── hostService.ts     # Serviços de hosts (CRUD)
    │   │   ├── subnetService.ts   # Serviços de sub-redes
    │   │   └── topologyService.ts # Serviços de coleta de topologia
    │   ├── types/
    │   │   ├── device.ts          # Tipos TypeScript de dispositivo
    │   │   ├── host.ts            # Tipos TypeScript de host
    │   │   └── subnet.ts          # Tipos TypeScript de sub-rede
    │   ├── App.css
    │   ├── App.tsx                # Roteamento principal (react-router v7)
    │   ├── index.css
    │   └── main.tsx               # Entry point React
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tsconfig.node.json
    └── package.json
```

---

## Tecnologias

- **Fastify 5** — framework HTTP para Node.js de alta performance
- **Prisma 7** — ORM com adapter `@prisma/adapter-pg` para PostgreSQL nativo
- **FastAPI** — framework Python assíncrono para a API de coleta
- **Netmiko** — biblioteca SSH multivendor (MikroTik, Huawei VRP)
- **PostgreSQL** — banco de dados relacional com suporte ao tipo `inet`
- **React 19 + Vite 8** — frontend com HMR e build otimizado
- **Tailwind CSS v4** — estilização via plugin Vite nativo
- **react-router v7** — roteamento client-side
- **vis-network** — renderização interativa da topologia de rede

---

## Autores

- Adriano Rodrigues  
- Willian Evangelista Brito  

Orientador: Fabrício Araújo — UFRA, Paragominas/PA
