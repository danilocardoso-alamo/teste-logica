# Como criar um jogo na coleção "Jogos de lógica do Danilo"

A página final (`jogos-de-logica.html`) é gerada por `node build.js`, que junta:
`src/shell.html` + `src/kit.css` + `src/kit-core.js` + `src/kit.js` + `src/games/*.js`.

Cada jogo é **um arquivo** `src/games/<id>.js`. O modelo de referência é `src/games/hanoi.js` — leia-o inteiro antes de começar.

## Estrutura do arquivo

```js
/* Nome do jogo — frase curta */
(() => {
  // 1) Lógica pura: geração de desafios, regras, solucionador. Nada de DOM aqui.
  const K = typeof JogosCore !== 'undefined' ? JogosCore : require('../kit-core.js');
  const logic = { /* funções puras */ };
  if (typeof module !== 'undefined' && module.exports) { module.exports = logic; return; } // Node: só exporta a lógica

  // 2) Interface
  Jogos.register({ ... });
})();
```

Assim dá para testar a lógica no Node: `const L = require('./src/games/<id>.js')`.

## Jogos.register(def)

| Campo | O que é |
|---|---|
| `id` | identificador curto, sem espaços (vira `#id` no endereço e prefixo dos recordes) |
| `name`, `tagline` | nome e frase curta (aparecem no menu e no topo do jogo) |
| `icon` | SVG em texto, `viewBox="0 0 64 64"`, no estilo da coleção (formas arredondadas, contorno `#2A2433` de 1.6) |
| `css` | CSS do jogo em texto. **Todas as classes com prefixo do jogo** (ex.: `.hn-` na Torre de Hanói) para não colidir com outros jogos |
| `metric` | `{ label: 'Movimentos', unit: ['movimento','movimentos'], format: 'count' }` ou `format: 'time'` (segundos, exibido m:ss). O recorde é sempre "menor é melhor" |
| `generated` | `true` se cada partida sorteia um desafio novo (mostra o botão "Novo desafio") |
| `freshRestart` | `true` se "Recomeçar" deve sortear outro desafio (jogos de informação escondida, em que quem perdeu já viu a resposta) |
| `levels` | **4 níveis**: `{ id: 'facil'|'medio'|'dificil'|'muito', name: 'Fácil'|'Médio'|'Difícil'|'Muito difícil', sub, blurb, ...parâmetros }`. `sub` é a linha curta do botão (HTML; use `<span class="cnt">…</span>` para a parte que some no celular), `blurb` é uma frase para o painel de regras |
| `rules(level)` | lista `[{ key, icon?, html, novo? }]` para o painel "Regras". `key` permite destacar a regra quebrada |
| `how` | texto (HTML) "como jogar", ou função `(level) => texto` |
| `mount(ctx)` | monta o nível dentro de `ctx.board` e devolve o controlador (abaixo) |

## ctx (recebido em mount)

- `ctx.board` — elemento onde o jogo desenha. Já vem vazio, com fundo e padding de 18px (12px no celular).
- `ctx.level`, `ctx.levelIndex`, `ctx.seed`, `ctx.rng` — **use sempre `ctx.rng` para sortear** (`rng()`, `rng.int(n)`, `rng.range(a,b)`, `rng.pick(arr)`, `rng.shuffle(arr)`). "Recomeçar" remonta com a mesma semente, então o desafio precisa sair igual.
- `ctx.h(tag, attrs, ...filhos)` / `ctx.svg(...)` — criam elementos (`attrs`: `class`, `style` como objeto — aceita `--variaveis` —, `onclick`, `html`, etc.).
- `ctx.say(titulo, texto)` — mensagem base da barra (estado atual / próximo passo).
- `ctx.warn(titulo, texto, ruleKey?)` — aviso temporário (some sozinho); `ruleKey` pisca a regra.
- `ctx.hint(titulo, texto)` — mostra uma dica (conta como dica usada; partida com dica não vale recorde). Some quando `setMoves` muda o número; no formato tempo, use `ctx.clearHint()`.
- `ctx.clearWarn()` — apaga o aviso na hora (ele também some sozinho numa jogada seguinte, nos jogos contados em movimentos).
- `ctx.setMoves(n)` — atualiza o contador (ou os segundos, no formato tempo).
- `ctx.setMin(n, rotulo?)` — mostra "Mínimo possível" (ou outro rótulo, ex.: 'Pesagens permitidas'). `null` esconde a caixa.
- `ctx.controls({ undo: bool, hint: bool })` — habilita/desabilita Desfazer e Dica.
- `ctx.primary(rotulo | null, { disabled })` — botão principal laranja (ex.: "Pesar", "Testar senha"). Clique chama `ctrl.onPrimary()`.
- `ctx.busy(bool)` — trava os botões durante animações.
- `ctx.win({ score?, title?, text?, perfect? })` — vitória. `score` é o valor do recorde (padrão: o último `setMoves`). Sem `text`, o kit escreve a mensagem padrão comparando com o mínimo.
- `ctx.fail({ title, text, rule })` — derrota/regra quebrada. Se o controlador tiver `onUndo`, aparece "Desfazer jogada" (o kit volta o status para jogo antes de chamar `onUndo`).
- `ctx.resume()` — volta de `fail` para jogo, se precisar.
- `ctx.status` — `'play' | 'won' | 'fail'`.
- `ctx.later(fn, ms)`, `ctx.every(fn, ms)`, `ctx.listen(alvo, evento, fn)`, `ctx.onResize(fn(larguraDoBoard))` — **use sempre estes** em vez de setTimeout/setInterval/addEventListener/ResizeObserver diretos: o kit desliga tudo ao trocar de nível ou sair.
- `ctx.reduced` — `true` se a pessoa pediu menos movimento: encurte animações.
- `ctx.INK` (`#2A2433`), `ctx.OL` (atributos de contorno para SVG), `ctx.PIECES` (8 cores de peças com símbolo), `ctx.core` (utilidades: `bfs`, `bfsAll`, `fmtTime`, `plural`, `rng`).

## Controlador (retorno de mount)

`{ onHint?, onUndo?, onPrimary?, destroy? }` — sem `onHint` o botão Dica some; sem `onUndo`, o Desfazer some. "Recomeçar", "Novo desafio", troca de nível e "Próximo nível" são do kit (ele remonta o nível).

## Padrões de qualidade

- **4 níveis** com dificuldade que cresce de verdade; quando existe mínimo exato (movimentos), calcule com solucionador e mostre em `sub` e `setMin`.
- Mensagens em português do Brasil, voz ativa, dizendo o que fazer ("Toque em…"). Erros explicam o que houve e como resolver.
- Toque/clique primeiro (alvos de pelo menos 40px), teclado quando fizer sentido, foco visível (`outline: 3px solid var(--focus)`).
- Responsivo: o tabuleiro cabe em 340px de largura sem rolagem lateral; use `ctx.onResize` para calcular tamanhos.
- Tema claro e escuro: cores de interface sempre por tokens (`--ink`, `--ink-2`, `--panel`, `--line`, `--board`, `--board-2`, `--board-line`, `--accent`, `--ok`, `--danger`, `--hint`, `--focus`); peças podem ter cor fixa, sempre com contorno `#2A2433`.
- Estilo visual da coleção: ilustração plana, cantos arredondados, contorno escuro de 1.6px, fontes "Baloo 2" (títulos/números grandes) e "Nunito" (texto). Nada de emoji como ícone.
- Nunca escreva a sequência `</script` dentro do arquivo.
