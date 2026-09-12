import {storage} from './store.js';

// START PIPELINE
window.addEventListener('DOMContentLoaded', async () => {
    console.log("Application started");

    storage.set("teste", "teste");
    console.log(storage.get("teste"));
});
