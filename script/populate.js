const nameInput = document.getElementById("exam-name");
const priorityInput = document.getElementById("exam-priority");
const datalist = document.getElementById("exam-names");

// lista de exames carregada do arquivo exams.json
let exams = [];

// carrega os exames do arquivo exams.json e atualiza o autocompletar
fetch("media/exams.json")
    .then((response) => response.json())
    .then((data) => {
        exams = data.exams;
        populateDatalist();
    });

// popula datalist com os nomes dos exames para autocompletar o campo de texto
function populateDatalist() {
    datalist.innerHTML = "";
    exams.forEach((exam) => {
        const option = document.createElement("option");
        option.value = exam.name;
        datalist.appendChild(option);
    });
}

// busca um exame na lista pelo nome, ignora diferenças de maiúsculas/minúsculas
function findExam(name) {
    return exams.find((exam) => exam.name.toLowerCase() === name.trim().toLowerCase());
}

// ao digitar no campo de nome, verifica se o texto corresponde a um exame conhecido
nameInput.addEventListener("input", () => {
    const match = findExam(nameInput.value);

    // se o exame for conhecido, preenche a prioridade e desabilita o campo
    if (match) {
        priorityInput.value = match.priority;
        priorityInput.disabled = true;
    } else {
        // se nao, limpa a prioridade e reabilita o campo
        priorityInput.value = "";
        priorityInput.disabled = false;
    }
});

//
// BOTOES
//

// botão limpar: reseta os campos do formulário
document.getElementById("clear-btn").addEventListener("click", () => {
    nameInput.value = "";
    priorityInput.value = "";
    priorityInput.disabled = false;
});

// @todo: botao de enviar ainda nao faz nada
document.getElementById("submit-btn").addEventListener("click", (event) => {
    event.preventDefault();
});
