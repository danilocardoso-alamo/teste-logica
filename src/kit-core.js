/* Jogos de lógica do Danilo — utilidades puras (funcionam no navegador e no Node, para testes) */
const JogosCore = (() => {
  // Gerador pseudoaleatório com semente (mulberry32): mesma semente, mesmo desafio.
  function rng(seed) {
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.int = n => Math.floor(next() * n);                      // 0 .. n-1
    next.range = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)); // lo .. hi
    next.pick = arr => arr[Math.floor(next() * arr.length)];
    next.shuffle = arr => {
      const r = arr.slice();
      for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
      return r;
    };
    return next;
  }
  const newSeed = () => (Math.random() * 4294967296) >>> 0;

  // Busca em largura: menor sequência de movimentos até um estado objetivo.
  // opts.key(estado) → string única; opts.next(estado) → [{ move, state }]; opts.goal(estado) → bool.
  // Devolve { path: [movimentos], states: [estados, do início ao fim] } ou null.
  function bfs(start, { key, next, goal, limit = 1e6 }) {
    const build = n => {
      const path = [], states = [];
      for (let x = n; x; x = x.parent) { states.unshift(x.state); if (x.parent) path.unshift(x.move); }
      return { path, states };
    };
    const root = { state: start, parent: null, move: null };
    if (goal(start)) return build(root);
    const seen = new Set([key(start)]);
    let frontier = [root];
    while (frontier.length) {
      const nf = [];
      for (const n of frontier) {
        for (const { move, state } of next(n.state)) {
          const k = key(state);
          if (seen.has(k)) continue;
          seen.add(k);
          const m = { state, parent: n, move };
          if (goal(state)) return build(m);
          if (seen.size > limit) return null;
          nf.push(m);
        }
      }
      frontier = nf;
    }
    return null;
  }

  // Distância (em movimentos) de todos os estados alcançáveis a partir de `start`.
  function bfsAll(start, { key, next, limit = 2e6 }) {
    const dist = new Map([[key(start), 0]]);
    let frontier = [start], d = 0;
    while (frontier.length && dist.size <= limit) {
      const nf = [];
      d++;
      for (const s of frontier) {
        for (const { state } of next(s)) {
          const k = key(state);
          if (dist.has(k)) continue;
          dist.set(k, d);
          nf.push(state);
        }
      }
      frontier = nf;
    }
    return dist;
  }

  const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  return { rng, newSeed, bfs, bfsAll, fmtTime, plural };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = JogosCore;
