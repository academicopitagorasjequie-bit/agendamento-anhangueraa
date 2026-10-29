// Script do Painel da Coordenação EAD - Anhanguera (Coordenadora Jacke)

let adminToken = localStorage.getItem('jacke_admin_token') || null;
let agendamentoSelecionado = null;
let agendamentosDoDiaAtual = [];

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  definirDataRelatorioHoje();
});

// ================= AUTENTICAÇÃO ================= //

function initAuth() {
  const loginScreen = document.getElementById('loginScreen');
  const painelContent = document.getElementById('painelContent');
  const headerActions = document.getElementById('headerActions');
  const formLogin = document.getElementById('formLogin');

  if (adminToken) {
    loginScreen.classList.add('hidden');
    painelContent.classList.remove('hidden');
    headerActions.classList.remove('hidden');
    carregarRelatorioDiario();
    carregarConfiguracoes();
  } else {
    loginScreen.classList.remove('hidden');
    painelContent.classList.add('hidden');
    headerActions.classList.add('hidden');
  }

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const senha = document.getElementById('senhaAdmin').value;
    const btnLogin = document.getElementById('btnLogin');

    btnLogin.disabled = true;
    btnLogin.innerHTML = `<span class="animate-spin mr-2">⏳</span> Verificando...`;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha })
      });
      const json = await res.json();

      if (json.success && json.token) {
        adminToken = json.token;
        localStorage.setItem('jacke_admin_token', adminToken);
        loginScreen.classList.add('hidden');
        painelContent.classList.remove('hidden');
        headerActions.classList.remove('hidden');
        carregarRelatorioDiario();
        carregarConfiguracoes();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Senha Incorreta',
          text: json.message || 'Verifique a senha digitada.',
          confirmButtonColor: '#ea580c'
        });
      }
    } catch (err) {
      Swal.fire('Erro', 'Não foi possível autenticar no servidor.', 'error');
    } finally {
      btnLogin.disabled = false;
      btnLogin.innerHTML = `<i data-lucide="unlock" class="w-4 h-4"></i><span>Entrar no Painel</span>`;
      lucide.createIcons();
    }
  });
}

function fazerLogout() {
  adminToken = null;
  localStorage.removeItem('jacke_admin_token');
  location.reload();
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  };
}

// ================= NAVEGAÇÃO DE ABAS ================= //

function trocarAba(aba) {
  const abas = ['relatorio', 'geral', 'config'];
  abas.forEach(a => {
    const el = document.getElementById(`aba${a.charAt(0).toUpperCase() + a.slice(1)}`);
    const btn = document.getElementById(`tab${a.charAt(0).toUpperCase() + a.slice(1)}Btn`);
    if (a === aba) {
      el.classList.remove('hidden');
      btn.className = 'px-3 py-1.5 rounded-lg bg-white text-orange-700 font-bold shadow-sm transition flex items-center gap-1.5';
    } else {
      el.classList.add('hidden');
      btn.className = 'px-3 py-1.5 rounded-lg text-orange-100 hover:text-white transition flex items-center gap-1.5';
    }
  });

  if (aba === 'relatorio') carregarRelatorioDiario();
  if (aba === 'geral') carregarHistoricoGeral();
  if (aba === 'config') carregarConfiguracoes();
  lucide.createIcons();
}

// ================= CONTROLE DE DATA DO RELATÓRIO ================= //

const dataRelatorioInput = document.getElementById('dataRelatorio');

function definirDataRelatorioHoje() {
  const hoje = new Date().toISOString().split('T')[0];
  dataRelatorioInput.value = hoje;
  if (adminToken) carregarRelatorioDiario();
}

function mudarDataRelatorio(dias) {
  const atual = new Date(dataRelatorioInput.value + 'T00:00:00');
  atual.setDate(atual.getDate() + dias);
  dataRelatorioInput.value = atual.toISOString().split('T')[0];
  carregarRelatorioDiario();
}

dataRelatorioInput.addEventListener('change', () => {
  carregarRelatorioDiario();
});

// ================= RELATÓRIO DIÁRIO (SEM CONFIRMADO / CANCELADO) ================= //

async function carregarRelatorioDiario() {
  const dataAlvo = dataRelatorioInput.value;
  if (!dataAlvo) return;

  const [ano, mes, dia] = dataAlvo.split('-');
  const dataFormatada = `${dia}/${mes}/${ano}`;
  document.getElementById('labelDataRelatorio').textContent = dataFormatada;

  document.querySelectorAll('.print-data-alvo').forEach(el => el.textContent = dataFormatada);
  document.querySelectorAll('.print-data-emissao').forEach(el => el.textContent = new Date().toLocaleString('pt-BR'));

  const tabelaCorpo = document.getElementById('tabelaRelatorioCorpo');
  const vazioRelatorio = document.getElementById('vazioRelatorio');

  tabelaCorpo.innerHTML = `
    <tr>
      <td colspan="7" class="py-8 text-center text-slate-400">
        <div class="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <span>Carregando atendimentos do dia...</span>
      </td>
    </tr>
  `;

  try {
    const res = await fetch(`/api/admin/relatorio-diario?data=${dataAlvo}`, {
      headers: getAuthHeaders()
    });

    if (res.status === 401) {
      fazerLogout();
      return;
    }

    const json = await res.json();
    if (!json.success) {
      tabelaCorpo.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-rose-600">Erro ao carregar relatório.</td></tr>`;
      return;
    }

    const { estatisticas, porMotivo, agendamentos } = json;
    agendamentosDoDiaAtual = agendamentos;

    // Atualizar métricas (Agendados, Concluídos, Ausentes)
    document.getElementById('cardTotalDia').textContent = estatisticas.total;
    document.getElementById('cardAgendadosDia').textContent = estatisticas.agendados;
    document.getElementById('cardConcluidosDia').textContent = estatisticas.concluidos;
    document.getElementById('cardAusentesDia').textContent = estatisticas.ausentes;

    // Tags de motivos
    const tagsContainer = document.getElementById('tagsMotivosDia');
    tagsContainer.innerHTML = '';
    const entries = Object.entries(porMotivo || {});
    if (entries.length === 0) {
      tagsContainer.innerHTML = '<span class="text-slate-400 italic">Nenhum atendimento</span>';
    } else {
      entries.forEach(([motivo, count]) => {
        const span = document.createElement('span');
        span.className = 'bg-white text-orange-950 border border-orange-200 px-2.5 py-0.5 rounded-full text-xs font-semibold';
        span.textContent = `${motivo}: ${count}`;
        tagsContainer.appendChild(span);
      });
    }

    // Tabela
    if (agendamentos.length === 0) {
      tabelaCorpo.innerHTML = '';
      vazioRelatorio.classList.remove('hidden');
      return;
    }

    vazioRelatorio.classList.add('hidden');
    tabelaCorpo.innerHTML = agendamentos.map(item => {
      let statusClass = 'status-agendado';
      if (item.status === 'Concluído') statusClass = 'status-concluido';
      if (item.status === 'Ausente') statusClass = 'status-ausente';

      return `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
          <td class="py-3 px-4 font-extrabold text-orange-600 text-sm whitespace-nowrap">
            <div class="flex items-center gap-1.5">
              <i data-lucide="clock" class="w-3.5 h-3.5 text-orange-500 no-print"></i>
              <span>${item.horario}</span>
            </div>
          </td>

          <td class="py-3 px-4">
            <span class="font-bold text-slate-800 block">${item.nome}</span>
            <span class="text-[11px] text-slate-500 font-mono">CPF: ${item.cpf}</span>
          </td>

          <td class="py-3 px-4">
            <span class="font-medium text-slate-700 block">${item.curso}</span>
            <span class="text-[11px] text-slate-500">${item.semestre}</span>
          </td>

          <td class="py-3 px-4">
            <span class="inline-block bg-orange-50 text-orange-900 border border-orange-200 px-2 py-0.5 rounded text-xs font-semibold">
              ${item.motivo}
            </span>
            <p class="text-[11px] text-slate-500 mt-1 line-clamp-1 italic" title="${item.relato}">"${item.relato}"</p>
          </td>

          <td class="py-3 px-4 whitespace-nowrap font-mono text-xs text-slate-700">
            ${item.telefone}
          </td>

          <td class="py-3 px-4 whitespace-nowrap">
            <span class="status-badge ${statusClass}">
              <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
              ${item.status}
            </span>
          </td>

          <td class="py-3 px-4 text-right whitespace-nowrap no-print">
            <div class="flex items-center justify-end gap-1.5">
              <button onclick="abrirModalDetalhes('${item.id}')"
                class="px-2.5 py-1 text-xs font-bold bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg transition border border-orange-200 flex items-center gap-1"
                title="Ver detalhes e inserir parecer">
                <i data-lucide="file-edit" class="w-3.5 h-3.5"></i>
                <span>Detalhes</span>
              </button>

              <button onclick="mudarStatusRapido('${item.id}', 'Concluído')"
                class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Marcar como Concluído">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    lucide.createIcons();

  } catch (err) {
    console.error('Erro ao buscar relatório diário:', err);
    tabelaCorpo.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-rose-600">Erro de conexão ao carregar relatório.</td></tr>`;
  }
}

// ================= EXPORTAÇÃO CSV 100% CORRIGIDA ================= //

async function exportarCsvRelatorio() {
  const dataAlvo = dataRelatorioInput.value;
  const btn = document.getElementById('btnExportarCsv');
  const originalHtml = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = `<span class="animate-spin mr-1">⏳</span> Exportando...`;

  try {
    const res = await fetch(`/api/admin/export/csv?data=${dataAlvo}&token=${adminToken}`, {
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      throw new Error(`Status ${res.status}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_agendamentos_${dataAlvo}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    Swal.fire({
      icon: 'success',
      title: 'Relatório Exportado!',
      text: `Planilha CSV da data ${dataAlvo} gerada com sucesso.`,
      timer: 2000,
      showConfirmButton: false
    });
  } catch (err) {
    console.error('Erro ao exportar CSV:', err);
    Swal.fire({
      icon: 'error',
      title: 'Erro na Exportação',
      text: 'Não foi possível gerar a planilha CSV. Verifique a conexão com o servidor.',
      confirmButtonColor: '#ea580c'
    });
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    lucide.createIcons();
  }
}

// Mudança rápida para Concluído
async function mudarStatusRapido(id, novoStatus) {
  try {
    const res = await fetch(`/api/admin/agendamentos/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: novoStatus })
    });
    const json = await res.json();
    if (json.success) {
      carregarRelatorioDiario();
    }
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
  }
}

// ================= MODAL DE DETALHES ================= //

function abrirModalDetalhes(id) {
  const item = agendamentosDoDiaAtual.find(a => a.id === id) || window.todosAgendamentosGeral?.find(a => a.id === id);
  if (!item) return;

  agendamentoSelecionado = item;

  document.getElementById('modalProtocolo').textContent = `Protocolo: ${item.protocolo}`;
  document.getElementById('modalAlunoNome').textContent = item.nome;
  document.getElementById('modalCpf').textContent = item.cpf;
  document.getElementById('modalTelefone').textContent = item.telefone;
  document.getElementById('modalCurso').textContent = item.curso;
  document.getElementById('modalSemestre').textContent = item.semestre;
  document.getElementById('modalDataHorario').textContent = `${item.data} às ${item.horario}`;
  document.getElementById('modalMotivo').textContent = item.motivo;
  document.getElementById('modalRelato').textContent = item.relato;
  document.getElementById('modalAnotacoes').value = item.anotacoesCoord || '';
  document.getElementById('modalStatusSelect').value = item.status;

  document.getElementById('modalDetalhes').classList.remove('hidden');
  lucide.createIcons();
}

function fecharModalDetalhes() {
  document.getElementById('modalDetalhes').classList.add('hidden');
  agendamentoSelecionado = null;
}

async function salvarAlteracoesModal() {
  if (!agendamentoSelecionado) return;

  const status = document.getElementById('modalStatusSelect').value;
  const anotacoesCoord = document.getElementById('modalAnotacoes').value;

  try {
    const res = await fetch(`/api/admin/agendamentos/${agendamentoSelecionado.id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, anotacoesCoord })
    });
    const json = await res.json();
    if (json.success) {
      fecharModalDetalhes();
      carregarRelatorioDiario();
      if (!document.getElementById('abaGeral').classList.contains('hidden')) {
        carregarHistoricoGeral();
      }
    } else {
      Swal.fire('Erro', json.message || 'Não foi possível salvar alterações.', 'error');
    }
  } catch (err) {
    Swal.fire('Erro', 'Falha ao conectar com o servidor.', 'error');
  }
}

// ================= HISTÓRICO GERAL ================= //

async function carregarHistoricoGeral() {
  const busca = document.getElementById('filtroGeralBusca').value;
  const status = document.getElementById('filtroGeralStatus').value;
  const motivo = document.getElementById('filtroGeralMotivo').value;
  const tabela = document.getElementById('tabelaGeralCorpo');

  tabela.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400">Consultando histórico...</td></tr>`;

  try {
    const params = new URLSearchParams();
    if (busca) params.append('busca', busca);
    if (status && status !== 'todos') params.append('status', status);
    if (motivo && motivo !== 'todos') params.append('motivo', motivo);

    const res = await fetch(`/api/admin/agendamentos?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();

    if (!json.success || !json.data || json.data.length === 0) {
      tabela.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400">Nenhum registro encontrado.</td></tr>`;
      return;
    }

    window.todosAgendamentosGeral = json.data;

    tabela.innerHTML = json.data.map(item => {
      const [ano, mes, dia] = item.data.split('-');
      const dataFormatada = `${dia}/${mes}/${ano}`;

      let statusClass = 'status-agendado';
      if (item.status === 'Concluído') statusClass = 'status-concluido';
      if (item.status === 'Ausente') statusClass = 'status-ausente';

      return `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
          <td class="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">${dataFormatada} às ${item.horario}</td>
          <td class="py-2.5 px-3 font-mono text-[11px] text-orange-600 font-bold">${item.protocolo}</td>
          <td class="py-2.5 px-3">
            <span class="font-bold text-slate-800">${item.nome}</span>
            <span class="text-[10px] text-slate-400 block">${item.cpf}</span>
          </td>
          <td class="py-2.5 px-3 text-slate-700">${item.curso} • ${item.semestre}</td>
          <td class="py-2.5 px-3 text-slate-700 font-medium">${item.motivo}</td>
          <td class="py-2.5 px-3">
            <span class="status-badge ${statusClass}">${item.status}</span>
          </td>
          <td class="py-2.5 px-3 text-right">
            <button onclick="abrirModalDetalhes('${item.id}')"
              class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition">
              Ver
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    tabela.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-rose-600">Erro ao carregar histórico.</td></tr>`;
  }
}

// ================= CONFIGURAÇÕES (TURNOS CONSERTADOS) ================= //

async function carregarConfiguracoes() {
  try {
    const res = await fetch('/api/admin/config', { headers: getAuthHeaders() });
    const json = await res.json();
    if (json.success && json.data) {
      const cfg = json.data;
      document.getElementById('cfgNome').value = cfg.coordenadoraNome || '';
      document.getElementById('cfgDuracao').value = cfg.duracaoAtendimentoMinutos || 20;
      document.getElementById('cfgHorarioInicio').value = cfg.horarioAtendimento?.inicio || '18:00';
      document.getElementById('cfgHorarioFim').value = cfg.horarioAtendimento?.fim || '20:00';

      const filtroMotivo = document.getElementById('filtroGeralMotivo');
      if (filtroMotivo && cfg.motivos) {
        filtroMotivo.innerHTML = '<option value="todos">Todos os Motivos</option>';
        cfg.motivos.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m;
          opt.textContent = m;
          filtroMotivo.appendChild(opt);
        });
      }
    }
  } catch (err) {
    console.error('Erro ao carregar configurações:', err);
  }
}

document.getElementById('formConfig').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    coordenadoraNome: document.getElementById('cfgNome').value.trim(),
    duracaoAtendimentoMinutos: document.getElementById('cfgDuracao').value,
    horarioInicio: document.getElementById('cfgHorarioInicio').value,
    horarioFim: document.getElementById('cfgHorarioFim').value
  };

  const novaSenha = document.getElementById('cfgNovaSenha').value.trim();
  if (novaSenha) {
    payload.senhaAdmin = novaSenha;
  }

  try {
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      Swal.fire({
        icon: 'success',
        title: 'Configurações Salvas',
        text: 'Horários de atendimento atualizados com sucesso.',
        confirmButtonColor: '#ea580c'
      });
      document.getElementById('cfgNovaSenha').value = '';
    } else {
      Swal.fire('Erro', json.message || 'Erro ao salvar configurações.', 'error');
    }
  } catch (err) {
    Swal.fire('Erro', 'Falha ao salvar configurações.', 'error');
  }
});
