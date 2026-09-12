/**
 * # Dialog
 * Interface para a API de diálogos (portada do Cohesion), reduzida ao essencial.
 * 
 * Diálogos podem receber parâmetros e retornar valores. O conteúdo do diálogo
 * acessa os parâmetros e devolve o resultado através da ponte global:
 * - `window.dialogArgs()`        -> objeto de argumentos
 * - `window.dialogReturn(value)` -> fecha retornando `value`
 * - `window.dialogCancel(value)` -> fecha cancelando, retornando `value` (padrão null)
 */
export const dialog = (() => {
    const dialogControllerStack = [];

    function ensureDialogBridge() {
        if (window.__triagemDialogBridgeInstalled) {
            return;
        }

        const resolveTopDialog = (method, value) => {
            const controller = dialogControllerStack[dialogControllerStack.length - 1];
            if (controller && typeof controller[method] === "function") {
                controller[method](value);
                return true;
            }
            return false;
        };

        if (typeof window.dialogReturn !== "function") {
            window.dialogReturn = (value) => resolveTopDialog("return", value);
        }

        if (typeof window.dialogCancel !== "function") {
            window.dialogCancel = (value = null) => resolveTopDialog("cancel", value);
        }

        if (typeof window.dialogArgs !== "function") {
            window.dialogArgs = () => {
                const controller = dialogControllerStack[dialogControllerStack.length - 1];
                return controller ? controller.args : {};
            };
        }

        window.__triagemDialogBridgeInstalled = true;
    }

    function getDialogOverlay(dialogId = null) {
        if (typeof dialogId === "string" && dialogId.trim()) {
            const escapedId = typeof CSS !== "undefined" && typeof CSS.escape === "function"
                ? CSS.escape(dialogId)
                : dialogId;

            const byDataId = document.querySelector(`dialog.dialog-overlay[data-dialog-id="${escapedId}"]`);
            if (byDataId) {
                return byDataId;
            }

            const byElementId = document.getElementById(dialogId);
            if (byElementId && byElementId.matches("dialog.dialog-overlay")) {
                return byElementId;
            }

            return null;
        }

        const overlays = Array.from(document.querySelectorAll("dialog.dialog-overlay"));
        return overlays.length > 0 ? overlays[overlays.length - 1] : null;
    }

    /**
     * Exibe um diálogo a partir de uma string de conteúdo HTML
     * @param {string} html       o conteúdo HTML do diálogo
     * @param {object} args       os parâmetros que o diálogo recebe via `dialogArgs()`
     * @param {string} baseUrl    url base para resolver `link` e `script` relativos (opcional)
     * @returns uma promessa com o valor retornado pelo diálogo (ou null ao cancelar)
     */
    function show(html, args = {}, baseUrl = null) {
        ensureDialogBridge();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const dialogArgs = args && typeof args === "object" ? args : {};

        const getMeta = (name, fallback = null) => {
            const meta = doc.querySelector(`meta[name="${name}"]`);
            return meta ? meta.content : fallback;
        };

        const getMetaBool = (name, fallback = true) => {
            const value = getMeta(name);
            if (value === null) return fallback;
            return ["true", "1", "yes", "on"].includes(value.toLowerCase());
        };

        const getMetaInt = (name, fallback) => {
            const value = parseInt(getMeta(name), 10);
            return Number.isFinite(value) ? value : fallback;
        };

        const showCloseButton = getMetaBool("dialog-show-close-button", true);
        const useBigDialog = getMetaBool("dialog-big", false);
        const showAnimation = getMetaBool("dialog-animate", true);
        const showBg = getMetaBool("dialog-show-bg", true);
        const width = getMetaInt("dialog-prefered-width", getMetaInt("dialog-preferred-width", 400));
        const height = getMetaInt("dialog-prefered-height", getMetaInt("dialog-preferred-height", 0));

        const toolbarLeft = getMeta("dialog-toolbar-left", "");
        const toolbarCenter = getMeta("dialog-toolbar-center", "");
        const toolbarRight = getMeta("dialog-toolbar-right", "");
        const toolbarOverlay = getMetaBool("dialog-toolbar-overlay", true);

        // injeta os estilos declarados dentro do html do diálogo
        const dialogId = crypto.randomUUID();
        const injectedStyles = [];

        doc.querySelectorAll("style").forEach((style) => {
            const clone = document.createElement("style");
            clone.textContent = style.textContent;
            clone.dataset.dialogStyle = dialogId;
            document.head.appendChild(clone);
            injectedStyles.push(clone);
        });

        doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
            const clone = document.createElement("link");
            const href = link.getAttribute("href");
            clone.rel = "stylesheet";
            clone.href = href && baseUrl ? new URL(href, baseUrl).toString() : (href || "");
            clone.dataset.dialogStyle = dialogId;
            document.head.appendChild(clone);
            injectedStyles.push(clone);
        });

        const previousFocusedElement = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        const dialog = document.createElement("dialog");
        dialog.className = "dialog-overlay" + (showBg ? "" : " nobg");
        dialog.dataset.dialog = "";
        dialog.dataset.dialogId = dialogId;

        if (!useBigDialog) {
            dialog.style.maxWidth = `${width}px`;
            if (height > 0) {
                dialog.style.height = "100%";
                dialog.style.maxHeight = `${height}px`;
            }
        }

        if (!showAnimation) {
            dialog.classList.add("no-animation");
        }

        const toolbar = document.createElement("div");
        toolbar.className = "toolbar";
        if (!toolbarOverlay) {
            toolbar.classList.add("no-overlay");
        }

        const left = document.createElement("div");
        left.className = "toolbar-left";
        left.innerHTML = toolbarLeft;

        const center = document.createElement("div");
        center.className = "toolbar-center";
        center.innerHTML = toolbarCenter;

        const right = document.createElement("div");
        right.className = "toolbar-right";
        right.innerHTML = toolbarRight;

        const closeButton = document.createElement("button");
        closeButton.textContent = "close";
        closeButton.className = "icon dialog-window-control";

        if (showCloseButton) {
            right.appendChild(closeButton);
        }

        toolbar.append(left, center, right);

        const content = document.createElement("div");
        content.className = "dialog-content";
        content.append(...doc.body.childNodes);

        if (!useBigDialog) {
            content.style.maxWidth = `${width}px`;
            if (height > 0) {
                content.style.height = "100%";
                if (!toolbarOverlay) {
                    content.style.maxWidth = `calc(${width}px - 48px)`;
                } else {
                    content.style.maxHeight = `${height}px`;
                }
            }
        }

        dialog.append(toolbar, content);
        document.body.appendChild(dialog);

        return new Promise((resolve) => {
            const cleanup = () => {
                const idx = dialogControllerStack.indexOf(controller);
                if (idx >= 0) {
                    dialogControllerStack.splice(idx, 1);
                }

                injectedStyles.forEach((el) => el.remove());
                dialog.removeEventListener("close", onClose);
                dialog.remove();

                if (previousFocusedElement) {
                    previousFocusedElement.focus();
                }
            };

            const controller = {
                element: dialog,
                args: dialogArgs,
                return(value) {
                    dialog.__dialogResult = value;
                    if (dialog.open) {
                        dialog.close("return");
                    }
                },
                cancel(value = null) {
                    dialog.__dialogResult = value;
                    if (dialog.open) {
                        dialog.close("cancel");
                    }
                },
                close() {
                    if (dialog.open) {
                        dialog.close("close");
                    }
                }
            };

            const onClose = () => {
                const hasDialogResult = Object.prototype.hasOwnProperty.call(dialog, "__dialogResult");
                const result = hasDialogResult
                    ? dialog.__dialogResult
                    : dialog.returnValue && !["close", "cancel"].includes(dialog.returnValue)
                        ? dialog.returnValue
                        : null;

                cleanup();
                resolve(result);
            };

            dialogControllerStack.push(controller);

            // executa os <script> internos somente após o controller existir,
            // para que dialogArgs() consiga ler os dados de inicialização
            content.querySelectorAll("script").forEach((oldScript) => {
                const newScript = document.createElement("script");

                if (oldScript.src) {
                    const src = oldScript.getAttribute("src");
                    newScript.src = src && baseUrl ? new URL(src, baseUrl).toString() : (src || "");
                } else {
                    newScript.textContent = oldScript.textContent;
                }

                [...oldScript.attributes].forEach((attr) =>
                    newScript.setAttribute(attr.name, attr.value)
                );

                oldScript.replaceWith(newScript);
            });

            closeButton.addEventListener("click", () => controller.close());
            dialog.addEventListener("close", onClose, { once: true });

            if (typeof dialog.showModal === "function") {
                dialog.showModal();
            } else {
                dialog.setAttribute("open", "open");
            }

            const focusable = dialog.querySelector(
                "[autofocus], [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
            );

            if (focusable instanceof HTMLElement) {
                focusable.focus();
            }
        });
    }

    /**
     * Exibe um diálogo a partir de um arquivo HTML
     * @param {string} filePath caminho para o arquivo HTML do diálogo
     * @param {object} args     os parâmetros que o diálogo recebe via `dialogArgs()`
     * @returns uma promessa com o valor retornado pelo diálogo (ou null ao cancelar)
     */
    async function showFile(filePath, args = {}) {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Falha ao carregar o arquivo: ${response.statusText}`);
        }

        const htmlContent = await response.text();
        const sourceUrl = new URL(filePath, window.location.href);

        return await show(htmlContent, args, sourceUrl);
    }

    /**
     * Fecha um diálogo (o do topo por padrão), cancelando-o
     * @param {string} dialogId id do diálogo a ser fechado (opcional)
     * @returns true se o diálogo foi encontrado e fechado, false caso contrário
     */
    function hide(dialogId = null) {
        const overlay = getDialogOverlay(dialogId);
        if (!overlay) {
            return false;
        }

        const controller = dialogControllerStack.find((item) => item.element === overlay);
        if (controller) {
            controller.cancel();
        } else if (overlay.open) {
            overlay.close("close");
        }

        return true;
    }

    /**
     * Fecha todos os diálogos abertos
     */
    function hideAll() {
        while (dialogControllerStack.length > 0) {
            const controller = dialogControllerStack.pop();
            if (controller && typeof controller.cancel === "function") {
                controller.cancel();
            }
        }
    }

    return {
        show,
        showFile,
        hide,
        hideAll
    };
})();