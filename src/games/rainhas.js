/* Rainhas — uma rainha por linha, coluna e região colorida, sem que duas se toquem */
(() => {
  // ---------- lógica pura (testável no Node) ----------
  // Casas numeradas i = linha * N + coluna. reg[i] = região da casa (0..N-1). sol[linha] = coluna da rainha.
  // O solucionador guarda conjuntos de casas como N máscaras de bits, uma por linha (N ≤ 9).
  const POP = new Uint8Array(512);
  for (let m = 1; m < 512; m++) POP[m] = POP[m >> 1] + (m & 1);
  const low = m => 31 - Math.clz32(m & -m);

  // Posição sorteada das rainhas: uma por linha e por coluna, sem encostar nem na diagonal.
  function randomQueens(N, rng) {
    const sol = new Array(N).fill(-1);
    let used = 0;
    const rec = r => {
      if (r === N) return true;
      for (const c of rng.shuffle([...Array(N).keys()])) {
        if ((used >> c) & 1 || (r && Math.abs(sol[r - 1] - c) < 2)) continue;
        used |= 1 << c; sol[r] = c;
        if (rec(r + 1)) return true;
        used &= ~(1 << c);
      }
      return false;
    };
    rec(0);
    return sol;
  }

  // Regiões crescem aos poucos a partir de cada rainha (sempre conexas). Cada região recebe um peso
  // lo + (hi - lo) * sorteio^pow: pesos bem diferentes dão regiões minúsculas e enormes; parecidos, regiões equilibradas.
  function growRegions(N, sol, rng, [lo, hi, pow] = [0.4, 1.6, 1]) {
    const NN = N * N, reg = new Int8Array(NN).fill(-1), front = [], w = [];
    const grow = (i, k) => {
      const r = (i / N) | 0, c = i % N, f = front[k];
      if (r > 0) f.push(i - N);
      if (r < N - 1) f.push(i + N);
      if (c > 0) f.push(i - 1);
      if (c < N - 1) f.push(i + 1);
    };
    for (let k = 0; k < N; k++) {
      front.push([]);
      const u = rng();
      w.push(lo + (hi - lo) * (pow === 2 ? u * u : u));
      reg[k * N + sol[k]] = k;
      grow(k * N + sol[k], k);
    }
    for (let left = NN - N; left > 0; left--) {
      let tot = 0;
      for (let k = 0; k < N; k++) {
        const f = front[k];
        for (let j = f.length - 1; j >= 0; j--) if (reg[f[j]] !== -1) { f[j] = f[f.length - 1]; f.pop(); }
        if (f.length) tot += w[k];
      }
      let x = rng() * tot, k = -1;
      for (let j = 0; j < N; j++) if (front[j].length) { k = j; x -= w[j]; if (x <= 0) break; }
      const f = front[k], i = f[rng.int(f.length)];
      reg[i] = k;
      grow(i, k);
    }
    return reg;
  }

  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  // A região da casa x continua inteira (conexa) se x sair dela?
  function stillConnected(N, reg, x) {
    const k = reg[x], NN = N * N, seen = new Uint8Array(NN), stack = [];
    let total = 0;
    for (let i = 0; i < NN; i++) if (reg[i] === k && i !== x) { total++; if (!stack.length) { stack.push(i); seen[i] = 1; } }
    let n = stack.length;
    while (stack.length) {
      const i = stack.pop(), r = (i / N) | 0, c = i % N;
      for (const [dr, dc] of DIRS) {
        const y = r + dr, z = c + dc, j = y * N + z;
        if (y < 0 || z < 0 || y >= N || z >= N || j === x || seen[j] || reg[j] !== k) continue;
        seen[j] = 1; n++; stack.push(j);
      }
    }
    return total > 0 && n === total;
  }
  // Enquanto existir outra solução, passa uma casa dela (que não é da solução sorteada) para uma região vizinha:
  // a solução sorteada continua valendo e a outra deixa de valer.
  function makeUnique(N, sol, reg, rng, maxIt = 80) {
    for (let it = 0; it < maxIt; it++) {
      const out = [];
      if (countSolutions(N, reg, 2, out) === 1) return true;
      const alt = out.find(a => a.some((c, r) => c !== sol[r]));
      const moves = [];
      for (let r = 0; r < N; r++) {
        if (alt[r] === sol[r]) continue;
        const x = r * N + alt[r];
        for (const [dr, dc] of DIRS) {
          const y = r + dr, z = alt[r] + dc;
          if (y >= 0 && z >= 0 && y < N && z < N && reg[y * N + z] !== reg[x]) moves.push([x, reg[y * N + z]]);
        }
      }
      let moved = false;
      for (const [x, k] of rng.shuffle(moves)) if (stillConnected(N, reg, x)) { reg[x] = k; moved = true; break; }
      if (!moved) return false;
    }
    return false;
  }

  // Conta soluções (para no limite). Linha por linha: coluna livre, região livre, sem encostar na rainha de cima.
  function countSolutions(N, reg, limit = 2, out) {
    const last = new Int8Array(N).fill(-1), cols = new Array(N);
    for (let i = 0; i < N * N; i++) last[reg[i]] = (i / N) | 0;
    let count = 0;
    const rec = (r, cm, km, prev) => {
      if (r === N) { count++; if (out) out.push(cols.slice()); return; }
      for (let k = 0; k < N; k++) if (!((km >> k) & 1) && last[k] < r) return;   // região que ficou sem linhas
      for (let c = 0; c < N && count < limit; c++) {
        if ((cm >> c) & 1 || (prev >= 0 && Math.abs(prev - c) < 2)) continue;
        const k = reg[r * N + c];
        if ((km >> k) & 1) continue;
        cols[r] = c;
        rec(r + 1, cm | (1 << c), km | (1 << k), c);
      }
    };
    rec(0, 0, 0, -1);
    return count;
  }

  // ---------- solucionador lógico (as mesmas deduções que uma pessoa faz; serve para graduar e para as dicas) ----------
  // Unidades: 0..N-1 linhas, N..2N-1 colunas, 2N..3N-1 regiões.
  function geo(N, reg) {
    const full = (1 << N) - 1, NN = N * N;
    const regMask = Array.from({ length: N }, () => new Int32Array(N));
    for (let i = 0; i < NN; i++) regMask[reg[i]][(i / N) | 0] |= 1 << (i % N);
    const unit = [];
    for (let r = 0; r < N; r++) { const m = new Int32Array(N); m[r] = full; unit.push(m); }
    for (let c = 0; c < N; c++) unit.push(new Int32Array(N).fill(1 << c));
    for (let k = 0; k < N; k++) unit.push(regMask[k]);
    const attack = [];          // casas que uma rainha em i elimina (ela mesma inclusive)
    for (let i = 0; i < NN; i++) {
      const r = (i / N) | 0, c = i % N, rk = regMask[reg[i]], near = ((7 << c) >> 1) & full, a = new Int32Array(N);
      for (let y = 0; y < N; y++) a[y] = y === r ? full : (1 << c) | rk[y] | (Math.abs(y - r) === 1 ? near : 0);
      attack.push(a);
    }
    const order = [];           // regiões primeiro: explicam melhor
    for (let u = 2 * N; u < 3 * N; u++) order.push(u);
    for (let u = 0; u < 2 * N; u++) order.push(u);
    return { N, NN, full, reg, regMask, unit, attack, order };
  }
  const fresh = G => ({ cand: new Int32Array(G.N).fill(G.full), dr: 0, dc: 0, dk: 0, n: 0 });
  const clone = s => ({ cand: s.cand.slice(), dr: s.dr, dc: s.dc, dk: s.dk, n: s.n });
  function put(G, s, i) {
    const N = G.N, a = G.attack[i];
    for (let y = 0; y < N; y++) s.cand[y] &= ~a[y];
    s.dr |= 1 << ((i / N) | 0); s.dc |= 1 << (i % N); s.dk |= 1 << G.reg[i]; s.n++;
  }
  const isDone = (G, s, u) => (u < G.N ? (s.dr >> u) & 1 : u < 2 * G.N ? (s.dc >> (u - G.N)) & 1 : (s.dk >> (u - 2 * G.N)) & 1);
  function dead(G, s) {
    for (let u = 0; u < 3 * G.N; u++) {
      if (isDone(G, s, u)) continue;
      const m = G.unit[u];
      let any = 0;
      for (let y = 0; y < G.N && !any; y++) any = s.cand[y] & m[y];
      if (!any) return true;
    }
    return false;
  }
  function apply(G, s, st) {
    if (st.put != null) put(G, s, st.put);
    else for (let y = 0; y < G.N; y++) s.cand[y] &= ~st.el[y];
  }
  const first = (tech, G, s) => { let out = null; tech(G, s, st => { out = st; return true; }); return out; };

  // Nível 1 — casa única: região, linha ou coluna com uma só casa possível.
  function tSingle(G, s, fn) {
    const N = G.N;
    for (const u of G.order) {
      if (isDone(G, s, u)) continue;
      const m = G.unit[u];
      let n = 0, cell = -1;
      for (let y = 0; y < N && n < 2; y++) { const x = s.cand[y] & m[y]; if (x) { n += POP[x]; cell = y * N + low(x); } }
      if (n === 1 && fn({ lv: 1, t: 'single', u, put: cell })) return true;
    }
    return false;
  }
  // Nível 2 — região que só cabe numa linha/coluna (o resto dessa linha sai),
  // ou linha/coluna cujas casas possíveis estão todas numa região (o resto da região sai).
  function tLine(G, s, fn) {
    const N = G.N;
    for (let k = 0; k < N; k++) {
      if ((s.dk >> k) & 1) continue;
      const rk = G.regMask[k];
      let rows = 0, cols = 0;
      for (let y = 0; y < N; y++) { const x = s.cand[y] & rk[y]; if (x) { rows |= 1 << y; cols |= x; } }
      if (POP[rows] === 1) {
        const y = low(rows), x = s.cand[y] & ~rk[y];
        if (x) { const el = new Int32Array(N); el[y] = x; if (fn({ lv: 2, t: 'regIn', k, u: y, el })) return true; }
      }
      if (POP[cols] === 1) {
        const c = low(cols), el = new Int32Array(N);
        let any = 0;
        for (let y = 0; y < N; y++) { const x = s.cand[y] & (1 << c) & ~rk[y]; if (x) { el[y] = x; any = 1; } }
        if (any && fn({ lv: 2, t: 'regIn', k, u: N + c, el })) return true;
      }
    }
    for (let u = 0; u < 2 * N; u++) {
      if (isDone(G, s, u)) continue;
      const m = G.unit[u];
      let ks = 0;
      for (let y = 0; y < N; y++) for (let x = s.cand[y] & m[y]; x; x &= x - 1) ks |= 1 << G.reg[y * N + low(x)];
      if (POP[ks] !== 1) continue;
      const k = low(ks), rk = G.regMask[k], el = new Int32Array(N);
      let any = 0;
      for (let y = 0; y < N; y++) { const x = s.cand[y] & rk[y] & ~m[y]; if (x) { el[y] = x; any = 1; } }
      if (any && fn({ lv: 2, t: 'lineIn', k, u, el })) return true;
    }
    return false;
  }
  // Nível 2 — casa que, com rainha, tiraria todas as casas possíveis de outra região, linha ou coluna.
  function tBlock(G, s, fn) {
    const N = G.N;
    for (let r = 0; r < N; r++) {
      for (let m = s.cand[r]; m; m &= m - 1) {
        const c = low(m), i = r * N + c, a = G.attack[i], k = G.reg[i];
        for (let u = 0; u < 3 * N; u++) {
          if (u === r || u === N + c || u === 2 * N + k || isDone(G, s, u)) continue;
          const um = G.unit[u];
          let any = 0, inside = 1;
          for (let y = 0; y < N; y++) { const x = s.cand[y] & um[y]; if (x) { any = 1; if (x & ~a[y]) { inside = 0; break; } } }
          if (any && inside) {
            const el = new Int32Array(N); el[r] = 1 << c;
            if (fn({ lv: 2, t: 'block', cell: i, u, el })) return true;
            break;
          }
        }
      }
    }
    return false;
  }
  // Nível 3 (grupos de 2) e 4 (grupos maiores) — k regiões que só cabem em k linhas (ou colunas):
  // essas linhas ficam só para elas.
  const subsetCache = {};
  function subsets(u) {
    if (!subsetCache[u]) {
      const list = [];
      for (let S = 1; S < 1 << u; S++) if (POP[S] >= 2 && POP[S] <= u - 2) list.push(S);
      list.sort((a, b) => Math.min(POP[a], u - POP[a]) - Math.min(POP[b], u - POP[b]) || a - b);
      subsetCache[u] = list;
    }
    return subsetCache[u];
  }
  function tGroup(G, s, fn) {
    const N = G.N, U = [];
    for (let k = 0; k < N; k++) if (!((s.dk >> k) & 1)) U.push(k);
    const u = U.length;
    if (u < 4) return false;
    const rowsOf = [], colsOf = [];
    for (const k of U) {
      const rk = G.regMask[k];
      let rows = 0, cols = 0;
      for (let y = 0; y < N; y++) { const x = s.cand[y] & rk[y]; if (x) { rows |= 1 << y; cols |= x; } }
      rowsOf.push(rows); colsOf.push(cols);
    }
    for (const S of subsets(u)) {
      const size = POP[S], h = Math.min(size, u - size);
      let rows = 0, cols = 0;
      for (let j = 0; j < u; j++) if ((S >> j) & 1) { rows |= rowsOf[j]; cols |= colsOf[j]; }
      for (const byRow of [true, false]) {
        const lines = byRow ? rows : cols;
        if (POP[lines] !== size) continue;
        const el = new Int32Array(N);
        let any = 0;
        for (let y = 0; y < N; y++) {
          let allowed = 0;
          for (let j = 0; j < u; j++) if ((S >> j) & 1) allowed |= G.regMask[U[j]][y];
          const x = s.cand[y] & (byRow ? ((lines >> y) & 1 ? G.full : 0) : lines) & ~allowed;
          if (x) { el[y] = x; any = 1; }
        }
        if (any && fn({
          lv: h >= 3 ? 4 : 3, t: 'group', byRow, h, el, lines,
          regs: U.filter((_, j) => (S >> j) & 1), rest: U.filter((_, j) => !((S >> j) & 1)),
          restLines: G.full & ~(byRow ? s.dr : s.dc) & ~lines,
        })) return true;
      }
    }
    return false;
  }
  // Nível 5 — tentativa curta: pôr uma rainha ali leva, com deduções simples, a uma contradição.
  function fails(G, s) {
    for (;;) {
      if (dead(G, s)) return true;
      if (s.n === G.N) return false;
      const st = first(tSingle, G, s) || first(tLine, G, s);
      if (!st) return false;
      apply(G, s, st);
    }
  }
  function tLook(G, s, fn) {
    const N = G.N;
    for (let r = 0; r < N; r++) {
      for (let m = s.cand[r]; m; m &= m - 1) {
        const i = r * N + low(m), t = clone(s);
        put(G, t, i);
        if (fails(G, t)) { const el = new Int32Array(N); el[r] = m & -m; if (fn({ lv: 5, t: 'look', cell: i, el })) return true; }
      }
    }
    return false;
  }
  const TECH = [tSingle, tLine, tBlock, tGroup, tLook];

  // Resolve só com deduções (sem chute). top = técnica mais difícil que foi preciso usar.
  function solve(G, s0, maxLv = 5) {
    const s = s0 ? clone(s0) : fresh(G), steps = [];
    let top = 0;
    while (s.n < G.N) {
      let st = null;
      for (const t of TECH) { st = first(t, G, s); if (st) break; }
      if (!st || st.lv > maxLv) return { ok: false, steps, top, s };
      apply(G, s, st);
      steps.push(st);
      if (st.lv > top) top = st.lv;
    }
    return { ok: true, steps, top, s };
  }

  // Cores das regiões: todas diferentes e, se der, sem tons vizinhos na roda de cores (0..7) lado a lado. A 8 é neutra.
  const NCOLORS = 9;
  const nearHue = (a, b) => a < 8 && b < 8 && ((a - b + 8) % 8 === 1 || (b - a + 8) % 8 === 1);
  function regionPairs(N, reg) {
    const seen = new Set(), pairs = [];
    for (let i = 0; i < N * N; i++) {
      for (const j of [i % N < N - 1 ? i + 1 : -1, i + N < N * N ? i + N : -1]) {
        if (j < 0 || reg[j] === reg[i]) continue;
        const a = Math.min(reg[i], reg[j]), b = Math.max(reg[i], reg[j]);
        if (!seen.has(a * 16 + b)) { seen.add(a * 16 + b); pairs.push([a, b]); }
      }
    }
    return pairs;
  }
  function pickColors(N, reg, rng) {
    const pairs = regionPairs(N, reg), col = rng.shuffle([...Array(NCOLORS).keys()]);
    const bad = () => pairs.reduce((n, [a, b]) => n + nearHue(col[a], col[b]), 0);
    let best = bad();
    for (let t = 0; t < 300 && best > 0; t++) {
      const i = rng.int(N), j = rng.int(NCOLORS);
      if (i === j) continue;
      [col[i], col[j]] = [col[j], col[i]];
      const b = bad();
      if (b <= best) best = b; else [col[i], col[j]] = [col[j], col[i]];
    }
    return col.slice(0, N);
  }

  // Níveis: tamanho, jeito de crescer as regiões e faixa de técnica exigida (top): 1 casa única ·
  // 2 região presa numa linha ou casa que bloquearia outra região · 3 duas regiões presas em duas linhas ·
  // 4 grupos maiores · 5 tentativa curta. minSize 2 = nenhuma região de uma casa só (rainha de graça);
  // minHard = quantos passos de nível 3+ o desafio precisa ter.
  const LEVELS = {
    facil: { N: 5, grow: [0.2, 2.8, 2], minLv: 2, maxLv: 2, minSize: 1, minHard: 0 },
    medio: { N: 6, grow: [0.4, 1.6, 1], minLv: 2, maxLv: 2, minSize: 2, minHard: 0 },
    dificil: { N: 7, grow: [0.4, 1.6, 1], minLv: 3, maxLv: 4, minSize: 2, minHard: 1 },
    muito: { N: 9, grow: [0.4, 1.6, 1], minLv: 3, maxLv: 5, minSize: 2, minHard: 2 },
  };
  // Sorteia rainhas, cresce regiões, garante solução única e confere que dá para resolver só com lógica.
  // Usa só o rng recebido: mesma semente, mesmo desafio. Depois de `tries` tentativas sem achar a dificuldade
  // pedida, aceita qualquer desafio único que a lógica resolva (conta tentativas, nunca o relógio).
  function generate(N, rng, spec = {}) {
    const { grow, minLv = 1, maxLv = 5, minSize = 1, minHard = 0, tries = 600 } = spec;
    for (let a = 1; ; a++) {
      const relax = a > tries;
      const sol = randomQueens(N, rng), reg = growRegions(N, sol, rng, grow);
      if (!makeUnique(N, sol, reg, rng)) continue;
      if (!relax && minSize > 1) {
        const size = new Array(N).fill(0);
        for (const k of reg) size[k]++;
        if (Math.min(...size) < minSize) continue;
      }
      const res = solve(geo(N, reg), null, relax ? 5 : maxLv);
      if (!res.ok) continue;
      const hard = res.steps.filter(st => st.lv >= 3).length;
      if (!relax && (res.top < minLv || hard < minHard)) continue;
      return { N, reg: Array.from(reg), sol, top: res.top, hard, steps: res.steps.length, attempts: a, colors: pickColors(N, reg, rng) };
    }
  }

  // Conflitos entre rainhas (lista de casas): mesma linha, coluna, região ou encostadas.
  function conflicts(N, reg, qs) {
    const bad = new Set(), pairs = [];
    for (let a = 0; a < qs.length; a++) {
      for (let b = a + 1; b < qs.length; b++) {
        const i = qs[a], j = qs[b], ri = (i / N) | 0, ci = i % N, rj = (j / N) | 0, cj = j % N;
        const why = ri === rj ? 'linha' : ci === cj ? 'coluna' : reg[i] === reg[j] ? 'regiao'
          : Math.abs(ri - rj) < 2 && Math.abs(ci - cj) < 2 ? 'toque' : null;
        if (why) { bad.add(i); bad.add(j); pairs.push({ a: i, b: j, why }); }
      }
    }
    return { bad, pairs };
  }
  const isSolved = (N, reg, qs) => qs.length === N && conflicts(N, reg, qs).pairs.length === 0;

  // Dica: aponta uma rainha fora da solução; senão, acha a próxima rainha dedutível e o motivo.
  // t: 'wrong' | 'single' (já é a única casa livre) | 'after' (depois de um passo de lógica) | 'chain' (vários passos).
  function hintFor(P, queens) {
    const { N, reg, sol } = P, G = geo(N, reg);
    const wrong = queens.filter(i => sol[(i / N) | 0] !== i % N);
    if (wrong.length) {
      const { bad } = conflicts(N, reg, queens);
      return { t: 'wrong', cell: wrong.find(i => bad.has(i)) ?? wrong[0] };
    }
    const s = fresh(G);
    for (const i of queens) put(G, s, i);
    if (s.n === N) return null;
    const one = first(tSingle, G, s);
    if (one) return { t: 'single', cell: one.put, u: one.u };
    let found = null;
    for (const tech of [tLine, tBlock, tGroup]) {
      tech(G, s, e => {
        const t = clone(s);
        apply(G, t, e);
        const x = first(tSingle, G, t);
        if (x) found = { t: 'after', cell: x.put, u: x.u, via: e };
        return !!found;
      });
      if (found) return found;
    }
    const t = clone(s), used = [];
    for (;;) {
      let x = null;
      for (const tech of TECH) { x = first(tech, G, t); if (x) break; }
      if (!x) break;
      if (x.put != null) {
        const um = G.unit[x.u];
        const touch = used.filter(e => e.el.some((m, y) => m & um[y]));
        return { t: 'chain', cell: x.put, u: x.u, via: touch[touch.length - 1] || used[0] };
      }
      apply(G, t, x);
      used.push(x);
    }
    const r = [...Array(N).keys()].find(y => !((s.dr >> y) & 1));
    return { t: 'reveal', cell: r * N + sol[r] };
  }

  // Textos da dica (names[k] = nome da cor da região k).
  function hintText(P, h, names) {
    const N = P.N;
    const cellName = i => `linha ${((i / N) | 0) + 1}, coluna ${(i % N) + 1}`;
    const lineWord = u => (u < N ? 'linha' : 'coluna');
    const unitName = u => (u < N ? `a linha ${u + 1}` : u < 2 * N ? `a coluna ${u - N + 1}` : `a região ${names[u - 2 * N]}`);
    const list = xs => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`);
    const bits = m => [...Array(N).keys()].filter(y => (m >> y) & 1);
    const title = `Rainha na ${cellName(h.cell)}`;
    if (h.t === 'wrong') return { title: 'Rainha fora do lugar', text: `A rainha da ${cellName(h.cell)} não faz parte da solução. Toque nela para tirá-la.` };
    if (h.t === 'reveal') return { title, text: 'Esta rainha faz parte da solução.' };
    const size = h.u >= 2 * N ? P.reg.filter(k => k === h.u - 2 * N).length : N;
    if (h.t === 'single') {
      if (size === 1) return { title, text: `A região ${names[h.u - 2 * N]} tem uma casa só, então a rainha dela fica ali.` };
      const outras = h.u < N ? 'na mesma coluna, na mesma região' : h.u < 2 * N ? 'na mesma linha, na mesma região' : 'na mesma linha, na mesma coluna';
      return { title, text: `É a única casa livre d${unitName(h.u)}: as outras já têm uma rainha ${outras} ou encostada.` };
    }
    const e = h.via;
    let why, so;
    if (e.t === 'regIn') { why = `a região ${names[e.k]} só cabe n${unitName(e.u)}`; so = `nenhuma outra região pode usar essa ${lineWord(e.u)}`; }
    else if (e.t === 'lineIn') { why = `as casas livres d${unitName(e.u)} estão todas na região ${names[e.k]}`; so = `a rainha dessa região fica nessa ${lineWord(e.u)}`; }
    else if (e.t === 'block') { why = `uma rainha na ${cellName(e.cell)} deixaria ${unitName(e.u)} sem casa livre`; so = 'essa casa fica sem rainha'; }
    else if (e.t === 'group') {
      // "k regiões só cabem em k linhas" ou, se for mais curto, o mesmo fato visto pelo outro lado
      const word = e.byRow ? 'linhas' : 'colunas', nums = m => list(bits(m).map(y => y + 1)), regs = ks => list(ks.map(k => names[k]));
      if (e.regs.length <= e.rest.length) { why = `as regiões ${regs(e.regs)} só cabem nas ${word} ${nums(e.lines)}`; so = `essas ${word} ficam só para elas`; }
      else { why = `as ${word} ${nums(e.restLines)} só têm casas livres nas regiões ${regs(e.rest)}`; so = `essas regiões não podem ter rainha fora dessas ${word}`; }
    } else { why = `uma rainha na ${cellName(e.cell)} levaria a um beco sem saída`; so = 'essa casa fica sem rainha'; }
    const tail = h.t === 'after' ? `assim, ${unitName(h.u)} fica com uma casa só` : `seguindo esse raciocínio, ${unitName(h.u)} fica com uma casa só`;
    return { title, text: `Como ${why}, ${so}; ${tail}.` };
  }

  const logic = {
    POP, LEVELS, NCOLORS, randomQueens, growRegions, stillConnected, makeUnique, countSolutions, geo, fresh, clone, put, dead, apply, first,
    solve, tSingle, tLine, tBlock, tGroup, tLook, regionPairs, pickColors, nearHue, generate, conflicts, isSolved, hintFor, hintText,
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = logic; return; }

  // ---------- interface ----------
  const INK = '#2A2433';
  // Cores das regiões (0..7 seguem a roda de cores; 8 é neutra), em tom pastel no claro e fechado no escuro.
  const COLOR_NAMES = ['vermelha', 'laranja', 'amarela', 'verde', 'turquesa', 'azul', 'lilás', 'rosa', 'cinza'];
  const LIGHT = ['#F59D90', '#F9C68A', '#F3DE78', '#B6DC9A', '#94D6CA', '#A8C6F2', '#CBB5F1', '#F0AED6', '#D2CDC3'];
  const DARK = ['#94463E', '#946232', '#857733', '#4E7D40', '#2D786C', '#3F5F97', '#664E98', '#8B4879', '#5E5C56'];
  const tokens = (cs, rest) => cs.map((c, i) => `--rn-${i}:${c};`).join('') + rest;
  const LIGHT_VARS = tokens(LIGHT, '--rn-edge:#2A2433;--rn-thin:rgba(42,36,51,.22);--rn-x:rgba(42,36,51,.55);--rn-hover:rgba(255,255,255,.4);');
  const DARK_VARS = tokens(DARK, '--rn-edge:#070B0A;--rn-thin:rgba(0,0,0,.32);--rn-x:rgba(255,255,255,.62);--rn-hover:rgba(255,255,255,.1);');

  // Coroa centrada em (cx, cy) com largura w. Com cls, as cores vêm do CSS (cls + 'b' corpo, cls + 'd' faixa).
  function crown(cx, cy, w, cls) {
    const k = w / 27.4, f = v => +v.toFixed(2);
    const X = x => f(cx + (x - 16) * k), Y = y => f(cy + (y - 15.6) * k), R = r => f(r * k);
    const b = cls ? ` class="${cls}b"` : ' fill="#F5C542"', d = cls ? ` class="${cls}d"` : ' fill="#E0A526"';
    return `<path${b} d="M${X(6.5)} ${Y(22)}L${X(4.5)} ${Y(11.5)}L${X(10.5)} ${Y(16.5)}L${X(16)} ${Y(8.5)}L${X(21.5)} ${Y(16.5)}L${X(27.5)} ${Y(11.5)}L${X(25.5)} ${Y(22)}Z"/>`
      + `<circle${b} cx="${X(4.5)}" cy="${Y(10.5)}" r="${R(2.2)}"/><circle${b} cx="${X(16)}" cy="${Y(7)}" r="${R(2.4)}"/>`
      + `<circle${b} cx="${X(27.5)}" cy="${Y(10.5)}" r="${R(2.2)}"/><rect${d} x="${X(5.5)}" y="${Y(21.5)}" width="${R(21)}" height="${R(5)}" rx="${R(2)}"/>`;
  }
  const QUEEN = `<svg class="rn-q" viewBox="0 0 32 32" aria-hidden="true">${crown(16, 16, 27, 'rn-')}</svg>`;
  const MARK = '<svg class="rn-x" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6"/></svg>';

  const G_OPEN = `<g stroke="${INK}" stroke-width="1.6" stroke-linejoin="round">`;
  const ICON = `<svg viewBox="0 0 64 64" aria-hidden="true">${G_OPEN}
    <path d="M6 14a8 8 0 0 1 8-8h18v13H19v13H6z" fill="${LIGHT[5]}"/><path d="M32 6h18a8 8 0 0 1 8 8v36a8 8 0 0 1-8 8h-5V19H32z" fill="${LIGHT[3]}"/>
    <path d="M19 19h26v26H19z" fill="${LIGHT[6]}"/><path d="M6 32h13v13h26v13H14a8 8 0 0 1-8-8z" fill="${LIGHT[1]}"/>
    <path d="M19 6v13M6 19h13M45 6v13M45 19h13M45 32h13M45 45h13M32 19v26M19 32h26M6 45h13M19 45v13M32 45v13" fill="none" stroke-width="1" opacity=".3"/>
    <path d="M23 10l5 5M28 10l-5 5M49 49l5 5M54 49l-5 5" fill="none" stroke-width="1.8" stroke-linecap="round" opacity=".5"/>
    ${crown(32, 32, 22)}</g></svg>`;
  // Coroa simplificada (sem as bolinhas) para os ícones pequenos das regras
  function miniCrown(cx, cy, w) {
    const f = n => +n.toFixed(2), h = w * 0.8, l = cx - w / 2, r = cx + w / 2, t = cy - h / 2, b = cy + h / 2, band = b - h * 0.3;
    return `<path fill="#F5C542" d="M${f(l)} ${f(band)}V${f(t + h * 0.08)}L${f(cx - w / 4)} ${f(t + h * 0.45)}L${f(cx)} ${f(t - h * 0.04)}`
      + `L${f(cx + w / 4)} ${f(t + h * 0.45)}L${f(r)} ${f(t + h * 0.08)}V${f(band)}Z"/><rect fill="#E0A526" x="${f(l)}" y="${f(band)}" width="${f(w)}" height="${f(b - band)}" rx="1"/>`;
  }
  const xs = pts => `<path d="${pts.map(([x, y]) => `M${x - 2} ${y - 2}l4 4M${x + 2} ${y - 2}l-4 4`).join('')}" fill="none" stroke-linecap="round" opacity=".55"/>`;
  const ICO_LINHA = `<svg viewBox="0 0 34 34" aria-hidden="true">${G_OPEN}<rect x="1.5" y="10" width="31" height="14" rx="3.5" fill="${LIGHT[5]}"/>
    ${miniCrown(9, 17, 12)}${xs([[20.5, 17], [27.5, 17]])}</g></svg>`;
  const ICO_COLUNA = `<svg viewBox="0 0 34 34" aria-hidden="true">${G_OPEN}<rect x="10" y="1.5" width="14" height="31" rx="3.5" fill="${LIGHT[1]}"/>
    ${miniCrown(17, 9, 12)}${xs([[17, 20.5], [17, 27.5]])}</g></svg>`;
  const ICO_REGIAO = `<svg viewBox="0 0 34 34" aria-hidden="true">${G_OPEN}<path d="M2 2h20v20h10v10H12V12H2z" fill="${LIGHT[3]}"/>
    ${miniCrown(17, 17, 11)}${xs([[7, 7], [27, 27]])}</g></svg>`;
  const ICO_TOQUE = `<svg viewBox="0 0 34 34" aria-hidden="true">${G_OPEN}<rect x="3" y="3" width="28" height="28" rx="4" fill="${LIGHT[8]}"/>
    <path d="M17 3v28M3 17h28" fill="none" stroke-width="1" opacity=".4"/>${miniCrown(10, 10.5, 11)}${miniCrown(24, 24.5, 11)}</g>
    <path d="M14 20l6-6M14 14l6 6" stroke="#C23A2E" stroke-width="2.6" stroke-linecap="round"/></svg>`;

  const CSS = `
  .rn-wrap{${LIGHT_VARS}--rn-cell:min(40px,calc((100vw - 100px) / var(--rn-n)));display:flex;justify-content:center}
  @media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .rn-wrap{${DARK_VARS}}}
  :root[data-theme="dark"] .rn-wrap{${DARK_VARS}}
  .rn-grid{position:relative;isolation:isolate;display:grid;grid-template-columns:repeat(var(--rn-n),var(--rn-cell));grid-auto-rows:var(--rn-cell);border-radius:12px;overflow:hidden;box-shadow:0 0 0 3px var(--rn-edge),0 16px 30px -20px rgba(15,40,35,.6);touch-action:manipulation;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
  .rn-cell{position:relative;display:flex;align-items:center;justify-content:center;width:var(--rn-cell);height:var(--rn-cell);min-width:0;margin:0;padding:0;border:0;border-radius:0;-webkit-appearance:none;appearance:none;background:var(--c);color:inherit;font:inherit;line-height:0;cursor:pointer;-webkit-tap-highlight-color:transparent;outline:none}
  @media (hover:hover){.rn-cell:hover{background-image:linear-gradient(var(--rn-hover),var(--rn-hover))}}
  .rn-cell.rn-bad::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--danger) 45%,transparent) 0 4px,transparent 4px 9px)}
  .rn-lines{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;overflow:visible}
  .rn-lines path{fill:none;vector-effect:non-scaling-stroke}
  .rn-lines .rn-inner{stroke:var(--rn-thin);stroke-width:1px}
  .rn-lines .rn-border{stroke:var(--rn-edge);stroke-width:3px;stroke-linecap:round}
  .rn-o{position:absolute;inset:0;z-index:2;pointer-events:none}
  .rn-cell.rn-spot .rn-o{background:color-mix(in srgb,var(--hint) 30%,transparent)}
  .rn-cell.rn-hint .rn-o{box-shadow:inset 0 0 0 3px var(--hint);animation:rn-pulse 1s ease-in-out 3}
  .rn-m{position:relative;z-index:3;display:flex;align-items:center;justify-content:center;pointer-events:none}
  .rn-m svg{display:block;overflow:visible}
  .rn-q{width:calc(var(--rn-cell) * .7);height:calc(var(--rn-cell) * .7)}
  .rn-q *{stroke:${INK};stroke-width:1.6px;stroke-linejoin:round;vector-effect:non-scaling-stroke}
  .rn-q .rn-b{fill:#F5C542} .rn-q .rn-d{fill:#E0A526}
  .rn-cell.rn-bad .rn-q .rn-b{fill:#E5484D} .rn-cell.rn-bad .rn-q .rn-d{fill:#B8323A}
  .rn-x{width:calc(var(--rn-cell) * .5);height:calc(var(--rn-cell) * .5);color:var(--rn-x)}
  .rn-x path{fill:none;stroke:currentColor;stroke-width:2px;stroke-linecap:round;vector-effect:non-scaling-stroke}
  .rn-cell:focus-visible::after{content:"";position:absolute;inset:0;z-index:4;outline:3px solid var(--focus);outline-offset:-3px}
  .rn-m.rn-pop{animation:rn-pop .3s ease-out}
  .rn-m.rn-nope{animation:rn-shake .4s ease-in-out}
  .rn-won .rn-cell{cursor:default}
  .rn-won .rn-x{opacity:0;transition:opacity .5s}
  .rn-won .rn-cell.rn-hasq .rn-m{animation:rn-win .7s ease-out both;animation-delay:calc(var(--d, 0) * 90ms)}
  @keyframes rn-pop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.12);opacity:1}100%{transform:none}}
  @keyframes rn-shake{20%{translate:-4px 0}40%{translate:4px 0}60%{translate:-2px 0}80%{translate:2px 0}}
  @keyframes rn-pulse{50%{box-shadow:inset 0 0 0 6px var(--hint)}}
  @keyframes rn-win{0%,100%{transform:none}45%{transform:translateY(-12%) scale(1.18)}}
  `;

  const CONFLITO = {
    linha: (r, c) => ['Duas rainhas na mesma linha', `Já existe uma rainha na linha ${r + 1}. Cada linha leva uma só.`],
    coluna: (r, c) => ['Duas rainhas na mesma coluna', `Já existe uma rainha na coluna ${c + 1}. Cada coluna leva uma só.`],
    regiao: (r, c, nome) => ['Duas rainhas na mesma região', `A região ${nome} já tem uma rainha. Cada região leva uma só.`],
    toque: () => ['Rainhas encostadas', 'Duas rainhas não podem se tocar, nem na diagonal.'],
  };

  Jogos.register({
    id: 'rainhas',
    name: 'Rainhas',
    tagline: 'Uma rainha por linha, coluna e região colorida, sem nenhuma encostar na outra.',
    icon: ICON,
    css: CSS,
    metric: { label: 'Tempo', unit: ['segundo', 'segundos'], format: 'time' },
    generated: true,
    levels: [
      { id: 'facil', name: 'Fácil', blurb: 'Cinco regiões e deduções diretas para pegar o jeito.' },
      { id: 'medio', name: 'Médio', blurb: 'Seis regiões e nenhuma rainha de graça: comece pelas regiões mais apertadas.' },
      { id: 'dificil', name: 'Difícil', blurb: 'Sete regiões: às vezes é preciso pensar em duas regiões ao mesmo tempo.' },
      { id: 'muito', name: 'Muito difícil', blurb: 'Nove regiões num tabuleiro grande; marque ✕ para não se perder.' },
    ].map(l => Object.assign(l, LEVELS[l.id], { sub: `<span class="cnt">${LEVELS[l.id].N} rainhas · </span>${LEVELS[l.id].N}×${LEVELS[l.id].N}` })),
    rules: () => [
      { key: 'linha', icon: ICO_LINHA, html: 'Exatamente <b>uma rainha em cada linha</b>.' },
      { key: 'coluna', icon: ICO_COLUNA, html: 'Exatamente <b>uma rainha em cada coluna</b>.' },
      { key: 'regiao', icon: ICO_REGIAO, html: 'Exatamente <b>uma rainha em cada região</b> colorida.' },
      { key: 'toque', icon: ICO_TOQUE, html: 'Duas rainhas <b>nunca se tocam</b>, nem na diagonal.' },
    ],
    how: 'Toque numa casa para marcar <b>✕</b> (aqui não tem rainha), toque de novo para pôr a <b>rainha</b> e mais uma vez para limpar. '
      + 'Para pôr ou tirar a rainha direto, <b>segure</b> a casa ou use o <b>botão direito</b>. '
      + 'No teclado: <b>setas</b> andam, <b>Espaço</b> alterna, <b>Q</b> põe a rainha e <b>X</b> marca ✕. Rainhas em conflito ficam vermelhas.',

    mount(ctx) {
      const { h } = ctx, N = ctx.level.N, NN = N * N;
      const P = generate(N, ctx.rng, ctx.level);
      const names = P.colors.map(c => COLOR_NAMES[c]);
      const st = new Uint8Array(NN);                  // 0 vazia · 1 ✕ · 2 rainha
      const hist = [];                                 // { i, from, to }
      const shown = new Int8Array(NN).fill(-1), labels = new Array(NN).fill('');
      let secs = 0, cursor = 0, hintCell = -1, spot = null, press = null, noClickUntil = 0, noMenuUntil = 0;
      ctx.setMin(null);
      ctx.setMoves(0);

      // Tabuleiro: casas (botões) + linhas por cima (grossas entre regiões, finas dentro de uma região)
      const cells = [];
      for (let i = 0; i < NN; i++) {
        cells.push(h('button', { type: 'button', class: 'rn-cell', tabindex: i ? '-1' : '0', 'data-i': String(i), style: { '--c': `var(--rn-${P.colors[P.reg[i]]})` } },
          h('span', { class: 'rn-o' }), h('span', { class: 'rn-m' })));
      }
      let thin = '', thick = '';
      for (let i = 0; i < NN; i++) {
        const r = (i / N) | 0, c = i % N;
        if (c < N - 1) { const d = `M${c + 1} ${r}v1`; if (P.reg[i] === P.reg[i + 1]) thin += d; else thick += d; }
        if (r < N - 1) { const d = `M${c} ${r + 1}h1`; if (P.reg[i] === P.reg[i + N]) thin += d; else thick += d; }
      }
      const lines = ctx.svg('svg', { class: 'rn-lines', viewBox: `0 0 ${N} ${N}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' },
        ctx.svg('path', { class: 'rn-inner', d: thin || 'M0 0', 'vector-effect': 'non-scaling-stroke' }),
        ctx.svg('path', { class: 'rn-border', d: thick || 'M0 0', 'vector-effect': 'non-scaling-stroke' }));
      const grid = h('div', { class: 'rn-grid', role: 'group', 'aria-label': `Tabuleiro ${N} por ${N} com ${N} regiões coloridas` }, cells, lines);
      const wrap = h('div', { class: 'rn-wrap', style: { '--rn-n': String(N) } }, grid);
      ctx.board.append(wrap);

      // Casa quadrada que cabe na largura do tabuleiro (w = clientWidth, já com o padding). Se ficar abaixo de 36px,
      // a grade pode avançar sobre o padding, mas sempre com 6px de folga de cada lado: nada sai de 0..w e a
      // moldura de 3px continua visível (9 × 36 = 324px num tabuleiro de 341px).
      const fit = w => {
        if (!w) return;
        const pad = parseFloat(getComputedStyle(ctx.board).paddingLeft) || 0;
        let cell = Math.floor(Math.min(w - 2 * pad, 520) / N);
        if (cell < 36) cell = Math.min(36, Math.floor((w - 12) / N));
        wrap.style.setProperty('--rn-cell', Math.max(16, Math.min(68, cell)) + 'px');
      };
      fit(ctx.board.clientWidth);   // já na montagem: não depende do ResizeObserver, que não roda com a aba/painel oculto
      ctx.onResize(fit);

      const queens = () => { const q = []; for (let i = 0; i < NN; i++) if (st[i] === 2) q.push(i); return q; };
      const unitCells = u => [...Array(NN).keys()].filter(i => (u < N ? ((i / N) | 0) === u : u < 2 * N ? i % N === u - N : P.reg[i] === u - 2 * N));
      const label = (i, v, bad) => `Linha ${((i / N) | 0) + 1}, coluna ${(i % N) + 1}, região ${names[P.reg[i]]}: `
        + (v === 2 ? (bad ? 'rainha em conflito' : 'rainha') : v === 1 ? 'marcada com X' : 'vazia');

      function render(pop = -1) {
        const qs = queens(), { bad } = conflicts(N, P.reg, qs);
        for (let i = 0; i < NN; i++) {
          const b = cells[i], v = st[i];
          if (shown[i] !== v) {
            shown[i] = v;
            b.lastChild.innerHTML = v === 2 ? QUEEN : v === 1 ? MARK : '';
            if (i === pop && v && !ctx.reduced) ctx.retrigger(b.lastChild, 'rn-pop', 320);
          }
          b.classList.toggle('rn-hasq', v === 2);
          b.classList.toggle('rn-bad', bad.has(i));
          b.classList.toggle('rn-hint', i === hintCell);
          b.classList.toggle('rn-spot', !!spot && spot.has(i));
          const l = label(i, v, bad.has(i));
          if (labels[i] !== l) { labels[i] = l; b.setAttribute('aria-label', l); }
        }
        ctx.controls({ undo: hist.length > 0 });
        if (ctx.status !== 'play') return;
        const n = qs.length;
        ctx.say(`${n} de ${N} rainhas`,
          bad.size ? 'As rainhas em vermelho estão em conflito: tire ou mova uma delas.'
            : !n && !st.includes(1) ? 'Toque numa casa para marcar ✕ e toque de novo para pôr uma rainha.'
              : `Falta${N - n > 1 ? 'm' : ''} ${N - n}: uma por linha, coluna e região, sem encostar.`);
      }

      function clearHint() {
        hintCell = -1;
        spot = null;
        if (ctx.clearHint) ctx.clearHint();
      }
      function set(i, v) {
        if (ctx.status !== 'play' || st[i] === v) return;
        hist.push({ i, from: st[i], to: v });
        st[i] = v;
        clearHint();
        render(i);
        if (v === 2) warnConflict(i);
        checkWin();
      }
      const tap = i => set(i, (st[i] + 1) % 3);
      const toggleQueen = i => set(i, st[i] === 2 ? 0 : 2);
      const toggleMark = i => set(i, st[i] === 1 ? 0 : 1);

      function warnConflict(i) {
        const order = ['linha', 'coluna', 'regiao', 'toque'];
        const mine = conflicts(N, P.reg, queens()).pairs.filter(p => p.a === i || p.b === i);
        if (!mine.length) return;
        const p = mine.sort((x, y) => order.indexOf(x.why) - order.indexOf(y.why))[0];
        const [t, d] = CONFLITO[p.why]((i / N) | 0, i % N, names[P.reg[i]]);
        ctx.warn(t, d, p.why);
        if (!ctx.reduced) for (const j of [p.a, p.b]) ctx.retrigger(cells[j].lastChild, 'rn-nope', 420);
      }
      function checkWin() {
        const qs = queens();
        if (ctx.status !== 'play' || !isSolved(N, P.reg, qs)) return;
        hintCell = -1;
        spot = null;
        qs.forEach(i => cells[i].lastChild.style.setProperty('--d', String((i / N) | 0)));
        grid.classList.add('rn-won');
        ctx.win({ score: secs });
        render();
      }

      // Relógio: conta só enquanto a página está visível e o jogo em andamento
      ctx.every(() => {
        if (ctx.status !== 'play' || document.hidden) return;
        secs++;
        ctx.setMoves(secs);
      }, 1000);

      // Toque/clique alterna; segurar (ou botão direito) põe/tira a rainha direto
      const cellOf = e => {
        const b = e.target && e.target.closest ? e.target.closest('.rn-cell') : null;
        return b && grid.contains(b) ? +b.dataset.i : -1;
      };
      const cancelPress = () => { if (press) { clearTimeout(press.timer); press = null; } };
      ctx.listen(grid, 'click', e => {
        const i = cellOf(e);
        if (i < 0) return;
        if (performance.now() < noClickUntil) { noClickUntil = 0; return; }   // o toque longo já agiu
        tap(i);
      });
      ctx.listen(grid, 'contextmenu', e => {
        const i = cellOf(e);
        if (i < 0) return;
        e.preventDefault();
        if (performance.now() < noMenuUntil) return;
        cancelPress();
        toggleQueen(i);
        noClickUntil = performance.now() + 800;
      });
      ctx.listen(grid, 'pointerdown', e => {
        cancelPress();
        noClickUntil = noMenuUntil = 0;
        const i = cellOf(e);
        if (i < 0 || e.button !== 0 || e.ctrlKey) return;
        press = { i, id: e.pointerId, x: e.clientX, y: e.clientY };
        press.timer = ctx.later(() => {
          const p = press;
          press = null;
          if (!p) return;
          noClickUntil = performance.now() + 800;
          noMenuUntil = performance.now() + 1500;
          toggleQueen(p.i);
        }, 450);
      });
      ctx.listen(grid, 'pointermove', e => {
        if (press && e.pointerId === press.id && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) cancelPress();
      });
      for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
        ctx.listen(grid, type, e => { if (press && e.pointerId === press.id) cancelPress(); });
      }

      // Teclado: setas movem o foco entre as casas; Espaço/Enter (clique do botão) alterna; Q rainha; X marca
      function focusCell(i) {
        if (i !== cursor) { cells[cursor].tabIndex = -1; cells[i].tabIndex = 0; cursor = i; }
        cells[i].focus();
      }
      ctx.listen(grid, 'focusin', e => {
        const i = cellOf(e);
        if (i >= 0 && i !== cursor) { cells[cursor].tabIndex = -1; cells[i].tabIndex = 0; cursor = i; }
      });
      ctx.listen(grid, 'keydown', e => {
        const i = cellOf(e);
        if (i < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
        const r = (i / N) | 0, c = i % N;
        let to = -1;
        switch (e.key) {
          case 'ArrowUp': to = r > 0 ? i - N : i; break;
          case 'ArrowDown': to = r < N - 1 ? i + N : i; break;
          case 'ArrowLeft': to = c > 0 ? i - 1 : i; break;
          case 'ArrowRight': to = c < N - 1 ? i + 1 : i; break;
          case 'q': case 'Q': e.preventDefault(); toggleQueen(i); return;
          case 'x': case 'X': e.preventDefault(); toggleMark(i); return;
          case 'Delete': case 'Backspace': e.preventDefault(); set(i, 0); return;
          default: return;
        }
        e.preventDefault();
        focusCell(to);
      });

      render();

      return {
        onHint() {
          if (ctx.status !== 'play') return;
          const hn = hintFor(P, queens());
          if (!hn) return;
          const txt = hintText(P, hn, names);
          if (hn.t === 'wrong') {         // aponta a rainha errada; quem tira é a pessoa
            hintCell = hn.cell;
            spot = null;
            render();
            ctx.hint(txt.title, txt.text);
            return;
          }
          const from = st[hn.cell];
          hist.push({ i: hn.cell, from, to: 2 });
          st[hn.cell] = 2;
          hintCell = hn.cell;
          // destaca o que a explicação cita: a região/linha em questão
          const e = hn.via;
          const src = !e ? (hn.t === 'single' ? unitCells(hn.u) : [])
            : e.t === 'regIn' ? unitCells(2 * N + e.k)
              : e.t === 'lineIn' ? unitCells(e.u)
                : e.t === 'group' ? (e.regs.length <= e.rest.length ? e.regs : e.rest).flatMap(k => unitCells(2 * N + k))
                  : e.t === 'block' ? [e.cell, ...unitCells(e.u)] : [e.cell];
          spot = new Set(src.filter(i => i !== hn.cell));
          render(hn.cell);
          ctx.hint(txt.title, txt.text + (from === 1 ? ' (O ✕ que estava nessa casa estava errado.)' : ''));
          checkWin();
        },
        onUndo() {
          if (ctx.status !== 'play' || !hist.length) return;
          const last = hist.pop();
          st[last.i] = last.from;
          clearHint();
          render();
        },
      };
    },
  });
})();
