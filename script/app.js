import { storage } from './store.js'; 
import { dialog }  from './dialog.js';

window.storage = storage;
window.dialog = dialog;

window.addEventListener('DOMContentLoaded', async () => {
    console.time("Application started");

    storage.set("teste", "teste");
    console.log(storage.get("teste"));

    //dialog.show('<h1>olá mundo</h1><p>teste de dialog</p>');
    let teste = await dialog.showFile('dialog/confirm.html', {'title': 'teste', 'content': '<label>teste de dialog</label>'});
    console.log (teste);

    console.timeEnd("Application started");
});
