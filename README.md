# Beeno MCP Server

MCP (Model Context Protocol) server para integração com a API do Beeno CRM. Permite que assistentes de IA (Claude, etc.) interajam diretamente com o Beeno para gerenciar contatos, deals, empresas e mais.

## Ferramentas Disponíveis

| Módulo | Descrição |
|--------|-----------|
| **Contacts** | Criar, buscar, atualizar e listar contatos |
| **Deals** | Gerenciar negociações e oportunidades |
| **Companies** | Gerenciar empresas |
| **Pipelines** | Consultar pipelines e estágios |
| **Products** | Gerenciar produtos |
| **Notes** | Adicionar notas a contatos e deals |
| **Tasks** | Criar e gerenciar tarefas |
| **Associations** | Associar entidades (contatos, deals, empresas, produtos) |
| **Properties** | Consultar propriedades customizadas |
| **Segments** | Gerenciar segmentos |
| **Automation** | Disparar automações |
| **Forms** | Gerenciar formulários |
| **Communications** | Enviar mensagens (WhatsApp, etc.) |

## Pré-requisitos

- Node.js 18+
- Conta no [Beeno CRM](https://app.beeno.ai) com API Key

## Instalação

```bash
npm install
npm run build
```

## Configuração

O arquivo `.mcp.json.example` é o template de configuração do MCP. As credenciais são passadas diretamente via `env` no MCP — não é necessário arquivo `.env`.

**Passo 1** — Copie o template para `.mcp.json`:

```bash
cp .mcp.json.example .mcp.json
```

**Passo 2** — Ajuste o caminho do servidor Beeno de acordo com onde você clonou o projeto. No campo `args`, substitua o caminho absoluto pelo local correto no seu ambiente:

```jsonc
// Exemplo: se você clonou em C:/projetos/beeno-mcp
"beeno": {
  "command": "node",
  "args": ["C:/projetos/beeno-mcp/dist/index.js"],
  ...
}
```

**Passo 3** — Preencha suas credenciais do Beeno:

```jsonc
"env": {
  "BEENO_DOMAIN": "https://app.beeno.ai/seu-tenant-id",  // URL da sua instância
  "BEENO_API_KEY": "sua-api-key-aqui"                     // API Key gerada no Beeno
}
```

**Passo 4** *(opcional)* — Se você utiliza o n8n, preencha também as credenciais dos servidores `n8n-brpx` e/ou `n8n-skeps` com a URL e API Key da sua instância n8n. Caso não use, você pode remover esses blocos do `.mcp.json`.

> **Importante:** O `.mcp.json` contém credenciais sensíveis e está no `.gitignore`. Nunca faça commit deste arquivo. Apenas o `.mcp.json.example` (sem credenciais) deve ser versionado.

## Uso

### Modo desenvolvimento

```bash
npm run dev
```

### Modo produção

```bash
npm run build
npm start
```

### Via MCP (Claude Code)

Com o `.mcp.json` configurado, o servidor é iniciado automaticamente pelo Claude Code. As ferramentas ficam disponíveis diretamente no chat.

## Exemplos de Uso

Após configurar o MCP, basta pedir em linguagem natural na sua ferramenta de IA:

> **"Busque os negócios que têm data de fechamento prevista para este mês"**
>
> O assistente vai utilizar a ferramenta de deals para filtrar negociações com `closedate` dentro do mês atual e retornar os resultados.

> **"Traga os 200 contatos mais recentes"**
>
> O assistente vai listar contatos ordenados por data de criação (`date_added`) em ordem decrescente, com limite de 200 registros.

## Estrutura do Projeto

```
beeno-mcp/
├── src/
│   ├── index.ts          # Entry point - registra tools e inicia servidor MCP
│   ├── client.ts         # Cliente HTTP para a API do Beeno
│   ├── schemas.ts        # Schemas Zod para validação
│   ├── types.ts          # Tipos TypeScript
│   └── tools/            # Ferramentas MCP (uma por módulo)
│       ├── contacts.ts
│       ├── deals.ts
│       ├── companies.ts
│       ├── pipelines.ts
│       ├── products.ts
│       ├── notes.ts
│       ├── tasks.ts
│       ├── associations.ts
│       ├── properties.ts
│       ├── segments.ts
│       ├── automation.ts
│       ├── forms.ts
│       └── communications.ts
├── .mcp.json.example     # Template de configuração MCP
├── package.json
└── tsconfig.json
```
