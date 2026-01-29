

# Vendas2B Intelligence - MVP

Uma ferramenta de "Cofre de Inteligência" para consultores de vendas que segue a filosofia **"AI as Auditor, Human as Judge"** - onde a IA levanta evidências e o consultor valida.

---

## Design System

Interface premium seguindo **Apple Design Language**:
- **Fonte**: Geist (Sans-serif)
- **Cores**: OKLCH com Teal/Verde como cor primária
- **Estilo**: Bordas arredondadas (16px), sombras difusas, Glassmorphism
- **Micro-interações**: Elementos clicáveis com `active:scale-[0.98]`

---

## Estrutura de Navegação

**Sidebar com Glassmorphism** contendo:
- Dashboard (Visão Geral)
- Vault (Ingestão de Dados)
- Matriz de Diagnóstico

---

## Tela 1: Dashboard

Visão macro do diagnóstico em um relance:

- **Header**: Nome do projeto/cliente e data de início
- **5 Metric Cards grandes** (um para cada pilar):
  - 👥 Pessoas (DISC, Skills, Motivação)
  - ⚙️ Processos (Fluxo, Cadência, Gargalos)
  - 📊 Dados (KPIs, Metas, Conversão)
  - 💻 Tecnologia (CRM, Stack, Automação)
  - 🏛️ Gestão & Cultura (Rituais, Crenças)
- **Contador de Divergências**: Alertas de conflitos entre fontes
- **Estatísticas**: Total de evidências, validadas, pendentes

---

## Tela 2: The Vault (Upload)

Central minimalista de ingestão de dados:

- **Área de Drag & Drop** para MP3, MP4, PDF, CSV
- **Lista de Assets** com status:
  - 🔄 Processando (com skeleton loading)
  - ✅ Concluído
  - ❌ Erro
- **Preview de arquivos** com metadados
- **Simulação de IA** extraindo evidências (delay + feedback visual)

---

## Tela 3: Matriz de Diagnóstico

Mesa de trabalho do consultor - onde evidências viram insights:

**Layout**: Grid de Cards (estilo Masonry/Pinterest)

**Anatomia do Card de Evidência**:
- **Header**: Ícone + Badge do Pilar (bg transparente `bg-primary/15`)
- **Corpo**: Texto da evidência resumida
- **Fonte**: Link para asset original (minuto exato quando aplicável)
- **Footer com Ações**:
  - ✅ **Validar** - Confirma como fato real (card fica verde)
  - ❌ **Rejeitar** - Marca como ruído/erro (card some suavemente)
  - 🚩 **Investigar** - Para aprofundamento (borda amarela)

**Filtros**: Por pilar, status (Pendente/Validado/Rejeitado), e tipo de divergência

---

## Backend (Lovable Cloud)

**Banco de Dados com 3 tabelas principais**:

1. **projects**: Clientes/empresas em diagnóstico
2. **assets**: Arquivos brutos (referência para Storage)
3. **evidences**: Unidades de informação extraídas
   - Vinculadas ao asset de origem
   - Tagueadas por pilar
   - Status de validação
   - Timecode (quando aplicável)

**Storage**: Bucket para armazenar arquivos de áudio, vídeo e documentos

---

## Dados Mockados Incluídos

Cenários realistas de vendas B2B:

1. *"Gestor comercial alega uso de Salesforce, mas time relata uso de planilhas."* (Tecnologia | Divergência)
2. *"Processo de qualificação não possui critério de BANT definido."* (Processos)
3. *"Vendedor João possui perfil 'I' alto, com dificuldade em fechamento técnico."* (Pessoas)
4. *"Meta de crescimento de 40% sem histórico de contratações planejadas."* (Dados | Divergência)
5. *"Reunião de pipeline ocorre às segundas, mas 60% do time falta."* (Gestão & Cultura)

---

## Entregáveis

1. Design System completo com tokens OKLCH
2. Sidebar navegável com Glassmorphism
3. Dashboard com 5 Metric Cards interativos
4. The Vault com upload funcional para Supabase Storage
5. Matriz de Diagnóstico com cards de evidência e ações
6. Backend completo com tabelas e RLS configurado
7. Dados mockados para demonstração imediata

