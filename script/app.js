import { storage }  from './store.js';
import { dialog }   from './dialog.js';
import { menu }     from './menu.js';
import { shortcut } from './shortcut.js';
import { triage }   from './triage.js';
import { ui }       from './ui.js';
import { demo }     from './demo.js';

window.storage = storage;
window.dialog = dialog;
window.menu = menu;
window.shortcut = shortcut;
window.triage = triage;
window.ui = ui;
window.demo = demo;

window.addEventListener('DOMContentLoaded', () => {
    console.time("Application started");
    ui.init();
    
    let theme = storage.get("theme", "light");
    document.body.classList.add(theme);
    
    shortcut.add(() => {dialog.showFile('popover/dialog/newTicket.html')}, ['ctrl', 'd'], ['cmd', 'd'], {preventDefault:true})
    
    console.timeEnd("Application started");
});