# **MontLife**
> *Workspace Modular de Produtividade Pessoal & Operacional — Demandas em Master-Detail, Kanban, Agenda + Google Calendar/Meet, Anotações Editoriais com IA, Wiki Técnica, Assistente IA & Relatórios.*

O **MontLife** é uma aplicação PWA modular projetada para unificar gestão operacional de trabalho e organização pessoal em um ambiente amplo, fluido e confortável para uso prolongado. Integra **Google Gemini AI**, **Google Calendar**, **Google Meet**, **YouTube Data API v3**, **Google OAuth Multi-Contas (Perfil Mestre Unificado)**, **Notificações Web Push nativas** e **Modo Offline com fila automática de sincronização**, mantendo persistência 100% nativa no **Cloud Firestore**.

---

## **1. Identidade Visual & Design System (*Creme, Roxo & Lavanda*)**

Todos os tokens de cor, superfícies, bordas e tipografia são centralizados via variáveis CSS em [src/app/globals.css](file:///c:/Projetos/Mont%20Life/src/app/globals.css) e mapeados semanticamente em [tailwind.config.ts](file:///c:/Projetos/Mont%20Life/tailwind.config.ts):

| Token | Light Mode (*Creme & Roxo*) | Dark Mode (*Roxo & Lavanda*) |
| :--- | :--- | :--- |
| **Canvas principal** | `#F5F1E8` | `#1D1925` |
| **Sidebar** | `#FAF6EF` | `#241F2D` |
| **Superfícies** | `#FFFCF6` | `#2C2637` |
| **Superfícies elevadas** | `#FAF6EF` | `#352D42` |
| **Lavanda suave / intermediária / intensa** | `#E7DFF5` / `#D8C9EE` / `#B6A2DB` | `#332A45` / `#463A5E` / `#B6A2DB` |
| **Ação principal / Hover** | `#7455AD` / `#654696` | `#B6A2DB` / `#D8C9EE` |
| **Texto principal / Secundário** | `#392D4B` / `#756B80` | `#F5F1E8` / `#B6A9C3` |
| **Bordas** | `#E4DCE4` | `#44394F` |

* **Tipografia:** **Plus Jakarta Sans** para a interface e **JetBrains Mono** para horários, métricas e metadados técnicos (`next/font/google`).
* **Cores semânticas preservadas:** matriz de prioridades **P1–P4**, alertas de conflito, atraso e conclusão mantidos com contraste acessível.

---

## **2. Arquitetura Modular & App Shell**

* **Stack:** Next.js 15 (App Router com Route Group `(workspace)`), React 19, TypeScript, Tailwind CSS 3, Lucide React e `date-fns`.
* **Estado Global Compartilhado (`WorkspaceContext`):** dados (`tasks`, `notes`, `accounts`, `currentUser`), cache isolado por usuário, Service Worker, fila offline, sincronização Google, modais e `UndoToast` (5s) persistem entre todas as 10 rotas sem recarregar a aplicação.
* **App Shell Global:**
  * **Sidebar recolhível (`232px` / `64px`):** alternável por botão ou tecla `[` com preferência persistida em `localStorage`, abrigando os 5 grupos de navegação, alternador de tema claro/escuro e perfil do usuário (com indicação de Conta Mestra) no rodapé:
    * **WORKSPACE:** `Visão geral` (`/`) · `Meu dia` (`/meu-dia`)
    * **ORGANIZAÇÃO:** `Demandas` (`/demandas`) · `Kanban` (`/kanban`) · `Agenda` (`/agenda`)
    * **CONHECIMENTO:** `Anotações` (`/anotacoes`) · `Wiki técnica` (`/wiki`)
    * **INTELIGÊNCIA:** `Assistente IA` (`/assistente-ia`) · `Relatórios` (`/relatorios`)
    * **SISTEMA:** `Configurações` (`/configuracoes`)
  * **Header global enxuto:** breadcrumb contextual, busca global + **Command Palette (`Ctrl+K`)**, seletor de workspace (`Todos`, `Trabalho`, `Pessoal`), menu de criação rápida (incluindo Triagem IA por texto/voz), status de sincronização/offline e central de notificações via Portal.
  * **Área principal 100% fluida:** aproveita toda a largura da viewport (Full HD, QHD e ultrawide) sem `max-width` restritivo global.
* **Padrão Master-Detail (`SplitView`):** componente reutilizável (`src/components/ui/SplitView.tsx`) com divisor redimensionável por arrastar ou teclado (`←`/`→`), duplo clique para restaurar proporção, recolher/expandir painéis para modo foco, rolagem independente, persistência de proporções por módulo e adaptação nativa de navegação lista ↔ detalhes no mobile.

---

## **3. Módulos da Plataforma**

1. **Visão geral (`/`):** homepage limpa e organizada com saudação contextual, data, progresso diário, 4 indicadores essenciais (*abertas*, *prioridades de hoje*, *atrasadas* e *próximo compromisso com Google Meet*), foco prioritário resumido, **Briefing IA** sob demanda, **atalhos personalizáveis** e diretório de acesso aos módulos.
2. **Meu dia (`/meu-dia`):** ambiente dedicado ao planejamento diário com anel de progresso, **reordenação de prioridades** (drag-and-drop e setas, salva por data), tarefas planejadas com criação rápida, resgate de atrasadas em 1 clique (*Trazer para hoje*), compromissos do dia (Google Calendar deduplicado + conflitos + Meet), Briefing IA e captura rápida de anotações.
3. **Demandas (`/demandas` — Master-Detail 55% / 45%):**
   * **Painel esquerdo:** pesquisa, **3 menus suspensos recolhíveis** (*Abertas*, *Concluídas* e *Canceladas*) — exibindo dentro de *Abertas* o indicativo clicável de status (*A Fazer*, *Em Andamento*, *Aguardando*, *Triagem*) —, filtros avançados recolhíveis (*Para hoje*, *Atrasadas*, *Críticas P1/P2*, Status, Prioridade, Categoria, Tipo e Ordenação), criação rápida inline (`P1`–`P4`), botão circular único de conclusão rápida, **ações operacionais diretamente na linha** e modo compacto/confortável.
   * **Painel direito persistente:** modo foco sem quebras de layout, edição inline de título, descrição, status, prioridade, prazo/horário, SLA, categoria, tipo, workspace, checklist interativo, anexos (com **Lightbox** limpo com barra HUD inferior), links, lembretes, Google Calendar/Meet, histórico, extensões de prazo, recorrência, solução técnica vinculada e Assistente IA.
4. **Kanban (`/kanban`):** quadro independente usando a mesma fonte de dados de Demandas, com colunas por status, drag-and-drop, criação rápida por coluna, filtros por prioridade e **painel de detalhes acoplável à direita** (reutilizando `TaskDetailPanel`) com opção de recolher para largura total.
5. **Agenda (`/agenda` — Split View 65% / 35%):** calendário **Mensal, Semanal e Diário** à esquerda com navegação, botão *Hoje*, Google Calendar **deduplicado** contra demandas vinculadas e alertas de conflito; à direita, lista sincronizada de agendamentos com expansão inline para reagendamento, acesso direto ao Google Meet, conversão em demanda e próximos compromissos.
6. **Anotações (`/anotacoes`):** workspace editorial com biblioteca à esquerda recolhível (**Modo Foco**), criação de **Nota em Branco primeiro**, escopos opcionais, salvamento automático, ditado por voz, **checklist estritamente sob demanda**, **6 modos de organização com IA + organização em lote** e conversão direta em demandas vinculadas.
7. **Wiki técnica (`/wiki`):** base independente de pesquisa e estudos reunindo artigos próprios, guias, procedimentos, vídeos e documentações — com **pesquisa instantânea 100% offline (sem depender de internet)**, criação/edição de artigos locais e gerador opcional de guias com IA salvos para consulta offline.
8. **Assistente IA (`/assistente-ia`):** **chat conversacional real com Google Gemini (`/api/ai/chat`)** conectado às demandas, prazos, anotações e soluções documentadas do usuário, combinado com painel lateral de atalhos categorizados, seleção de estilo de resposta (*Objetivo*, *Executivo*, *Detalhado*) e citações clicáveis.
9. **Relatórios (`/relatorios`):** painel analítico alinhado com gráfico compacto de evolução de entregas (6 meses), histórico de extensões de prazo, SLA, Lead Time, distribuição por prioridade/categoria/workspace, resumo executivo IA e impressão/exportação **A4 executiva**.
10. **Configurações (`/configuracoes`):** painel amplo com navegação interna por 9 categorias (*Perfil*, *Aparência*, *Workspaces*, **Contas Google com indicação clara de Conta Mestra**, *Integrações*, *Notificações com teste ao vivo*, *Preferências de layout*, *Inteligência artificial* e *Sincronização, Offline & Backup JSON*).

---

## **4. Matriz de Prioridade & SLA Automático**

| Prioridade | Descrição | SLA Automático (Prazo Padrão) | Cor Semântica |
| :--- | :--- | :--- | :--- |
| **P1** | Crítica / Urgente | +4 horas a partir da criação | `#DC2626` (Vermelho) |
| **P2** | Alta | +24 horas (Dia seguinte) | `#D97706` (Âmbar) |
| **P3** | Média / Rotina | +3 dias úteis (pula fins de semana) | `#7455AD` (Roxo) |
| **P4** | Baixa / Planejamento | +7 dias corridos | `#756B80` (Neutro) |

* **Auditoria de Extensão de Prazo:** preserva `original_due_date`, atualiza `current_due_date`, incrementa `extension_count` e registra cada motivo em `deadline_extensions`.

---

## **5. Ciclo de Vida das Demandas**

| Status | Descrição | Comportamento |
| :--- | :--- | :--- |
| `TRIAGE` | Triagem pendente | Aguardando confirmação |
| `TODO` | A Fazer | Demanda ativa no backlog com SLA calculado |
| `IN_PROGRESS` | Em Andamento | Registra `started_at` |
| `WAITING` | Aguardando | Pausa atraso enquanto aguarda terceiros/validação |
| `COMPLETED` | Concluída | Registra `completed_at`, solução para a Wiki e evidências |
| `CANCELED` | Cancelada | Mantida em histórico de auditoria com justificativa e reabertura |

---

## **6. Responsividade, Mobile & PWA**

* **Desktop & Ultrawide:** layout 100% fluido, painéis `SplitView` redimensionáveis e sidebar recolhível.
* **Mobile & Tablet:** barra inferior fixa (*Início*, *Demandas*, *Agenda*, *Notas*, *Menu*), drawer lateral completo e navegação dedicada lista ↔ detalhes em tela cheia.
* **Web Push & Offline:** Service Worker (`public/sw.js`), manifesto PWA instalável e fila offline persistente (`src/lib/offlineQueue.ts`) com sincronização automática ao reconectar.

---

## **7. Configuração & Execução**

Copie `.env.example` para `.env.local` e configure suas chaves (`GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `YOUTUBE_API_KEY` e credenciais do Firebase Admin):

```bash
npm install
npm run dev
```

Acesse em [http://localhost:3000](http://localhost:3000). Para compilar e executar em produção:

```bash
npm run build
npm start
```
