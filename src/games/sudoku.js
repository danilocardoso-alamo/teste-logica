/* Sudoku — preencha a grade sem repetir números na linha, na coluna ou no bloco */
(() => {
  // ---------- lógica pura (testável no Node) ----------
  const K = typeof JogosCore !== 'undefined' ? JogosCore : require('../kit-core.js');

  // Grade = vetor com n×n números, linha a linha (0 = casa vazia). Blocos de br linhas × bc colunas.
  // Candidatos e notas são máscaras de bits: o bit d-1 ligado representa o número d.
  const POP = new Uint8Array(512);
  for (let m = 1; m < 512; m++) POP[m] = POP[m >> 1] + (m & 1);
  const low = m => 31 - Math.clz32(m & -m);                  // índice do bit mais baixo
  const digitsOf = m => { const r = []; for (let d = 1; m; d++, m >>= 1) if (m & 1) r.push(d); return r; };
  const list = a => (a.length > 1 ? a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1] : String(a[0]));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  // Técnicas, da mais fácil para a mais difícil (usadas para classificar os desafios):
  // 1 = número com um só lugar no bloco; 2 = com um só lugar na linha ou coluna; 3 = casa com um só candidato;
  // 4 = técnicas com candidatos (alinhamentos, pares e trios). 9 = travaria sem chute.
  // clues: faixa de números dados; max: técnica mais difícil permitida; want: técnica que o nível prefere exigir;
  // tries: desafios sorteados, no máximo, até achar um que sirva; sym: tira os números aos pares, simétricos pelo
  // centro (visual clássico). Com 36 casas e simetria, o total de dados é sempre par.
  const LEVELS = [
    { id: 'facil', name: 'Fácil', n: 4, br: 2, bc: 2, clues: [6, 6], max: 3, tries: 30, sym: true,
      blurb: 'Grade 4×4 para aquecer: números de 1 a 4.' },
    { id: 'medio', name: 'Médio', n: 6, br: 2, bc: 3, clues: [12, 12], max: 3, tries: 30, sym: true,
      blurb: 'Grade 6×6, com blocos de 2 linhas por 3 colunas.' },
    { id: 'dificil', name: 'Difícil', n: 9, br: 3, bc: 3, clues: [30, 32], max: 3, want: 2, tries: 30, sym: true,
      blurb: 'O clássico 9×9, resolvível sem chutar: procure onde cada número só pode ficar.' },
    { id: 'muito', name: 'Muito difícil', n: 9, br: 3, bc: 3, clues: [23, 26], max: 4, want: 4, tries: 60, sym: false,
      blurb: 'Poucos números dados: anote candidatos e procure pares e alinhamentos.' },
  ];

  const geos = {};
  function geometry(n, br, bc) {
    const key = n + ':' + br + ':' + bc;
    if (geos[key]) return geos[key];
    const N = n * n, bx = n / bc, by = n / br;
    const row = new Uint8Array(N), col = new Uint8Array(N), box = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const r = Math.floor(i / n), c = i % n;
      row[i] = r; col[i] = c; box[i] = Math.floor(r / br) * bx + Math.floor(c / bc);
    }
    // unidades: 0..n-1 linhas, n..2n-1 colunas, 2n..3n-1 blocos
    const units = Array.from({ length: 3 * n }, () => []);
    for (let i = 0; i < N; i++) { units[row[i]].push(i); units[n + col[i]].push(i); units[2 * n + box[i]].push(i); }
    const peers = [];
    for (let i = 0; i < N; i++) {
      const s = new Set([...units[row[i]], ...units[n + col[i]], ...units[2 * n + box[i]]]);
      s.delete(i);
      peers.push([...s]);
    }
    const boxUnits = [], lineUnits = [];
    for (let u = 0; u < 3 * n; u++) (u < 2 * n ? lineUnits : boxUnits).push(u);
    const uorder = [...boxUnits, ...lineUnits];               // ordem de busca: blocos, linhas, colunas
    return (geos[key] = { n, br, bc, bx, by, N, row, col, box, units, peers, boxUnits, lineUnits, uorder, full: (1 << n) - 1 });
  }

  // Conta soluções, parando em `limit`. Busca em profundidade sempre pela casa com menos opções.
  function countSolutions(grid, g, limit = 2) {
    const { n, N, row, col, box, full } = g;
    const R = new Int32Array(n), C = new Int32Array(n), B = new Int32Array(n), E = [];
    for (let i = 0; i < N; i++) {
      const v = grid[i];
      if (!v) { E.push(i); continue; }
      const bit = 1 << (v - 1);
      if ((R[row[i]] | C[col[i]] | B[box[i]]) & bit) return 0;   // já tem repetição
      R[row[i]] |= bit; C[col[i]] |= bit; B[box[i]] |= bit;
    }
    let found = 0;
    const rec = k => {
      if (!k) return ++found >= limit;
      let bj = 0, bm = 0, bp = 99;
      for (let j = 0; j < k; j++) {
        const i = E[j], m = full & ~(R[row[i]] | C[col[i]] | B[box[i]]), p = POP[m];
        if (p < bp) { bp = p; bj = j; bm = m; if (p < 2) break; }
      }
      if (!bp) return false;
      const i = E[bj]; E[bj] = E[k - 1]; E[k - 1] = i;
      const r = row[i], c = col[i], b = box[i];
      for (let m = bm; m; m &= m - 1) {
        const bit = m & -m;
        R[r] |= bit; C[c] |= bit; B[b] |= bit;
        const stop = rec(k - 1);
        R[r] ^= bit; C[c] ^= bit; B[b] ^= bit;
        if (stop) return true;
      }
      E[k - 1] = E[bj]; E[bj] = i;
      return false;
    };
    rec(E.length);
    return found;
  }

  // Grade completa sorteada: backtracking pela casa mais restrita, tentando os números em ordem embaralhada.
  function fullGrid(g, rng) {
    const { n, N, row, col, box, full } = g;
    const v = new Array(N).fill(0), R = new Int32Array(n), C = new Int32Array(n), B = new Int32Array(n);
    const E = Array.from({ length: N }, (_, i) => i);
    const rec = k => {
      if (!k) return true;
      let bj = 0, bm = 0, bp = 99;
      for (let j = 0; j < k; j++) {
        const i = E[j], m = full & ~(R[row[i]] | C[col[i]] | B[box[i]]), p = POP[m];
        if (p < bp) { bp = p; bj = j; bm = m; if (p < 2) break; }
      }
      if (!bp) return false;
      const i = E[bj]; E[bj] = E[k - 1]; E[k - 1] = i;
      const r = row[i], c = col[i], b = box[i];
      for (const d of rng.shuffle(digitsOf(bm))) {
        const bit = 1 << (d - 1);
        R[r] |= bit; C[c] |= bit; B[b] |= bit; v[i] = d;
        if (rec(k - 1)) return true;
        R[r] ^= bit; C[c] ^= bit; B[b] ^= bit;
      }
      v[i] = 0; E[k - 1] = E[bj]; E[bj] = i;
      return false;
    };
    rec(N);
    return v;
  }

  // Tira números (em ordem sorteada) enquanto a solução continuar única. sym: tira aos pares, simétricos pelo centro.
  function dig(sol, g, rng, target, sym) {
    const N = g.N, puz = sol.slice(), tried = new Uint8Array(N);
    let clues = N;
    for (const i of rng.shuffle(Array.from({ length: N }, (_, k) => k))) {
      if (clues <= target) break;
      const j = sym ? N - 1 - i : i;
      if (tried[i] || !puz[i] || !puz[j]) continue;
      tried[i] = tried[j] = 1;
      const k = i === j ? 1 : 2;
      if (clues - k < target) continue;
      puz[i] = 0; puz[j] = 0;
      if (countSolutions(puz, g, 2) === 1) clues -= k;
      else { puz[i] = sol[i]; puz[j] = sol[j]; }
    }
    return { puz, clues };
  }

  // ---- resolvedor lógico: casas óbvias e técnicas de candidatos (usado para classificar e para as dicas) ----
  function candState(grid, g) {
    const { N, peers, full } = g;
    const v = Array.from(grid), cand = new Int32Array(N);
    for (let i = 0; i < N; i++) if (!v[i]) {
      let m = full;
      for (const p of peers[i]) if (v[p]) m &= ~(1 << (v[p] - 1));
      cand[i] = m;
    }
    return { v, cand };
  }
  function place(st, g, i, d) {
    st.v[i] = d; st.cand[i] = 0;
    const keep = ~(1 << (d - 1));
    for (const p of g.peers[i]) st.cand[p] &= keep;
  }

  // Casa óbvia em i? Único candidato (naked) ou único lugar do número no bloco/linha/coluna (hidden).
  function singleAt(st, g, i) {
    const { n, units } = g, { v, cand } = st, m = cand[i];
    if (v[i] || !m) return null;
    if (POP[m] === 1) return { t: 'naked', i, d: low(m) + 1 };
    for (const u of [2 * n + g.box[i], g.row[i], n + g.col[i]]) {
      for (let dm = m; dm; dm &= dm - 1) {
        const bit = dm & -dm;
        if (!units[u].some(j => j !== i && (cand[j] & bit))) return { t: 'hidden', i, d: low(bit) + 1, u };
      }
    }
    return null;
  }

  // Passos lógicos: { t:'naked'|'hidden', i, d } coloca um número; passos com `elim` só riscam candidatos.
  function nakedSingle(st, g) {
    const { v, cand } = st;
    for (let i = 0; i < g.N; i++) if (!v[i] && POP[cand[i]] === 1) return { t: 'naked', i, d: low(cand[i]) + 1 };
    return null;
  }
  function hiddenSingle(st, g, us) {
    const { cand } = st;
    for (const u of us) {
      const cells = g.units[u];
      for (let d = 0; d < g.n; d++) {
        const bit = 1 << d;
        let cnt = 0, at = -1;
        for (const i of cells) if (cand[i] & bit) { cnt++; at = i; if (cnt > 1) break; }
        if (cnt === 1) return { t: 'hidden', i: at, d: d + 1, u };
      }
    }
    return null;
  }
  const eliminate = (st, g) => locked(st, g) || subset(st, g, 2) || hiddenPair(st, g) || subset(st, g, 3);
  // Ordem das dicas: casa com um único candidato; número com um só lugar (bloco, linha, coluna); técnicas com candidatos.
  const nextStep = (st, g) => nakedSingle(st, g) || hiddenSingle(st, g, g.uorder) || eliminate(st, g);

  // Alinhamentos: o número fica preso numa linha/coluna dentro do bloco (point) ou num bloco dentro da linha/coluna (claim).
  function locked(st, g) {
    const { n, units, row, col, box } = g, { cand } = st;
    for (let b = 0; b < n; b++) {
      for (let d = 0; d < n; d++) {
        const bit = 1 << d;
        let cnt = 0, r = -1, c = -1;
        for (const i of units[2 * n + b]) if (cand[i] & bit) {
          if (!cnt) { r = row[i]; c = col[i]; } else { if (row[i] !== r) r = -1; if (col[i] !== c) c = -1; }
          cnt++;
        }
        if (cnt < 2) continue;
        for (const u of [r, c < 0 ? -1 : n + c]) {
          if (u < 0) continue;
          const elim = units[u].filter(i => box[i] !== b && (cand[i] & bit)).map(i => [i, bit]);
          if (elim.length) return { t: 'point', d: d + 1, b, u, elim };
        }
      }
    }
    for (let u = 0; u < 2 * n; u++) {
      for (let d = 0; d < n; d++) {
        const bit = 1 << d;
        let cnt = 0, b = -1;
        for (const i of units[u]) if (cand[i] & bit) { if (!cnt) b = box[i]; else if (box[i] !== b) b = -1; cnt++; }
        if (cnt < 2 || b < 0) continue;
        const inLine = i => (u < n ? row[i] === u : col[i] === u - n);
        const elim = units[2 * n + b].filter(i => !inLine(i) && (cand[i] & bit)).map(i => [i, bit]);
        if (elim.length) return { t: 'claim', d: d + 1, b, u, elim };
      }
    }
    return null;
  }

  // Par/trio nu: k casas de uma unidade que, juntas, só aceitam k números.
  function subset(st, g, k) {
    const { units } = g, { cand } = st;
    for (let u = 0; u < units.length; u++) {
      const pool = units[u].filter(i => cand[i] && POP[cand[i]] <= k);
      if (pool.length < k) continue;
      const chosen = [];
      const pick = (start, mask) => {
        if (chosen.length === k) {
          if (POP[mask] !== k) return null;
          const elim = units[u].filter(i => !chosen.includes(i) && (cand[i] & mask)).map(i => [i, cand[i] & mask]);
          return elim.length ? { t: 'subset', k, u, mask, cells: chosen.slice(), elim } : null;
        }
        for (let a = start; a < pool.length; a++) {
          const m = mask | cand[pool[a]];
          if (POP[m] > k) continue;
          chosen.push(pool[a]);
          const r = pick(a + 1, m);
          chosen.pop();
          if (r) return r;
        }
        return null;
      };
      const r = pick(0, 0);
      if (r) return r;
    }
    return null;
  }

  // Par escondido: dois números que, numa unidade, só cabem nas mesmas duas casas.
  function hiddenPair(st, g) {
    const { n, units } = g, { cand } = st;
    for (let u = 0; u < units.length; u++) {
      const cells = units[u], pos = new Int32Array(n);
      cells.forEach((i, k) => { for (let d = 0; d < n; d++) if (cand[i] & (1 << d)) pos[d] |= 1 << k; });
      for (let d1 = 0; d1 < n; d1++) {
        if (POP[pos[d1]] !== 2) continue;
        for (let d2 = d1 + 1; d2 < n; d2++) {
          if (pos[d2] !== pos[d1]) continue;
          const keep = (1 << d1) | (1 << d2), at = [cells[low(pos[d1])], cells[31 - Math.clz32(pos[d1])]];
          const elim = at.filter(i => cand[i] & ~keep).map(i => [i, cand[i] & ~keep]);
          if (elim.length) return { t: 'hpair', u, ds: [d1 + 1, d2 + 1], cells: at, elim };
        }
      }
    }
    return null;
  }

  // Classifica como uma pessoa resolveria: sempre a técnica mais fácil disponível (1 a 4, veja LEVELS).
  // level = a técnica mais difícil que foi preciso usar; 9 = travou (exigiria chute ou técnica acima de `max`).
  function rate(grid, g, max = 4) {
    const st = candState(grid, g);
    let left = st.v.reduce((a, x) => a + !x, 0), level = 0, guard = 0;
    while (left && guard++ < 5000) {
      let s = hiddenSingle(st, g, g.boxUnits), rank = 1;
      if (!s && max >= 2) { s = hiddenSingle(st, g, g.lineUnits); rank = 2; }
      if (!s && max >= 3) { s = nakedSingle(st, g); rank = 3; }
      if (!s && max >= 4) { s = eliminate(st, g); rank = 4; }
      if (!s) break;
      if (rank > level) level = rank;
      if (s.elim) for (const [i, m] of s.elim) st.cand[i] &= ~m;
      else { place(st, g, s.i, s.d); left--; }
    }
    return { solved: !left, level: left ? 9 : level };
  }

  // Sorteia um desafio do nível L. Só usa `rng` (e nunca o relógio): a mesma semente gera o mesmo desafio.
  function generate(L, rng) {
    const g = geometry(L.n, L.br, L.bc);
    let best = null;
    for (let t = 0; t < L.tries; t++) {
      const solution = fullGrid(g, rng);
      const { puz, clues } = dig(solution, g, rng, rng.range(L.clues[0], L.clues[1]), L.sym);
      const r = rate(puz, g, L.max);
      const cost = (r.solved ? 0 : 100) + 10 * Math.max(0, clues - L.clues[1]) + (L.want && r.level < L.want ? 1 : 0);
      if (!best || cost < best.cost) best = { puzzle: puz, solution, clues, level: r.level, cost, tries: t + 1 };
      if (!cost) break;
    }
    return best;
  }
  const puzzleFor = (L, seed) => generate(L, K.rng(seed));

  // Casas com número repetido na linha, na coluna ou no bloco (1 = em conflito).
  function conflicts(vals, g) {
    const bad = new Uint8Array(g.N);
    for (const cells of g.units) {
      const seen = {};
      for (const i of cells) {
        const d = vals[i];
        if (!d) continue;
        if (seen[d] != null) { bad[i] = 1; bad[seen[d]] = 1; } else seen[d] = i;
      }
    }
    return bad;
  }
  // Onde o número da casa i se repete: 'linha', 'coluna', 'bloco' ou null.
  function clashUnit(vals, g, i) {
    const d = vals[i], us = [g.row[i], g.n + g.col[i], 2 * g.n + g.box[i]];
    if (!d) return null;
    for (let k = 0; k < 3; k++) if (g.units[us[k]].some(j => j !== i && vals[j] === d)) return ['linha', 'coluna', 'bloco'][k];
    return null;
  }

  // Nome do bloco para as explicações ("bloco de cima à esquerda", "bloco central"...).
  function blockName(g, b) {
    const r = Math.floor(b / g.bx), c = b % g.bx;
    if (g.bx === 3 && g.by === 3 && r === 1 && c === 1) return 'bloco central';
    const v = g.by === 2 ? ['de cima', 'de baixo'][r] : ['de cima', 'do meio', 'de baixo'][r];
    if (g.bx === 3 && c === 1) return `bloco ${v}, no meio`;
    return `bloco ${v} ${g.bx === 2 ? ['à esquerda', 'à direita'][c] : ['à esquerda', '', 'à direita'][c]}`;
  }
  const unitIn = (g, u) => (u < g.n ? `na linha ${u + 1}` : u < 2 * g.n ? `na coluna ${u - g.n + 1}` : `no ${blockName(g, u - 2 * g.n)}`);
  const unitOf = (g, u) => (u < g.n ? 'da linha' : u < 2 * g.n ? 'da coluna' : 'do bloco');
  function stepText(g, s) {
    const lw = s.u < g.n ? 'linha' : 'coluna', k = s.u < g.n ? s.u + 1 : s.u - g.n + 1;
    if (s.t === 'point') return `No ${blockName(g, s.b)}, o ${s.d} só pode ficar na ${lw} ${k}; então ele sai do resto dessa ${lw}`;
    if (s.t === 'claim') return `Na ${lw} ${k}, o ${s.d} só pode ficar no ${blockName(g, s.b)}; então ele sai do resto desse bloco`;
    if (s.t === 'subset') return `${cap(unitIn(g, s.u))}, ${s.k === 2 ? 'duas' : 'três'} casas só aceitam ${list(digitsOf(s.mask))}; então esses números saem das outras casas ${unitOf(g, s.u)}`;
    return `${cap(unitIn(g, s.u))}, o ${s.ds[0]} e o ${s.ds[1]} só cabem em duas casas; então essas casas não aceitam outros números`;
  }

  // Dica: corrige um número errado, se houver; senão, a casa óbvia mais fácil (de preferência a selecionada).
  // Devolve { i, d, title, text } ou null (grade já completa).
  function findHint(vals, sol, g, sel = -1) {
    const { N, row, col } = g;
    const where = i => `linha ${row[i] + 1}, coluna ${col[i] + 1}`;
    const wrong = [];
    for (let i = 0; i < N; i++) if (vals[i] && vals[i] !== sol[i]) wrong.push(i);
    if (wrong.length) {
      const bad = conflicts(vals, g);
      const i = wrong.includes(sel) ? sel : wrong.find(k => bad[k]) ?? wrong[0];
      return { i, d: sol[i], fix: vals[i], title: `Dica: corrija a ${where(i)}`, text: `O ${vals[i]} dessa casa não leva à solução; o certo ali é ${sol[i]}.` };
    }
    const st = candState(vals, g);
    const say = (s, via) => {
      const title = `Dica: o ${s.d} vai na ${where(s.i)}`;
      const unit = s.t === 'hidden' ? (s.u >= 2 * g.n ? 'neste bloco' : unitIn(g, s.u)) : '';
      if (via) {
        const then = s.t === 'naked' ? `aqui só sobra o ${s.d}` : `${unit}, o ${s.d} só cabe aqui`;
        return { i: s.i, d: s.d, title, text: `${stepText(g, via)}. Com isso, ${then}.` };
      }
      if (s.t === 'naked') return { i: s.i, d: s.d, title, text: `Aqui só cabe o ${s.d}: os outros números já estão na linha ${row[s.i] + 1}, na coluna ${col[s.i] + 1} ou no bloco.` };
      return { i: s.i, d: s.d, title, text: `${cap(unit)}, o ${s.d} só cabe aqui.` };
    };
    if (!st.v.includes(0)) return null;
    const mine = sel >= 0 ? singleAt(st, g, sel) : null;
    if (mine) return say(mine);
    let via = null;
    for (let guard = 0; guard < 400; guard++) {
      const s = nextStep(st, g);
      if (!s) break;
      if (!s.elim) return say(s, via);
      for (const [i, m] of s.elim) st.cand[i] &= ~m;
      via = s;
    }
    // Nada simples à vista: revela a casa com menos candidatos.
    let b = -1;
    for (let i = 0; i < N; i++) if (!st.v[i] && (b < 0 || POP[st.cand[i]] < POP[st.cand[b]])) b = i;
    const opts = digitsOf(st.cand[b]);
    return { i: b, d: sol[b], title: `Dica: o ${sol[b]} vai na ${where(b)}`,
      text: opts.length > 1 ? `Esta casa só aceita ${list(opts)}; o ${sol[b]} é o que leva à solução.` : `Aqui só cabe o ${sol[b]}.` };
  }

  const logic = { LEVELS, geometry, countSolutions, fullGrid, dig, rate, nextStep, candState, generate, puzzleFor, conflicts, clashUnit, findHint, blockName };
  if (typeof module !== 'undefined' && module.exports) { module.exports = logic; return; }

  // ---------- interface ----------
  const ICON = `<svg viewBox="0 0 64 64" aria-hidden="true">
    <rect x="6" y="6" width="52" height="52" rx="9" fill="#FFFDF7"/>
    <path d="M6.8 32V15a8.2 8.2 0 0 1 8.2-8.2H32V32z" fill="#CFE3F7"/><rect x="19" y="32" width="13" height="13" fill="#F6CD4B"/>
    <path d="M19 6.8v50.4M45 6.8v50.4M6.8 19h50.4M6.8 45h50.4" stroke="#2A2433" stroke-opacity=".3" stroke-width="1"/>
    <path d="M32 6.8v50.4M6.8 32h50.4" stroke="#2A2433" stroke-width="2.2"/>
    <rect x="6" y="6" width="52" height="52" rx="9" fill="none" stroke="#2A2433" stroke-width="1.6"/>
    <g font-family="'Baloo 2',Nunito,sans-serif" font-weight="800" font-size="11.5" text-anchor="middle" fill="#2A2433">
    <text x="12.5" y="16.5">1</text><text x="51.5" y="16.5">4</text><text x="25.5" y="29.5">4</text><text x="38.5" y="29.5">1</text>
    <text x="12.5" y="42.5">2</text><text x="51.5" y="42.5">3</text><text x="38.5" y="55.5">2</text><text x="25.5" y="42.5" fill="#7B3FA3">1</text></g></svg>`;
  const GRID3 = '<path d="M12.3 3.8v26.4M21.7 3.8v26.4M3.8 12.3h26.4M3.8 21.7h26.4" stroke="#2A2433" stroke-opacity=".3"/>';
  const FRAME = '<rect x="3" y="3" width="28" height="28" rx="5" fill="none" stroke="#2A2433" stroke-width="1.6"/>';
  const TXT = (size, body) => `<g font-family="'Baloo 2',Nunito,sans-serif" font-weight="800" font-size="${size}" text-anchor="middle" fill="#2A2433">${body}</g>`;
  const ICO_LINHA = `<svg viewBox="0 0 34 34"><rect x="3" y="3" width="28" height="28" rx="5" fill="#FFFDF7"/><rect x="3.8" y="12.3" width="26.4" height="9.4" fill="#CFE3F7"/>${GRID3}${FRAME}${TXT(8, '<text x="7.7" y="19.9">1</text><text x="17" y="19.9">2</text><text x="26.3" y="19.9">3</text>')}</svg>`;
  const ICO_COLUNA = `<svg viewBox="0 0 34 34"><rect x="3" y="3" width="28" height="28" rx="5" fill="#FFFDF7"/><rect x="12.3" y="3.8" width="9.4" height="26.4" fill="#CFE3F7"/>${GRID3}${FRAME}${TXT(8, '<text x="17" y="10.6">1</text><text x="17" y="19.9">2</text><text x="17" y="29.2">3</text>')}</svg>`;
  const ICO_BLOCO = `<svg viewBox="0 0 34 34"><rect x="3" y="3" width="28" height="28" rx="5" fill="#FFFDF7"/><path d="M3.8 17V8a4.2 4.2 0 0 1 4.2-4.2h9V17z" fill="#CFE3F7"/><path d="M10 3.8v26.4M24 3.8v26.4M3.8 10h26.4M3.8 24h26.4" stroke="#2A2433" stroke-opacity=".3"/><path d="M17 3.8v26.4M3.8 17h26.4" stroke="#2A2433" stroke-width="1.6"/>${FRAME}${TXT(6.5, '<text x="6.8" y="8.9">1</text><text x="13.5" y="8.9">2</text><text x="6.8" y="15.9">3</text><text x="13.5" y="15.9">4</text>')}</svg>`;
  const ICO_DADOS = `<svg viewBox="0 0 34 34"><rect x="4" y="4" width="24" height="24" rx="5" fill="#FFFDF7" stroke="#2A2433" stroke-width="1.6"/>${TXT(17, '<text x="15.5" y="22.5">7</text>')}<g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round"><path d="M22.5 22.5v-2.6a3.5 3.5 0 0 1 7 0v2.6" fill="none"/><rect x="20" y="22.5" width="12" height="9" rx="2" fill="#F2C230"/></g></svg>`;
  const PENCIL = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 16.5l.9-3.8 9-9a1.9 1.9 0 0 1 2.7 0l.2.2a1.9 1.9 0 0 1 0 2.7l-9 9zM12 5.6l2.4 2.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  const ERASE = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.2 4.5H17a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H7.2L1.8 10z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.8 7.6l4.8 4.8m0-4.8l-4.8 4.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  const MAXC = { 4: 76, 6: 62, 9: 52 };          // tamanho máximo da casa (px)
  const NOTE_FONT = { 4: 0.22, 6: 0.24, 9: 0.26 };  // fonte das notas, em fração da casa
  const CSS = `
  .sd-wrap{--sd-t:3px;--sd-kc:9;--sd-thick:color-mix(in srgb,var(--ink) 72%,var(--board));--sd-thin:color-mix(in srgb,var(--ink) 20%,var(--panel));--sd-peer:color-mix(in srgb,var(--focus) 9%,var(--panel));--sd-same:color-mix(in srgb,var(--focus) 24%,var(--panel));--sd-sel:color-mix(in srgb,var(--focus) 38%,var(--panel));display:flex;flex-direction:column;gap:14px}
  .sd-grid{align-self:center;display:grid;grid-template-columns:repeat(var(--sd-bx),auto);gap:var(--sd-t);padding:var(--sd-t);background:var(--sd-thick);border-radius:14px;box-shadow:0 12px 26px -20px rgba(15,40,35,.7)}
  .sd-box{display:grid;grid-template-columns:repeat(var(--sd-bc),var(--sd-c));grid-auto-rows:var(--sd-c);gap:1px;background:var(--sd-thin);overflow:hidden}
  .sd-box.sd-tl{border-top-left-radius:calc(14px - var(--sd-t))} .sd-box.sd-tr{border-top-right-radius:calc(14px - var(--sd-t))}
  .sd-box.sd-bl{border-bottom-left-radius:calc(14px - var(--sd-t))} .sd-box.sd-br{border-bottom-right-radius:calc(14px - var(--sd-t))}
  .sd-cell,.sd-key,.sd-tool{-webkit-appearance:none;appearance:none}
  .sd-cell{position:relative;display:grid;place-items:center;width:var(--sd-c);height:var(--sd-c);margin:0;padding:0;border:0;border-radius:0;background:var(--panel);color:var(--ink);font:600 calc(var(--sd-c) * .6)/1 "Baloo 2","Nunito",sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background-color .12s}
  .sd-cell:focus{outline:none}
  .sd-cell:focus-visible{outline:3px solid var(--focus);outline-offset:-3px}
  .sd-cell.sd-peer{background:var(--sd-peer)}
  .sd-cell.sd-same{background:var(--sd-same)}
  .sd-cell.sd-sel{background:var(--sd-sel)}
  .sd-cell.sd-given{font-weight:800}
  .sd-cell.sd-user{color:var(--accent-2)}
  .sd-cell.sd-bad{color:var(--danger);background:var(--danger-bg);box-shadow:inset 0 0 0 2px var(--danger)}
  .sd-cell.sd-bad.sd-sel{background:color-mix(in srgb,var(--danger) 24%,var(--panel))}
  .sd-cell.sd-hinted{box-shadow:inset 0 0 0 3px var(--hint);animation:sd-glow 1.4s ease-out}
  .sd-cell.sd-shake{animation:sd-shake .38s ease-in-out}
  .sd-v{display:block;text-box:trim-both cap alphabetic;pointer-events:none}
  .sd-user .sd-v{animation:sd-pop .22s ease-out}
  .sd-ns{position:absolute;inset:1px;display:grid;grid-template-columns:repeat(var(--sd-bc),1fr);grid-template-rows:repeat(var(--sd-nr),1fr);place-items:center;font:800 max(8px,calc(var(--sd-c) * var(--sd-nf)))/1 "Nunito",sans-serif;color:var(--ink-2);pointer-events:none}
  .sd-n.sd-hl{padding:1px 2px;border-radius:4px;background:var(--focus);color:var(--panel)}
  .sd-grid.sd-won .sd-cell{animation:sd-wave .6s ease-out both;animation-delay:calc(var(--k) * 45ms)}
  .sd-pad{display:grid;gap:8px}
  .sd-keys{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}
  .sd-key{flex:0 0 calc((100% - (var(--sd-kc) - 1) * 6px) / var(--sd-kc));min-width:0;height:clamp(44px,calc(var(--sd-c) * 1.25),52px);padding:0;border:1px solid var(--line);border-radius:12px;background:var(--panel);color:var(--ink);font:700 27px/1 "Baloo 2","Nunito",sans-serif;cursor:pointer;box-shadow:0 3px 0 var(--line);-webkit-tap-highlight-color:transparent;transition:transform .08s,box-shadow .08s,opacity .15s,border-color .15s}
  .sd-key:active{transform:translateY(2px);box-shadow:0 1px 0 var(--line)}
  .sd-key.sd-done{opacity:.35}
  .sd-pad.sd-notes .sd-key{color:var(--accent-2);font-size:19px;border-style:dashed}
  .sd-tools{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .sd-tool{height:44px;display:flex;align-items:center;justify-content:center;gap:6px;min-width:0;overflow:hidden;white-space:nowrap;padding:0 8px;border:1px solid var(--line);border-radius:12px;background:var(--panel);color:var(--ink);font:800 15px/1 "Nunito",sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:border-color .15s,background .15s,color .15s}
  .sd-key:hover,.sd-tool:hover{border-color:var(--ink-2)}
  .sd-key:focus-visible,.sd-tool:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
  .sd-ti{display:flex}
  .sd-ti svg{width:20px;height:20px}
  .sd-ti,.sd-sw{flex:none}
  .sd-sw{position:relative;width:28px;height:16px;border-radius:8px;background:var(--line);transition:background .15s}
  .sd-sw::after{content:"";position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:var(--panel);box-shadow:0 1px 2px rgba(0,0,0,.35);transition:transform .15s}
  .sd-tool[aria-pressed="true"]{border-color:var(--accent-2);color:var(--accent-2);background:color-mix(in srgb,var(--accent-2) 10%,var(--panel))}
  .sd-tool[aria-pressed="true"] .sd-sw{background:var(--accent-2)}
  .sd-tool[aria-pressed="true"] .sd-sw::after{transform:translateX(12px)}
  @keyframes sd-pop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.12);opacity:1}100%{transform:scale(1)}}
  @keyframes sd-glow{0%,30%{background-color:color-mix(in srgb,var(--hint) 60%,var(--panel))}}
  @keyframes sd-shake{20%{translate:-4px 0}40%{translate:4px 0}60%{translate:-2px 0}80%{translate:2px 0}}
  @keyframes sd-wave{45%{transform:scale(.84);background-color:color-mix(in srgb,var(--ok) 45%,var(--panel))}}
  `;
  const cache = new Map();   // "Recomeçar" reaproveita o desafio já gerado para a mesma semente

  Jogos.register({
    id: 'sudoku',
    name: 'Sudoku',
    tagline: 'Preencha a grade sem repetir números na linha, na coluna ou no bloco.',
    icon: ICON,
    css: CSS,
    metric: { label: 'Tempo', unit: ['segundo', 'segundos'], format: 'time' },
    generated: true,
    levels: LEVELS.map(l => Object.assign({}, l, {
      sub: `${l.n}×${l.n}<span class="cnt"> · ${l.clues[0] === l.clues[1] ? l.clues[0] : `${l.clues[0]} a ${l.clues[1]}`} dados</span>`,
    })),
    rules: l => [
      { key: 'linha', icon: ICO_LINHA, html: `Cada <b>linha</b> tem os números de 1 a ${l.n}, sem repetir.` },
      { key: 'coluna', icon: ICO_COLUNA, html: `Cada <b>coluna</b> também tem de 1 a ${l.n}, sem repetir.` },
      { key: 'bloco', icon: ICO_BLOCO, html: `Cada <b>bloco</b> ${l.br}×${l.bc}, de contorno grosso, também tem de 1 a ${l.n}.` },
      { key: 'dados', icon: ICO_DADOS, html: 'Os números <b>dados</b> (em negrito) já estão certos e não mudam.' },
    ],
    how: l => `Toque em uma casa e depois em um número. Ligue <b>Notas</b> para anotar possibilidades pequenas na casa; ao escrever um número, ele some sozinho das notas da linha, da coluna e do bloco. No teclado: <b>setas</b> escolhem a casa, <b>1</b> a <b>${l.n}</b> escrevem, <b>Backspace</b> apaga e <b>N</b> liga ou desliga as notas.`,

    mount(ctx) {
      const { h } = ctx, L = ctx.level, g = geometry(L.n, L.br, L.bc), { n, N } = g;
      const ck = L.id + ':' + ctx.seed;
      let P = cache.get(ck);
      if (!P) {
        P = generate(L, ctx.rng);
        cache.set(ck, P);
        if (cache.size > 8) cache.delete(cache.keys().next().value);
      }
      const sol = P.solution, given = P.puzzle.map(v => v > 0);
      const vals = P.puzzle.slice(), notes = new Array(N).fill(0), hist = [], shown = new Array(N).fill(null);
      const firstEmpty = Math.max(0, vals.indexOf(0));
      let sel = -1, notesMode = false, secs = 0, done = false, hinted = -1, hints = 0, mistakes = 0;
      ctx.setMin(null);
      ctx.setMoves(0);

      // Grade: blocos separados por linhas grossas; dentro deles, casas separadas por linhas finas.
      const pick = e => { const el = e.target.closest('.sd-cell'); if (el) select(+el.dataset.i); };
      const grid = h('div', { class: 'sd-grid', role: 'group', 'aria-label': `Grade de ${n} por ${n}`, onclick: pick, onfocusin: pick });
      const boxes = Array.from({ length: n }, (_, b) => {
        const r = Math.floor(b / g.bx), c = b % g.bx, top = r === 0, bot = r === g.by - 1, left = c === 0, right = c === g.bx - 1;
        return h('div', { class: 'sd-box' + (top && left ? ' sd-tl' : '') + (top && right ? ' sd-tr' : '') + (bot && left ? ' sd-bl' : '') + (bot && right ? ' sd-br' : '') });
      });
      const cells = [];
      for (let i = 0; i < N; i++) {
        const el = h('button', { type: 'button', class: 'sd-cell', tabindex: '-1', 'data-i': i, style: { '--k': g.row[i] + g.col[i] } });
        boxes[g.box[i]].append(el);
        cells.push(el);
      }
      grid.append(...boxes);

      // Teclado numérico + Notas + Apagar
      const keys = Array.from({ length: n }, (_, k) => h('button', { type: 'button', class: 'sd-key', onclick: () => write(k + 1, notesMode) }, String(k + 1)));
      const btnNotes = h('button', { type: 'button', class: 'sd-tool', 'aria-pressed': 'false', onclick: () => toggleNotes() },
        h('span', { class: 'sd-ti', html: PENCIL }), 'Notas', h('span', { class: 'sd-sw', 'aria-hidden': 'true' }));
      const btnErase = h('button', { type: 'button', class: 'sd-tool', onclick: () => erase() }, h('span', { class: 'sd-ti', html: ERASE }), 'Apagar');
      const pad = h('div', { class: 'sd-pad', role: 'group', 'aria-label': 'Teclado numérico' },
        h('div', { class: 'sd-keys' }, keys), h('div', { class: 'sd-tools' }, btnNotes, btnErase));
      // Tamanho-padrão que cabe sozinho (antes de qualquer cálculo): desconta o respiro da página, do tabuleiro e as linhas.
      const wrap = h('div', { class: 'sd-wrap', style: { '--sd-bx': g.bx, '--sd-bc': g.bc, '--sd-nr': n / g.bc, '--sd-nf': NOTE_FONT[n],
        '--sd-c': `min(${MAXC[n]}px, calc((100vw - 110px) / ${n}))`, '--sd-kc': n } }, grid, pad);
      ctx.board.append(wrap);

      // Tamanho: a grade é quadrada e ocupa a largura do tabuleiro. Em telas estreitas avança sobre o respiro
      // lateral do tabuleiro (fica a 3px da borda) para manter as casas do 9×9 com 34px ou mais.
      // Roda já no fim do mount (sem esperar o ResizeObserver, que pode atrasar) e de novo a cada mudança de largura.
      function layout(w) {
        if (!w) return;
        const cs = getComputedStyle(ctx.board);
        const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
        const T = w < 420 ? 2 : 3;
        const fixed = (g.bx + 1) * T + (n - g.bx);                // linhas grossas (com a borda) + finas
        const hCap = Math.max(40, Math.floor(((window.innerHeight || 800) - 310) / n));
        let c = Math.floor((w - padX - fixed) / n);
        if (c < 40) c = Math.floor((w - 6 - fixed) / n);
        c = Math.max(20, Math.min(MAXC[n], hCap, c));
        const gw = n * c + fixed, over = Math.max(0, gw - (w - padX));
        wrap.style.setProperty('--sd-c', c + 'px');
        wrap.style.setProperty('--sd-t', T + 'px');
        wrap.style.setProperty('--sd-kc', (gw - (n - 1) * 6) / n >= 40 ? n : Math.ceil(n / 2));
        wrap.style.width = gw + 'px';
        wrap.style.marginLeft = wrap.style.marginRight = over ? -over / 2 + 'px' : '';
      }
      ctx.onResize(layout);
      layout(ctx.board.clientWidth);

      function paint(i, sv) {
        const v = vals[i], m = notes[i], hl = sv && (m >> (sv - 1)) & 1 ? sv : 0;
        const key = v ? 'v' + v : m ? 'n' + m + ':' + hl : '';
        if (shown[i] === key) return;
        shown[i] = key;
        if (v) cells[i].replaceChildren(h('span', { class: 'sd-v' }, String(v)));
        else if (m) cells[i].replaceChildren(h('span', { class: 'sd-ns', 'aria-hidden': 'true' },
          Array.from({ length: n }, (_, d) => h('span', { class: d + 1 === hl ? 'sd-n sd-hl' : 'sd-n' }, (m >> d) & 1 ? String(d + 1) : ''))));
        else cells[i].replaceChildren();
      }

      function render() {
        const bad = conflicts(vals, g), sv = sel >= 0 ? vals[sel] : 0, count = new Array(n + 1).fill(0);
        for (let i = 0; i < N; i++) count[vals[i]]++;
        for (let i = 0; i < N; i++) {
          const el = cells[i], v = vals[i];
          let cls = 'sd-cell' + (given[i] ? ' sd-given' : v ? ' sd-user' : '');
          if (i === sel) cls += ' sd-sel';
          else if (sv && v === sv) cls += ' sd-same';
          else if (sel >= 0 && (g.row[i] === g.row[sel] || g.col[i] === g.col[sel] || g.box[i] === g.box[sel])) cls += ' sd-peer';
          if (bad[i]) cls += ' sd-bad';
          if (i === hinted) cls += ' sd-hinted';
          if (el.classList.contains('sd-shake')) cls += ' sd-shake';
          if (el.className !== cls) el.className = cls;
          paint(i, sv);
          el.tabIndex = i === (sel >= 0 ? sel : firstEmpty) ? 0 : -1;
          const label = `Linha ${g.row[i] + 1}, coluna ${g.col[i] + 1}: ` + (v ? `${v}${given[i] ? ', número dado' : ''}${bad[i] ? ', repetido' : ''}`
            : notes[i] ? `vazia, notas ${digitsOf(notes[i]).join(', ')}` : 'vazia');
          if (el.getAttribute('aria-label') !== label) el.setAttribute('aria-label', label);
        }
        keys.forEach((b, k) => {
          const full = count[k + 1] >= n;
          b.classList.toggle('sd-done', full);
          b.setAttribute('aria-label', `${notesMode ? 'Anotar' : 'Escrever'} ${k + 1}${full ? ' (já tem todos)' : ''}`);
        });
        btnNotes.setAttribute('aria-pressed', String(notesMode));
        pad.classList.toggle('sd-notes', notesMode);
        ctx.controls({ undo: hist.length > 0 });
        status(bad);
      }

      // Mensagem base: quantas casas faltam e o que fazer agora.
      function status(bad) {
        if (ctx.status !== 'play') return;
        let left = 0, nBad = 0;
        for (let i = 0; i < N; i++) { if (!vals[i]) left++; if (bad[i]) nBad++; }
        if (!left) {
          if (nBad) ctx.say('Grade cheia, mas com repetições', 'Os números em vermelho se repetem na linha, na coluna ou no bloco. Troque-os para terminar.');
          return;
        }
        let d;
        if (sel < 0) d = 'Toque em uma casa vazia e escolha um número.';
        else if (given[sel]) d = `Esse ${vals[sel]} veio pronto; os outros ${vals[sel]} da grade ficam destacados. Escolha uma casa vazia para escrever.`;
        else if (vals[sel]) d = notesMode ? 'Esta casa já tem número: apague-o para anotar, ou desligue as Notas para trocar.' : 'Toque em outro número para trocar, ou em Apagar.';
        else if (notesMode) d = 'Notas ligadas: toque nos números para anotar as possibilidades desta casa.';
        else d = `Escolha um número de 1 a ${n} para esta casa.`;
        if (nBad) d = 'Há números repetidos, em vermelho. ' + d;
        ctx.say(left === 1 ? 'Falta 1 casa' : `Faltam ${left} casas`, d);
      }

      function select(i, focus) {
        if (ctx.status !== 'play') return;
        if (i !== sel) { sel = i; render(); }
        if (focus && document.activeElement !== cells[i]) cells[i].focus();
      }
      const shake = i => ctx.retrigger(cells[i], 'sd-shake', 400);
      const change = (i, v1, n1) => ({ i, v0: vals[i], n0: notes[i], v1, n1 });
      // Aplica uma jogada (várias casas de uma vez, para o Desfazer voltar tudo junto).
      function commit(ch, hint) {
        for (const c of ch) { vals[c.i] = c.v1; notes[c.i] = c.n1; }
        hist.push({ ch, sel });
        hinted = hint ? ch[0].i : -1;
        if (!hint && ctx.clearHint) ctx.clearHint();
        render();
      }
      // Escreve d na casa selecionada; ao escrever, apaga as notas de d na linha, coluna e bloco.
      function placeChanges(i, d) {
        const bit = 1 << (d - 1), ch = [change(i, d, 0)];
        for (const p of g.peers[i]) if (notes[p] & bit) ch.push(change(p, vals[p], notes[p] & ~bit));
        return ch;
      }
      function blocked() {
        shake(sel);
        ctx.warn('Número dado', 'Os números que vieram no desafio não mudam. Escolha uma casa vazia.', 'dados');
      }
      function write(d, asNote) {
        if (ctx.status !== 'play') return;
        if (d > n) return ctx.warn(`Só vale de 1 a ${n}`, `Nesta grade entram apenas os números de 1 a ${n}.`);
        if (sel < 0) return ctx.warn('Escolha uma casa', 'Toque em uma casa vazia da grade e depois no número.');
        if (given[sel]) return blocked();
        const i = sel;
        if (asNote) {
          if (vals[i]) { shake(i); return ctx.warn('Casa preenchida', 'Apague o número desta casa antes de anotar possibilidades.'); }
          return commit([change(i, 0, notes[i] ^ (1 << (d - 1)))]);
        }
        if (vals[i] === d) return;
        if (d !== sol[i]) mistakes++;
        commit(placeChanges(i, d));
        const clash = clashUnit(vals, g, i);
        if (clash) {
          shake(i);
          ctx.warn('Número repetido', `Já existe um ${d} ${clash === 'bloco' ? 'neste bloco' : 'nesta ' + clash}. Os repetidos ficam em vermelho.`, clash);
        } else checkWin();
      }
      function erase() {
        if (ctx.status !== 'play') return;
        if (sel < 0) return ctx.warn('Escolha uma casa', 'Toque na casa que você quer apagar.');
        if (given[sel]) return blocked();
        if (vals[sel] || notes[sel]) commit([change(sel, 0, 0)]);
      }
      function toggleNotes() {
        if (ctx.status !== 'play') return;
        notesMode = !notesMode;
        render();
      }
      // Grade cheia e sem repetições é uma solução (a do desafio é única).
      function checkWin() {
        if (vals.includes(0) || conflicts(vals, g).includes(1)) return;
        done = true; sel = -1; hinted = -1;
        render();
        grid.classList.add('sd-won');
        ctx.win({ score: secs, perfect: !hints && !mistakes,
          text: `Você completou a grade em ${ctx.core.fmtTime(secs)}${mistakes ? '' : ', sem errar nenhum número'}.` });
      }

      // Relógio: conta só enquanto a página está visível e o jogo não acabou.
      ctx.every(() => {
        if (done || ctx.status !== 'play' || document.hidden) return;
        secs++;
        ctx.setMoves(secs);
      }, 1000);

      ctx.listen(window, 'keydown', e => {
        if (e.ctrlKey || e.metaKey || e.altKey || ctx.status !== 'play') return;
        const t = e.target;
        if (t && t.closest && t.closest('input, textarea, select, [contenteditable]')) return;
        const k = e.key, code = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || '');
        const dir = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
        if (e.repeat && !dir) return;
        if (/^[1-9]$/.test(k)) { e.preventDefault(); return write(+k, notesMode); }
        if (code && e.shiftKey) { e.preventDefault(); return write(+code[1], !notesMode); }   // Shift + número: o outro modo
        if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); return erase(); }
        if (k === 'n' || k === 'N') { e.preventDefault(); return toggleNotes(); }
        if (dir) {
          if (t && t !== document.body && t !== document.documentElement && !ctx.board.contains(t)) return;
          e.preventDefault();
          if (sel < 0) return select(firstEmpty, true);
          const r = Math.min(n - 1, Math.max(0, g.row[sel] + dir[0])), c = Math.min(n - 1, Math.max(0, g.col[sel] + dir[1]));
          return select(r * n + c, true);
        }
        if (k === 'Escape' && sel >= 0) { sel = -1; render(); }
      });

      render();

      return {
        onHint() {
          if (ctx.status !== 'play') return;
          const H = findHint(vals, sol, g, sel);
          if (!H) return;
          hints++;
          sel = H.i;
          commit(placeChanges(H.i, H.d), true);
          ctx.hint(H.title, H.text);
          ctx.later(() => { if (hinted === H.i) { hinted = -1; render(); } }, 1600);
          checkWin();
        },
        onUndo() {
          const last = hist.pop();
          if (!last) return;
          for (const c of last.ch) { vals[c.i] = c.v0; notes[c.i] = c.n0; }
          sel = last.sel;
          hinted = -1;
          if (ctx.clearHint) ctx.clearHint();
          render();
        },
      };
    },
  });
})();
