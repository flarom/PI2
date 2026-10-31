export const menu = (() => {
    const MENU_POSITIONS = new Set([
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
        "left",
        "right",
        "cursor"
    ]);

    // borda de segurança entre o menu e as extremidades do viewport
    const VIEWPORT_MARGIN = 5;
    const ANCHOR_GAP = 8;
    const SUBMENU_HOVER_DELAY = 250;
    const SUBMENU_CLOSE_DELAY = 500;

    /**
     * posições aceitas por `menu.open`.
     * As chaves com hífen exigem `menu.position["bottom-left"]`; as versões em
     * camelCase permitem `menu.position.bottomLeft`.
     */
    const position = Object.freeze({
        "top-left": "top-left",
        "top-right": "top-right",
        "bottom-left": "bottom-left",
        "bottom-right": "bottom-right",
        left: "left",
        right: "right",
        cursor: "cursor",
        topLeft: "top-left",
        topRight: "top-right",
        bottomLeft: "bottom-left",
        bottomRight: "bottom-right"
    });

    const menuStack = [];
    const controllers = new Map();

    let menuIdCounter = 0;
    let rootRequestToken = 0;
    let repositionFrame = null;
    let listenersInstalled = false;

    const pointer = {
        x: 0,
        y: 0,
        ready: false
    };

    function createMenuId() {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }

        menuIdCounter += 1;
        return `menu-${Date.now().toString(36)}-${menuIdCounter}`;
    }

    function isPosition(value) {
        return typeof value === "string" && MENU_POSITIONS.has(value);
    }

    function isPlainObject(value) {
        return Object.prototype.toString.call(value) === "[object Object]";
    }

    function getTopController() {
        return menuStack.length > 0 ? menuStack[menuStack.length - 1] : null;
    }

    function ensureMenuBridge() {
        if (window.__triagemMenuBridgeInstalled) {
            return;
        }

        if (typeof window.menuArgs !== "function") {
            window.menuArgs = () => {
                const controller = getTopController();
                return controller ? controller.args : {};
            };
        }

        if (typeof window.menuElement !== "function") {
            window.menuElement = () => {
                const controller = getTopController();
                return controller ? controller.element : null;
            };
        }

        if (typeof window.menuReturn !== "function") {
            window.menuReturn = (value = null) => {
                const controller = getTopController();
                if (!controller) {
                    return false;
                }

                returnFrom(controller, value);
                return true;
            };
        }

        if (typeof window.menuCancel !== "function") {
            window.menuCancel = (value = null) => {
                const controller = getTopController();
                if (!controller) {
                    return false;
                }

                returnFrom(controller, value);
                return true;
            };
        }

        if (typeof window.menuClose !== "function") {
            window.menuClose = () => {
                const controller = getTopController();
                if (!controller) {
                    return false;
                }

                closeController(controller, null, "close");
                return true;
            };
        }

        if (typeof window.menuCloseAll !== "function") {
            window.menuCloseAll = () => closeAll(null, "close");
        }

        window.__triagemMenuBridgeInstalled = true;
    }

    function updatePointerFromEvent(event) {
        if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
            pointer.x = event.clientX;
            pointer.y = event.clientY;
            pointer.ready = true;
        }
    }

    function cursorAnchor() {
        if (pointer.ready) {
            return { type: "cursor", x: pointer.x, y: pointer.y };
        }

        const active = document.activeElement;

        if (active instanceof HTMLElement && active !== document.body && active !== document.documentElement) {
            const rect = active.getBoundingClientRect();
            return { type: "cursor", x: rect.left, y: rect.bottom };
        }

        return {
            type: "cursor",
            x: Math.round(window.innerWidth / 2),
            y: Math.round(window.innerHeight / 2)
        };
    }

    function resolveTarget(target) {
        if (target instanceof Element) {
            return target;
        }

        if (typeof target !== "string" || !target.trim()) {
            return null;
        }

        const value = target.trim();
        const byId = document.getElementById(value);

        if (byId) {
            return byId;
        }

        try {
            return document.querySelector(value);
        } catch {
            return null;
        }
    }

    function findControllerForElement(element) {
        if (!(element instanceof Element)) {
            return null;
        }

        const menuElement = element.closest(".menu[data-menu-id]");

        if (!menuElement) {
            return null;
        }

        return controllers.get(menuElement.dataset.menuId) || null;
    }

    function resolveOpenSpec(targetOrPosition, positionOrArgs, args) {
        if (targetOrPosition instanceof Event) {
            updatePointerFromEvent(targetOrPosition);

            return {
                anchor: cursorAnchor(),
                placement: position.cursor,
                args: isPlainObject(positionOrArgs) ? positionOrArgs : (isPlainObject(args) ? args : {}),
                parent: null
            };
        }

        if (isPlainObject(targetOrPosition)) {
            // menu.open("arquivo.menu.html", { ...args })
            return {
                anchor: cursorAnchor(),
                placement: position.cursor,
                args: targetOrPosition,
                parent: null
            };
        }

        if (targetOrPosition == null || isPosition(targetOrPosition)) {
            const requestedPosition = isPosition(targetOrPosition) ? targetOrPosition : position.cursor;

            return {
                anchor: cursorAnchor(),
                placement: requestedPosition,
                args: isPlainObject(positionOrArgs) ? positionOrArgs : (isPlainObject(args) ? args : {}),
                parent: null
            };
        }

        const target = resolveTarget(targetOrPosition);

        if (!target) {
            throw new Error(`[menu] Elemento alvo não encontrado: ${String(targetOrPosition)}`);
        }

        const parent = findControllerForElement(target);
        const requestedPosition = isPosition(positionOrArgs)
            ? positionOrArgs
            : (parent ? position.right : position.bottomLeft);
        const inheritedArgs = parent && isPlainObject(parent.args) ? { ...parent.args } : {};

        return {
            anchor: { type: "element", element: target },
            placement: requestedPosition,
            args: isPlainObject(positionOrArgs) ? positionOrArgs : (isPlainObject(args) ? args : inheritedArgs),
            parent
        };
    }

    async function loadMenuFile(filePath) {
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error(`Falha ao carregar o menu: ${response.statusText}`);
        }

        return {
            html: await response.text(),
            baseUrl: new URL(filePath, window.location.href)
        };
    }

    function injectStyles(doc, menuId, baseUrl) {
        const injectedStyles = [];

        doc.querySelectorAll("style").forEach((style) => {
            const clone = document.createElement("style");
            clone.textContent = style.textContent;
            clone.dataset.menuStyle = menuId;
            document.head.appendChild(clone);
            injectedStyles.push(clone);
            style.remove();
        });

        doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
            const href = link.getAttribute("href");

            if (!href) {
                link.remove();
                return;
            }

            const clone = document.createElement("link");
            [...link.attributes].forEach((attribute) => {
                clone.setAttribute(attribute.name, attribute.value);
            });

            clone.href = baseUrl ? new URL(href, baseUrl).toString() : href;
            clone.dataset.menuStyle = menuId;
            clone.addEventListener("load", scheduleReposition);
            document.head.appendChild(clone);
            injectedStyles.push(clone);
            link.remove();
        });

        return injectedStyles;
    }

    function runScripts(scripts, container, baseUrl) {
        scripts.forEach((oldScript) => {
            const script = document.createElement("script");

            [...oldScript.attributes].forEach((attribute) => {
                script.setAttribute(attribute.name, attribute.value);
            });

            if (oldScript.hasAttribute("src")) {
                const src = oldScript.getAttribute("src");
                script.src = src && baseUrl ? new URL(src, baseUrl).toString() : (src || "");
                script.addEventListener("load", scheduleReposition);
            } else {
                script.textContent = oldScript.textContent;
            }

            container.appendChild(script);
        });
    }

    function normalizeMenuPath(filePath) {
        if (typeof filePath !== "string" || !filePath) {
            return "";
        }

        try {
            return new URL(filePath, window.location.href).toString();
        } catch {
            return filePath;
        }
    }

    function fileSourceKey(filePath) {
        return `file:${normalizeMenuPath(filePath)}`;
    }

    function findOpenRoot(filePath, anchor) {
        if (!anchor || anchor.type !== "element" || !(anchor.element instanceof Element)) {
            return null;
        }

        const wantedSource = fileSourceKey(filePath);

        return menuStack.find((controller) => (
            !controller.parent &&
            controller.anchor &&
            controller.anchor.type === "element" &&
            controller.anchor.element === anchor.element &&
            controller.sourceKey === wantedSource
        )) || null;
    }

    function findOpenChild(parent, trigger, sourceKey = null) {
        if (!parent || !(trigger instanceof Element)) {
            return null;
        }

        return parent.children.find((child) => (
            child.anchor &&
            child.anchor.type === "element" &&
            child.anchor.element === trigger &&
            (sourceKey == null || child.sourceKey === sourceKey)
        )) || null;
    }

    function clearSubmenuOpenTimer(controller) {
        if (controller && controller.submenuOpenTimer !== null) {
            window.clearTimeout(controller.submenuOpenTimer);
            controller.submenuOpenTimer = null;
        }
    }

    function clearSubmenuCloseTimer(controller) {
        if (controller && controller.submenuCloseTimer !== null) {
            window.clearTimeout(controller.submenuCloseTimer);
            controller.submenuCloseTimer = null;
        }
    }

    function clearSubmenuTimers(controller) {
        clearSubmenuOpenTimer(controller);
        clearSubmenuCloseTimer(controller);
    }

    function clearAncestorSubmenuCloseTimers(controller) {
        let ancestor = controller ? controller.parent : null;

        while (ancestor) {
            clearSubmenuCloseTimer(ancestor);
            ancestor = ancestor.parent;
        }
    }

    function scheduleSubmenuOpen(controller, trigger, delay = SUBMENU_HOVER_DELAY) {
        clearSubmenuOpenTimer(controller);

        if (!controller || controller.closed) {
            return;
        }

        controller.submenuOpenTimer = window.setTimeout(() => {
            controller.submenuOpenTimer = null;

            if (!controller.closed && trigger.isConnected && controller.hoveredSubmenu === trigger) {
                openSubmenuFromTrigger(controller, trigger);
            }
        }, delay);
    }

    function scheduleSubmenuClose(controller, delay = SUBMENU_CLOSE_DELAY) {
        clearSubmenuCloseTimer(controller);

        if (!controller || controller.closed || controller.children.length === 0) {
            return;
        }

        controller.submenuCloseTimer = window.setTimeout(() => {
            controller.submenuCloseTimer = null;

            if (!controller.closed) {
                closeChildren(controller, null, "hover");
            }
        }, delay);
    }

    function findMenuItem(controller, target) {
        const item = target.closest("button, [data-menu-return], [data-submenu]");

        if (!(item instanceof Element) || !controller.element.contains(item)) {
            return null;
        }

        return item;
    }

    function isDisabledItem(item) {
        return item.hasAttribute("disabled") ||
            item.getAttribute("aria-disabled") === "true" ||
            item.matches(":disabled");
    }

    function activateMenuItem(controller, item, originalEvent = null) {
        if (!controller || controller.closed || !(item instanceof Element) || isDisabledItem(item)) {
            return false;
        }

        const activationEvent = new window.CustomEvent("menuactivate", {
            bubbles: true,
            cancelable: true,
            detail: {
                menu: controller,
                item,
                originalEvent
            }
        });

        item.dispatchEvent(activationEvent);

        if (!activationEvent.defaultPrevented && item.hasAttribute("data-menu-return")) {
            const value = item.getAttribute("data-menu-return");
            returnFrom(controller, value === "" ? null : value);
        }

        return true;
    }

    function getInlineSubmenuName(value) {
        if (typeof value !== "string") {
            return null;
        }

        const trimmed = value.trim();

        if (!trimmed) {
            return null;
        }

        return trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
    }

    function findInlineSubmenuTemplate(controller, value) {
        const name = getInlineSubmenuName(value);

        if (!name) {
            return null;
        }

        const templates = controller.element.querySelectorAll("template");

        for (const template of templates) {
            if (template.id === name || template.dataset.menuTemplate === name) {
                return template;
            }
        }

        return null;
    }

    function resolveSubmenuArgs(trigger, parentArgs) {
        const baseArgs = isPlainObject(parentArgs) ? { ...parentArgs } : {};
        const rawArgs = trigger.getAttribute("data-submenu-args");

        if (!rawArgs) {
            return baseArgs;
        }

        try {
            const extraArgs = JSON.parse(rawArgs);
            return isPlainObject(extraArgs) ? { ...baseArgs, ...extraArgs } : baseArgs;
        } catch (error) {
            console.error(`[menu] data-submenu-args inválido: ${rawArgs}`, error);
            return baseArgs;
        }
    }

    async function openSubmenuFromTrigger(controller, trigger) {
        if (
            !controller ||
            controller.closed ||
            !(trigger instanceof Element) ||
            !trigger.isConnected ||
            !controller.element.contains(trigger)
        ) {
            return null;
        }

        const submenuValue = trigger.getAttribute("data-submenu");

        if (!submenuValue) {
            return null;
        }

        clearSubmenuOpenTimer(controller);
        clearSubmenuCloseTimer(controller);

        const requestedPosition = trigger.getAttribute("data-submenu-position");
        const placement = isPosition(requestedPosition) ? requestedPosition : position.right;
        const submenuArgs = resolveSubmenuArgs(trigger, controller.args);
        const inlineTemplate = findInlineSubmenuTemplate(controller, submenuValue);

        if (inlineTemplate) {
            const templateKey = inlineTemplate.id || inlineTemplate.dataset.menuTemplate || "inline";
            const sourceKey = `inline:${templateKey}`;
            const existingChild = findOpenChild(controller, trigger, sourceKey);

            if (existingChild) {
                return existingChild;
            }

            return openInlineSubmenu(controller, trigger, inlineTemplate, placement, submenuArgs);
        }

        if (submenuValue.trim().startsWith("#")) {
            console.error(`[menu] Template de submenu não encontrado: ${submenuValue}`);
            return null;
        }

        const resolvedPath = new URL(submenuValue, controller.baseUrl).toString();
        const existingChild = findOpenChild(controller, trigger, fileSourceKey(resolvedPath));

        if (existingChild) {
            return existingChild;
        }

        try {
            return await openChildMenu(controller, trigger, resolvedPath, placement, submenuArgs);
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    function handleMenuPointerOver(controller, trigger) {
        clearSubmenuCloseTimer(controller);

        // entrar em um submenu cancela o fechamento agendado por qualquer
        // ancestral (inclusive ao atravessar vários níveis)
        clearAncestorSubmenuCloseTimers(controller);

        if (!trigger) {
            if (controller.hoveredSubmenu) {
                controller.hoveredSubmenu = null;
                clearSubmenuOpenTimer(controller);
            }

            scheduleSubmenuClose(controller);
            return;
        }

        const existingChild = findOpenChild(controller, trigger);

        if (existingChild) {
            // o submenu deste item já está aberto: manter, sem fechar/reabrir
            controller.hoveredSubmenu = trigger;
            clearSubmenuOpenTimer(controller);
            return;
        }

        if (controller.hoveredSubmenu === trigger) {
            return;
        }

        controller.hoveredSubmenu = trigger;
        clearSubmenuOpenTimer(controller);
        scheduleSubmenuClose(controller);
        scheduleSubmenuOpen(controller, trigger);
    }

    function handleMenuPointerOut(controller, trigger, relatedTarget) {
        if (!trigger || controller.hoveredSubmenu !== trigger) {
            return;
        }

        if (relatedTarget instanceof Element && trigger.contains(relatedTarget)) {
            return;
        }

        controller.hoveredSubmenu = null;
        clearSubmenuOpenTimer(controller);
        scheduleSubmenuClose(controller);
    }

    function handleMenuPointerLeave(controller) {
        controller.hoveredSubmenu = null;
        clearSubmenuOpenTimer(controller);
        scheduleSubmenuClose(controller);

        // sair de um submenu sem voltar para os menus anteriores agenda o
        // fechamento de toda a cadeia de submenus, não só do pai imediato
        let ancestor = controller.parent;

        while (ancestor) {
            scheduleSubmenuClose(ancestor);
            ancestor = ancestor.parent;
        }
    }

    function bindMenuEvents(controller) {
        controller.element.addEventListener("pointerover", (event) => {
            if (!(event.target instanceof Element)) {
                return;
            }

            const trigger = event.target.closest("[data-submenu]");

            if (trigger && !controller.element.contains(trigger)) {
                return;
            }

            handleMenuPointerOver(controller, trigger);
        });

        controller.element.addEventListener("pointerout", (event) => {
            if (!(event.target instanceof Element)) {
                return;
            }

            const trigger = event.target.closest("[data-submenu]");

            if (!trigger || !controller.element.contains(trigger)) {
                return;
            }

            handleMenuPointerOut(controller, trigger, event.relatedTarget);
        });

        controller.element.addEventListener("pointerleave", () => {
            handleMenuPointerLeave(controller);
        });

        controller.element.addEventListener("mouseup", (event) => {
            if (event.button !== 0 || !(event.target instanceof Element)) {
                return;
            }

            const item = findMenuItem(controller, event.target);

            if (!item) {
                return;
            }

            if (item.hasAttribute("data-submenu")) {
                openSubmenuFromTrigger(controller, item);
                return;
            }

            activateMenuItem(controller, item, event);
        });

        controller.element.addEventListener("click", (event) => {
            if (!(event.target instanceof Element)) {
                return;
            }

            const item = findMenuItem(controller, event.target);

            if (!item) {
                return;
            }

            if (event.detail === 0) {
                // teclado/tecnologia assistiva: não houve mouseup para ativar
                event.preventDefault();
                event.stopPropagation();

                if (item.hasAttribute("data-submenu")) {
                    openSubmenuFromTrigger(controller, item);
                } else {
                    activateMenuItem(controller, item, event);
                }

                return;
            }

            // o clique gerado pelo mouse já foi tratado no mouseup
            event.preventDefault();
            event.stopPropagation();
        }, true);
    }

    function createController({ html = null, content = null, baseUrl, args, parent, anchor, placement, path, sourceKey = null }) {
        const menuId = createMenuId();
        let source;
        let contentSource;

        if (content) {
            source = document.createElement("div");
            source.append(content);
            contentSource = source;
        } else {
            const doc = new DOMParser().parseFromString(html, "text/html");
            source = doc;
            contentSource = doc.body;
        }

        const injectedStyles = injectStyles(source, menuId, baseUrl);

        const scripts = Array.from(source.querySelectorAll("script"));
        scripts.forEach((script) => script.remove());

        const element = document.createElement("div");
        element.className = "menu";
        element.dataset.menu = "";
        element.dataset.menuId = menuId;
        element.dataset.menuPath = path || "";
        element.setAttribute("role", "menu");
        element.setAttribute("aria-orientation", "vertical");
        element.tabIndex = -1;
        element.style.visibility = "hidden";
        element.append(...contentSource.childNodes);

        element.querySelectorAll("button:not([role])").forEach((button) => {
            button.setAttribute("role", "menuitem");
        });

        element.querySelectorAll("hr:not([role])").forEach((separator) => {
            separator.setAttribute("role", "separator");
        });

        element.querySelectorAll("[data-submenu]").forEach((item) => {
            item.setAttribute("aria-haspopup", "menu");
            item.setAttribute("aria-expanded", "false");
        });

        const previousFocus = parent
            ? (anchor.element instanceof HTMLElement ? anchor.element : null)
            : (document.activeElement instanceof HTMLElement ? document.activeElement : null);

        const controller = {
            id: menuId,
            element,
            path,
            sourceKey: sourceKey || fileSourceKey(path),
            baseUrl,
            args,
            parent,
            children: [],
            root: null,
            promise: null,
            resolve: null,
            settled: false,
            closed: false,
            childRequestToken: 0,
            submenuOpenTimer: null,
            submenuCloseTimer: null,
            hoveredSubmenu: null,
            anchor,
            placement,
            injectedStyles,
            previousFocus,
            return(value = null) {
                returnFrom(this, value);
            },
            cancel(value = null) {
                returnFrom(this, value);
            },
            close() {
                closeController(this, null, "close");
            }
        };

        if (parent) {
            controller.root = parent.root;
            controller.promise = parent.root.promise;
            parent.children.push(controller);

            if (anchor.element instanceof HTMLElement) {
                anchor.element.setAttribute("aria-expanded", "true");
            }
        } else {
            controller.root = controller;
            controller.promise = new Promise((resolve) => {
                controller.resolve = resolve;
            });
        }

        controllers.set(menuId, controller);
        menuStack.push(controller);

        document.body.appendChild(element);
        bindMenuEvents(controller);
        runScripts(scripts, element, baseUrl);

        if (controller.closed) {
            return controller;
        }

        placeController(controller);
        element.style.visibility = "";

        const focusable = element.querySelector(
            "[autofocus], button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
        );

        if (focusable instanceof HTMLElement) {
            focusable.focus({ preventScroll: true });
        } else {
            element.focus({ preventScroll: true });
        }

        return controller;
    }

    async function openChildMenu(parent, trigger, filePath, placement, args) {
        if (!parent || parent.closed) {
            return null;
        }

        clearSubmenuOpenTimer(parent);
        clearSubmenuCloseTimer(parent);

        const requestToken = ++parent.childRequestToken;
        closeChildren(parent, null, "switch", false);

        const loaded = await loadMenuFile(filePath);

        if (parent.closed || requestToken !== parent.childRequestToken || !trigger.isConnected) {
            return null;
        }

        return createController({
            html: loaded.html,
            baseUrl: loaded.baseUrl,
            args,
            parent,
            anchor: { type: "element", element: trigger },
            placement,
            path: filePath,
            sourceKey: fileSourceKey(filePath)
        });
    }

    function openInlineSubmenu(parent, trigger, template, placement, args) {
        if (!parent || parent.closed) {
            return null;
        }

        clearSubmenuOpenTimer(parent);
        clearSubmenuCloseTimer(parent);

        const templateKey = template.id || template.dataset.menuTemplate || "inline";
        const content = template.content.cloneNode(true);

        parent.childRequestToken += 1;
        closeChildren(parent, null, "switch", false);

        if (parent.closed || !trigger.isConnected) {
            return null;
        }

        return createController({
            content,
            baseUrl: parent.baseUrl,
            args,
            parent,
            anchor: { type: "element", element: trigger },
            placement,
            path: `#${templateKey}`,
            sourceKey: `inline:${templateKey}`
        });
    }

    function anchorRect(controller) {
        const anchor = controller.anchor;

        if (anchor.type === "cursor") {
            return {
                left: anchor.x,
                right: anchor.x,
                top: anchor.y,
                bottom: anchor.y,
                width: 0,
                height: 0
            };
        }

        return anchor.element.getBoundingClientRect();
    }

    function placeController(controller) {
        if (controller.closed) {
            return;
        }

        const element = controller.element;
        // offsetWidth/offsetHeight ignoram a transformação da animação de
        // entrada, garantindo que a borda segura use o tamanho final do menu
        const width = element.offsetWidth;
        const height = element.offsetHeight;
        const anchor = anchorRect(controller);
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left;
        let top;

        switch (controller.placement) {
            case "top-left":
                left = anchor.left;
                top = anchor.top - height - ANCHOR_GAP;

                if (top < VIEWPORT_MARGIN) {
                    top = anchor.bottom + ANCHOR_GAP;
                }
                break;

            case "top-right":
                left = anchor.right - width;
                top = anchor.top - height - ANCHOR_GAP;

                if (top < VIEWPORT_MARGIN) {
                    top = anchor.bottom + ANCHOR_GAP;
                }
                break;

            case "bottom-right":
                left = anchor.right - width;
                top = anchor.bottom + ANCHOR_GAP;

                if (top + height > viewportHeight - VIEWPORT_MARGIN) {
                    top = anchor.top - height - ANCHOR_GAP;
                }
                break;

            case "left":
                left = anchor.left - width - ANCHOR_GAP;
                top = anchor.top;

                if (left < VIEWPORT_MARGIN) {
                    left = anchor.right + ANCHOR_GAP;
                }
                break;

            case "right":
                left = anchor.right + ANCHOR_GAP;
                top = anchor.top;

                if (left + width > viewportWidth - VIEWPORT_MARGIN) {
                    left = anchor.left - width - ANCHOR_GAP;
                }
                break;

            case "cursor":
                left = anchor.left;
                top = anchor.top;

                if (left + width > viewportWidth - VIEWPORT_MARGIN) {
                    left = anchor.left - width;
                }

                if (top + height > viewportHeight - VIEWPORT_MARGIN) {
                    top = anchor.top - height;
                }
                break;

            case "bottom-left":
            default:
                left = anchor.left;
                top = anchor.bottom + ANCHOR_GAP;

                if (top + height > viewportHeight - VIEWPORT_MARGIN) {
                    top = anchor.top - height - ANCHOR_GAP;
                }
                break;
        }

        const maxLeft = Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN);
        const maxTop = Math.max(VIEWPORT_MARGIN, viewportHeight - height - VIEWPORT_MARGIN);

        left = Math.min(Math.max(left, VIEWPORT_MARGIN), maxLeft);
        top = Math.min(Math.max(top, VIEWPORT_MARGIN), maxTop);

        element.style.left = `${Math.round(left)}px`;
        element.style.top = `${Math.round(top)}px`;
    }

    function scheduleReposition() {
        if (repositionFrame !== null) {
            return;
        }

        repositionFrame = window.requestAnimationFrame(() => {
            repositionFrame = null;
            menuStack.forEach((controller) => placeController(controller));
        });
    }

    function closeChildren(parent, value = null, reason = "close", cancelPending = true) {
        if (cancelPending) {
            parent.childRequestToken += 1;
        }

        parent.children.slice().forEach((child) => {
            closeController(child, value, reason);
        });
    }

    function closeController(controller, value = null, reason = "close") {
        if (!controller || controller.closed) {
            return;
        }

        controller.closed = true;
        controller.childRequestToken += 1;
        clearSubmenuTimers(controller);
        controller.hoveredSubmenu = null;

        const parent = controller.parent;
        const previousFocus = controller.previousFocus;

        if (
            parent &&
            controller.anchor &&
            controller.anchor.type === "element" &&
            parent.hoveredSubmenu === controller.anchor.element
        ) {
            parent.hoveredSubmenu = null;
        }

        controller.children.slice().forEach((child) => {
            closeController(child, value, reason);
        });

        controller.children.length = 0;

        // os filhos podem ter devolvido o foco para um item deste menu; por isso
        // a checagem é feita depois de fechá-los
        const focusWasInside = controller.element.contains(document.activeElement);

        if (parent) {
            const childIndex = parent.children.indexOf(controller);

            if (childIndex >= 0) {
                parent.children.splice(childIndex, 1);
            }
        }

        if (
            controller.anchor &&
            controller.anchor.type === "element" &&
            controller.anchor.element instanceof HTMLElement &&
            controller.anchor.element.isConnected
        ) {
            controller.anchor.element.setAttribute("aria-expanded", "false");
        }

        controller.injectedStyles.forEach((style) => style.remove());
        controller.element.remove();
        controllers.delete(controller.id);

        const stackIndex = menuStack.indexOf(controller);

        if (stackIndex >= 0) {
            menuStack.splice(stackIndex, 1);
        }

        if (focusWasInside && previousFocus instanceof HTMLElement && previousFocus.isConnected) {
            previousFocus.focus({ preventScroll: true });
        }

        if (!parent && !controller.settled) {
            controller.settled = true;

            if (typeof controller.resolve === "function") {
                controller.resolve(value);
            }
        }
    }

    function returnFrom(controller, value = null) {
        const root = controller ? controller.root : null;

        if (!root || root.closed) {
            return false;
        }

        closeController(root, value, "return");
        return true;
    }

    function closeAll(value = null, reason = "close") {
        rootRequestToken += 1;

        const roots = menuStack.filter((controller) => !controller.parent);

        roots.forEach((controller) => {
            closeController(controller, value, reason);
        });

        return roots.length > 0;
    }

    function handleDocumentMouseDown(event) {
        updatePointerFromEvent(event);

        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        if (target.closest(".menu[data-menu-id]")) {
            return;
        }

        // O mousedown no gatilho do menu aberto precisa chegar ao handler dele
        // para que `menu.open` feche o menu (alternância). Se fechássemos aqui,
        // o gatilho sempre reabriria o menu em vez de alternar.
        const insideOpenAnchor = menuStack.some((controller) => (
            !controller.parent &&
            controller.anchor &&
            controller.anchor.type === "element" &&
            controller.anchor.element instanceof Element &&
            controller.anchor.element.contains(target)
        ));

        if (insideOpenAnchor) {
            return;
        }

        closeAll(null, "outside");
    }

    function handlePointerMove(event) {
        updatePointerFromEvent(event);
    }

    function handleKeyDown(event) {
        if (event.key !== "Escape" || menuStack.length === 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const top = getTopController();

        if (top && top.parent) {
            closeController(top, null, "escape");
        } else {
            closeAll(null, "escape");
        }
    }

    function ensureGlobalListeners() {
        if (listenersInstalled) {
            return;
        }

        listenersInstalled = true;

        document.addEventListener("mousedown", handleDocumentMouseDown, true);
        document.addEventListener("pointermove", handlePointerMove, { capture: true, passive: true });
        document.addEventListener("keydown", handleKeyDown, true);
        window.addEventListener("resize", scheduleReposition);
        window.addEventListener("scroll", scheduleReposition, true);
    }

    /**
     * Abre um menu a partir de um arquivo `.menu.html`.
     *
     * Se o mesmo arquivo já estiver aberto no mesmo elemento ancora, o menu é
     * fechado em vez de reaberto (comportamento de alternância).
     *
     * Formas de chamada:
     * - `open(caminho, alvo, posicao?, args?)`
     * - `open(caminho, evento, args?)`
     * - `open(caminho, posicao, args?)`
     * - `open(caminho, args)` (abre no cursor)
     *
     * Submenus herdam os argumentos do menu pai quando nenhum argumento novo
     * é informado.
     *
     * @param {string} filePath                   caminho do arquivo do menu
     * @param {string|HTMLElement|Event|object} [targetOrPosition] alvo, evento, posição ou argumentos
     * @param {string|object} [positionOrArgs]    posição (quando há alvo) ou argumentos
     * @param {object} [args]                     argumentos extras entregues a `window.menuArgs()`
     * @returns {Promise<*>} promessa com o valor retornado por `window.menuReturn`
     *                       ou `null` ao fechar/cancelar
     */
    async function open(filePath, targetOrPosition = position.cursor, positionOrArgs = null, args = null) {
        ensureMenuBridge();
        ensureGlobalListeners();

        if (typeof filePath !== "string" || !filePath.trim()) {
            throw new Error("[menu] Caminho do menu inválido.");
        }

        const spec = resolveOpenSpec(targetOrPosition, positionOrArgs, args);

        if (spec.parent) {
            const existingChild = findOpenChild(spec.parent, spec.anchor.element, fileSourceKey(filePath));

            if (existingChild) {
                closeController(existingChild, null, "toggle");
                return existingChild.root.promise;
            }

            const rootPromise = spec.parent.root.promise;
            const child = await openChildMenu(
                spec.parent,
                spec.anchor.element,
                filePath,
                spec.placement,
                spec.args
            );

            return child ? rootPromise : null;
        }

        const existingRoot = findOpenRoot(filePath, spec.anchor);

        if (existingRoot) {
            closeController(existingRoot, null, "toggle");
            return existingRoot.promise;
        }

        closeAll(null, "switch");

        const requestToken = ++rootRequestToken;
        const loaded = await loadMenuFile(filePath);

        if (requestToken !== rootRequestToken) {
            return null;
        }

        const controller = createController({
            html: loaded.html,
            baseUrl: loaded.baseUrl,
            args: spec.args,
            parent: null,
            anchor: spec.anchor,
            placement: spec.placement,
            path: filePath
        });

        return controller.promise;
    }

    /**
     * Abre ou fecha um menu conforme o estado atual.
     *
     * É o mesmo comportamento de `menu.open`: a alternância só acontece quando
     * o arquivo e o elemento ancora são os mesmos do menu já aberto.
     *
     * @param {string} filePath                   caminho do arquivo do menu
     * @param {string|HTMLElement|Event|object} [targetOrPosition] alvo, evento, posição ou argumentos
     * @param {string|object} [positionOrArgs]    posição (quando há alvo) ou argumentos
     * @param {object} [args]                     argumentos extras entregues a `window.menuArgs()`
     * @returns {Promise<*>} promessa do menu
     */
    function toggle(filePath, targetOrPosition = position.cursor, positionOrArgs = null, args = null) {
        return open(filePath, targetOrPosition, positionOrArgs, args);
    }

    /**
     * Fecha um menu. Sem argumento, fecha o menu do topo (um submenu, se houver).
     *
     * @param {string} [menuId] id interno do menu a ser fechado
     * @returns {boolean} `true` se algum menu foi fechado
     */
    function close(menuId = null) {
        let controller = null;

        if (typeof menuId === "string" && menuId.trim()) {
            controller = controllers.get(menuId.trim()) || null;
        } else {
            controller = getTopController();
        }

        if (!controller) {
            return false;
        }

        closeController(controller, null, "close");
        return true;
    }

    /**
     * Fecha todos os menus abertos e resolve a promessa do menu raiz com `value`.
     *
     * @param {*} [value] valor devolvido pelo menu
     * @returns {boolean} `true` se havia algum menu aberto
     */
    function closeAllMenus(value = null) {
        return closeAll(value, "close");
    }

    /**
     * Informa se há menu aberto.
     *
     * @param {string} [menuId] id interno de um menu específico
     * @returns {boolean}
     */
    function isOpen(menuId = null) {
        if (typeof menuId === "string" && menuId.trim()) {
            return controllers.has(menuId.trim());
        }

        return menuStack.length > 0;
    }

    ensureMenuBridge();
    ensureGlobalListeners();

    return {
        position,
        open,
        toggle,
        close,
        closeAll: closeAllMenus,
        isOpen
    };
})();
