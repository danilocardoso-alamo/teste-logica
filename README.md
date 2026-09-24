# Jogos de lógica do Danilo

Coleção de jogos de raciocínio lógico em uma página só, cada jogo com quatro níveis (Fácil, Médio, Difícil e Muito difícil), dica, desfazer e recorde por nível.

- **Para jogar:** abra `index.html` no navegador.
- **Travessia do Rio sozinha:** `index-2.html` (a primeira versão, independente da coleção, sem os níveis NG+ e Danilo).

## Jogos

| Jogo | Arquivo | Ideia |
|---|---|---|
| Travessia do Rio | `travessia.js` | Levar família, policial e ladrão pela jangada sem quebrar as regras (sem dicas em nenhum nível; tem ainda os níveis NG+ e Danilo, em que quebrar uma regra faz recomeçar do início; o Danilo tem uma ilha no meio do rio, correnteza e mínimo de 50 travessias) |
| Torre de Hanói | `hanoi.js` | Mover a torre, um disco por vez, sem pôr maior sobre menor |
| Moeda falsa | `balanca.js` | Achar a moeda falsa na balança com poucas pesagens (a balança não deixa chutar) |
| Jarras d'água | `jarras.js` | Medir uma quantidade exata enchendo, esvaziando e despejando |
| Senha secreta | `senha.js` | Descobrir a sequência de cores pelas pistas de acerto |
| Trânsito | `transito.js` | Deslizar carros e tirar o vermelho do pátio |
| Luzes | `luzes.js` | Apagar todas as lâmpadas; cada toque inverte a vizinhança |
| Sudoku | `sudoku.js` | 4×4, 6×6 e 9×9 com solução única |
| Quebra-cabeça deslizante | `deslizante.js` | Ordenar as peças pelo espaço vazio |
| Rainhas | `rainhas.js` | Uma rainha por linha, coluna e região, sem se tocarem |
| Quem mora onde? | `quem-mora-onde.js` | Deduzir, pelas pistas, quem mora em cada casa |

## Estrutura

```
build.js                 junta tudo em index.html
src/shell.html           esqueleto da página
src/kit.css              visual comum (cores, tema claro/escuro, botões, níveis, painel de regras)
src/kit-core.js          utilidades puras (sorteio com semente, busca em largura, formatação)
src/kit.js               menu, tela de jogo, níveis, recordes e barra de ações
src/games/<id>.js        um arquivo por jogo
src/COMO-CRIAR-UM-JOGO.md  guia para criar ou alterar jogos
```

## Gerar a página

Depois de alterar qualquer arquivo em `src/`, rode:

```bash
node build.js
```

Para testar só alguns jogos: `node build.js --only=hanoi,travessia`.

A lógica de cada jogo pode ser testada no Node sem navegador: `require('./src/games/hanoi.js')` devolve as funções puras do jogo.
