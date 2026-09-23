# PI2 - Sistema de triagem médica

Segundo projeto integrador - Site para Triagens médicas simplificado utilizando a linguagem de programação JavaScript, com o intuíto de descrever sintomas e agendamentos de consultas para instituições públicas (Estilo SUS).

## Membros

* César Augusto Bergamin
* Mateus Tomazetto da Costa
* Lucas José Baldiga
* Vicenzo Fisch Garcez

## Informações do Projeto

* Tema: Programação de site;
* Algoritmo: Decision Tree (árvore de decisão);



## Pesquisa

Este projeto foi desenvolvido levando em conta o grande avanço de tecnologias e processos na medicina com o aucílio de sistemas para suporte a decisão, interfaces de registros detalhados para médicos, como por exemplo o [CPOE (computerized physician order entry)](https://en.wikipedia.org/wiki/Computerized_physician_order_entry), que em seu núcleo e objetivo principal é ler uma ficha digital do paciente e informar sobre possíveis alergias ou efeitos colaterais.

## Objetivo do Projeto

### Objetivo geral

Desenvolver um sistema de apoio à triagem capaz de organizar uma fila de atendimento de forma dinâmica, combinando gravidade, sintomas e tempo de espera para produzir uma ordem de prioridade mais adequada do que uma fila baseada somente na ordem de chegada.

### Objetivos funcionais

- Cadastrar pacientes e registrar as informações relevantes para a triagem.
- Registrar queixa ou ocorrência, sintomas, sinais de alerta e horário de entrada.
- Gerar uma classificação inicial de prioridade com regras previamente definidas.
- Recalcular a prioridade conforme o tempo de espera (Aging).
- Destacar situações críticas que exigem atendimento imediato.
- Persistir os registros localmente no navegador.
- Remover da fila pacientes atendidos, desistentes ou cadastrados incorretamente.

## Público-alvo

O público-alvo direto do sistema é a equipe responsável pelo acolhimento e pela organização da triagem em um ambiente de atendimento. O operador previsto é um atendente ou profissional habilitado que registra informações, acompanha a fila e executa reavaliações quando necessário. Os pacientes são o objeto dos registros e da priorização, mas não constituem o usuário principal da interface.

> [!WARNING]
> **O sistema não tem o intuíto de ser utilizado em um cenário real.**

## Escopo do Sistema

### Escopo funcional previsto

- Aplicação web estática.
- Cadastro e manutenção de registros de pacientes.
- Classificação em categorias de prioridade e ordenação dinâmica da fila.
- Uso de gravidade, sintomas e tempo como fatores do modelo acadêmico de prioridade.
- Regra superior para casos críticos, que não devem ser ultrapassados apenas pelo tempo de espera de outro paciente.
- Reavaliação de pacientes durante a espera.
- Persistência local por meio de localStorage.
- Exportação manual de dados para cópia, backup ou transferência.

### Limites do escopo

- O sistema não realiza diagnóstico médico.
- O sistema não prescreve medicamentos ou condutas.
- O sistema não substitui a decisão de médicos, enfermeiros ou outros profissionais habilitados.
- O modelo de pontuação é acadêmico e não deve ser interpretado como protocolo clínico oficial.
- A versão acadêmica não depende de servidor, API, banco remoto ou inteligência artificial.
- O uso com dados reais exige controles adicionais de proteção de dados e validação institucional.

## Estrutura do Repositório

``` text
PI2/
|-- dialog/
|   |-- confirm.dialog.html
|   '-- newTicket.dialog.html
|
|-- script/
|   |-- app.js
|   |-- dialog.js
|   |-- store.js
|   '-- triage.js
|
|-- style/
|   |-- dialog.css
|   '-- style.css
|
'-- index.html
```

| Arquivo | Responsabilidade atual |
|---|---|
| `index.html` | Tela principal da aplicação. Divide o conteúdo entre pacientes aguardando atendimento e pacientes em atendimento. Exibe cinco categorias visuais: Emergência, Muito urgente, Urgente, Pouco urgente e Não urgente. Os cartões atuais são estáticos e funcionam como mockup. |
| `dialog/confirm.dialog.html` | Diálogo reutilizável de confirmação. Recebe título, conteúdo e textos dos botões por parâmetros e retorna true ou false pela ponte global de diálogos. |
| `dialog/newTicket.dialog.html` | Formulário inicial de cadastro. Já contém nome, idade, peso, altura, temperatura, batimentos cardíacos e pressão arterial. A lógica de retorno do objeto ainda está indicada apenas por comentário. |
| `script/app.js` | Ponto de inicialização. Importa storage e dialog, expõe ambos em window, executa um teste simples de armazenamento e abre automaticamente o diálogo de novo ticket ao carregar a página. |
| `script/dialog.js` | Componente mais completo do estado atual. Implementa pilha de diálogos, parâmetros, retorno/cancelamento, carregamento de HTML externo, metadados de tamanho e barra, injeção de estilos, execução de scripts internos, foco e fechamento. |
| `script/store.js` | Abstração para localStorage com prefixo próprio do projeto. Implementa set, get, remove e clear, evitando apagar dados de outros sites ou chaves não pertencentes ao sistema. |
| `script/triage.js` | Arquivo reservado para a lógica de triagem. Atualmente exporta uma IIFE vazia, portanto o algoritmo de priorização ainda não foi implementado. |
| `style/style.css` | Tema visual geral, layout em duas colunas, botões, cartões, categorias e indicadores de estado. Emergência e Muito urgente possuem animações de destaque. |
| `style/dialog.css` | Estilos dos diálogos, barra superior, responsividade, formulários e botões. Inclui comportamento específico para telas pequenas. |

## Estado atual do código

### Componentes já implementados

- **Interface principal da fila:** a estrutura visual das categorias de prioridade e a área de atendimento já estão montadas.
- **Sistema reutilizável de diálogos:** é possível abrir HTML externo como diálogo, passar argumentos, retornar valores, cancelar e empilhar múltiplos diálogos.
- **Persistência básica:** existe uma API de armazenamento local encapsulando localStorage com namespace próprio.
- **Formulário inicial de paciente:** os principais sinais vitais básicos já aparecem na interface de cadastro.
- **Tema visual e responsividade:** há identidade visual consistente para a tela principal e para diálogos, incluindo adaptação para telas menores.

### Funcionalidades parciais

- **Cadastro de paciente:** a interface existe, mas o formulário não monta nem retorna um objeto com os dados preenchidos.
- **Uso do localStorage:** a infraestrutura existe, mas ainda é usada apenas por um teste em app.js; os registros de pacientes não são persistidos.
- **Fila de atendimento:** a interface demonstra como a fila deve parecer, porém os pacientes exibidos são exemplos fixos no HTML.
- **Ação de novo registro:** o botão 'Novo diagnostico' existe na tela, mas o código atual não associa o clique a uma ação. O diálogo é aberto automaticamente no carregamento da página.

### Funcionalidades ainda não implementadas

- Algoritmo de triagem e cálculo de prioridade.
- Pontuação por gravidade, sintomas e tempo de espera.
- Ordenação e reordenação da fila.
- Atualização automática pelo tempo de espera.
- Reavaliação e edição de pacientes.
- Fluxo de início e término do atendimento.
- Remoção de registros.
- Validações do formulário e tratamento de campos obrigatórios além da marcação visual.
- Persistência estruturada dos registros de pacientes.

> Ultima revisão em 22/09/2026, commit `9b6e1f3 (9b6e1f38c23e4cdff30f159cc2beadc0b92b4e07)`.