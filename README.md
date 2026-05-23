# Beeno MCP Server

MCP (Model Context Protocol) server para integração com a API do Beeno CRM. Permite que assistentes de IA (Claude, etc.) gerenciem contatos, deals, empresas, tarefas e mais.

Suporta dois modos de operação:
- **Local (stdio)** — processo local via Claude Code / Claude Desktop
- **Remoto (HTTP)** — servidor HTTP deployado em AWS Lambda, acessível por qualquer cliente MCP

---

## Ferramentas Disponíveis

### Modo Read-Only — 21 tools (padrão)
| Módulo | Tools |
|--------|-------|
| Contacts | list, read, search |
| Deals | list, read, search |
| Companies | list, read, search |
| Pipelines | list |
| Products | list, read, search |
| Notes | list |
| Tasks | list, read, search |
| Properties | list |
| Segments | list |
| Forms | list, read |

### Modo Read/Write — 47 tools
Inclui todas acima, mais:

| Módulo | Tools extras |
|--------|-------------|
| Contacts | create, update, delete |
| Deals | create, update, delete |
| Companies | create, update, delete |
| Products | create, update, delete |
| Notes | create, delete |
| Tasks | create, update, delete |
| Properties | create |
| Segments | create, add_contacts |
| Associations | create, delete |
| Automation | add_contacts |
| Communications | whatsapp_send_template |

---

## Modo Local (stdio)

Para uso direto com Claude Code ou Claude Desktop como processo local.

### Pré-requisitos

- Node.js 18+
- Conta no [Beeno CRM](https://app.beeno.ai) com API Key

### Instalação

```bash
npm install
npm run build
```

### Configuração

Copie o template e ajuste as credenciais:

```bash
cp .mcp.json.example .mcp.json
```

Edite `.mcp.json`:

```jsonc
{
  "mcpServers": {
    "beeno": {
      "command": "node",
      "args": ["/caminho/para/beeno-mcp-api/dist/index.js"],
      "env": {
        "BEENO_DOMAIN": "https://app.beeno.ai/seu-tenant-id",
        "BEENO_API_KEY": "sua-api-key",
        "BEENO_READONLY": "false"   // omitir ou "true" para somente leitura
      }
    }
  }
}
```

> `.mcp.json` está no `.gitignore` — nunca commite credenciais.

---

## Modo Remoto (HTTP / AWS Lambda)

O servidor HTTP é **agnóstico** — não armazena credenciais. Cada request deve enviar as credenciais via headers HTTP.

### Headers obrigatórios

| Header | Descrição |
|--------|-----------|
| `x-beeno-domain` | URL do tenant Beeno (ex: `https://app.beeno.ai/seu-tenant`) |
| `x-beeno-api-key` | API Key do Beeno CRM |

### Headers opcionais

| Header | Default | Descrição |
|--------|---------|-----------|
| `x-beeno-readonly` | `true` | `false` para ativar escrita |
| `x-beeno-api-key-name` | `ELOZ-APIKEY` | Nome do header da API Key |
| `x-beeno-whatsapp-api-key` | — | API Key do WhatsApp |

### Configuração do cliente MCP (remoto)

```json
{
  "mcpServers": {
    "beeno": {
      "url": "https://<api-id>.execute-api.sa-east-1.amazonaws.com/prod/mcp",
      "headers": {
        "x-beeno-domain": "https://app.beeno.ai/seu-tenant",
        "x-beeno-api-key": "sua-api-key",
        "x-beeno-readonly": "false"
      }
    }
  }
}
```

### Servidor local HTTP (dev)

Sobe o servidor HTTP na porta 3000, sem precisar da Lambda:

```bash
# opcional: crie .env com as credenciais para injeção automática nos headers
cp .env.example .env

npm run dev:http
```

Teste rápido:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "x-beeno-domain: https://app.beeno.ai/seu-tenant" \
  -H "x-beeno-api-key: sua-chave" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Deploy AWS Lambda

Pré-requisitos: AWS CLI configurado, SAM CLI instalado, esbuild no PATH (`npm install -g esbuild`).

```bash
npm run deploy
# sam build + sam deploy em sequência
# na primeira vez, use: sam deploy --guided
```

A URL do endpoint é exibida nos Outputs do CloudFormation após o deploy (`BeenoMcpApi`).

---

## Testes

Os testes de integração sobem um servidor interno e fazem chamadas reais à API do Beeno. Requerem as duas variáveis de ambiente:

```bash
BEENO_DOMAIN="https://app.beeno.ai/seu-tenant" \
BEENO_API_KEY="sua-chave" \
npm test
```

---

## Estrutura do Projeto

```
beeno-mcp-api/
├── src/
│   ├── index.ts              # Entry point stdio (local)
│   ├── handler.ts            # Lambda handler (HTTP remoto)
│   ├── local.ts              # Servidor HTTP local para dev
│   ├── lambda-transport.ts   # Transport MCP para Lambda
│   ├── request-validator.ts  # Validação de headers obrigatórios
│   ├── client.ts             # Cliente HTTP da API Beeno
│   ├── schemas.ts            # Schemas Zod
│   ├── types.ts              # Tipos TypeScript
│   └── tools/                # Uma tool por módulo do CRM
├── tests/
│   └── mcp.test.ts           # Testes de integração (Jest)
├── template.yaml             # SAM template (AWS Lambda)
├── samconfig.toml            # Configuração do SAM CLI
├── .env.example              # Template de credenciais locais
├── .mcp.json.example         # Template de configuração MCP (stdio)
└── package.json
```

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor stdio local (Claude Code) |
| `npm run dev:http` | Servidor HTTP local na porta 3000 |
| `npm run build` | Compila TypeScript |
| `npm test` | Roda testes de integração |
| `npm run deploy` | `sam build` + `sam deploy` |
