import { triage } from './triage.js';
import { ui } from './ui.js';

/**
 * # Demo
 * Modo de demonstração usado na apresentação do projeto.
 *
 * Enquanto estiver ativo, adiciona botões ao cabeçalho para criar diagnósticos
 * aleatórios, iniciar e concluir atendimentos, limpar a fila e ligar um modo
 * automático que executa essas ações em intervalos de 0.5 a 5 segundos.
 *
 * Uso pelo console do navegador:
 * ```
 * demo.initDemo();  // mostra os controles
 * demo.stopDemo();  // esconde os controles e para o modo automático
 * ```
 */
class Demo {
    constructor() {
        /**
         * Quantidade máxima de pacientes em atendimento ao mesmo tempo
         * @type {number}
         */
        this.maxAttending = 5;

        /**
         * Intervalo mínimo e máximo, em milissegundos, entre as ações automáticas
         * @type {[number, number]}
         */
        this.autoDelayRange = [500, 5000];

        /**
         * Aging: a cada quantos milissegundos de espera o paciente "sobe"
         * um nível de gravidade efetiva. Assim, casos leves que esperam muito
         * acabam ultrapassando os mais graves e são atendidos, exceto emergências,
         * que sempre têm prioridade sobre as demais gravidades.
         * @type {number}
         */
        this.agingInterval = 1000;

        /**
         * Tempo de atendimento por gravidade, em milissegundos [mínimo, máximo].
         * Quanto maior a gravidade, mais demorado é concluir o atendimento.
         * @type {Object<number, [number, number]>}
         */
        this.serviceDurations = {
            1: [3000, 8000],
            2: [6000, 14000],
            3: [12000, 25000],
            4: [20000, 40000],
            5: [35000, 60000]
        };

        /**
         * Pacientes em atendimento controlados pela demo: uid -> início e duração sorteada
         * @type {Map<string, {startedAt: number, duration: number}>}
         */
        this.services = new Map();

        /** @type {boolean} se os controles de demonstração estão visíveis */
        this.enabled = false;

        /** @type {boolean} se o modo automático está em execução */
        this.autoRunning = false;

        /** @type {number|null} identificador do próximo passo automático */
        this.autoTimer = null;

        /** @type {HTMLElement|null} container dos botões de demonstração */
        this.controls = null;

        /** @type {object|null} botões de demonstração, para atualizar os estados */
        this.buttons = null;

        /** @type {Array<string>} nomes usados nos pacientes aleatórios */
        this.firstNames = [
            'Ana', 'Bruno', 'Carla', 'Daniel', 'Eduarda', 'Felipe', 'Gabriela',
            'Henrique', 'Isabela', 'João', 'Larissa', 'Marcos', 'Natália',
            'Otávio', 'Patrícia', 'Rafael', 'Sofia', 'Thiago', 'Vitória', 'Wesley'
        ];

        /** @type {Array<string>} sobrenomes usados nos pacientes aleatórios */
        this.lastNames = [
            'Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa',
            'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araújo', 'Fernandes',
            'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Ribeiro', 'Alves',
            'Monteiro', 'Barbosa'
        ];

        /** @type {Array<string>} apelidos de colegas da turma, deve haver uma pequena chance desses nomes serem selecionados no lugar de nome normal */
        this.easterEggNames = [
            'Pudimzão', 'Gordalisson', 'Gordiga', 'Gordelicia', '67', 'Xixa',
            'Resenha', 'Eneias', 'Borracheiro', 'Cearense', 'Padeiro',
            'Vinicius Videos Curtos', 'Binotto', 'Chitolina',
            'Por Agua a Baixo', 'Freddie Mercury', 'Chilas', 'Lumi', 'Tonas',
            'Sananduva', 'Bequilava', 'Geremias', 'Neilove', 'Marcos Lucas', 'Malamar'
        ];

        /**
         * Faixas de idade, peso e altura comuns em adultos
         * @type {object}
         */
        this.ageRange = [18, 90];
        this.weightRange = [45, 120];
        this.heightRange = [150, 198];

        /**
         * Dados de cada nível de gravidade: faixas de sinais vitais e sintomas.
         * Quanto maior a gravidade, mais alterados tendem a ficar os sinais.
         * @type {object}
         */
        this.severityProfiles = {
            1: {
                temperature: [36.0, 37.2],
                heartRate: [55, 90],
                pressure: [
                    { systolic: [100, 130], diastolic: [60, 85] }
                ],
                symptoms: [
                    'coriza', 'espirros', 'tosse seca', 'dor de garganta leve',
                    'dor de cabeça leve', 'mal-estar', 'febre baixa',
                    'coceira nos olhos', 'dor muscular leve', 'cansaço',
                    'congestão nasal', 'arranhão na pele'
                ]
            },
            2: {
                temperature: [36.5, 38.0],
                heartRate: [65, 105],
                pressure: [
                    { systolic: [105, 140], diastolic: [65, 90] }
                ],
                symptoms: [
                    'febre', 'tosse persistente', 'dor de cabeça', 'dor abdominal',
                    'náusea', 'vômito', 'diarreia', 'dor nas costas', 'tontura',
                    'falta de apetite', 'dor de ouvido', 'irritação na pele'
                ]
            },
            3: {
                temperature: [37.0, 39.0],
                heartRate: [80, 120],
                pressure: [
                    { systolic: [115, 150], diastolic: [70, 95] },
                    { systolic: [150, 170], diastolic: [95, 105] }
                ],
                symptoms: [
                    'febre alta', 'dor no peito', 'falta de ar', 'vômito frequente',
                    'desmaio', 'pressão alta', 'dor intensa', 'confusão mental',
                    'batimentos acelerados', 'sangramento leve', 'desidratação',
                    'dor ao urinar'
                ]
            },
            4: {
                temperature: [37.8, 40.2],
                heartRate: [100, 150],
                pressure: [
                    { systolic: [80, 100], diastolic: [50, 65] },
                    { systolic: [160, 190], diastolic: [100, 115] }
                ],
                symptoms: [
                    'dificuldade para respirar', 'dor no peito intensa',
                    'saturação baixa', 'convulsão', 'desmaio prolongado',
                    'sangramento intenso', 'rigidez na nuca', 'fala arrastada',
                    'febre muito alta', 'pressão muito baixa',
                    'frequência cardíaca muito alta', 'confusão mental grave'
                ]
            },
            5: {
                temperature: [38.0, 41.0],
                heartRate: [110, 170],
                pressure: [
                    { systolic: [60, 85], diastolic: [35, 55] },
                    { systolic: [180, 210], diastolic: [110, 125] }
                ],
                symptoms: [
                    'parada cardiorrespiratória', 'choque', 'hemorragia grave',
                    'trauma craniano', 'falta de ar grave', 'convulsão prolongada',
                    'inconsciência', 'queimadura grave', 'infarto',
                    'saturação crítica', 'pressão arterial impalpável',
                    'parada respiratória'
                ]
            }
        };
    }
    
    /**
     * Sorteia um nome completo aleatório, com pequena chance de ser um apelido da turma
     * @returns {string} o nome sorteado
     */
    randomName() {
        if (Math.random() < 0.1) {
            return this.pick(this.easterEggNames);
        }

        return `${this.pick(this.firstNames)} ${this.pick(this.lastNames)}`;
    }

    /**
     * Sorteia um número inteiro entre dois valores, incluindo as pontas
     * @param {number} min valor mínimo
     * @param {number} max valor máximo
     * @returns {number} o número sorteado
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Sorteia um número decimal entre dois valores
     * @param {number} min valor mínimo
     * @param {number} max valor máximo
     * @param {number} decimals quantidade de casas decimais
     * @returns {number} o número sorteado
     */
    randomFloat(min, max, decimals = 1) {
        return Number((Math.random() * (max - min) + min).toFixed(decimals));
    }

    /**
     * Sorteia um item de uma lista
     * @param {Array} items a lista de onde o item será escolhido
     * @returns {*} o item sorteado
     */
    pick(items) {
        return items[Math.floor(Math.random() * items.length)];
    }

    /**
     * Sorteia itens distintos de uma lista, sem repetir
     * @param {Array} items a lista de onde os itens serão escolhidos
     * @param {number} count quantos itens devem ser sorteados
     * @returns {Array} os itens sorteados
     */
    sample(items, count) {
        const pool = [...items];
        const picked = [];
        const wanted = Math.min(count, pool.length);

        while (picked.length < wanted) {
            const index = Math.floor(Math.random() * pool.length);
            picked.push(pool.splice(index, 1)[0]);
        }

        return picked;
    }

    /**
     * Monta um ticket aleatório, com sinais vitais e sintomas coerentes com a gravidade
     * @returns {object} o ticket pronto para ser salvo pela triagem
     */
    randomTicket() {
        const severity = this.randomInt(1, 5);
        const profile = this.severityProfiles[severity];
        const pressure = this.pick(profile.pressure);

        return {
            patient: {
                name: this.randomName(),
                age: this.randomInt(...this.ageRange),
                weight: this.randomFloat(...this.weightRange, 1),
                height: this.randomInt(...this.heightRange),
                pressure: `${this.randomInt(...pressure.systolic)}/${this.randomInt(...pressure.diastolic)}`,
                heartRate: this.randomInt(...profile.heartRate),
                temperature: this.randomFloat(...profile.temperature, 1),
                symptoms: this.sample(profile.symptoms, this.randomInt(1, 5)),
                severity
            },
            attend: {
                arrivedAt: Date.now(),
                status: triage.status.waiting,
                slicesUsed: 0,
                lastServedAt: null
            }
        };
    }

    /**
     * Cria e salva um diagnóstico aleatório na fila de espera
     * @returns {object} o ticket salvo
     */
    addRandom() {
        const ticket = triage.add(this.randomTicket());

        ui.render();
        this.updateControls();

        console.log(`%c Demo: paciente ${ticket.patient.name} (gravidade ${ticket.patient.severity}) foi adicionado`, 'font-size: large');

        return ticket;
    }

    /**
     * Calcula a gravidade efetiva de um ticket na fila: a gravidade real mais
     * um nível a cada `agingInterval` de espera (aging)
     * @param {object} ticket ticket em espera
     * @param {number} now instante atual, em milissegundos
     * @returns {number} a gravidade efetiva
     */
    effectiveSeverity(ticket, now = Date.now()) {
        const waited = Math.max(0, now - ticket.attend.arrivedAt);
        return ticket.patient.severity + waited / this.agingInterval;
    }

    /**
     * Escolhe, de forma determinística, o próximo ticket a ser atendido:
     * emergências (gravidade 5) têm prioridade absoluta. Entre as demais
     * gravidades, vence a maior gravidade efetiva (gravidade + aging).
     * Entre emergências ou em caso de empate, vence quem chegou primeiro.
     * @param {Array<object>} tickets tickets em espera
     * @returns {object} o ticket escolhido
     */
    pickNext(tickets) {
        const now = Date.now();

        return tickets.reduce((best, ticket) => {
            const isEmergency = ticket.patient.severity === 5;
            const bestIsEmergency = best.patient.severity === 5;

            if (isEmergency !== bestIsEmergency) {
                return isEmergency ? ticket : best;
            }

            const diff = this.effectiveSeverity(ticket, now) - this.effectiveSeverity(best, now);

            if (diff > 0 || (diff === 0 && ticket.attend.arrivedAt < best.attend.arrivedAt)) {
                return ticket;
            }

            return best;
        });
    }

    /**
     * Registra o início de um atendimento e sorteia sua duração conforme a gravidade
     * @param {object} ticket ticket em atendimento
     */
    trackService(ticket) {
        const [min, max] = this.serviceDurations[ticket.patient.severity];

        this.services.set(ticket.uid, {
            startedAt: Date.now(),
            duration: this.randomInt(min, max)
        });
    }

    /**
     * Informa se o atendimento já durou o suficiente para ser concluído.
     * Atendimentos iniciados fora da demo passam a ser contados a partir de agora.
     * @param {object} ticket ticket em atendimento
     * @returns {boolean} `true` se já pode ser concluído
     */
    isServiceDone(ticket) {
        if (!this.services.has(ticket.uid)) {
            this.trackService(ticket);
        }

        const service = this.services.get(ticket.uid);

        return Date.now() - service.startedAt >= service.duration;
    }

    /**
     * Coloca em atendimento o próximo paciente da fila, por prioridade de
     * gravidade com aging, respeitando o limite de atendimentos simultâneos
     * @returns {object|null} o ticket atualizado, ou `null` se não for possível atender
     */
    attendNext() {
        const waiting = triage.waiting();
        const attending = triage.attending();

        if (waiting.length === 0 || attending.length >= this.maxAttending) {
            this.updateControls();
            return null;
        }

        const ticket = triage.start(this.pickNext(waiting).uid);

        this.trackService(ticket);

        ui.render();
        this.updateControls();

        console.log(`%c Demo: paciente ${ticket.patient.name} (gravidade ${ticket.patient.severity}) começou atendimento`, 'font-size: large');

        return ticket;
    }

    /**
     * Conclui o atendimento de um paciente
     * @param {boolean} onlyReady se `true`, só conclui quem já cumpriu o tempo de
     * atendimento da sua gravidade (modo automático); se `false`, sorteia qualquer
     * um em atendimento (botão manual)
     * @returns {object|null} o ticket atualizado, ou `null` se não houver ninguém para concluir
     */
    finishRandom(onlyReady = false) {
        let candidates = triage.attending();

        if (onlyReady) {
            candidates = candidates.filter(ticket => this.isServiceDone(ticket));
        }

        if (candidates.length === 0) {
            this.updateControls();
            return null;
        }

        const ticket = triage.finish(this.pick(candidates).uid);

        this.services.delete(ticket.uid);

        ui.render();
        this.updateControls();

        console.log(`%c Demo: paciente ${ticket.patient.name} (gravidade ${ticket.patient.severity}) concluiu atendimento`, 'font-size: large');

        return ticket;
    }

    /**
     * Remove todos os tickets salvos e atualiza a tela
     */
    clearAll() {
        triage.clear();
        this.services.clear();

        ui.render();
        this.updateControls();
    }

    /**
     * Executa uma ação aleatória do modo automático
     */
    runAutomaticAction() {
        const waiting = triage.waiting();
        const attending = triage.attending();
        const total = waiting.length + attending.length;

        // de tempos em tempos limpa a demonstração para ela não crescer sem limite
        // (limite maior que antes: com atendimentos mais longos a fila precisa
        // de espaço para o aging dos casos leves aparecer)
        if (total >= 25 && Math.random() < 0.15) {
            this.clearAll();
            console.log('%c Demo: fila limpa automaticamente para evitar crescimento sem limite', 'font-size: large');
            return;
        }

        // só conclui quem já cumpriu o tempo de atendimento da sua gravidade
        if (attending.length > 0 && Math.random() < 0.5 && this.finishRandom(true)) {
            return;
        }

        if (waiting.length > 0 && attending.length < this.maxAttending && Math.random() < 0.7) {
            this.attendNext();
            return;
        }

        this.addRandom();
    }

    /**
     * Agenda o próximo passo do modo automático em um intervalo de 1 a 10 segundos
     */
    scheduleNextAction() {
        clearTimeout(this.autoTimer);

        if (!this.autoRunning) {
            return;
        }

        const delay = this.randomInt(...this.autoDelayRange);
        this.autoTimer = setTimeout(() => {
            if (!this.autoRunning) {
                return;
            }

            this.runAutomaticAction();
            this.scheduleNextAction();
        }, delay);
    }

    /**
     * Liga o modo automático
     */
    startAuto() {
        if (this.autoRunning) {
            return;
        }

        this.autoRunning = true;
        this.updateControls();
        this.runAutomaticAction();
        this.scheduleNextAction();
    }

    /**
     * Desliga o modo automático
     */
    stopAuto() {
        this.autoRunning = false;
        clearTimeout(this.autoTimer);
        this.autoTimer = null;
        this.updateControls();
    }

    /**
     * Alterna o modo automático
     */
    toggleAuto() {
        if (this.autoRunning) {
            this.stopAuto();
        } else {
            this.startAuto();
        }
    }

    /**
     * Cria um botão do painel de demonstração
     * @param {string} label texto do botão
     * @param {Function} onClick ação executada ao clicar
     * @returns {HTMLButtonElement} o botão criado
     */
    createButton(label, onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', onClick);
        return button;
    }

    /**
     * Cria os botões de demonstração no cabeçalho
     * @param {HTMLElement} container elemento que receberá os botões
     */
    mountControls(container) {
        const controls = document.createElement('div');
        controls.className = 'demo-controls';

        this.buttons = {
            add:    this.createButton('Diagnóstico aleatório', () => this.addRandom()),
            attend: this.createButton('Atender próximo', () => this.attendNext()),
            finish: this.createButton('Concluir aleatório', () => this.finishRandom()),
            clear:  this.createButton('Limpar', () => this.clearAll()),
            auto:   this.createButton('Automático: desligado', () => this.toggleAuto())
        };

        controls.append(...Object.values(this.buttons));
        container.append(controls);
        this.controls = controls;
    }

    /**
     * Atualiza os estados dos botões conforme a fila e o modo automático
     */
    updateControls() {
        if (!this.buttons) {
            return;
        }

        const waiting = triage.waiting();
        const attending = triage.attending();
        const total = triage.all().length;

        this.buttons.attend.disabled = waiting.length === 0 || attending.length >= this.maxAttending;
        this.buttons.finish.disabled = attending.length === 0;
        this.buttons.clear.disabled = total === 0;
        this.buttons.auto.textContent = this.autoRunning ? 'Automático: ligado' : 'Automático: desligado';
        this.buttons.auto.classList.toggle('active', this.autoRunning);
        this.buttons.auto.setAttribute('aria-pressed', String(this.autoRunning));
    }

    /**
     * Inicia a demonstração, exibindo os botões no cabeçalho
     */
    initDemo() {
        if (this.enabled) {
            return;
        }

        const headerRight = document.querySelector('header .right');

        if (!headerRight) {
            return;
        }

        this.enabled = true;
        this.mountControls(headerRight);
        this.updateControls();
    }

    /**
     * Para a demonstração, removendo os botões e desligando o modo automático
     */
    stopDemo() {
        if (!this.enabled) {
            return;
        }

        this.stopAuto();
        this.enabled = false;
        this.controls?.remove();
        this.controls = null;
        this.buttons = null;
    }
}

export const demo = new Demo();