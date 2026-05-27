# Aplica Pro — Design System (v1)

Documento de referência para designers de sistema e UI. Descreve o estado atual da interface implementada no produto e a direção visual desejada.

**Produto:** Aplica Pro — plataforma de orçamentação para instalação de vinil (automotivo e decorativo).  
**Stack UI:** React + Tailwind CSS v4, tema escuro, ícones Lucide.  
**Idioma da interface:** Português (BR).

---

## 1. Visão geral

### 1.1 Personalidade da marca
- **Profissional e técnica** — voltada a instaladores e gestores de negócio.
- **Escura e focada** — reduz fadiga em uso prolongado; destaque em dados e números.
- **Clara na hierarquia** — títulos fortes, metadados discretos, ações sempre visíveis no topo da página de gestão.

### 1.2 Referência de layout (gestão de catálogo)
As páginas de **Catálogo Profissional**, **Base de Veículos** e **Base de Eletrodomésticos** seguem um padrão inspirado em listagens administrativas modernas (título à esquerda, ações à direita, busca full-width, contador “Exibindo X de Y”, lista/tabela abaixo).

> **Nota para o designer:** A referência enviada pelo cliente usa fundo claro e verde floresta. No app atual o tema é **dark**; ao propor evoluções, manter contraste AA e adaptar o verde primário (`emerald`) ao fundo escuro, ou documentar uma futura variante light se for escopo.

---

## 2. Fundamentos

### 2.1 Paleta de cores

#### Superfícies (background)
| Token | Hex (aprox.) | Uso |
|--------|----------------|-----|
| `slate-950` | `#020617` | Fundo global da aplicação, sidebar |
| `slate-900` | `#0f172a` | Cards, painéis, inputs |
| `slate-900/50` | — | Sidebar com leve transparência + blur |
| `slate-950/60` | — | Área interna de tabelas |

#### Bordas
| Token | Uso |
|--------|-----|
| `slate-900` | Divisores fortes (sidebar, rodapé nav) |
| `slate-800` | Bordas de cards, tabelas, inputs |
| `slate-700` | Bordas de botões secundários, inputs em foco leve |

#### Texto
| Token | Uso |
|--------|-----|
| `white` | Títulos de página (H1) |
| `slate-200` | Texto de corpo, células de tabela |
| `slate-300` | Números destacados no contador |
| `slate-400` | Ícones inativos, links secundários |
| `slate-500` | Subtítulos, placeholders, labels de coluna |
| `slate-600` | Texto terciário, numeração de linha (#) |

#### Cor de marca — Indigo (ações gerais, navegação ativa)
| Token | Uso |
|--------|-----|
| `indigo-400` | Tagline da marca, links, sort ativo na tabela |
| `indigo-500` | Focus ring, seleção de texto |
| `indigo-600` | Botões primários em login/calculadoras, item de menu ativo (fundo) |
| `indigo-600/10` + `border-indigo-500/20` | Estado ativo do menu lateral |

#### Cor de ação primária — Emerald (CTAs de gestão / cadastro)
| Token | Uso |
|--------|-----|
| `emerald-700` | Botão primário: “Novo material”, “Novo veículo”, “Novo eletro” |
| `emerald-600` | Hover do botão primário |
| `emerald-400` | Valores monetários na tabela, badges de eletros |
| `emerald-500/10` | Tags “recomendado para”, feedback de sucesso |

#### Semânticas
| Situação | Cores |
|----------|--------|
| Sucesso | `emerald-400/500` em texto e bordas suaves |
| Aviso | `amber-400` (ex.: veículo com medidas parciais) |
| Erro / excluir | `red-400/500` em hover de ícone lixeira e logout |
| Info / importação com ressalvas | `amber-200` em alertas de importação |

### 2.2 Tipografia

| Família | Papel | Pesos usados |
|---------|--------|----------------|
| **Inter** | UI geral, títulos, botões, tabelas | 300, 400, 600, 800 |
| **JetBrains Mono** | Labels técnicos, cabeçalhos de coluna, tags, contadores | 400, 700 |

#### Escala tipográfica (implementada)
| Elemento | Tamanho | Peso | Observação |
|----------|---------|------|------------|
| H1 (título de página) | 26–28px (`text-2xl` / `1.65rem`) | Bold | `tracking-tight`, branco |
| Subtítulo de página | 14px (`text-sm`) | Regular | `slate-500`, max-width ~36rem |
| H4 (título de bloco) | 14px | Bold | Dentro de painéis colapsáveis |
| Corpo / célula | 14px (`text-sm`) | Regular / Medium | — |
| Label técnico | 10px | Mono, uppercase | `tracking-widest`, `slate-500` |
| Micro UI (menu section) | 10px | Mono, uppercase | “Calculadoras”, “Gestão” |

### 2.3 Raio, sombra e espaçamento

| Propriedade | Valor típico | Uso |
|-------------|--------------|-----|
| Border radius | `12px` (`rounded-xl`) | Botões, inputs, busca |
| Border radius | `16px` (`rounded-2xl`) | Painéis, cards de auth |
| Border radius | `8px` (`rounded-lg`) | Itens de menu, tags |
| Sombra | `shadow-md shadow-emerald-950/40` | Botão primário |
| Sombra | `shadow-2xl` | Card de login |
| Padding página | `32px` (`p-8`) | Área principal |
| Gap entre seções | `24px` (`space-y-6`) | Entre header e lista |
| Largura máx. conteúdo | `72rem` (`max-w-6xl`) | Páginas de gestão |

### 2.4 Ícones
- Biblioteca: **Lucide React**, traço 1.5–2px, tamanhos 12–20px conforme contexto.
- Ícones sempre acompanham rótulo em botões de ação (nunca ícone solto sem `aria-label` em produção).

---

## 3. Arquitetura de layout

### 3.1 Shell da aplicação (logado)

```
┌─────────────────────────────────────────────────────────────┐
│ SIDEBAR (fixa 256px)  │  MAIN (margin-left 256px, p-32px)   │
│ Logo + tagline        │                                     │
│ Nav agrupada          │  [Conteúdo da rota]                 │
│ Perfil + Sair         │                                     │
└─────────────────────────────────────────────────────────────┘
```

- **Sidebar:** `w-64`, fundo `slate-950/50`, `backdrop-blur-xl`, borda direita `slate-900`.
- **Main:** animação suave de entrada (`opacity` + `translateY` 10px, 200ms).

### 3.2 Mapa de navegação

| Grupo | Item | Rota | Público |
|-------|------|------|---------|
| — | Início | `/` | Todos |
| — | Custos | `/custos` | Todos |
| Calculadoras | Automotivo | `/automotivo` | Todos |
| Calculadoras | Decorativo | `/decorativo` | Todos |
| Gestão | Catálogo Profissional | `/catalogo` | Admin |
| Gestão | Base de Veículos | `/base-veiculos` | Admin |
| Gestão | Base de Eletros | `/base-eletros` | Admin |
| Gestão | Histórico | `/historico` | Todos |
| Rodapé | Perfil | `/perfil` | Todos |
| — | Entrar | `/entrar` | Visitante |

### 3.3 Item de menu (NavItem)
- **Inativo:** texto `slate-400`, ícone `slate-500`, hover `bg-slate-900`.
- **Ativo:** fundo `indigo-600/10`, borda `indigo-600/20`, texto `indigo-400`, bolinha indicadora à direita.
- Padding: `12px`, `rounded-lg`, gap ícone-texto `12px`.

---

## 4. Padrão de página de gestão (template)

Aplica-se a: **Catálogo Profissional**, **Base de Veículos**, **Base de Eletrodomésticos**.

### 4.1 Estrutura vertical

```
┌─ Page Header ───────────────────────────────────────────────┐
│  [H1 + subtítulo]                    [Botões ação direita]  │
│  [Opcional: feedback import / formulário lote]              │
└─────────────────────────────────────────────────────────────┘
┌─ Page Panel (lista) ──────────────────────────────────────────┐
│  [Campo busca full-width]                                   │
│  Exibindo {n} de {total} {entidade}                         │
│  ┌─ Tabela ordenável ─────────────────────────────────────┐ │
│  │ # │ Col1 │ Col2 │ ... │ Ações                          │ │
│  └────────────────────────────────────────────────────────┘ │
│  [Linha expandida: formulário de edição ao selecionar]      │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Cabeçalho (PageHeader)

| Zona | Conteúdo |
|------|----------|
| Esquerda | Título H1 + descrição (“Gerencie os…”) |
| Direita | Grupo de botões com wrap em mobile |
| Abaixo (footer) | Alertas de importação ou painel “cadastro em lote” |

**Comportamento responsivo:** em `< lg`, título empilha acima dos botões; botões alinhados à esquerda com `flex-wrap`.

### 4.3 Botões de página (PageButton)

| Variante | Visual | Uso |
|----------|--------|-----|
| **secondary** | Fundo `slate-900`, borda `slate-700`, texto `slate-200` | Importar planilha, Salvar, Cadastro em lote |
| **primary** | Fundo `emerald-700`, hover `emerald-600`, texto branco | Criar novo registro (+ Novo …) |
| **loading** | Spinner substitui ícone | Durante importação |

Dimensões: `px-16px py-10px`, `rounded-xl`, `text-sm`, `font-medium`, gap ícone 8px.

**Ordem sugerida dos botões (direita → esquerda visual):**  
`Importar` · `Lote` (se aplicável) · `Salvar` · **`+ Novo`** (primário, último à direita).

### 4.4 Painel de lista (PagePanel)
- Container: `rounded-2xl`, borda `slate-800`, fundo `slate-900/40`.
- Sem título duplicado — o H1 da página já identifica o contexto.

---

## 5. Tabela de dados (DataTable)

### 5.1 Busca
- Largura: **100%** do painel.
- Ícone lupa à esquerda (`18px`), padding esquerdo ~44px.
- Placeholder: “Buscar material, marca, linha…” (adaptar por entidade).
- Focus: anel `emerald-600/30`, borda `emerald-600/40`.

### 5.2 Contador
Texto: **“Exibindo {filtrados} de {total} {materiais|veículos|eletrodomésticos}”**  
- Números em `slate-300` semibold.  
- Menção “· filtro ativo” quando há busca.

### 5.3 Cabeçalho da tabela
- Sticky no topo do scroll.
- Fonte mono, `10px`, uppercase, `tracking-widest`, cor `slate-500`.
- Colunas ordenáveis: ícone `ArrowUpDown` / `ArrowUp` / `ArrowDown` em `indigo-400` quando ativo.
- Primeira coluna fixa: **#** (índice da linha), largura ~48px, centralizado.

### 5.4 Linhas
- Zebra suave: linhas pares `slate-950/40`, ímpares `slate-900/20`.
- Hover: `slate-800/50` (quando clicável).
- Selecionada (edição): fundo `indigo-950/40`, ring interno `indigo-500/30`.
- Altura de linha confortável (~48px+).

### 5.5 Colunas por entidade

**Materiais (Catálogo)**  
`#` · Nome/Produto · Marca · Linha · Tipo · Cor · R$/m² · Uso (tags) · Ações

**Veículos**  
`#` · Fabricante · Modelo · Ano · Porte · Medidas (Completo/Parcial) · Ações

**Eletrodomésticos**  
`#` · Marca · Tipo · Modelo · Larg. · Alt. · Prof. · Ações

### 5.6 Ações por linha
- **Editar** (lápis): hover `indigo-400`.
- **Excluir** (lixeira): hover `red-400`.
- Clique na linha também abre edição (acessibilidade: manter botões com área de toque).

### 5.7 Linha expandida (edição)
- Ocupa largura total (`colspan`).
- Fundo `slate-900/60`, padding generoso.
- Label “Editar registro” em mono uppercase `indigo-400` ou `emerald-400` conforme módulo.
- Formulário em grid responsivo (2–3 colunas desktop).

---

## 6. Outros componentes

### 6.1 SettingsBlock (legado / secundário)
Usado onde ainda há seções colapsáveis com título próprio.

| Variante | Fundo | Borda |
|----------|--------|-------|
| `entry` | Gradiente `indigo-950/30` → `slate-950/20` | `indigo-500/20` |
| `registered` | `slate-950/50` | `slate-800` |

### 6.2 Feedback de importação (ImportFeedback)
- Sucesso: borda/fundo `emerald-500/5`, texto `emerald-200`.
- Com erros: `amber-500/5`, lista de erros em `amber-300/80`.

### 6.3 Estado vazio (EmptyCatalog)
- Borda tracejada `slate-800`, padding vertical generoso, texto `slate-500` centralizado.

### 6.4 Calculadoras (Automotivo / Decorativo)
- Cards escuros com selects em cascata (marca → modelo → ano).
- Botões de tipo de orçamento (Completo / Parcial).
- Destaque **indigo** para fluxo automotivo, **emerald** para decorativo.
- Mantêm padrão de inputs: `bg-slate-950`, `border-slate-800`, `rounded-xl`.

### 6.5 Autenticação (`/entrar`)
- Card central `glass`: blur + borda `slate-800`.
- CTA principal: **indigo-600** (diferente das páginas de gestão).
- Inputs iguais ao restante do sistema.

---

## 7. Motion e interação

| Interação | Comportamento |
|-----------|----------------|
| Troca de rota | Fade + slide Y 10px, 200ms |
| Expandir linha de tabela | Conteúdo abaixo da linha (sem modal) |
| Colapsar bloco | Chevron rotaciona 180°, height animate |
| Botões | `transition-all`, scale sutil no active (`active:scale-95`) em CTAs importantes |
| Scrollbar | 6px, thumb `slate-800`, hover `slate-700` |

---

## 8. Acessibilidade (diretrizes)

- Contraste mínimo **WCAG AA** para texto em `slate-500` sobre `slate-950` — validar em auditoria.
- Focus visível em inputs (`ring-2`) e itens de menu.
- Botões apenas com ícone devem ter `aria-label` (editar, excluir).
- Tabelas: considerar `scope="col"` em `<th>` em evolução semântica.
- Ordenação: indicar coluna ativa visualmente (já implementado).

---

## 9. Assets de marca

| Arquivo | Uso |
|---------|-----|
| `/public/login.png` | Logo na sidebar e tela de login |
| `/public/logo.png` | Marca alternativa |
| `/public/favicon.ico` | Favicon |

**Tagline:** “Instalação Inteligente” — mono, `indigo-400`, 10px, uppercase, tracking largo.

---

## 10. Entregáveis sugeridos para o designer

1. **Figma library** com tokens de cor, tipo e espaçamento alinhados a esta doc.  
2. **Componentes:** PageHeader, PageButton (2 variantes), DataTable, NavItem, Input, Empty state.  
3. **Templates de página:** Gestão (catálogo), Calculadora, Dashboard, Login.  
4. **Variante light (opcional):** se o cliente quiser aproximar da referência clara, propor mapeamento 1:1 dos tokens dark → light.  
5. **Ícones:** manter consistência com Lucide ou definir set proprietário equivalente.  
6. **Responsivo:** breakpoints `sm` (640), `lg` (1024) — header de gestão e tabela com scroll horizontal.

---

## 11. Stack técnica (para handoff dev)

| Item | Tecnologia |
|------|------------|
| Framework | React 19 + Vite |
| Estilos | Tailwind CSS v4 (`@theme` em `src/index.css`) |
| Roteamento | React Router v7 |
| Ícones | lucide-react |
| Animação | motion (Framer Motion) |
| Fontes | Google Fonts — Inter, JetBrains Mono |

**Arquivos de referência no código:**
- Layout: `src/components/layout/AppLayout.tsx`
- Header gestão: `src/components/settings/PageHeader.tsx`
- Botões: `src/components/settings/PageButton.tsx`
- Tabela: `src/components/settings/DataTable.tsx`
- Páginas: `src/pages/CatalogPage.tsx`, `VehiclesPage.tsx`, `AppliancesPage.tsx`

---

## 12. Changelog desta versão

| Data | Alteração |
|------|-----------|
| 2026-05 | Páginas de gestão separadas em 3 rotas; layout header esquerda/direita; tabela ordenável com busca e contador; CTA primário emerald. |

---

*Documento gerado a partir do código em produção no repositório Aplica Pro. Para dúvidas de implementação, alinhar com o time de desenvolvimento.*
