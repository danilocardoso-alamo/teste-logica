/* Luzes — cada toque inverte uma lâmpada e as vizinhas; apague todas */
(() => {
  // ---------- lógica pura (testável no Node) ----------
  // Tabuleiro: array com n*n posições, linha a linha; 1 = acesa, 0 = apagada.
  const K = typeof JogosCore !== 'undefined' ? JogosCore : require('../kit-core.js');

  // taps: quantos toques distintos são sorteados a partir do tabuleiro apagado.
  // minFloor: mínimo aceito. No 4×4 e no 5×5 alguns sorteios têm atalhos (soluções mais curtas
  // que os toques usados) e ficariam fáceis demais para o nível; esses são sorteados de novo.
  const LEVELS = [
    { id: 'facil', name: 'Fácil', n: 3, taps: [3, 4], minFloor: 3, blurb: 'Grade 3×3 para pegar o jeito.' },
    { id: 'medio', name: 'Médio', n: 4, taps: [5, 6], minFloor: 4, blurb: 'Grade 4×4: às vezes o caminho mais curto não é o mais óbvio.' },
    { id: 'dificil', name: 'Difícil', n: 5, taps: [8, 9], minFloor: 8, blurb: 'Grade 5×5, o tamanho do brinquedo clássico.' },
    { id: 'muito', name: 'Muito difícil', n: 6, taps: [11, 13], minFloor: 11, blurb: 'Grade 6×6: 36 lâmpadas e soluções longas.' },
  ];

  // Posições que um toque em i inverte: ela mesma e as vizinhas de cima, de baixo, da esquerda e da direita.
  function neighborsOf(n, i) {
    const r = Math.floor(i / n), c = i % n, out = [i];
    if (r > 0) out.push(i - n);
    if (r < n - 1) out.push(i + n);
    if (c > 0) out.push(i - 1);
    if (c < n - 1) out.push(i + 1);
    return out;
  }
  function press(board, n, i) {
    const b = board.slice();
    for (const j of neighborsOf(n, i)) b[j] ^= 1;
    return b;
  }
  const litCount = board => board.reduce((s, v) => s + v, 0);

  // Sistema A·x = b em GF(2): A[r][j] = 1 se tocar em j inverte r (A é simétrica), b = lâmpadas acesas,
  // x = lâmpadas a tocar. Escalonamos [A | I] uma vez por tamanho (Gauss-Jordan): T·A = R, com R na forma
  // escalonada reduzida. Guardamos T, as colunas-pivô e uma base do espaço nulo de A (toques que não mudam nada).
  const systems = {};
  function system(n) {
    if (systems[n]) return systems[n];
    const N = n * n, M = [];
    for (let r = 0; r < N; r++) {
      const row = new Uint8Array(2 * N);
      for (const j of neighborsOf(n, r)) row[j] = 1;
      row[N + r] = 1;
      M.push(row);
    }
    const piv = [], free = [];
    let rank = 0;
    for (let c = 0; c < N; c++) {
      let p = rank;
      while (p < N && !M[p][c]) p++;
      if (p === N) { free.push(c); continue; }        // coluna livre: gera uma direção do espaço nulo
      [M[rank], M[p]] = [M[p], M[rank]];
      const P = M[rank];
      for (let r = 0; r < N; r++) {
        if (r === rank || !M[r][c]) continue;
        const R = M[r];
        for (let k = c; k < 2 * N; k++) R[k] ^= P[k];  // antes da coluna c a linha-pivô só tem zeros
      }
      piv.push(c);
      rank++;
    }
    const T = M.map(row => row.slice(N));
    const basis = free.map(f => {
      const v = new Uint8Array(N);
      v[f] = 1;
      for (let k = 0; k < rank; k++) if (M[k][f]) v[piv[k]] = 1;
      return v;
    });
    return (systems[n] = { N, rank, piv, T, basis });
  }

  // Menor conjunto de toques que apaga o tabuleiro: uma solução particular somada a cada combinação da base
  // do espaço nulo (16 no 4×4, 4 no 5×5; o 3×3 e o 6×6 têm solução única) — fica a de menos toques.
  // Devolve as posições em ordem crescente, ou null se o tabuleiro não tiver solução.
  function solve(board, n) {
    const { N, rank, piv, T, basis } = system(n);
    const rhs = new Uint8Array(N);
    for (let r = 0; r < N; r++) {
      const t = T[r];
      let s = 0;
      for (let k = 0; k < N; k++) if (t[k] && board[k]) s ^= 1;
      rhs[r] = s;
    }
    for (let r = rank; r < N; r++) if (rhs[r]) return null;   // equação 0 = 1: sem solução
    const x0 = new Uint8Array(N);
    for (let k = 0; k < rank; k++) x0[piv[k]] = rhs[k];
    let best = null, bestW = Infinity;
    for (let mask = 0; mask < 1 << basis.length; mask++) {
      const x = x0.slice();
      basis.forEach((v, b) => { if ((mask >> b) & 1) for (let k = 0; k < N; k++) x[k] ^= v[k]; });
      let w = 0;
      for (let k = 0; k < N; k++) w += x[k];
      if (w < bestW) { bestW = w; best = x; }
    }
    const out = [];
    for (let k = 0; k < N; k++) if (best[k]) out.push(k);
    return out;
  }

  // Sorteia um desafio aplicando toques distintos ao tabuleiro apagado (por isso sempre tem solução).
  // Descarta sorteios que voltam ao tabuleiro apagado e os que ficam abaixo do mínimo do nível.
  function generate({ n, taps, minFloor = 1 }, rng) {
    const N = n * n, cells = Array.from({ length: N }, (_, i) => i);
    let fallback = null;
    for (let tries = 0; tries < 300; tries++) {
      const k = rng.range(taps[0], taps[1]);
      const chosen = rng.shuffle(cells).slice(0, k).sort((a, b) => a - b);
      let board = new Array(N).fill(0);
      for (const c of chosen) board = press(board, n, c);
      if (!litCount(board)) continue;
      const solution = solve(board, n);
      const game = { board, taps: chosen, min: solution.length, solution };
      if (game.min >= minFloor) return game;
      if (!fallback || game.min > fallback.min) fallback = game;
    }
    if (fallback) return fallback;
    const c = Math.floor(N / 2), board = press(new Array(N).fill(0), n, c);
    return { board, taps: [c], min: 1, solution: [c] };
  }

  const logic = { LEVELS, neighborsOf, press, litCount, system, solve, generate };
  if (typeof module !== 'undefined' && module.exports) { module.exports = logic; return; }

  // ---------- interface ----------
  const ON = '#FFC83D', OFF = '#8792A4';
  // Grade 3×3 em SVG; `lit` diz quais estão acesas (linha a linha). Brilho = retângulo claro atrás das acesas.
  function miniGrid(lit, { x0, s, gap, rx, glow, shine }) {
    const f = v => Math.round(v * 100) / 100;
    const pos = i => [x0 + (i % 3) * (s + gap), x0 + Math.floor(i / 3) * (s + gap)];
    let out = '';
    lit.forEach((on, i) => {
      if (!on || !glow) return;
      const [x, y] = pos(i);
      out += `<rect x="${f(x - glow)}" y="${f(y - glow)}" width="${f(s + 2 * glow)}" height="${f(s + 2 * glow)}" rx="${f(rx + glow)}" fill="${ON}" opacity=".38" stroke="none"/>`;
    });
    lit.forEach((on, i) => {
      const [x, y] = pos(i);
      out += `<rect x="${f(x)}" y="${f(y)}" width="${s}" height="${s}" rx="${rx}" fill="${on ? ON : OFF}"/>`;
      if (shine) out += `<rect x="${f(x + s * 0.18)}" y="${f(y + s * 0.16)}" width="${f(s * 0.34)}" height="${f(s * 0.2)}" rx="${f(s * 0.1)}" fill="#FFFFFF" opacity="${on ? 0.75 : 0.28}" stroke="none"/>`;
    });
    return out;
  }
  const ICON = `<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round">
    <rect x="4" y="4" width="56" height="56" rx="13" fill="#3B4454"/>
    ${miniGrid([0, 1, 0, 1, 1, 0, 0, 0, 1], { x0: 9, s: 13, gap: 3.5, rx: 3.5, glow: 3, shine: true })}</g></svg>`;
  const SMALL = { x0: 2.5, s: 8, gap: 2.5, rx: 2.4 };   // casas centradas em 6.5, 17 e 27.5
  const TAP_DOT = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="2" fill="#2A2433" stroke="none"/>`;
  const ICO_TOQUE = `<svg viewBox="0 0 34 34"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round">${miniGrid([0, 1, 0, 1, 1, 1, 0, 1, 0], SMALL)}${TAP_DOT(17, 17)}</g></svg>`;
  const ICO_BORDA = `<svg viewBox="0 0 34 34"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round">${miniGrid([1, 1, 0, 1, 0, 0, 0, 0, 0], SMALL)}${TAP_DOT(6.5, 6.5)}</g></svg>`;
  const ICO_META = `<svg viewBox="0 0 34 34"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round">${miniGrid([0, 0, 0, 0, 0, 0, 0, 0, 0], SMALL)}</g>
    <path d="M9 17.5l5.5 5.5L26 11" fill="none" stroke="#2A2433" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9 17.5l5.5 5.5L26 11" fill="none" stroke="#3FA66B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const DARK = '--lz-off:#3B4555;--lz-off-top:rgba(255,255,255,.09);--lz-glow:rgba(255,182,46,.85);--lz-glow-k:.38;--lz-glow-s:2px;--lz-ring:#FFD35A';
  const CSS = `
  .lz-wrap{--lz-off:${OFF};--lz-off-top:rgba(255,255,255,.24);--lz-on:${ON};--lz-on-top:rgba(255,255,255,.5);--lz-on-low:rgba(176,92,0,.28);--lz-glow:rgba(255,166,26,.55);--lz-glow-k:.22;--lz-glow-s:1px;--lz-ring:#EE9410;display:flex;justify-content:center;width:100%}
  @media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .lz-wrap{${DARK}}}
  :root[data-theme="dark"] .lz-wrap{${DARK}}
  .lz-grid{display:flex;flex-direction:column;isolation:isolate;padding:var(--lz-pad,6px);border-radius:calc(var(--lz-cell,40px) * .3 + var(--lz-pad,6px));background:var(--board-2);border:1.6px solid var(--board-line);transition:border-color .3s,box-shadow .3s}
  .lz-grid.won{border-color:var(--ok);box-shadow:0 0 0 4px color-mix(in srgb,var(--ok) 20%,transparent)}
  .lz-row{display:flex}
  .lz-lamp{position:relative;flex:none;width:var(--lz-cell,40px);height:var(--lz-cell,40px);margin:0;padding:0;border:0;border-radius:28%;background:none;color:inherit;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
  .lz-grid.won .lz-lamp{cursor:default}
  .lz-lamp:focus{outline:none}
  .lz-bulb{position:absolute;inset:var(--lz-inset,3px);border-radius:26%;background-color:var(--lz-off);border:1.6px solid #2A2433;box-shadow:inset 0 -4px 0 rgba(0,0,0,.16),inset 0 3px 0 var(--lz-off-top),0 0 0 0 rgba(255,166,26,0);transition:background-color .18s ease var(--lz-d,0ms),box-shadow .26s ease var(--lz-d,0ms)}
  .lz-bulb::before{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(circle at 50% 46%,rgba(255,253,236,.95) 0,rgba(255,238,160,.6) 28%,rgba(255,222,110,0) 64%);opacity:0;transition:opacity .2s ease var(--lz-d,0ms)}
  .lz-bulb::after{content:"";position:absolute;left:14%;top:12%;width:28%;height:16%;border-radius:999px;background-color:rgba(255,255,255,.26);transform:rotate(-14deg);transition:background-color .2s ease var(--lz-d,0ms)}
  .lz-lamp.on .lz-bulb{background-color:var(--lz-on);box-shadow:inset 0 -4px 0 var(--lz-on-low),inset 0 3px 0 var(--lz-on-top),0 0 calc(var(--lz-cell,40px) * var(--lz-glow-k,.22)) var(--lz-glow-s,1px) var(--lz-glow)}
  .lz-lamp.on .lz-bulb::before{opacity:1}
  .lz-lamp.on .lz-bulb::after{background-color:rgba(255,255,255,.75)}
  .lz-lamp:focus-visible .lz-bulb{outline:3px solid var(--focus);outline-offset:max(1px,calc(var(--lz-inset,3px) - 3px))}
  @media (hover:hover){.lz-grid:not(.won) .lz-lamp:hover .lz-bulb{filter:brightness(1.07)}}
  .lz-lamp::before{content:"";position:absolute;inset:var(--lz-inset,3px);border-radius:26%;border:3px solid var(--lz-ring);opacity:0;pointer-events:none;z-index:2}
  .lz-lamp.lz-hit::before{animation:lz-ripple .5s ease-out}
  .lz-lamp.lz-hit .lz-bulb{animation:lz-hit .34s ease-out}
  .lz-lamp.lz-wave .lz-bulb{animation:lz-wave .34s ease-out var(--lz-d,0ms) backwards}
  .lz-lamp.lz-cheer .lz-bulb{animation:lz-cheer .5s ease-in-out var(--lz-d,0ms) backwards}
  .lz-lamp.hinted::after{content:"";position:absolute;left:50%;top:50%;width:28%;height:28%;border-radius:50%;background:var(--hint);border:1.6px solid #2A2433;box-shadow:0 0 0 3px rgba(255,255,255,.7),0 0 0 4.6px #2A2433;transform:translate(-50%,-50%);animation:lz-hint .8s ease-in-out infinite alternate;pointer-events:none;z-index:1}
  @keyframes lz-hit{0%{transform:scale(1)}35%{transform:scale(.86)}75%{transform:scale(1.05)}100%{transform:scale(1)}}
  @keyframes lz-wave{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}
  @keyframes lz-ripple{0%{opacity:.9;transform:scale(.92)}100%{opacity:0;transform:scale(1.55)}}
  @keyframes lz-cheer{0%,100%{transform:none}45%{transform:translateY(-5px) scale(1.05)}}
  @keyframes lz-hint{from{transform:translate(-50%,-50%) scale(.82)}to{transform:translate(-50%,-50%) scale(1.08)}}
  `;

  const MAX_CELL = { 3: 96, 4: 84, 5: 72, 6: 62 };   // tamanho da casa no desktop (px)
  const WAVE_MS = 70;                                 // atraso da onda nas vizinhas
  const NOTES = {
    base: 'Toque numa lâmpada para inverter ela e as vizinhas.',
    up: 'Acender algumas luzes às vezes faz parte do caminho. Continue.',
    one: 'Falta uma! Lembre que o toque também inverte as vizinhas.',
    undo: 'Toque desfeito. Escolha outra lâmpada.',
  };

  Jogos.register({
    id: 'luzes',
    name: 'Luzes',
    tagline: 'Cada toque inverte a lâmpada e as vizinhas. Apague todas as luzes.',
    icon: ICON,
    css: CSS,
    metric: { label: 'Toques', unit: ['toque', 'toques'] },
    generated: true,
    levels: LEVELS.map(l => Object.assign({}, l, { sub: `<span class="cnt">${l.n}×${l.n} · </span>mín. ${l.minFloor}–${l.taps[1]}` })),
    rules: () => [
      { key: 'toque', icon: ICO_TOQUE, html: 'Tocar numa lâmpada <b>inverte ela e as vizinhas</b> de cima, de baixo e dos lados: a acesa apaga e a apagada acende.' },
      { key: 'borda', icon: ICO_BORDA, html: 'Nas bordas e nos cantos há <b>menos vizinhas</b>. As diagonais nunca mudam.' },
      { key: 'meta', icon: ICO_META, html: '<b>Apague todas</b> as luzes, de preferência com o mínimo de toques.' },
    ],
    how: 'Toque ou clique numa lâmpada. No teclado, use as <b>setas</b> para escolher e <b>Enter</b> ou <b>Espaço</b> para tocar. A ordem dos toques não importa, e dois toques na mesma lâmpada se anulam. <b>Estratégia:</b> de cima para baixo, toque logo abaixo de cada luz acesa; as luzes vão descendo até a última linha.',

    mount(ctx) {
      const { h } = ctx, lv = ctx.level, n = lv.n;
      const game = generate(lv, ctx.rng);
      const board = game.board.slice();
      const history = [];
      let moves = 0, hint = -1, cursor = 0, ending = false, note = 'base';
      ctx.setMin(game.min);

      // Grade acessível: role=grid, uma linha por role=row, cada lâmpada é um botão (tabindex móvel).
      const grid = h('div', { class: 'lz-grid', role: 'grid', 'aria-label': `Lâmpadas em grade de ${n} por ${n}` });
      const lamps = [];
      for (let r = 0; r < n; r++) {
        const row = h('div', { class: 'lz-row', role: 'row' });
        for (let c = 0; c < n; c++) {
          const i = r * n + c;
          const el = h('button', { type: 'button', class: 'lz-lamp', role: 'gridcell', tabindex: i === cursor ? '0' : '-1', onclick: () => tap(i) },
            h('span', { class: 'lz-bulb', 'aria-hidden': 'true' }));
          lamps.push(el);
          row.append(el);
        }
        grid.append(row);
      }
      ctx.board.append(h('div', { class: 'lz-wrap' }, grid));

      // Tamanho: a casa inteira é o alvo de toque (sem vãos); a lâmpada visível fica recuada dentro dela.
      // A grade (moldura e borda incluídas) cabe na área de conteúdo do board: largura menos o padding.
      function fit(w) {
        if (!w) return;
        const cs = getComputedStyle(ctx.board);
        const avail = w - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
        const pad = avail < 400 ? 6 : 10;
        const cell = Math.max(16, Math.floor(Math.min(MAX_CELL[n] || 60, (avail - 2 * pad - 4) / n)));   // 4 = bordas de 1.6px
        grid.style.setProperty('--lz-cell', cell + 'px');
        grid.style.setProperty('--lz-inset', Math.max(3, Math.round(cell * 0.08)) + 'px');
        grid.style.setProperty('--lz-pad', pad + 'px');
      }
      fit(ctx.board.clientWidth);   // já no primeiro layout: o ResizeObserver só avisa depois dele
      ctx.onResize(fit);

      function render() {
        lamps.forEach((el, i) => {
          const on = board[i] === 1;
          el.classList.toggle('on', on);
          el.classList.toggle('hinted', i === hint);
          el.setAttribute('aria-label', `Linha ${Math.floor(i / n) + 1}, coluna ${(i % n) + 1}: ${on ? 'acesa' : 'apagada'}${i === hint ? ' (dica: toque aqui)' : ''}`);
        });
        ctx.controls({ undo: history.length > 0 && !ending, hint: !ending });
        if (ctx.status !== 'play' || ending) return;
        const acesas = K.plural(litCount(board), 'luz acesa', 'luzes acesas');
        if (!moves) ctx.say('Apague todas as luzes', `Há ${acesas}. Toque numa lâmpada: ela e as vizinhas de cima, de baixo e dos lados trocam de estado.`);
        else ctx.say(acesas, NOTES[note]);
      }

      function setCursor(i, focus) {
        if (i !== cursor) {
          lamps[cursor].setAttribute('tabindex', '-1');
          lamps[i].setAttribute('tabindex', '0');
          cursor = i;
        }
        if (focus) lamps[i].focus();
      }

      // Inverte a lâmpada i e as vizinhas, com a "onda": a tocada afunda e solta um anel; as vizinhas reagem logo depois.
      function flip(i) {
        const cells = neighborsOf(n, i);
        for (const j of cells) {
          board[j] ^= 1;
          lamps[j].style.setProperty('--lz-d', ctx.reduced || j === i ? '0ms' : WAVE_MS + 'ms');
          lamps[j].classList.remove('lz-hit', 'lz-wave', 'lz-cheer');
        }
        if (ctx.reduced) return;
        void grid.offsetWidth;   // reinicia a animação se a lâmpada ainda estava no meio de outra
        for (const j of cells) lamps[j].classList.add(j === i ? 'lz-hit' : 'lz-wave');
      }

      function tap(i) {
        if (ending || ctx.status !== 'play') return;
        setCursor(i, false);
        const before = litCount(board);
        const repeated = history[history.length - 1] === i;
        flip(i);
        history.push(i);
        moves++;
        hint = -1;
        const lit = litCount(board);
        if (!lit) ending = true;
        note = lit === 1 ? 'one' : lit > before ? 'up' : 'base';
        ctx.setMoves(moves);
        render();
        if (ending) return finish(i);
        if (repeated) ctx.warn('Esses dois toques se anularam', 'Tocar duas vezes seguidas na mesma lâmpada volta tudo como estava, mas soma 2 toques. Para voltar atrás, use Desfazer: ele desconta o toque.', 'toque');
      }

      // Tudo apagado: espera a onda terminar, declara a vitória e passa uma onda de comemoração pela grade.
      function finish(last) {
        grid.classList.add('won');
        const done = () => {
          ctx.win();
          if (ctx.reduced) return;
          const lr = Math.floor(last / n), lc = last % n;
          lamps.forEach((el, j) => {
            el.classList.remove('lz-hit', 'lz-wave', 'lz-cheer');
            el.style.setProperty('--lz-d', (Math.abs(Math.floor(j / n) - lr) + Math.abs((j % n) - lc)) * 60 + 'ms');
          });
          void grid.offsetWidth;
          lamps.forEach(el => el.classList.add('lz-cheer'));
        };
        if (ctx.reduced) done(); else ctx.later(done, 320);
      }

      // Teclado: setas movem o foco (tabindex móvel); Enter/Espaço tocam, pelo clique nativo do botão.
      ctx.listen(grid, 'keydown', e => {
        if (e.altKey || e.metaKey) return;
        let r = Math.floor(cursor / n), c = cursor % n;
        switch (e.key) {
          case 'ArrowUp': r--; break;
          case 'ArrowDown': r++; break;
          case 'ArrowLeft': c--; break;
          case 'ArrowRight': c++; break;
          case 'Home': c = 0; if (e.ctrlKey) r = 0; break;
          case 'End': c = n - 1; if (e.ctrlKey) r = n - 1; break;
          case 'Enter': if (e.repeat) e.preventDefault(); return;   // segurar Enter não dispara vários toques
          default: return;
        }
        e.preventDefault();
        r = Math.max(0, Math.min(n - 1, r));
        c = Math.max(0, Math.min(n - 1, c));
        setCursor(r * n + c, true);
      });

      render();

      return {
        onHint() {
          if (ending) return;
          const sol = solve(board, n);
          if (!sol || !sol.length) return;
          // Qualquer lâmpada de uma solução mínima serve (a ordem não importa); escolhe a mais perto do foco.
          const cr = Math.floor(cursor / n), cc = cursor % n;
          const dist = j => Math.abs(Math.floor(j / n) - cr) + Math.abs((j % n) - cc);
          hint = sol.reduce((best, j) => (dist(j) < dist(best) ? j : best), sol[0]);
          setCursor(hint, false);
          render();
          ctx.hint('Dica', `Toque na lâmpada marcada (linha ${Math.floor(hint / n) + 1}, coluna ${(hint % n) + 1}). Daqui, ${sol.length === 1 ? 'falta' : 'faltam'} ${K.plural(sol.length, 'toque', 'toques')} na solução mais curta.`);
        },
        onUndo() {
          if (ending || !history.length) return;
          const i = history.pop();
          flip(i);
          moves--;
          hint = -1;
          note = 'undo';
          setCursor(i, false);
          ctx.setMoves(moves);
          render();
        },
      };
    },
  });
})();
