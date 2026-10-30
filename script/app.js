import { storage } from './store.js';
import { dialog }  from './dialog.js';
import { triage }  from './triage.js';
import { ui }      from './ui.js';
import { demo }    from './demo.js';

window.storage = storage;
window.dialog = dialog;
window.triage = triage;
window.ui = ui;
window.demo = demo;

window.addEventListener('DOMContentLoaded', () => {
    console.time("Application started");

    ui.init();

    console.timeEnd("Application started");

    let theme = storage.get("theme", "light");
    document.body.classList.add(theme);
});