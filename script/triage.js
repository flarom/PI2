import { storage } from './store.js';
import { dialog } from './dialog.js';

/**
 * # Triage
 * Gerência dos tickets (diagnósticos) da triagem.
 *
 * Os tickets são lidos e gravados em uma única chave do `storage`, já serializados
 * como JSON. Cada ticket segue o formato devolvido por `dialog/newTicket.dialog.html`:
 * ```
 * {
 *     uid: 'a1b2c3d4',
 *     patient: { name, age, weight, height, pressure, heartRate, temperature, symptoms: [], severity },
 *     attend:  { arrivedAt, status, slicesUsed, lastServedAt }
 * }
 * ```
 *
 * A gravidade (`severity`) é guardada apenas como um número de 1 a 5, sendo 5 o
 * caso mais grave (emergência) e 1 o menos grave (não urgente). Quem sabe
 * traduzir esse número para um texto, uma cor ou uma seção da tela é a interface,
 * que deve usar as categorias exibidas por `ui`.
 */
export const triage = (() => {
    const ticketsKey = 'tickets';
    const newTicketDialog = 'popover/dialog/newTicket.html';
    const maxSeverity = 5;

    /**
     * Situações possíveis de um ticket na fila
     */
    const status = {
        waiting: 0,
        attending: 1,
        done: 2
    };

    /**
     * Converte um valor para número, usando o `fallback` quando não dá para convertê-lo
     * @param {*} value    o valor a ser convertido
     * @param {number} fallback o número usado quando o valor é nulo ou inválido
     */
    function toNumber(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    /**
     * Limita um valor de gravidade ao intervalo válido de 1 a 5
     * @param {*} value a gravidade informada
     * @returns {number} a gravidade arredondada e limitada
     */
    function toSeverity(value) {
        return Math.min(maxSeverity, Math.max(1, Math.round(toNumber(value, 3))));
    }

    /**
     * Gera um identificador hexadecimal de 8 dígitos para um ticket
     */
    function generateUid() {
        return Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0');
    }

    /**
     * Coloca um ticket no formato interno, preenchendo os campos ausentes
     * @param {object} ticket o ticket recebido do diálogo ou do chamador
     * @returns {object} uma cópia do ticket com todos os campos preenchidos
     */
    function normalize(ticket) {
        const source = ticket && typeof ticket === 'object' ? ticket : {};
        const patient = source.patient ?? {};
        const attend  = source.attend  ?? {};

        return {
            uid: source.uid ? String(source.uid) : generateUid(),
            patient: {
                name:        patient.name ?? '',
                age:         toNumber(patient.age, 0),
                weight:      toNumber(patient.weight, 0),
                height:      toNumber(patient.height, 0),
                pressure:    patient.pressure ?? '0/0',
                heartRate:   toNumber(patient.heartRate, 0),
                temperature: toNumber(patient.temperature, 0),
                symptoms:    Array.isArray(patient.symptoms) ? [...patient.symptoms] : [],
                severity:    toSeverity(patient.severity)
            },
            attend: {
                arrivedAt:    toNumber(attend.arrivedAt, Date.now()),
                status:       toNumber(attend.status, status.waiting),
                slicesUsed:   toNumber(attend.slicesUsed, 0),
                lastServedAt: attend.lastServedAt ?? null
            }
        };
    }

    /**
     * Lê todos os tickets salvos no storage
     * @returns {Array<object>} a lista de tickets guardada, ou uma lista vazia
     */
    function read() {
        const tickets = storage.get(ticketsKey, '[]');

        try {
            const parsed = JSON.parse(tickets);
            return Array.isArray(parsed) ? parsed.map(normalize) : [];
        } catch (error) {
            console.warn('Triage: fila inválida no storage, reiniciando', error);
            return [];
        }
    }

    /**
     * Grava a lista de tickets no storage
     * @param {Array<object>} tickets a lista de tickets a ser salva
     */
    function write(tickets) {
        storage.set(ticketsKey, JSON.stringify(tickets));
    }

    /**
     * Coloca o ticket mais prioritário da fila em primeiro lugar
     * @param {object} a primeiro ticket a ser comparado
     * @param {object} b segundo ticket a ser comparado
     */
    function byUrgency(a, b) {
        if (a.patient.severity !== b.patient.severity) {
            return b.patient.severity - a.patient.severity;
        }

        return a.attend.arrivedAt - b.attend.arrivedAt;
    }

    /**
     * Devolve uma cópia da fila de tickets
     * @returns {Array<object>} todos os tickets, do mais prioritário para o menos prioritário
     */
    function all() {
        return read().sort(byUrgency);
    }

    /**
     * Procura um ticket pelo identificador
     * @param {string} uid o identificador do ticket
     * @returns {object|null} o ticket encontrado, ou `null` caso não exista
     */
    function get(uid) {
        return read().find(ticket => ticket.uid === uid) ?? null;
    }

    /**
     * Salva um novo ticket na fila
     * @param {object} ticket o ticket a ser salvo, normalmente vindo do diálogo de novo diagnóstico
     * @returns {object} o ticket salvo, já normalizado
     */
    function add(ticket) {
        const tickets = read();
        const added = normalize(ticket);

        while (tickets.some(item => item.uid === added.uid)) {
            added.uid = generateUid();
        }

        write([...tickets, added]);

        return added;
    }

    /**
     * Altera os dados de um ticket já salvo
     * @param {string} uid    o identificador do ticket a ser alterado
     * @param {object} patch  os campos a substituir, aceitando os grupos `patient` e `attend`
     * @returns {object|null} o ticket alterado, ou `null` caso ele não exista
     */
    function update(uid, patch) {
        const tickets = read();
        const index = tickets.findIndex(ticket => ticket.uid === uid);

        if (index < 0) {
            return null;
        }

        const changes = patch && typeof patch === 'object' ? patch : {};
        const current = tickets[index];
        const merged = {
            ...current,
            ...changes,
            patient: { ...current.patient, ...changes.patient },
            attend:  { ...current.attend,  ...changes.attend  }
        };

        tickets[index] = normalize(merged);
        write(tickets);

        return tickets[index];
    }

    /**
     * Remove um ticket da fila
     * @param {string} uid o identificador do ticket a ser removido
     * @returns {boolean} `true` se o ticket existia e foi removido, `false` caso contrário
     */
    function remove(uid) {
        const tickets = read();
        const remaining = tickets.filter(ticket => ticket.uid !== uid);

        if (remaining.length === tickets.length) {
            return false;
        }

        write(remaining);

        return true;
    }

    /**
     * Remove todos os tickets da fila, sem alterar os outros dados do storage
     */
    function clear() {
        storage.remove(ticketsKey);
    }

    /**
     * Lista os tickets em uma determinada situação
     * @param {number} wantedStatus a situação desejada (`waiting`, `attending` ou `done`)
     * @returns {Array<object>} os tickets na situação informada
     */
    function byStatus(wantedStatus) {
        return all().filter(ticket => ticket.attend.status === wantedStatus);
    }

    /**
     * Lista os tickets que estão aguardando atendimento
     * @returns {Array<object>} os tickets da fila de espera
     */
    function waiting() {
        return byStatus(status.waiting);
    }

    /**
     * Lista os tickets que estão sendo atendidos
     * @returns {Array<object>} os tickets em atendimento
     */
    function attending() {
        return byStatus(status.attending);
    }

    /**
     * Devolve o próximo ticket a ser atendido
     * @returns {object|null} o ticket mais grave e mais antigo da fila, ou `null` se a fila estiver vazia
     */
    function next() {
        return waiting()[0] ?? null;
    }

    /**
     * Coloca um ticket da fila em atendimento
     * @param {string} uid o identificador do ticket
     * @returns {object|null} o ticket atualizado, ou `null` caso ele não exista
     */
    function start(uid) {
        return update(uid, { attend: { status: status.attending } });
    }

    /**
     * Encerra o atendimento de um ticket, tirando ele da fila
     * @param {string} uid o identificador do ticket
     * @returns {object|null} o ticket atualizado, ou `null` caso ele não exista
     */
    function finish(uid) {
        return update(uid, { attend: { status: status.done, lastServedAt: Date.now() } });
    }

    /**
     * Pede um novo diagnóstico ao usuário pelo diálogo de novo ticket
     * @param {object} args parâmetros repassados ao diálogo, como os nomes dos níveis de gravidade
     * @returns {Promise<object|null>} o ticket informado pelo usuário, ou `null` caso o diálogo seja cancelado
     */
    async function request(args = {}) {
        return await dialog.showFile(newTicketDialog, args) ?? null;
    }

    /**
     * Pede um novo diagnóstico ao usuário e já salva ele na fila
     * @param {object} args parâmetros repassados ao diálogo, como os nomes dos níveis de gravidade
     * @returns {Promise<object|null>} o ticket salvo, ou `null` caso o diálogo seja cancelado
     */
    async function create(args = {}) {
        const ticket = await request(args);

        return ticket ? add(ticket) : null;
    }

    return {
        status,
        all,
        get,
        add,
        update,
        remove,
        clear,
        waiting,
        attending,
        next,
        start,
        finish,
        request,
        create
    };
})();