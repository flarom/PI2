/**
 * # Shortcut
 * Gerenciador de atalhos de teclado globais, com combinações diferentes para
 * PC (Windows/Linux) e macOS.
 *
 * Uso:
 * ```
 * shortcut.add(
 *     () => console.log('Novo diagnóstico'),
 *     ['ctrl', 'shift', 'n'],
 *     ['cmd', 'shift', 'n']
 * );
 * ```
 *
 * Cada item do array representa uma tecla pressionada ao mesmo tempo. Também
 * é possível informar a combinação como texto: `'ctrl+shift+n'`.
 *
 * O retorno de `shortcut.add` é uma função que remove o atalho registrado.
 */

const isMacPlatform = detectMacPlatform();

const MODIFIER_FLAGS = {
    ctrl: 'ctrlKey',
    alt: 'altKey',
    shift: 'shiftKey',
    meta: 'metaKey'
};

const MODIFIER_ALIASES = new Map([
    ['ctrl', 'ctrl'],
    ['control', 'ctrl'],
    ['ctl', 'ctrl'],
    ['alt', 'alt'],
    ['option', 'alt'],
    ['opt', 'alt'],
    ['shift', 'shift'],
    ['meta', 'meta'],
    ['cmd', 'meta'],
    ['command', 'meta'],
    ['win', 'meta'],
    ['windows', 'meta'],
    ['super', 'meta'],
    ['os', 'meta'],
]);

const KEY_ALIASES = new Map([
    ['esc', { key: 'escape' }],
    ['escape', { key: 'escape' }],
    ['return', { key: 'enter' }],
    ['enter', { key: 'enter' }],
    ['space', { key: 'space', code: 'Space' }],
    ['spacebar', { key: 'space', code: 'Space' }],
    ['del', { key: 'delete' }],
    ['delete', { key: 'delete' }],
    ['ins', { key: 'insert' }],
    ['insert', { key: 'insert' }],
    ['pgup', { key: 'pageup' }],
    ['pageup', { key: 'pageup' }],
    ['pgdn', { key: 'pagedown' }],
    ['pagedown', { key: 'pagedown' }],
    ['up', { key: 'arrowup' }],
    ['arrowup', { key: 'arrowup' }],
    ['down', { key: 'arrowdown' }],
    ['arrowdown', { key: 'arrowdown' }],
    ['left', { key: 'arrowleft' }],
    ['arrowleft', { key: 'arrowleft' }],
    ['right', { key: 'arrowright' }],
    ['arrowright', { key: 'arrowright' }],
    ['comma', { key: ',', code: 'Comma' }],
    ['period', { key: '.', code: 'Period' }],
    ['dot', { key: '.', code: 'Period' }],
    ['slash', { key: '/', code: 'Slash' }],
    ['backslash', { key: '\\', code: 'Backslash' }],
    ['semicolon', { key: ';', code: 'Semicolon' }],
    ['quote', { key: "'", code: 'Quote' }],
    ['apostrophe', { key: "'", code: 'Quote' }],
    ['backtick', { key: '`', code: 'Backquote' }],
    ['grave', { key: '`', code: 'Backquote' }],
    ['minus', { key: '-', code: 'Minus' }],
    ['dash', { key: '-', code: 'Minus' }],
    ['equal', { key: '=', code: 'Equal' }],
    ['equals', { key: '=', code: 'Equal' }],
    ['plus', { key: '+', code: 'Equal' }],
    ['openbracket', { key: '[', code: 'BracketLeft' }],
    ['bracketleft', { key: '[', code: 'BracketLeft' }],
    ['closebracket', { key: ']', code: 'BracketRight' }],
    ['bracketright', { key: ']', code: 'BracketRight' }]
]);

const CHARACTER_CODES = new Map([
    [',', 'Comma'],
    ['.', 'Period'],
    ['/', 'Slash'],
    ['\\', 'Backslash'],
    [';', 'Semicolon'],
    ["'", 'Quote'],
    ['`', 'Backquote'],
    ['-', 'Minus'],
    ['=', 'Equal'],
    ['[', 'BracketLeft'],
    [']', 'BracketRight'],
    ['!', 'Digit1'],
    ['@', 'Digit2'],
    ['#', 'Digit3'],
    ['$', 'Digit4'],
    ['%', 'Digit5'],
    ['^', 'Digit6'],
    ['&', 'Digit7'],
    ['*', 'Digit8'],
    ['(', 'Digit9'],
    [')', 'Digit0'],
    ['_', 'Minus'],
    ['+', 'Equal'],
    ['{', 'BracketLeft'],
    ['}', 'BracketRight'],
    ['|', 'Backslash'],
    [':', 'Semicolon'],
    ['"', 'Quote'],
    ['<', 'Comma'],
    ['>', 'Period'],
    ['?', 'Slash'],
    ['~', 'Backquote']
]);

const DEFAULT_OPTIONS = Object.freeze({
    preventDefault: true,
    stopPropagation: false,
    allowInInput: true,
    allowRepeat: false,
    when: null
});

const registrations = [];
let enabled = true;
let listening = false;

/**
 * Identifica se a plataforma atual é macOS (incluindo iPadOS, que se apresenta
 * como Mac em alguns navegadores).
 * @returns {boolean}
 */
function detectMacPlatform() {
    if (typeof navigator === 'undefined') {
        return false;
    }

    const platform = navigator.userAgentData?.platform || navigator.platform || '';
    const userAgent = navigator.userAgent || '';

    return /mac|iphone|ipad|ipod/i.test(platform) ||
        /macintosh|mac os x|iphone|ipad|ipod/i.test(userAgent);
}

/**
 * Remove espaços e normaliza o nome de uma tecla para comparar com `event.key`.
 * @param {string} key valor de `KeyboardEvent.key`
 * @returns {string} nome normalizado
 */
function normalizeEventKey(key) {
    if (key === ' ' || key === 'Spacebar') {
        return 'space';
    }

    const normalized = String(key || '').toLowerCase();
    const alias = KEY_ALIASES.get(normalized);

    return alias ? alias.key : normalized;
}

/**
 * Transforma o texto de uma tecla em uma descrição comparável com o evento.
 * @param {string} rawToken tecla informada no atalho
 * @returns {{key: string, code?: string}}
 */
function parseKeyToken(rawToken) {
    if (rawToken === ' ') {
        return { key: 'space', code: 'Space' };
    }

    if (typeof rawToken !== 'string') {
        throw new TypeError('[shortcut] Cada tecla da combinação deve ser um texto.');
    }

    const normalized = rawToken.trim().toLowerCase().replace(/\s+/g, '');

    if (!normalized) {
        throw new Error('[shortcut] A combinação contém uma tecla vazia.');
    }

    const alias = KEY_ALIASES.get(normalized);

    if (alias) {
        return { ...alias };
    }

    if (normalized.length === 1) {
        const code = /^[0-9]$/.test(normalized)
            ? `Digit${normalized}`
            : CHARACTER_CODES.get(normalized) || null;

        return code ? { key: normalized, code } : { key: normalized };
    }

    return { key: normalized };
}

/**
 * Converte uma combinação em uma lista de modificadores e uma tecla principal.
 * @param {string|string[]} value combinação informada
 * @param {boolean} macLayout se os nomes `cmd`, `option` e `mod` devem seguir o padrão do macOS
 * @returns {{modifiers: Set<string>, key: {key: string, code?: string}}}
 */
function parseChord(value, macLayout) {
    if (value == null) {
        throw new TypeError('[shortcut] Informe a combinação de teclas para PC e macOS.');
    }

    let tokens;

    if (Array.isArray(value)) {
        tokens = value;
    } else if (typeof value === 'string') {
        tokens = value.split('+');
    } else {
        throw new TypeError('[shortcut] A combinação deve ser um texto ou um array de teclas.');
    }

    if (tokens.length === 0) {
        throw new Error('[shortcut] A combinação não pode estar vazia.');
    }

    const modifiers = new Set();
    let key = null;

    tokens.forEach((rawToken) => {
        const token = typeof rawToken === 'string'
            ? rawToken.trim().toLowerCase().replace(/\s+/g, '')
            : rawToken;
        const modifier = token === 'mod'
            ? (macLayout ? 'meta' : 'ctrl')
            : MODIFIER_ALIASES.get(token);

        if (modifier) {
            modifiers.add(modifier);
            return;
        }

        if (key) {
            throw new Error('[shortcut] Use apenas uma tecla principal; as demais devem ser modificadores.');
        }

        key = parseKeyToken(rawToken);
    });

    if (!key) {
        throw new Error('[shortcut] A combinação precisa ter uma tecla além dos modificadores.');
    }

    return { modifiers, key };
}

/**
 * Verifica se a tecla do evento corresponde à tecla esperada. O `code` serve de
 * apoio para teclas que mudam de caractere com Shift (por exemplo, `1` e `!`).
 * @param {{key: string, code?: string}} expected tecla esperada
 * @param {KeyboardEvent} event evento de teclado
 * @returns {boolean}
 */
function matchesKey(expected, event) {
    if (normalizeEventKey(event.key) === expected.key) {
        return true;
    }

    return Boolean(expected.code && event.code === expected.code);
}

/**
 * Verifica modificadores e tecla principal de uma combinação.
 * @param {{modifiers: Set<string>, key: {key: string, code?: string}}} chord combinação esperada
 * @param {KeyboardEvent} event evento de teclado
 * @returns {boolean}
 */
function matchesChord(chord, event) {
    for (const [modifier, flag] of Object.entries(MODIFIER_FLAGS)) {
        if (Boolean(event[flag]) !== chord.modifiers.has(modifier)) {
            return false;
        }
    }

    return matchesKey(chord.key, event);
}

/**
 * Indica se o evento ocorreu dentro de um campo de digitação.
 * @param {EventTarget|null} target alvo do evento
 * @returns {boolean}
 */
function isEditableTarget(target) {
    if (typeof Element === 'undefined' || !(target instanceof Element)) {
        return false;
    }

    return target.isContentEditable ||
        Boolean(target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'));
}

/**
 * Valida e completa as opções de um atalho.
 * @param {object|null} options opções informadas
 * @returns {object} opções completas
 */
function normalizeOptions(options) {
    if (options == null) {
        return { ...DEFAULT_OPTIONS };
    }

    if (typeof options !== 'object' || Array.isArray(options)) {
        throw new TypeError('[shortcut] As opções devem ser um objeto.');
    }

    if (options.when != null && typeof options.when !== 'function') {
        throw new TypeError('[shortcut] A opção `when` deve ser uma função.');
    }

    return {
        preventDefault: options.preventDefault == null
            ? DEFAULT_OPTIONS.preventDefault
            : Boolean(options.preventDefault),
        stopPropagation: options.stopPropagation == null
            ? DEFAULT_OPTIONS.stopPropagation
            : Boolean(options.stopPropagation),
        allowInInput: options.allowInInput == null
            ? DEFAULT_OPTIONS.allowInInput
            : Boolean(options.allowInInput),
        allowRepeat: options.allowRepeat == null
            ? DEFAULT_OPTIONS.allowRepeat
            : Boolean(options.allowRepeat),
        when: options.when ?? DEFAULT_OPTIONS.when
    };
}

/**
 * Remove um registro específico da lista.
 * @param {object} registration registro a remover
 * @returns {boolean}
 */
function removeRegistration(registration) {
    const index = registrations.indexOf(registration);

    if (index < 0) {
        return false;
    }

    registrations.splice(index, 1);
    return true;
}

/**
 * Trata o evento global de teclado e executa o primeiro atalho compatível.
 * @param {KeyboardEvent} event evento de teclado
 */
function handleKeyDown(event) {
    if (!enabled || event.defaultPrevented || event.isComposing || event.keyCode === 229) {
        return;
    }

    for (const registration of registrations) {
        const { chord, handler, options } = registration;

        if (!matchesChord(chord, event)) {
            continue;
        }

        if (options.when && !options.when(event)) {
            continue;
        }

        if (event.repeat && !options.allowRepeat) {
            continue;
        }

        if (!options.allowInInput && isEditableTarget(event.target)) {
            continue;
        }

        if (options.preventDefault) {
            event.preventDefault();
        }

        if (options.stopPropagation) {
            event.stopPropagation();
        }

        handler(event);
        return;
    }
}

/**
 * Instala o listener global uma única vez, quando o primeiro atalho é criado.
 */
function ensureListener() {
    if (listening || typeof document === 'undefined' || typeof document.addEventListener !== 'function') {
        return;
    }

    document.addEventListener('keydown', handleKeyDown, true);
    listening = true;
}

/**
 * Registra um atalho com combinações separadas para PC e macOS.
 *
 * @param {Function} handler função executada quando o atalho é pressionado
 * @param {string|string[]} pcChord combinação para Windows/Linux
 * @param {string|string[]} [macChord] combinação para macOS; se omitida, usa `pcChord`
 * @param {object} [options] opções do atalho
 * @param {boolean} [options.preventDefault=true] impede a ação padrão do navegador
 * @param {boolean} [options.stopPropagation=false] interrompe a propagação do evento
 * @param {boolean} [options.allowInInput=true] permite o atalho dentro de campos de texto
 * @param {boolean} [options.allowRepeat=false] permite disparos ao segurar a tecla
 * @param {Function|null} [options.when=null] condição extra; retorne `true` para permitir
 * @returns {Function} função que remove o atalho
 */
function add(handler, pcChord, macChord, options = null) {
    if (typeof handler !== 'function') {
        throw new TypeError('[shortcut] O primeiro argumento deve ser uma função.');
    }

    const pcSpec = parseChord(pcChord ?? macChord, false);
    const macSpec = parseChord(macChord ?? pcChord, true);

    const registration = {
        handler,
        chord: isMacPlatform ? macSpec : pcSpec,
        options: normalizeOptions(options)
    };

    registrations.push(registration);
    ensureListener();

    return () => removeRegistration(registration);
}

/**
 * Remove todos os atalhos registrados para uma função.
 * @param {Function} handler função usada no registro
 * @returns {boolean} `true` se algum atalho foi removido
 */
function remove(handler) {
    if (typeof handler !== 'function') {
        throw new TypeError('[shortcut] Informe a função cujo atalho deve ser removido.');
    }

    let removed = false;

    for (let index = registrations.length - 1; index >= 0; index -= 1) {
        if (registrations[index].handler === handler) {
            registrations.splice(index, 1);
            removed = true;
        }
    }

    return removed;
}

/**
 * Remove todos os atalhos registrados.
 * @returns {number} quantidade de atalhos removidos
 */
function removeAll() {
    const removed = registrations.length;
    registrations.length = 0;
    return removed;
}

/**
 * Liga novamente os atalhos após `shortcut.disable()`.
 */
function enable() {
    enabled = true;
}

/**
 * Desliga temporariamente todos os atalhos, sem removê-los.
 */
function disable() {
    enabled = false;
}

/**
 * Informa se os atalhos estão ativos.
 * @returns {boolean}
 */
function isEnabled() {
    return enabled;
}

export const shortcut = {
    add,
    remove,
    removeAll,
    enable,
    disable,
    isEnabled,
    isMac: isMacPlatform
};
