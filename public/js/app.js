// Script do Portal do Aluno - Anhanguera EAD (Coordenadora Jacke)

document.addEventListener('DOMContentLoaded', async () => {
  const formAgendamento = document.getElementById('formAgendamento');
  const nomeInput = document.getElementById('nome');
  const cpfInput = document.getElementById('cpf');
  const cpfError = document.getElementById('cpfError');
  const telefoneInput = document.getElementById('telefone');
  const cursoSelect = document.getElementById('curso');
  const semestreSelect = document.getElementById('semestre');
  const motivosContainer = document.getElementById('motivosContainer');
  const relatoInput = document.getElementById('relato');
  const caracteresCount = document.getElementById('caracteresCount');
  const dataInput = document.getElementById('data');
  const horariosContainer = document.getElementById('horariosContainer');
  const horarioSelecionado = document.getElementById('horarioSelecionado');
  const horarioError = document.getElementById('horarioError');
  const slotsCount = document.getElementById('slotsCount');
  const bookingCard = document.getElementById('bookingCard');
  const sucessoCard = document.getElementById('sucessoCard');
  const btnSubmit = document.getElementById('btnSubmit');

  // Contador de caracteres
  relatoInput.addEventListener('input', () => {
    caracteresCount.textContent = `${relatoInput.value.length} / 500`;
  });

  // Máscara de CPF
  cpfInput.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9) {
      e.target.value = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (v.length > 6) {
      e.target.value = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (v.length > 3) {
      e.target.value = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    } else {
      e.target.value = v;
    }
    validarCpfInput();
  });

  function validarCpfInput() {
    const raw = cpfInput.value.replace(/\D/g, '');
    if (raw.length === 11) {
      if (validarCPF(raw)) {
        cpfError.classList.add('hidden');
        cpfInput.classList.remove('border-rose-500');
        return true;
      } else {
        cpfError.classList.remove('hidden');
        cpfInput.classList.add('border-rose-500');
        return false;
      }
    }
    cpfError.classList.add('hidden');
    cpfInput.classList.remove('border-rose-500');
    return false;
  }

  function validarCPF(cpf) {
    if (/^(\d)\1+$/.test(cpf)) return false;
    let soma = 0;
    let resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true;
  }

  // Máscara de Telefone
  telefoneInput.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) {
      e.target.value = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (v.length > 6) {
      e.target.value = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (v.length > 2) {
      e.target.value = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    } else {
      e.target.value = v;
    }
  });

  // Carregar configurações do servidor
  let configData = null;
  try {
    const res = await fetch('/api/config');
    const json = await res.json();
    if (json.success) {
      configData = json.data;
      popularCursosESemestres(configData);
      popularMotivos(configData.motivos);
      configurarCampoData(configData);
    }
  } catch (err) {
    console.error('Erro ao carregar configurações:', err);
  }

  function popularCursosESemestres(cfg) {
    if (cfg.cursos) {
      cfg.cursos.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        cursoSelect.appendChild(opt);
      });
    }

    if (cfg.semestres) {
      cfg.semestres.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        semestreSelect.appendChild(opt);
      });
    }
  }

  function popularMotivos(motivos) {
    motivosContainer.innerHTML = '';
    motivos.forEach((motivo, idx) => {
      const isChecked = idx === 0 ? 'checked' : '';
      const activeClass = idx === 0 
        ? 'border-orange-500 bg-orange-50 text-orange-950 font-bold shadow-sm' 
        : 'border-slate-200 text-slate-700 hover:border-orange-300';

      const label = document.createElement('label');
      label.className = `cursor-pointer flex items-center gap-2 p-2.5 rounded-xl border transition-all text-xs motivo-radio-item ${activeClass}`;
      label.innerHTML = `
        <input type="radio" name="motivo" value="${motivo}" ${isChecked} class="text-orange-600 focus:ring-orange-500 rounded">
        <span>${motivo}</span>
      `;

      label.querySelector('input').addEventListener('change', () => {
        document.querySelectorAll('.motivo-radio-item').forEach(el => {
          el.className = 'cursor-pointer flex items-center gap-2 p-2.5 rounded-xl border transition-all text-xs motivo-radio-item border-slate-200 text-slate-700 hover:border-orange-300';
        });
        label.className = 'cursor-pointer flex items-center gap-2 p-2.5 rounded-xl border transition-all text-xs motivo-radio-item border-orange-500 bg-orange-50 text-orange-950 font-bold shadow-sm';
      });

      motivosContainer.appendChild(label);
    });
  }

  // Configuração e Bloqueio de Fim de Semana
  function configurarCampoData(cfg) {
    const hoje = new Date();
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const dd = String(hoje.getDate()).padStart(2, '0');
    dataInput.min = `${yyyy}-${mm}-${dd}`;

    const futuro = new Date();
    futuro.setDate(futuro.getDate() + (cfg.limiteDiasFuturos || 30));
    dataInput.max = futuro.toISOString().split('T')[0];

    // Se hoje for sábado ou domingo, avançar para a próxima segunda-feira
    let dataSugerida = new Date(hoje);
    if (hoje.getDay() === 6) { // Sábado -> Segunda (+2 dias)
      dataSugerida.setDate(dataSugerida.getDate() + 2);
    } else if (hoje.getDay() === 0) { // Domingo -> Segunda (+1 dia)
      dataSugerida.setDate(dataSugerida.getDate() + 1);
    }

    const valSugerido = dataSugerida.toISOString().split('T')[0];
    dataInput.value = valSugerido;
    carregarHorarios(valSugerido);
  }

  // Ao alterar a data: validação estrita de fim de semana
  dataInput.addEventListener('change', () => {
    const val = dataInput.value;
    if (!val) return;

    const [ano, mes, dia] = val.split('-').map(Number);
    const dateObj = new Date(ano, mes - 1, dia);
    const diaSemana = dateObj.getDay();

    if (diaSemana === 0 || diaSemana === 6) {
      Swal.fire({
        icon: 'warning',
        title: 'Fim de Semana Bloqueado',
        text: 'A coordenação atende exclusivamente de Segunda a Sexta-feira. Por favor, selecione um dia útil.',
        confirmButtonColor: '#ea580c'
      });

      // Avançar automaticamente para a próxima segunda-feira
      const diasAteSegunda = diaSemana === 6 ? 2 : 1;
      dateObj.setDate(dateObj.getDate() + diasAteSegunda);
      dataInput.value = dateObj.toISOString().split('T')[0];
      carregarHorarios(dataInput.value);
      return;
    }

    carregarHorarios(val);
  });

  async function carregarHorarios(dataStr) {
    if (!dataStr) return;

    horarioSelecionado.value = '';
    horarioError.classList.add('hidden');
    slotsCount.textContent = 'Buscando horários...';
    horariosContainer.innerHTML = `
      <div class="py-6 flex flex-col items-center justify-center text-slate-400">
        <div class="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2"></div>
        <span class="text-xs">Consultando horários de 18:00 às 20:00...</span>
      </div>
    `;

    try {
      const res = await fetch(`/api/horarios-disponiveis?data=${dataStr}`);
      const json = await res.json();

      if (!json.success || !json.disponivel) {
        slotsCount.textContent = 'Indisponível';
        horariosContainer.innerHTML = `
          <div class="py-4 text-center text-rose-600 text-xs px-2">
            <i data-lucide="calendar-x" class="w-6 h-6 mx-auto mb-1"></i>
            <p class="font-semibold">${json.motivoBloqueio || 'Sem atendimentos nesta data.'}</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      const { horarios, vagasLivres } = json;
      slotsCount.textContent = `${vagasLivres} vaga(s) disponível(is)`;

      if (vagasLivres === 0) {
        horariosContainer.innerHTML = `
          <div class="py-4 text-center text-amber-700 text-xs px-2">
            <i data-lucide="clock" class="w-6 h-6 mx-auto mb-1 text-amber-500"></i>
            <p class="font-bold">Todos os horários de 18:00 às 20:00 deste dia já foram preenchidos.</p>
            <p class="text-slate-500 mt-1">Por favor, escolha outro dia útil.</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      let html = '<div class="grid grid-cols-3 gap-2 w-full">';
      horarios.forEach(slot => {
        if (slot.livre) {
          html += `
            <button type="button" data-hora="${slot.horario}"
              class="time-slot border border-slate-300 bg-white py-2.5 px-2 text-center rounded-xl text-xs font-semibold text-slate-800 shadow-sm">
              ${slot.horario}
            </button>
          `;
        } else {
          html += `
            <button type="button" disabled title="Horário já reservado"
              class="time-slot occupied border py-2.5 px-2 text-center rounded-xl text-xs font-medium">
              ${slot.horario}
            </button>
          `;
        }
      });
      html += '</div>';

      horariosContainer.innerHTML = html;

      horariosContainer.querySelectorAll('.time-slot:not(.occupied)').forEach(btn => {
        btn.addEventListener('click', () => {
          horariosContainer.querySelectorAll('.time-slot').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          horarioSelecionado.value = btn.getAttribute('data-hora');
          horarioError.classList.add('hidden');
        });
      });

    } catch (err) {
      console.error('Erro ao carregar horários:', err);
      horariosContainer.innerHTML = `
        <div class="py-4 text-center text-rose-600 text-xs">
          <p>Erro ao conectar com a agenda. Recarregue a página.</p>
        </div>
      `;
    }
  }

  // Envio do formulário
  formAgendamento.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!horarioSelecionado.value) {
      horarioError.classList.remove('hidden');
      horariosContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const cpfRaw = cpfInput.value.replace(/\D/g, '');
    if (cpfRaw.length !== 11 || !validarCPF(cpfRaw)) {
      cpfError.classList.remove('hidden');
      cpfInput.focus();
      return;
    }

    const motivoSelecionado = document.querySelector('input[name="motivo"]:checked')?.value;

    const payload = {
      nome: nomeInput.value.trim(),
      cpf: cpfInput.value.trim(),
      curso: cursoSelect.value,
      semestre: semestreSelect.value,
      telefone: telefoneInput.value.trim(),
      data: dataInput.value,
      horario: horarioSelecionado.value,
      motivo: motivoSelecionado,
      relato: relatoInput.value.trim()
    };

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `
      <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      <span>Confirmando seu agendamento...</span>
    `;

    try {
      const res = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        Swal.fire({
          icon: 'error',
          title: 'Atenção',
          text: json.message || 'Não foi possível confirmar o agendamento.',
          confirmButtonColor: '#ea580c'
        });
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `
          <i data-lucide="calendar-plus" class="w-5 h-5"></i>
          <span>Confirmar Agendamento</span>
        `;
        lucide.createIcons();
        return;
      }

      exibirConfirmacao(json.data);

    } catch (err) {
      console.error('Erro ao enviar agendamento:', err);
      Swal.fire({
        icon: 'error',
        title: 'Falha de Conexão',
        text: 'Não foi possível comunicar com o servidor.',
        confirmButtonColor: '#ea580c'
      });
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `
        <i data-lucide="calendar-plus" class="w-5 h-5"></i>
        <span>Confirmar Agendamento</span>
      `;
      lucide.createIcons();
    }
  });

  function exibirConfirmacao(agendamento) {
    bookingCard.classList.add('hidden');
    sucessoCard.classList.remove('hidden');

    const [ano, mes, dia] = agendamento.data.split('-');
    const dataFormatada = `${dia}/${mes}/${ano}`;

    document.getElementById('resProtocolo').textContent = agendamento.protocolo;
    document.getElementById('resNome').textContent = agendamento.nome;
    document.getElementById('resCpf').textContent = agendamento.cpf;
    document.getElementById('resCursoSemestre').textContent = `${agendamento.curso} (${agendamento.semestre})`;
    document.getElementById('resTelefone').textContent = agendamento.telefone;
    document.getElementById('resDataHorario').textContent = `${dataFormatada} às ${agendamento.horario}`;
    document.getElementById('resMotivo').textContent = agendamento.motivo;
    document.getElementById('resRelato').textContent = agendamento.relato;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    lucide.createIcons();
  }
});
