/* Quem mora onde? — enigma de dedução no estilo do "problema de Einstein" */
(() => {
  // ---------- lógica pura (testável no Node) ----------
  const K = typeof JogosCore !== 'undefined' ? JogosCore : require('../kit-core.js');

  // Valores de cada atributo. "|" marca onde a palavra pode quebrar (com hífen) nas células estreitas.
  const SHY = String.fromCharCode(173);           // hífen suave
  const V = (s, extra) => Object.assign({ name: s.replace(/\|/g, ''), hy: s.replace(/\|/g, SHY) }, extra);
  const CATS = {
    cor: { key: 'cor', label: 'Cor', kind: 'cor', values: [
      V('ver|me|lha', { fill: '#E5484D' }), V('la|ran|ja', { fill: '#F08A24' }), V('a|ma|re|la', { fill: '#F2C230' }),
      V('ver|de', { fill: '#3FA66B' }), V('a|zul', { fill: '#3E7BD9' }), V('ro|xa', { fill: '#8B5CD6' }),
      V('ro|sa', { fill: '#E86FA4' }), V('bran|ca', { fill: '#F7F3EA' })] },
    nome: { key: 'nome', label: 'Morador(a)', kind: 'nome', values: [
      'Ana', 'Bia', 'Carla', 'Duda', 'Elisa', 'Flávia', 'Gabi', 'Helena', 'Iara', 'Júlia', 'Lara', 'Marina', 'Nina',
      'Olívia', 'Paula', 'Rita', 'Sofia', 'Tânia', 'Vera', 'Yasmin',
      'Bruno', 'Caio', 'Davi', 'Enzo', 'Fábio', 'Gil', 'Hugo', 'Igor', 'João', 'Lucas', 'Mateus', 'Nando',
      'Otávio', 'Pedro', 'Rafael', 'Samuel', 'Téo', 'Vítor', 'Yuri', 'Zeca'].map(n => V(n)) },
    animal: { key: 'animal', label: 'Animal', kind: 'outro', pre: 'tem', values: [
      V('ca|chor|ro'), V('ga|to'), V('pei|xe'), V('pás|sa|ro'), V('co|e|lho'), V('tar|ta|ru|ga'), V('hams|ter'), V('pa|pa|gai|o')] },
    bebida: { key: 'bebida', label: 'Bebida', kind: 'outro', pre: 'bebe', values: [
      V('ca|fé'), V('chá'), V('su|co'), V('lei|te'), V('á|gua'), V('chi|mar|rão', { pre: 'toma' }), V('gua|ra|ná'), V('li|mo|na|da')] },
    esporte: { key: 'esporte', label: 'Esporte', kind: 'outro', pre: 'joga', values: [
      V('fu|te|bol'), V('vô|lei'), V('bas|que|te'), V('tê|nis'), V('han|de|bol'), V('na|ta|ção', { pre: 'faz' }),
      V('ju|dô', { pre: 'faz' }), V('ska|te', { pre: 'anda de' })] },
    fruta: { key: 'fruta', label: 'Fruta', kind: 'outro', pre: 'adora', values: [
      V('man|ga'), V('ba|na|na'), V('u|va'), V('ma|çã'), V('a|ba|ca|xi'), V('ca|ju'), V('goi|a|ba'), V('a|ça|í')] },
    instrumento: { key: 'instrumento', label: 'Instrumento', kind: 'outro', pre: 'toca', values: [
      V('vi|o|lão'), V('pi|a|no'), V('flau|ta'), V('ba|te|ri|a'), V('san|fo|na'), V('pan|dei|ro'), V('ca|va|qui|nho'), V('vi|o|li|no')] },
  };
  const EXTRAS = ['animal', 'bebida', 'esporte', 'fruta', 'instrumento'];

  // Tipos de pista (x e y são variáveis "atributo a, valor v" = a*N + v; k é uma casa, 0 = casa 1):
  // pos x em k · npos x fora de k · ends x numa ponta · same/nsame x e y na mesma casa (ou não)
  // next vizinhos · nnext não vizinhos · left1 x logo à esquerda de y · left x em algum lugar à esquerda de y
  // gap exatamente uma casa entre x e y
  const TYPES = ['pos', 'npos', 'ends', 'same', 'nsame', 'next', 'nnext', 'left1', 'left', 'gap'];
  const W = (pos, npos, ends, same, nsame, next, nnext, left1, left, gap) => ({ pos, npos, ends, same, nsame, next, nnext, left1, left, gap });
  const LEVELS = [
    { id: 'facil', name: 'Fácil', n: 3, m: 3, hyp: 0, maxPos: 3, maxClues: 8,
      weights: W(3, 0.4, 1, 3, 1.2, 1.5, 0, 1, 1, 0), removeFirst: [],
      blurb: 'Três casas, três atributos e pistas bem diretas para pegar o jeito.' },
    { id: 'medio', name: 'Médio', n: 4, m: 3, hyp: 0, maxPos: 3, maxClues: 11,
      weights: W(2, 0.6, 1, 3, 1.5, 2, 0.5, 1.5, 1.5, 0.5), removeFirst: [],
      blurb: 'Quatro casas: as pistas de vizinhança começam a pesar.' },
    { id: 'dificil', name: 'Difícil', n: 4, m: 4, hyp: 0, maxPos: 2, maxClues: 15,
      weights: W(0.8, 1, 1, 3, 2, 2, 1, 1.5, 1.5, 1), removeFirst: ['pos', 'ends'],
      blurb: 'Quatro casas, quatro atributos e poucas pistas de posição.' },
    { id: 'muito', name: 'Muito difícil', n: 5, m: 5, hyp: 2, maxPos: 2, maxClues: 22,
      weights: W(0.6, 1, 0.8, 3, 2, 2, 1, 1.5, 1.5, 1), removeFirst: ['pos', 'ends'],
      blurb: 'Cinco casas e cinco atributos: o clássico problema de Einstein.' },
  ];

  const range = n => Array.from({ length: n }, (_, i) => i);
  const bits = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
  const single = m => m !== 0 && (m & (m - 1)) === 0;
  const low = m => 31 - Math.clz32(m & -m);
  const high = m => 31 - Math.clz32(m);
  const full = (N, M) => new Uint8Array(N * M).fill((1 << N) - 1);
  const solved = D => D.every(single);

  // Aplica uma pista aos domínios D (máscara de casas possíveis de cada variável). -1: contradição · 1: mudou · 0: nada.
  function apply(c, D, N) {
    const F = (1 << N) - 1, x = c.x, y = c.y, dx = D[x], dy = y >= 0 ? D[y] : F;
    let nx = dx, ny = dy;
    switch (c.t) {
      case 'pos': nx = dx & (1 << c.k); break;
      case 'npos': nx = dx & ~(1 << c.k); break;
      case 'ends': nx = dx & (1 | (1 << (N - 1))); break;
      case 'same': nx = ny = dx & dy; break;
      case 'nsame': if (single(dy)) nx = dx & ~dy; if (single(dx)) ny = dy & ~dx; break;
      case 'next': nx = dx & ((dy << 1) | (dy >> 1)); ny = dy & ((nx << 1) | (nx >> 1)); break;
      case 'nnext': if (single(dy)) nx = dx & ~((dy << 1) | (dy >> 1)); if (single(dx)) ny = dy & ~((dx << 1) | (dx >> 1)); break;
      case 'left1': nx = dx & (dy >> 1); ny = dy & (nx << 1); break;
      case 'left':
        if (!dy) return -1;
        nx = dx & ((1 << high(dy)) - 1);
        if (!nx) return -1;
        ny = dy & ~((2 << low(nx)) - 1);
        break;
      case 'gap': nx = dx & ((dy << 2) | (dy >> 2)); ny = dy & ((nx << 2) | (nx >> 2)); break;
    }
    nx &= F; ny &= F;
    if (!nx || !ny) return -1;
    if (nx === dx && ny === dy) return 0;
    D[x] = nx;
    if (y >= 0) D[y] = ny;
    return 1;
  }

  // Propagação até estabilizar: pistas + "cada valor numa casa, cada casa com um valor" em cada atributo.
  function propagate(D, clues, N, M) {
    for (let guard = 0; guard < 500; guard++) {
      let changed = false;
      for (let i = 0; i < clues.length; i++) {
        const r = apply(clues[i], D, N);
        if (r < 0) return false;
        if (r) changed = true;
      }
      for (let a = 0; a < M; a++) {
        const b = a * N;
        for (let again = true; again;) {
          again = false;
          for (let v = 0; v < N; v++) {
            const m = D[b + v];
            if (!m) return false;
            if (m & (m - 1)) continue;
            for (let w = 0; w < N; w++) {
              if (w === v || !(D[b + w] & m)) continue;
              if (!(D[b + w] &= ~m)) return false;
              again = changed = true;
            }
          }
          for (let p = 0; p < N; p++) {
            const bit = 1 << p;
            let cnt = 0, last = -1;
            for (let v = 0; v < N; v++) if (D[b + v] & bit) { cnt++; last = v; }
            if (!cnt) return false;
            if (cnt === 1 && D[b + last] !== bit) { D[b + last] = bit; again = changed = true; }
          }
        }
      }
      if (!changed) return true;
    }
    return true;
  }

  // Solucionador completo (backtracking com poda pela propagação): quantas soluções existem, até `limit`.
  function countSolutions(clues, N, M, limit = 2, D = full(N, M)) {
    if (!propagate(D, clues, N, M)) return 0;
    let best = -1, bc = 99;
    for (let i = 0; i < D.length; i++) { const c = bits(D[i]); if (c > 1 && c < bc) { bc = c; best = i; if (c === 2) break; } }
    if (best < 0) return 1;
    let total = 0;
    for (let m = D[best]; m && total < limit;) {
      const bit = m & -m;
      m ^= bit;
      const E = D.slice();
      E[best] = bit;
      total += countSolutions(clues, N, M, limit - total, E);
    }
    return total;
  }

  // Uma hipótese que dá contradição: "se X estivesse na casa k, alguma pista quebraria" (variáveis com menos opções primeiro).
  function findElimination(D, clues, N, M) {
    const idx = range(D.length).filter(i => !single(D[i])).sort((i, j) => bits(D[i]) - bits(D[j]) || i - j);
    for (const i of idx) {
      for (let m = D[i]; m;) {
        const bit = m & -m;
        m ^= bit;
        const E = D.slice();
        E[i] = bit;
        if (!propagate(E, clues, N, M)) return { i, k: low(bit) };
      }
    }
    return null;
  }

  // Quantas hipóteses são necessárias além da dedução direta: 0 = só dedução direta;
  // -1 = contraditório, sem solução única ou precisaria de mais que `max` hipóteses.
  function hypotheses(clues, N, M, max = 0) {
    const D = full(N, M);
    if (!propagate(D, clues, N, M)) return -1;
    let n = 0;
    while (!solved(D)) {
      if (n >= max) return -1;
      const e = findElimination(D, clues, N, M);
      if (!e) return -1;
      D[e.i] &= ~(1 << e.k);
      if (!propagate(D, clues, N, M)) return -1;
      n++;
    }
    return n;
  }

  function holds(c, P, N) {
    const px = P[c.x], py = c.y >= 0 ? P[c.y] : -1, d = py - px;
    switch (c.t) {
      case 'pos': return px === c.k;
      case 'npos': return px !== c.k;
      case 'ends': return px === 0 || px === N - 1;
      case 'same': return d === 0;
      case 'nsame': return d !== 0;
      case 'next': return Math.abs(d) === 1;
      case 'nnext': return Math.abs(d) !== 1;
      case 'left1': return d === 1;
      case 'left': return d > 0;
      case 'gap': return Math.abs(d) === 2;
    }
    return false;
  }

  // Todas as pistas verdadeiras para a solução sol[a][v] = casa.
  function candidates(sol, N, M) {
    const out = [];
    for (let a = 0; a < M; a++) for (let v = 0; v < N; v++) {
      const x = a * N + v, p = sol[a][v];
      out.push({ t: 'pos', x, y: -1, k: p });
      for (let k = 0; k < N; k++) if (k !== p) out.push({ t: 'npos', x, y: -1, k });
      if (p === 0 || p === N - 1) out.push({ t: 'ends', x, y: -1, k: -1 });
    }
    for (let a = 0; a < M; a++) for (let v = 0; v < N; v++) for (let b = a; b < M; b++) for (let w = b === a ? v + 1 : 0; w < N; w++) {
      const x = a * N + v, y = b * N + w, d = sol[b][w] - sol[a][v], ad = Math.abs(d);
      const lr = d > 0 ? { x, y } : { x: y, y: x };
      if (a !== b) out.push({ t: d === 0 ? 'same' : 'nsame', x, y, k: -1 });
      if (ad === 1) out.push({ t: 'next', x, y, k: -1 }, { t: 'left1', ...lr, k: -1 });
      if (ad >= 2) out.push({ t: 'nnext', x, y, k: -1 });
      if (ad >= 1) out.push({ t: 'left', ...lr, k: -1 });
      if (ad === 2) out.push({ t: 'gap', x, y, k: -1 });
    }
    return out;
  }

  // Ordem aleatória ponderada: cada tipo recebe o peso total pedido, dividido entre as pistas daquele tipo.
  function weightedOrder(cands, weights, rng) {
    const count = {};
    cands.forEach(c => { count[c.t] = (count[c.t] || 0) + 1; });
    return cands
      .map(c => ({ c, key: weights[c.t] > 0 ? -Math.log(1 - rng()) * count[c.t] / weights[c.t] : Infinity }))
      .filter(o => o.key < Infinity)
      .sort((p, q) => p.key - q.key)
      .map(o => o.c);
  }

  function pickValues(key, N, rng) {
    const pool = CATS[key].values;
    let idx = rng.shuffle(range(pool.length));
    if (key === 'nome') {                      // iniciais diferentes (fáceis de distinguir); com 5 casas, nomes curtos
      const seen = new Set();
      idx = idx.filter(i => {
        const n = pool[i].name;
        if (seen.has(n[0]) || (N >= 5 && n.length > 5)) return false;
        seen.add(n[0]);
        return true;
      });
    }
    return idx.slice(0, N).sort((i, j) => pool[i].name.localeCompare(pool[j].name, 'pt-BR'));
  }

  // Gera um desafio: sorteia a solução, junta pistas até a dedução direta resolver tudo e depois tenta
  // tirar cada pista: se a solução continua única (e alcançável com até level.hyp hipóteses), ela sai.
  // Mesma sequência do rng → mesmo desafio.
  function generate(level, rng) {
    const N = level.n, M = level.m;
    const prio = t => { const i = level.removeFirst.indexOf(t); return i < 0 ? level.removeFirst.length : i; };
    const ok = cl => hypotheses(cl, N, M, level.hyp) >= 0 && (!level.hyp || countSolutions(cl, N, M, 2) === 1);
    let best = null;
    for (let tries = 0; tries < 80; tries++) {
      const cats = ['cor', 'nome', ...rng.shuffle(EXTRAS).slice(0, M - 2)];
      const vals = cats.map(key => pickValues(key, N, rng));
      const sol = cats.map(() => rng.shuffle(range(N)));
      const D = full(N, M), chosen = [];
      for (const c of weightedOrder(candidates(sol, N, M), level.weights, rng)) {
        const E = D.slice();
        chosen.push(c);
        propagate(E, chosen, N, M);
        if (E.every((m, i) => m === D[i])) { chosen.pop(); continue; }   // não acrescenta nada agora
        D.set(E);
        if (solved(D)) break;
      }
      if (!solved(D)) continue;
      let cur = chosen.slice();
      for (let removed = true; removed;) {       // repete: com hipóteses, tirar uma pista pode liberar outra
        removed = false;
        for (const c of rng.shuffle(cur).sort((p, q) => prio(p.t) - prio(q.t))) {
          const without = cur.filter(z => z !== c);
          if (ok(without)) { cur = without; removed = true; }
        }
      }
      if (countSolutions(cur, N, M, 2) !== 1) continue;          // conferência final com o solucionador completo
      const nPos = cur.filter(c => c.t === 'pos').length;
      const puz = { N, M, cats, vals, sol, clues: rng.shuffle(cur).map(c => ({ t: c.t, x: c.x, y: c.y, k: c.k, s: rng.int(2) })) };
      const score = Math.max(0, nPos - level.maxPos) * 10 + Math.max(0, cur.length - level.maxClues);
      if (!score) return puz;
      if (!best || score < best.score) best = { puz, score };
    }
    return best.puz;
  }

  // ---------- textos das pistas ----------
  const catOf = (puz, x) => CATS[puz.cats[Math.floor(x / puz.N)]];
  const valOf = (puz, x) => catOf(puz, x).values[puz.vals[Math.floor(x / puz.N)][x % puz.N]];
  const kind = (puz, x) => catOf(puz, x).kind;
  const RANK = { nome: 0, outro: 1, cor: 2 };
  const cap = s => s.replace(/^((?:<[^>]+>)*)(\p{L})/u, (m, t, ch) => t + ch.toUpperCase());
  const plain = html => html.replace(/<[^>]+>/g, '');
  const word = (puz, x) => (kind(puz, x) === 'cor' ? `<b class="qm-k" style="--c:${valOf(puz, x).fill}">${valOf(puz, x).name}</b>` : `<b>${valOf(puz, x).name}</b>`);
  const pred = (puz, x) => (kind(puz, x) === 'cor' ? `mora na casa ${word(puz, x)}` : `${valOf(puz, x).pre || catOf(puz, x).pre} ${word(puz, x)}`);
  const who = (puz, x) => (kind(puz, x) === 'nome' ? word(puz, x) : `quem ${pred(puz, x)}`);
  const subj = (puz, x, neg) => (kind(puz, x) === 'cor' ? `a casa ${word(puz, x)} ${neg ? 'não ' : ''}fica` : `${who(puz, x)} ${neg ? 'não ' : ''}mora`);
  // complemento de "ao lado", "à esquerda"...: "de Ana", "de quem tem gato", "da casa azul" (ou "da azul" depois de outra cor)
  function obj(puz, o, s) {
    if (kind(puz, o) === 'cor') return kind(puz, s) === 'cor' ? `da ${word(puz, o)}` : `da casa ${word(puz, o)}`;
    return kind(puz, s) === 'cor' ? `da casa de ${who(puz, o)}` : `de ${who(puz, o)}`;
  }
  const casa = (puz, x, elide) => `a ${elide ? '' : 'casa '}${kind(puz, x) === 'cor' ? word(puz, x) : `de ${who(puz, x)}`}`;
  const middle = (puz, k) => puz.N % 2 === 1 && k === (puz.N - 1) / 2;
  // Sujeito da frase: nome > outros atributos > cor (a cor soa melhor como complemento); empate decidido por c.s.
  function order(puz, c) {
    const rx = RANK[kind(puz, c.x)], ry = RANK[kind(puz, c.y)];
    return rx < ry || (rx === ry && !c.s) ? [c.x, c.y] : [c.y, c.x];
  }
  function clueHTML(puz, c) {
    let s;
    if (c.t === 'pos' || c.t === 'npos') {
      const neg = c.t === 'npos', where = middle(puz, c.k) ? 'casa do meio' : `casa ${c.k + 1}`;
      s = kind(puz, c.x) === 'cor' ? `a ${where} ${neg ? 'não ' : ''}é ${word(puz, c.x)}` : `${subj(puz, c.x, neg)} na ${where}`;
    } else if (c.t === 'ends') {
      s = `${subj(puz, c.x)} em uma das pontas`;
    } else if (c.t === 'same' || c.t === 'nsame') {
      const [a, b] = order(puz, c);
      s = `${who(puz, a)} ${c.t === 'nsame' ? 'não ' : ''}${pred(puz, b)}`;
    } else if (c.t === 'gap') {
      const kx = kind(puz, c.x), ky = kind(puz, c.y);
      const first = kx === 'cor' || ky === 'cor' ? (kx === 'cor') === (ky === 'cor') ? !c.s : kx === 'cor' : order(puz, c)[0] === c.x;
      const [a, b] = first ? [c.x, c.y] : [c.y, c.x];
      s = `entre ${casa(puz, a)} e ${casa(puz, b, true)} há exatamente uma casa`;
    } else {
      const [a, b] = order(puz, c), dir = a === c.x ? 'esquerda' : 'direita';
      const rel = { next: 'ao lado', nnext: 'ao lado', left1: `logo à ${dir}`, left: `em algum lugar à ${dir}` }[c.t];
      s = `${subj(puz, a, c.t === 'nnext')} ${rel} ${obj(puz, b, a)}`;
    }
    return cap(s) + '.';
  }
  const clueText = (puz, c) => plain(clueHTML(puz, c));

  // ---------- conferência e dicas ----------
  // grid[a][p] = índice do valor escolhido na casa p (ou -1)
  const emptyGrid = puz => range(puz.M).map(() => range(puz.N).map(() => -1));
  const isSolved = (puz, grid) => grid.every((row, a) => row.every((v, p) => v >= 0 && puz.sol[a][v] === p));
  function duplicates(grid) {
    return grid.map(row => row.map((v, p) => v >= 0 && row.some((w, q) => q !== p && w === v)));
  }
  // Pistas que a tabela atual contradiz (só as que envolvem valores já colocados; repetições são ignoradas).
  function violations(puz, grid) {
    const P = new Int8Array(puz.N * puz.M).fill(-1);
    grid.forEach((row, a) => row.forEach((v, p) => { if (v >= 0) P[a * puz.N + v] = p; }));
    return puz.clues.map((c, i) => (P[c.x] >= 0 && (c.y < 0 || P[c.y] >= 0) && !holds(c, P, puz.N) ? i : -1)).filter(i => i >= 0);
  }
  // "Ana mora na casa 2", "a casa 2 é azul", "quem mora na casa 2 tem gato" (sem maiúscula nem ponto final)
  function factHTML(puz, x, k) {
    if (kind(puz, x) === 'cor') return `a casa ${k + 1} é ${word(puz, x)}`;
    if (kind(puz, x) === 'nome') return `${word(puz, x)} mora na casa ${k + 1}`;
    return `quem mora na casa ${k + 1} ${pred(puz, x)}`;
  }
  // "se Ana morasse na casa 2", "se quem tem gato morasse na casa do meio", "se a casa 2 fosse azul"
  function hypText(puz, x, k) {
    const where = middle(puz, k) ? 'casa do meio' : `casa ${k + 1}`;
    return kind(puz, x) === 'cor' ? `se a ${where} fosse ${word(puz, x)}` : `se ${who(puz, x)} morasse na ${where}`;
  }
  // Próxima célula que dá para deduzir a partir das células certas da tabela.
  // Devolve { a, p, v, empty, clue, hyp? } — clue: índice da pista que fecha a dedução, -1 = por eliminação,
  // -2 = depois de descartar a hipótese hyp = { x, k }; null = nada a deduzir.
  function nextDeduction(puz, grid) {
    const { N, M, sol, clues } = puz;
    const D = full(N, M);
    grid.forEach((row, a) => row.forEach((v, p) => { if (v >= 0 && sol[a][v] === p) D[a * N + v] = 1 << p; }));
    propagate(D, [], N, M);
    const pick = (E, known) => {
      let found = null;
      for (let a = 0; a < M; a++) for (let v = 0; v < N; v++) {
        const i = a * N + v;
        if (!single(E[i]) || (known && single(known[i]))) continue;
        const p = low(E[i]), cur = grid[a][p];
        if (cur >= 0 && sol[a][cur] === p) continue;
        const f = { a, p, v, empty: cur < 0 };
        if (f.empty) return f;
        if (!found) found = f;
      }
      return found;
    };
    const first = pick(D, null);
    if (first) return Object.assign(first, { clue: -1 });
    for (let round = 0; round < 200; round++) {
      let fallback = null;
      for (let i = 0; i < clues.length; i++) {           // uma pista sozinha já resolve alguma célula?
        const E = D.slice();
        if (!propagate(E, [clues[i]], N, M)) continue;
        const f = pick(E, D);
        if (f && f.empty) return Object.assign(f, { clue: i });
        if (f && !fallback) fallback = Object.assign(f, { clue: i });
      }
      if (fallback) return fallback;
      let changed = false;                               // senão, avança um passo com todas as pistas
      for (let i = 0; i < clues.length; i++) {
        const r = apply(clues[i], D, N);
        if (r < 0) return null;
        if (!r) continue;
        changed = true;
        propagate(D, [], N, M);
        const f = pick(D, null);
        if (f) return Object.assign(f, { clue: i });
      }
      if (!changed) break;
    }
    // A dedução direta parou (D está estável com todas as pistas): testa hipóteses, como no nível mais difícil.
    for (let n = 0; n < 40; n++) {
      const e = findElimination(D, clues, N, M);
      if (!e) break;
      D[e.i] &= ~(1 << e.k);
      if (!propagate(D, clues, N, M)) break;
      const f = pick(D, null);
      if (f) return Object.assign(f, { clue: -2, hyp: { x: e.i, k: e.k } });
    }
    return null;
  }

  const logic = {
    CATS, EXTRAS, TYPES, LEVELS, apply, propagate, countSolutions, hypotheses, findElimination, holds, candidates, generate,
    clueHTML, clueText, factHTML, hypText, cap, plain, emptyGrid, isSolved, duplicates, violations, nextDeduction,
    full, solved, catOf, valOf,
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = logic; return; }

  // ---------- interface ----------
  const INK = '#2A2433';
  const capWord = s => s.charAt(0).toUpperCase() + s.slice(1);
  const norm = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const G = (w = 1.4) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"`;

  const ICON = `<svg viewBox="0 0 64 64" aria-hidden="true"><g ${G(1.6)}>
    <rect x="2" y="55" width="60" height="5" rx="2.5" fill="#3FA66B"/>
    <rect x="5" y="38.5" width="16" height="16.5" fill="#E5484D"/><path d="M2.5 40 13 29.5 23.5 40z" fill="#8C5A2D"/><rect x="10.5" y="45.5" width="5" height="9.5" rx="1.2" fill="#6B4423"/>
    <rect x="43" y="38.5" width="16" height="16.5" fill="#3E7BD9"/><path d="M40.5 40 51 29.5 61.5 40z" fill="#8C5A2D"/><rect x="48.5" y="45.5" width="5" height="9.5" rx="1.2" fill="#6B4423"/>
    <rect x="22.5" y="31" width="19" height="24" fill="#F2C230"/><path d="M19.5 32.5 32 20l12.5 12.5z" fill="#8C5A2D"/><rect x="29" y="44.5" width="6" height="10.5" rx="1.3" fill="#6B4423"/>
    <rect x="25.3" y="35.2" width="4.6" height="4.6" rx="1" fill="#FFF6DA"/><rect x="34.1" y="35.2" width="4.6" height="4.6" rx="1" fill="#FFF6DA"/>
    <circle cx="32" cy="10" r="7.6" fill="#FFFFFF"/></g>
    <path d="M29.1 7.8a2.9 2.9 0 1 1 4.8 2.2c-1.2.9-1.9 1.4-1.9 2.6" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="32" cy="15.4" r="1.3" fill="${INK}"/></svg>`;

  // Ícones das linhas da tabela (atributos)
  const ROW_ICONS = {
    cor: `<svg viewBox="0 0 24 24"><g ${G()}><circle cx="8.6" cy="9" r="5.3" fill="#E5484D"/><circle cx="15.4" cy="9" r="5.3" fill="#F2C230"/><circle cx="12" cy="15.4" r="5.3" fill="#3E7BD9"/></g></svg>`,
    nome: `<svg viewBox="0 0 24 24"><g ${G()}><path d="M4 21.5c0-4.8 3.6-7.8 8-7.8s8 3 8 7.8z" fill="#8B5CD6"/><circle cx="12" cy="8" r="4.3" fill="#F2C8A0"/></g></svg>`,
    animal: `<svg viewBox="0 0 24 24"><g ${G()} fill="#A86E3A"><ellipse cx="12" cy="15.6" rx="5.2" ry="4.4"/><circle cx="5.4" cy="10.3" r="2.3"/><circle cx="9.3" cy="6.2" r="2.3"/><circle cx="14.7" cy="6.2" r="2.3"/><circle cx="18.6" cy="10.3" r="2.3"/></g></svg>`,
    bebida: `<svg viewBox="0 0 24 24"><g ${G()}><path d="M16.5 9.5h1.3a2.7 2.7 0 0 1 0 5.4h-1.6" fill="none"/><path d="M4.5 7h12v8a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z" fill="#F7F3EA"/><path d="M4.5 7h12v3h-12z" fill="#8C5A2D"/></g></svg>`,
    esporte: `<svg viewBox="0 0 24 24"><g ${G()}><circle cx="12" cy="12" r="8.8" fill="#F08A24"/><path d="M3.2 12h17.6M12 3.2v17.6M6 5.6c3.2 3.4 3.2 9.4 0 12.8M18 5.6c-3.2 3.4-3.2 9.4 0 12.8" fill="none"/></g></svg>`,
    fruta: `<svg viewBox="0 0 24 24"><g ${G()}><path d="M12 8.2c-2.2-1.7-6.3-1.3-7.1 2.5-.8 3.5 1.3 8.5 4.2 9.5 1.2.4 2 0 2.9-.3.9.3 1.7.7 2.9.3 2.9-1 5-6 4.2-9.5-.8-3.8-4.9-4.2-7.1-2.5z" fill="#E5484D"/><path d="M12 8.2c0-2 .5-3.5 1.9-4.7" fill="none"/><path d="M13.6 5.7c1.5-2 3.8-1.9 5-1.4-.6 1.7-2.8 2.8-5 1.4z" fill="#3FA66B"/></g></svg>`,
    instrumento: `<svg viewBox="0 0 24 24"><g ${G()}><path d="M9.3 17.2V6.2l10-2.6v11" fill="none" stroke-width="1.8"/><ellipse cx="6.9" cy="17.4" rx="3" ry="2.4" fill="#8B5CD6"/><ellipse cx="16.9" cy="14.8" rx="3" ry="2.4" fill="#8B5CD6"/></g></svg>`,
  };

  // Ícones das regras
  const ICO_GRADE = (() => {
    const top = ['#E5484D', '#F2C230', '#3E7BD9'];
    let s = '';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) s += `<rect x="${3 + c * 9.75}" y="${3 + r * 9.75}" width="8.5" height="8.5" rx="2.2" fill="${r === 0 ? top[c] : '#FFFFFF'}"/>`;
    return `<svg viewBox="0 0 34 34"><g ${G()}>${s}</g></svg>`;
  })();
  const ICO_PISTAS = `<svg viewBox="0 0 34 34"><rect x="5.5" y="3" width="21" height="28" rx="3.5" fill="#FFF6DA" ${G()}/>
    <path d="M10 10h12M10 15h12M10 20h6" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="24.5" cy="24.5" r="6.2" fill="#3FA66B" ${G()}/><path d="M21.8 24.7l1.9 1.9 3.6-3.8" fill="none" stroke="#FFFFFF" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const ICO_LADOS = `<svg viewBox="0 0 34 34"><g ${G(1.3)}>
    <rect x="2.5" y="12" width="8" height="8" fill="#E5484D"/><path d="M1.2 12.8 6.5 7.5l5.3 5.3z" fill="#8C5A2D"/>
    <rect x="13" y="12" width="8" height="8" fill="#F2C230"/><path d="M11.7 12.8 17 7.5l5.3 5.3z" fill="#8C5A2D"/>
    <rect x="23.5" y="12" width="8" height="8" fill="#3E7BD9"/><path d="M22.2 12.8 27.5 7.5l5.3 5.3z" fill="#8C5A2D"/></g>
    <path d="M4 26.5h25m-4-3.5 4 3.5-4 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const CSS = `
  .qm{position:relative;width:100%;max-width:1060px;display:grid;gap:16px;align-items:start}
  .qm.qm-wide{grid-template-columns:minmax(0,1fr) var(--qm-cw,320px);gap:22px}
  .qm-left{min-width:0}
  .qm-scroll{overflow-x:auto;overflow-y:hidden;margin:-5px;padding:5px;scrollbar-width:thin;overscroll-behavior-x:contain}
  .qm-table{border-collapse:separate;border-spacing:var(--qm-gap,6px);table-layout:fixed;width:var(--qm-tw,100%);margin:0 auto}
  .qm-table th,.qm-table td{padding:0;font-weight:inherit}
  .qm-col0{width:var(--qm-lab,124px)}
  .qm-hcol{vertical-align:bottom;text-align:center}
  .qm-house{display:block;width:var(--qm-hw,46px);height:auto;margin:0 auto;overflow:visible}
  .qm-wall{fill:var(--board-2);stroke:var(--ink-2);stroke-width:1.5;stroke-dasharray:3 2.6}
  .qm-roof{fill:var(--board);stroke:var(--ink-2);stroke-width:1.5;stroke-linejoin:round;stroke-dasharray:3 2.6}
  .qm-door,.qm-win{display:none}
  .qm-q{fill:var(--ink-2);font:800 15px/1 "Baloo 2","Nunito",sans-serif}
  .qm-house.on .qm-wall{fill:var(--c);stroke:#2A2433;stroke-width:1.6;stroke-dasharray:none}
  .qm-house.on .qm-roof{fill:#8C5A2D;stroke:#2A2433;stroke-width:1.6;stroke-dasharray:none}
  .qm-house.on .qm-door{display:inline;fill:#6B4423;stroke:#2A2433;stroke-width:1.4}
  .qm-house.on .qm-win{display:inline;fill:#FFF6DA;stroke:#2A2433;stroke-width:1.4}
  .qm-house.on .qm-q{display:none}
  .qm-house.qm-hop{animation:qm-hop .45s ease-out}
  .qm-hnum{display:block;margin-top:3px;font:800 12px/1.1 "Nunito",sans-serif;color:var(--ink-2);letter-spacing:.03em;font-variant-numeric:tabular-nums}
  .qm-rh{text-align:left;vertical-align:middle}
  .qm-rhi{display:flex;align-items:center;gap:7px;font:800 13px/1.15 "Nunito",sans-serif;color:var(--ink-2)}
  .qm-ri{flex:none;width:26px;height:26px;border-radius:8px;background:var(--ico-bg);display:grid;place-items:center}
  .qm-ri svg{width:20px;height:20px;display:block}
  .qm-cell{width:100%;min-height:50px;display:flex;align-items:center;justify-content:center;gap:6px;padding:4px 5px;border-radius:11px;border:1.6px dashed var(--board-line);background:transparent;color:var(--ink);font:800 14px/1.15 "Nunito",sans-serif;text-align:center;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:border-color .15s,background-color .15s,box-shadow .15s}
  .qm-cell.on{border-style:solid;border-color:var(--line);background:var(--panel)}
  .qm-cell:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
  .qm-cell.open{border-style:solid;border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 35%,transparent)}
  .qm-cell.dup{border-style:solid;border-color:var(--danger);background:var(--danger-bg);color:var(--danger)}
  .qm-cell.hinted{box-shadow:0 0 0 3px var(--hint)}
  .qm-v{min-width:0;overflow-wrap:anywhere;hyphens:manual}
  .qm-ph{color:var(--ink-2);opacity:.45;font-size:18px;line-height:1}
  .qm-sw{flex:none;width:14px;height:14px;border-radius:50%;background:var(--c);border:1.6px solid #2A2433}
  .qm-won .qm-cell{border-style:solid;border-color:var(--ok);background:var(--ok-bg);cursor:default}
  @media (hover:hover){.qm-cell:not(.dup):not(.open):hover{border-color:var(--ink-2)} .qm-won .qm-cell:not(.dup):hover{border-color:var(--ok)}}
  .qm-icons .qm-rl,.qm-icons .qm-long{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .qm-icons .qm-rhi{justify-content:center}
  .qm-mid .qm-cell{padding:4px 3px;font-size:13px}
  .qm-mid .qm-cell.qm-c,.qm-small .qm-cell.qm-c{flex-direction:column;gap:3px}
  .qm-small .qm-cell{min-height:46px;padding:3px 1px;gap:2px;border-radius:9px;font-size:11px;line-height:1.12}
  .qm-small .qm-cell.qm-c .qm-v{font-size:10.5px}
  .qm-small .qm-sw{width:11px;height:11px;border-width:1.4px}
  .qm-small .qm-hnum{font-size:11px}

  .qm-clues{min-width:0;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:12px 6px 8px 10px}
  .qm-ch{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:2px 10px;margin:0 8px 6px 4px;font:800 21px/1.1 "Baloo 2","Nunito",sans-serif}
  .qm-ch small{font:800 12px/1.2 "Nunito",sans-serif;color:var(--ink-2)}
  .qm-list{list-style:none;margin:0;padding:0 4px 0 0;display:grid;gap:2px;max-height:max(260px,52vh);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
  .qm-wide .qm-list{max-height:max(420px,72vh)}
  .qm-cl{position:relative;display:grid;grid-template-columns:22px 1.7em minmax(0,1fr);gap:8px;align-items:start;padding:8px 8px 8px 6px;border-radius:10px;border:1px solid transparent;cursor:pointer;font-size:15px;line-height:1.35;transition:background-color .15s,border-color .15s}
  @media (hover:hover){.qm-cl:hover{background:var(--board)}}
  .qm-chk{position:absolute;left:6px;top:8px;width:22px;height:22px;margin:0;opacity:0;pointer-events:none}
  .qm-box{width:22px;height:22px;border-radius:7px;border:1.6px solid var(--ink-2);background:var(--panel);display:grid;place-items:center;color:var(--panel);transition:background-color .15s,border-color .15s}
  .qm-box svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;opacity:0}
  .qm-chk:checked+.qm-box{background:var(--ok);border-color:var(--ok)}
  .qm-chk:checked+.qm-box svg{opacity:1}
  .qm-chk:focus-visible+.qm-box{outline:3px solid var(--focus);outline-offset:2px}
  .qm-num{font-weight:800;color:var(--ink-2);text-align:right;font-variant-numeric:tabular-nums}
  .qm-txt b{font-weight:800}
  .qm-k::before{content:"";display:inline-block;width:.72em;height:.72em;margin-right:.25em;border-radius:50%;background:var(--c);border:1.4px solid #2A2433;vertical-align:-.06em}
  .qm-clue.done .qm-txt,.qm-clue.done .qm-num{color:var(--ink-2);opacity:.6;text-decoration:line-through;text-decoration-thickness:2px}
  .qm-clue.qm-bad .qm-cl{background:var(--danger-bg);border-color:var(--danger)}
  .qm-clue.qm-tip .qm-cl{background:var(--hint-bg);border-color:var(--hint)}

  .qm-pick{position:absolute;z-index:6;left:0;top:0;width:var(--qm-pw,264px);max-width:100%;padding:8px;border-radius:14px;background:var(--panel);border:1.6px solid var(--ink-2);box-shadow:0 16px 34px -14px rgba(0,0,0,.5);display:grid;gap:6px;animation:qm-in .14s ease-out}
  .qm-pick-h{margin:0;padding:1px 4px;font:900 11px/1.3 "Nunito",sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}
  .qm-opts{display:grid;grid-template-columns:repeat(var(--qm-pc,3),minmax(0,1fr));gap:6px}
  .qm-opt{min-height:44px;min-width:0;display:flex;align-items:center;justify-content:center;gap:6px;padding:4px 6px;border-radius:10px;border:1.6px solid var(--line);background:var(--board);color:var(--ink);font:800 14px/1.1 "Nunito",sans-serif;text-align:center;cursor:pointer;overflow-wrap:anywhere;hyphens:manual;-webkit-tap-highlight-color:transparent}
  @media (hover:hover){.qm-opt:not(:disabled):hover{border-color:var(--ink-2)}}
  .qm-opt:focus-visible{outline:3px solid var(--focus);outline-offset:1px}
  .qm-opt.used{opacity:.42}
  .qm-opt[aria-pressed="true"]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 16%,var(--panel));opacity:1}
  .qm-opt.qm-clear{color:var(--ink-2);background:transparent;border-style:dashed}
  .qm-opt:disabled{opacity:.35;cursor:default}
  @keyframes qm-in{from{opacity:0;transform:translateY(-4px)}}
  @keyframes qm-hop{40%{transform:translateY(-6px) scale(1.06)}}
  `;

  Jogos.register({
    id: 'quem-mora-onde',
    name: 'Quem mora onde?',
    tagline: 'Cruze as pistas e descubra quem mora em cada casa.',
    icon: ICON,
    css: CSS,
    metric: { label: 'Tempo', unit: ['segundo', 'segundos'], format: 'time' },
    generated: true,
    levels: LEVELS.map(l => Object.assign({}, l, { sub: `${l.n}×${l.m}<span class="cnt"> · ${l.n} casas</span>` })),
    rules: level => [
      { key: 'grade', icon: ICO_GRADE, html: 'Cada casa tem <b>um valor de cada linha</b> da tabela, e nenhum valor <b>se repete</b> na mesma linha.' },
      { key: 'pistas', icon: ICO_PISTAS, novo: level.hyp > 0,
        html: 'Todas as <b>pistas são verdadeiras</b> e, juntas, levam a <b>uma única solução</b>' +
          (level.hyp ? '. Aqui, às vezes é preciso <b>testar uma hipótese</b> e ver se alguma pista quebra.' : ', sem precisar chutar.') },
      { key: 'lados', icon: ICO_LADOS,
        html: `As casas vão de <b>1 a ${level.n}, da esquerda para a direita</b>. <b>Ao lado</b> é vizinha; <b>logo à esquerda</b> é a casa colada; <b>em algum lugar à esquerda</b> é qualquer uma daquele lado; as <b>pontas</b> são as casas 1 e ${level.n}.` },
    ],
    how: 'Toque numa célula e escolha o valor: os já usados na linha aparecem apagados e repetições ficam em vermelho. Marque as pistas que já usou. No teclado, as <b>setas</b> andam pela tabela, <b>Enter</b> abre as opções e <b>Delete</b> limpa.',

    mount(ctx) {
      const { h, svg } = ctx;
      const puz = generate(ctx.level, ctx.rng);
      const { N, M } = puz;
      const cats = puz.cats.map(k => CATS[k]);
      const vals = puz.vals.map((row, a) => row.map(i => cats[a].values[i]));
      const COR = puz.cats.indexOf('cor');
      const grid = emptyGrid(puz);
      const history = [];
      let secs = 0, hinted = null, open = null;
      ctx.setMin(null);
      ctx.setMoves(0);

      // casinhas no topo das colunas: ganham a cor escolhida na linha "Cor"
      const houses = range(N).map(() => ({
        fill: null,
        el: svg('svg', { viewBox: '0 0 48 44', class: 'qm-house', 'aria-hidden': 'true', focusable: 'false' },
          svg('rect', { class: 'qm-wall', x: 8, y: 19, width: 32, height: 22.5, rx: 2 }),
          svg('path', { class: 'qm-roof', d: 'M3.5 21.5 24 4.5l20.5 17z' }),
          svg('rect', { class: 'qm-door', x: 20.5, y: 29, width: 7, height: 12.5, rx: 1.5 }),
          svg('rect', { class: 'qm-win', x: 11.5, y: 25, width: 6, height: 6, rx: 1.2 }),
          svg('rect', { class: 'qm-win', x: 30.5, y: 25, width: 6, height: 6, rx: 1.2 }),
          svg('text', { class: 'qm-q', x: 24, y: 37.5, 'text-anchor': 'middle' }, '?')),
      }));
      const cells = cats.map((cat, a) => range(N).map(p => h('button', {
        type: 'button', class: 'qm-cell' + (a === COR ? ' qm-c' : ''), tabindex: a === 0 && p === 0 ? '0' : '-1',
        'data-a': a, 'data-p': p, 'aria-haspopup': 'dialog', 'aria-expanded': 'false',
      })));
      const table = h('table', { class: 'qm-table' },
        h('caption', { class: 'sr-only' }, `Tabela com ${N} casas nas colunas e ${M} atributos nas linhas.`),
        h('colgroup', {}, h('col', { class: 'qm-col0' }), range(N).map(() => h('col', {}))),
        h('thead', {}, h('tr', {}, h('td', {}), range(N).map(p => h('th', { scope: 'col', class: 'qm-hcol' },
          houses[p].el, h('span', { class: 'qm-hnum' }, h('span', { class: 'qm-long' }, 'Casa '), String(p + 1)))))),
        h('tbody', {}, cats.map((cat, a) => h('tr', {},
          h('th', { scope: 'row', class: 'qm-rh', title: cat.label },
            h('span', { class: 'qm-rhi' }, h('span', { class: 'qm-ri', 'aria-hidden': 'true', html: ROW_ICONS[cat.key] }), h('span', { class: 'qm-rl' }, cat.label))),
          cells[a].map(b => h('td', {}, b))))));

      // pistas, cada uma com uma caixinha para riscar (só visual)
      const clueCount = h('small', {});
      const countDone = () => {
        const d = clueLis.filter(li => li.classList.contains('done')).length;
        clueCount.textContent = d ? `${d} de ${clueLis.length} riscadas` : `${clueLis.length} pistas · marque as usadas`;
      };
      const clueLis = puz.clues.map((c, i) => {
        const chk = h('input', { type: 'checkbox', class: 'qm-chk' });
        const li = h('li', { class: 'qm-clue' }, h('label', { class: 'qm-cl' }, chk,
          h('span', { class: 'qm-box', 'aria-hidden': 'true', html: '<svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7"/></svg>' }),
          h('span', { class: 'qm-num' }, `${i + 1}.`), h('span', { class: 'qm-txt', html: clueHTML(puz, c) })));
        ctx.listen(chk, 'change', () => { li.classList.toggle('done', chk.checked); countDone(); });
        return li;
      });
      countDone();

      const pick = h('div', { class: 'qm-pick', role: 'dialog', hidden: true });
      const scroller = h('div', { class: 'qm-scroll' }, table);
      const root = h('div', { class: 'qm' },
        h('div', { class: 'qm-left' }, scroller),
        h('section', { class: 'qm-clues', 'aria-label': 'Pistas' }, h('h2', { class: 'qm-ch' }, 'Pistas', clueCount), h('ol', { class: 'qm-list' }, clueLis)),
        pick);
      ctx.board.append(root);

      // ---- tamanho: tabela e pistas lado a lado no largo; no estreito, ícones nas linhas e células menores ----
      ctx.onResize(w => {
        closePicker(false);
        const cs = getComputedStyle(ctx.board);
        const inner = Math.min(1060, w - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0));
        const wide = inner >= 700;
        const cw = wide ? Math.round(Math.min(360, Math.max(280, inner * 0.36))) : 0;
        const area = wide ? inner - cw - 22 : inner;
        const text = area >= 124 + N * 74 + (N + 2) * 6;
        const gap = text ? 6 : area < 300 ? 2 : area < 400 ? 3 : 4, lab = text ? 124 : 30;
        const col = Math.max(44, Math.min(118, Math.floor((area - lab - (N + 2) * gap) / N)));
        root.classList.toggle('qm-wide', wide);
        root.classList.toggle('qm-icons', !text);
        root.classList.toggle('qm-small', col < 64);
        root.classList.toggle('qm-mid', col >= 64 && col < 96);
        const vars = { '--qm-cw': cw + 'px', '--qm-lab': lab + 'px', '--qm-gap': gap + 'px', '--qm-tw': lab + N * col + (N + 2) * gap + 'px',
          '--qm-hw': Math.round(Math.max(30, Math.min(52, col * 0.7))) + 'px', '--qm-pw': Math.min(inner, N < 4 ? 250 : 350) + 'px' };
        Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
      });

      // ---- desenho ----
      function hop(el) {
        if (ctx.reduced) return;
        el.classList.remove('qm-hop');
        el.getBoundingClientRect();
        el.classList.add('qm-hop');
        ctx.later(() => el.classList.remove('qm-hop'), 500);
      }
      function render() {
        const dup = duplicates(grid), won = ctx.status === 'won';
        for (let a = 0; a < M; a++) for (let p = 0; p < N; p++) {
          const el = cells[a][p], v = grid[a][p], val = v >= 0 ? vals[a][v] : null;
          el.classList.toggle('on', !!val);
          el.classList.toggle('dup', dup[a][p]);
          el.classList.toggle('hinted', !!hinted && hinted.a === a && hinted.p === p);
          el.replaceChildren(...(val
            ? [a === COR ? h('span', { class: 'qm-sw', style: { '--c': val.fill } }) : null, h('span', { class: 'qm-v' }, capWord(val.hy))]
            : [h('span', { class: 'qm-ph', 'aria-hidden': 'true' }, '+')]).filter(Boolean));
          el.setAttribute('aria-label', `Casa ${p + 1}, ${cats[a].label}: ${val ? capWord(val.name) : 'vazia'}${dup[a][p] ? ', repetido' : ''}`);
          if (won) el.setAttribute('aria-disabled', 'true');
        }
        houses.forEach((hs, p) => {
          const v = COR >= 0 ? grid[COR][p] : -1, fill = v >= 0 ? vals[COR][v].fill : null;
          if (fill === hs.fill) return;
          hs.fill = fill;
          hs.el.classList.toggle('on', !!fill);
          if (fill) { hs.el.style.setProperty('--c', fill); hop(hs.el); }
        });
        root.classList.toggle('qm-won', won);
        ctx.controls({ undo: history.length > 0 && !won });
      }
      function status() {
        if (ctx.status !== 'play') return;
        const empty = grid.flat().filter(v => v < 0).length;
        if (empty === N * M) ctx.say('Sua vez', 'Leia as pistas e toque numa célula da tabela para escolher o valor dela.');
        else if (duplicates(grid).flat().some(Boolean)) ctx.say('Valor repetido', 'Cada valor aparece uma vez por linha: troque uma das células em vermelho.');
        else if (empty) ctx.say('Continue', `${empty === 1 ? 'Falta 1 célula' : `Faltam ${empty} células`}. Marque as pistas que já usou para não se perder.`);
        else ctx.say('Quase lá', 'A tabela está cheia, mas algo não bate com as pistas. Reveja e corrija.');
      }
      function markClue(i, kind) {
        clueLis.forEach((li, j) => li.classList.toggle('qm-' + kind, j === i));
      }

      // ---- jogadas ----
      function commit(changes, fromHint) {
        changes.forEach(c => { grid[c.a][c.p] = c.next; });
        history.push(changes);
        changed(fromHint);
      }
      function changed(fromHint) {
        if (!fromHint) {
          hinted = null;
          markClue(-1, 'tip');
          if (ctx.clearHint) ctx.clearHint();
        }
        if (ctx.clearWarn) ctx.clearWarn();          // o aviso anterior ("algo não bate") já não vale para a tabela nova
        markClue(-1, 'bad');
        render();
        status();
        checkFull();
      }
      function setCell(a, p, v) {
        if (ctx.status !== 'play' || grid[a][p] === v) return;
        commit([{ a, p, prev: grid[a][p], next: v }], false);
      }
      // Tabela cheia: vitória, ou um aviso sem dizer onde está o erro (mas apontando uma pista contrariada).
      function checkFull() {
        if (ctx.status !== 'play' || grid.some(row => row.includes(-1))) return;
        if (duplicates(grid).flat().some(Boolean)) {
          ctx.warn('Tem valor repetido', 'Cada valor vai em uma casa só. Troque as células em vermelho.', 'grade');
          return;
        }
        if (isSolved(puz, grid)) { win(); return; }
        const bad = violations(puz, grid);
        if (bad.length) {
          markClue(bad[0], 'bad');
          ctx.warn('Algo não bate', `A tabela contradiz a pista ${bad[0] + 1}. Reveja as células ligadas a ela.`, 'pistas');
        } else ctx.warn('Algo não bate', 'A tabela está cheia, mas há algum erro. Reveja as pistas.', 'pistas');
      }
      function win() {
        closePicker(false);
        ctx.win({ score: secs, text: `Você descobriu quem mora onde em ${ctx.core.fmtTime(secs)}.` });
        render();
        houses.forEach((hs, p) => ctx.later(() => hop(hs.el), 110 * p));
      }

      // ---- seletor de valores ----
      function rove(a, p) {
        cells.forEach(row => row.forEach(c => { c.tabIndex = -1; }));
        cells[a][p].tabIndex = 0;
      }
      function openPicker(a, p) {
        closePicker(false);
        open = { a, p };
        const cur = grid[a][p], used = new Set(grid[a].filter((v, q) => v >= 0 && q !== p));
        const opts = vals[a].map((val, v) => h('button', {
          type: 'button', class: 'qm-opt' + (used.has(v) ? ' used' : ''), 'data-v': v, 'aria-pressed': String(cur === v),
          'aria-label': capWord(val.name) + (used.has(v) ? ' (já usado nesta linha)' : ''),
        }, a === COR ? h('span', { class: 'qm-sw', style: { '--c': val.fill } }) : null, capWord(val.hy)));
        opts.push(h('button', { type: 'button', class: 'qm-opt qm-clear', 'data-v': -1, disabled: cur < 0 }, 'Limpar'));
        pick.style.setProperty('--qm-pc', N < 4 ? 2 : 3);
        pick.setAttribute('aria-label', `${cats[a].label} da casa ${p + 1}`);
        pick.replaceChildren(h('p', { class: 'qm-pick-h', 'aria-hidden': 'true' }, `Casa ${p + 1} · ${cats[a].label}`), h('div', { class: 'qm-opts' }, opts));
        pick.hidden = false;
        cells[a][p].classList.add('open');
        cells[a][p].setAttribute('aria-expanded', 'true');
        placePicker();
        (opts.find(o => o.getAttribute('aria-pressed') === 'true') || opts[0]).focus();
      }
      // Abaixo da célula; acima se não couber (no quadro ou na tela).
      function placePicker() {
        if (!open) return;
        const cr = cells[open.a][open.p].getBoundingClientRect(), wr = root.getBoundingClientRect();
        const pw = pick.offsetWidth, ph = pick.offsetHeight;
        const below = cr.bottom - wr.top + 6, above = cr.top - wr.top - ph - 6;
        const rootBelow = below + ph <= wr.height + 10, rootAbove = above >= -10;
        const viewBelow = cr.bottom + 6 + ph <= window.innerHeight, viewAbove = cr.top - 6 - ph >= 0;
        const top = rootBelow && (viewBelow || !(rootAbove && viewAbove)) ? below : rootAbove ? above : below;
        pick.style.left = Math.max(0, Math.min(cr.left - wr.left + cr.width / 2 - pw / 2, wr.width - pw)) + 'px';
        pick.style.top = top + 'px';
      }
      function closePicker(refocus) {
        if (!open) return;
        const cell = cells[open.a][open.p];
        open = null;
        pick.hidden = true;
        pick.replaceChildren();
        cell.classList.remove('open');
        cell.setAttribute('aria-expanded', 'false');
        if (refocus) cell.focus();
      }

      ctx.listen(table, 'click', e => {
        const b = e.target.closest('.qm-cell');
        if (!b) return;
        const a = +b.dataset.a, p = +b.dataset.p;
        rove(a, p);
        if (ctx.status !== 'play') return;
        if (open && open.a === a && open.p === p) closePicker(true);
        else openPicker(a, p);
      });
      ctx.listen(table, 'keydown', e => {
        const b = e.target.closest && e.target.closest('.qm-cell');
        if (!b) return;
        let a = +b.dataset.a, p = +b.dataset.p;
        const k = e.key;
        if (k === 'ArrowRight') p = Math.min(N - 1, p + 1);
        else if (k === 'ArrowLeft') p = Math.max(0, p - 1);
        else if (k === 'ArrowDown') a = Math.min(M - 1, a + 1);
        else if (k === 'ArrowUp') a = Math.max(0, a - 1);
        else if (k === 'Home') p = 0;
        else if (k === 'End') p = N - 1;
        else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); if (grid[a][p] >= 0) setCell(a, p, -1); return; }
        else return;
        e.preventDefault();
        closePicker(false);
        rove(a, p);
        cells[a][p].focus();
      });
      ctx.listen(scroller, 'scroll', placePicker, { passive: true });
      ctx.listen(pick, 'click', e => {
        const b = e.target.closest('.qm-opt');
        if (!b || b.disabled || !open) return;
        const { a, p } = open;
        closePicker(true);
        setCell(a, p, +b.dataset.v);
      });
      ctx.listen(pick, 'keydown', e => {
        if (e.key === 'Escape') { e.preventDefault(); closePicker(true); return; }
        if (e.key === 'Tab') { closePicker(true); return; }          // o Tab segue a partir da célula
        const items = [...pick.querySelectorAll('.qm-opt:not(:disabled)')];
        const i = items.indexOf(document.activeElement), n = items.length;
        let j = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + n) % n;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = n - 1;
        else if (e.key.length === 1 && /\p{L}/u.test(e.key)) {          // letra: pula para a opção que começa com ela
          for (let s = 1; s <= n && j < 0; s++) if (norm(items[(i + s) % n].textContent).startsWith(norm(e.key))) j = (i + s) % n;
        }
        if (j < 0) return;
        e.preventDefault();
        items[j].focus();
      });
      ctx.listen(pick, 'focusout', e => { if (open && e.relatedTarget && !pick.contains(e.relatedTarget)) closePicker(false); });
      ctx.listen(document, 'pointerdown', e => {
        if (open && !pick.contains(e.target) && !cells[open.a][open.p].contains(e.target)) closePicker(false);
      });

      // relógio: conta só com a página visível e o jogo em andamento
      ctx.every(() => {
        if (ctx.status !== 'play' || document.hidden) return;
        secs++;
        ctx.setMoves(secs);
      }, 1000);

      render();
      status();

      return {
        // Preenche uma célula certa (de preferência deduzível agora) e diz qual pista ajuda.
        onHint() {
          if (ctx.status !== 'play') return;
          closePicker(false);
          const d = nextDeduction(puz, grid);
          let a = -1, p = -1, v = -1;
          if (d) ({ a, p, v } = d);
          else {
            for (let i = 0; i < M * N && a < 0; i++) {
              const r = Math.floor(i / N), q = i % N, cur = grid[r][q];
              if (cur < 0 || puz.sol[r][cur] !== q) { a = r; p = q; v = puz.sol[r].indexOf(q); }
            }
            if (a < 0) return;
          }
          const fixing = grid[a][p] >= 0;
          const changes = [];
          grid[a].forEach((w, q) => { if (w === v && q !== p) changes.push({ a, p: q, prev: w, next: -1 }); });
          changes.push({ a, p, prev: grid[a][p], next: v });
          const fact = factHTML(puz, a * N + v, p);
          let text = fixing ? `Corrigi: ${fact}` : cap(fact);
          markClue(d && d.clue >= 0 ? d.clue : -1, 'tip');
          if (d && d.clue >= 0) text += `. A pista ${d.clue + 1} ajuda a chegar nisso.`;
          else if (d && d.clue === -1) text += ': era a única opção que sobrava nessa linha.';
          else if (d && d.clue === -2) text += `. Para ver isso, teste uma hipótese: ${hypText(puz, d.hyp.x, d.hyp.k)}, alguma pista seria contrariada.`;
          else text += '.';
          hinted = { a, p };
          ctx.hint('Dica', text);
          commit(changes, true);
          rove(a, p);
        },
        onUndo() {
          const ch = history.pop();
          if (!ch) return;
          closePicker(false);
          for (let i = ch.length - 1; i >= 0; i--) grid[ch[i].a][ch[i].p] = ch[i].prev;
          changed(false);
        },
      };
    },
  });
})();
