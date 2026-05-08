# QA Log & Bug Tracker

🐛 **Aplicação web para centralizar bugs, logs e métricas de QA**

## 📋 Sobre

O QA Log & Bug Tracker é uma ferramenta completa para gestão de qualidade de software, permitindo:
- Reportar e acompanhar bugs
- Analisar logs automaticamente
- Visualizar métricas em tempo real
- Gerenciar prioridades e status

## 🚀 Tecnologias

- **Backend:** Node.js + Express
- **Frontend:** HTML5 + CSS3 + JavaScript (Vanilla)
- **Database:** SQLite3
- **Charts:** Chart.js
- **Upload:** Multer

## 📁 Estrutura do Projeto

```
qa-log-tracker/
├── server.js              # Servidor Express (API)
├── package.json           # Dependências e scripts
├── qa_tracker.db          # Base de dados SQLite
├── public/
│   ├── index.html         # Interface principal (3 tabs)
│   ├── app.js             # Lógica do frontend
│   └── style.css          # Estilos responsivos
└── uploads/               # Ficheiros temporários
```

## 🛠️ Instalação

1. **Clonar o repositório:**
   ```bash
   git clone <url-do-repo>
   cd qa-log-tracker
   ```

2. **Instalar dependências:**
   ```bash
   npm install
   ```

3. **Iniciar o servidor:**
   ```bash
   npm start
   # ou para desenvolvimento:
   npm run dev
   ```

4. **Aceder à aplicação:**
   - Abrir `http://localhost:3000` no browser

## 📊 Funcionalidades

### 🐛 Gestão de Bugs
- Reportar novos bugs com título, descrição e prioridade
- Filtrar por prioridade (Low/Medium/High/Critical) e status
- Editar status e prioridade dos bugs
- Visualizar data de criação

### 📝 Análise de Logs
- Upload de ficheiros de log
- Paste direto de conteúdo de log
- Detecção automática de erros (197+ padrões suportados)
- Análise de padrões de erro com contadores
- Top 10 erros mais frequentes

### 📈 Dashboard
- Métricas em tempo real (total bugs, logs, bugs abertos)
- Gráficos por prioridade e status
- Bugs reportados na última semana
- Top 5 erros nos logs

## 🔌 API Endpoints

### Bugs
- `POST /api/bugs` - Reportar bug
- `GET /api/bugs` - Listar bugs (com filtros)
- `PUT /api/bugs/:id` - Atualizar bug

### Logs
- `POST /api/logs` - Upload/paste de log
- `GET /api/logs` - Listar logs
- `GET /api/logs/:id` - Detalhes do log

### Métricas
- `GET /api/metrics` - Dados para gráficos

## 🗄️ Base de Dados

### Tabela `bugs`
```sql
CREATE TABLE bugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Open',
    screenshot_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela `logs`
```sql
CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT,
    content TEXT NOT NULL,
    error_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🎯 Padrões de Detecção de Erros

O sistema detecta automaticamente erros usando regex:
```javascript
/\b(error|exception|failed|fail|timeout|critical|warn(?:ing)?)\b[\s:]*(.+?)$/i
```

**Exemplos suportados:**
- `[ERROR] Connection failed`
- `Exception: NullPointerException`
- `Failed to load configuration`
- `Timeout after 30 seconds`
- `WARNING: Low memory`

## 📱 Interface

### Tabs Principais
1. **Dashboard** - Visão geral com métricas e gráficos
2. **Bugs** - Formulário de reporte e tabela de bugs
3. **Logs** - Upload/análise de logs

### Design Responsivo
- Layout adaptável para desktop e mobile
- Interface intuitiva com cores por prioridade/status
- Modal dialogs para edição de bugs

## 🔧 Desenvolvimento

### Scripts Disponíveis
```bash
npm start      # Inicia servidor em produção
npm run dev    # Inicia com watch mode (--watch)
```

### Arquitetura
- **Backend:** API REST simples com Express
- **Frontend:** Client-side rendering (sem frameworks)
- **Database:** SQLite para simplicidade (sem servidor externo)
- **Upload:** Multer para processamento de ficheiros

## 📈 Melhorias Futuras

- [ ] Autenticação de utilizadores
- [ ] Export de relatórios (PDF/Excel)
- [ ] Notificações por email
- [ ] Integração com ferramentas externas (Jira, Slack)
- [ ] API para integração com CI/CD
- [ ] Backup automático da base de dados

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o ficheiro `LICENSE` para mais detalhes.

---

**Desenvolvido com ❤️ para facilitar o trabalho de QA**