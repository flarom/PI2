import { storage } from './store.js';
import { dialog }  from './dialog.js';

window.addEventListener('DOMContentLoaded', async () => {
    console.log("Application started");

    storage.set("teste", "teste");
    console.log(storage.get("teste"));

    //dialog.show('<h1>olá mundo</h1><p>teste de dialog</p>');
    let teste = await dialog.showFile('dialog/confirm.html', {'title': 'teste'});
    console.log (teste);
});
