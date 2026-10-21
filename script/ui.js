import { triage } from './triage.js';
import { dialog } from './dialog.js';

/**
 * # UI
 * Interface da triagem: desenha a fila de tickets na tela e trata os botões.
 */
export const ui = (() => {
    /**
     * categorias da tela, da gravidade mais baixa (1) para a mais alta (5).
     * `id` é o nome usado no HTML e na classe `.status`, `label` é o texto exibido.
     */
    const categories = [
        { severity: 1, id: 'not-urgent',      label: 'Não urgente'   },
        { severity: 2, id: 'slightly-urgent', label: 'Pouco urgente' },
        { severity: 3, id: 'urgent',          label: 'Urgente'       },
        { severity: 4, id: 'very-urgent',     label: 'Muito urgente' },
        { severity: 5, id: 'emergency',       label: 'Emergência'    }
    ];

    /**
     * descobre a categoria de exibição de uma gravidade
     * @param {number} severity a gravidade guardada no ticket
     * @returns {object} a categoria correspondente, com o número limitado a 1 e 5
     */
    function categoryOf(severity) {
        const level = Math.min(categories.length, Math.max(1, Math.round(Number(severity) || 1)));
        return categories[level - 1];
    }

    /**
     * traduz a gravidade de um ticket para o texto exibido na tela
     * @param {number} severity a gravidade guardada no ticket
     * @returns {string} o nome da categoria de prioridade
     */
    function severityLabel(severity) {
        return categoryOf(severity).label;
    }

    /**
     * Substitui caracteres usados em HTML por entidades, pra eviitar quebrar a interface ou permitir injeção de código
     * @param {*} text o texto a ser limpo
     * @returns {string} o texto limpo
     */
    function cleanUp(text) {
        const entities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };

        return String(text).replace(/[&<>"']/g, char => entities[char]);
    }

    /**
     * monta o resumo das condições do paciente, ignorando os dados não informados
     * @param {object} ticket o ticket exibido
     * @returns {string} as condições em uma única linha
     */
    /**
     * Monta os pares de rótulo e valor dos sinais vitais que foram informados
     * @param {object} patient os dados do paciente do ticket
     * @returns {Array} a lista `[rótulo, valor]` dos sinais, sem os que não foram preenchidos
     */
    function vitalsOf(patient) {
        return [
            ['Temp', 'Temperatura', patient.temperature > 0 ? `${patient.temperature}°C` : null],
            ['FC', 'Frequência Cardíaca', patient.heartRate > 0 ? `${patient.heartRate} BPM` : null],
            ['PA', 'Pressão Arterial', patient.pressure && patient.pressure !== '0/0' ? `${patient.pressure} mmHg` : null],
            ['Peso', 'Peso', patient.weight > 0 ? `${patient.weight} kg` : null],
            ['Alt', 'Altura', patient.height > 0 ? `${patient.height} cm` : null],
            ['Idade', 'Idade', patient.age > 0 ? `${patient.age}` : null]
        ].filter(([, value]) => value !== null);
    }

    /**
     * Cria o cartão de um paciente
     * @param {object} ticket o ticket a ser exibido
     * @param {boolean} attending `true` se o cartão está na coluna de atendimento
     * @returns {HTMLElement} o cartão pronto para ser inserido na tela
     */
    function createCase(ticket, attending) {
        const category = categoryOf(ticket.patient.severity);
        const symptoms = ticket.patient.symptoms.join(', ');
        const vitals = vitalsOf(ticket.patient);

        const card = document.createElement('div');
        card.className = 'case';
        card.dataset.uid = ticket.uid;
        card.draggable = !attending;

        const caseRight = document.createElement('div');
        caseRight.className = 'case-right';

        const dot = document.createElement('div');
        dot.className = `status ${category.id}`;
        dot.title = category.label;

        const info = document.createElement('div');
        info.className = 'case-info';

        const name = document.createElement('h4');
        name.textContent = ticket.patient.name || 'Sem nome';

        const symptomsLine = document.createElement('p');
        symptomsLine.className = 'symptoms';
        symptomsLine.textContent = symptoms || 'Sem informações registradas';

        info.append(name, symptomsLine);

        if (vitals.length > 0) {
            const vitalList = document.createElement('ul');
            vitalList.className = 'vitals';

            vitals.forEach(([label, tooltip, value]) => {
                const item = document.createElement('li');
                item.title = `${tooltip}`;

                const itemLabel = document.createElement('span');
                itemLabel.className = 'vital-name';
                itemLabel.textContent = label;

                const itemValue = document.createElement('span');
                itemValue.className = 'vital-value';
                itemValue.textContent = value;

                item.append(itemLabel, itemValue);
                vitalList.append(item);
            });

            info.append(vitalList);
        }

        caseRight.append(dot, info);

        const caseLeft = document.createElement('div');
        caseLeft.className = 'case-left';

        const primary = document.createElement('button');
        primary.dataset.action = attending ? 'finish' : 'start';
        primary.textContent = attending ? 'Concluir' : 'Atender';

        const remove = document.createElement('button');
        remove.dataset.action = 'remove';
        remove.textContent = 'Remover';

        caseLeft.append(primary, remove);
        card.append(caseRight, caseLeft);

        return card;
    }

    /**
     * Desenha os cartões de uma categoria dentro de uma seção da tela
     * @param {string} sectionId o identificador da seção da categoria
     * @param {Array<object>} tickets os tickets que pertencem à categoria
     * @param {boolean} attending `true` se os cartões estão na coluna de atendimento
     */
    function renderCategory(sectionId, tickets, attending) {
        const section = document.getElementById(sectionId);
        const cases = section.querySelector('.cases');

        cases.replaceChildren(...tickets.map(ticket => createCase(ticket, attending)));
        section.hidden = tickets.length === 0;
    }

    /**
     * Desenha a fila de espera e a coluna de atendimento na tela
     */
    function render() {
        const waiting = triage.waiting();
        const attending = triage.attending();

        categories.forEach(category => {
            renderCategory(
                category.id,
                waiting.filter(ticket => ticket.patient.severity === category.severity),
                false
            );
            renderCategory(
                `attending-${category.id}`,
                attending.filter(ticket => ticket.patient.severity === category.severity),
                true
            );
        });

        document.getElementById('queue-empty').hidden = waiting.length > 0;
        document.getElementById('attending-empty').hidden = attending.length > 0;
    }

    /**
     * Abre o diálogo de novo diagnóstico e salva o ticket na fila
     */
    async function createTicket() {
        const ticket = await triage.create({
            severityLabels: categories.map(category => category.label)
        });

        if (ticket) {
            render();
        }
    }

    /**
     * Executa a ação de um botão da fila
     * @param {string} uid    o identificador do ticket do cartão
     * @param {string} action a ação pedida (`start`, `finish` ou `remove`)
     */
    async function handleAction(uid, action) {
        const ticket = triage.get(uid);

        if (!ticket) {
            return;
        }

        if (action === 'start') {
            triage.start(uid);
        }

        if (action === 'finish') {
            triage.finish(uid);
        }

        if (action === 'remove') {
            const confirmed = await dialog.showFile('dialog/confirm.dialog.html', {
                title: 'Remover paciente',
                content: `<label>Remover <strong>${cleanUp(ticket.patient.name || 'sem nome')}</strong> da fila de atendimento?</label>`,
                yesText: 'Remover',
                noText: 'Cancelar'
            });

            if (!confirmed) {
                return;
            }

            triage.remove(uid);
        }

        render();
    }

    /**
     * Permite arrastar os cartões da fila de espera para a coluna de atendimento
     */
    function initDragAndDrop() {
        const attendingArea = document.querySelector('main > .right');

        document.addEventListener('dragstart', event => {
            const card = event.target.closest?.('.case');

            if (!card || !card.draggable) {
                return;
            }

            event.dataTransfer.setData('application/x-triage-ticket', card.dataset.uid);
            event.dataTransfer.effectAllowed = 'move';
            card.classList.add('dragging');
        });

        document.addEventListener('dragend', () => {
            document.querySelectorAll('.case.dragging').forEach(card => card.classList.remove('dragging'));
            attendingArea.classList.remove('drag-over');
        });

        attendingArea.addEventListener('dragover', event => {
            if (!event.dataTransfer.types.includes('application/x-triage-ticket')) {
                return;
            }

            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            attendingArea.classList.add('drag-over');
        });

        attendingArea.addEventListener('dragleave', event => {
            if (!attendingArea.contains(event.relatedTarget)) {
                attendingArea.classList.remove('drag-over');
            }
        });

        attendingArea.addEventListener('drop', event => {
            event.preventDefault();
            attendingArea.classList.remove('drag-over');

            const uid = event.dataTransfer.getData('application/x-triage-ticket');
            const ticket = triage.get(uid);

            if (!ticket || ticket.attend.status !== triage.status.waiting) {
                return;
            }

            triage.start(uid);
            render();
        });
    }

    /**
     * Liga os botões da tela e desenha a fila pela primeira vez
     */
    function init() {
        document.getElementById('add-new').addEventListener('click', createTicket);

        initDragAndDrop();

        document.querySelector('main').addEventListener('click', event => {
            const button = event.target.closest('button[data-action]');
            const card = button?.closest('.case');

            if (card) {
                handleAction(card.dataset.uid, button.dataset.action);
            }
        });

        render();
    }

    return {
        categories,
        severityLabel,
        render,
        createTicket,
        init
    };
})();