/* Moeda falsa — ache a moeda falsa com uma balança de dois pratos, gastando o mínimo de pesagens */
(() => {
  // ---------- lógica pura (testável no Node) ----------
  const K = typeof JogosCore !== 'undefined' ? JogosCore : require('../kit-core.js');

  // Parâmetros dos níveis. dirs: sentidos possíveis da falsa (-1 mais leve, +1 mais pesada).
  // modo 'tudo': é preciso saber a moeda e o sentido (se só existe um sentido, basta a moeda);
  // modo 'moeda': basta dizer qual é a moeda.
  const NIVEIS = [
    { id: 'facil', name: 'Fácil', n: 3, dirs: [-1], pesagens: 1, modo: 'tudo' },
    { id: 'medio', name: 'Médio', n: 9, dirs: [-1], pesagens: 2, modo: 'tudo' },
    { id: 'dificil', name: 'Difícil', n: 4, dirs: [-1, 1], pesagens: 2, modo: 'moeda' },
    { id: 'muito', name: 'Muito difícil', n: 12, dirs: [-1, 1], pesagens: 3, modo: 'tudo' },
  ];

  // Hipótese = "a moeda i (0..n-1) é a falsa e é mais leve (s = -1) ou mais pesada (s = +1)". Código: 2i ou 2i+1.
  const hyp = (i, s) => 2 * i + (s > 0 ? 1 : 0);
  const coinOf = h => h >> 1;
  const dirOf = h => (h & 1 ? 1 : -1);
  function initial(n, dirs) {
    const S = [];
    for (let i = 0; i < n; i++) for (const s of dirs) S.push(hyp(i, s));
    return S.sort((a, b) => a - b);
  }

  // Resultado da pesagem w = { left: [moedas], right: [moedas] } se a hipótese h for a verdade:
  // +1 = o prato direito desce (a esquerda sobe), -1 = o esquerdo desce (a direita sobe), 0 = equilibra.
  function outcome(h, w) {
    const i = coinOf(h), s = dirOf(h);
    if (w.left.includes(i)) return -s;
    if (w.right.includes(i)) return s;
    return 0;
  }
  function branches(S, w) {
    const b = { '-1': [], 0: [], 1: [] };
    S.forEach(h => b[outcome(h, w)].push(h));
    return b;
  }

  // Tipo de cada moeda diante das hipóteses vivas:
  // u = pode ser leve ou pesada, l = só pode ser leve, p = só pode ser pesada, g = com certeza verdadeira.
  function types(S, n) {
    const L = new Set(), P = new Set();
    S.forEach(h => (dirOf(h) < 0 ? L : P).add(coinOf(h)));
    const t = { u: [], l: [], p: [], g: [] };
    for (let i = 0; i < n; i++) t[L.has(i) ? (P.has(i) ? 'u' : 'l') : P.has(i) ? 'p' : 'g'].push(i);
    return t;
  }
  const count = t => ({ u: t.u.length, l: t.l.length, p: t.p.length, g: t.g.length });
  const nHyp = c => 2 * c.u + c.l + c.p;
  const nCoins = c => c.u + c.l + c.p;
  const size = (c, modo) => (modo === 'moeda' ? nCoins(c) : nHyp(c));
  const isSolved = (c, modo) => size(c, modo) <= 1;

  // Todas as pesagens possíveis, contadas por tipo de moeda: [lu, ru, ll, rl, lp, rp, lg, rg]
  // (quantas de cada tipo vão à esquerda e à direita), sempre com o mesmo número de moedas nos dois pratos.
  // Moedas verdadeiras nos dois pratos se anulam, então essas variações ficam de fora.
  const optMemo = new Map();
  function options(c) {
    const key = `${c.u},${c.l},${c.p},${c.g}`;
    if (optMemo.has(key)) return optMemo.get(key);
    const pairs = m => { const r = []; for (let a = 0; a <= m; a++) for (let b = 0; a + b <= m; b++) r.push([a, b]); return r; };
    const out = [];
    for (const [lu, ru] of pairs(c.u)) for (const [ll, rl] of pairs(c.l)) for (const [lp, rp] of pairs(c.p)) for (const [lg, rg] of pairs(c.g)) {
      const L = lu + ll + lp + lg, R = ru + rl + rp + rg;
      if (L !== R || L === 0 || (lg && rg)) continue;
      out.push([lu, ru, ll, rl, lp, rp, lg, rg]);
    }
    optMemo.set(key, out);
    return out;
  }
  // O que se sabe depois de cada resultado possível da pesagem o.
  function children(c, o) {
    const [lu, ru, ll, rl, lp, rp] = o, n = c.u + c.l + c.p + c.g;
    const mk = (u, l, p) => ({ u, l, p, g: n - u - l - p });
    return {
      0: mk(c.u - lu - ru, c.l - ll - rl, c.p - lp - rp), // equilibrou: a falsa está fora da balança
      '-1': mk(0, ru + rl, lu + lp),                     // esquerda desceu: pesada à esquerda ou leve à direita
      1: mk(0, lu + ll, ru + rp),                        // direita desceu: pesada à direita ou leve à esquerda
    };
  }

  // Dá para garantir a resposta com k pesagens, seja qual for o resultado de cada uma?
  const solMemo = new Map();
  function solvable(c, k, modo) {
    if (nHyp(c) === 0 || isSolved(c, modo)) return true;
    if (k <= 0 || size(c, modo) > 3 ** k) return false;   // cada pesagem só tem 3 resultados
    const key = `${modo}|${k}|${c.u},${c.l},${c.p},${c.g}`;
    if (solMemo.has(key)) return solMemo.get(key);
    let ok = false;
    for (const o of options(c)) {
      const ch = children(c, o);
      if (solvable(ch[-1], k - 1, modo) && solvable(ch[0], k - 1, modo) && solvable(ch[1], k - 1, modo)) { ok = true; break; }
    }
    solMemo.set(key, ok);
    return ok;
  }
  // Menor número de pesagens que garante a resposta a partir deste conhecimento.
  function need(c, modo) {
    for (let k = 0; k <= 12; k++) if (solvable(c, k, modo)) return k;
    return Infinity;
  }
  const lexLess = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]; return false; };
  // Melhor pesagem (em contagens): a que exige menos pesagens no pior caso; no empate, a que divide
  // as possibilidades de forma mais equilibrada, com menos grupos diferentes de moedas (mais fácil
  // de entender) e menos moedas na balança.
  function bestOption(c, modo) {
    let best = null;
    for (const o of options(c)) {
      const ch = children(c, o), kids = [ch[-1], ch[0], ch[1]];
      const sizes = kids.map(x => size(x, modo));
      const worstNeed = Math.max(...kids.map(x => need(x, modo)));
      const groups = o.filter(Boolean).length;
      const score = [worstNeed, Math.max(...sizes), groups, sizes.reduce((a, s) => a + s * s, 0), o[6] + o[7], o.reduce((a, b) => a + b, 0)];
      if (!best || lexLess(score, best.score)) best = { o, score, worstNeed, worst: Math.max(...sizes) };
    }
    return best;
  }
  // Transforma a pesagem em contagens numa pesagem com moedas de verdade (as de menor número de cada tipo).
  function realize(t, o) {
    const [lu, ru, ll, rl, lp, rp, lg, rg] = o, by = (a, b) => a - b;
    return {
      left: [...t.u.slice(0, lu), ...t.l.slice(0, ll), ...t.p.slice(0, lp), ...t.g.slice(0, lg)].sort(by),
      right: [...t.u.slice(lu, lu + ru), ...t.l.slice(ll, ll + rl), ...t.p.slice(lp, lp + rp), ...t.g.slice(lg, lg + rg)].sort(by),
    };
  }
  // Conselho para a dica: pesagem ótima a partir do conhecimento S, com kLeft pesagens restantes.
  function advise(S, n, kLeft, modo) {
    const t = types(S, n), c = count(t);
    if (isSolved(c, modo)) return { solved: true, t, c };
    if (kLeft <= 0) return { over: true, t, c };
    const b = bestOption(c, modo);
    return { w: realize(t, b.o), o: b.o, t, c, worst: b.worst, worstNeed: b.worstNeed, feasible: b.worstNeed <= kLeft - 1, needNow: need(c, modo) };
  }

  // A balança é honesta, mas a falsa só é definida pelas pesagens. Para cada pesagem, fica com o resultado
  // que deixa mais hipóteses vivas (antes disso, prefere um resultado que já impeça terminar a tempo, se houver).
  // Empate: sorteio com rng. kLeft = pesagens que ainda restarão depois desta.
  function respond(S, w, n, kLeft, modo, rng) {
    const b = branches(S, w);
    let best = [], bestKey = null;
    for (const t of [-1, 0, 1]) {
      const B = b[t];
      if (!B.length) continue;
      const key = [solvable(count(types(B, n)), kLeft, modo) ? 0 : 1, B.length];
      const cmp = bestKey ? (key[0] - bestKey[0]) || (key[1] - bestKey[1]) : 1;
      if (cmp > 0) { best = [t]; bestKey = key; } else if (cmp === 0) best.push(t);
    }
    const t = best.length > 1 && rng ? rng.pick(best) : best[0];
    return { t, S: b[t], ties: best };
  }

  // Acusação: vence só se nenhuma outra hipótese viva explicar as pesagens.
  function verdict(S, coin, dir, modo) {
    const hit = h => coinOf(h) === coin && (dir == null || dirOf(h) === dir);
    const others = S.filter(h => (modo === 'moeda' ? coinOf(h) !== coin : !hit(h)));
    const possible = S.some(hit);
    return { ok: possible && !others.length, possible, others };
  }
  // Primeira pesagem do histórico que desmente a hipótese h (ou null, se todas a confirmam).
  function refute(hist, h) {
    for (let k = 0; k < hist.length; k++) {
      const w = hist[k], e = outcome(h, w);
      if (e !== w.t) return { k, e, t: w.t, side: w.left.includes(coinOf(h)) ? 'esquerdo' : w.right.includes(coinOf(h)) ? 'direito' : null };
    }
    return null;
  }

  const logic = { NIVEIS, hyp, coinOf, dirOf, initial, outcome, branches, types, count, nHyp, nCoins, isSolved, options, children, solvable, need, bestOption, realize, advise, respond, verdict, refute, rng: K.rng };
  if (typeof module !== 'undefined' && module.exports) { module.exports = logic; return; }

  // ---------- interface ----------
  const THETA = 9;                                   // inclinação do travessão, em graus
  const RES = { '-1': 'a direita subiu', 0: 'equilibrou', 1: 'a esquerda subiu' };
  const plural = K.plural;
  const lst = a => a.map(i => i + 1).join(' ');
  const dirTxt = d => (d < 0 ? 'mais leve' : 'mais pesada');
  const STR = '#7D8A99';                             // fios nos ícones (visíveis nos dois temas)

  const ICON = `<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
    <path d="M20 58.5h24l-3-6H23z" fill="#A86E3A"/><rect x="29.9" y="10" width="4.2" height="43" rx="2.1" fill="#8C5A2D"/>
    <path d="M12.2 16.8L3.8 38M12.2 16.8L20.6 38M51.8 11.2L43.4 32.4M51.8 11.2L60.2 32.4" fill="none" stroke="${STR}" stroke-width="1.3"/>
    <path d="M3.2 38h18a9 4.4 0 0 1-18 0z" fill="#CFDAE6"/><path d="M42.8 32.4h18a9 4.4 0 0 1-18 0z" fill="#CFDAE6"/>
    <circle cx="8.1" cy="33.4" r="4.2" fill="#F6CD4C"/><circle cx="16.3" cy="33.4" r="4.2" fill="#F6CD4C"/>
    <circle cx="47.7" cy="27.8" r="4.2" fill="#F6CD4C"/><circle cx="55.9" cy="27.8" r="4.2" fill="#F6CD4C"/>
    <rect x="11" y="11.8" width="42" height="4.4" rx="2.2" fill="#6C7F96" transform="rotate(-8 32 14)"/>
    <circle cx="32" cy="14" r="3" fill="#E5484D"/><circle cx="32" cy="6.8" r="2.6" fill="#6C7F96"/></g></svg>`;
  const ICO_FALSA = `<svg viewBox="0 0 34 34"><circle cx="17" cy="17" r="12.5" fill="#F6CD4C" stroke="#2A2433" stroke-width="1.6"/><circle cx="17" cy="17" r="9.2" fill="none" stroke="#C98A1B" stroke-width="1.3"/><path d="M13.7 13.8a3.4 3.4 0 1 1 4.9 3.1c-1 .5-1.6 1.2-1.6 2.3v.6" fill="none" stroke="#5B3A06" stroke-width="2.4" stroke-linecap="round"/><circle cx="17" cy="23.4" r="1.5" fill="#5B3A06"/></svg>`;
  const ICO_PESAR = `<svg viewBox="0 0 34 34"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M11 31h12l-2-3.5h-8z" fill="#A86E3A"/><rect x="15.6" y="7" width="2.8" height="21" rx="1.4" fill="#8C5A2D"/><path d="M7 9.5l-4.5 11M7 9.5l4.5 11M27 9.5l-4.5 11M27 9.5l4.5 11" fill="none" stroke="${STR}" stroke-width="1.2"/><circle cx="7" cy="17.4" r="2.9" fill="#F6CD4C"/><circle cx="27" cy="17.4" r="2.9" fill="#F6CD4C"/><path d="M1.8 20.5h10.4a5.2 2.6 0 0 1-10.4 0zM21.8 20.5h10.4a5.2 2.6 0 0 1-10.4 0z" fill="#CFDAE6"/><rect x="5" y="7.8" width="24" height="3.4" rx="1.7" fill="#6C7F96"/><circle cx="17" cy="9.5" r="1.9" fill="#E5484D"/></g></svg>`;
  const ICO_APONTAR = `<svg viewBox="0 0 34 34"><circle cx="17" cy="17" r="14.2" fill="none" stroke="#E0701C" stroke-width="2.4" stroke-dasharray="5 3.4"/><circle cx="17" cy="17" r="9.5" fill="#F6CD4C" stroke="#2A2433" stroke-width="1.6"/><path d="M12.9 17.3l3 3 5.5-6.3" fill="none" stroke="#5B3A06" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const ICO_JUSTA = `<svg viewBox="0 0 34 34"><rect x="7" y="7" width="20" height="20" rx="5" fill="#FFFFFF" stroke="#2A2433" stroke-width="1.6"/><g fill="#2A2433"><circle cx="12.5" cy="12.5" r="1.9"/><circle cx="17" cy="17" r="1.9"/><circle cx="21.5" cy="21.5" r="1.9"/></g><path d="M6 28L28 6" stroke="#C23A2E" stroke-width="3" stroke-linecap="round"/></svg>`;
  // Ícones pequenos (cor do texto)
  const ui = p => `<svg viewBox="0 0 20 20" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</g></svg>`;
  const MI_MOVER = ui('<path d="M10 3.5v13M4 6.5h12M6.5 16.5h7M4 6.5l-2.4 5.2h4.8zM16 6.5l-2.4 5.2h4.8z"/>');
  const MI_ANOTAR = ui('<path d="M4 16.2l.9-3.8 8.5-8.5 2.9 2.9-8.5 8.5zM11.8 5.5l2.9 2.9"/>');
  const MI_APONTAR = ui('<circle cx="10" cy="10" r="5.8"/><circle cx="10" cy="10" r="1.6"/><path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3"/>');
  const NOTE = [null,
    '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.4l2.6 2.6L11 4.2" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 2.6v8.4M3.4 7.6L7 11.2l3.6-3.6" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 11.4V3M3.4 6.4L7 2.8l3.6 3.6" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>'];
  // Mini balança do histórico, inclinada conforme o resultado
  function resIcon(t) {
    const a = t * 16 * Math.PI / 180, c = Math.cos(a) * 11, s = Math.sin(a) * 11;
    const pan = (x, y) => `M${(x - 4.5).toFixed(1)} ${(y + 6.5).toFixed(1)}h9M${x.toFixed(1)} ${y.toFixed(1)}l-4.5 6.5M${x.toFixed(1)} ${y.toFixed(1)}l4.5 6.5`;
    return `<svg viewBox="0 0 30 22" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6v13M10.5 20h9"/><path d="M${(15 - c).toFixed(1)} ${(6 - s).toFixed(1)}L${(15 + c).toFixed(1)} ${(6 + s).toFixed(1)}"/><path d="${pan(15 - c, 6 - s)}${pan(15 + c, 6 + s)}"/></g></svg>`;
  }

  const CSS = `
  .bl-wrap{width:100%;max-width:760px;margin:0 auto;display:grid;gap:12px}
  .bl-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 14px}
  .bl-fact{margin:0;flex:1 1 220px;font-size:15px;line-height:1.35;color:var(--ink-2);text-wrap:pretty}
  .bl-fact b{color:var(--ink)}
  .bl-modes{display:flex;gap:3px;padding:3px;border-radius:14px;background:var(--board-2);border:1px solid var(--board-line)}
  .bl-mode{flex:1 1 0;min-width:0;height:40px;padding:0 12px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:11px;background:none;color:var(--ink-2);font:800 14px/1 "Nunito",sans-serif;white-space:nowrap;cursor:pointer;transition:background .15s,color .15s}
  .bl-mode svg{width:18px;height:18px;flex:none;display:block}
  .bl-mode:hover{color:var(--ink)}
  .bl-mode[aria-pressed="true"]{background:var(--panel);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.2)}
  .bl-mode:focus-visible{outline:3px solid var(--focus);outline-offset:1px}
  .bl-mode:disabled{opacity:.4;cursor:not-allowed}
  .bl-stage{position:relative;width:100%;height:var(--bl-h,300px);--bl-d:44px}
  .bl-art{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible}
  .bl-tablebg{fill:var(--board-2);stroke:var(--board-line);stroke-width:1.2}
  .bl-slot{fill:none;stroke:var(--board-line);stroke-width:1.6;stroke-dasharray:4 4}
  .bl-slotn{fill:var(--ink-2);opacity:.6;font:800 15px "Baloo 2","Nunito",sans-serif;text-anchor:middle}
  .bl-str{fill:none;stroke:var(--ink-2);stroke-width:1.4}
  .bl-panlbl{fill:var(--ink-2);font:900 10px "Nunito",sans-serif;letter-spacing:.14em;text-anchor:middle}
  .bl-coin{position:absolute;left:0;top:0;z-index:2;width:var(--bl-d);height:var(--bl-d);margin:0;padding:0;border-radius:50%;border:1.6px solid #2A2433;
    background:radial-gradient(circle at 35% 30%,#FFF3C4 0 10%,#F9D867 34%,#EDB437 70%,#D79C22 100%);
    --bl-ring:0 0 0 0 transparent;box-shadow:var(--bl-ring),inset 0 -3px 0 rgba(122,72,0,.25),inset 0 2px 0 rgba(255,255,255,.55);
    color:#5B3A06;font:800 calc(var(--bl-d) * .46)/1 "Baloo 2","Nunito",sans-serif;font-variant-numeric:tabular-nums;
    display:grid;place-items:center;cursor:pointer;-webkit-tap-highlight-color:transparent;
    transition:transform .34s cubic-bezier(.3,.75,.25,1),box-shadow .18s,filter .18s}
  .bl-coin::before{content:"";position:absolute;inset:3px;border-radius:50%;border:1.5px solid rgba(166,106,12,.55);pointer-events:none}
  .bl-coin>b{font-weight:800;transform:translateY(.06em);pointer-events:none}
  .bl-coin:hover{filter:brightness(1.05)}
  .bl-coin:focus-visible{outline:3px solid var(--focus);outline-offset:3px}
  .bl-coin.n1{filter:saturate(.4) brightness(.97)}
  .bl-coin.sel{--bl-ring:0 0 0 3px var(--board),0 0 0 6px var(--accent)}
  .bl-coin.hint{--bl-ring:0 0 0 3px var(--board),0 0 0 6px var(--hint)}
  .bl-coin.fake{--bl-ring:0 0 0 3px var(--board),0 0 0 6px #2C8249}
  .bl-coin.fake.bad{--bl-ring:0 0 0 3px var(--board),0 0 0 6px #C23A2E}
  .bl-coin.wrong::after{content:"";position:absolute;inset:-3px;border-radius:50%;pointer-events:none;background:linear-gradient(45deg,transparent 44%,#C23A2E 44% 56%,transparent 56%),linear-gradient(-45deg,transparent 44%,#C23A2E 44% 56%,transparent 56%)}
  .bl-coin.nope{animation:bl-shake .38s ease-in-out}
  @keyframes bl-shake{20%{translate:-5px 0}40%{translate:5px 0}60%{translate:-3px 0}80%{translate:3px 0}}
  .bl-stage.bl-instant .bl-coin,.bl-stage.bl-swing .bl-coin{transition:none}
  .bl-stage.bl-over .bl-coin{cursor:default}
  .bl-note{position:absolute;right:-6px;top:-6px;width:21px;height:21px;border-radius:50%;border:1.6px solid #2A2433;display:grid;place-items:center;pointer-events:none}
  .bl-note svg{width:13px;height:13px;display:block}
  .bl-n1{background:#3FA66B}.bl-n2{background:#3E7BD9}.bl-n3{background:#E5484D}
  .bl-side{position:absolute;left:-6px;bottom:-6px;min-width:21px;height:21px;padding:0 5px;border-radius:999px;background:#F3B61F;border:1.6px solid #2A2433;color:#2A2433;font:900 11px/18px "Nunito",sans-serif;pointer-events:none}
  .bl-tag{position:absolute;left:50%;bottom:calc(100% + 7px);translate:-50% 0;padding:2px 9px;border-radius:999px;border:1.6px solid #2A2433;background:#2C8249;color:#fff;font:900 12px/1.35 "Nunito",sans-serif;white-space:nowrap;pointer-events:none;animation:kit-pop .35s ease-out}
  .bl-tag.bad{background:#C23A2E}
  .bl-tag.l{left:-4px;translate:none}.bl-tag.r{left:auto;right:-4px;translate:none}
  .bl-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;min-height:44px}
  .bl-count{font-size:15px;font-weight:700;color:var(--ink-2)}
  .bl-count b{color:var(--ink);font:800 20px/1 "Baloo 2","Nunito",sans-serif;font-variant-numeric:tabular-nums}
  .bl-btn{height:44px;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:12px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font:800 14px/1 "Nunito",sans-serif;cursor:pointer;transition:border-color .15s,background .15s,color .15s}
  .bl-btn:hover{border-color:var(--ink-2)}
  .bl-btn:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
  .bl-btn:disabled{opacity:.4;cursor:not-allowed}
  .bl-btn .bl-note{position:static;width:20px;height:20px}
  .bl-dir{display:flex;gap:6px}
  .bl-dirb[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--page)}
  .bl-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin:0;padding:0;list-style:none;font-size:14px;font-weight:700;color:var(--ink-2)}
  .bl-legend li{display:inline-flex;align-items:center;gap:6px}
  .bl-legend .bl-note{position:static}
  .bl-hist{list-style:none;margin:0;padding:0;display:grid;gap:6px}
  .bl-hist li{display:flex;align-items:center;gap:8px;min-height:44px;padding:6px 8px;border-radius:12px;background:var(--panel);border:1px solid var(--line);font-size:14px;font-weight:700}
  .bl-hist li.bl-todo{background:none;border-style:dashed;color:var(--ink-2);font-weight:600}
  .bl-hist li.bl-new{animation:bl-in .9s ease-out}
  .bl-hn{width:26px;height:26px;flex:none;border-radius:8px;display:grid;place-items:center;background:var(--ink);color:var(--page);font:800 15px/1 "Baloo 2","Nunito",sans-serif}
  .bl-todo .bl-hn{background:none;border:1.5px dashed var(--board-line);color:var(--ink-2)}
  .bl-hb{flex:1;min-width:0;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:5px 12px}
  .bl-hw{display:inline-flex;flex-wrap:wrap;align-items:center;gap:4px 6px}
  .bl-chips{display:inline-flex;flex-wrap:wrap;gap:2px}
  .bl-chip{width:22px;height:22px;border-radius:50%;display:inline-grid;place-items:center;background:#F6CD4C;border:1.4px solid #2A2433;color:#5B3A06;font:800 12px/1 "Baloo 2","Nunito",sans-serif;font-variant-numeric:tabular-nums}
  .bl-x{font-weight:900;color:var(--ink-2)}
  .bl-res{display:inline-flex;align-items:center;gap:6px;color:var(--ink)}
  .bl-res svg{width:30px;height:22px;flex:none;color:var(--ink-2)}
  @keyframes bl-in{from{background:color-mix(in srgb,var(--hint) 38%,var(--panel))}}
  @media (max-width:560px){.bl-modes{width:100%}.bl-mode{padding:0 8px}.bl-btn{padding:0 10px}.bl-count{font-size:14px}}
  `;

  const BLURB = {
    facil: 'Três moedas e a falsa é mais leve. Uma pesagem basta, se for bem escolhida.',
    medio: 'Nove moedas, a falsa é mais leve e só há duas pesagens.',
    dificil: 'Quatro moedas, mas a falsa pode ser mais leve ou mais pesada. Basta dizer qual é.',
    muito: 'O clássico: doze moedas, três pesagens, e é preciso dizer se a falsa é mais leve ou mais pesada.',
  };
  const FACT = lv => (lv.dirs.length === 1 ? `Uma das <b>${lv.n} moedas</b> é falsa e <b>mais leve</b> que as outras.`
    : `Uma das <b>${lv.n} moedas</b> é falsa: <b>mais leve ou mais pesada</b>. ${lv.modo === 'moeda' ? 'Descubra qual.' : 'Descubra qual e como.'}`);

  Jogos.register({
    id: 'balanca',
    name: 'Moeda falsa',
    tagline: 'Use a balança de dois pratos para achar a moeda falsa com poucas pesagens.',
    icon: ICON,
    css: CSS,
    metric: { label: 'Pesagens', unit: ['pesagem', 'pesagens'] },
    generated: true,
    levels: NIVEIS.map(l => Object.assign({}, l, {
      sub: `<span class="cnt">${l.n} moedas · </span>${plural(l.pesagens, 'pesagem', 'pesagens')}`,
      blurb: BLURB[l.id],
    })),
    rules: lv => [
      { key: 'meta', icon: ICO_FALSA, novo: lv.id === 'dificil',
        html: lv.dirs.length === 1 ? `Uma das <b>${lv.n} moedas</b> é falsa e <b>mais leve</b>; as outras pesam igual.`
          : `Uma das <b>${lv.n} moedas</b> é falsa: <b>mais leve ou mais pesada</b>, você não sabe qual.` },
      { key: 'pesar', icon: ICO_PESAR,
        html: `Ponha o <b>mesmo número de moedas</b> em cada prato e toque em <b>Pesar</b>. Você tem <b>${plural(lv.pesagens, 'pesagem', 'pesagens')}</b>.` },
      { key: 'acusar', icon: ICO_APONTAR, novo: lv.id === 'muito',
        html: lv.modo === 'moeda' ? 'Aponte a falsa quando tiver <b>certeza</b>. Basta dizer qual é a moeda.'
          : lv.dirs.length === 2 ? 'Aponte a falsa e diga se ela é <b>mais leve ou mais pesada</b>, quando tiver <b>certeza</b>.'
          : 'Aponte a falsa quando tiver <b>certeza</b>.' },
      { key: 'justa', icon: ICO_JUSTA,
        html: 'A balança é honesta, mas a moeda falsa só é definida pelas pesagens: <b>chutar não funciona</b>. Se outra moeda ainda puder ser a falsa, você perde.' },
    ],
    how: lv => `Toque numa moeda e ela vai para o <b>prato esquerdo</b>; toque de novo e ela passa para o <b>direito</b>; mais uma vez e ela volta à <b>mesa</b>. Cada prato leva no máximo ${plural(Math.floor(lv.n / 2), 'moeda', 'moedas')}; se um estiver cheio, a moeda vai para o outro. ` +
      `A balança só se mexe quando você toca em <b>Pesar</b>. No modo <b>Anotar</b>, cada toque marca a moeda (verdadeira, leve?${lv.dirs.length === 1 ? '' : ', pesada?'}); as marcas são só suas. ` +
      `Quando tiver certeza, use <b>Apontar</b>: toque na moeda${lv.modo === 'tudo' && lv.dirs.length === 2 ? ', diga se é mais leve ou mais pesada' : ''} e confirme em <b>Acusar</b>.`,

    mount(ctx) {
      const { h, svg } = ctx, lv = ctx.level, n = lv.n, limit = lv.pesagens, modo = lv.modo;
      const soLeve = lv.dirs.length === 1, pedeSentido = modo === 'tudo' && !soLeve, cap = Math.floor(n / 2);
      let S = initial(n, lv.dirs);                 // hipóteses ainda possíveis
      const where = Array(n).fill(0);             // 0 mesa, -1 prato esquerdo, 1 prato direito
      const pans = { '-1': [], 1: [] };           // moedas em cada prato, na ordem em que chegaram
      const notes = Array(n).fill(0);             // 0 nada, 1 verdadeira, 2 leve?, 3 pesada?
      const hist = [];                            // { left, right, t }
      let used = 0, mode = 'mover', sel = null, selDir = null, hintW = null, end = null;
      let angle = 0, rest = 0, shown = false, fresh = false, anim = false, raf = 0, dead = false, L = null;
      ctx.setMin(limit, 'Pesagens permitidas');
      ctx.setMoves(0);

      // ----- elementos -----
      const modeBtn = (id, label, icon, full) => h('button', { type: 'button', class: 'bl-mode', 'aria-pressed': 'false', 'aria-label': full, title: full, onclick: () => pickMode(id) },
        h('span', { html: icon, 'aria-hidden': 'true', style: { display: 'inline-flex' } }), label);
      const modes = {
        mover: modeBtn('mover', 'Mover', MI_MOVER, 'Mover moedas entre a mesa e os pratos'),
        anotar: modeBtn('anotar', 'Anotar', MI_ANOTAR, 'Anotar marcas nas moedas'),
        apontar: modeBtn('apontar', 'Apontar', MI_APONTAR, 'Apontar a falsa'),
      };
      const stage = h('div', { class: 'bl-stage' });
      const art = svg('svg', { class: 'bl-art', 'aria-hidden': 'true', focusable: 'false' });
      const coins = Array.from({ length: n }, (_, i) => h('button', { type: 'button', class: 'bl-coin', onclick: () => tap(i) }, h('b', {}, String(i + 1))));
      stage.append(art, ...coins);
      const countEl = h('span', { class: 'bl-count', 'aria-live': 'off' });
      const btnClear = h('button', { type: 'button', class: 'bl-btn', onclick: () => clearPans() }, 'Limpar pratos');
      const rowMover = h('div', { class: 'bl-row' }, countEl, btnClear);
      const legend = h('ul', { class: 'bl-legend', 'aria-label': 'Marcas' },
        h('li', {}, h('span', { class: 'bl-note bl-n1', html: NOTE[1] }), 'verdadeira'),
        h('li', {}, h('span', { class: 'bl-note bl-n2', html: NOTE[2] }), soLeve ? 'pode ser a leve' : 'leve?'),
        soLeve ? null : h('li', {}, h('span', { class: 'bl-note bl-n3', html: NOTE[3] }), 'pesada?'));
      const btnErase = h('button', { type: 'button', class: 'bl-btn', onclick: () => eraseNotes() }, 'Apagar marcas');
      const rowAnotar = h('div', { class: 'bl-row' }, legend, btnErase);
      const accTxt = h('span', { class: 'bl-count' });
      const dirBtns = pedeSentido ? [-1, 1].map(d => h('button', { type: 'button', class: 'bl-btn bl-dirb', 'aria-pressed': 'false', onclick: () => pickDir(d) },
        h('span', { class: `bl-note bl-n${d < 0 ? 2 : 3}`, html: NOTE[d < 0 ? 2 : 3] }), d < 0 ? 'Mais leve' : 'Mais pesada')) : [];
      const rowApontar = h('div', { class: 'bl-row' }, accTxt, pedeSentido ? h('div', { class: 'bl-dir', role: 'group', 'aria-label': 'A falsa é mais leve ou mais pesada?' }, dirBtns) : null);
      const histEl = h('ol', { class: 'bl-hist', 'aria-label': 'Pesagens' });
      ctx.board.append(h('div', { class: 'bl-wrap' },
        h('div', { class: 'bl-top' }, h('p', { class: 'bl-fact', html: FACT(lv) }),
          h('div', { class: 'bl-modes', role: 'group', 'aria-label': 'O que o toque numa moeda faz' }, Object.values(modes))),
        stage, rowMover, rowAnotar, rowApontar, histEl));

      // ----- medidas (tudo em pixels; o SVG usa viewBox = tamanho real) -----
      function layout(W) {
        const k = Math.min(cap, 3), rows = Math.ceil(cap / k), gp = 2, pad = 4, colW = W < 420 ? 8 : 10, mid = 4;
        const d = Math.max(34, Math.min(52, Math.floor((W - 2 * (colW / 2 + mid) - 4 * pad - 2 * (k - 1) * gp) / (2 * k))));
        const panW = Math.max(k * d + (k - 1) * gp + 2 * pad, Math.round(d * 1.7));   // prato nunca fica mirrado
        const R = Math.max(panW / 2 + colW / 2 + mid, Math.min((W - panW) / 2, W * 0.3 + 30, 190));
        const amp = R * Math.sin(THETA * Math.PI / 180);
        const cx = W / 2, yP = Math.max(amp + 10, 18) + 2;
        const Sl = Math.max(64, rows * (d + 2) + 18);            // comprimento dos fios
        const dish = Math.round(Math.max(8, panW * 0.09));
        const panTop = yP + Sl, yBase = panTop + amp + dish + 16, baseH = 12, yTable = yBase + baseH;
        const gt = W < 420 ? 6 : 10, perMax = Math.max(1, Math.floor((W + gt) / (d + gt)));
        const tRows = Math.ceil(n / perMax), per = Math.ceil(n / tRows), tPad = 14;
        const tableH = tRows * d + (tRows - 1) * gt + 2 * tPad;
        return { W, k, gp, pad, colW, d, panW, R, amp, cx, yP, Sl, dish, panTop, yBase, baseH, yTable, gt, per, tPad, tableH, H: Math.ceil(yTable + tableH) };
      }
      function homeXY(i) {
        const r = Math.floor(i / L.per), j = i % L.per, m = Math.min(L.per, n - r * L.per);
        return [L.cx + (j - (m - 1) / 2) * (L.d + L.gt), L.yTable + L.tPad + L.d / 2 + r * (L.d + L.gt)];
      }
      function panOffset(s, a) {                   // deslocamento do prato s com o travessão inclinado a graus
        const r = a * Math.PI / 180;
        return [-s * L.R * (1 - Math.cos(r)), s * L.R * Math.sin(r)];
      }
      function coinXY(i, a) {
        const s = where[i];
        if (!s) return homeXY(i);
        const q = pans[s].indexOf(i), row = Math.floor(q / L.k), col = q % L.k, m = Math.min(L.k, pans[s].length - row * L.k);
        const [dx, dy] = panOffset(s, a);
        return [L.cx + s * L.R + dx + (col - (m - 1) / 2) * (L.d + L.gp), L.panTop + dy - L.d / 2 - 1 - row * (L.d + 1)];
      }
      function put(i, a) {
        const [x, y] = coinXY(i, a);
        coins[i].style.transform = `translate(${(x - L.d / 2).toFixed(1)}px,${(y - L.d / 2).toFixed(1)}px)`;
      }

      // ----- desenho da balança -----
      let gBeam = null;
      const gPan = {};
      const OLA = { stroke: '#2A2433', 'stroke-width': 1.6, 'stroke-linejoin': 'round' };
      const el = (tag, a, fill) => svg(tag, Object.assign({}, a, fill ? Object.assign({ fill }, OLA) : {}));
      function beamPath(cx, y, R) {
        const e = R + 7;
        return `M${cx - e} ${y - 3}L${cx - 14} ${y - 5.5}L${cx + 14} ${y - 5.5}L${cx + e} ${y - 3}Q${cx + e + 3} ${y} ${cx + e} ${y + 3}` +
          `L${cx + 14} ${y + 5.5}L${cx - 14} ${y + 5.5}L${cx - e} ${y + 3}Q${cx - e - 3} ${y} ${cx - e} ${y - 3}Z`;
      }
      function gauge(cx, cy, Lp) {                 // mostrador do ponteiro
        const r1 = Lp - 7, r2 = Lp + 3, A = 17 * Math.PI / 180;
        const pt = (r, a) => [cx + r * Math.sin(a), cy + r * Math.cos(a)];
        const [x1, y1] = pt(r2, -A), [x2, y2] = pt(r2, A), [x3, y3] = pt(r1, A), [x4, y4] = pt(r1, -A);
        const band = el('path', { d: `M${x1} ${y1}A${r2} ${r2} 0 0 0 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 1 ${x4} ${y4}Z` }, '#F4EBD9');
        const ticks = [-THETA, 0, THETA].map(t => {
          const a = t * Math.PI / 180, [ax, ay] = pt(r1 + 1.5, a), [bx, by] = pt(r2 - (t ? 3 : 0.5), a);
          return svg('path', { d: `M${ax} ${ay}L${bx} ${by}`, stroke: '#2A2433', 'stroke-width': t ? 1.2 : 1.8, 'stroke-linecap': 'round' });
        });
        return svg('g', {}, band, ...ticks);
      }
      function draw() {
        const { W, H, cx, yP, R, panW, Sl, dish, panTop, yBase, baseH, yTable, tableH, colW, d } = L;
        art.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const parts = [svg('rect', { class: 'bl-tablebg', x: 0.6, y: yTable, width: W - 1.2, height: tableH - 0.6, rx: 16 })];
        for (let i = 0; i < n; i++) {
          const [x, y] = homeXY(i);
          parts.push(svg('circle', { class: 'bl-slot', cx: x, cy: y, r: d / 2 - 1.5 }), svg('text', { class: 'bl-slotn', x, y, dy: '.36em' }, String(i + 1)));
        }
        const bw = Math.max(64, Math.min(R * 0.9, 150));
        parts.push(el('path', { d: `M${cx - bw / 2} ${yTable}h${bw}l-9 ${-baseH}h${-(bw - 18)}z` }, '#A86E3A'));
        parts.push(el('rect', { x: cx - colW / 2, y: yP - 9, width: colW, height: yBase - yP + 10, rx: colW / 2 }, '#8C5A2D'));
        parts.push(el('circle', { cx, cy: yP - 13, r: 5.5 }, '#6C7F96'));
        const Lp = Math.min(40, Sl * 0.42);
        parts.push(gauge(cx, yP, Lp));
        for (const s of [-1, 1]) {
          const px = cx + s * R;
          gPan[s] = svg('g', {},
            svg('path', { class: 'bl-str', d: `M${px} ${yP + 3}L${px - panW / 2 + 3} ${panTop}M${px} ${yP + 3}L${px + panW / 2 - 3} ${panTop}` }),
            el('path', { d: `M${px - panW / 2} ${panTop}h${panW}a${panW / 2} ${dish} 0 0 1 ${-panW} 0z` }, '#CFDAE6'),
            svg('path', { d: `M${px - panW / 2 + 6} ${panTop + 3}h${panW - 12}`, stroke: '#FFFFFF', 'stroke-opacity': 0.7, 'stroke-width': 2, 'stroke-linecap': 'round' }),
            svg('text', { class: 'bl-panlbl', x: px, y: panTop + dish + 13 }, s < 0 ? 'ESQUERDA' : 'DIREITA'));
          parts.push(gPan[s]);
        }
        gBeam = svg('g', {},
          el('path', { d: `M${cx - 2.8} ${yP + 4}L${cx} ${yP + Lp}L${cx + 2.8} ${yP + 4}z` }, '#E5484D'),
          el('path', { d: beamPath(cx, yP, R) }, '#6C7F96'),
          svg('path', { d: `M${cx - R} ${yP - 2}L${cx - 16} ${yP - 3.6}M${cx + 16} ${yP - 3.6}L${cx + R} ${yP - 2}`, stroke: '#A9BACB', 'stroke-width': 1.4, 'stroke-linecap': 'round' }),
          el('circle', { cx: cx - R, cy: yP, r: 4.2 }, '#A9BACB'),
          el('circle', { cx: cx + R, cy: yP, r: 4.2 }, '#A9BACB'));
        parts.push(gBeam, el('circle', { cx, cy: yP, r: 4.6 }, '#E5484D'));
        art.replaceChildren(...parts);
        applyAngle(angle, false);
      }
      function applyAngle(a, withCoins) {
        angle = a;
        if (!gBeam) return;
        gBeam.setAttribute('transform', `rotate(${a.toFixed(3)} ${L.cx} ${L.yP})`);
        for (const s of [-1, 1]) {
          const [dx, dy] = panOffset(s, a);
          gPan[s].setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
          if (withCoins) pans[s].forEach(i => put(i, a));
        }
      }
      // Anima o travessão. 'swing': solta a trava e balança até parar (moedas dos pratos vão junto, quadro a quadro);
      // 'ease': volta suave (as moedas usam a transição do CSS).
      function animateTo(target, kind, done) {
        cancelAnimationFrame(raf);
        const from = angle;
        if (ctx.reduced || !L) { applyAngle(target, true); if (done) done(); return; }
        const dur = kind === 'swing' ? 1150 : 300, t0 = performance.now();
        if (kind === 'swing') stage.classList.add('bl-swing');
        // Garantia: se os quadros de animação pararem (aba em segundo plano), a pesagem termina mesmo assim.
        let finished = false;
        const finish = () => {
          if (finished || dead) return;
          finished = true;
          cancelAnimationFrame(raf);
          applyAngle(target, kind === 'swing');
          stage.classList.remove('bl-swing');
          if (done) done();
        };
        ctx.later(finish, dur + 250);
        const step = now => {
          if (dead || finished) return;
          const u = Math.min(1, (now - t0) / dur);
          let a;
          if (kind !== 'swing') a = from + (target - from) * (1 - Math.pow(1 - u, 3));
          else if (Math.abs(target - from) < 0.5) a = target + (from - target) * (1 - u) + 3.2 * Math.exp(-3.6 * u) * Math.sin(2 * Math.PI * 1.35 * u) * (1 - u);
          else { const z = 4, w = 2 * Math.PI * 1.3; a = target + (from - target) * Math.exp(-z * u) * (Math.cos(w * u) + (z / w) * Math.sin(w * u)); }
          if (u >= 1) a = target;
          applyAngle(a, kind === 'swing');
          if (u < 1) raf = requestAnimationFrame(step);
          else finish();
        };
        raf = requestAnimationFrame(step);
      }

      // ----- estado → tela -----
      const over = () => used >= limit;
      function renderCoin(i) {
        const b = coins[i], s = where[i];
        put(i, anim ? angle : rest);
        const hs = hintW && !end ? (hintW.left.includes(i) ? 'E' : hintW.right.includes(i) ? 'D' : null) : null;
        const isFake = !!end && end.fake === i;
        b.style.zIndex = isFake ? '20' : s ? String(3 + Math.floor(pans[s].indexOf(i) / L.k)) : '2';
        b.classList.toggle('sel', !end && mode === 'apontar' && sel === i);
        b.classList.toggle('hint', !!hs);
        b.classList.toggle('n1', notes[i] === 1 && !isFake);
        b.classList.toggle('fake', isFake);
        b.classList.toggle('bad', isFake && !end.ok);
        b.classList.toggle('wrong', !!end && end.wrong === i && !isFake);
        const kids = [h('b', {}, String(i + 1))];
        if (notes[i] && !isFake) kids.push(h('span', { class: `bl-note bl-n${notes[i]}`, html: NOTE[notes[i]] }));
        if (hs) kids.push(h('span', { class: 'bl-side' }, hs));
        if (isFake) {
          const x = coinXY(i, rest)[0];
          kids.push(h('span', { class: 'bl-tag' + (end.ok ? '' : ' bad') + (x < 70 ? ' l' : x > L.W - 70 ? ' r' : '') }, end.label));
        }
        b.replaceChildren(...kids);
        const lugar = s ? `no prato ${s < 0 ? 'esquerdo' : 'direito'}` : 'na mesa';
        const nota = [null, 'marcada como verdadeira', soLeve ? 'marcada como suspeita' : 'marcada como talvez leve', 'marcada como talvez pesada'][notes[i]];
        b.setAttribute('aria-label', [`Moeda ${i + 1}`, lugar, nota, !end && mode === 'apontar' && sel === i ? 'apontada como falsa' : null,
          hs ? `a dica sugere o prato ${hs === 'E' ? 'esquerdo' : 'direito'}` : null, isFake ? end.label : null].filter(Boolean).join(', '));
      }
      function render() {
        if (L) {
          stage.classList.toggle('bl-over', !!end);
          coins.forEach((_, i) => renderCoin(i));
        }
        for (const [id, b] of Object.entries(modes)) {
          b.setAttribute('aria-pressed', String(mode === id));
          b.disabled = anim || !!end || (id === 'mover' && over());
        }
        rowMover.hidden = mode !== 'mover';
        rowAnotar.hidden = mode !== 'anotar';
        rowApontar.hidden = mode !== 'apontar';
        const nl = pans[-1].length, nr = pans[1].length;
        countEl.innerHTML = `Esquerda <b>${nl}</b> × <b>${nr}</b> Direita`;
        btnClear.disabled = anim || !!end || !(nl + nr);
        btnErase.disabled = !!end || !notes.some(Boolean);
        accTxt.innerHTML = sel == null ? `Toque na moeda falsa${pedeSentido ? ' e escolha o sentido' : ''}.` : `Suspeita: <b>moeda ${sel + 1}</b>`;
        dirBtns.forEach((b, j) => { b.setAttribute('aria-pressed', String(selDir === (j ? 1 : -1))); b.disabled = !!end; });
        primary();
        status();
      }
      function primary() {
        if (ctx.status !== 'play') return;
        if (mode === 'apontar' || over()) {
          const ready = sel != null && (!pedeSentido || selDir != null);
          ctx.primary(ready ? `Acusar a moeda ${sel + 1}` : 'Acusar', { disabled: anim || !ready });
        } else {
          const nl = pans[-1].length, nr = pans[1].length;
          ctx.primary('Pesar', { disabled: anim || !nl || nl !== nr });
        }
      }
      function status() {
        if (ctx.status !== 'play') return;
        if (anim) return ctx.say('Pesando…', 'A balança foi destravada: veja para que lado ela pende.');
        const left = limit - used, nl = pans[-1].length, nr = pans[1].length;
        const restam = `Resta${left > 1 ? 'm' : ''} ${plural(left, 'pesagem', 'pesagens')}`;
        if (fresh && hist.length) {
          return ctx.say(`Pesagem ${used}: ${RES[hist[hist.length - 1].t]}`, left
            ? `${restam}. Pense no que isso diz sobre cada moeda e monte a próxima pesagem.`
            : 'As pesagens acabaram. Agora só resta apontar a falsa: toque nela e depois em Acusar.');
        }
        if (mode === 'anotar') return ctx.say('Anotando', `Cada toque troca a marca da moeda. As marcas são só para você: o jogo não confere.${over() ? ' Depois, toque em Apontar.' : ''}`);
        if (mode === 'apontar' || over()) {
          if (sel == null) return ctx.say(over() ? 'As pesagens acabaram' : 'Aponte a falsa', `${over() ? '' : `${restam}, mas você pode acusar quando quiser. `}Toque na moeda que você acha que é a falsa${pedeSentido ? ' e diga se ela é mais leve ou mais pesada' : ''}. Só vale se as pesagens não deixarem outra possibilidade.`);
          if (pedeSentido && selDir == null) return ctx.say(`Moeda ${sel + 1}: mais leve ou mais pesada?`, 'Escolha o sentido logo abaixo da balança.');
          return ctx.say(`Suspeita: moeda ${sel + 1}${pedeSentido ? `, ${dirTxt(selDir)}` : ''}`, 'Toque em Acusar para confirmar, ou escolha outra moeda.');
        }
        if (!nl && !nr) {
          return used ? ctx.say('Monte a próxima pesagem', `${restam}. Toque nas moedas para colocá-las nos pratos.`)
            : ctx.say('Sua vez', 'Toque numa moeda para colocá-la no prato esquerdo; toque de novo para passá-la ao direito. Depois, toque em Pesar.');
        }
        if (nl !== nr) return ctx.say(`${nl} × ${nr}`, 'Os dois pratos precisam ter o mesmo número de moedas.');
        return ctx.say(`${nl} × ${nr}: pronto para pesar`, `Toque em Pesar. ${restam}.`);
      }
      function renderHist(flash) {
        const chips = a => h('span', { class: 'bl-chips' }, a.map(i => h('span', { class: 'bl-chip' }, String(i + 1))));
        const items = [];
        for (let k = 0; k < limit; k++) {
          const e = hist[k];
          if (!e) {
            items.push(h('li', { class: 'bl-todo' }, h('span', { class: 'bl-hn', 'aria-hidden': 'true' }, String(k + 1)),
              h('span', {}, k === used ? `Pesagem ${k + 1}: a próxima` : `Pesagem ${k + 1}: ainda não usada`)));
            continue;
          }
          items.push(h('li', { class: flash && k === hist.length - 1 ? 'bl-new' : '' },
            h('span', { class: 'sr-only' }, `Pesagem ${k + 1}: moedas ${lst(e.left)} contra ${lst(e.right)}, ${RES[e.t]}.`),
            h('span', { class: 'bl-hn', 'aria-hidden': 'true' }, String(k + 1)),
            h('span', { class: 'bl-hb', 'aria-hidden': 'true' },
              h('span', { class: 'bl-hw' }, chips(e.left), h('span', { class: 'bl-x' }, '×'), chips(e.right)),
              h('span', { class: 'bl-res' }, h('span', { html: resIcon(e.t), style: { display: 'inline-flex' } }), RES[e.t]))));
        }
        histEl.replaceChildren(...items);
      }

      // ----- ações -----
      const calm = () => { if (ctx.clearWarn) ctx.clearWarn(); };   // o aviso anterior já não vale
      function tap(i) {
        if (anim || end || ctx.status !== 'play') return;
        fresh = false;
        calm();
        if (mode === 'anotar') { notes[i] = (notes[i] + 1) % (soLeve ? 3 : 4); return render(); }
        if (mode === 'apontar' || over()) { sel = sel === i ? null : i; return render(); }
        moveCoin(i);
      }
      // mesa → prato esquerdo → prato direito → mesa (pulando o prato que estiver cheio)
      function moveCoin(i) {
        const cur = where[i];
        let next = cur === 0 ? -1 : cur === -1 ? 1 : 0;
        if (next && pans[next].length >= cap) {
          const motivo = `Com ${n} moedas, cada prato leva no máximo ${cap}: mais do que isso não daria o mesmo número dos dois lados.`;
          if (cur === 0 && pans[1].length < cap) next = 1;          // esquerda cheia: vai direto para a direita
          else if (cur === 0) { ctx.retrigger(coins[i]); return ctx.warn('Pratos cheios', motivo, 'pesar'); }
          else { next = 0; ctx.warn('Prato direito cheio', `${motivo} A moeda ${i + 1} voltou para a mesa.`, 'pesar'); }
        }
        if (cur) pans[cur].splice(pans[cur].indexOf(i), 1);
        where[i] = next;
        if (next) pans[next].push(i);
        unlock();
        render();
      }
      // Mexeu nos pratos depois de uma pesagem: a balança volta a ficar travada e nivelada.
      function unlock() {
        if (!shown) return;
        shown = false;
        if (rest !== 0) { rest = 0; animateTo(0, 'ease'); }
      }
      function clearPans() {
        if (anim || end) return;
        fresh = false;
        calm();
        for (const s of [-1, 1]) { pans[s].forEach(i => { where[i] = 0; }); pans[s].length = 0; }
        unlock();
        render();
      }
      function eraseNotes() { if (end) return; calm(); notes.fill(0); render(); }
      function pickMode(m) {
        if (anim || end || ctx.status !== 'play' || (m === 'mover' && over())) return;
        mode = m;
        fresh = false;
        calm();
        if (m !== 'apontar') sel = null;
        render();
      }
      function pickDir(d) { if (anim || end) return; calm(); selDir = selDir === d ? null : d; fresh = false; render(); }

      const same = (a, b) => a.length === b.length && a.every((x, j) => x === b[j]);
      function weigh() {
        const nl = pans[-1].length, nr = pans[1].length;
        if (!nl && !nr) return ctx.warn('Pratos vazios', 'Toque nas moedas para colocá-las nos pratos antes de pesar.', 'pesar');
        if (nl !== nr) return ctx.warn('Pratos desiguais', `Há ${plural(nl, 'moeda', 'moedas')} na esquerda e ${nr} na direita. Deixe o mesmo número nos dois pratos.`, 'pesar');
        const by = (a, b) => a - b, w = { left: pans[-1].slice().sort(by), right: pans[1].slice().sort(by) };
        const rep = hist.findIndex(x => (same(x.left, w.left) && same(x.right, w.right)) || (same(x.left, w.right) && same(x.right, w.left)));
        if (rep >= 0) return ctx.warn('Pesagem repetida', `Essa é a mesma pesagem ${rep + 1}, então o resultado seria igual. Troque alguma moeda de lugar.`);
        const r = respond(S, w, n, limit - used - 1, modo, ctx.rng);
        S = r.S;
        used++;
        hist.push({ left: w.left, right: w.right, t: r.t });
        hintW = null; shown = true; fresh = true; anim = true; rest = r.t * THETA;
        ctx.busy(true);
        render();
        animateTo(rest, 'swing', () => {
          anim = false;
          ctx.busy(false);
          if (over()) { mode = 'apontar'; sel = null; }
          renderHist(true);
          ctx.setMoves(used);
          render();
        });
      }

      function accuse() {
        if (sel == null) {
          if (mode !== 'apontar') { mode = 'apontar'; fresh = false; render(); }
          return ctx.warn('Escolha a moeda', `Toque na moeda que você acha que é a falsa${pedeSentido ? ' e diga se ela é mais leve ou mais pesada' : ''}.`, 'acusar');
        }
        if (pedeSentido && selDir == null) return ctx.warn('Mais leve ou mais pesada?', 'Escolha o sentido logo abaixo da balança antes de acusar.', 'acusar');
        const v = verdict(S, sel, pedeSentido ? selDir : null, modo);
        if (v.ok) winNow(); else failNow(v);
      }
      function winNow() {
        const ds = [...new Set(S.map(dirOf))], d = ds.length === 1 ? ds[0] : null;
        end = { ok: true, fake: sel, label: d && !soLeve ? `falsa · ${dirTxt(d)}` : 'falsa' };
        hintW = null;
        render();
        const sent = d ? `, ${dirTxt(d)},` : '';
        const extra = modo === 'moeda' && !d ? ' Se ela é mais leve ou mais pesada, as pesagens não dizem, e nem precisava.' : '';
        ctx.win({ score: used, title: 'Achou a moeda falsa!', text: `A moeda ${sel + 1}${sent} é a falsa, e as pesagens não deixavam outra possibilidade.${extra} Você usou ${plural(used, 'pesagem', 'pesagens')}.` });
      }
      // Por que a moeda (e o sentido, se dado) não pode ser a falsa, citando a primeira pesagem que desmente.
      function whyNot(coin, dir) {
        const ds = dir == null ? lv.dirs : [dir];
        const rs = ds.map(d => ({ d, r: refute(hist, hyp(coin, d)) })).filter(x => x.r);
        const frase = ({ d, r }) => {
          const k = r.k + 1;
          if (!r.side) return `na pesagem ${k} ela ficou fora da balança e os pratos não equilibraram`;
          if (r.t === 0) return `na pesagem ${k} ela estava no prato ${r.side} e a balança equilibrou`;
          const sobe = s => (r.side === 'esquerdo' ? s > 0 : s < 0);
          return `na pesagem ${k} o prato ${r.side}, onde ela estava, ${sobe(r.t) ? 'subiu' : 'desceu'}, e ${dirTxt(d)} ela o faria ${sobe(r.e) ? 'subir' : 'descer'}`;
        };
        const quem = `A moeda ${coin + 1}`;
        if (!rs.length) return `${quem} não pode ser a falsa.`;
        if (rs.length === 1) return `${quem} não pode ser a falsa${dir != null && !soLeve ? ` ${dirTxt(dir)}` : ''}: ${frase(rs[0])}.`;
        const [a, b] = rs;
        if (a.r.k === b.r.k && (a.r.t === 0 || !a.r.side)) return `${quem} não pode ser a falsa: ${frase(a)}.`;
        return `${quem} não pode ser a falsa: mais leve não, porque ${frase(a)}; mais pesada também não, porque ${frase(b)}.`;
      }
      function failNow(v) {
        const same = v.others.filter(x => coinOf(x) === sel);
        const alt = same.length ? same[0] : ctx.rng.pick(v.others);
        const ac = coinOf(alt), ad = dirOf(alt);
        const altTxt = `a moeda ${ac + 1}${soLeve ? '' : `, ${dirTxt(ad)}`}`;
        end = { ok: false, fake: ac, wrong: sel, label: soLeve ? 'falsa' : `falsa · ${dirTxt(ad)}` };
        hintW = null;
        render();
        const total = modo === 'moeda' ? new Set(S.map(coinOf)).size : S.length;
        let title, text;
        if (v.possible) {
          title = 'Ainda não dava para ter certeza';
          text = used === 0
            ? `Sem nenhuma pesagem, qualquer moeda pode ser a falsa. Desta vez, era ${altTxt}.`
            : `Se a falsa fosse ${altTxt}, a balança teria mostrado exatamente os mesmos resultados. Então ela também explicava tudo, e desta vez era ela.` +
              `${total > 2 ? ` Ainda havia ${plural(total, 'possibilidade', 'possibilidades')}.` : ''} Só vence quem elimina todas as outras.`;
        } else {
          title = pedeSentido && S.some(x => coinOf(x) === sel) ? 'Sentido errado' : 'Essa moeda não é a falsa';
          text = `${whyNot(sel, pedeSentido ? selDir : null)} ${total === 1 ? 'Pelas pesagens, a falsa só podia ser' : 'A falsa podia ser, por exemplo,'} ${altTxt}.`;
        }
        ctx.fail({ title, text, rule: v.possible ? 'justa' : 'acusar' });
      }

      // ----- tamanho, teclado e início -----
      function resize(w) {
        const cs = getComputedStyle(ctx.board);
        const W = Math.floor(Math.max(240, Math.min(760, w - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0))));
        if (L && L.W === W) return;
        L = layout(W);
        stage.style.setProperty('--bl-h', L.H + 'px');
        stage.style.setProperty('--bl-d', L.d + 'px');
        stage.classList.add('bl-instant');
        draw();
        render();
        void stage.offsetWidth;
        stage.classList.remove('bl-instant');
      }
      ctx.onResize(resize);
      ctx.listen(window, 'keydown', e => {
        if (e.key === 'Escape' && mode !== 'mover' && !over() && !anim && !end && ctx.status === 'play') pickMode('mover');
      });
      renderHist(false);
      if (ctx.board.clientWidth) resize(ctx.board.clientWidth);   // mede já na montagem: nenhum quadro sai sem as moedas no lugar
      else render();

      return {
        onPrimary() {
          if (anim || end) return;
          calm();
          if (mode === 'apontar' || over()) accuse(); else weigh();
        },
        onHint() {
          if (anim || end) return;
          const left = limit - used, a = advise(S, n, left, modo);
          const unit = m => (soLeve ? plural(m, 'suspeita', 'suspeitas') : modo === 'moeda' ? plural(m, 'moeda suspeita', 'moedas suspeitas') : plural(m, 'possibilidade', 'possibilidades'));
          if (a.solved) {
            hintW = null;
            render();
            const ds = [...new Set(S.map(dirOf))];
            const sent = soLeve ? '' : ds.length === 1 ? `, <b>${dirTxt(ds[0])}</b>,` : ' (se é leve ou pesada, tanto faz aqui)';
            return ctx.hint('Dica', `Já dá para concluir: só a moeda <b>${coinOf(S[0]) + 1}</b>${sent} explica todas as pesagens. Toque em <b>Apontar</b>, escolha essa moeda e depois em <b>Acusar</b>.`);
          }
          if (a.over) {
            hintW = null;
            render();
            const poss = modo === 'moeda' ? [...new Set(S.map(coinOf))].map(c => String(c + 1))
              : S.map(x => (soLeve ? String(coinOf(x) + 1) : `${coinOf(x) + 1} ${dirOf(x) < 0 ? 'leve' : 'pesada'}`));
            return ctx.hint('Dica', `As pesagens acabaram e ainda há ${unit(poss.length)}: ${poss.join(', ')}. Não dá mais para ter certeza. Recomece e tente dividir as moedas em três grupos.`);
          }
          hintW = a.w;
          render();
          const [lu, ru, ll, rl, lp, rp, lg, rg] = a.o, c = a.c;
          const noPrato = lu + ll + lp, fora = (c.u - lu - ru) + (c.l - ll - rl) + (c.p - lp - rp);
          const pese = `<b>${lst(a.w.left)} × ${lst(a.w.right)}</b> (esquerda × direita)`;
          let why;
          if (lg + rg) why = 'Complete os pratos com moedas que você já sabe que são verdadeiras: elas servem de peso de referência.';
          else if (lp + rp && ll + rl) why = 'Misture nos pratos moedas que só podem ser pesadas com moedas que só podem ser leves: cada resultado aponta para um grupo diferente.';
          else if (fora) why = `Divida as suspeitas em três grupos: ${noPrato} em cada prato e ${fora} fora da balança.`;
          else why = 'Divida as suspeitas entre os dois pratos.';
          if (!a.feasible) {
            return ctx.hint('Dica', `Daqui, mesmo sem errar, seriam precisas ${plural(a.needNow, 'pesagem', 'pesagens')}, e ${left > 1 ? `restam ${left}` : 'resta 1'}: já não dá para garantir a resposta. A melhor tentativa agora é pesar ${pese}. Ou recomece.`);
          }
          const rest1 = left - 1;
          const garante = rest1 === 0 ? 'Qualquer resultado deixa uma única resposta.'
            : `Qualquer resultado deixa no máximo ${unit(a.worst)}, e ${plural(rest1, 'pesagem resolve', 'pesagens resolvem')} isso.`;
          ctx.hint('Dica', `Pese ${pese}. ${why} ${garante}`);
        },
        destroy() { dead = true; cancelAnimationFrame(raf); },
      };
    },
  });
})();
