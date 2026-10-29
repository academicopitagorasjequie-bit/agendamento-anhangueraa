const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Localizar pasta public de forma resiliente
const publicDir = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : path.join(__dirname, 'sistema_agendamento', 'public');

app.use(express.static(publicDir));
app.use(express.static(path.join(__dirname, 'public')));

// Rotas explícitas para garantir que nunca dê "Cannot GET /"
app.get('/', (req, res) => {
  const p = path.join(publicDir, 'index.html');
  if (fs.existsSync(p)) return res.sendFile(p);
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  const p = path.join(publicDir, 'admin.html');
  if (fs.existsSync(p)) return res.sendFile(p);
  return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin.html', (req, res) => {
  const p = path.join(publicDir, 'admin.html');
  if (fs.existsSync(p)) return res.sendFile(p);
  return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Caminhos dos dados com busca resiliente
const DATA_DIR = fs.existsSync(path.join(__dirname, 'data'))
  ? path.join(__dirname, 'data')
  : path.join(__dirname, 'sistema_agendamento', 'data');
const AGENDAMENTOS_FILE = path.join(DATA_DIR, 'agendamentos.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Garantir diretório de dados
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Configuração padrão alinhada à Faculdade Anhanguera e Coordenadora Jacke
const DEFAULT_CONFIG = {
  coordenadoraNome: 'Coordenadora Jacke',
  cargo: 'Coordenação de Cursos EAD',
  instituicao: 'Faculdade Anhanguera',
  localAtendimento: 'Sala da Coordenação',
  senhaAdmin: 'jacke2026',
  telefoneCoord: '(00) 90000-0000',
  emailCoord: 'coordenacao.ead@anhanguera.com',
  diasSemanaAtendimento: [1, 2, 3, 4, 5], // 1=Segunda a 5=Sexta (Sábado e Domingo estritamente bloqueados)
  duracaoAtendimentoMinutos: 20, // 18:00, 18:20, 18:40, 19:00, 19:20, 19:40
  horarioAtendimento: {
    inicio: '18:00',
    fim: '20:00'
  },
  limiteDiasFuturos: 30,
  statusPermitidos: ['Agendado', 'Concluído', 'Ausente'], // Confirmado e Cancelado removidos
  motivos: [
    'Estágio',
    'Portal',
    'Dependência e adaptação',
    'Mediadores',
    'TCC',
    'Dúvidas acadêmicas',
    'Colação de grau e diploma',
    'Outro'
  ],
  cursos: [
    'Administração',
    'Análise e Desenvolvimento de Sistemas',
    'Ciências Contábeis',
    'Educação Física (Licenciatura)',
    'Gestão de Recursos Humanos',
    'Gestão Financeira',
    'Logística',
    'Marketing',
    'Pedagogia',
    'Processos Gerenciais',
    'Serviço Social',
    'Outro Curso de Graduação'
  ],
  semestres: [
    '1º Semestre',
    '2º Semestre',
    '3º Semestre',
    '4º Semestre',
    '5º Semestre',
    '6º Semestre',
    '7º Semestre',
    '8º Semestre',
    '9º Semestre',
    '10º Semestre',
    'Concluinte / Formando'
  ],
  datasBloqueadas: []
};

// Funções auxiliares de persistência
function readJsonFile(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Erro ao ler ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile(filePath, data) {
  try {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (err) {
    console.error(`Erro ao salvar ${filePath}:`, err);
    return false;
  }
}

function getConfig() {
  const current = readJsonFile(CONFIG_FILE, DEFAULT_CONFIG);
  const merged = { ...DEFAULT_CONFIG, ...current };
  
  // Garantir turno de 18:00 às 20:00
  if (!merged.horarioAtendimento) {
    merged.horarioAtendimento = { inicio: '18:00', fim: '20:00' };
  }
  merged.localAtendimento = 'Sala da Coordenação';
  merged.statusPermitidos = ['Agendado', 'Concluído', 'Ausente'];
  return merged;
}

function saveConfig(cfg) {
  return writeJsonFile(CONFIG_FILE, cfg);
}

function getAgendamentos() {
  return readJsonFile(AGENDAMENTOS_FILE, []);
}

function saveAgendamentos(list) {
  return writeJsonFile(AGENDAMENTOS_FILE, list);
}

// Inicializar dados de exemplo alinhados ao novo padrão
function initDemoDataIfNeeded() {
  const agendamentos = getAgendamentos();
  const hoje = new Date().toISOString().split('T')[0];

  // Se agendamentos tiverem status antigos (Confirmado/Cancelado) ou turnos diurnos, normalizar
  if (agendamentos.length === 0 || agendamentos.some(a => a.status === 'Confirmado' || a.status === 'Cancelado')) {
    const demo = [
      {
        id: 'DEMO-001',
        protocolo: 'EAD-2026-1001',
        nome: 'Mariana Souza Lima',
        cpf: '123.456.789-00',
        curso: 'Pedagogia',
        semestre: '5º Semestre',
        telefone: '(11) 98765-4321',
        data: hoje,
        horario: '18:00',
        local: 'Sala da Coordenação',
        motivo: 'Estágio',
        relato: 'Dúvidas sobre o preenchimento do Termo de Compromisso e plano de atividades do estágio curricular.',
        status: 'Agendado',
        criadoEm: new Date().toISOString(),
        anotacoesCoord: 'Trazer cópia do termo assinado.'
      },
      {
        id: 'DEMO-002',
        protocolo: 'EAD-2026-1002',
        nome: 'Carlos Eduardo Nogueira',
        cpf: '234.567.890-11',
        curso: 'Administração',
        semestre: '8º Semestre',
        telefone: '(11) 97654-3210',
        data: hoje,
        horario: '18:30',
        local: 'Sala da Coordenação',
        motivo: 'TCC',
        relato: 'Orientação quanto à entrega final do TCC II e indicação de banca examinadora.',
        status: 'Agendado',
        criadoEm: new Date().toISOString(),
        anotacoesCoord: ''
      },
      {
        id: 'DEMO-003',
        protocolo: 'EAD-2026-1003',
        nome: 'Beatriz Almeida Santos',
        cpf: '345.678.901-22',
        curso: 'Ciências Contábeis',
        semestre: '3º Semestre',
        telefone: '(11) 96543-2109',
        data: hoje,
        horario: '19:00',
        local: 'Sala da Coordenação',
        motivo: 'Dependência e adaptação',
        relato: 'Solicitação de inclusão de matéria em adaptação na grade deste semestre.',
        status: 'Concluído',
        criadoEm: new Date().toISOString(),
        anotacoesCoord: 'Encaminhado ao setor de secretaria para inclusão.'
      }
    ];
    saveAgendamentos(demo);
  }
}

initDemoDataIfNeeded();

// Gerador de grade de horários (a partir das 18:00 até 20:00)
function gerarSlots(inicioStr, fimStr, duracaoMinutos) {
  const slots = [];
  const [hIni, mIni] = (inicioStr || '18:00').split(':').map(Number);
  const [hFim, mFim] = (fimStr || '20:00').split(':').map(Number);

  let atual = hIni * 60 + mIni;
  const limite = hFim * 60 + mFim;
  const dur = Number(duracaoMinutos) || 20;

  while (atual + dur <= limite) {
    const hora = Math.floor(atual / 60);
    const min = atual % 60;
    const str = `${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    slots.push(str);
    atual += dur;
  }
  return slots;
}

// Middleware de Autenticação da Coordenação (aceita Header Bearer OU token na Query para download seguro)
function adminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const tokenQuery = req.query.token;

  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (tokenQuery) {
    token = tokenQuery;
  }

  if (!token || !token.startsWith('sessao-jacke-')) {
    return res.status(401).json({ success: false, message: 'Acesso não autorizado. Faça login novamente.' });
  }
  next();
}

// ================= ROTAS PÚBLICAS (PORTAL DO ALUNO) ================= //

// Configurações públicas
app.get('/api/config', (req, res) => {
  const cfg = getConfig();
  const { senhaAdmin, ...publicCfg } = cfg;
  res.json({ success: true, data: publicCfg });
});

// Horários disponíveis para a data selecionada
app.get('/api/horarios-disponiveis', (req, res) => {
  try {
    const { data } = req.query; // YYYY-MM-DD
    if (!data) {
      return res.status(400).json({ success: false, message: 'Data é obrigatória.' });
    }

    const cfg = getConfig();

    // Validar se data é fim de semana (Sábado=6, Domingo=0)
    const [ano, mes, dia] = data.split('-').map(Number);
    const dateObj = new Date(ano, mes - 1, dia);
    const diaSemana = dateObj.getDay();

    if (diaSemana === 0 || diaSemana === 6 || !cfg.diasSemanaAtendimento.includes(diaSemana)) {
      return res.json({
        success: true,
        disponivel: false,
        motivoBloqueio: 'Atendimentos ocorrem exclusivamente de Segunda a Sexta-feira. Finais de semana estão bloqueados.',
        horarios: []
      });
    }

    if (cfg.datasBloqueadas && cfg.datasBloqueadas.includes(data)) {
      return res.json({
        success: true,
        disponivel: false,
        motivoBloqueio: 'Data sem expediente / bloqueada pela coordenação.',
        horarios: []
      });
    }

    // Gerar horários do turno da noite (18:00 às 20:00)
    const inicioTurno = cfg.horarioAtendimento?.inicio || '18:00';
    const fimTurno = cfg.horarioAtendimento?.fim || '20:00';
    const duracao = cfg.duracaoAtendimentoMinutos || 20;

    const todosSlots = gerarSlots(inicioTurno, fimTurno, duracao);

    // Buscar horários ocupados no dia (apenas status ativos: Agendado ou Concluído)
    const agendamentos = getAgendamentos();
    const ocupados = agendamentos
      .filter(a => a.data === data && a.status !== 'Ausente')
      .map(a => a.horario);

    const resultado = todosSlots.map(slot => ({
      horario: slot,
      livre: !ocupados.includes(slot)
    }));

    return res.json({
      success: true,
      disponivel: true,
      data,
      totalSlots: resultado.length,
      vagasLivres: resultado.filter(s => s.livre).length,
      horarios: resultado
    });
  } catch (err) {
    console.error('Erro ao buscar horários:', err);
    res.status(500).json({ success: false, message: 'Erro ao calcular horários disponíveis.' });
  }
});

// Criar novo agendamento
app.post('/api/agendamentos', (req, res) => {
  try {
    const {
      nome,
      cpf,
      curso,
      semestre,
      telefone,
      email,
      data,
      horario,
      motivo,
      relato
    } = req.body;

    // Validações obrigatórias
    if (!nome || !cpf || !curso || !semestre || !telefone || !data || !horario || !motivo || !relato) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, preencha todos os campos obrigatórios.'
      });
    }

    // Bloqueio rigoroso de finais de semana
    const [ano, mes, dia] = data.split('-').map(Number);
    const dateObj = new Date(ano, mes - 1, dia);
    const diaSemana = dateObj.getDay();
    if (diaSemana === 0 || diaSemana === 6) {
      return res.status(400).json({
        success: false,
        message: 'Não é permitido agendar aos fins de semana (Sábado e Domingo). Escolha um dia de Segunda a Sexta-feira.'
      });
    }

    // Validação CPF
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      return res.status(400).json({
        success: false,
        message: 'CPF inválido. Deve conter 11 dígitos numéricos.'
      });
    }

    const agendamentos = getAgendamentos();

    // Verificar se o horário já está ocupado
    const jaOcupado = agendamentos.some(
      a => a.data === data && a.horario === horario && a.status !== 'Ausente'
    );

    if (jaOcupado) {
      return res.status(409).json({
        success: false,
        message: 'Este horário acabou de ser reservado por outro aluno. Por favor, escolha outro horário.'
      });
    }

    // Verificar se o mesmo aluno já tem agendamento ativo no mesmo dia
    const mesmoAlunoMesmoDia = agendamentos.find(
      a => a.data === data && a.cpf.replace(/\D/g, '') === cpfLimpo && a.status === 'Agendado'
    );

    if (mesmoAlunoMesmoDia) {
      return res.status(400).json({
        success: false,
        message: `Você já possui um atendimento agendado para esta data às ${mesmoAlunoMesmoDia.horario} (Protocolo: ${mesmoAlunoMesmoDia.protocolo}).`
      });
    }

    // Protocolo oficial
    const id = 'AGD-' + Date.now();
    const protocoloNum = Math.floor(1000 + Math.random() * 9000);
    const anoAtual = new Date().getFullYear();
    const protocolo = `ANH-${anoAtual}-${protocoloNum}`;

    const novoAgendamento = {
      id,
      protocolo,
      nome: nome.trim(),
      cpf: formatarCpf(cpfLimpo),
      curso: curso.trim(),
      semestre: semestre.trim(),
      telefone: telefone.trim(),
      email: (email || '').trim(),
      data,
      horario,
      local: 'Sala da Coordenação',
      motivo: motivo.trim(),
      relato: relato.trim(),
      status: 'Agendado', // Status direto: Agendado, Concluído, Ausente
      criadoEm: new Date().toISOString(),
      anotacoesCoord: ''
    };

    agendamentos.push(novoAgendamento);
    saveAgendamentos(agendamentos);

    res.status(201).json({
      success: true,
      message: 'Agendamento registrado com sucesso!',
      data: novoAgendamento
    });
  } catch (err) {
    console.error('Erro ao criar agendamento:', err);
    res.status(500).json({ success: false, message: 'Erro interno ao processar agendamento.' });
  }
});

// ================= ROTAS DA COORDENADORA (PAINEL ADMIN) ================= //

// Login da coordenação
app.post('/api/admin/login', (req, res) => {
  const { senha } = req.body;
  const cfg = getConfig();
  if (senha === cfg.senhaAdmin) {
    return res.json({
      success: true,
      token: 'sessao-jacke-' + Buffer.from(Date.now().toString()).toString('base64'),
      coordenadora: cfg.coordenadoraNome,
      instituicao: cfg.instituicao
    });
  }
  return res.status(401).json({ success: false, message: 'Senha incorreta da Coordenação.' });
});

// RELATÓRIO DIÁRIO DE AGENDAMENTOS (Apenas Agendado, Concluído, Ausente)
app.get('/api/admin/relatorio-diario', adminAuth, (req, res) => {
  try {
    const dataAlvo = req.query.data || new Date().toISOString().split('T')[0];
    const agendamentos = getAgendamentos();

    // Filtrar pelo dia específico
    const agendamentosDoDia = agendamentos.filter(a => a.data === dataAlvo);
    agendamentosDoDia.sort((a, b) => a.horario.localeCompare(b.horario));

    // Estatísticas limpas (sem Confirmado e sem Cancelado)
    const total = agendamentosDoDia.length;
    const agendados = agendamentosDoDia.filter(a => a.status === 'Agendado').length;
    const concluidos = agendamentosDoDia.filter(a => a.status === 'Concluído').length;
    const ausentes = agendamentosDoDia.filter(a => a.status === 'Ausente').length;

    // Agrupamento por motivo
    const porMotivo = {};
    agendamentosDoDia.forEach(a => {
      porMotivo[a.motivo] = (porMotivo[a.motivo] || 0) + 1;
    });

    res.json({
      success: true,
      data: dataAlvo,
      estatisticas: {
        total,
        agendados,
        concluidos,
        ausentes
      },
      porMotivo,
      agendamentos: agendamentosDoDia
    });
  } catch (err) {
    console.error('Erro ao gerar relatório diário:', err);
    res.status(500).json({ success: false, message: 'Erro ao gerar relatório diário.' });
  }
});

// Histórico geral com filtros
app.get('/api/admin/agendamentos', adminAuth, (req, res) => {
  try {
    const { busca, status, motivo } = req.query;
    let lista = getAgendamentos();

    if (busca) {
      const q = busca.toLowerCase();
      const qCpf = busca.replace(/\D/g, '');
      lista = lista.filter(a =>
        a.nome.toLowerCase().includes(q) ||
        a.protocolo.toLowerCase().includes(q) ||
        a.curso.toLowerCase().includes(q) ||
        (qCpf && a.cpf.replace(/\D/g, '').includes(qCpf)) ||
        a.telefone.includes(q)
      );
    }

    if (status && status !== 'todos') {
      lista = lista.filter(a => a.status === status);
    }

    if (motivo && motivo !== 'todos') {
      lista = lista.filter(a => a.motivo === motivo);
    }

    lista.sort((a, b) => (b.data + b.horario).localeCompare(a.data + a.horario));

    res.json({
      success: true,
      total: lista.length,
      data: lista
    });
  } catch (err) {
    console.error('Erro ao listar histórico:', err);
    res.status(500).json({ success: false, message: 'Erro ao consultar agendamentos.' });
  }
});

// Atualizar status e anotações (apenas status permitidos)
app.patch('/api/admin/agendamentos/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status, anotacoesCoord } = req.body;
    const agendamentos = getAgendamentos();
    const item = agendamentos.find(a => a.id === id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado.' });
    }

    if (status) {
      const permitidos = ['Agendado', 'Concluído', 'Ausente'];
      if (!permitidos.includes(status)) {
        return res.status(400).json({ success: false, message: 'Status inválido. Escolha entre Agendado, Concluído ou Ausente.' });
      }
      item.status = status;
    }

    if (anotacoesCoord !== undefined) {
      item.anotacoesCoord = anotacoesCoord;
    }
    item.atualizadoEm = new Date().toISOString();

    saveAgendamentos(agendamentos);
    res.json({ success: true, message: 'Agendamento atualizado com sucesso.', data: item });
  } catch (err) {
    console.error('Erro ao atualizar agendamento:', err);
    res.status(500).json({ success: false, message: 'Erro ao atualizar dados.' });
  }
});

// Excluir agendamento
app.delete('/api/admin/agendamentos/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    let agendamentos = getAgendamentos();
    const idx = agendamentos.findIndex(a => a.id === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado.' });
    }

    agendamentos.splice(idx, 1);
    saveAgendamentos(agendamentos);
    res.json({ success: true, message: 'Registro excluído com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir agendamento:', err);
    res.status(500).json({ success: false, message: 'Erro ao excluir agendamento.' });
  }
});

// EXPORTAÇÃO CSV DO RELATÓRIO DIÁRIO (Totalmente corrigida e compatível com Excel e auth via token)
app.get('/api/admin/export/csv', adminAuth, (req, res) => {
  try {
    const dataAlvo = req.query.data || new Date().toISOString().split('T')[0];
    const agendamentos = getAgendamentos();
    const doDia = agendamentos
      .filter(a => a.data === dataAlvo)
      .sort((a, b) => a.horario.localeCompare(b.horario));

    let csv = '\uFEFF'; // BOM para o Excel abrir com acentuação correta
    csv += 'Horário;Protocolo;Status;Nome do Aluno;CPF;Curso;Semestre;Telefone;Local;Motivo;Relato do Aluno;Anotações da Coordenação\n';

    doDia.forEach(a => {
      const escape = text => `"${String(text || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
      csv += [
        escape(a.horario),
        escape(a.protocolo),
        escape(a.status),
        escape(a.nome),
        escape(a.cpf),
        escape(a.curso),
        escape(a.semestre),
        escape(a.telefone),
        escape(a.local || 'Sala da Coordenação'),
        escape(a.motivo),
        escape(a.relato),
        escape(a.anotacoesCoord)
      ].join(';') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio_agendamentos_${dataAlvo}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Erro ao exportar CSV:', err);
    res.status(500).send('Erro ao exportar relatório CSV.');
  }
});

// Obter configurações
app.get('/api/admin/config', adminAuth, (req, res) => {
  res.json({ success: true, data: getConfig() });
});

// Salvar configurações
app.put('/api/admin/config', adminAuth, (req, res) => {
  try {
    const atual = getConfig();
    const {
      coordenadoraNome,
      senhaAdmin,
      duracaoAtendimentoMinutos,
      horarioInicio,
      horarioFim
    } = req.body;

    const novaCfg = {
      ...atual,
      coordenadoraNome: coordenadoraNome || atual.coordenadoraNome,
      duracaoAtendimentoMinutos: Number(duracaoAtendimentoMinutos) || atual.duracaoAtendimentoMinutos,
      horarioAtendimento: {
        inicio: horarioInicio || atual.horarioAtendimento?.inicio || '18:00',
        fim: horarioFim || atual.horarioAtendimento?.fim || '20:00'
      }
    };

    if (senhaAdmin && senhaAdmin.trim().length >= 4) {
      novaCfg.senhaAdmin = senhaAdmin.trim();
    }

    saveConfig(novaCfg);
    res.json({ success: true, message: 'Configurações salvas com sucesso!', data: novaCfg });
  } catch (err) {
    console.error('Erro ao atualizar configurações:', err);
    res.status(500).json({ success: false, message: 'Erro ao salvar configurações.' });
  }
});

// Helper formatação CPF
function formatarCpf(val) {
  const d = String(val).replace(/\D/g, '');
  if (d.length !== 11) return val;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`======================================================`);
  console.log(`🎓 ANHANGUERA EAD - Sistema de Agendamento da Coordenação`);
  console.log(`👩‍💼 Coordenadora:         Jacke`);
  console.log(`⏰ Horário de Atendimento: 18:00 às 20:00 (Seg a Sex)`);
  console.log(`📍 Local:                 Sala da Coordenação`);
  console.log(`🌐 Portal de Agendamento: http://localhost:${PORT}`);
  console.log(`🔐 Painel da Coordenação: http://localhost:${PORT}/admin.html`);
  console.log(`🔑 Senha de Acesso:       jacke2026`);
  console.log(`======================================================`);
});
