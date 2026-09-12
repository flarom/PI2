/**
 * # Storage
 * Interface para API do `localStorage` do navegador.
 * 
 * @author César Augusto Bergamin
 */
export const storage = (() => {
    const storagePrefix = 'dev.flarom.triagem-medica.';

    /**
     * Salva um dado no localstorage com uma chave
     * @param {string} key a chave usada de nome do item salvo, pode ser usada para ler a informação mais tarde
     * @param {*} value    o valor que será salvo no storage
     */
    function set(key, value) {
        localStorage.setItem(storagePrefix + key, value);
    }

    /**
     * Lê um dado do localstorage a partir de uma chave
     * @param {string} key a chave que representa o valor a ser lido
     * @param {*} fallback um valor a ser usado, para caso do valor guardado na chave for nulo
     * @returns o valor encontrado na chave, caso nulo, o valor do fallback
     */
    function get(key, fallback) {
        const value = localStorage.getItem(storagePrefix + key);
        return value === null ? fallback : value;
    }

    /**
     * Remove um dado do localstorage
     * @param {string} key a chave que representa o dado a ser removido
     */
    function remove(key) {
        localStorage.removeItem(storagePrefix + key);
    }

    /**
     * Limpa o localstorage do website
     */
    function clear() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(storagePrefix)) {
                localStorage.removeItem(key);
            }
        });
    }

    return {
        set,
        get,
        remove,
        clear
    };
})();
