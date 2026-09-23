/* Torre de Hanói — leve a torre do pino da esquerda para o da direita */
(() => {
  // ---------- lógica pura (testável no Node) ----------
  // pos[d] = pino (0, 1 ou 2) do disco d; o disco 1 é o menor.
  // Próximo movimento ótimo para juntar os discos 1..k no pino `alvo`, a partir de qualquer arrumação válida.
  function nextMove(pos, k, alvo) {
    if (k === 0) return null;
    if (pos[k] === alvo) return nextMove(pos, k - 1, alvo);
    const aux = 3 - pos[k] - alvo;
    return nextMove(pos, k - 1, aux) || { disk: k, from: pos[k], to: alvo };
  }
  // Quantos movimentos faltam na melhor solução.
  function distance(pos, k, alvo) {
    if (k === 0) return 0;
    if (pos[k] === alvo) return distance(pos, k - 1, alvo);
    return distance(pos, k - 1, 3 - pos[k] - alvo) + 2 ** (k - 1);
  }
  const posFrom = pegs => { const pos = []; pegs.forEach((p, i) => p.forEach(d => { pos[d] = i; })); return pos; };
  const logic = { nextMove, distance, posFrom };
  if (typeof module !== 'undefined' && module.exports) { module.exports = logic; return; }

  // ---------- interface ----------
  const COLORS = ['#E5484D', '#F08A24', '#F2C230', '#3FA66B', '#2BA3A3', '#3E7BD9', '#8B5CD6'];
  const NOMES = ['da esquerda', 'do meio', 'da direita'];
  const ALVO = 2;
  const ICON = `<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round">
    <rect x="15" y="16" width="5" height="36" rx="2.5" fill="#8C5A2D"/><rect x="30" y="16" width="5" height="36" rx="2.5" fill="#8C5A2D"/><rect x="45" y="16" width="5" height="36" rx="2.5" fill="#8C5A2D"/>
    <rect x="4" y="50" width="57" height="8" rx="4" fill="#A86E3A"/>
    <rect x="5" y="42" width="25" height="7.5" rx="3.75" fill="#3E7BD9"/><rect x="8" y="34.5" width="19" height="7.5" rx="3.75" fill="#3FA66B"/>
    <rect x="11" y="27" width="13" height="7.5" rx="3.75" fill="#F2C230"/><rect x="36" y="42" width="13" height="7.5" rx="3.75" fill="#E5484D"/></g></svg>`;
  const ICO_UM = `<svg viewBox="0 0 34 34"><g stroke="#2A2433" stroke-width="1.6"><rect x="15" y="6" width="4" height="24" rx="2" fill="#8C5A2D"/><rect x="6" y="10" width="22" height="6" rx="3" fill="#F2C230"/><rect x="4" y="24" width="26" height="6" rx="3" fill="#3E7BD9"/></g><path d="M17 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const ICO_MAIOR = `<svg viewBox="0 0 34 34"><g stroke="#2A2433" stroke-width="1.6"><rect x="3" y="12" width="28" height="7" rx="3.5" fill="#3E7BD9"/><rect x="10" y="21" width="14" height="7" rx="3.5" fill="#F2C230"/></g><path d="M7 5l20 26M27 5L7 31" stroke="#C23A2E" stroke-width="3" stroke-linecap="round"/></svg>`;
  const ICO_META = `<svg viewBox="0 0 34 34"><g stroke="#2A2433" stroke-width="1.6"><rect x="3" y="27" width="28" height="4" rx="2" fill="#A86E3A"/><rect x="24" y="9" width="4" height="19" rx="2" fill="#8C5A2D"/><path d="M28 5l-0 0M26 4v7" fill="none"/><path d="M26 3l7 3-7 3z" fill="#3FA66B"/></g><path d="M5 18h12m-4-4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const CSS = `
  .hn-area{position:relative;width:100%;max-width:760px;height:var(--hn-h,300px);margin:0 auto}
  .hn-peg{position:absolute;top:0;height:100%;width:var(--hn-col);left:calc(var(--i) * var(--hn-col));padding:0;border:0;border-radius:16px;background:none;cursor:pointer;color:inherit;-webkit-tap-highlight-color:transparent;transition:background .15s}
  .hn-peg:hover{background:color-mix(in srgb,var(--ink) 5%,transparent)}
  .hn-peg:focus-visible{outline:3px solid var(--focus);outline-offset:-3px}
  .hn-peg.sel{background:color-mix(in srgb,var(--hint) 18%,transparent)}
  .hn-rod{position:absolute;left:50%;bottom:var(--hn-rod-b);width:12px;height:var(--hn-rod);margin-left:-6px;border-radius:6px 6px 0 0;background:#8C5A2D;border:1.6px solid #2A2433}
  .hn-peg.target .hn-rod::before{content:"";position:absolute;left:4px;top:-2px;width:20px;height:14px;background:#3FA66B;border:1.6px solid #2A2433;clip-path:polygon(0 0,100% 50%,0 100%)}
  .hn-peg.hinted .hn-rod{box-shadow:0 0 0 3px var(--hint)}
  .hn-name{position:absolute;left:0;right:0;bottom:4px;text-align:center;font:900 12px/1 "Nunito",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
  .hn-peg.target .hn-name{color:var(--ok)}
  .hn-base{position:absolute;left:1.5%;right:1.5%;bottom:var(--hn-base-b);height:16px;border-radius:8px;background:#A86E3A;border:1.6px solid #2A2433;box-shadow:inset 0 -4px 0 rgba(0,0,0,.15)}
  .hn-disk{position:absolute;left:0;top:0;height:var(--hn-dh);display:grid;place-items:center;border-radius:999px;background:var(--c);border:1.6px solid #2A2433;color:#fff;font:900 13px/1 "Nunito",sans-serif;text-shadow:0 1px 0 rgba(0,0,0,.4);box-shadow:inset 0 -4px 0 rgba(0,0,0,.15),inset 0 3px 0 rgba(255,255,255,.3);pointer-events:none;transition:transform var(--hn-t,.2s) cubic-bezier(.5,0,.3,1)}
  .hn-disk.hinted{box-shadow:0 0 0 3px var(--hint),0 0 14px var(--hint)}
  .hn-disk.nope{animation:hn-shake .38s ease-in-out}
  .hn-area.instant .hn-disk{transition:none}
  @keyframes hn-shake{20%{translate:-6px 0}40%{translate:6px 0}60%{translate:-3px 0}80%{translate:3px 0}}
  `;

  Jogos.register({
    id: 'hanoi',
    name: 'Torre de Hanói',
    tagline: 'Leve a torre inteira para o pino da direita, um disco por vez.',
    icon: ICON,
    css: CSS,
    metric: { label: 'Movimentos', unit: ['movimento', 'movimentos'] },
    levels: [
      { id: 'facil', name: 'Fácil', n: 3, blurb: 'Três discos para pegar o jeito.' },
      { id: 'medio', name: 'Médio', n: 4, blurb: 'Quatro discos: o padrão começa a aparecer.' },
      { id: 'dificil', name: 'Difícil', n: 5, blurb: 'Cinco discos pedem planejamento.' },
      { id: 'muito', name: 'Muito difícil', n: 6, blurb: 'Seis discos e 63 movimentos na solução perfeita.' },
    ].map(l => Object.assign(l, { sub: `<span class="cnt">${l.n} discos · </span>mín. ${2 ** l.n - 1}` })),
    rules: () => [
      { key: 'um', icon: ICO_UM, html: 'Mova <b>um disco por vez</b>, sempre o de cima de um pino.' },
      { key: 'maior', icon: ICO_MAIOR, html: 'Nunca coloque um disco <b>maior sobre um menor</b>.' },
      { key: 'meta', icon: ICO_META, html: 'Leve a torre inteira para o <b>pino da direita</b>, o da bandeira.' },
    ],
    how: 'Toque em um pino para levantar o disco de cima e depois no pino onde quer colocá-lo. No teclado, use <b>1</b>, <b>2</b> e <b>3</b>.',

    mount(ctx) {
      const { h } = ctx, n = ctx.level.n, min = 2 ** n - 1;
      let pegs = [Array.from({ length: n }, (_, i) => n - i), [], []];
      let sel = null, moves = 0, hint = null, anim = false;
      const history = [];
      ctx.setMin(min);

      const area = h('div', { class: 'hn-area' });
      const pegEls = [0, 1, 2].map(i => h('button', {
        type: 'button', class: 'hn-peg' + (i === ALVO ? ' target' : ''), style: { '--i': i }, onclick: () => tap(i),
      }, h('span', { class: 'hn-rod' }), h('span', { class: 'hn-name' }, ['Início', 'Meio', 'Destino'][i])));
      const disks = {};
      for (let d = 1; d <= n; d++) disks[d] = h('div', { class: 'hn-disk', style: { '--c': COLORS[(d - 1) % COLORS.length] } }, String(d));
      area.append(h('div', { class: 'hn-base' }), ...pegEls, ...Object.values(disks));
      ctx.board.append(area);

      let L = null;
      const doLayout = w => {
        const areaW = Math.min(w - 36, 760), col = areaW / 3;
        const dh = Math.max(16, Math.min(30, col * 0.14));
        const rod = (n + 1) * dh + 6, nameH = 24, baseH = 16, lift = dh + 18;
        L = { col, dh, rod, baseTop: lift + rod, height: lift + rod + baseH + nameH };
        L.diskW = d => col * (0.3 + 0.62 * (n === 1 ? 1 : (d - 1) / (n - 1)));
        Object.entries({ '--hn-col': col + 'px', '--hn-dh': dh - 2 + 'px', '--hn-rod': rod + 'px', '--hn-rod-b': baseH + nameH - 1 + 'px', '--hn-base-b': nameH + 'px', '--hn-h': L.height + 'px' })
          .forEach(([k, v]) => area.style.setProperty(k, v));
        for (let d = 1; d <= n; d++) disks[d].style.width = L.diskW(d) + 'px';
        area.classList.add('instant');
        render();
        void area.offsetWidth;
        area.classList.remove('instant');
      };
      ctx.onResize(doLayout);
      doLayout(ctx.board.clientWidth);   // já na montagem (o aviso de tamanho pode demorar se a aba não estiver visível)

      function place(d, peg, y) {
        disks[d].style.transform = `translate(${(peg + 0.5) * L.col - L.diskW(d) / 2}px, ${y}px)`;
      }
      function render(over) {
        if (!L) return;
        pegs.forEach((stack, i) => stack.forEach((d, k) => {
          const lifted = sel === i && k === stack.length - 1;
          place(d, i, lifted ? 4 : L.baseTop - (k + 1) * L.dh);
        }));
        if (over) place(over.disk, over.peg, 4);        // disco atravessando por cima dos pinos
        pegEls.forEach((el, i) => {
          el.classList.toggle('sel', sel === i);
          el.classList.toggle('hinted', !!hint && hint.to === i && (sel === hint.from));
          const top = pegs[i][pegs[i].length - 1];
          el.setAttribute('aria-label', `Pino ${NOMES[i]}${i === ALVO ? ' (destino)' : ''}: ${pegs[i].length ? `${pegs[i].length} disco${pegs[i].length > 1 ? 's' : ''}, o de cima é o disco ${top}` : 'vazio'}`);
        });
        for (let d = 1; d <= n; d++) disks[d].classList.toggle('hinted', !!hint && hint.disk === d);
        ctx.controls({ undo: history.length > 0 && !anim });
        status();
      }
      function status() {
        if (ctx.status !== 'play') return;
        if (sel != null) ctx.say(`Disco ${pegs[sel][pegs[sel].length - 1]} levantado`, 'Toque no pino onde quer colocá-lo. Tocar no mesmo pino devolve o disco.');
        else ctx.say(moves ? 'Continue' : 'Sua vez', moves ? 'Toque em um pino para levantar o disco de cima.' : 'Toque no pino da esquerda para levantar o disco de cima.');
      }

      function tap(i) {
        if (anim || ctx.status !== 'play') return;
        if (sel == null) {
          if (!pegs[i].length) { ctx.retrigger(pegEls[i]); return ctx.warn('Pino vazio', 'Escolha um pino que tenha discos.'); }
          sel = i; return render();
        }
        if (sel === i) { sel = null; return render(); }
        const d = pegs[sel][pegs[sel].length - 1], top = pegs[i][pegs[i].length - 1];
        if (top && top < d) {
          ctx.retrigger(disks[d]);
          return ctx.warn('Esse movimento não vale', `O disco ${d} é maior que o disco ${top} do pino ${NOMES[i]}.`, 'maior');
        }
        move(sel, i, true);
      }

      function move(from, to, record) {
        const d = pegs[from].pop();
        pegs[to].push(d);
        sel = null;
        hint = null;
        if (record) { history.push({ from, to }); moves++; } else moves--;
        ctx.setMoves(moves);
        if (ctx.reduced) { render(); return afterMove(); }
        anim = true;
        render({ disk: d, peg: to });          // primeiro por cima do pino de destino...
        ctx.later(() => { anim = false; render(); afterMove(); }, 190);   // ...depois desce
      }
      function afterMove() {
        if (pegs[ALVO].length === n) ctx.win();
      }

      ctx.listen(window, 'keydown', e => {
        if (e.target.closest && e.target.closest('input, textarea, select')) return;
        if (['1', '2', '3'].includes(e.key)) { e.preventDefault(); tap(+e.key - 1); }
        else if (e.key === 'Escape' && sel != null) { sel = null; render(); }
      });

      return {
        onHint() {
          const pos = posFrom(pegs);
          const m = nextMove(pos, n, ALVO);
          if (!m) return;
          hint = m;
          if (sel != null && sel !== m.from) sel = null;
          render();
          ctx.hint('Dica', `Mova o disco ${m.disk} do pino ${NOMES[m.from]} para o pino ${NOMES[m.to]}. Daqui, faltam ${distance(pos, n, ALVO)} movimentos.`);
        },
        onUndo() {
          const last = history.pop();
          if (!last || anim) return;
          sel = null;
          move(last.to, last.from, false);
        },
      };
    },
  });
})();
