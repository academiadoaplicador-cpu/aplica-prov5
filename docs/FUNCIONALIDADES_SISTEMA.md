# Aplica PRO — Mapa de Funcionalidades do Sistema

Documento de referência para o produto, papéis de usuário e planejamento do **dashboard administrativo 360°** (gestão de usuários, cadastro manual, visão consolidada da operação).

> **Última revisão:** junho/2026 — baseado no código atual do repositório.

---

## 1. Visão geral

O **Aplica PRO** é uma plataforma web para **aplicadores de película** (automotivo, decorativo, PPF, comunicação visual). O sistema permite:

- Montar **orçamentos técnicos** com cálculo de material, mão de obra, margem e impostos
- Visualizar **plano de corte no rolo** (nesting) antes de aplicar
- Gerar **PDF profissional** do orçamento
- Gerenciar **histórico e status** dos orçamentos
- Configurar **parâmetros financeiros** da oficina
- Consumir um **catálogo global** de materiais, veículos e eletrodomésticos (mantido pelo admin)

**Stack resumida:** React (frontend) + API Node/Express + PostgreSQL. Autenticação por cookie/JWT. Deploy via Docker (Nginx + API no mesmo container).

---

## 2. Papéis de usuário

### 2.1 Aplicador (usuário comum)

Conta criada pelo **auto-cadastro** na tela de login (`/entrar`). Cada aplicador possui dados **isolados por `user_id`**:

| Recurso | Escopo |
|---------|--------|
| Configurações financeiras | Próprio usuário |
| Orçamentos | Próprio usuário |
| Perfil do aplicador | Próprio usuário |
| Materiais / veículos / eletros | **Leitura** do catálogo global (conta admin) |
| Catálogo (edição) | **Sem acesso** |

### 2.2 Administrador

Identificado pelo e-mail configurado em `ADMIN_EMAIL` (variável de ambiente). Não há tabela de roles no banco — o flag `isAdmin` é derivado do e-mail em runtime.

| Recurso | Escopo |
|---------|--------|
| Tudo que o aplicador tem | Sim (como qualquer conta) |
| Catálogo Profissional (materiais) | **Leitura e escrita** |
| Base de Veículos | **Leitura e escrita** |
| Base de Eletros | **Leitura e escrita** |
| Importação de planilhas Excel | **Somente admin** |
| `rating` e `verifiedDocuments` no perfil | Pode alterar (usuário comum não) |

**Bootstrap da conta admin:** criada automaticamente no startup da API quando `ADMIN_EMAIL` + `ADMIN_PASSWORD` estão definidos (dev) ou com `ENABLE_ADMIN_BOOTSTRAP=true` (primeiro deploy em produção). O catálogo inicial é semeado na conta admin.

### 2.3 Dashboard admin — MVP implementado vs pendente

| Funcionalidade | Status |
|----------------|--------|
| Dashboard consolidado (métricas globais) | ✓ `/admin` |
| Listar todos os usuários cadastrados | ✓ `/admin/usuarios` |
| Ver perfil completo de aplicadores (telefone, endereço) | ✓ `/admin/usuarios/:id` |
| Verificar documentos / rating (moderação) | ✓ PATCH `/api/admin/profiles/:userId/verify` |
| Ver orçamentos de todos os usuários (leitura) | ✓ `/admin/orcamentos` |
| Cadastrar usuário manualmente (pelo admin) | ✓ `/admin/usuarios/novo` |
| Editar conta (oficina, e-mail) | ✓ aba Conta no detalhe |
| Desativar / reativar usuário | ✓ `is_active` + bloqueio no login |
| Reset de senha pelo admin | ✓ aba Conta |
| Excluir usuário (confirmação) | ✓ aba Conta |
| `last_login_at` no login | ✓ migration 006 |
| `created_by` (cadastro manual) | ✓ migration 006 |
| Auditoria / logs de ações | ❌ Fase 3 |
| Convite por e-mail | ❌ Fase 3 |

---

## 3. Navegação e rotas

| Rota | Tela | Quem acessa |
|------|------|-------------|
| `/entrar` | Login e cadastro | Visitante |
| `/` | Dashboard (Início) | Autenticado |
| `/custos` | Engenharia de Custos | Autenticado |
| `/automotivo` | Calculadora Automotivo | Autenticado |
| `/decorativo` | Calculadora Decorativo | Autenticado |
| `/orcamento` | Histórico de Orçamentos | Autenticado |
| `/perfil` | Perfil do Aplicador | Autenticado |
| `/catalogo` | Catálogo Profissional | **Admin** |
| `/base-veiculos` | Base de Veículos | **Admin** |
| `/base-eletros` | Base de Eletros | **Admin** |
| `/admin` | Painel Administrativo (KPIs) | **Admin** |
| `/admin/usuarios` | Lista de aplicadores | **Admin** |
| `/admin/usuarios/:id` | Detalhe 360° do aplicador | **Admin** |
| `/admin/orcamentos` | Orçamentos globais (somente leitura) | **Admin** |
| `/admin/usuarios/novo` | Cadastrar aplicador manualmente | **Admin** |

Menu lateral (`AppLayout`): item **Administração** + gestão (catálogo, bases) aparecem **somente** quando `user.isAdmin === true`. O hub `/admin` inclui sub-navegação (`AdminLayout`) com atalhos para catálogo e bases.

---

## 4. Funcionalidades por módulo

### 4.1 Autenticação e cadastro (`AuthPage`)

**Login**
- E-mail + senha
- Rate limiting e bloqueio temporário após tentativas falhas
- Sessão via cookie HTTP-only

**Cadastro (3 etapas)**
1. **Oficina** — nome da empresa, e-mail, senha (regras de complexidade)
2. **Endereço** — CEP (integração ViaCEP), rua, número, bairro, cidade, UF
3. **Aplicador** — nome completo, telefone internacional, áreas de especialidade, foto/logo, documentos (opcional)

**Validações no cadastro**
- E-mail único; e-mail reservado ao admin é rejeitado
- Ao concluir: cria `users`, `financial_settings` (defaults) e `applicator_profiles`
- **Não** duplica catálogo — usuário novo consome o catálogo global do admin

**Áreas de especialidade disponíveis**
- Superfície Plana, Veículos, Móveis e Eletros, Comunicação Visual, PPF

---

### 4.2 Dashboard — Início (`DashboardOverview`)

Resumo **individual** da oficina logada:

- **Faturamento total** — soma de orçamentos com status `Finalizado`
- **Lucro estimado** — soma de `profit` dos finalizados + média de margem
- **Em negociação** — valor e quantidade de orçamentos `Pendente`
- **Orçamentos recentes** — últimos 5, link para histórico
- Atalhos: **Novo Automotivo**, **Novo Decorativo**
- Card “Configure sua oficina” → admin vai para `/catalogo`; usuário comum vai para `/custos`
- Métricas fixas de “Conversão 64%” (placeholder estático — candidato a evolução no dashboard admin)

---

### 4.3 Custos — Engenharia de Custos (`CostsOverview`)

Parâmetros financeiros **por usuário**, usados em todas as calculadoras:

| Campo | Descrição | Default |
|-------|-----------|---------|
| `hourlyRate` | Valor hora técnica (R$/h) | 50 |
| `profitMarginPercentage` | Margem de lucro (%) | 30 |
| `taxPercentage` | Impostos (%) | 6 |
| `fixedCosts` | Custos fixos mensais (R$) | 1500 |

**Fórmula de preço (calculadoras):**
```
baseCost = materialCost + laborCost
totalPrice = baseCost × (1 + margem/100) × (1 + imposto/100)
```

`fixedCosts` é usado no histórico de orçamentos para contexto financeiro, não entra diretamente no preço sugerido da calculadora.

---

### 4.4 Calculadora Automotivo (`AutomotiveCalculator`)

**Entrada de dados**
- Cliente (nome)
- Veículo em cascata: **Marca → Modelo → Ano** (base global)
- Modo **Completo** ou **Parcial**
  - **Completo:** seleciona automaticamente peças do preset conforme porte do veículo (Pequeno, Médio, Grande, Extra Grande)
  - **Parcial:** usuário escolhe peças individualmente; peças sem medida na base ficam desabilitadas
- Material em cascata (marca → linha → produto), filtrado para contexto automotivo
- Dimensões do rolo (largura e comprimento) quando o material tem múltiplas opções
- Preço customizado por m² (opcional, sobrescreve catálogo)

**Cálculos**
- **Mão de obra:** `dificuldade das peças × 0,75 h` por peça selecionada
- **Material:** algoritmo de nesting no rolo (`packPartsOnRoll`) + fator de desperdício **+15%** (`ROLL_WASTE_FACTOR`)
- **Preço material:** área real das peças encaixadas × 1,15 × preço/m² (não usa área total do rolo)
- Alerta se material não é recomendado para automotivo
- Alerta se material não tem dimensões de rolo cadastradas

**Plano de corte (`RollNestingPreview`)**
- Visualização horizontal do rolo com peças posicionadas
- Rotação automática quando cabe
- Indica peças que não cabem
- Scroll horizontal isolado (não move a navegação)
- Seleção de peça destaca no diagrama e na lista

**Saídas**
- Resumo: comprimento usado, área usada, material faturado (+15%), horas, investimento sugerido
- **Salvar orçamento** + **Gerar PDF** (agrupados no resumo)

**Regras de UX específicas**
- Admin vê texto para cadastrar medidas faltantes na base de veículos
- Usuário comum vê mensagem genérica sobre peças sem medida

---

### 4.5 Calculadora Decorativo (`DecorativeCalculator`)

**Categorias (`subType`)**
- Eletrodomésticos — seleção por catálogo (marca/modelo) ou peças manuais
- Móveis — peças manuais (nome, largura, altura, complexidade)
- Parede — peças manuais

**Peças decorativas**
- Nome, dimensões (m), complexidade (1–3)
- Complexidade impacta horas: multiplicadores 1,5 / 2,5 / 4 sobre área

**Material e rolo**
- Mesma lógica de cascata, filtro por contexto decorativo
- Nesting + +15% de material faturado
- Visual emerald (identidade decorativa)

**Saídas**
- Igual automotivo: resumo, salvar, PDF

---

### 4.6 Orçamentos — Histórico (`BudgetHistory` + `BudgetDetailDrawer`)

**Listagem**
- Busca por cliente ou projeto
- Filtro: Tudo / Automotivo / Decorativo
- Cards com cliente, projeto, valor, status, tipo

**Status possíveis**
- `Pendente` | `Aprovado` | `Finalizado` | `Cancelado`

**Detalhes (drawer lateral)**
- Dados completos do orçamento
- Material, peças, métricas (horas, metros, m², custo, lucro)
- Alterar status
- Excluir orçamento
- Gerar PDF

**Persistência**
- Cada usuário vê **apenas seus** orçamentos (`budgets.user_id`)
- Save faz upsert (criar ou atualizar pelo `id`)

---

### 4.7 PDF profissional (`pdfService`)

Gerado no cliente (jsPDF):

- Logo da oficina (foto do perfil) ou logo padrão
- Dados do aplicador e cliente
- Detalhamento de peças e material
- Métricas de consumo (linear, m², material faturado +15%)
- Mão de obra e investimento total
- Layout paginado com quebras automáticas
- Variante automotivo vs decorativo

---

### 4.8 Perfil do aplicador (`ProfileView`)

**Dados editáveis pelo usuário**
- Foto/logo (compressão antes do upload)
- Nome completo, anos de experiência
- Telefone internacional
- Endereço estruturado (ViaCEP)
- Áreas de especialidade
- Upload de documentos (URLs em base64/array)

**Campos restritos**
- `rating` (1–5) — só admin altera via API
- `verifiedDocuments` — só admin altera via API

**Privacidade**
- Telefone e endereço marcados como visíveis “apenas para a administração da rede” (preparado para dashboard admin)

---

### 4.9 Catálogo Profissional — Materiais (`CatalogPage`) — **Admin**

**CRUD de materiais**
- Nome, marca, linha, tipo (Cast, Calandrado, PPF, Poliéster)
- Preço/m², textura/cor, durabilidade
- Recomendado para: Automotivo, Móveis, Eletrodomésticos, etc.
- Detalhes técnicos

**Dimensões de rolo**
- `roll_widths_m` / `roll_lengths_m` — arrays JSON (múltiplas opções separadas por `;` na planilha)
- Migration `004` e `005`

**Importação Excel**
- Modelo para download
- Pré-visualização com merge (adicionados/atualizados)
- Barra de progresso
- Cadastro em lote por marca/linha/cores

**Persistência**
- Escrita no `user_id` da conta admin (`resolveCatalogUserId`)
- Leitura disponível para **todos** os usuários autenticados

---

### 4.10 Base de Veículos (`VehiclesPage`) — **Admin**

**Dados por veículo**
- Marca, modelo, ano, porte (`VehicleSize`)
- Medidas por peça (`partMeasurements`: largura × comprimento em metros)
- Peças definidas em `VEHICLE_PARTS_DATA` (capô, portas, para-lamas, etc.)

**Operações**
- CRUD manual na tabela
- Importação Excel com pré-visualização
- Indicador de veículos com medidas incompletas

**Uso**
- Calculadora automotivo consome esta base global
- Modo Completo depende de presets por porte + medidas cadastradas

---

### 4.11 Base de Eletros (`AppliancesPage`) — **Admin**

**Dados por eletrodoméstico**
- Marca, modelo, tipo (geladeira, fogão, etc.)
- Dimensões: largura, altura, profundidade (m)

**Operações**
- CRUD manual
- Importação Excel

**Uso**
- Calculadora decorativo (categoria Eletrodomésticos) preenche peças a partir do catálogo

---

## 5. Catálogo global — arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  Conta ADMIN (ADMIN_EMAIL)                              │
│  ├── materials (catálogo global)                        │
│  ├── vehicles (base global)                             │
│  └── appliances (base global)                           │
└─────────────────────────────────────────────────────────┘
          │ GET (todos autenticados)
          │ PUT/POST import (somente admin)
          ▼
┌─────────────────────────────────────────────────────────┐
│  Usuário A, B, C…                                       │
│  ├── financial_settings (próprio)                       │
│  ├── budgets (próprio)                                  │
│  └── applicator_profiles (próprio)                      │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Modelo de dados (PostgreSQL)

### `users`
| Coluna | Descrição |
|--------|-----------|
| `id` | PK (UUID truncado ou `admin` em dev) |
| `email` | Único |
| `business_name` | Nome da oficina |
| `password_hash` | bcrypt |
| `created_at` | Data de cadastro |
| `is_active` | Conta ativa (default true) — migration 006 |
| `last_login_at` | Último login — migration 006 |
| `created_by` | Admin que criou a conta (null = auto-cadastro) — migration 006 |

### `financial_settings` (1:1 com user)
`hourly_rate`, `profit_margin_percentage`, `tax_percentage`, `fixed_costs`

### `materials` (PK: user_id + id)
Catálogo; leitura do `user_id` admin para todos.

Campos de rolo: `roll_width_m`, `roll_length_m`, `roll_widths_m`, `roll_lengths_m` (JSONB).

### `vehicles` (PK: user_id + id)
`part_measurements` JSONB.

### `appliances` (PK: user_id + id)
Dimensões físicas.

### `applicator_profiles` (1:1 com user)
Perfil profissional, endereço estruturado, telefone, documentos, `rating`, `verified_documents`.

### `budgets` (PK: user_id + id)
Orçamento completo serializado (itens em JSONB, totais, status, tipo).

---

## 7. API REST (endpoints)

| Método | Rota | Auth | Admin | Descrição |
|--------|------|------|-------|-----------|
| GET | `/api/health` | — | — | Health check |
| POST | `/api/auth/register` | — | — | Cadastro |
| POST | `/api/auth/login` | — | — | Login |
| POST | `/api/auth/logout` | — | — | Logout |
| GET | `/api/auth/me` | ✓ | — | Usuário atual + `isAdmin` |
| GET/PUT | `/api/financial-settings` | ✓ | — | Config financeira |
| GET | `/api/materials` | ✓ | — | Lista materiais (global) |
| PUT | `/api/materials` | ✓ | ✓ | Salva catálogo |
| POST | `/api/materials/import` | ✓ | ✓ | Import materiais |
| GET | `/api/vehicles` | ✓ | — | Lista veículos (global) |
| PUT | `/api/vehicles` | ✓ | ✓ | Salva base |
| POST | `/api/vehicles/import` | ✓ | ✓ | Import veículos |
| GET | `/api/appliances` | ✓ | — | Lista eletros (global) |
| PUT | `/api/appliances` | ✓ | ✓ | Salva base |
| POST | `/api/appliances/import` | ✓ | ✓ | Import eletros |
| GET/PUT | `/api/profile` | ✓ | — | Perfil (rating/docs: admin) |
| GET | `/api/budgets` | ✓ | — | Orçamentos do usuário |
| POST | `/api/budgets` | ✓ | — | Criar/atualizar orçamento |
| DELETE | `/api/budgets/:id` | ✓ | — | Excluir orçamento |
| GET | `/api/admin/stats` | ✓ | ✓ | KPIs globais do sistema |
| GET | `/api/admin/users` | ✓ | ✓ | Listar aplicadores (paginação/busca) |
| GET | `/api/admin/users/:id` | ✓ | ✓ | Detalhe 360° (perfil + financeiro + orçamentos) |
| PATCH | `/api/admin/profiles/:userId/verify` | ✓ | ✓ | Moderação: `verifiedDocuments`, `rating` |
| GET | `/api/admin/budgets` | ✓ | ✓ | Orçamentos de todos os usuários (filtros) |
| POST | `/api/admin/users` | ✓ | ✓ | Cadastrar aplicador manualmente |
| PATCH | `/api/admin/users/:id` | ✓ | ✓ | Editar oficina/e-mail, ativar/desativar, nova senha |
| DELETE | `/api/admin/users/:id` | ✓ | ✓ | Excluir conta (`confirmBusinessName` no body) |

**Endpoints admin — fase 3 (pendente):**

| Método | Rota sugerida | Descrição |
|--------|---------------|-----------|
| POST | `/api/admin/users/:id/invite` | Convite por e-mail |

---

## 8. Algoritmos e regras de negócio importantes

### Nesting no rolo (`rollNesting.ts`)
- Peças ordenadas por área decrescente
- Algoritmo de prateleiras (shelf) ao longo do comprimento do rolo
- Rotação 90° quando necessário para caber na largura
- Retorna: peças colocadas, não colocadas, comprimento usado

### Material faturado
- `placedPartsAreaM2 × 1,15` — fator fixo de 15% sobre área real das peças encaixadas
- Sem dimensões de rolo: material R$ 0 (só mão de obra) + aviso na UI

### Recomendação de material
- Flag visual quando `recommendedFor` do material não inclui o contexto (Automotivo / subtipo decorativo)

### Isolamento multi-tenant
- Orçamentos e configurações: sempre filtrados por `user_id` da sessão
- Catálogo: single-tenant lógico (conta admin), multi-tenant físico (coluna `user_id` aponta para admin)

---

## 9. Dashboard Admin 360°

**MVP (jun/2026):** hub em `/admin` com KPIs, listagem, detalhe 360°, moderação e orçamentos globais (leitura).

**Fase 2 (jun/2026):** gestão de contas — cadastro manual, edição, desativar/reativar, reset de senha, exclusão. Campos `is_active`, `last_login_at`, `created_by` (migration `006`). Lógica compartilhada em `server/src/userProvisioning.ts`.

Com base na fase 2, pendências da **fase 3**: convite por e-mail e auditoria.

### 9.1 Objetivos

1. **Visão consolidada** de todos os aplicadores cadastrados
2. **Gestão de usuários** (criar, editar, desativar, ver detalhes)
3. **Monitoramento de uso** (orçamentos, faturamento, conversão real)
4. **Moderação de perfis** (ver telefone/endereço, aprovar documentos)
5. **Operação do catálogo** (já existe — integrar no mesmo hub admin)

### 9.2 Telas sugeridas

| Tela | Conteúdo |
|------|----------|
| **Admin Home** | KPIs globais: total usuários, novos no mês, orçamentos/dia, GMV estimado, materiais no catálogo |
| **Usuários** | Tabela: oficina, e-mail, cidade/UF, especialidades, cadastro, status, qtd orçamentos |
| **Usuário 360°** | Abas: Perfil, Financeiro, Orçamentos, Atividade; ações: editar, reset senha, verificar docs |
| **Orçamentos (global)** | Todos os orçamentos com filtro por usuário, tipo, status, período |
| **Catálogo** | Links/embed das telas atuais (materiais, veículos, eletros) |
| **Cadastrar usuário** | Form simplificado (dados oficina + aplicador) ou convite por e-mail |

### 9.3 KPIs úteis (dados já disponíveis no banco)

**Por usuário**
- Data de cadastro (`users.created_at`)
- Total de orçamentos, por status
- Soma `total_price` / `profit` (pendente vs finalizado)
- Ticket médio, último orçamento
- Perfil: especialidades, experiência, documentos verificados

**Globais**
- Usuários ativos (com login recente — *requer campo `last_login_at`*, hoje inexistente)
- Orçamentos por tipo (Automotivo vs Decorativo)
- Materiais/veículos/eletros no catálogo
- Veículos com medidas incompletas (qualidade da base)

### 9.4 Campos/tabelas a considerar na implementação

| Item | Motivo |
|------|--------|
| `users.is_active` ou `status` | Desativar sem excluir |
| `users.last_login_at` | Engajamento no dashboard |
| `users.created_by` | Distinguir auto-cadastro vs admin |
| Role em banco (opcional) | Escalar além de admin por e-mail |
| `/api/admin/*` com `requireAdmin` | Já existe middleware parcial |
| Rota `/admin` no frontend | Separar UX admin do aplicador |

### 9.5 Matriz resumida — quem faz o quê hoje

| Ação | Aplicador | Admin |
|------|-----------|-------|
| Auto-cadastro | ✓ | — (e-mail reservado) |
| Login / logout | ✓ | ✓ |
| Configurar custos | ✓ | ✓ |
| Montar orçamento automotivo/decorativo | ✓ | ✓ |
| Salvar orçamento | ✓ | ✓ |
| Gerar PDF | ✓ | ✓ |
| Ver histórico próprio | ✓ | ✓ |
| Editar perfil | ✓ | ✓ |
| Ler catálogo global | ✓ | ✓ |
| Editar/importar catálogo | — | ✓ |
| Editar base veículos/eletros | — | ✓ |
| Listar outros usuários | — | ✓ |
| Cadastrar usuário manualmente | — | ✓ |
| Editar / desativar / excluir usuário | — | ✓ |
| Reset de senha de aplicador | — | ✓ |
| Ver orçamentos de outros (leitura) | — | ✓ |
| Aprovar documentos / rating | — | ✓ |
| Dashboard global (`/admin`) | — | ✓ |

---

## 10. Referências no código

| Área | Arquivos principais |
|------|---------------------|
| Rotas frontend | `src/App.tsx`, `src/routes/paths.ts`, `src/routes/ProtectedRoute.tsx` |
| Dashboard admin | `src/pages/admin/*`, `src/components/layout/AdminLayout.tsx`, `src/services/adminService.ts` |
| API admin | `server/src/adminRoutes.ts`, `server/src/budgetMappers.ts` |
| Layout | `src/components/layout/AppLayout.tsx` |
| Calculadoras | `src/components/AutomotiveCalculator.tsx`, `DecorativeCalculator.tsx` |
| Nesting / preço rolo | `src/utils/rollNesting.ts`, `src/utils/materialRoll.ts` |
| PDF | `src/services/pdfService.ts` |
| API | `server/src/index.ts` |
| Admin / catálogo global | `server/src/admin.ts`, `server/src/catalog.ts` |
| Schema DB | `server/migrations/001_schema.sql` + `003`–`005` |
| Tipos | `src/types/index.ts`, `src/types/auth.ts` |

---

## 11. Glossário

| Termo | Significado |
|-------|-------------|
| **Aplicador** | Profissional/empresa que aplica película; usuário do sistema |
| **Orçamento** | Proposta comercial com peças, material, horas e preço |
| **Nesting / plano de corte** | Disposição das peças no rolo de material |
| **Catálogo global** | Materiais, veículos e eletros mantidos pelo admin para todos |
| **Completo / Parcial** | Modos de seleção de peças no orçamento automotivo |
| **Material faturado** | Área das peças + 15% de margem técnica de rolo |

---

*Este documento deve ser atualizado conforme novas funcionalidades forem implementadas, especialmente o dashboard administrativo 360°.*
