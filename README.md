# Sistema de Triagem Médica

Aplicação web acadêmica para organizar a fila de triagem de um pronto atendimento. O operador cadastra o paciente,
seleciona manualmente uma gravidade de 1 a 5 e o sistema ordena os atendimentos pela urgência.

O projeto é feito apenas com HTML, CSS e JavaScript, sem backend. Os dados ficam salvos no `localStorage` do navegador.

> [!WARNING]Aviso
> Rste sistema é exclusivamente acadêmico e não deve ser usado em atendimentos reais. Ele não faz
> diagnósticos, não interpreta sintomas ou sinais vitais e não substitui a avaliação de profissionais de saúde.

## Funcionalidades

- Cadastro de pacientes com nome, idade, peso, altura, temperatura, frequência cardíaca, pressão arterial e sintomas.
- Classificação manual de gravidade: 1 (não urgente) a 5 (emergência).
- Fila ordenada por gravidade decrescente e, em caso de empate, pela chegada mais antiga.
- Colunas separadas para **Aguardando atendimento** e **Em atendimento**.
- Ações para atender, concluir e remover tickets, com confirmação.
- Arrastar e soltar cartões da espera para o atendimento.
- Persistência automática dos tickets no navegador.
- Tema claro/escuro e atalho **Ctrl+D** / **Cmd+D** para novo diagnóstico.
- Modo de demonstração com pacientes fictícios e atendimento automático.

## Como executar

Não há instalação nem build. Como o projeto usa módulos ES e carrega arquivos HTML dinamicamente, é preciso servir a
pasta por HTTP:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Uso básico

1. Clique em **Novo diagnóstico** ou use **Ctrl+D** / **Cmd+D**.
2. Preencha os dados do paciente, informe os sintomas e escolha a gravidade.
3. O ticket aparece na coluna e na categoria correspondente.
4. Use **Atender** (ou arraste o cartão) para iniciar o atendimento.
5. Use **Concluir** para encerrar ou **Remover** para excluir o registro.

## Modo de demonstração

Para apresentações, abra o console do navegador e execute:

```js
demo.initDemo();       // mostra os controles de demonstração
demo.stopDemo();       // encerra o modo automático
```

A demonstração cria pacientes fictícios e escolhe o próximo atendimento por uma árvore de decisão simplificada:
emergências (gravidade 5) têm prioridade; entre os demais, o tempo de espera influencia a ordem.

> [!IMPORTANT]Importante
> A demonstração usa os mesmos dados da fila regular. O botão **Limpar** apaga todos os tickets salvos.

## Estrutura

```text
index.html        Interface principal
script/           Lógica da fila, interface, menus, diálogos e demonstração
popover/          Formulários e menus carregados dinamicamente
style/            Estilos e temas
media/            Ícones
```

## Documentação

O documento acadêmico **Projeto Integrador II - Sistema de Triagem Médica** descreve o referencial teórico, os
requisitos e as regras completas do projeto.
