# **MontLife**
> *Central de Inteligência Operacional, Produtividade Diária, Base de Conhecimento (Wiki Técnica) & Motor de Metrificação.*

O **MontLife** é uma aplicação PWA completa de gestão operacional e produtividade projetada para unificar demandas de trabalho e rotina pessoal em uma única interface rápida, responsiva e inteligente. Integra **Google Gemini AI**, **Google Calendar**, **Google Meet**, **YouTube Data API v3**, **Google OAuth Multi-Contas (Perfil Mestre Unificado)**, **Notificações Web Push nativas** e **Modo Offline com fila automática de sincronização**, tudo com persistência 100% nativa no **Cloud Firestore**.

---

## **1. Arquitetura e Stack Tecnológica**

* **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS.
* **Tipografia & Temas:** Fontes **Plus Jakarta Sans** e **JetBrains Mono** (`next/font/google`), com suporte completo a **Tema Claro e Tema Escuro** harmonizado em toda a interface (incluindo Sidebar recolhível e painéis).
* **Inteligência Artificial:** Google Gemini API (`@google/genai`) com triagem objetiva de demandas, reescrita estruturada, geração automática de checklists, assistente contextual na demanda (*Refinar Texto*, *Plano de Ação*, *Diagnóstico + Wiki*), **Briefing IA do Dia**, categorização inteligente e extração de tarefas a partir do Bloco de Notas.
* **Autenticação & Multi-Workspaces:** Google OAuth 2.0 (`googleapis`) com **Perfil Mestre Unificado** (*Cross-Account Login*) e separação inteligente por contextos (`Trabalho`, `Pessoal`, `Estudos`, etc.).
* **Integrações Google:** Google Calendar (visualização unificada, deduplicação de itens vinculados e conversão em demandas) e **Google Meet** (geração de sala em 1 clique e acesso rápido direto nos cards).
* **Curadoria de Estudos:** YouTube Data API v3 + referências técnicas contextualizadas por demanda.
* **PWA, Web Push & Modo Offline:** Service Worker dedicado (`public/sw.js`) com cache de assets, alertas nativos com vibração tátil no celular/desktop e fila persistente de mutações (`src/lib/offlineQueue.ts`) com UI otimista e sincronização automática ao reconectar.
* **Armazenamento Cloud Native:** Cloud Firestore (Firebase Admin SDK) com coleções `tasks`, `notes`, `users` e `accounts`, auditoria completa de SLA e histórico de recorrências.

---

## **2. Módulos & Experiência de Uso (UX)**

### **Navegação & Produtividade Rápida**
* **Sidebar Recolhível (Mini-Rail):** Alterne entre menu expandido e barra compacta de ícones pelo botão superior ou pelo atalho `[`, liberando mais espaço em telas de notebook.
* **Command Palette Global (`Ctrl+K`):** Busca instantânea em **Demandas**, **Notas** e **Wiki Técnica**, navegação entre módulos, ações rápidas (tema, recolher painéis, configurações) e criação de demandas com IA.
* **Header Calmo & Triagem por Voz/Texto:** Barra de comando IA integrada com ditado por voz (*Web Speech API*), central de alertas via Portal (sempre acima de cards e modais) e relógio discreto.
* **Toasts Flutuantes com "Desfazer" (5s):** Alterações de status, conclusões, cancelamentos, transferências de conta e exclusões exibem aviso com opção imediata de desfazer.

### **Minhas Demandas (Lista + Detalhes + Métricas & IA)**
* **Lista Inteligente:** Busca limpa, **filtros recolhíveis** (dropdown no desktop e *Bottom Sheet* no mobile), chips removíveis de filtros ativos, seletor de **ordenação** (*Prazo mais próximo*, *Prioridade P1→P4*, *Mais recentes*), alternador **Compacto / Detalhado** e faixa lateral de prioridade nos cards.
* **Detalhes da Demanda (Título Primeiro + Ações Fixas):**
  * **Barra de Ações Fixa (*Sticky*):** Troca de status em 1 clique (`A Fazer → Em Andamento → Aguardando`), **Concluir**, **Adiar**, botão **Meet** e menu de ações secundárias sempre acessíveis sem rolar a página.
  * **Grade Compacta de Propriedades:** Edição rápida de prioridade, prazo/horário, categoria, tipo (`Tarefa`, `Atividade`, `Lembrete`) e espaço.
  * **Checklist & Assistente IA:** Pontos de validação interativos com barra de progresso e ações de IA (*Refinar Texto*, *Plano de Ação*, *Diagnóstico + Wiki*).
  * **Seções Recolhíveis (*Accordions*):** *Agenda, Lembrete & Google Meet*, *Anexos & Links* (com **Visualizador Lightbox** com zoom interativo, arrastar/*pan*, rotação e tela cheia) e *Base de Soluções & Recorrência*.
* **Painel Direito Recolhível (Métricas & Briefing IA):** Briefing inteligente das prioridades do dia, distribuição de status/tipos, cumprimento de SLA e proporção Trabalho vs Pessoal.

### **Fluxo Kanban**
* Quadro visual com arrastar e soltar (*drag-and-drop*), criação e renomeação de seções customizadas, faixa lateral de prioridade, controles revelados no *hover* e **adição rápida inline ("+ Adicionar aqui")** no rodapé de cada coluna.

### **Agenda do Dia & Gestão de Horários**
* Visão unificada das demandas agendadas + compromissos do **Google Calendar** (ignorando duplicatas já vinculadas como demanda).
* Marcação de **horário de início e término**, **lembretes personalizáveis** (padrão de 30 minutos antes) e **Detecção de Conflitos de Horário** em tempo real.
* Conversão de eventos do Google Agenda em demandas completas do MontLife (incluindo extração automática de links do Google Meet).

### **Bloco de Notas Inteligente**
* Captura rápida e ditado por voz para atas de reunião, ideias e checklists, com cores, fixação (*pin*), salvamento automático (*autosave*), organização por IA e **extração automática de múltiplas demandas** diretamente a partir de uma nota.

### **Wiki Técnica & Relatórios Executivos**
* **Wiki Técnica:** Base pesquisável de soluções documentadas em demandas concluídas, com alerta automático de demandas similares durante a triagem para evitar retrabalho.
* **Relatórios & Prestação de Contas:** Indicadores de *Lead Time*, matriz de prioridades, eficiência de SLA e layout otimizado para impressão/exportação em PDF executivo.

---

## **3. Matriz de Prioridade & SLA Automático**

| Prioridade | Descrição | SLA Automático (Prazo Padrão) | Cor / Destaque |
| :--- | :--- | :--- | :--- |
| **P1** | Crítica / Urgente | +4 horas a partir da criação | `#EF4444` (Vermelho) |
| **P2** | Alta | +24 horas (Dia seguinte) | `#F97316` (Laranja) |
| **P3** | Média / Rotina | +3 dias úteis (pula fins de semana) | `#6366F1` (Índigo) |
| **P4** | Baixa / Planejamento | +7 dias corridos | `#94A3B8` (Neutro) |

### **Extensão de Prazo (*Deadline Extension*):**
* Ao estender um prazo, o sistema preserva `original_due_date` (mantendo a auditoria fiel nos relatórios), atualiza `current_due_date`, incrementa `extension_count` e registra o histórico completo em `deadline_extensions`.

---

## **4. Ciclo de Vida das Demandas**

| Status | Descrição | Comportamento |
| :--- | :--- | :--- |
| `TRIAGE` | Triagem pendente | Aguardando confirmação no card de IA |
| `TODO` | A Fazer | Demanda ativa no backlog com SLA calculado |
| `IN_PROGRESS` | Em Andamento | Registra `started_at` |
| `WAITING` | Aguardando | Pausa contagem de atraso enquanto aguarda terceiros/validação |
| `COMPLETED` | Concluída | Registra `completed_at`, solução para a Wiki e comprovantes |
| `CANCELED` | Cancelada | Mantida em histórico de auditoria com justificativa e opção de reabertura |

---

## **5. Experiência Mobile & PWA**

* **Instalável no Celular:** Manifesto PWA e ícones otimizados para adicionar à tela inicial (Android/iOS).
* **Navegação *Drill-Down*:** Barra inferior fixa (*Demandas*, *Notas*, *Agenda*, *Kanban*, *Menu*), filtros em *Bottom Sheet* e abertura direta de Detalhes/Métricas com retorno rápido, maximizando a área útil de leitura.
* **Notificações Web Push & Offline:** Lembretes disparam notificações nativas do dispositivo via Service Worker, e ações feitas sem internet ficam enfileiradas localmente para sincronização automática ao restabelecer a rede.

---

## **6. Configuração das Variáveis de Ambiente**

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha os valores:

```ini
# Gemini API (Paid Tier via @google/genai)
GEMINI_API_KEY="sua_chave_da_gemini_api"

# Google OAuth 2.0 (Login seguro, workspaces e Google Calendar)
GOOGLE_CLIENT_ID="seu_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="seu_client_secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/google/callback"

# YouTube Data API v3 (Curadoria automática de vídeos de estudo)
YOUTUBE_API_KEY="sua_api_key_do_google_cloud"

# Firebase / Cloud Firestore
NEXT_PUBLIC_FIREBASE_PROJECT_ID="seu_projeto_id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@seu_projeto.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Opcional: Microsoft To Do / Entra ID
MICROSOFT_CLIENT_ID="seu_client_id_do_azure"
MICROSOFT_CLIENT_SECRET="seu_client_secret_do_azure"
```

---

## **7. Executando o Projeto**

Instale as dependências e inicie o servidor de desenvolvimento:

```bash
npm install
npm run dev
```

Acesse em seu navegador: [http://localhost:3000](http://localhost:3000)

Para compilar e iniciar em modo de produção:

```bash
npm run build
npm start
```
