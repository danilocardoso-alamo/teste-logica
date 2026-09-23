/* Quebra-cabeça deslizante — deslize as peças pelo espaço vazio até deixá-las em ordem */
(() => {
  // ---------- lógica pura (testável no Node) ----------
  // Quadro 3×3: b[c] = número da peça na casa c (casas 0 a 8, da esquerda para a direita, de cima para baixo); 0 é o vazio.
  // 1 movimento = uma peça deslizada uma casa. As distâncias exatas saem de uma busca em largura feita uma vez,
  // a partir do quadro arrumado, sobre as 181.440 posições alcançáveis (tabela de 9! bytes indexada pelo posto da permutação).
  const N = 3, CELLS = N * N;
  const GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  const FACT = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880];
  const FAR = 255;                                   // na tabela: posição que não dá para arrumar
  // Faixas de mínimo por nível. No Muito difícil há só 223 posições (221 com 30 e 2 com 31): sorteia entre elas com peso igual.
  const LEVELS = {
    facil: { lo: 8, hi: 12 }, medio: { lo: 16, hi: 20 }, dificil: { lo: 24, hi: 28 }, muito: { lo: 30, hi: 31, porEstado: true },
  };
  const ADJ = Array.from({ length: CELLS }, (_, c) => {
    const r = Math.floor(c / N), k = c % N, a = [];
    if (r > 0) a.push(c - N);
    if (k > 0) a.push(c - 1);
    if (k < N - 1) a.push(c + 1);
    if (r < N - 1) a.push(c + N);
    return a;
  });

  // Posto de Lehmer da permutação (0 .. 9!-1) e o caminho inverso.
  // Da direita para a esquerda: `mask` guarda os números já vistos; POP conta quantos são menores que o atual.
  const POP = new Uint8Array(1 << CELLS);
  for (let m = 1; m < POP.length; m++) POP[m] = POP[m >> 1] + (m & 1);
  function rank(b) {
    let mask = 0, r = 0;
    for (let i = CELLS - 1; i >= 0; i--) {
      const v = b[i];
      r += POP[mask & ((1 << v) - 1)] * FACT[CELLS - 1 - i];
      mask |= 1 << v;
    }
    return r;
  }
  function unrankInto(r, b, used) {
    used.fill(0);
    for (let i = 0; i < CELLS; i++) {
      const f = FACT[CELLS - 1 - i];
      let s = Math.floor(r / f);
      r -= s * f;
      for (let v = 0; v < CELLS; v++) if (!used[v] && s-- === 0) { b[i] = v; used[v] = 1; break; }
    }
    return b;
  }
  const unrank = r => unrankInto(r, new Array(CELLS), new Uint8Array(CELLS));

  // Tabela de distâncias até o quadro arrumado (feita uma vez, sob demanda; ~20 ms no Node).
  // A fila guarda cada quadro compactado em 32 bits (casas 0–7, 4 bits cada; a casa 8 é o número que falta).
  let DIST = null, COUNTS = null;
  function table() {
    if (DIST) return DIST;
    const dist = new Uint8Array(FACT[CELLS]).fill(FAR);
    const queue = new Uint32Array(FACT[CELLS] / 2);  // metade das permutações é alcançável
    const b = GOAL.slice(), counts = [];
    const pack = () => { let p = 0; for (let i = 0; i < CELLS - 1; i++) p |= b[i] << (4 * i); return p; };
    let head = 0, tail = 0;
    dist[rank(GOAL)] = 0;
    queue[tail++] = pack();
    for (let d = 0; head < tail; d++) {            // uma camada da busca por vez: todas com distância d
      const end = tail;
      counts[d] = end - head;
      while (head < end) {
        const p = queue[head++];
        let sum = 0, z = CELLS - 1;
        for (let i = 0; i < CELLS - 1; i++) { const v = (p >>> (4 * i)) & 15; b[i] = v; sum += v; if (!v) z = i; }
        b[CELLS - 1] = (CELLS * (CELLS - 1)) / 2 - sum;
        for (const n of ADJ[z]) {
          b[z] = b[n]; b[n] = 0;
          const rn = rank(b);
          if (dist[rn] === FAR) { dist[rn] = d + 1; queue[tail++] = pack(); }
          b[n] = b[z]; b[z] = 0;
        }
      }
    }
    DIST = dist;
    COUNTS = counts;
    return dist;
  }
  const counts = () => { table(); return COUNTS.slice(); };
  // Menor número de movimentos até arrumar; -1 se a posição não tem solução.
  function distance(b) { const d = table()[rank(b)]; return d === FAR ? -1 : d; }
  const isSolved = b => b.every((t, i) => t === GOAL[i]);
  // Largura ímpar: tem solução se o número de inversões entre as peças for par.
  function solvable(b) {
    let inv = 0;
    for (let i = 0; i < CELLS; i++) for (let j = i + 1; j < CELLS; j++) if (b[i] && b[j] && b[i] > b[j]) inv++;
    return inv % 2 === 0;
  }
  // Sentido em que anda a peça que sai da casa `from` para a casa `to`.
  const dirOf = (from, to) => (to - from === -N ? 'cima' : to - from === N ? 'baixo' : to - from === -1 ? 'esquerda' : 'direita');

  // Tocar na casa `cell`: se estiver na linha ou coluna do vazio, as peças entre ela e o vazio andam uma casa na direção dele.
  function slide(b, cell) {
    const z = b.indexOf(0);
    if (cell === z || cell < 0 || cell >= CELLS) return null;
    let step;
    if (Math.floor(cell / N) === Math.floor(z / N)) step = cell > z ? 1 : -1;
    else if (cell % N === z % N) step = cell > z ? N : -N;
    else return null;
    const nb = b.slice(), moved = [];
    for (let p = z; p !== cell; p += step) { nb[p] = nb[p + step]; moved.push(nb[p]); }
    nb[cell] = 0;
    return { board: nb, moved, count: moved.length, from: z, to: cell, dir: dirOf(z + step, z) };
  }

  // Próximo movimento de uma solução ótima: { cell, tile, dir, left } (left = movimentos que faltam, contando este).
  function bestMove(b) {
    const d = distance(b);
    if (d <= 0) return null;
    const z = b.indexOf(0), nb = b.slice();
    for (const n of ADJ[z]) {
      nb[z] = nb[n]; nb[n] = 0;
      const dn = distance(nb);
      nb[n] = nb[z]; nb[z] = 0;
      if (dn === d - 1) return { cell: n, tile: b[n], dir: dirOf(n, z), left: d };
    }
    return null;
  }
  // Solução ótima completa: lista das peças a deslizar, em ordem.
  function solve(b) {
    const path = [];
    let cur = b.slice();
    for (let m = bestMove(cur); m; m = bestMove(cur)) { path.push(m.tile); cur = slide(cur, m.cell).board; }
    return path;
  }

  // Sorteia um quadro com mínimo dentro da faixa do nível (mesma semente → mesmo quadro).
  // Fácil/Médio/Difícil: primeiro o mínimo (uniforme na faixa), depois uma posição com esse mínimo.
  function generate(rng, lv) {
    const dist = table();
    let want = -1, k;
    if (lv.porEstado) {
      let total = 0;
      for (let d = lv.lo; d <= lv.hi; d++) total += COUNTS[d] || 0;
      k = rng.int(total);
    } else {
      want = rng.range(lv.lo, lv.hi);
      k = rng.int(COUNTS[want]);
    }
    for (let r = 0; r < dist.length; r++) {
      const d = dist[r];
      if (want >= 0 ? d === want : d >= lv.lo && d <= lv.hi) { if (k-- === 0) return unrank(r); }
    }
    return GOAL.slice();
  }

  const logic = { N, GOAL, LEVELS, rank, unrank, table, counts, distance, isSolved, solvable, dirOf, slide, bestMove, solve, generate };
  if (typeof module !== 'undefined' && module.exports) { module.exports = logic; return; }

  // ---------- interface ----------
  const INK = '#2A2433';
  const ROW = ['#F8C585', '#A3DBB5', '#B1C8F4'];     // cor suave da linha de destino: 1–3, 4–6, 7–8
  const WOOD = '#A86E3A', WELL = '#6B4424';
  const PARA = { cima: 'para cima', baixo: 'para baixo', esquerda: 'para a esquerda', direita: 'para a direita' };
  // Setas: a peça vizinha ao vazio anda no sentido da seta. [linha, coluna] da peça em relação ao vazio.
  const KEYS = {
    ArrowLeft: [0, 1, 'esquerda', 'à direita'], ArrowRight: [0, -1, 'direita', 'à esquerda'],
    ArrowUp: [1, 0, 'cima', 'abaixo'], ArrowDown: [-1, 0, 'baixo', 'acima'],
  };

  const iconTiles = (x0, step, size, rx, numbers) => {
    let rects = '', texts = '';
    GOAL.forEach((g, i) => {
      const t = numbers ? numbers[i] : g;       // peça desenhada na casa i (0 = vazio)
      if (!t) return;
      const x = x0 + (i % N) * step, y = x0 + Math.floor(i / N) * step;
      rects += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${rx}" fill="${ROW[Math.floor((t - 1) / N)]}"/>`;
      if (numbers) texts += `<text x="${x + size / 2}" y="${y + size * 0.8}">${t}</text>`;
    });
    return { rects, texts };
  };
  const ICON = (() => {
    const { rects, texts } = iconTiles(9.5, 16, 13, 3.5, [1, 2, 3, 4, 5, 6, 7, 0, 8]);
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="${INK}" stroke-width="1.6" stroke-linejoin="round">
    <rect x="3" y="3" width="58" height="58" rx="12" fill="${WOOD}"/><rect x="8" y="8" width="48" height="48" rx="7" fill="${WELL}"/>${rects}</g>
    <g fill="${INK}" font-family="'Baloo 2','Nunito',sans-serif" font-weight="800" font-size="11" text-anchor="middle">${texts}</g></svg>`;
  })();
  const ICO_UMA = `<svg viewBox="0 0 34 34"><g stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"><rect x="2" y="6" width="30" height="17" rx="4.5" fill="${WELL}"/><rect x="4" y="8" width="13" height="13" rx="3.5" fill="${ROW[0]}"/></g><path d="M8 29h17m-4-4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const ICO_FILA = `<svg viewBox="0 0 34 34"><g stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"><rect x="1" y="7" width="32" height="14" rx="4" fill="${WELL}"/><rect x="2.8" y="8.8" width="9.4" height="10.4" rx="2.6" fill="${ROW[1]}"/><rect x="12.3" y="8.8" width="9.4" height="10.4" rx="2.6" fill="${ROW[2]}"/></g><path d="M5 28.5h22m-4-4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const ICO_META = (() => {
    const { rects } = iconTiles(3.6, 9.4, 8, 2.2);
    return `<svg viewBox="0 0 34 34"><g stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"><rect x="1.8" y="1.8" width="30.4" height="30.4" rx="5" fill="${WELL}"/>${rects}</g></svg>`;
  })();

  const CSS = `
  .dz-wrap{display:flex;justify-content:center;width:100%}
  .dz-frame{position:relative;flex:none;width:var(--dz-size,300px);height:var(--dz-size,300px);border-radius:calc(var(--dz-size,300px) * .085);background:${WOOD};box-shadow:0 0 0 1.6px ${INK},inset 0 -6px 0 rgba(0,0,0,.16),inset 0 4px 0 rgba(255,255,255,.2),0 18px 32px -22px rgba(30,16,4,.8)}
  .dz-well{position:absolute;inset:var(--dz-pad,12px);border-radius:calc(var(--dz-size,300px) * .05);background:${WELL};box-shadow:inset 0 0 0 1.6px ${INK},inset 0 6px 10px rgba(0,0,0,.35)}
  .dz-tile{position:absolute;left:0;top:0;width:var(--dz-t,88px);height:var(--dz-t,88px);margin:0;padding:0;display:grid;place-items:center;border-radius:calc(var(--dz-t,88px) * .2);border:1.6px solid ${INK};background:var(--c);color:${INK};font:800 calc(var(--dz-t,88px) * .52)/1 "Baloo 2","Nunito",system-ui,sans-serif;box-shadow:inset 0 -5px 0 rgba(0,0,0,.13),inset 0 3px 0 rgba(255,255,255,.55);cursor:default;-webkit-tap-highlight-color:transparent;transition:transform var(--dz-dur,130ms) cubic-bezier(.25,.75,.35,1),filter .15s;will-change:transform}
  .dz-tile.dz-can{cursor:pointer}
  @media (hover:hover){.dz-tile.dz-can:hover{filter:brightness(1.06)}}
  .dz-tile:focus-visible{outline:3px solid var(--focus);outline-offset:2px;z-index:3}
  .dz-num{display:block;pointer-events:none}
  .dz-tile::after{content:"";position:absolute;top:8%;right:8%;width:max(8px,calc(var(--dz-t,88px) * .11));height:max(8px,calc(var(--dz-t,88px) * .11));border-radius:50%;background:#3FA66B;border:1.6px solid ${INK};transform:scale(0);transition:transform .2s ease-out}
  .dz-tile.dz-ok::after{transform:scale(1)}
  .dz-tile.dz-hinted{z-index:2;box-shadow:0 0 0 3px var(--hint),0 0 16px var(--hint),inset 0 -5px 0 rgba(0,0,0,.13),inset 0 3px 0 rgba(255,255,255,.55)}
  .dz-tile.dz-go{animation:dz-nudge 1s ease-in-out infinite}
  .dz-tile.dz-nope{animation:dz-shake .38s ease-in-out}
  .dz-frame.dz-instant .dz-tile{transition:none}
  .dz-frame.dz-won .dz-tile{animation:dz-hop .5s ease-out both;animation-delay:calc(var(--i) * 60ms)}
  @keyframes dz-shake{20%{translate:-5px 0}40%{translate:5px 0}60%{translate:-3px 0}80%{translate:3px 0}}
  @keyframes dz-nudge{0%,100%{translate:0 0}50%{translate:var(--nx,0px) var(--ny,0px)}}
  @keyframes dz-hop{0%,100%{translate:0 0}40%{translate:0 -9px}}
  `;

  Jogos.register({
    id: 'deslizante',
    name: 'Quebra-cabeça deslizante',
    tagline: 'Deslize as peças pelo espaço vazio até deixá-las em ordem, de 1 a 8.',
    icon: ICON,
    css: CSS,
    metric: { label: 'Movimentos', unit: ['movimento', 'movimentos'] },
    generated: true,
    levels: [
      { id: 'facil', name: 'Fácil', blurb: 'Soluções curtas para pegar o jeito.' },
      { id: 'medio', name: 'Médio', blurb: 'Pense algumas jogadas à frente antes de deslizar.' },
      { id: 'dificil', name: 'Difícil', blurb: 'Arrumar uma linha costuma bagunçar a outra.' },
      { id: 'muito', name: 'Muito difícil', blurb: 'As posições mais difíceis que existem no 3×3.' },
    ].map(l => Object.assign(l, LEVELS[l.id], { sub: `<span class="cnt">3×3 · </span>mín. ${LEVELS[l.id].lo}–${LEVELS[l.id].hi}` })),
    rules: () => [
      { key: 'deslizar', icon: ICO_UMA, html: 'Deslize para o <b>espaço vazio</b> uma peça vizinha a ele: de cima, de baixo ou de um dos lados.' },
      { key: 'fila', icon: ICO_FILA, html: 'Uma peça na <b>mesma linha ou coluna</b> do vazio empurra junto as que estão no caminho. Cada peça que anda conta <b>1 movimento</b>.' },
      { key: 'meta', icon: ICO_META, html: 'Deixe as peças <b>em ordem</b>, de 1 a 8, da esquerda para a direita e de cima para baixo, com o vazio no canto de baixo à direita.' },
    ],
    how: 'Toque em uma peça na linha ou na coluna do espaço vazio para deslizá-la até ele. No teclado, as <b>setas</b> deslizam a peça vizinha ao vazio no sentido da seta: <b>←</b> leva para a esquerda a peça que está à direita do vazio. A cor de cada peça mostra a linha onde ela termina, e um ponto verde aparece quando ela está no lugar certo.',

    mount(ctx) {
      const { h } = ctx, lv = ctx.level;
      const start = generate(ctx.rng, lv);
      const min = distance(start);
      let board = start.slice(), moves = 0, solved = false, hint = null, geo = null;
      const history = [];                  // { blank, count }: casa de onde o vazio saiu e quantas peças andaram
      ctx.setMin(min);

      const well = h('div', { class: 'dz-well' });
      const frame = h('div', { class: 'dz-frame', role: 'group', 'aria-label': 'Quadro de 3 por 3 casas' }, well);
      const tiles = [null];
      for (let t = 1; t < CELLS; t++) {
        tiles[t] = h('button', {
          type: 'button', class: 'dz-tile', style: { '--c': ROW[Math.floor((t - 1) / N)], '--i': t - 1 }, onclick: () => tap(t),
        }, h('span', { class: 'dz-num', 'aria-hidden': 'true' }, String(t)));
        well.append(tiles[t]);
      }
      const wrap = h('div', { class: 'dz-wrap' }, frame);

      // Quadro quadrado: ocupa a largura livre do tabuleiro, até 400px (o contorno de 1.6px fica por fora).
      function layout(w) {
        const cs = getComputedStyle(ctx.board);
        const free = w - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0) - 4;
        const size = Math.floor(Math.max(180, Math.min(free, 400)));
        const pad = Math.round(size * 0.045), gap = Math.max(4, Math.round(size * 0.02));
        const step = (size - 2 * pad) / N;
        geo = { step, gap };
        frame.style.setProperty('--dz-size', size + 'px');
        frame.style.setProperty('--dz-pad', pad + 'px');
        frame.style.setProperty('--dz-t', (step - gap).toFixed(2) + 'px');
        frame.classList.add('dz-instant');
        render();
        void frame.offsetWidth;
        frame.classList.remove('dz-instant');
      }

      function render() {
        const z = board.indexOf(0), zr = Math.floor(z / N), zc = z % N;
        let ok = 0;
        board.forEach((t, cell) => {
          if (!t) return;
          const el = tiles[t], r = Math.floor(cell / N), c = cell % N;
          const right = cell === t - 1, hinted = !!hint && hint.tile === t;
          if (right) ok++;
          if (geo) el.style.transform = `translate(${(c * geo.step + geo.gap / 2).toFixed(2)}px, ${(r * geo.step + geo.gap / 2).toFixed(2)}px)`;
          el.classList.toggle('dz-ok', right);
          el.classList.toggle('dz-can', !solved && (r === zr || c === zc));
          el.classList.toggle('dz-hinted', hinted);
          el.classList.toggle('dz-go', hinted && !ctx.reduced);
          if (hinted) {                      // empurrãozinho na direção do vazio
            el.style.setProperty('--nx', (zc - c) * 5 + 'px');
            el.style.setProperty('--ny', (zr - r) * 5 + 'px');
          }
          el.setAttribute('aria-label', `Peça ${t}, linha ${r + 1}, coluna ${c + 1}${right ? ', no lugar certo' : ''}`);
        });
        ctx.controls({ undo: history.length > 0 && !solved, hint: !solved });
        if (solved || ctx.status !== 'play') return;
        if (!moves) ctx.say('Sua vez', 'Toque em uma peça vizinha ao espaço vazio para deslizá-la até ele.');
        else ctx.say('Continue', `Peças no lugar certo: ${ok} de 8.`);
      }

      function tap(t) {
        if (solved || ctx.status !== 'play') return;
        const res = slide(board, board.indexOf(t));
        if (!res) {
          ctx.retrigger(tiles[t], 'dz-nope');
          return ctx.warn('Essa peça não pode andar', `A peça ${t} não está na linha nem na coluna do espaço vazio. Toque em uma que esteja.`, 'deslizar');
        }
        history.push({ blank: res.from, count: res.count });
        apply(res.board, res.count);
      }

      function apply(next, delta) {
        board = next;
        moves += delta;
        hint = null;
        frame.style.setProperty('--dz-dur', ctx.reduced ? '0ms' : '130ms');
        ctx.setMoves(moves);
        if (isSolved(board)) {
          solved = true;
          render();
          ctx.later(() => { if (!ctx.reduced) frame.classList.add('dz-won'); ctx.win(); }, ctx.reduced ? 0 : 180);
        } else render();
      }

      layout(ctx.board.clientWidth);       // antes de entrar na página: o quadro já nasce no tamanho e na arrumação certos
      ctx.board.append(wrap);
      ctx.onResize(layout);

      ctx.listen(window, 'keydown', e => {
        const k = KEYS[e.key];
        if (!k || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
        if (solved || ctx.status !== 'play') return;
        e.preventDefault();
        const z = board.indexOf(0), r = Math.floor(z / N) + k[0], c = z % N + k[1];
        if (r < 0 || r >= N || c < 0 || c >= N) return ctx.warn(`Nenhuma peça vai ${PARA[k[2]]}`, `Não há peça ${k[3]} do espaço vazio. Use outra seta.`);
        tap(board[r * N + c]);
      });

      return {
        onHint() {
          if (solved) return;
          const m = bestMove(board);
          if (!m) return;
          hint = m;
          render();
          ctx.hint('Dica', `Deslize a peça ${m.tile} ${PARA[m.dir]}. Daqui, ${m.left === 1 ? 'falta 1 movimento' : `faltam ${m.left} movimentos`}.`);
        },
        onUndo() {
          if (solved) return;
          const last = history.pop();
          if (!last) return;
          apply(slide(board, last.blank).board, -last.count);
        },
      };
    },
  });
})();
