/* Jogos de lógica do Danilo — kit compartilhado: menu, tela de jogo, níveis, recordes e barra de ações.
   Cada jogo se registra com Jogos.register({...}) — veja src/COMO-CRIAR-UM-JOGO.md. */
const Jogos = (() => {
  const NOME = 'Jogos de lógica do Danilo';   // nome da coleção (menu e título da aba)
  const INK = '#2A2433';
  const OL = `stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"`;
  // Cores de peças (iguais nos dois temas; sempre com contorno INK). sym ajuda quem não distingue cores.
  const PIECES = [
    { id: 'vermelho', fill: '#E5484D', sym: '●' }, { id: 'laranja', fill: '#F08A24', sym: '▲' },
    { id: 'amarelo', fill: '#F2C230', sym: '■' }, { id: 'verde', fill: '#3FA66B', sym: '◆' },
    { id: 'azul', fill: '#3E7BD9', sym: '★' }, { id: 'roxo', fill: '#8B5CD6', sym: '✚' },
    { id: 'rosa', fill: '#E86FA4', sym: '♥' }, { id: 'turquesa', fill: '#2BA3A3', sym: '⬟' },
  ];
  const games = [];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- utilidades de DOM ---------- */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') for (const [p, val] of Object.entries(v)) { if (p.startsWith('--')) el.style.setProperty(p, val); else el.style[p] = val; }
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  }
  function svg(tag, attrs, ...kids) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  }
  const retrigger = (el, cls = 'nope', ms = 420) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };

  /* ---------- recordes (por jogo e nível; menor é melhor) ---------- */
  const store = {
    get(k) { try { return localStorage.getItem('jogos-logica:' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('jogos-logica:' + k, String(v)); } catch (e) {} },
  };
  const memBest = {};
  const best = {
    get(g, l) { const k = g + ':' + l; if (k in memBest) return memBest[k]; const v = parseFloat(store.get('recorde:' + k)); return v >= 0 ? v : null; },
    set(g, l, v) { const cur = best.get(g, l); if (cur != null && cur <= v) return false; memBest[g + ':' + l] = v; store.set('recorde:' + g + ':' + l, v); return true; },
  };

  const memDone = {};
  const markDone = (g, l) => { memDone[g + ':' + l] = true; store.set('feito:' + g + ':' + l, 1); };
  const isDone = (g, l) => !!memDone[g + ':' + l] || store.get('feito:' + g + ':' + l) === '1' || best.get(g, l) != null;

  function register(def) {
    if (!def || !def.id || !def.levels || !def.mount) throw new Error('Jogo inválido: precisa de id, levels e mount');
    def.metric = Object.assign({ label: 'Movimentos', unit: ['movimento', 'movimentos'], format: 'count' }, def.metric);
    if (def.css) document.head.append(h('style', { 'data-jogo': def.id }, def.css));
    games.push(def);
  }
  const fmt = (g, v) => (v == null ? '—' : g.metric.format === 'time' ? JogosCore.fmtTime(v) : String(v));

  /* ---------- rotas: #id-do-jogo abre o jogo; vazio abre o menu ---------- */
  const view = () => document.getElementById('view');
  let cur = null;          // sessão do nível em andamento
  let ui = null;           // elementos da tela de jogo
  let cleanups = [];       // o que desligar ao sair do nível
  let warnTimer = 0;

  function route() {
    const id = decodeURIComponent(location.hash.slice(1));
    const g = games.find(x => x.id === id);
    if (g) openGame(g); else openHome();
  }
  // Abre a tela direto e só depois tenta atualizar o endereço: funciona mesmo onde mudar o # é bloqueado.
  function go(id) {
    const g = games.find(x => x.id === id);
    if (g) openGame(g); else openHome();
    try {
      if (g) history.pushState(null, '', '#' + id);
      else if (location.hash) history.pushState(null, '', location.pathname + location.search);
    } catch (e) { /* endereço fixo neste ambiente */ }
  }
  function start() {
    window.addEventListener('hashchange', route);
    window.addEventListener('popstate', route);
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[data-go]');
      if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      go(a.dataset.go);
    });
    route();
  }

  function teardown() {
    clearTimeout(warnTimer);
    if (cur && cur.ctrl && cur.ctrl.destroy) { try { cur.ctrl.destroy(); } catch (e) { console.error(e); } }
    cleanups.forEach(f => { try { f(); } catch (e) {} });
    cleanups = [];
    cur = null;
  }

  /* ---------- menu inicial ---------- */
  function openHome() {
    teardown();
    ui = null;
    document.title = NOME;
    const won = games.reduce((n, g) => n + g.levels.filter(l => isDone(g.id, l.id)).length, 0);
    const total = games.reduce((n, g) => n + g.levels.length, 0);
    // Níveis além dos quatro de sempre (ex.: o NG+ da Travessia) ganham uma menção no menu
    const extraTxt = games.filter(g => g.levels.length > 4).map(g => {
      const names = g.levels.slice(4).map(l => l.name);
      return `, e a ${g.name} tem ainda ${names.length > 1 ? `os níveis ${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}` : `o nível ${names[0]}`}`;
    }).join('');
    view().replaceChildren(h('section', { class: 'hub' },
      h('header', {},
        h('p', { class: 'eyebrow' }, 'Raciocínio lógico'),
        h('h1', {}, NOME),
        h('p', { class: 'lede' }, `${games.length} jogos, cada um com quatro níveis de dificuldade${extraTxt}. ` +
          (won ? `Você já venceu ${won} de ${total} níveis.` : 'Escolha um para começar; o Fácil de cada jogo é um bom aquecimento.'))),
      h('div', { class: 'cards' }, games.map(cardFor))));
    window.scrollTo(0, 0);
  }
  function cardFor(g) {
    const done = g.levels.map(l => isDone(g.id, l.id));
    const n = done.filter(Boolean).length;
    return h('a', { class: 'gcard', href: '#' + g.id, 'data-go': g.id },
      h('span', { class: 'gi', html: g.icon || '' }),
      h('span', {},
        h('h3', {}, g.name),
        h('p', {}, g.tagline),
        h('span', { class: 'prog', 'aria-label': `${n} de ${g.levels.length} níveis vencidos` },
          done.map(d => h('i', { class: d ? 'on' : '' })), h('span', { 'aria-hidden': 'true' }, `${n}/${g.levels.length}`))));
  }

  /* ---------- tela de jogo ---------- */
  function openGame(g) {
    teardown();
    document.title = `${g.name} · ${NOME}`;
    const saved = parseInt(store.get('nivel:' + g.id), 10);
    buildGameView(g);
    startLevel(g, g.levels[saved] ? saved : 0);
    window.scrollTo(0, 0);
  }

  function buildGameView(g) {
    const u = {};
    u.moves = h('dd', {}, '0');
    u.minLabel = h('dt', {}, 'Mínimo possível');
    u.min = h('dd', {}, '—');
    u.minBox = h('div', {}, u.minLabel, u.min);
    u.best = h('dd', {}, '—');
    u.levels = h('nav', { class: 'levels', 'aria-label': 'Nível de dificuldade' });
    u.board = h('div', { class: 'board' });
    u.msg = h('div', { class: 'msg', role: 'status', 'aria-live': 'polite' });
    u.btnHint = h('button', { type: 'button', class: 'btn', onclick: () => act('onHint') }, 'Dica');
    u.btnUndo = h('button', { type: 'button', class: 'btn', onclick: onUndo }, 'Desfazer');
    u.btnReset = h('button', { type: 'button', class: 'btn', onclick: onReset }, 'Recomeçar');
    u.btnNew = h('button', { type: 'button', class: 'btn', onclick: () => cur && startLevel(cur.g, cur.li) }, 'Novo desafio');
    u.btnNext = h('button', { type: 'button', class: 'btn primary', onclick: () => cur && startLevel(cur.g, cur.li + 1) }, 'Próximo nível ', h('span', { class: 'arrow', 'aria-hidden': 'true' }, '→'));
    u.primaryLabel = h('span', {});
    u.btnPrimary = h('button', { type: 'button', class: 'btn primary', onclick: () => act('onPrimary') }, u.primaryLabel);
    // Segundo botão de ação, à esquerda do principal (ex.: na ilha da Travessia, "voltar" ao lado de "seguir")
    u.altLabel = h('span', {});
    u.btnAlt = h('button', { type: 'button', class: 'btn primary', onclick: () => act('onAlt') }, u.altLabel);
    u.actions = h('div', { class: 'actions' }, u.btnHint, u.btnUndo, u.btnReset, u.btnNew, u.btnNext, u.btnAlt, u.btnPrimary);
    u.bar = h('div', { class: 'bar' }, u.msg, u.actions);
    u.rulesSub = h('p', { class: 'rules-sub' });
    u.rules = h('ul', {});
    u.how = h('p', { class: 'how' });
    view().replaceChildren(h('section', { class: 'gv' },
      h('div', { class: 'gv-head' },
        h('div', {},
          h('a', { class: 'back', href: '#', 'data-go': '' }, h('span', { 'aria-hidden': 'true' }, '←'), 'Todos os jogos'),
          h('div', { class: 'gv-title' }, h('span', { class: 'gi', html: g.icon || '' }),
            h('div', {}, h('h1', {}, g.name), h('p', {}, g.tagline)))),
        h('dl', { class: 'stats' },
          h('div', {}, h('dt', {}, g.metric.label), u.moves), u.minBox, h('div', {}, h('dt', {}, 'Seu recorde'), u.best))),
      h('div', { class: 'main' },
        h('section', { class: 'stage', 'aria-label': g.name }, u.levels, u.board, u.bar),
        h('aside', { class: 'rules', 'aria-label': 'Regras' }, h('h2', {}, 'Regras'), u.rulesSub, u.rules, u.how))));
    u.levels.addEventListener('click', e => {
      const b = e.target.closest('.lvl');
      if (b && cur && !cur.busy) startLevel(cur.g, +b.dataset.i);
    });
    ui = u;
  }

  function act(name) {
    const s = cur;
    if (!s || s.busy || !s.ctrl || !s.ctrl[name]) return;
    if ((name === 'onPrimary' || name === 'onAlt') && (s.status !== 'play')) return;
    if (name === 'onHint' && s.status !== 'play') return;
    s.ctrl[name]();
  }
  function onUndo() {
    const s = cur;
    if (!s || s.busy || !s.ctrl || !s.ctrl.onUndo || s.status === 'won') return;
    if (s.status === 'fail' && s.failInfo && s.failInfo.final) return;   // essa derrota só se resolve recomeçando
    if (s.status === 'fail') { s.status = 'play'; s.failInfo = null; }
    s.ctrl.onUndo();
    refresh();
  }
  function onReset() {
    const s = cur;
    if (!s || s.busy) return;
    if (s.status === 'won' || s.g.freshRestart) return startLevel(s.g, s.li);   // novo desafio do mesmo nível
    startLevel(s.g, s.li, s.seed);                                   // mesmo desafio, do começo
  }

  function startLevel(g, li, seed) {
    if (!g.levels[li]) return;
    if (cur && cur.ctrl && cur.ctrl.destroy) { try { cur.ctrl.destroy(); } catch (e) { console.error(e); } }
    cleanups.forEach(f => { try { f(); } catch (e) {} });
    cleanups = [];
    clearTimeout(warnTimer);
    store.set('nivel:' + g.id, li);
    const level = g.levels[li];
    const s = cur = {
      g, li, level, seed: seed ?? JogosCore.newSeed(), status: 'play', moves: 0, min: null, minLabel: null,
      base: null, warnMsg: null, hintMsg: null, busy: false, ctrl: null, primaryCfg: null, altCfg: null,
      controls: { hint: true, undo: false }, hintsUsed: 0, failInfo: null, winInfo: null, newRecord: false,
    };
    ui.board.replaceChildren();
    ui.board.className = `board board-${g.id}`;
    ui.board.removeAttribute('style');
    renderLevels();
    renderRules();
    const ctx = makeCtx(s);
    try { s.ctrl = g.mount(ctx) || {}; }
    catch (e) { console.error(e); s.ctrl = {}; s.base = { t: 'Algo deu errado', d: 'Não foi possível montar este nível. Tente recomeçar.' }; }
    refresh();
  }

  function makeCtx(s) {
    const alive = () => cur === s;
    const ctx = {
      game: s.g, level: s.level, levelIndex: s.li, seed: s.seed, board: ui.board,
      rng: JogosCore.rng(s.seed), INK, OL, PIECES, h, svg, retrigger, core: JogosCore,
      get reduced() { return reduce.matches; },
      get status() { return s.status; },
      say(t, d) { if (!alive()) return; s.base = { t, d }; refreshBar(); },
      warn(t, d, rule) {
        if (!alive()) return;
        s.warnMsg = { t, d };
        s.warnAt = performance.now();
        clearTimeout(warnTimer);
        warnTimer = setTimeout(() => { if (alive()) { s.warnMsg = null; refreshBar(); } }, 3400);
        if (rule != null) flashRule(rule);
        refreshBar();
      },
      hint(t, d) { if (!alive()) return; s.hintMsg = { t: t || 'Dica', d }; s.hintsUsed++; s.warnMsg = null; refreshBar(); },
      clearHint() { if (!alive()) return; s.hintMsg = null; refreshBar(); },
      clearWarn() { if (!alive()) return; s.warnMsg = null; clearTimeout(warnTimer); refreshBar(); },
      // Um movimento novo apaga a dica anterior (no formato tempo, o relógio não conta como jogada)
      setMoves(n) {
        if (!alive()) return;
        if (s.g.metric.format !== 'time' && n !== s.moves) {
          let changed = false;
          if (s.hintMsg) { s.hintMsg = null; changed = true; }
          if (s.warnMsg && performance.now() - (s.warnAt || 0) > 250) { s.warnMsg = null; clearTimeout(warnTimer); changed = true; }
          if (changed) refreshBar();
        }
        s.moves = n; refreshStats();
      },
      setMin(n, label) { if (!alive()) return; s.min = n; s.minLabel = label || null; refreshStats(); },
      controls(o) { if (!alive()) return; Object.assign(s.controls, o); refreshBar(); },
      primary(label, opts) { if (!alive()) return; s.primaryCfg = label ? Object.assign({ label }, opts) : null; refreshBar(); },
      alt(label, opts) { if (!alive()) return; s.altCfg = label ? Object.assign({ label }, opts) : null; refreshBar(); },
      busy(b) { if (!alive()) return; s.busy = !!b; refreshBar(); },
      win(o = {}) {
        if (!alive() || s.status === 'won') return;
        s.status = 'won'; s.winInfo = o; s.hintMsg = null; s.warnMsg = null;
        markDone(s.g.id, s.level.id);
        s.newRecord = s.hintsUsed ? false : best.set(s.g.id, s.level.id, o.score ?? s.moves);
        renderLevels(); refresh();
      },
      fail(o = {}) {
        if (!alive()) return;
        s.status = 'fail'; s.failInfo = o; s.hintMsg = null; s.warnMsg = null;
        refresh();
      },
      resume() { if (!alive()) return; s.status = 'play'; s.failInfo = null; refresh(); },
      flashRule,
      // Ciclo de vida: tudo que for registrado aqui é desligado ao trocar de nível ou sair do jogo.
      later(fn, ms) { const id = setTimeout(() => { if (alive()) fn(); }, ms); cleanups.push(() => clearTimeout(id)); return id; },
      every(fn, ms) { const id = setInterval(() => { if (alive()) fn(); }, ms); cleanups.push(() => clearInterval(id)); return id; },
      listen(target, type, fn, opts) { target.addEventListener(type, fn, opts); cleanups.push(() => target.removeEventListener(type, fn, opts)); },
      onResize(fn) {
        let last = -1, raf = 0;
        // O redesenho vai para o quadro seguinte: evita o aviso "ResizeObserver loop" quando o jogo muda a altura do tabuleiro.
        const ro = new ResizeObserver(() => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => { const w = ui.board.clientWidth; if (w && w !== last && alive()) { last = w; fn(w); } });
        });
        ro.observe(ui.board);
        cleanups.push(() => { ro.disconnect(); cancelAnimationFrame(raf); });
      },
      bestFor(levelId) { return best.get(s.g.id, levelId ?? s.level.id); },
    };
    return ctx;
  }

  function flashRule(key) {
    if (!ui) return;
    const li = ui.rules.querySelector(`li[data-rule="${key}"]`);
    if (li) retrigger(li, 'flash', 1200);
  }

  function renderLevels() {
    const s = cur, g = s.g;
    ui.levels.style.setProperty('--nlv', g.levels.length);
    ui.levels.replaceChildren(...g.levels.map((l, i) => {
      const b = best.get(g.id, l.id);
      return h('button', { type: 'button', class: 'lvl' + (l.extra ? ' lvl-extra' : ''), 'data-i': i, 'aria-pressed': String(i === s.li) },
        h('span', { class: 'n' }, l.name || ['Fácil', 'Médio', 'Difícil', 'Muito difícil'][i],
          b != null ? h('span', { class: 'ok', title: 'Seu recorde' }, '✓ ' + fmt(g, b)) : isDone(g.id, l.id) ? h('span', { class: 'ok', title: 'Vencido com dicas' }, '✓') : null),
        l.sub ? h('span', { class: 's', html: l.sub }) : null);
    }));
  }

  function renderRules() {
    const s = cur, g = s.g;
    const items = g.rules ? g.rules(s.level) : [];
    ui.rules.replaceChildren(...items.map(r => h('li', { 'data-rule': r.key || '', class: r.icon ? '' : 'noicon' },
      r.icon ? h('span', { class: 'ico', html: r.icon }) : null,
      h('span', { html: r.html + (r.novo ? '<span class="new">Novo</span>' : '') }))));
    ui.rulesSub.textContent = s.level.blurb ? `${s.level.name}: ${s.level.blurb}` : '';
    ui.rulesSub.hidden = !s.level.blurb;
    const how = typeof g.how === 'function' ? g.how(s.level) : g.how;
    ui.how.innerHTML = how || '';
    ui.how.hidden = !how;
  }

  function refresh() { refreshStats(); refreshBar(); }
  function refreshStats() {
    const s = cur; if (!s || !ui) return;
    ui.moves.textContent = fmt(s.g, s.moves);
    ui.minBox.hidden = s.min == null;
    ui.min.textContent = s.min ?? '—';
    ui.minLabel.textContent = s.minLabel || 'Mínimo possível';
    ui.best.textContent = fmt(s.g, best.get(s.g.id, s.level.id));
  }

  function winMsg(s) {
    const o = s.winInfo || {}, g = s.g;
    const val = o.score ?? s.moves;
    const perfect = o.perfect ?? (s.min != null && val <= s.min);
    const words = g.metric.format === 'time' ? `em ${JogosCore.fmtTime(val)}` : `em ${JogosCore.plural(val, g.metric.unit[0], g.metric.unit[1])}`;
    let d = o.text || (`Você terminou ${words}` + (s.min != null && g.metric.format !== 'time' ? (perfect ? ', o mínimo possível.' : `. O mínimo é ${s.min}.`) : '.'));
    if (s.newRecord) d += ' Novo recorde!';
    if (s.hintsUsed) d += ` Você usou ${JogosCore.plural(s.hintsUsed, 'dica', 'dicas')}, então esta partida não conta como recorde.`;
    const next = g.levels[s.li + 1];
    if (next) d += ` Próximo: ${next.name}.`;
    return { t: o.title || (perfect ? 'Perfeito!' : 'Resolvido!'), d };
  }

  function refreshBar() {
    const s = cur; if (!s || !ui) return;
    const c = s.ctrl || {}, won = s.status === 'won', fail = s.status === 'fail';
    const final = fail && !!(s.failInfo && s.failInfo.final);   // derrota que não se desfaz: só recomeçar do início
    ui.bar.classList.toggle('won', won);
    ui.bar.classList.toggle('fail', fail);
    ui.btnHint.hidden = !c.onHint || won || fail;
    ui.btnHint.disabled = s.busy || s.controls.hint === false;
    ui.btnUndo.hidden = !c.onUndo || won || final;
    ui.btnUndo.disabled = s.busy || (!fail && !s.controls.undo);
    ui.btnUndo.textContent = fail ? 'Desfazer jogada' : 'Desfazer';
    ui.btnUndo.classList.toggle('primary', fail && !!c.onUndo);
    ui.btnReset.textContent = won ? 'Jogar de novo' : final ? 'Recomeçar do início' : 'Recomeçar';
    ui.btnReset.disabled = s.busy;
    ui.btnNew.hidden = !s.g.generated || won;
    ui.btnNew.disabled = s.busy;
    const next = s.g.levels[s.li + 1];
    ui.btnNext.hidden = !won || !next;
    ui.btnReset.classList.toggle('primary', (won && !next) || final);
    ui.btnPrimary.hidden = !s.primaryCfg || won || fail;
    if (s.primaryCfg) {
      ui.primaryLabel.innerHTML = s.primaryCfg.label;
      ui.btnPrimary.setAttribute('aria-disabled', String(!!s.primaryCfg.disabled || s.busy));
    }
    ui.btnAlt.hidden = !s.altCfg || won || fail;
    if (s.altCfg) {
      ui.altLabel.innerHTML = s.altCfg.label;
      ui.btnAlt.setAttribute('aria-disabled', String(!!s.altCfg.disabled || s.busy));
    }
    ui.actions.classList.toggle('duo', !ui.btnAlt.hidden && !ui.btnPrimary.hidden);
    ui.levels.querySelectorAll('.lvl').forEach(b => { b.disabled = s.busy; });
    ui.rules.querySelectorAll('li').forEach(li => li.classList.toggle('broken', fail && !!s.failInfo && s.failInfo.rule != null && li.dataset.rule === String(s.failInfo.rule)));
    let m, cls = '';
    if (won) m = winMsg(s);
    else if (fail) m = { t: s.failInfo.title || 'Regra quebrada!', d: s.failInfo.text };
    else if (s.warnMsg) { m = s.warnMsg; cls = 'warn'; }
    else if (s.hintMsg) { m = s.hintMsg; cls = 'hint'; }
    else m = s.base || { t: '', d: '' };
    ui.msg.className = 'msg ' + cls;
    ui.msg.innerHTML = `<span class="t">${m.t || ''}</span>${m.d ? `<span class="d">${m.d}</span>` : ''}`;
  }

  return { register, start, go, h, svg, retrigger, INK, OL, PIECES, core: JogosCore, games };
})();
