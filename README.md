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
|   |-- demo.js
|   |-- dialog.js
|   |-- store.js
|   |-- triage.js
|   '-- ui.js
|
|-- style/
|   |-- dialog.css
|   '-- style.css
|
'-- index.html
```

| Arquivo | Responsabilidade atual |
|---|---|
| `index.html` | Tela principal da aplicação. Divide o conteúdo entre pacientes aguardando atendimento e pacientes em atendimento. Exibe cinco categorias visuais: Emergência, Muito urgente, Urgente, Pouco urgente e Não urgente. Os cartões são gerados a partir dos tickets salvos e as categorias sem pacientes ficam ocultas. |
| `dialog/confirm.dialog.html` | Diálogo reutilizável de confirmação. Recebe título, conteúdo e textos dos botões por parâmetros e retorna true ou false pela ponte global de diálogos. |
| `dialog/newTicket.dialog.html` | Formulário inicial de cadastro. Contém nome, idade, peso, altura, temperatura, batimentos cardíacos e pressão arterial em linhas compactas e, no fim, gravidade escolhida em um slider de 1 a 5 com o nome do nível escolhido ao centro e sintomas em texto livre, ambos em blocos de largura total. Devolve o objeto do ticket pela ponte global de diálogos. |
| `script/app.js` | Ponto de inicialização. Importa storage, dialog, triage, ui e demo, expõe todos em window e inicia a interface. |
| `script/demo.js` | Modo de demonstração para a apresentação. Cria pacientes aleatórios com sinais vitais e sintomas coerentes com a gravidade, atende e conclui pacientes aleatórios (respeitando o máximo de 10 atendimentos simultâneos), limpa a fila e executa tudo em loop por meio dos controles exibidos no cabeçalho. Expõe `demo.initDemo()` e `demo.stopDemo()`. |
| `script/dialog.js` | Componente mais completo do estado atual. Implementa pilha de diálogos, parâmetros, retorno/cancelamento, carregamento de HTML externo, metadados de tamanho e barra, injeção de estilos, execução de scripts internos, foco e fechamento. |
| `script/store.js` | Abstração para localStorage com prefixo próprio do projeto. Implementa set, get, remove e clear, evitando apagar dados de outros sites ou chaves não pertencentes ao sistema. |
| `script/triage.js` | Gerência dos tickets. Normaliza e persiste a fila em uma única chave do storage, além de listar, buscar, alterar, remover e mover tickets entre as situações de espera, atendimento e concluído. Pede novos diagnósticos ao usuário pelo diálogo de novo ticket, repassando a ele os parâmetros recebidos. A gravidade é guardada apenas como número de 1 a 5, sendo 5 a emergência. |
| `script/ui.js` | Interface da triagem. Traduz a gravidade numérica dos tickets para as categorias da tela, desenha os cartões das duas colunas e trata os botões de novo diagnóstico, atender, concluir e remover. Os cartões da fila de espera também podem ser arrastados para a coluna de atendimento. |
| `style/style.css` | Tema visual geral, layout em duas colunas, botões, cartões, categorias e indicadores de estado. Emergência e Muito urgente possuem animações de destaque. |
| `style/dialog.css` | Estilos dos diálogos, barra superior, responsividade, formulários e botões. Inclui comportamento específico para telas pequenas. |

## Modo demonstração

Para a apresentação, abra o console do navegador e execute:

```js
demo.initDemo();          // exibe os botões de demonstração no cabeçalho
demo.maxAttending = 5;    // opcional: altera o limite padrão de 10 atendimentos simultâneos
demo.stopDemo();          // esconde os botões e para o modo automático
```

Os botões permitem criar diagnósticos aleatórios, atender e concluir pacientes aleatórios, limpar a fila e ligar o modo automático, que executa uma ação a cada 1 a 10 segundos.

## Estado atual do código

### Componentes já implementados

- **Interface principal da fila:** a estrutura visual das categorias de prioridade e a área de atendimento já estão montadas.
- **Fila ligada aos dados:** os cartões das duas colunas são desenhados a partir dos tickets salvos, e as categorias vazias são ocultadas.
- **Gestão dos tickets:** é possível cadastrar, alterar e remover diagnósticos, além de mover um paciente entre a fila de espera e o atendimento.
- **Sistema reutilizável de diálogos:** é possível abrir HTML externo como diálogo, passar argumentos, retornar valores, cancelar e empilhar múltiplos diálogos.
- **Persistência dos registros:** a fila é gravada em uma única chave do localStorage e é lida de volta ao abrir a página.
- **Formulário inicial de paciente:** os principais sinais vitais básicos já aparecem na interface de cadastro.
- **Tema visual e responsividade:** há identidade visual consistente para a tela principal e para diálogos, incluindo adaptação para telas menores.

### Funcionalidades parciais

- **Gravidade dos tickets:** o nível é escolhido pelo atendente em um slider de 1 a 5, sendo 1 não urgente e 5 emergência, mas ainda não existe classificação automática a partir dos sinais vitais.
- **Edição de pacientes:** a API permite alterar um ticket, porém a tela ainda não oferece um formulário de edição.
- **Reavaliação:** um paciente pode ser colocado em atendimento e concluído, mas a fila não é reavaliada com o passar do tempo.

### Funcionalidades ainda não implementadas

- Algoritmo de triagem e cálculo de prioridade.
- Pontuação por gravidade, sintomas e tempo de espera.
- Ordenação e reordenação da fila.
- Atualização automática pelo tempo de espera.
- Validações do formulário e tratamento de campos obrigatórios além da marcação visual.
- Exportação e importação manual dos dados.

> Ultima revisão em 22/09/2026, commit `9b6e1f3 (9b6e1f38c23e4cdff30f159cc2beadc0b92b4e07)`.