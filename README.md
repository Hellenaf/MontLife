# **Mont Ops (Mont Life)**
> *Gestor da minha vida diária através das tarefas, atividades e lembretes.*
> *Hub Central de Produtividade, Base de Conhecimento (Wiki Técnica) & Motor de Metrificação.*

O **Mont Ops** é uma aplicação completa de inteligência operacional projetada para unificar fluxos de trabalho de TI escolar e vida pessoal, integrando a **API do Google Gemini** com *Structured Outputs*, sincronização bidirecional **Multi-Account** com **Google Tasks** e **Google Calendar**, curadoria automática de estudos com a **YouTube Data API v3** e persistência no **Cloud Firestore** com motor de auditoria de SLA e prestação de contas.

---

## **1. Arquitetura e Stack Tecnológica**

* **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS com CSS Grid rigoroso.
* **Layout:** **Fixed-Grid (Grade Fixa)** de 4 quadrantes em tela cheia (`100vh`, `overflow: hidden` na raiz e scrolls internos independentes por painel).
* **Tema Visual:** *Lavender Purple Theme* (`#0F0E17` Dark Deep Lavender, `#1A1829` Superfícies, `#9D8DF1` Lavender Purple, `#7B61FF` Vibrant Violet, `#2E2B44` Bordas sutis).
* **Inteligência Artificial:** Google Gemini API (`@google/genai`) utilizando modelo `gemini-2.5-flash` com JSON Schema estruturado e busca na base de conhecimento por similaridade.
* **Integrações Google:** Multi-Account OAuth 2.0 (`googleapis`) com suporte simultâneo a **Conta de Trabalho** (`work`) e **Conta Pessoal** (`personal`), sincronização com Google Tasks API v1 e Google Calendar.
* **Curadoria de Aprendizado:** YouTube Data API v3 para busca contextual de vídeos técnicos e boas práticas.
* **Banco de Dados:** Cloud Firestore (Firebase Admin SDK) com coleções `tasks` e `connected_accounts`.

---

## **2. Os 4 Quadrantes do Sistema**

1. **Header / Barra de Comando IA (Topo Fixo):**
   * Entrada de comandos rápidos em linguagem natural e reconhecimento de voz (Web Speech API).
   * Triagem inteligente via Gemini com card de confirmação interativo.
   * **Alerta da Wiki Técnica:** Detecta tarefas anteriores concluídas similares e exibe a solução salva: *"💡 Você já resolveu algo parecido em [Data]: [Resumo da Solução]"*.
   * Indicadores de conexão das contas Google (`work` e `personal`).

2. **Quadrante Esquerdo (Gestão de Tarefas):**
   * Filtros por Conta (`Todas`, `Trabalho`, `Pessoal`), Status e Prioridades (`P1` a `P4`).
   * Ações rápidas: Iniciar (`[▶️]`), Aguardar (`[⏳]`), Concluir com Resolução (`[✅]`), Estender Prazo e Excluir.

3. **Quadrante Central (Timeline, Detalhes & Wiki):**
   * **Aba 1 (Detalhes da Atividade):** Título, plano de ação estruturado, tags, ciclo de vida e histórico detalhado de extensões de prazo.
   * **Aba 2 (Timeline do Dia):** Agenda integrada com blocos horários (08:00 às 20:00) mesclando tarefas institucionais e pessoais.
   * **Aba 3 (Estudo & Melhoria):** Curadoria em vídeo do YouTube com links diretos e termos de busca recomendados pelo Gemini.

4. **Quadrante Direito (KPIs & Métricas em Tempo Real):**
   * Cumprimento de SLA (% no prazo original vs % com adiamento gerenciado vs % atrasado).
   * Proporção de atividades Trabalho vs Vida Pessoal.
   * Distribuição por categoria técnica e contagem de soluções na Wiki.
   * Botão de acesso ao **Relatório de Atividades & Prestação de Contas**.

---

## **3. Matriz de Prioridade & SLA Automático**

| Prioridade | Descrição | SLA Automático (Prazo Padrão) | Cor / Destaque |
| :--- | :--- | :--- | :--- |
| **P1** | Crítica / Urgente | +4 horas a partir da criação | `#EF4444` (Vermelho) |
| **P2** | Alta | +24 horas (Dia seguinte) | `#F97316` (Laranja) |
| **P3** | Média / Rotina | +3 dias úteis (pula fins de semana) | `#EAB308` (Amarelo) |
| **P4** | Baixa / Planejamento | +7 dias corridos | `#A855F7` (Roxo) |

### **Extensão de Prazo (Deadline Extension):**
* Ao estender o prazo, o sistema preserva o `original_due_date` (para garantir a fidelidade do relatório anual de assertividade), atualiza o `current_due_date`, incrementa o contador `extension_count` e adiciona ao array `deadline_extensions: [{ extended_at, previous_date, new_date, reason }]`.
* Sincronizado automaticamente com o Google Tasks e Google Calendar.

---

## **4. Ciclo de Vida e Sincronização Google Tasks**

| Status no Mont Ops | Status no Google Tasks | Prefixo no Título | Ação do Sistema |
| :--- | :--- | :--- | :--- |
| `TRIAGE` | *(Não sincronizado)* | N/A | Aguardando confirmação no Card da IA |
| `TODO` | `needsAction` | *(Sem prefixo)* | Tarefa agendada |
| `IN_PROGRESS` | `needsAction` | `[▶️]` | Registra `started_at` |
| `WAITING` | `needsAction` | `[⏳]` | Pausa contagem de atraso de SLA |
| `COMPLETED` | `completed` | `[✅]` | Abre Modal de Resolução Técnica e registra `completed_at` |
| `CANCELED` | *(Deletado do Tasks)* | N/A | Removido da lista ativa, preservado no Firestore |

---

## **5. Configuração das Variáveis de Ambiente**

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha os valores:

```ini
# Gemini API (Paid Tier via @google/genai)
GEMINI_API_KEY="sua_chave_da_gemini_api"

# Google OAuth 2.0 (Para conectar Conta Pessoal e Conta de Trabalho)
GOOGLE_CLIENT_ID="seu_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="seu_client_secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/google/callback"

# YouTube Data API v3 (Curadoria automática de vídeos de estudo)
YOUTUBE_API_KEY="sua_api_key_do_google_cloud"

# Firebase / Cloud Firestore (Plano Blaze)
NEXT_PUBLIC_FIREBASE_PROJECT_ID="seu_projeto_id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@seu_projeto.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

> **Nota:** Caso as chaves de API ainda não estejam configuradas, o sistema possui **fallback inteligente integrado**, permitindo testar a experiência completa, triagem da IA, banco de dados em memória e sincronização simulada sem nenhuma falha de execução!

---

## **6. Executando o Projeto**

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse em seu navegador:
[http://localhost:3000](http://localhost:3000)

Para compilar para produção:

```bash
npm run build
npm start
```
