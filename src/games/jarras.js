/* Jarras d'água — meça a quantidade exata de água usando jarras sem marcação */
(() => {
  // ---------- lógica pura (testável no Node) ----------
  const K = typeof JogosCore !== 'undefined' ? JogosCore : require('../kit-core.js');

  // Estado: litros em cada jarra, na ordem da tela (ex.: [0, 5]).
  // Movimentos: { t: 'encher', i } · { t: 'esvaziar', i } · { t: 'despejar', de, para }
  // apply devolve o novo estado, ou null se a ação não muda nada (e então não conta movimento).
  function apply(caps, s, m) {
    const t = s.slice();
    if (m.t === 'encher') { if (s[m.i] >= caps[m.i]) return null; t[m.i] = caps[m.i]; return t; }
    if (m.t === 'esvaziar') { if (s[m.i] <= 0) return null; t[m.i] = 0; return t; }
    if (m.t === 'despejar') {
      const { de, para } = m;
      if (de === para || s[de] <= 0 || s[para] >= caps[para]) return null;
      const q = Math.min(s[de], caps[para] - s[para]);   // até o destino encher ou a origem esvaziar
      t[de] -= q; t[para] += q;
      return t;
    }
    return null;
  }
  // Todas as ações com efeito a partir de s. A ordem desempata a dica: encher, despejar, esvaziar.
  function options(caps, tap, s) {
    const out = [], n = caps.length;
    const add = m => { const st = apply(caps, s, m); if (st) out.push({ move: m, state: st }); };
    if (tap) for (let i = 0; i < n; i++) add({ t: 'encher', i });
    for (let de = 0; de < n; de++) for (let para = 0; para < n; para++) if (de !== para) add({ t: 'despejar', de, para });
    if (tap) for (let i = 0; i < n; i++) add({ t: 'esvaziar', i });
    return out;
  }
  // Metas: 'uma' (v litros em alguma jarra), 'duas' (duas jarras com v litros cada), 'exata' (litros de cada jarra).
  function isGoal(goal, s) {
    if (goal.type === 'uma') return s.includes(goal.v);
    if (goal.type === 'duas') return s.filter(x => x === goal.v).length >= 2;
    if (goal.type === 'exata') return s.every((x, i) => x === goal.v[i]);
    return false;
  }
  const key = s => s.join(',');
  // Menor sequência de ações até a meta (busca em largura), a partir do início do nível ou de `from`.
  function solve(level, from) {
    return K.bfs(from || level.start, { key, next: s => options(level.caps, level.tap, s), goal: s => isGoal(level.goal, s) });
  }
  // Parâmetros escolhidos por busca (ver relatório): mínimos 6, 10, 13 e 18.
  const LEVELS = [
    { id: 'facil', caps: [3, 5], start: [0, 0], tap: true, goal: { type: 'uma', v: 4 } },
    { id: 'medio', caps: [5, 7], start: [0, 0], tap: true, goal: { type: 'uma', v: 6 } },
    { id: 'dificil', caps: [14, 9, 5], start: [14, 0, 0], tap: false, goal: { type: 'exata', v: [7, 7, 0] } },
    { id: 'muito', caps: [6, 11, 12], start: [0, 0, 0], tap: true, goal: { type: 'duas', v: 3 } },
  ];
  for (const l of LEVELS) l.min = solve(l).path.length;
  const logic = { apply, options, isGoal, solve, key, LEVELS };
  if (typeof module !== 'undefined' && module.exports) { module.exports = logic; return; }

  // ---------- interface ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = v => Math.round(v * 10) / 10;
  const falta = k => (k === 1 ? 'falta 1 movimento' : `faltam ${k} movimentos`);
  const capsTxt = caps => (caps.length === 2 ? `${caps[0]}\u00A0L e ${caps[1]}\u00A0L` : `${caps.slice(0, -1).join(', ')} e ${caps[caps.length - 1]}\u00A0L`);
  // Texto da meta; com `chips`, os litros ganham o selo azul (usado no quadro da meta).
  function goalHTML(lv, chips) {
    const g = lv.goal, q = v => (chips ? `<b class="jr-l">${v}\u00A0L</b>` : `${v}\u00A0L`);
    if (g.type === 'uma') return `${q(g.v)} em uma jarra`;
    if (g.type === 'duas') return `duas jarras com ${q(g.v)} cada`;
    return g.v.map((v, i) => [v, lv.caps[i]]).filter(([v]) => v > 0)
      .map(([v, c], k) => `${q(v)} na ${k ? '' : 'jarra '}de ${c}\u00A0L`).join(' e ');
  }
  let UID = 0;   // ids únicos para os clipPath das jarras

  const ICON = `<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round">
    <rect x="3" y="54" width="58" height="7" rx="3.5" fill="#C8925A"/>
    <path d="M14 19C6 19 6 36 14 36V32.4C10.4 32.4 10.4 22.6 14 22.6Z" fill="#CDEBFA"/>
    <path d="M14 12V49A5 5 0 0 0 19 54H27A5 5 0 0 0 32 49V12Z" fill="#EAF6FC"/>
    <path d="M15.8 27H30.2V49A3.2 3.2 0 0 1 27 52.2H19A3.2 3.2 0 0 1 15.8 49Z" fill="#4AA3DF"/>
    <path d="M16.8 28.8H29.2" stroke="#A5DCF7" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M18.6 16V48" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".65"/>
    <path d="M32 11.2L37.4 8.2L35 13.6Z" fill="#CDEBFA"/>
    <rect x="12.4" y="9.8" width="21.2" height="4" rx="2" fill="#CDEBFA"/>
    <path d="M55 35C62 35 62 49 55 49V45.4C58.3 45.4 58.3 38.6 55 38.6Z" fill="#CDEBFA"/>
    <path d="M38 31V49A5 5 0 0 0 43 54H50A5 5 0 0 0 55 49V31Z" fill="#EAF6FC"/>
    <path d="M39.8 41H53.2V49A3.2 3.2 0 0 1 50 52.2H43A3.2 3.2 0 0 1 39.8 49Z" fill="#4AA3DF"/>
    <path d="M40.8 42.8H52.2" stroke="#A5DCF7" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M42.4 35V48" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".65"/>
    <path d="M38 30.2L33.8 27.4L35.6 32.6Z" fill="#CDEBFA"/>
    <rect x="36.4" y="28.8" width="20.2" height="4" rx="2" fill="#CDEBFA"/>
    <path d="M46.5 13C46.5 13 43.6 16.4 43.6 18.3A2.9 2.9 0 0 0 49.4 18.3C49.4 16.4 46.5 13 46.5 13Z" fill="#4AA3DF"/></g></svg>`;
  // Ícones dos botões Encher (torneira) e Esvaziar (ralo)
  const ICO_TORNEIRA = `<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#2A2433" stroke-width="1.5" stroke-linejoin="round">
    <rect x="10" y="5.6" width="2" height="3.2" fill="#C9D4DC"/><rect x="6.8" y="2.6" width="8.4" height="3.4" rx="1.7" fill="#E5484D"/>
    <path d="M2.5 8.6h12.3a4 4 0 0 1 4 4v1.6h-4.2v-1.4H2.5z" fill="#C9D4DC"/>
    <path d="M16.7 16.6s-2.1 2.4-2.1 3.7a2.1 2.1 0 0 0 4.2 0c0-1.3-2.1-3.7-2.1-3.7z" fill="#4AA3DF"/></g></svg>`;
  const ICO_RALO = `<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#2A2433" stroke-width="1.5">
    <circle cx="12" cy="12" r="9.6" fill="#C9D4DC"/><circle cx="12" cy="12" r="5.2" fill="#5B6A73"/>
    <path d="M8.4 12h7.2M12 8.4v7.2" stroke="#C9D4DC" stroke-width="1.6"/></g>
    <g fill="none" stroke="#4AA3DF" stroke-width="1.8" stroke-linecap="round"><path d="M4.6 9.6a8 8 0 0 1 4.6-4.7"/><path d="M19.4 14.4a8 8 0 0 1-4.6 4.7"/></g></svg>`;
  // Quadro da meta: alvo (em jogo) e visto (meta atingida)
  const ICO_ALVO = `<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#2A2433" stroke-width="1.4">
    <circle cx="12" cy="12" r="9.8" fill="#4AA3DF"/><circle cx="12" cy="12" r="6.2" fill="#fff"/><circle cx="12" cy="12" r="2.8" fill="#4AA3DF"/></g></svg>`;
  const ICO_OK = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.8" fill="#3FA66B" stroke="#2A2433" stroke-width="1.4"/>
    <path d="M7.4 12.4l3.1 3.1 6-6.6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  // Ícones das regras
  const ICO_R_ENCHER = `<svg viewBox="0 0 34 34"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round">
    <rect x="10.5" y="5" width="2.4" height="3" fill="#C9D4DC"/><rect x="7" y="2" width="9.4" height="3.6" rx="1.8" fill="#E5484D"/>
    <path d="M2.5 7.8h14a4.5 4.5 0 0 1 4.5 4.5v2h-5v-1.6H2.5z" fill="#C9D4DC"/>
    <path d="M8 21h21v8a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3z" fill="#EAF6FC"/>
    <path d="M9.6 25.4h17.8v3.4a1.6 1.6 0 0 1-1.6 1.6H11.2a1.6 1.6 0 0 1-1.6-1.6z" fill="#4AA3DF"/></g>
    <path d="M18.5 16v8.6" stroke="#4AA3DF" stroke-width="3.2" stroke-linecap="round"/></svg>`;
  const ICO_R_RALO = `<svg viewBox="0 0 34 34"><g stroke="#2A2433" stroke-width="1.6">
    <circle cx="17" cy="17" r="13" fill="#C9D4DC"/><circle cx="17" cy="17" r="7.4" fill="#5B6A73"/>
    <path d="M11.8 17h10.4M17 11.8v10.4" stroke="#C9D4DC" stroke-width="2"/></g>
    <g fill="none" stroke="#4AA3DF" stroke-width="2.4" stroke-linecap="round"><path d="M7.2 12.4a10.6 10.6 0 0 1 6.4-5.9"/><path d="M26.8 21.6a10.6 10.6 0 0 1-6.4 5.9"/></g></svg>`;
  const ICO_R_DESPEJAR = `<svg viewBox="0 0 34 34"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round">
    <path d="M6 4h11v12.5a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z" fill="#EAF6FC" transform="rotate(38 11.5 12)"/>
    <path d="M15 21h15v8a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3z" fill="#EAF6FC"/>
    <path d="M16.6 25.6h11.8v3.2a1.6 1.6 0 0 1-1.6 1.6h-8.6a1.6 1.6 0 0 1-1.6-1.6z" fill="#4AA3DF"/></g>
    <path d="M20.4 9.6c2.2 1.4 2.4 5.6 2.2 11" fill="none" stroke="#4AA3DF" stroke-width="3" stroke-linecap="round"/></svg>`;
  const ICO_R_META = `<svg viewBox="0 0 34 34"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round">
    <path d="M5 7h15v21a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="#EAF6FC"/>
    <path d="M6.6 16h11.8v11.4a1.8 1.8 0 0 1-1.8 1.8H8.4a1.8 1.8 0 0 1-1.8-1.8z" fill="#4AA3DF"/>
    <rect x="3.6" y="5.4" width="17.8" height="3.4" rx="1.7" fill="#CDEBFA"/><circle cx="25" cy="11" r="7" fill="#3FA66B"/></g>
    <path d="M21.8 11.2l2.3 2.3 4.2-4.6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const ICO_R_SEM = `<svg viewBox="0 0 34 34"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round">
    <rect x="8" y="5" width="9" height="3.6" rx="1.8" fill="#E5484D"/>
    <path d="M3.5 10.5h14a4.5 4.5 0 0 1 4.5 4.5v3h-5v-2.5H3.5z" fill="#C9D4DC"/>
    <circle cx="21" cy="26" r="5.5" fill="#C9D4DC"/><circle cx="21" cy="26" r="2.6" fill="#5B6A73"/></g>
    <path d="M6 6l22 22M28 6L6 28" stroke="#C23A2E" stroke-width="3" stroke-linecap="round"/></svg>`;
  // Seta "despeje aqui" sobre as jarras que podem receber água
  const ARROW = c => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 16'%3E%3Cpath d='M3 2.5h14l-7 11z' fill='%23${c}' stroke='%232A2433' stroke-width='1.6' stroke-linejoin='round'/%3E%3C/svg%3E") center/contain no-repeat`;

  const CSS = `
  .jr-wrap{--jr-glass:color-mix(in srgb,#CDEBFA 42%,var(--panel));--jr-glass-2:color-mix(in srgb,#CDEBFA 75%,var(--panel));--jr-shine:rgba(255,255,255,.85);width:100%;max-width:780px;display:flex;flex-direction:column;align-items:center;gap:18px}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .jr-wrap{--jr-glass:color-mix(in srgb,#A8D8F0 28%,var(--panel));--jr-glass-2:color-mix(in srgb,#A8D8F0 46%,var(--panel));--jr-shine:rgba(255,255,255,.42)}}
  :root[data-theme="dark"] .jr-wrap{--jr-glass:color-mix(in srgb,#A8D8F0 28%,var(--panel));--jr-glass-2:color-mix(in srgb,#A8D8F0 46%,var(--panel));--jr-shine:rgba(255,255,255,.42)}

  .jr-goal{display:flex;align-items:center;gap:12px;max-width:100%;padding:8px 20px 8px 8px;border-radius:18px;background:var(--panel);border:2px solid #4AA3DF;box-shadow:0 12px 26px -20px rgba(20,90,140,.8);transition:background .3s,border-color .3s}
  .jr-goal-ico{flex:none;width:46px;height:46px;border-radius:13px;background:var(--ico-bg);display:grid;place-items:center}
  .jr-goal-ico svg{width:34px;height:34px;display:block}
  .jr-goal-ico svg+svg,.jr-goal.met .jr-goal-ico svg:first-child{display:none}
  .jr-goal.met .jr-goal-ico svg+svg{display:block}
  .jr-goal-tx{min-width:0}
  .jr-goal-k{display:block;font:900 11px/1.3 "Nunito",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2)}
  .jr-goal-v{display:block;font:800 23px/1.3 "Baloo 2","Nunito",sans-serif;text-wrap:balance}
  .jr-l{display:inline-block;padding:0 8px;border-radius:9px;background:#4AA3DF;border:1.6px solid #2A2433;color:#fff;line-height:1.3;text-shadow:0 1px 0 rgba(0,0,0,.3);white-space:nowrap}
  .jr-goal.met{border-color:var(--ok);background:var(--ok-bg)}
  .jr-goal.met .jr-goal-k{color:var(--ok)}

  .jr-scene{position:relative;display:flex;justify-content:center;align-items:flex-start;gap:var(--jr-gap,18px);width:100%}
  .jr-counter{position:absolute;z-index:0;left:var(--jr-cl,0px);right:var(--jr-cl,0px);top:var(--jr-ct,0px);height:16px;border-radius:8px;background:#C8925A;border:1.6px solid #2A2433;box-shadow:inset 0 -5px 0 rgba(0,0,0,.16),inset 0 2px 0 rgba(255,255,255,.3)}
  .jr-pipe{position:absolute;z-index:0;left:var(--jr-cl,0px);right:var(--jr-cl,0px);top:14px;height:12px;border-radius:6px;background:#C9D4DC;border:1.6px solid #2A2433;box-shadow:inset 0 -3px 0 rgba(0,0,0,.14),inset 0 2px 0 rgba(255,255,255,.5)}
  .jr-scene.narrow .jr-pipe{top:21px}
  .jr-col{position:relative;z-index:1;flex:0 1 var(--jr-col,196px);min-width:0;display:flex;flex-direction:column;align-items:center}
  .jr-col.front{z-index:3}
  .jr-tapcell{width:100%;height:var(--jr-taph,56px);display:flex;flex-direction:column;align-items:center}
  .jr-nozzle{position:relative;z-index:1;width:14px;height:13px;margin-top:-2px;border:1.6px solid #2A2433;border-top:0;border-radius:0 0 5px 5px;background:#C9D4DC;box-shadow:inset -3px 0 0 rgba(0,0,0,.12)}

  .jr-btn{position:relative;z-index:2;height:40px;min-width:0;max-width:100%;overflow:hidden;padding:0 12px 0 9px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:12px;border:1.6px solid var(--line);background:var(--panel);color:var(--ink);font:800 14px/1 "Nunito",sans-serif;white-space:nowrap;cursor:pointer;box-shadow:0 2px 0 var(--line);-webkit-tap-highlight-color:transparent;transition:border-color .15s,opacity .15s,box-shadow .15s,transform .1s}
  .jr-btn:hover{border-color:var(--ink-2)}
  .jr-btn:active{transform:translateY(1px);box-shadow:0 1px 0 var(--line)}
  .jr-btn:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
  .jr-btn.off{opacity:.5}
  .jr-btn:disabled{opacity:.4;cursor:default;box-shadow:none;border-color:var(--line)}
  .jr-btn.hinted{border-color:var(--hint);box-shadow:0 0 0 3px var(--hint),0 0 16px var(--hint);opacity:1}
  .jr-btn.nope{animation:jr-shake .38s ease-in-out}
  .jr-bi{display:block;flex:none;width:20px;height:20px}
  .jr-bi svg{display:block;width:100%;height:100%}
  .jr-drain{margin-top:4px}
  .jr-drain.swirl .jr-bi{animation:jr-swirl .66s ease-in-out}
  .jr-scene.narrow .jr-btn{height:54px;flex-direction:column;gap:3px;padding:5px 7px 4px;font-size:12.5px}
  .jr-scene.narrow .jr-bi{width:22px;height:22px}

  .jr-cell{position:relative;display:block;width:100%;height:var(--jr-row,240px);padding:0;margin:0;border:0;border-radius:16px 16px 0 0;background:none;color:inherit;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .15s}
  .jr-cell:hover{background:color-mix(in srgb,var(--ink) 5%,transparent)}
  .jr-cell:disabled{cursor:default;background:none}
  .jr-cell:focus-visible{outline:3px solid var(--focus);outline-offset:-3px}
  .jr-cell.sel{background:color-mix(in srgb,var(--hint) 20%,transparent)}
  .jr-cell.dest:hover{background:color-mix(in srgb,#4AA3DF 16%,transparent)}
  .jr-cell::before{content:"";position:absolute;z-index:3;left:50%;top:calc(var(--jr-top,0px) - 25px);width:20px;height:16px;margin-left:-10px;background:${ARROW('4AA3DF')};opacity:0;transition:opacity .15s;pointer-events:none}
  .jr-cell.hint-to::before{background:${ARROW('F3B61F')}}
  .jr-cell.dest::before,.jr-cell.hint-to::before{opacity:1;animation:jr-bob .8s ease-in-out infinite alternate}
  .jr-jug{position:absolute;left:50%;bottom:0;display:block;pointer-events:none;transform-origin:var(--jr-ox,50%) 100%;transition:transform .24s cubic-bezier(.3,.7,.4,1)}
  .jr-jug svg{display:block;overflow:visible}
  .jr-cell.sel .jr-jug{transform:translateY(-14px)}
  .jr-cell .jr-jug.tilt{transform:translateY(var(--jr-lift,0px)) rotate(var(--jr-rot,0deg))}
  .jr-jug.nope{animation:jr-shake .38s ease-in-out}
  .jr-jug.hinted svg{filter:drop-shadow(0 0 3px var(--hint)) drop-shadow(0 0 8px var(--hint))}
  .jr-wrap.won .jr-col.ok .jr-jug{animation:jr-hop .34s ease-in-out 4 alternate}
  .jr-water{transition:transform .48s cubic-bezier(.45,.05,.35,1);transition-delay:var(--jr-wd,0s)}
  .jr-glass{fill:var(--jr-glass)} .jr-glass2{fill:var(--jr-glass-2)} .jr-shine{fill:var(--jr-shine)}
  .jr-tag text{font-family:"Baloo 2","Nunito",sans-serif;font-weight:800;fill:#2A2433}
  .jr-stream{position:absolute;z-index:2;left:50%;top:-5px;width:11px;margin-left:-5.5px;height:calc(var(--jr-sh,40px) + 5px);border:1.6px solid #2A2433;border-top:0;border-bottom:0;background:linear-gradient(90deg,#3A8FCB,#7CC8F0 45%,#4AA3DF);clip-path:inset(0 0 100% 0);pointer-events:none}
  .jr-stream.on{animation:jr-fall .62s ease-in-out}

  .jr-read{display:flex;align-items:baseline;justify-content:center;gap:4px;height:38px;margin-top:22px;font:800 28px/1.3 "Baloo 2","Nunito",sans-serif;font-variant-numeric:tabular-nums;white-space:nowrap;transition:color .2s}
  .jr-read span{font-size:15px;color:var(--ink-2)}
  .jr-col.ok .jr-read,.jr-col.ok .jr-read span{color:var(--ok)}
  .jr-scene.narrow .jr-read{font-size:24px}
  .jr-scene.narrow .jr-read span{font-size:13px}

  .jr-fx{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:4}
  .jr-fx path{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:100 100;stroke-dashoffset:100;animation:jr-flow var(--jr-fd,.7s) ease-in-out .06s forwards}
  .jr-fx .o{stroke:#2A2433;stroke-width:9}
  .jr-fx .w{stroke:#4AA3DF;stroke-width:5.4}
  .jr-splash{fill:#4AA3DF;stroke:#2A2433;stroke-width:1.2;opacity:0;transform-box:fill-box;transform-origin:center;animation:jr-splash .5s ease-out .2s forwards}

  @keyframes jr-flow{0%{stroke-dashoffset:100}35%,66%{stroke-dashoffset:0}100%{stroke-dashoffset:-100}}
  @keyframes jr-fall{0%{clip-path:inset(0 0 100% 0)}25%,72%{clip-path:inset(0 0 0 0)}100%{clip-path:inset(100% 0 0 0)}}
  @keyframes jr-shake{20%{translate:-5px 0}40%{translate:5px 0}60%{translate:-3px 0}80%{translate:3px 0}}
  @keyframes jr-hop{to{translate:0 -9px}}
  @keyframes jr-bob{to{translate:0 4px}}
  @keyframes jr-swirl{to{transform:rotate(-360deg)}}
  @keyframes jr-splash{0%{opacity:0;transform:scale(.3)}35%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.5)}}
  @media (max-width:560px){
    .jr-wrap{gap:14px}
    .jr-goal{gap:10px;padding:6px 14px 6px 6px}
    .jr-goal-ico{width:40px;height:40px}
    .jr-goal-ico svg{width:30px;height:30px}
    .jr-goal-v{font-size:19px}
  }
  `;

  const NOMES = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil', muito: 'Muito difícil' };
  const BLURBS = {
    facil: 'Duas jarras, torneira e ralo: o clássico para pegar o jeito.',
    medio: 'Jarras maiores e um caminho mais longo até a meta.',
    dificil: 'Sem torneira nem ralo: divida 14\u00A0L em duas partes iguais.',
    muito: 'Três jarras e duas medidas iguais ao mesmo tempo.',
  };
  const TILT = 13, LIFT = 14;   // inclinação (graus) e elevação (px) da jarra que despeja

  Jogos.register({
    id: 'jarras',
    name: "Jarras d'água",
    tagline: 'Meça a quantidade exata de água usando jarras sem marcação.',
    icon: ICON,
    css: CSS,
    metric: { label: 'Movimentos', unit: ['movimento', 'movimentos'] },
    levels: LEVELS.map(l => Object.assign({}, l, {
      name: NOMES[l.id], blurb: BLURBS[l.id],
      sub: `<span class="cnt">${capsTxt(l.caps)} · </span>mín. ${l.min}`,
    })),
    rules: lv => [
      ...(lv.tap ? [
        { key: 'encher', icon: ICO_R_ENCHER, html: '<b>Encher</b>: a torneira enche a jarra até a boca.' },
        { key: 'esvaziar', icon: ICO_R_RALO, html: '<b>Esvaziar</b>: toda a água da jarra vai para o ralo.' },
      ] : [
        { key: 'sem', icon: ICO_R_SEM, html: 'Aqui <b>não há torneira nem ralo</b>: a água só passa de uma jarra para outra.', novo: true },
      ]),
      { key: 'despejar', icon: ICO_R_DESPEJAR, html: '<b>Despejar</b>: a água passa até a jarra de destino encher ou a de origem ficar vazia.' },
      { key: 'meta', icon: ICO_R_META, html: `Meta: <b>${goalHTML(lv, false)}</b>. Cada ação conta um movimento.`, novo: lv.goal.type === 'duas' },
    ],
    how: lv => (lv.tap
      ? 'Toque em <b>Encher</b> ou <b>Esvaziar</b> em cada jarra. Para despejar, toque em uma jarra e depois na que vai receber a água.'
      : 'Para despejar, toque em uma jarra e depois na que vai receber a água.')
      + ' As jarras não têm marcas: a água só para quando uma jarra enche ou fica vazia.'
      + ` No teclado, ${lv.caps.length === 2 ? '<b>1</b> e <b>2</b>' : '<b>1</b>, <b>2</b> e <b>3</b>'} escolhem as jarras e <b>Esc</b> cancela.`,

    mount(ctx) {
      const { h } = ctx, lv = ctx.level, caps = lv.caps, n = caps.length, tap = lv.tap, uid = ++UID;
      let state = lv.start.slice(), moves = 0, sel = null, hint = null, done = false, lastMsg = null, L = null, fxTok = 0;
      const history = [];
      ctx.setMin(lv.min);

      // ----- montagem -----
      const goalEl = h('div', { class: 'jr-goal' },
        h('span', { class: 'jr-goal-ico', html: ICO_ALVO + ICO_OK }),
        h('span', { class: 'jr-goal-tx' }, h('span', { class: 'jr-goal-k' }, 'Meta'), h('span', { class: 'jr-goal-v', html: goalHTML(lv, true) })));
      const cols = caps.map((c, i) => {
        const o = {};
        o.stream = h('span', { class: 'jr-stream', 'aria-hidden': 'true' });
        o.jug = h('span', { class: 'jr-jug' });
        o.cell = h('button', { type: 'button', class: 'jr-cell', onclick: () => tapJug(i) }, o.stream, o.jug);
        o.num = h('b', {}, String(state[i]));
        const read = h('div', { class: 'jr-read', 'aria-hidden': 'true' }, o.num, h('span', {}, `/ ${c}\u00A0L`));
        if (tap) {
          o.fill = h('button', { type: 'button', class: 'jr-btn', 'aria-label': `Encher a jarra de ${c}\u00A0L na torneira`, onclick: () => fillJug(i) },
            h('span', { class: 'jr-bi', html: ICO_TORNEIRA }), 'Encher');
          o.drain = h('button', { type: 'button', class: 'jr-btn jr-drain', 'aria-label': `Esvaziar a jarra de ${c}\u00A0L no ralo`, onclick: () => emptyJug(i) },
            h('span', { class: 'jr-bi', html: ICO_RALO }), 'Esvaziar');
        }
        o.el = h('div', { class: 'jr-col' },
          tap ? h('div', { class: 'jr-tapcell' }, o.fill, h('span', { class: 'jr-nozzle', 'aria-hidden': 'true' })) : null,
          o.cell, read, tap ? o.drain : null);
        return o;
      });
      const fx = ctx.svg('svg', { class: 'jr-fx', 'aria-hidden': 'true' });
      const scene = h('div', { class: 'jr-scene' },
        h('div', { class: 'jr-counter', 'aria-hidden': 'true' }),
        tap ? h('div', { class: 'jr-pipe', 'aria-hidden': 'true' }) : null,
        cols.map(o => o.el), fx);
      const wrap = h('div', { class: 'jr-wrap' }, goalEl, scene);
      ctx.board.append(wrap);

      // ----- medidas: tudo em px, recalculado quando a largura muda -----
      // Todas as jarras têm a mesma largura e a altura proporcional à capacidade: 1 litro tem a mesma altura em todas.
      // layout() também roda uma vez no fim do mount: o ResizeObserver só avisa no próximo quadro desenhado.
      ctx.onResize(layout);
      function layout() {
        const W = wrap.clientWidth;
        if (!W) return;
        const gap = W < 460 ? 8 : 18;
        const colW = Math.floor(Math.min(n === 2 ? 220 : 196, (W - gap * (n - 1)) / n));
        const narrow = colW < 124;
        const bw = Math.round(clamp(colW * 0.58, 40, 108));
        const hw = Math.round(clamp(Math.min(bw * 0.24, (colW - bw) / 2 - 5), 7, 22));   // alça cabe na coluna
        const side = hw + 5;
        const maxIH = Math.round(clamp(W * 0.42, 140, 196));
        const maxC = Math.max(...caps);
        const jugs = caps.map(c => {
          const ih = Math.round(maxIH * c / maxC), y0 = 7, yFull = y0 + 5, yBot = yFull + ih, ob = yBot + 5;
          return { c, ih, bw, hw, y0, yFull, yBot, ob, H: ob + 1, W: bw + 2 * side, x0: side, x1: side + bw, r: Math.round(clamp(bw * 0.2, 7, 14)) };
        });
        const rowH = Math.max(...jugs.map(g => g.H)) + 30;
        const tapH = tap ? (narrow ? 70 : 56) : 0;
        L = { jugs, rowH, ct: tapH + rowH };
        const inset = Math.max(0, (W - (n * colW + (n - 1) * gap)) / 2 - 14);
        scene.classList.toggle('narrow', narrow);
        const vars = { '--jr-col': colW, '--jr-gap': gap, '--jr-row': rowH, '--jr-taph': tapH, '--jr-ct': L.ct, '--jr-cl': inset };
        for (const k in vars) scene.style.setProperty(k, vars[k] + 'px');
        stopFx();
        cols.forEach((o, i) => {
          const g = jugs[i];
          o.jug.innerHTML = jugSVG(i, g);
          o.jug.style.marginLeft = -g.W / 2 + 'px';
          o.water = o.jug.querySelector('.jr-water');
          o.cell.style.setProperty('--jr-top', rowH - g.H + 'px');
          o.cell.style.setProperty('--jr-sh', rowH - g.H + g.yFull + 'px');
        });
        render();
      }
      // Deslocamento vertical da água (a água é desenhada cheia e desce conforme falta líquido)
      const waterY = (i, a) => { const g = L.jugs[i]; return a <= 0 ? g.ih + 9 : r1((g.c - a) * g.ih / g.c); };

      function jugSVG(i, g) {
        const id = `jr${uid}-${i}`, gl = 3, { x0, x1, y0, yFull, yBot, ob, r, ih, bw, hw } = g;
        const xi0 = x0 + gl, xi1 = x1 - gl, wi = xi1 - xi0, ri = Math.max(3, r - gl);
        const body = `M${x0} ${y0}V${ob - r}A${r} ${r} 0 0 0 ${x0 + r} ${ob}H${x1 - r}A${r} ${r} 0 0 0 ${x1} ${ob - r}V${y0}Z`;
        const inner = `M${xi0} ${y0 - 3}V${yBot - ri}A${ri} ${ri} 0 0 0 ${xi0 + ri} ${yBot}H${xi1 - ri}A${ri} ${ri} 0 0 0 ${xi1} ${yBot - ri}V${y0 - 3}Z`;
        const hy1 = r1(yFull + Math.min(8, ih * 0.12)), hy2 = r1(hy1 + clamp(ih * 0.46, 16, 64));
        const t = r1(Math.max(4, hw * 0.42)), hx = r1(x1 + hw * 1.33), hxi = r1(hx - t * 1.5);
        const handle = `M${x1} ${hy1}C${hx} ${hy1} ${hx} ${hy2} ${x1} ${hy2}V${r1(hy2 - t)}C${hxi} ${r1(hy2 - t)} ${hxi} ${r1(hy1 + t)} ${x1} ${r1(hy1 + t)}Z`;
        const spout = `M${x0 + 3} ${y0 - 2}L${x0 - 8} ${y0 - 6}L${x0 - 1} ${y0 + 4}Z`;
        const fs = r1(clamp(bw * 0.19, 11, 15)), txt = `${g.c}\u00A0L`, tw = r1(txt.length * fs * 0.56 + 12), th = r1(fs + 8);
        const cx = r1((x0 + x1) / 2), ty = yFull + 6;
        const OLs = 'stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round"';
        return `<svg width="${g.W}" height="${g.H}" viewBox="0 0 ${g.W} ${g.H}" aria-hidden="true" focusable="false">`
          + `<defs><clipPath id="${id}"><path d="${inner}"/></clipPath></defs>`
          + `<path d="${handle}" class="jr-glass2" ${OLs}/>`
          + `<path d="${body}" class="jr-glass"/>`
          + `<g clip-path="url(#${id})"><g class="jr-water" style="transform:translateY(${waterY(i, state[i])}px)">`
          + `<rect x="${xi0}" y="${yFull}" width="${wi}" height="${ih + 8}" fill="#4AA3DF"/>`
          + `<rect x="${r1(xi1 - wi * 0.22)}" y="${yFull}" width="${r1(wi * 0.22)}" height="${ih + 8}" fill="#3A8FCB"/>`
          + `<rect x="${xi0}" y="${yFull}" width="${wi}" height="4.5" fill="#A5DCF7"/>`
          + `<path d="M${xi0} ${yFull}H${xi1}" stroke="#2A2433" stroke-width="1.4"/>`
          + `<circle cx="${r1(x0 + bw * 0.64)}" cy="${yFull + 13}" r="2.3" fill="#fff" opacity=".5"/>`
          + `<circle cx="${r1(x0 + bw * 0.5)}" cy="${yFull + 22}" r="1.6" fill="#fff" opacity=".45"/>`
          + `</g></g>`
          + `<rect class="jr-shine" x="${x0 + 5}" y="${yFull + 3}" width="3.5" height="${Math.max(0, ih - 8)}" rx="1.75"/>`
          + `<path d="${body}" fill="none" ${OLs}/>`
          + `<path d="${spout}" class="jr-glass2" ${OLs}/>`
          + `<rect x="${x0 - 3}" y="${y0 - 2.5}" width="${bw + 6}" height="5" rx="2.5" class="jr-glass2" ${OLs}/>`
          + `<g class="jr-tag"><rect x="${r1(cx - tw / 2)}" y="${ty}" width="${tw}" height="${th}" rx="5" fill="#FFFBEF" stroke="#2A2433" stroke-width="1.2"/>`
          + `<text x="${cx}" y="${r1(ty + th / 2 + 0.5)}" text-anchor="middle" dominant-baseline="central" font-size="${fs}">${txt}</text></g>`
          + `</svg>`;
      }

      // ----- desenho do estado -----
      const jugOk = i => { const g = lv.goal, a = state[i]; return g.type === 'exata' ? g.v[i] > 0 && a === g.v[i] : a === g.v; };
      function cellLabel(i) {
        const base = `Jarra de ${caps[i]}\u00A0L, com ${state[i]}\u00A0L`;
        if (sel === i) return `${base}, escolhida. Toque de novo para cancelar.`;
        if (sel != null) return `${base}. Despejar aqui a água da jarra de ${caps[sel]}\u00A0L.`;
        return `${base}. Escolher para despejar em outra jarra.`;
      }
      function render() {
        const hp = hint && hint.t === 'despejar' ? hint : null;
        cols.forEach((o, i) => {
          const a = state[i], c = caps[i];
          if (o.water) o.water.style.transform = `translateY(${waterY(i, a)}px)`;
          o.num.textContent = a;
          o.cell.classList.toggle('sel', sel === i);
          o.cell.classList.toggle('dest', sel != null && sel !== i && a < c && !(hp && hp.para === i));
          o.cell.classList.toggle('hint-to', !!hp && hp.para === i);
          o.cell.setAttribute('aria-pressed', String(sel === i));
          o.cell.setAttribute('aria-label', cellLabel(i));
          o.jug.classList.toggle('hinted', !!hp && hp.de === i);
          if (tap) {
            o.fill.classList.toggle('off', a >= c);
            o.drain.classList.toggle('off', a <= 0);
            o.fill.classList.toggle('hinted', !!hint && hint.t === 'encher' && hint.i === i);
            o.drain.classList.toggle('hinted', !!hint && hint.t === 'esvaziar' && hint.i === i);
          }
          o.el.classList.toggle('ok', jugOk(i));
        });
        goalEl.classList.toggle('met', isGoal(lv.goal, state));
        ctx.controls({ undo: history.length > 0 && !done, hint: !done });
        status();
      }
      function status() {
        if (ctx.status !== 'play') return;
        if (sel != null) return ctx.say(`Jarra de ${caps[sel]}\u00A0L escolhida`, 'Toque na jarra que vai receber a água. Tocar nela de novo cancela.');
        if (lastMsg) return ctx.say(lastMsg.t, lastMsg.d);
        ctx.say('Sua vez', tap
          ? 'Toque em Encher para pegar água na torneira. Para despejar, toque em uma jarra e depois em outra.'
          : 'Toque na jarra cheia e depois em outra para despejar a água.');
      }
      const seguir = () => (tap ? 'Encha, esvazie ou despeje até chegar à meta.' : 'Continue despejando até chegar à meta.');
      function moveMsg(m, a, b) {
        if (m.t === 'encher') return { t: `Você encheu a jarra de ${caps[m.i]}\u00A0L`, d: seguir() };
        if (m.t === 'esvaziar') return { t: `Você esvaziou a jarra de ${caps[m.i]}\u00A0L`, d: seguir() };
        const q = a[m.de] - b[m.de], cheia = b[m.para] === caps[m.para], vazia = b[m.de] === 0;
        const fim = cheia && vazia ? ` A de ${caps[m.para]}\u00A0L encheu e a de ${caps[m.de]}\u00A0L esvaziou.`
          : cheia ? ` A de ${caps[m.para]}\u00A0L encheu.` : vazia ? ` A de ${caps[m.de]}\u00A0L esvaziou.` : '';
        return { t: `Você despejou ${q}\u00A0L`, d: `Da jarra de ${caps[m.de]}\u00A0L para a de ${caps[m.para]}\u00A0L.${fim}` };
      }

      // ----- ações (as que não mudam nada só avisam e não contam movimento) -----
      const blocked = () => done || ctx.status !== 'play';
      function tapJug(i) {
        if (blocked()) return;
        if (sel == null) {
          if (state[i] <= 0) {
            ctx.retrigger(cols[i].jug);
            return ctx.warn('Essa jarra está vazia', tap ? 'Para despejar, escolha uma jarra com água ou encha esta na torneira.' : 'Escolha uma jarra com água para despejar.', 'despejar');
          }
          sel = i;
          return render();
        }
        if (sel === i) { sel = null; return render(); }
        if (state[i] >= caps[i]) {
          ctx.retrigger(cols[i].jug);
          return ctx.warn('Não cabe mais água', `A jarra de ${caps[i]}\u00A0L já está cheia. Escolha outra jarra${tap ? ' ou esvazie esta antes' : ''}.`, 'despejar');
        }
        doMove({ t: 'despejar', de: sel, para: i });
      }
      function fillJug(i) {
        if (blocked()) return;
        if (state[i] >= caps[i]) {
          ctx.retrigger(cols[i].fill);
          return ctx.warn('Essa jarra já está cheia', `A jarra de ${caps[i]}\u00A0L já tem ${caps[i]}\u00A0L. Despeje em outra jarra ou esvazie no ralo.`, 'encher');
        }
        doMove({ t: 'encher', i });
      }
      function emptyJug(i) {
        if (blocked()) return;
        if (state[i] <= 0) {
          ctx.retrigger(cols[i].drain);
          return ctx.warn('Essa jarra já está vazia', `Não há água na jarra de ${caps[i]}\u00A0L para jogar no ralo.`, 'esvaziar');
        }
        doMove({ t: 'esvaziar', i });
      }
      function doMove(m) {
        const prev = state, next = apply(caps, state, m);
        if (!next) return;
        stopFx();
        state = next;
        history.push({ prev, m });
        moves++;
        sel = null; hint = null;
        lastMsg = moveMsg(m, prev, next);
        const won = isGoal(lv.goal, state);
        if (won) done = true;               // trava novas jogadas enquanto a água termina de assentar
        const dur = animate(m);
        render();
        ctx.setMoves(moves);
        if (won) ctx.later(() => {
          wrap.classList.add('won');
          for (const o of cols) for (const b of [o.cell, o.fill, o.drain]) if (b) b.disabled = true;
          ctx.win();
        }, dur + 80);
      }

      // ----- animações (só enfeite: o estado já mudou; uma nova ação interrompe a anterior) -----
      const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
      function stopFx() {
        fxTok++;
        fx.replaceChildren();
        for (const o of cols) {
          o.jug.classList.remove('tilt');
          o.stream.classList.remove('on');
          if (o.drain) o.drain.classList.remove('swirl');
          if (o.water) o.water.style.setProperty('--jr-wd', '0s');
        }
      }
      function animate(m) {
        if (ctx.reduced || !L) return 0;
        const tok = ++fxTok;
        let dur;
        if (m.t === 'encher') {
          cols[m.i].water.style.setProperty('--jr-wd', '.12s');
          restart(cols[m.i].stream, 'on');
          dur = 620;
        } else if (m.t === 'esvaziar') {
          const deg = safeTilt(m.i, -1, 10);
          cols[m.i].water.style.setProperty('--jr-wd', '.16s');
          tilt(m.i, -1, deg, 0);
          stream(pathEmpty(m.i, deg), '.66s');
          restart(cols[m.i].drain, 'swirl');
          dur = 680;
        } else {
          const dir = m.para > m.de ? 1 : -1, deg = safeTilt(m.de, dir, TILT);
          cols[m.de].water.style.setProperty('--jr-wd', '.2s');
          cols[m.para].water.style.setProperty('--jr-wd', '.26s');
          tilt(m.de, dir, deg, LIFT);
          stream(pathPour(m.de, m.para, deg), '.72s');
          dur = 780;
        }
        ctx.later(() => { if (tok === fxTok) stopFx(); }, dur);
        return dur;
      }
      function tilt(i, dir, deg, lift) {
        const o = cols[i], g = L.jugs[i];
        cols.forEach(c => c.el.classList.toggle('front', c === o));
        o.jug.style.setProperty('--jr-ox', (dir > 0 ? g.x1 : g.x0) + 'px');
        o.jug.style.setProperty('--jr-rot', dir * deg + 'deg');
        o.jug.style.setProperty('--jr-lift', -lift + 'px');
        o.jug.classList.add('tilt');
      }
      function stream(p, dur) {
        fx.style.setProperty('--jr-fd', dur);
        const mk = cls => ctx.svg('path', { d: p.d, class: cls, pathLength: '100' });
        fx.replaceChildren(mk('o'), mk('w'));
        if (p.splash) fx.append(ctx.svg('ellipse', { class: 'jr-splash', cx: p.splash.x, cy: p.splash.y, rx: 10, ry: 3.2 }));
      }
      // Maior inclinação (até `want` graus) que mantém a jarra dentro do board: em telas estreitas
      // a primeira jarra fica colada à borda. O canto de cima anda altura × seno do ângulo para o lado.
      function safeTilt(i, dir, want) {
        const g = L.jugs[i], br = ctx.board.getBoundingClientRect(), cr = cols[i].cell.getBoundingClientRect();
        const left = cr.left - br.left + (cr.width - g.W) / 2;
        const room = dir < 0 ? left : ctx.board.clientWidth - (left + g.W);
        return Math.min(want, Math.asin(clamp((room - 2) / g.H, 0, 1)) * 180 / Math.PI);
      }
      // Posição (sem transformações) da jarra i nas coordenadas da cena
      function jugBox(i) {
        const sr = scene.getBoundingClientRect(), cr = cols[i].cell.getBoundingClientRect(), g = L.jugs[i];
        return { x: cr.left - sr.left + (cr.width - g.W) / 2, y: cr.top - sr.top + cr.height - g.H, g };
      }
      // Canto da boca do lado `dir` depois de a jarra girar `deg` graus em torno do canto de baixo
      function corner(i, dir, deg, lift) {
        const b = jugBox(i), g = b.g, a = dir * deg * Math.PI / 180, hgt = g.H - g.y0;
        const px = b.x + (dir > 0 ? g.x1 : g.x0), py = b.y + g.H;
        return { x: px + hgt * Math.sin(a), y: py - hgt * Math.cos(a) - lift };
      }
      // Jato da boca da jarra que despeja até a boca da outra, passando por cima das jarras do meio
      function pathPour(a, b, deg) {
        const dir = b > a ? 1 : -1, S = corner(a, dir, deg, LIFT), B = jugBox(b);
        const E = { x: B.x + (B.g.x0 + B.g.x1) / 2, y: B.y + B.g.y0 };
        let top = Math.min(S.y - 12, E.y - 24);
        for (let k = Math.min(a, b) + 1; k < Math.max(a, b); k++) { const M = jugBox(k); top = Math.min(top, M.y + M.g.y0 - 24); }
        const c1 = S.x + dir * Math.max(18, Math.abs(E.x - S.x) * 0.45);
        return { d: `M${r1(S.x)} ${r1(S.y)}C${r1(c1)} ${r1(top)} ${r1(E.x)} ${r1(top + 6)} ${r1(E.x)} ${r1(E.y)}` };
      }
      // Jato da boca até o balcão; o respingo não passa da borda esquerda do board
      function pathEmpty(i, deg) {
        const off = scene.getBoundingClientRect().left - ctx.board.getBoundingClientRect().left;
        const S = corner(i, -1, deg, 0), x = Math.max(S.x - 9, 18 - off), ground = L.ct + 1;
        return { d: `M${r1(S.x)} ${r1(S.y)}C${r1(S.x - 8)} ${r1(S.y - 5)} ${r1(x)} ${r1(S.y + 6)} ${r1(x)} ${r1(ground)}`, splash: { x: r1(x), y: r1(ground) } };
      }

      ctx.listen(window, 'keydown', e => {
        if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
        if (e.target.closest && e.target.closest('input, textarea, select')) return;
        const k = parseInt(e.key, 10);
        if (k >= 1 && k <= n) { e.preventDefault(); tapJug(k - 1); }
        else if (e.key === 'Escape' && sel != null) { sel = null; render(); }
      });

      layout();      // mede já (o board está no documento); se ainda não tiver largura, o onResize refaz depois
      if (!L) render();

      const hintText = m => (m.t === 'encher' ? `Encha a jarra de ${caps[m.i]}\u00A0L na torneira.`
        : m.t === 'esvaziar' ? `Esvazie a jarra de ${caps[m.i]}\u00A0L no ralo.`
        : `Despeje a jarra de ${caps[m.de]}\u00A0L na de ${caps[m.para]}\u00A0L.`);
      return {
        onHint() {
          if (blocked()) return;
          const r = solve(lv, state);
          if (!r) return ctx.hint('Dica', 'Daqui não dá para chegar à meta. Desfaça alguns movimentos ou recomece.');
          if (!r.path.length) return;
          const m = r.path[0];
          hint = m;
          if (sel != null && !(m.t === 'despejar' && m.de === sel)) sel = null;
          render();
          ctx.hint('Dica', `${hintText(m)} Daqui, ${falta(r.path.length)}.`);
        },
        onUndo() {
          if (done) return;
          const last = history.pop();
          if (!last) return;
          stopFx();
          state = last.prev;
          moves--;
          sel = null; hint = null;
          lastMsg = { t: 'Movimento desfeito', d: seguir() };
          render();
          ctx.setMoves(moves);
        },
      };
    },
  });
})();
