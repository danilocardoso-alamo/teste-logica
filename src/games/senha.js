/* Senha secreta — descubra a sequência de cores escondida no cofre (estilo Mastermind) */
(() => {
  // ---------- lógica pura (testável no Node) ----------
  // Uma senha é uma lista de índices de cor (0 = primeira cor da paleta do nível).
  const LEVELS = [
    { id: 'facil', name: 'Fácil', pegs: 3, colors: 4, repeat: false, tries: 8, intro: 'Três cores entre quatro, sem repetir' },
    { id: 'medio', name: 'Médio', pegs: 4, colors: 6, repeat: false, tries: 10, intro: 'Quatro cores entre seis, ainda sem repetir' },
    { id: 'dificil', name: 'Difícil', pegs: 4, colors: 6, repeat: true, tries: 10, intro: 'As mesmas seis cores, mas agora elas podem se repetir' },
    { id: 'muito', name: 'Muito difícil', pegs: 5, colors: 8, repeat: true, tries: 12, intro: 'Cinco cores entre oito, com repetição' },
  ];

  // Resposta clássica, correta com cores repetidas: "no lugar" conta as posições iguais; "fora do lugar"
  // soma, cor a cor, o mínimo entre o que sobrou na senha e o que sobrou na tentativa
  // (cada pino da senha só é contado uma vez). Devolve no lugar * 8 + fora do lugar.
  const cS = new Int8Array(16), cG = new Int8Array(16);
  function scoreKey(secret, guess) {
    cS.fill(0); cG.fill(0);
    let black = 0, white = 0;
    for (let i = 0; i < secret.length; i++) {
      const a = secret[i], b = guess[i];
      if (a === b) black++; else { cS[a]++; cG[b]++; }
    }
    for (let c = 0; c < 16; c++) white += cS[c] < cG[c] ? cS[c] : cG[c];
    return black * 8 + white;
  }
  const score = (secret, guess) => { const k = scoreKey(secret, guess); return { black: k >> 3, white: k & 7 }; };

  // Sorteia a senha com o gerador do nível (mesma semente, mesma senha).
  function generate(rng, lv) {
    if (lv.repeat) return Array.from({ length: lv.pegs }, () => rng.int(lv.colors));
    return rng.shuffle(Array.from({ length: lv.colors }, (_, i) => i)).slice(0, lv.pegs);
  }
  // Quantas senhas o nível permite.
  function total(lv) {
    let n = 1;
    for (let i = 0; i < lv.pegs; i++) n *= lv.repeat ? lv.colors : lv.colors - i;
    return n;
  }
  // Todas as senhas do nível, em ordem.
  function allCodes(lv) {
    const out = [], cur = [], used = [];
    (function rec(i) {
      if (i === lv.pegs) { out.push(cur.slice()); return; }
      for (let c = 0; c < lv.colors; c++) {
        if (!lv.repeat && used[c]) continue;
        cur[i] = c; used[c] = true;
        rec(i + 1);
        used[c] = false;
      }
    })(0);
    return out;
  }
  // Senhas que dariam exatamente as respostas já recebidas. history: [{ guess, black, white }]
  function candidates(codes, history) {
    const keys = history.map(t => t.black * 8 + t.white);
    return codes.filter(c => history.every((t, i) => scoreKey(c, t.guess) === keys[i]));
  }
  // Entre as senhas ainda possíveis, escolhe a que melhor divide as outras (menor pior caso, depois
  // menor média). Com muitas possibilidades, avalia amostras espaçadas (determinísticas) para ser rápido.
  function pickGuess(cands) {
    if (cands.length <= 2) return cands[0] || null;
    const spread = (arr, k) => (arr.length <= k ? arr : Array.from({ length: k }, (_, i) => arr[Math.floor((i + 0.5) * arr.length / k)]));
    const small = cands.length <= 400;
    const G = small ? cands : spread(cands, 120), T = small ? cands : spread(cands, 1500);
    const counts = new Int32Array(64);
    let best = null, bw = Infinity, bs = Infinity;
    for (const g of G) {
      counts.fill(0);
      for (const t of T) counts[scoreKey(t, g)]++;
      let worst = 0, sq = 0;
      for (let i = 0; i < 64; i++) { const c = counts[i]; if (c > worst) worst = c; sq += c * c; }
      if (worst < bw || (worst === bw && sq < bs)) { best = g; bw = worst; bs = sq; }
    }
    return best;
  }
  // Resposta em texto (acessível e sem depender de ver os pinos).
  function fbText(black, white, pegs) {
    if (black === pegs) return `${black} no lugar: senha certa`;
    if (!black && !white) return 'nenhuma cor está na senha';
    return `${black} no lugar, ${white} fora do lugar`;
  }
  const fmtN = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const lista = a => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} e ${a[a.length - 1]}`);
  // Cor do símbolo dentro do pino: branco ou tinta, o que contrastar mais com o fundo.
  function lum(hex) {
    const lin = i => { const v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * lin(1) + 0.7152 * lin(3) + 0.0722 * lin(5);
  }
  function symColor(hex) {
    const L = lum(hex);
    return 1.05 / (L + 0.05) >= (L + 0.05) / (lum('#2A2433') + 0.05) ? '#FFFFFF' : '#2A2433';
  }
  const logic = { LEVELS, scoreKey, score, generate, total, allCodes, candidates, pickGuess, fbText, fmtN, lista, symColor };
  if (typeof module !== 'undefined' && module.exports) { module.exports = logic; return; }

  // ---------- interface ----------
  const STEP = 90, POP = 260;          // revelação dos pinos da resposta (ms)
  const CODES = {};                     // todas as senhas de cada nível (para a dica), calculadas uma vez
  const codesFor = lv => CODES[lv.id] || (CODES[lv.id] = allCodes(lv));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const noFocus = e => e.preventDefault();   // clique/toque não prende o foco: Enter continua testando a senha

  // Símbolos das cores desenhados em SVG (mesmo traço em qualquer aparelho); símbolo desconhecido vira texto.
  const SYM = {
    '●': '<circle cx="10" cy="10" r="6.4"/>',
    '▲': '<path d="M10 3.4 17.2 16.1H2.8z"/>',
    '■': '<rect x="4.2" y="4.2" width="11.6" height="11.6" rx="1.4"/>',
    '◆': '<path d="M10 2.4 17.6 10 10 17.6 2.4 10z"/>',
    '★': '<path d="M10 2.5 12.06 7.87 17.8 8.17 13.33 11.78 14.82 17.33 10 14.2 5.18 17.33 6.67 11.78 2.2 8.17 7.94 7.87z"/>',
    '✚': '<path d="M7.7 3h4.6v4.7H17v4.6h-4.7V17H7.7v-4.7H3V7.7h4.7z"/>',
    '♥': '<path d="M10 16.9C4.7 13 2.9 10.3 2.9 7.6c0-2.3 1.7-4 3.9-4 1.5 0 2.6.8 3.2 2 .6-1.2 1.7-2 3.2-2 2.2 0 3.9 1.7 3.9 4 0 2.7-1.8 5.4-7.1 9.3z"/>',
    '⬟': '<path d="M10 2.9 17.51 8.36 14.64 17.19 5.36 17.19 2.49 8.36z"/>',
  };
  const symSvg = s => `<svg viewBox="0 0 20 20" aria-hidden="true">${SYM[s] || `<text x="10" y="15" text-anchor="middle" font-size="14" font-weight="900" stroke="none">${s}</text>`}</svg>`;

  const ICON = `<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round">
    <path d="M17 28V19a15 15 0 0 1 30 0v9h-6.5v-9a8.5 8.5 0 0 0-17 0v9z" fill="#C9D3DA"/>
    <rect x="6" y="26" width="52" height="32" rx="8" fill="#56697A"/>
    <rect x="9.5" y="30.5" width="45" height="15" rx="7.5" fill="#2A2433"/>
    <circle cx="17" cy="38" r="4.3" fill="#E5484D"/><circle cx="27" cy="38" r="4.3" fill="#F2C230"/>
    <circle cx="37" cy="38" r="4.3" fill="#3FA66B"/><circle cx="47" cy="38" r="4.3" fill="#3E7BD9"/>
    <circle cx="24.5" cy="51.5" r="2.4" fill="#2A2433"/><circle cx="32" cy="51.5" r="2.4" fill="#2A2433"/><circle cx="39.5" cy="51.5" r="2.4" fill="#FFFFFF"/></g></svg>`;
  const ICO_SENHA = rep => `<svg viewBox="0 0 34 34"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round"><rect x="1.5" y="9.5" width="31" height="15" rx="7.5" fill="#56697A"/>
    <circle cx="8" cy="17" r="3.4" fill="#E5484D"/><circle cx="17" cy="17" r="3.4" fill="${rep ? '#E5484D' : '#F2C230'}"/><circle cx="26" cy="17" r="3.4" fill="#3E7BD9"/></g></svg>`;
  const ICO_RESP = `<svg viewBox="0 0 34 34"><circle cx="10.5" cy="17" r="6.2" fill="currentColor"/><circle cx="23.5" cy="17" r="5.4" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>`;
  const ICO_LIMITE = `<svg viewBox="0 0 34 34"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round"><path d="M10 16v-4a7 7 0 0 1 14 0v4h-3.6v-4a3.4 3.4 0 0 0-6.8 0v4z" fill="#C9D3DA"/><rect x="6" y="15" width="22" height="15" rx="4" fill="#F2C230"/><circle cx="17" cy="21.2" r="2.1" fill="#2A2433"/><path d="M17 22v3.4" stroke-width="2.4" stroke-linecap="round"/></g></svg>`;
  const LOCK = `<svg viewBox="0 0 24 28" aria-hidden="true"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round"><path class="sn-shackle" d="M5.5 13V8.5a6.5 6.5 0 0 1 13 0V13h-3.2V8.5a3.3 3.3 0 0 0-6.6 0V13z" fill="#C9D3DA"/><rect x="2" y="12" width="20" height="14" rx="3.5" fill="#F2C230"/><circle cx="12" cy="17.6" r="2" fill="#2A2433"/><path d="M12 18.4v3.4" stroke-width="2.2" stroke-linecap="round"/></g></svg>`;

  const CSS = `
  .sn-wrap{--sn-p:4;--sn-s:40px;--sn-s2:30px;--sn-cw:48px;--sn-k:12px;--sn-kg:4px;--sn-kc:2;--sn-cg:12px;--sn-vp:12px;--sn-rp:6px;--sn-rx:10px;--sn-hc:52px;--sn-ho:38px;--sn-pb:50px;--sn-pg:10px;--sn-pc:6;--sn-tpl:26px 192px 28px;--sn-w:420px;width:100%;display:flex;flex-direction:column;align-items:center;gap:16px}
  .sn-wrap.sn-nar{gap:12px}
  .sn-sr,.sn-wrap:not(.sn-wide) .sn-fbt{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
  .sn-vault{width:min(100%,var(--sn-w));padding:var(--sn-vp);background:#56697A;border:1.6px solid #2A2433;border-radius:22px;box-shadow:inset 0 -5px 0 rgba(0,0,0,.2),inset 0 3px 0 rgba(255,255,255,.16),0 16px 28px -22px rgba(15,40,35,.8)}
  .sn-nar .sn-vault{border-radius:16px}
  .sn-band,.sn-row{display:grid;grid-template-columns:var(--sn-tpl);column-gap:var(--sn-cg);align-items:center}
  .sn-band{--d:var(--sn-s);position:relative;margin-bottom:calc(var(--sn-vp) - 2px);padding:4px calc(var(--sn-rp) + var(--sn-rx) + 3.2px);border-radius:14px;transition:background .3s}
  .sn-band.sn-open{background:color-mix(in srgb,#3FA66B 55%,transparent)}
  .sn-band.sn-shown{background:color-mix(in srgb,#E5484D 40%,transparent)}
  .sn-slots{display:grid;grid-template-columns:repeat(var(--sn-p),var(--sn-cw));align-items:center;justify-items:center}
  .sn-cell,.sn-slot{width:var(--sn-cw);display:grid;place-items:center;position:relative}
  .sn-cover{width:var(--sn-s);height:var(--sn-s);display:grid;place-items:center;border-radius:50%;background:#2A2433;border:1.6px solid #2A2433;box-shadow:inset 0 3px 0 rgba(255,255,255,.1);color:#B9C8D3;font:800 calc(var(--sn-s) * .5)/1 "Baloo 2","Nunito",sans-serif}
  .sn-lock{grid-column:3;justify-self:center;width:24px;height:28px}
  .sn-nar .sn-lock{width:20px;height:23px}
  .sn-lock svg{display:block;width:100%;height:100%;overflow:visible}
  .sn-shackle{transition:transform .35s cubic-bezier(.3,1.5,.5,1)}
  .sn-open .sn-shackle{transform:translateY(-4px)}
  .sn-band-lbl{display:none;grid-column:4;font:900 12px/1.15 "Nunito",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#EEF3F6}
  .sn-wide .sn-band-lbl{display:block}
  .sn-rows{list-style:none;margin:0;padding:var(--sn-rp);display:flex;flex-direction:column-reverse;gap:3px;background:var(--panel);border:1.6px solid #2A2433;border-radius:14px}
  .sn-nar .sn-rows{gap:2px;border-radius:11px}
  .sn-row{--d:var(--sn-s2);min-height:var(--sn-ho);padding:0 var(--sn-rx);border:1.6px solid transparent;border-radius:10px;transition:min-height .2s,background .2s,border-color .2s}
  .sn-row.sn-big{--d:var(--sn-s);min-height:var(--sn-hc)}
  .sn-cur{background:color-mix(in srgb,var(--accent) 11%,var(--panel));border-color:var(--accent)}
  .sn-row.sn-win{background:var(--ok-bg);border-color:var(--ok)}
  .sn-num{font:800 15px/1 "Baloo 2","Nunito",sans-serif;color:var(--ink-2);text-align:center;font-variant-numeric:tabular-nums}
  .sn-nar .sn-num{font-size:12px}
  .sn-cur .sn-num{color:var(--accent);font-size:18px}
  .sn-nar .sn-cur .sn-num{font-size:14px}
  .sn-fut .sn-num{opacity:.45}
  .sn-peg{width:var(--d);height:var(--d);display:grid;place-items:center;border-radius:50%;background:var(--c);border:1.6px solid #2A2433;box-shadow:inset 0 -3px 0 rgba(0,0,0,.18),inset 0 2px 0 rgba(255,255,255,.32)}
  .sn-peg svg{width:54%;height:54%;display:block;overflow:visible;fill:var(--sy);stroke:var(--sy);stroke-width:1.1;stroke-linejoin:round}
  .sn-hole{width:calc(var(--d) * .42);height:calc(var(--d) * .42);border-radius:50%;background:color-mix(in srgb,var(--ink) 13%,var(--panel));box-shadow:inset 0 1.5px 0 rgba(0,0,0,.2)}
  .sn-cur .sn-hole{width:var(--d);height:var(--d);background:color-mix(in srgb,var(--ink) 5%,var(--panel));border:2px dashed color-mix(in srgb,var(--ink) 32%,transparent);box-shadow:none}
  .sn-cur .sn-next .sn-hole{border:2.5px solid var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--panel));animation:sn-breathe 1.6s ease-in-out infinite}
  button.sn-slot{height:calc(var(--sn-hc) - 4px);padding:0;border:0;border-radius:12px;background:none;color:inherit;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
  button.sn-slot:focus-visible{outline:3px solid var(--focus);outline-offset:-3px}
  .sn-x{position:absolute;top:calc(50% - var(--d) / 2 - 5px);left:calc(50% + var(--d) / 2 - 12px);width:17px;height:17px;display:none;place-items:center;border-radius:50%;background:var(--panel);border:1.6px solid #2A2433;color:var(--ink);font:900 13px/1 "Nunito",sans-serif}
  @media (hover:hover){button.sn-filled:hover .sn-x{display:grid}}
  button.sn-filled:focus-visible .sn-x{display:grid}
  .sn-hinted .sn-peg{box-shadow:0 0 0 3px var(--hint),inset 0 -3px 0 rgba(0,0,0,.18),inset 0 2px 0 rgba(255,255,255,.32)}
  .sn-pop{animation:sn-pop .2s cubic-bezier(.3,1.5,.5,1)}
  .sn-fb{display:grid;grid-template-columns:repeat(var(--sn-kc),var(--sn-k));gap:var(--sn-kg);justify-content:center;align-content:center}
  .sn-kp{width:var(--sn-k);height:var(--sn-k);border-radius:50%}
  .sn-kp.sn-hit{background:var(--ink);border:1.6px solid var(--ink)}
  .sn-kp.sn-near{background:var(--panel);border:2px solid var(--ink)}
  .sn-kp.sn-none{background:color-mix(in srgb,var(--ink) 16%,transparent);transform:scale(.42)}
  .sn-anim .sn-hit,.sn-anim .sn-near{animation:sn-pop .26s cubic-bezier(.3,1.6,.5,1) both;animation-delay:calc(var(--i) * ${STEP}ms)}
  .sn-fbt{min-width:0;font:700 13px/1.2 "Nunito",sans-serif;color:var(--ink-2)}
  .sn-win .sn-fbt{color:var(--ok);font-weight:900}
  .sn-reveal{animation:sn-pop .32s cubic-bezier(.3,1.5,.5,1) both;animation-delay:calc(var(--i) * 110ms)}
  .sn-pal{display:grid;grid-template-columns:repeat(var(--sn-pc),var(--sn-pb));gap:var(--sn-pg);justify-content:center}
  .sn-color{--d:calc(var(--sn-pb) - 6px);position:relative;width:var(--sn-pb);height:var(--sn-pb);padding:0;border:0;border-radius:50%;background:none;display:grid;place-items:center;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .sn-color .sn-peg{transition:transform .15s,opacity .15s}
  @media (hover:hover){.sn-color:hover .sn-peg{transform:translateY(-2px)}}
  .sn-color:active .sn-peg{transform:scale(.93)}
  .sn-color:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
  .sn-color.sn-used .sn-peg{opacity:.3}
  .sn-key{position:absolute;right:-3px;bottom:-3px;min-width:19px;height:19px;padding:0 4px;border-radius:10px;background:var(--panel);border:1.6px solid #2A2433;color:var(--ink);font:800 12px/16px "Baloo 2","Nunito",sans-serif;text-align:center}
  @media (hover:none){.sn-key{display:none}}
  .sn-nope{animation:sn-shake .38s ease-in-out}
  @keyframes sn-shake{20%{translate:-5px 0}40%{translate:5px 0}60%{translate:-3px 0}80%{translate:3px 0}}
  @keyframes sn-pop{0%{transform:scale(0)}100%{transform:scale(1)}}
  @keyframes sn-breathe{50%{box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 24%,transparent)}}
  `;

  Jogos.register({
    id: 'senha',
    name: 'Senha secreta',
    tagline: 'Descubra a sequência de cores escondida no cofre.',
    icon: ICON,
    css: CSS,
    generated: true,
    freshRestart: true, // recomeçar sorteia outra senha (quem perdeu já viu a anterior)
    metric: { label: 'Tentativas', unit: ['tentativa', 'tentativas'] },
    levels: LEVELS.map(l => Object.assign({}, l, {
      sub: `<span class="cnt">${l.pegs} posições · </span>${l.colors} cores${l.repeat ? ' · com repetição' : ''}`,
      blurb: `${l.intro}: ${fmtN(total(l))} senhas possíveis.`,
    })),
    rules: lv => [
      { key: 'senha', icon: ICO_SENHA(lv.repeat), novo: lv.id === 'dificil',
        html: `A senha tem <b>${lv.pegs} cores em sequência</b>, escolhidas entre ${lv.colors}` + (lv.repeat ? '. Uma cor <b>pode aparecer mais de uma vez</b>.' : ', <b>sem repetir</b> nenhuma.') },
      { key: 'resposta', icon: ICO_RESP, html: 'Cada <b>pino cheio</b> é uma cor no lugar certo; cada <b>pino vazado</b>, uma cor da senha que está em outro lugar. Os pinos <b>não dizem quais</b> posições são.' },
      { key: 'limite', icon: ICO_LIMITE, html: `Abra o cofre em até <b>${lv.tries} tentativas</b>.` },
    ],
    how: lv => `Toque numa cor para colocá-la no espaço destacado da linha atual. Toque num espaço preenchido para esvaziá-lo, ou num vazio para escolher onde entra a próxima cor. Com a linha completa, toque em <b>Testar senha</b>. No teclado: <b>1</b> a <b>${lv.colors}</b> escolhem as cores, <b>Backspace</b> apaga e <b>Enter</b> testa.`,

    mount(ctx) {
      const { h } = ctx, lv = ctx.level, P = lv.pegs, C = lv.colors, T = lv.tries;
      const plural = ctx.core.plural;
      const COL = ctx.PIECES.slice(0, C);
      const nome = ci => COL[ci].id;
      const secret = generate(ctx.rng, lv);
      const history = [];                  // [{ guess, black, white }]
      let cur = Array(P).fill(null);       // linha em montagem (índices de cor ou null)
      let target = null;                   // espaço vazio escolhido para a próxima cor
      let hinted = false, anim = false, placed = -1, ended = null;
      const bigRow = () => (ended ? history.length - 1 : history.length);
      const nextSlot = () => (target != null && cur[target] == null ? target : cur.indexOf(null));
      ctx.setMin(T, 'Tentativas permitidas');
      ctx.setMoves(0);

      const pegEl = (ci, cls) => h('span', { class: 'sn-peg' + (cls ? ' ' + cls : ''), style: { '--c': COL[ci].fill, '--sy': symColor(COL[ci].fill) }, html: symSvg(COL[ci].sym) });

      // Cofre: faixa da senha escondida + linhas de tentativas (a 1ª embaixo, perto da paleta)
      const wrap = h('div', { class: 'sn-wrap', style: { '--sn-p': P } });
      const cells = Array.from({ length: P }, () => h('span', { class: 'sn-cell' }, h('span', { class: 'sn-cover', 'aria-hidden': 'true' }, '?')));
      const bandSr = h('span', { class: 'sn-sr' }, 'Senha secreta, ainda escondida.');
      const bandLbl = h('span', { class: 'sn-band-lbl', 'aria-hidden': 'true' }, 'Senha secreta');
      const band = h('div', { class: 'sn-band' }, bandSr, h('span', { class: 'sn-num' }), h('span', { class: 'sn-slots' }, cells), h('span', { class: 'sn-lock', html: LOCK }), bandLbl);
      const list = h('ol', { class: 'sn-rows', 'aria-label': 'Tentativas' });
      const rows = Array.from({ length: T }, (_, r) => {
        const o = {
          li: h('li', { class: 'sn-row' }), sr: h('span', { class: 'sn-sr' }), num: h('span', { class: 'sn-num', 'aria-hidden': 'true' }, String(r + 1)),
          slots: h('span', { class: 'sn-slots' }), fb: h('span', { class: 'sn-fb', 'aria-hidden': 'true' }), txt: h('span', { class: 'sn-fbt' }), btns: null,
        };
        o.li.append(o.sr, o.num, o.slots, o.fb, o.txt);
        list.append(o.li);
        return o;
      });
      const pal = h('div', { class: 'sn-pal', role: 'group', 'aria-label': 'Cores' }, COL.map((p, ci) => h('button', {
        type: 'button', class: 'sn-color', 'aria-keyshortcuts': String(ci + 1), onmousedown: noFocus, onclick: () => pick(ci),
      }, pegEl(ci), h('span', { class: 'sn-key', 'aria-hidden': 'true' }, String(ci + 1)))));
      const palBtns = [...pal.children];
      wrap.append(h('div', { class: 'sn-vault' }, band, list), pal);
      ctx.board.append(wrap);

      // Tamanhos: cabem 5 posições + resposta numa linha a partir de 340px de tela.
      function layout(w) {
        if (!w) return;
        const cs = getComputedStyle(ctx.board);
        const avail = Math.max(240, w - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0));
        const nar = avail < 440;
        const VP = nar ? 4 : 12, RP = nar ? 3 : 6, RX = nar ? 3 : 10, CG = nar ? 5 : 12, NUM = nar ? 14 : 26, TXT = 120;
        const frame = 2 * (VP + 1.6) + 2 * (1.6 + RP) + 2 * (1.6 + RX);
        const inner = Math.min(avail, 660) - frame - 0.5;
        const kc = Math.ceil(P / 2);
        const dim = s => {
          const g = Math.max(5, Math.round(s * 0.2)), k = Math.max(8, Math.min(14, Math.round(s * 0.3))), kg = s >= 38 ? 4 : 3;
          const fbW = kc * k + (kc - 1) * kg;
          return { s, cw: s + g, k, kg, fbW, base: NUM + 2 * CG + P * (s + g) + fbW };
        };
        // Maior pino que cabe; se der, com o texto da resposta visível (aceitando pinos de até 38px).
        const fit = room => { let d = dim(44); for (let s = 44; s > 20 && d.base > room; s--) d = dim(s - 1); return d; };
        let d = fit(inner - CG - TXT);
        const wide = !nar && d.s >= 38 && d.base + CG + TXT <= inner;
        if (!wide) d = fit(inner);
        const textW = wide ? Math.min(210, inner - d.base - CG) : 0;
        const s2 = Math.round(d.s * 0.76);
        const PG = nar ? 6 : 10;
        let pc = C, pb = Math.floor((avail - (C - 1) * PG) / C);
        if (pb < 42) { pc = Math.ceil(C / 2); pb = Math.floor((avail - (pc - 1) * PG) / pc); }
        pb = Math.min(pb, 54);
        const px = v => v + 'px';
        const vars = {
          '--sn-s': px(d.s), '--sn-s2': px(s2), '--sn-cw': px(d.cw), '--sn-k': px(d.k), '--sn-kg': px(d.kg), '--sn-kc': kc,
          '--sn-cg': px(CG), '--sn-vp': px(VP), '--sn-rp': px(RP), '--sn-rx': px(RX),
          '--sn-hc': px(Math.max(d.s + 12, 44)), '--sn-ho': px(Math.max(s2, 2 * d.k + d.kg) + 6),
          '--sn-tpl': `${NUM}px ${P * d.cw}px ${d.fbW}px${wide ? ' minmax(0,1fr)' : ''}`,
          '--sn-w': px(Math.min(avail, Math.ceil(d.base + (wide ? CG + textW : 0) + frame + 0.5))),
          '--sn-pb': px(pb), '--sn-pg': px(PG), '--sn-pc': pc,
        };
        for (const [k, v] of Object.entries(vars)) wrap.style.setProperty(k, String(v));
        wrap.classList.toggle('sn-wide', wide);
        wrap.classList.toggle('sn-nar', nar);
      }

      function paintRow(r, reveal) {
        const o = rows[r], t = history[r];
        const state = t ? 'past' : r === history.length && !ended ? 'cur' : 'fut';
        o.li.className = `sn-row sn-${state}` + (r === bigRow() ? ' sn-big' : '') + (t && t.black === P ? ' sn-win' : '') + (reveal ? ' sn-anim' : '');
        if (state === 'fut') o.li.setAttribute('aria-hidden', 'true'); else o.li.removeAttribute('aria-hidden');
        if (state === 'cur') o.slots.removeAttribute('aria-hidden'); else o.slots.setAttribute('aria-hidden', 'true');
        o.btns = null;
        o.fb.replaceChildren();
        o.txt.textContent = '';
        o.sr.textContent = '';
        if (state === 'cur') {
          o.btns = Array.from({ length: P }, (_, i) => h('button', { type: 'button', class: 'sn-slot', onmousedown: noFocus, onclick: () => tapSlot(i) }));
          o.slots.replaceChildren(...o.btns);
          o.sr.textContent = `Tentativa ${r + 1} de ${T}, em montagem.`;
          paintCurrent();
        } else if (state === 'past') {
          o.slots.replaceChildren(...t.guess.map(ci => h('span', { class: 'sn-slot' }, pegEl(ci))));
          const kinds = [...Array(t.black).fill('hit'), ...Array(t.white).fill('near'), ...Array(P - t.black - t.white).fill('none')];
          o.fb.replaceChildren(...kinds.map((k, i) => h('span', { class: 'sn-kp sn-' + k, style: { '--i': i } })));
          o.sr.textContent = `Tentativa ${r + 1}: ${lista(t.guess.map(nome))}. Resposta: `;
          o.txt.textContent = fbText(t.black, t.white, P);
        } else {
          o.slots.replaceChildren(...Array.from({ length: P }, () => h('span', { class: 'sn-slot' }, h('span', { class: 'sn-hole' }))));
        }
      }

      // Atualiza só a linha atual (os botões continuam os mesmos, então o foco do teclado não se perde).
      function paintCurrent() {
        const o = rows[history.length];
        if (!o || !o.btns) return;
        const nx = nextSlot();
        o.li.classList.toggle('sn-hinted', hinted);
        o.btns.forEach((b, i) => {
          const ci = cur[i];
          b.className = 'sn-slot' + (ci == null ? '' : ' sn-filled') + (i === nx ? ' sn-next' : '');
          if (ci == null) b.replaceChildren(h('span', { class: 'sn-hole' }));
          else b.replaceChildren(pegEl(ci, i === placed ? 'sn-pop' : ''), h('span', { class: 'sn-x', 'aria-hidden': 'true' }, '×'));
          b.setAttribute('aria-label', ci == null ? `Posição ${i + 1}: vazia${i === nx ? ', a próxima cor entra aqui' : ''}` : `Posição ${i + 1}: ${nome(ci)}. Toque para tirar`);
        });
        placed = -1;
        palBtns.forEach((b, ci) => {
          const used = !lv.repeat && cur.includes(ci);
          b.classList.toggle('sn-used', used);
          b.setAttribute('aria-label', cap(nome(ci)) + (used ? ' (já está na linha)' : ''));
        });
        ctx.primary('Testar senha', { disabled: nx >= 0 });
      }

      function status(action) {
        if (ctx.status !== 'play' || anim) return;
        const n = history.length + 1, falta = cur.filter(x => x == null).length, last = history[history.length - 1];
        const faltam = k => `Falta${k > 1 ? 'm' : ''} ${plural(k, 'cor', 'cores')} nesta linha.`;
        if (falta === P && !action) {
          if (!last) ctx.say('Descubra a senha', `Toque nas cores para montar a primeira tentativa${lv.repeat ? '' : ', sem repetir cores'}.`);
          else ctx.say(`Resposta: ${fbText(last.black, last.white, P)}`, n === T ? 'Última tentativa! Monte a linha com cuidado.' : `Faltam ${T - history.length} tentativas. Monte a próxima linha.`);
        } else if (falta) ctx.say(`Tentativa ${n} de ${T}`, `${action ? action + ' ' : ''}${faltam(falta)}`);
        else ctx.say('Linha completa', `${action ? action + ' ' : ''}Toque em Testar senha para ver a resposta${n === T ? ' (é a última tentativa)' : ''}.`);
      }

      function pick(ci) {
        if (anim || ctx.status !== 'play') return;
        if (ci >= C) return ctx.warn('Tecla sem cor', `Este nível usa ${C} cores: tecle de 1 a ${C}.`);
        if (!lv.repeat && cur.includes(ci)) {
          ctx.retrigger(palBtns[ci], 'sn-nope');
          return ctx.warn('Essa cor já está na linha', 'Neste nível a senha não repete cores. Escolha outra cor ou toque no espaço dela para tirá-la.', 'senha');
        }
        const i = nextSlot();
        if (i < 0) {
          ctx.retrigger(rows[history.length].li, 'sn-nope');
          return ctx.warn('A linha já está completa', 'Toque em Testar senha, ou toque num espaço para trocar a cor.');
        }
        cur[i] = ci; target = null; hinted = false; placed = i;
        paintCurrent();
        status(`${cap(nome(ci))} na posição ${i + 1}.`);
      }

      function tapSlot(i) {
        if (anim || ctx.status !== 'play') return;
        if (cur[i] == null) {
          target = target === i ? null : i;
          paintCurrent();
          return status(target === i ? `A próxima cor vai para a posição ${i + 1}.` : '');
        }
        const ci = cur[i];
        cur[i] = null; target = null; hinted = false;
        paintCurrent();
        status(`${cap(nome(ci))} saiu da posição ${i + 1}.`);
      }

      function removeLast() {
        if (anim || ctx.status !== 'play') return;
        for (let i = P - 1; i >= 0; i--) if (cur[i] != null) return tapSlot(i);
      }

      function submit() {
        if (anim || ctx.status !== 'play') return;
        const falta = cur.filter(x => x == null).length;
        if (falta) {
          ctx.retrigger(rows[history.length].li, 'sn-nope');
          return ctx.warn('Linha incompleta', `Falta${falta > 1 ? 'm' : ''} ${plural(falta, 'cor', 'cores')}. Toque nas cores para completar a linha.`);
        }
        const guess = cur.slice(), f = score(secret, guess), r = history.length;
        history.push({ guess, black: f.black, white: f.white });
        cur = Array(P).fill(null); target = null; hinted = false;
        const won = f.black === P;
        if (won || history.length >= T) ended = won ? 'won' : 'lost';
        ctx.setMoves(history.length);
        paintRow(r, !ctx.reduced);          // vira passado; os pinos da resposta aparecem um a um
        if (!ended) paintRow(r + 1);        // a próxima linha vira a atual
        const pins = f.black + f.white;
        const wait = ctx.reduced ? 0 : pins ? (pins - 1) * STEP + POP : 160;
        anim = true;
        ctx.busy(true);
        const done = () => {
          anim = false;
          ctx.busy(false);
          rows[r].li.classList.remove('sn-anim');
          if (ended === 'won') {
            reveal(true);
            const n = history.length;
            ctx.win({ score: n, title: n === 1 ? 'De primeira!' : 'Cofre aberto!', text: `Você descobriu a senha em ${plural(n, 'tentativa', 'tentativas')}, de ${T} permitidas.` });
          } else if (ended) {
            reveal(false);
            ctx.fail({ title: 'As tentativas acabaram', text: `A senha era ${lista(secret.map(nome))}. Toque em Novo desafio para tentar outra senha.`, rule: 'limite' });
          } else status();
        };
        if (wait) ctx.later(done, wait); else done();
      }

      // Mostra a senha no cofre (vitória: cofre aberto; derrota: a senha que era).
      function reveal(won) {
        band.classList.add(won ? 'sn-open' : 'sn-shown');
        cells.forEach((cell, i) => {
          const p = pegEl(secret[i], ctx.reduced ? '' : 'sn-reveal');
          p.style.setProperty('--i', i);
          cell.replaceChildren(p);
        });
        bandSr.textContent = `Senha: ${lista(secret.map(nome))}.`;
        bandLbl.textContent = won ? 'Cofre aberto!' : 'Era esta a senha';
      }

      // Teclado. Um botão focado com Tab recebe o Enter normalmente; um botão que só ficou com o foco por
      // clique (ex.: o nível escolhido com o mouse) não: aí o Enter testa a senha em vez de reiniciar o nível.
      let viaTab = false;
      ctx.listen(window, 'pointerdown', () => { viaTab = false; }, true);
      ctx.listen(window, 'keydown', e => {
        if (e.key === 'Tab') { viaTab = true; return; }
        if (e.ctrlKey || e.metaKey || e.altKey || ctx.status !== 'play') return;
        const el = e.target && e.target.closest ? e.target : null;
        if (el && el.closest('input, textarea, select, [contenteditable]')) return;
        if (/^[1-9]$/.test(e.key)) { e.preventDefault(); pick(+e.key - 1); }
        else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); removeLast(); }
        else if (e.key === 'Enter') {
          if (viaTab && el && el.closest('button, a, [role="button"]')) return;
          e.preventDefault();
          submit();
        }
      });

      layout(ctx.board.clientWidth);
      ctx.onResize(layout);
      rows.forEach((_, r) => paintRow(r));
      status();

      return {
        onPrimary: submit,
        onHint() {
          if (anim || ctx.status !== 'play') return;
          const cands = candidates(codesFor(lv), history);
          const g = pickGuess(cands);
          if (!g) return;
          cur = g.slice(); target = null; hinted = true; placed = -1;
          paintCurrent();
          status();
          const n = cands.length;
          ctx.hint('Dica', n === 1
            ? 'Só resta 1 senha possível com as respostas até agora, e ela já está na linha atual: toque em Testar senha.'
            : history.length
              ? `Com as respostas até agora, ainda há ${fmtN(n)} senhas possíveis. Coloquei na linha atual uma que combina com todas as respostas: é uma das possíveis, não necessariamente a certa.`
              : `Sem nenhuma resposta ainda, todas as ${fmtN(n)} senhas são possíveis. Coloquei uma delas na linha atual: é uma das possíveis, não necessariamente a certa.`);
        },
      };
    },
  });
})();
