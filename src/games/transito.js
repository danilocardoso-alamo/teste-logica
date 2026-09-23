/* Trânsito — deslize carros e caminhões e tire o carro vermelho do pátio lotado */
(() => {
  // ---------- lógica pura (testável no Node) ----------
  // Pátio 6×6 lido linha a linha. Cada veículo ocupa 2 casas (carro) ou 3 (caminhão) em linha reta e
  // só anda nessa direção. O carro vermelho ('A') fica na 3ª linha e sai pela borda direita.
  const K = typeof JogosCore !== 'undefined' ? JogosCore : require('../kit-core.js');
  const N = 6, SAIDA = 2, FIM = N - 2;     // linha da saída; coluna em que o vermelho encosta na saída

  // Desafios gerados offline: configurações aleatórias, o cluster inteiro de estados alcançáveis e uma BFS
  // a partir dos estados resolvidos; fica o estado mais distante (o mais difícil daquele cluster).
  // Cada item: 2 dígitos com o mínimo exato de movimentos + 36 casas ('.' vazia, 'A' o carro vermelho).
  const BANCO = {
    facil: [
      '04...BBBCCDEE.AAD.....D....FF...GGHH..', '04...BCC.DDB..AA.B....EEFFG.....G..HH.', '04.BCCC..B.....BAAD....ED.F..EG.FHHHG.',
      '04B..C..B..C..BAAC..DE....DE.FFGDE...G', '04B..CC.B...DD.AA.E..FF.E.GGG.H.....H.', '05.B.....BC.D.AACEDFGH.E.FGH....GH....',
      '05.BB.C.DD..C.E.AAC.EFF.GG............', '05.BBC....DC..AADE..FFFE.....GG.....HH', '05BB....CCCDDE...AAE...FFE...G.....GHH',
      '05BBB.....CDDEAAC.FE..G.F..HG....HG...', '06.....BC....BC.AADBE...D.EF.....FGGHH', '06..B.....BCCCAAB...D..EEFD..G.FDHHG..',
      '06.B...C.B..DC.AA.DC.EEEF....GF....GHH', '06B....CBD...C.DAA.E...F.E...FGG......', '06BC...DBC...DAA...DEFFFGGE.....HHH...',
      '07....B.CCC.B.AA..BD.EE..D.FGGGH.F...H', '07..BB.....CD..AACDE.....E.FFF.E..GGHH', '07..BBBC.....CAAD..CE.D.FFE.GGHHE.....',
      '07..BCCC..B.DD..AAEF....EF.....GHH...G', '07B.CC..B.....AAD.....DEFF..DE.G..HHHG',
    ],
    medio: [
      '10...BBB...CDDAA.CEFGHHCEFG.IIJ.GKKKJ.', '10...BCC...B.D..EAADFFE...G.EHIJGKKHIJ', '10..BCDD.EBC.FGEBAAFGHII.J.H...J..KK..',
      '10.BBCCC..DD..AAEFG..HEFGIJHE..IJKKK.I', '11....BB..CC.D.AA..DEEFFFDGGH.IIJJHKKK', '11..BCCCD.BE..DAAE.FDGHHHF.GII..JJ..KK',
      '11.BBB...CCDEFAA.DEF.GGHHF...IJJKKKI..', '11BBCCDE....DE.AAF...G.FHH.G.III.GJJ..', '12.B..CC.BDDEEAAF..G..F.HGIIJJHG....KK',
      '12BBC..D.EC.FDGEAAFDGE.HII...H..JJ.KK.', '12BCCDEEB..DFFBAAD....GHHI..GJJIKKK...', '13B..C..BDDCEEB.AAF.GGH.F...HIIJ..KKKJ',
      '13BBBC..DE.CFFDEAA.G.HH..GIIJ..K..J..K', '13BBCCCDEFFF.DEGAAH.EG..H...I.JJKKI...', '14B.CCC.B.....D..AAEDFFFGE..HIGEJJHIKK',
      '14BBC.DDE.C.F.EAA.F..GGHHHIII..JKKK..J', '14BC.DD.BC.EEFBAAG.FHHIG..J.IG..J.KKK.', '15.BC...DBCEEEDAAF...GGF...HIIJK.H..JK',
      '15B.CDD.B.CEEEAACFGH...FGH.I.JG..I.JKK', '15BB..C...DDC.EAA.CFE.GH.FI.GHJJI..HKK',
    ],
    dificil: [
      '18..BCCCDDB.E.FGAAE.FG...HFGIIIHJJKK.H', '18.BBBC.DDE.CF..EAAFGGGH.FIJJHKKI.LLMM', '18BCCDE.B.FDEGAAF..GHHHIIJKK..LJ..MML.',
      '19..B.....BCDEAAFCDEGGF.H.IJKKHLIJMMML', '19.BCCDD.B.EEF.G.AAF.GHHI.JJK.IL..KMML', '19BCCDDEBFFGHEAAIGHE.JI.H..JKKK..LL.MM',
      '20.BBBCD....CDEFGAADEFGHI.JKGHI.JK.HLL', '20BB...CDDE..CAAE..C.FGHHHIFGJKKILLJMM', '20BBC..DE.CFFDEAAG.DHH.GIIJJKKK...LLMM',
      '21..BCDDEEBCFG.HAAFG.HIIF.JHKL..J.KLMM', '21BBC.D..EC.DF.EAADFGGH..IJ.HKKIJLL..I', '21BCDDEFBCGGEFAA.H.IJ..H.IJ..KKKJLLMMM',
      '22BB.CDDEEEC..FG.AAHFG..IHJKK.IHJLLLMM', '22BBCCCDEEE.FDGAA.FHGII.FHGJK..H.JK.LL', '23.BCCD.EBFFD.EAAGD.H..GIIH.JKKL..J..L',
      '23BCDDEEBCFF.G..HAAGIIHJJG..KLMM..KL..', '24.BCCDD.BE...AAE..FGHHI.FGJJIKLMM.IKL', '24BCCDDEB.FF.EB.GAAE..GHIIJJJH..KKLLL.',
      '25BBB..C.DD.ECAAFGE.H.FGIIH.JJKLMMM.KL', '25BBCDEF..CDEF..AAE...GHH.IJG.KKIJLLMM',
    ],
    muito: [
      '30BCCCDEBFFFDEAAG.D.H.GIIJHKKL.J...L..', '31.BCCCDEB..FDEBAAFGHHI.FG..IJJ..KKLL.', '32BBBCCD..EFFDAAE.G..HHHGIJ..KKIJ..LL.',
      '32BBBCDD.EEC...AAFG.HHHFGI..JKKILLJMMI', '33B..CCDB...EDFAA.EGFHIJJGFHIKLLMMIK..', '33BBCC..DEEFG.DAAFG.HHIF...JI....JKKLL',
      '34.BCCC..B.DEEFAAD.GF.HIIGJ.HKKGJ.HLLL', '34BBBCCDEEFGGDAAFH..IJJHKKILLL........', '35..BCDD..BC.EAABF.E...FGGH.II.JHKKK.J',
      '35BBB.CDEE..CDAA..F.GHIIF.GHJKK.LLJ...', '36BBBCC..DDEEFAAG..FHHGI.JKLLI.JKMMINN', '36BCDDEEBCFGHHAAFG..IIF..JK.LL.JKMMM.J',
      '37BCCC.DB.EEEDAA.FGHIIJFGH..JKLL...KMM', '37BCCD..B.EDFFGHEAAIGH...I..JKKLMMJNNL', '38B..CCCB..DE.AA.DE.FFFGE...HGIIJJH...',
      '38BB.C..DE.C.FDEAAGFDHHIGF..JIKK..JLLL', '39.BBB.C..DEECAAD..FG.DHHFGIIIJ.KKLLJ.', '39BBCDD...C.E.F.AAEGFHHHEGF..IJJKK.I..',
      '40B.CCCDBEEF.DAAGFHDIIGJH....JKKLLMM..', '40BBC.....CDDDEAAFGHEIIFGHJ..F.KJ.LLLK',
    ],
  };

  const cellOf = (v, q) => (v.h ? v.fixed * N + q : q * N + v.fixed);   // casa da q-ésima posição da faixa do veículo
  // Lê um tabuleiro de 36 casas. Veículo: { id, h (horizontal?), len, fixed (linha ou coluna da faixa) }.
  // Posição de cada veículo = coluna (horizontal) ou linha (vertical) da sua primeira casa. O vermelho é o 0.
  function parse(str) {
    const found = new Map();
    for (let c = 0; c < N * N; c++) {
      const ch = str[c];
      if (ch === '.') continue;
      if (!found.has(ch)) found.set(ch, []);
      found.get(ch).push(c);
    }
    const ids = [...found.keys()].sort((a, b) => (a === 'A' ? -1 : b === 'A' ? 1 : 0));
    const v = [], start = [];
    for (const id of ids) {
      const cells = found.get(id), c0 = cells[0], h = cells.length > 1 && cells[1] === c0 + 1;
      v.push({ id, h, len: cells.length, fixed: h ? Math.floor(c0 / N) : c0 % N });
      start.push(h ? c0 % N : Math.floor(c0 / N));
    }
    return { v, start };
  }
  const entrada = item => ({ min: +item.slice(0, 2), puz: parse(item.slice(2)) });
  const faixa = id => { const m = BANCO[id].map(x => +x.slice(0, 2)); return [Math.min(...m), Math.max(...m)]; };

  // g[casa] = índice do veículo que a ocupa, ou -1
  function grid(puz, pos) {
    const g = new Int8Array(N * N).fill(-1);
    puz.v.forEach((v, i) => { for (let j = 0; j < v.len; j++) g[cellOf(v, pos[i] + j)] = i; });
    return g;
  }
  // Menor e maior posição que o veículo i alcança deslizando por casas livres.
  function range(puz, pos, i, g = grid(puz, pos)) {
    const v = puz.v[i];
    let lo = pos[i], hi = pos[i];
    while (lo > 0 && g[cellOf(v, lo - 1)] < 0) lo--;
    while (hi + v.len < N && g[cellOf(v, hi + v.len)] < 0) hi++;
    return [lo, hi];
  }
  const solved = pos => pos[0] === FIM;

  // BFS a partir de `start` até o vermelho encostar na saída. Um movimento = deslizar um veículo qualquer
  // número de casas livres. Estados viram números (posições em base mista). Devolve { dist, path } ou null.
  function solve(puz, start, limit = 6e5) {
    const n = puz.v.length, rad = [], mul = [];
    for (let i = 0, m = 1; i < n; i++) { rad.push(N + 1 - puz.v[i].len); mul.push(m); m *= rad[i]; }
    const dec = k => { const p = []; for (let i = 0; i < n; i++) { const x = k % rad[i]; p.push(x); k = (k - x) / rad[i]; } return p; };
    if (solved(start)) return { dist: 0, path: [] };
    const k0 = start.reduce((s, x, i) => s + x * mul[i], 0);
    const lanes = puz.v.map(v => Array.from({ length: N }, (_, q) => cellOf(v, q)));
    const prev = new Map([[k0, -1]]);
    const g = new Int8Array(N * N);
    let frontier = [k0], goal = -1;
    while (frontier.length && goal < 0) {
      const next = [];
      for (let f = 0; f < frontier.length && goal < 0; f++) {
        const k = frontier[f], p = dec(k);
        g.fill(-1);
        for (let i = 0; i < n; i++) for (let j = 0; j < puz.v[i].len; j++) g[lanes[i][p[i] + j]] = i;
        for (let i = 0; i < n && goal < 0; i++) {
          const ln = lanes[i], len = puz.v[i].len, a = p[i];
          for (let dir = -1; dir <= 1 && goal < 0; dir += 2) {
            for (let q = a + dir; q >= 0 && q + len <= N && g[ln[dir < 0 ? q : q + len - 1]] < 0; q += dir) {
              const nk = k + (q - a) * mul[i];
              if (prev.has(nk)) continue;
              prev.set(nk, k);
              if (i === 0 && q === FIM) { goal = nk; break; }
              next.push(nk);
            }
          }
        }
      }
      if (prev.size > limit) return null;
      frontier = next;
    }
    if (goal < 0) return null;
    const keys = [];
    for (let k = goal; k !== -1; k = prev.get(k)) keys.unshift(k);
    const path = [];
    for (let s = 1; s < keys.length; s++) {
      const a = dec(keys[s - 1]), b = dec(keys[s]), i = a.findIndex((x, j) => x !== b[j]);
      path.push({ i, from: a[i], to: b[i] });
    }
    return { dist: path.length, path };
  }

  const logic = { N, SAIDA, FIM, BANCO, parse, entrada, faixa, cellOf, grid, range, solved, solve };
  if (typeof module !== 'undefined' && module.exports) { module.exports = logic; return; }

  // ---------- interface ----------
  const INK = '#2A2433', VIDRO = '#CDEAF7', FAROL = '#FFF1B8', ESTRELA = '#FFD84D';
  // Tons próprios, além das cores de peça do kit (o vermelho fica só para o carro que precisa sair).
  const TONS = [['verde-limão', '#A3CC4A'], ['marrom', '#A86E3A'], ['azul-claro', '#72BDEB'], ['lilás', '#C29FEA'], ['cinza', '#97A3AF'],
    ['vinho', '#9C3B63'], ['azul-marinho', '#34539C'], ['verde-escuro', '#2D7A55'], ['mostarda', '#C9951C'], ['bege', '#E3CFA2']];
  const mix = (hex, alvo, t) => {
    const a = parseInt(hex.slice(1), 16), b = parseInt(alvo.slice(1), 16);
    const c = s => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
    return '#' + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1);
  };
  const cap = s => s[0].toUpperCase() + s.slice(1);

  // Veículo visto de cima, desenhado de frente para a direita (comprimento L × largura T) e girado conforme `frente`.
  function desenho(v, W, H, cor, frente, vermelho) {
    const L = v.h ? W : H, T = v.h ? H : W;
    const f = x => Math.round(x * 100) / 100;
    const ol = `stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"`, fino = `stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"`;
    const ret = (x, y, w, h, rx, fill, st = ol) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}" fill="${fill}" ${st}/>`;
    const pol = (pts, fill) => `<polygon points="${pts.map(p => f(p[0]) + ',' + f(p[1])).join(' ')}" fill="${fill}" ${fino}/>`;
    const vidro = (x0, x1, a, b) => pol([[x0, T * a], [x1, T * b], [x1, T * (1 - b)], [x0, T * (1 - a)]], VIDRO);
    const farois = x => [0.26, 0.74].map(y => `<ellipse cx="${f(x)}" cy="${f(T * y)}" rx="${f(T * 0.05)}" ry="${f(T * 0.075)}" fill="${FAROL}" ${fino}/>`).join('');
    const estrela = (cx, cy, R) => pol(Array.from({ length: 10 }, (_, k) => {
      const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? R * 0.45 : R;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    }), ESTRELA);
    const claro = mix(cor, '#FFFFFF', 0.3), s = [];
    if (v.len === 2) {
      s.push(ret(0.8, 0.8, L - 1.6, T - 1.6, T * 0.3, cor));
      s.push(vidro(L * 0.19, L * 0.29, 0.21, 0.18));                               // vidro traseiro
      s.push(ret(L * 0.29, T * 0.18, L * 0.29, T * 0.64, T * 0.1, claro, fino));    // teto
      s.push(vidro(L * 0.72, L * 0.58, 0.12, 0.18));                               // para-brisa
      s.push(farois(L - T * 0.14));
      if (vermelho) s.push(estrela(L * 0.435, T / 2, T * 0.22));
    } else {
      const cab = Math.min(L * 0.3, T * 0.95), xc = L - cab, xb = xc - T * 0.08;
      s.push(ret(0.8, 0.8, xb - 0.8, T - 1.6, T * 0.16, cor));                    // baú
      s.push(ret(T * 0.16, T * 0.17, xb - T * 0.32, T * 0.66, T * 0.08, claro, fino));
      for (let k = 1; k <= 3; k++) {
        const x = T * 0.16 + (xb - T * 0.32) * k / 4;
        s.push(`<path d="M${f(x)} ${f(T * 0.17)}V${f(T * 0.83)}" stroke="${INK}" stroke-width="1.2" stroke-opacity=".35"/>`);
      }
      s.push(`<rect x="${f(xb - 1)}" y="${f(T * 0.38)}" width="${f(xc - xb + 2)}" height="${f(T * 0.24)}" fill="${INK}"/>`);
      s.push(ret(xc, 0.8, cab - 0.8, T - 1.6, T * 0.26, cor));                     // cabine
      s.push(ret(xc + cab * 0.1, T * 0.18, cab * 0.34, T * 0.64, T * 0.08, claro, fino));
      s.push(vidro(xc + cab * 0.66, xc + cab * 0.44, 0.12, 0.18));
      s.push(farois(L - T * 0.14));
    }
    const tf = { r: '', l: `translate(${W} ${H}) rotate(180)`, d: `translate(${W} 0) rotate(90)`, u: `translate(0 ${H}) rotate(-90)` }[frente];
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false"><g${tf ? ` transform="${tf}"` : ''}>${s.join('')}</g></svg>`;
  }

  const ICON = `<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round">
    <rect x="3" y="8" width="48" height="48" rx="7" fill="#A9BBB3"/><rect x="7" y="12" width="40" height="40" rx="3.5" fill="#E4ECE8" stroke-width="1"/>
    <path d="M17 12v40M27 12v40M37 12v40M7 22h40M7 32h40M7 42h40" fill="none" stroke="#C3D0CA" stroke-width="1"/>
    <rect x="46" y="22" width="17.5" height="10" fill="#E4ECE8" stroke="none"/><path d="M47.5 22H64M47.5 32H64" fill="none"/>
    <path d="M52 27h8.5M56.8 23.2l3.8 3.8-3.8 3.8" fill="none" stroke="#2C8249" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="18" y="13.2" width="18" height="7.6" rx="2.6" fill="#3E7BD9"/><path d="M21 14.8h2.6v4.4H21z" fill="#CDEAF7" stroke-width="1.1"/>
    <rect x="8.2" y="33" width="7.6" height="18" rx="2.6" fill="#F2C230"/><path d="M9.8 44.4h4.4V47H9.8z" fill="#CDEAF7" stroke-width="1.1"/>
    <rect x="18" y="43.2" width="18" height="7.6" rx="2.6" fill="#F08A24"/><path d="M30.4 44.8H33v4.4h-2.6z" fill="#CDEAF7" stroke-width="1.1"/>
    <rect x="38.2" y="33" width="7.6" height="18" rx="2.6" fill="#3FA66B"/><path d="M39.8 36h4.4v2.6h-4.4z" fill="#CDEAF7" stroke-width="1.1"/>
    <path d="M8.5 25h5M7.5 29h6" fill="none" stroke-linecap="round"/>
    <rect x="18" y="23.2" width="18" height="7.6" rx="2.6" fill="#E5484D"/><path d="M30.4 24.8H33v4.4h-2.6z" fill="#CDEAF7" stroke-width="1.1"/>
    <path d="M25.5 24.2l.8 1.7 1.9.2-1.4 1.3.4 1.9-1.7-1-1.7 1 .4-1.9-1.4-1.3 1.9-.2z" fill="#FFD84D" stroke-width="1"/></g></svg>`;
  const ICO_EIXO = `<svg viewBox="0 0 34 34"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round"><rect x="8" y="6" width="18" height="10" rx="3" fill="#3E7BD9"/><path d="M20.4 7.9h2.8v6.2h-2.8z" fill="#CDEAF7" stroke-width="1.1"/></g><path d="M5 25h24M9 21l-4 4 4 4M25 21l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const ICO_LIVRE = `<svg viewBox="0 0 34 34"><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round"><rect x="2" y="12" width="15" height="10" rx="3" fill="#F2C230"/><path d="M11.6 13.9h2.6v6.2h-2.6z" fill="#CDEAF7" stroke-width="1.1"/><rect x="23" y="3" width="9" height="28" rx="3" fill="#8B5CD6"/></g><path d="M17.8 13.6l3.6 6.8M21.4 13.6l-3.6 6.8" stroke="#C23A2E" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  const ICO_SAIDA = `<svg viewBox="0 0 34 34"><path d="M22 2.5v8M22 23.5v8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round"><rect x="2.5" y="12" width="16" height="10" rx="3" fill="#E5484D"/><path d="M13 13.9h2.6v6.2H13z" fill="#CDEAF7" stroke-width="1.1"/><path d="M8.2 13.9l.9 1.9 2 .2-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.2z" fill="#FFD84D" stroke-width="1"/></g><path d="M24.5 17h7M28.5 13.5l3.5 3.5-3.5 3.5" fill="none" stroke="#3FA66B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const ICO_CONTA = `<svg viewBox="0 0 34 34"><rect x="2.5" y="8" width="13" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.4 2" opacity=".55"/><g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round"><rect x="18.5" y="8" width="13" height="10" rx="3" fill="#2BA3A3"/><path d="M25.6 9.9h2.4v6.2h-2.4z" fill="#CDEAF7" stroke-width="1.1"/></g><path d="M5 26.5h23M24.5 23l3.5 3.5-3.5 3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const SETA = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14.5M12.5 5.5 19 12l-6.5 6.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const CSS = `
  .tr-wrap{position:relative;flex:none;margin:2px auto}
  .tr-lot{position:absolute;left:0;top:0;width:calc(6*var(--tr-cell) + 2*var(--tr-frame));height:calc(6*var(--tr-cell) + 2*var(--tr-frame));border-radius:calc(var(--tr-frame) + var(--tr-cell)*.2);background:var(--board-line);box-shadow:0 0 0 1.6px #2A2433}
  .tr-floor{position:absolute;inset:var(--tr-frame);border-radius:calc(var(--tr-cell)*.18);background:var(--board-2);box-shadow:inset 0 0 0 1.6px color-mix(in srgb,#2A2433 22%,transparent)}
  .tr-exit{position:absolute;left:calc(6*var(--tr-cell) + var(--tr-frame) - 2px);top:calc(2*var(--tr-cell) + var(--tr-frame));width:calc(var(--tr-frame) + var(--tr-exit) + 2px);height:var(--tr-cell);padding-left:calc(var(--tr-frame) + 2px);display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--ok) 14%,var(--board-2));color:var(--ok)}
  .tr-exit::before{content:"";position:absolute;left:2px;right:0;top:0;bottom:0;border-block:1.6px solid #2A2433}
  .tr-exit svg{position:relative;display:block;width:min(86%,26px);height:auto}
  .tr-grid{position:absolute;left:var(--tr-frame);top:var(--tr-frame);width:calc(6*var(--tr-cell));height:calc(6*var(--tr-cell))}
  .tr-cell{position:absolute;left:0;top:0;width:calc(var(--tr-cell) - 4px);height:calc(var(--tr-cell) - 4px);transform:translate(calc(var(--c)*var(--tr-cell) + 2px),calc(var(--r)*var(--tr-cell) + 2px));border-radius:calc(var(--tr-cell)*.16);background:var(--board);box-shadow:inset 0 0 0 1px var(--board-line)}
  .tr-cell.lane{background:color-mix(in srgb,var(--ok) 8%,var(--board))}
  .tr-cell.reach{cursor:pointer}
  .tr-cell.reach::after{content:"";position:absolute;inset:34%;border-radius:50%;background:var(--focus);opacity:.5}
  .tr-car{position:absolute;left:0;top:0;margin:0;padding:0;border:0;background:none;color:inherit;font:inherit;cursor:grab;touch-action:none;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;z-index:1;transform:translate(calc(var(--x)*var(--tr-cell) + var(--tr-g)),calc(var(--y)*var(--tr-cell) + var(--tr-g)));transition:transform .18s cubic-bezier(.3,.7,.4,1),box-shadow .15s}
  .tr-car svg{display:block;width:100%;height:100%;overflow:visible;pointer-events:none;filter:drop-shadow(0 2px 0 rgba(0,0,0,.2))}
  .tr-car:focus{outline:none}
  .tr-car:focus-visible,.tr-car.sel{outline:3px solid var(--focus);outline-offset:2px}
  .tr-car.drag{transition:box-shadow .15s;cursor:grabbing;z-index:3}
  .tr-car.drag svg{filter:drop-shadow(0 5px 5px rgba(0,0,0,.28))}
  .tr-car.hinted{box-shadow:0 0 0 3px var(--hint),0 0 16px 2px var(--hint)}
  .tr-car.nope{animation:tr-nope-h .38s ease-in-out}
  .tr-car.vt.nope{animation-name:tr-nope-v}
  .tr-car.out{transition:transform .62s cubic-bezier(.5,0,.75,.2),opacity .3s ease-in .32s;opacity:0}
  .tr-car.gone{opacity:0}
  .tr-ghost{position:absolute;left:0;top:0;transform:translate(calc(var(--x)*var(--tr-cell) + var(--tr-g)),calc(var(--y)*var(--tr-cell) + var(--tr-g)));border:3px dashed var(--hint);border-radius:calc(var(--tr-cell)*.22);background:color-mix(in srgb,var(--hint) 18%,transparent);pointer-events:none;animation:tr-pulse 1.3s ease-in-out infinite}
  .tr-wrap.instant .tr-car,.tr-wrap.instant .tr-ghost{transition:none}
  .tr-wrap.fim .tr-car{cursor:default}
  @keyframes tr-nope-h{20%{translate:-5px 0}40%{translate:5px 0}60%{translate:-3px 0}80%{translate:3px 0}}
  @keyframes tr-nope-v{20%{translate:0 -5px}40%{translate:0 5px}60%{translate:0 -3px}80%{translate:0 3px}}
  @keyframes tr-pulse{50%{opacity:.5}}
  `;

  // Sorteio do desafio: "Recomeçar" (mesma semente) repete o mesmo; "Novo desafio" evita os que saíram há pouco.
  const escolhas = new Map(), recentes = {};
  function sortear(ctx, total) {
    const r = ctx.rng();                                  // consome sempre o mesmo número: cores e frentes não mudam
    const chave = ctx.level.id + ':' + ctx.seed;
    if (escolhas.has(chave)) return escolhas.get(chave);
    const rec = recentes[ctx.level.id] || (recentes[ctx.level.id] = []);
    const livres = [];
    for (let i = 0; i < total; i++) if (!rec.includes(i)) livres.push(i);
    const i = livres.length ? livres[Math.floor(r * livres.length)] : Math.floor(r * total);
    rec.push(i);
    if (rec.length > total / 2) rec.shift();
    escolhas.set(chave, i);
    return i;
  }
  const veiculos = id => { const q = BANCO[id].map(x => parse(x.slice(2)).v.length); return [Math.min(...q), Math.max(...q)]; };

  Jogos.register({
    id: 'transito',
    name: 'Trânsito',
    tagline: 'Deslize carros e caminhões e tire o carro vermelho do pátio lotado.',
    icon: ICON,
    css: CSS,
    metric: { label: 'Movimentos', unit: ['movimento', 'movimentos'] },
    generated: true,
    levels: [
      { id: 'facil', name: 'Fácil', blurb: (lo, hi) => `Poucos bloqueios: dá para sair em ${lo} a ${hi} movimentos.` },
      { id: 'medio', name: 'Médio', blurb: (lo, hi) => `Mais veículos no caminho: a ordem dos movimentos começa a pesar (${lo} a ${hi} movimentos).` },
      { id: 'dificil', name: 'Difícil', blurb: (lo, hi) => `Engarrafamento: abra espaço antes de abrir o caminho (${lo} a ${hi} movimentos).` },
      { id: 'muito', name: 'Muito difícil', blurb: (lo, hi) => `Os pátios mais travados: de ${lo} a ${hi} movimentos na melhor solução.` },
    ].map(l => {
      const [lo, hi] = faixa(l.id), [v0, v1] = veiculos(l.id);
      return Object.assign(l, { blurb: l.blurb(lo, hi), sub: `<span class="cnt">${v0}–${v1} veículos · </span>mín. ${lo}–${hi}` });
    }),
    rules: () => [
      { key: 'eixo', icon: ICO_EIXO, html: 'Cada veículo anda <b>só na sua direção</b>: para a frente e para trás, na horizontal ou na vertical.' },
      { key: 'livre', icon: ICO_LIVRE, html: 'Ele desliza por <b>casas livres</b>: não passa por cima de outro veículo nem atravessa as paredes do pátio.' },
      { key: 'saida', icon: ICO_SAIDA, html: 'Leve o <b>carro vermelho</b>, o da estrela, até a <b>saída</b> na borda direita da 3ª linha.' },
      { key: 'conta', icon: ICO_CONTA, html: '<b>Um movimento</b> é deslizar um veículo quantas casas quiser.' },
    ],
    how: 'Arraste um veículo ao longo da sua direção. Ou toque nele (ou chegue nele com <b>Tab</b>) e depois toque numa casa marcada ou use as <b>setas</b>; <b>Shift</b> + seta desliza até onde der. Mexer no mesmo veículo várias vezes seguidas conta como um só movimento.',

    mount(ctx) {
      const { h } = ctx;
      const lista = BANCO[ctx.level.id];
      const { min, puz } = entrada(lista[sortear(ctx, lista.length)]);
      const n = puz.v.length, pos = puz.start.slice(), hist = [];
      const paleta = ctx.rng.shuffle([...ctx.PIECES.slice(1).map(p => [p.id, p.fill]), ...TONS]);
      const cores = puz.v.map((v, i) => (i === 0 ? ['vermelho', ctx.PIECES[0].fill] : paleta[(i - 1) % paleta.length]));
      const frente = puz.v.map((v, i) => (i === 0 ? 'r' : v.h ? (ctx.rng() < 0.5 ? 'r' : 'l') : (ctx.rng() < 0.5 ? 'u' : 'd')));
      const nome = i => (i === 0 ? 'carro vermelho' : `${puz.v[i].len === 3 ? 'caminhão' : 'carro'} ${cores[i][0]}`);
      let moves = 0, sel = null, hint = null, drag = null, busy = false, L = null, travado = false, saiu = false;
      ctx.setMin(min);

      const wrap = h('div', { class: 'tr-wrap' });
      const gridEl = h('div', { class: 'tr-grid', role: 'group', 'aria-label': `Pátio de 6 por 6 com ${n} veículos. A saída fica na borda direita da 3ª linha.` });
      const cells = Array.from({ length: N * N }, (_, c) => h('div', {
        class: 'tr-cell' + (Math.floor(c / N) === SAIDA ? ' lane' : ''), 'data-c': c, style: { '--c': c % N, '--r': Math.floor(c / N) },
      }));
      const ghost = h('div', { class: 'tr-ghost', hidden: true });
      const els = puz.v.map((v, i) => h('button', { type: 'button', class: `tr-car ${v.h ? 'hz' : 'vt'}`, 'data-i': i }));
      gridEl.append(...cells, ghost, ...els);
      wrap.append(h('div', { class: 'tr-lot' }, h('div', { class: 'tr-floor' })), h('div', { class: 'tr-exit', 'aria-hidden': 'true', html: SETA }), gridEl);
      ctx.board.append(wrap);

      const caixa = (v, cell, g) => [(v.h ? v.len : 1) * cell - 2 * g, (v.h ? 1 : v.len) * cell - 2 * g];
      ctx.onResize(w => {
        const cs = getComputedStyle(ctx.board);
        const inner = w - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
        const celula = (fr, ex) => Math.max(30, Math.min(66, Math.floor((inner - 2 * fr - ex) / N)));
        let cell = 48, fr = 8, ex = 24;
        for (let k = 0; k < 3; k++) {
          cell = celula(fr, ex);
          fr = Math.round(Math.min(12, Math.max(6, cell * 0.16)));
          ex = Math.round(Math.min(34, Math.max(16, cell * 0.5)));
        }
        cell = celula(fr, ex);
        const g = Math.max(2, Math.round(cell * 0.06));
        L = { cell, g };
        Object.entries({ '--tr-cell': cell + 'px', '--tr-g': g + 'px', '--tr-frame': fr + 'px', '--tr-exit': ex + 'px' })
          .forEach(([k, v]) => wrap.style.setProperty(k, v));
        wrap.style.width = 6 * cell + 2 * fr + ex + 'px';
        wrap.style.height = 6 * cell + 2 * fr + 'px';
        els.forEach((el, i) => {
          const [W, H] = caixa(puz.v[i], cell, g);
          el.style.width = W + 'px';
          el.style.height = H + 'px';
          el.style.borderRadius = Math.round((cell - 2 * g) * 0.26) + 'px';
          el.innerHTML = desenho(puz.v[i], W, H, cores[i][1], frente[i], i === 0);
        });
        wrap.classList.add('instant');
        render();
        void wrap.offsetWidth;
        wrap.classList.remove('instant');
      });

      const setXY = (i, p) => {
        const v = puz.v[i];
        els[i].style.setProperty('--x', v.h ? p : v.fixed);
        els[i].style.setProperty('--y', v.h ? v.fixed : p);
      };
      function rotulo(i) {
        const v = puz.v[i], p = pos[i];
        const onde = v.h ? `linha ${v.fixed + 1}, colunas ${p + 1} a ${p + v.len}` : `coluna ${v.fixed + 1}, linhas ${p + 1} a ${p + v.len}`;
        return `${cap(nome(i))}, ${v.h ? 'horizontal' : 'vertical'}, ${onde}${i === 0 ? '. Leve-o até a saída, à direita da linha 3' : ''}`;
      }
      const livre = () => { const g = grid(puz, pos); for (let c = pos[0] + 2; c < N; c++) if (g[SAIDA * N + c] >= 0) return false; return true; };

      function render() {
        if (!L) return;
        const g = grid(puz, pos);
        els.forEach((el, i) => {
          if (!(drag && drag.moved && drag.i === i)) setXY(i, i === 0 && saiu ? N + 2 : pos[i]);
          el.classList.toggle('sel', sel === i);
          el.classList.toggle('hinted', !!hint && hint.i === i);
          el.setAttribute('aria-label', rotulo(i));
        });
        const reach = new Set();
        if (sel != null && !busy && ctx.status === 'play') {
          const v = puz.v[sel], [lo, hi] = range(puz, pos, sel, g);
          for (let q = lo; q < hi + v.len; q++) if (g[cellOf(v, q)] < 0) reach.add(cellOf(v, q));
        }
        cells.forEach((el, c) => el.classList.toggle('reach', reach.has(c)));
        travado = sel != null && !reach.size;
        ghost.hidden = !hint;
        if (hint) {
          const v = puz.v[hint.i], [W, H] = caixa(v, L.cell, L.g);
          ghost.style.setProperty('--x', v.h ? hint.to : v.fixed);
          ghost.style.setProperty('--y', v.h ? v.fixed : hint.to);
          ghost.style.width = W + 'px';
          ghost.style.height = H + 'px';
        }
        ctx.controls({ undo: hist.length > 0 && !busy });
        status();
      }
      function status() {
        if (ctx.status !== 'play' || busy) return;
        if (sel != null) {
          const v = puz.v[sel];
          return ctx.say(`${cap(nome(sel))} selecionado`, travado
            ? 'Ele está travado agora: primeiro abra espaço movendo outro veículo.'
            : `Toque em uma casa marcada ou use as setas ${v.h ? '← e →' : '↑ e ↓'} para deslizá-lo.`);
        }
        if (!moves) return ctx.say('Sua vez', 'Arraste os veículos para abrir caminho e leve o carro vermelho até a saída, à direita.');
        if (livre()) return ctx.say('Caminho livre!', 'Agora leve o carro vermelho até a saída.');
        ctx.say('Continue', 'Abra caminho até a saída para o carro vermelho.');
      }

      // Um movimento = deslizar um veículo. Mexer de novo no mesmo veículo, logo em seguida, continua o
      // mesmo movimento (e, se ele voltar para onde estava, o movimento some).
      function mover(i, to) {
        const from = pos[i];
        if (to === from) return render();
        pos[i] = to;
        const ult = hist[hist.length - 1];
        if (ult && ult.i === i) {
          ult.to = to;
          if (ult.to === ult.from) { hist.pop(); moves--; }
        } else { hist.push({ i, from, to }); moves++; }
        hint = null;
        if (ctx.clearHint) ctx.clearHint();              // o contador pode não mudar (mesmo veículo): limpa à mão
        if (ctx.clearWarn) ctx.clearWarn();
        ctx.setMoves(moves);
        render();
        if (solved(pos)) vitoria();
      }
      // Vitória: o vermelho encostou na saída; ele atravessa a abertura, some e só então o kit comemora.
      function vitoria() {
        busy = true; sel = null; hint = null;
        ctx.busy(true);
        wrap.classList.add('fim');
        render();
        ctx.say('Saída livre!', 'O carro vermelho está deixando o pátio.');
        const fim = () => { busy = false; ctx.busy(false); ctx.win(); };
        if (ctx.reduced) { saiu = true; els[0].classList.add('gone'); ctx.later(fim, 150); return; }
        ctx.later(() => {
          saiu = true;
          els[0].classList.add('out');
          setXY(0, N + 2);
          ctx.later(fim, 650);
        }, 200);
      }
      function avisoEixo(i) {
        ctx.retrigger(els[i]);
        ctx.warn('Essa direção não vale', `O ${nome(i)} só anda na ${puz.v[i].h ? 'horizontal (← e →)' : 'vertical (↑ e ↓)'}.`, 'eixo');
      }
      function bloqueado(i, dir) {
        const v = puz.v[i], q = dir < 0 ? pos[i] - 1 : pos[i] + v.len;
        ctx.retrigger(els[i]);
        if (q < 0 || q >= N) return ctx.warn('Fim do pátio', `O ${nome(i)} já está encostado na borda.`, 'livre');
        const j = grid(puz, pos)[cellOf(v, q)];
        ctx.warn('Caminho bloqueado', `O ${nome(j)} está no caminho do ${nome(i)}.`, 'livre');
      }

      // --- arrastar (pointer events, só no eixo do veículo, encaixando nas casas) ---
      function soltar() {
        if (!drag) return;
        const d = drag;
        drag = null;
        d.el.classList.remove('drag');
        try { d.el.releasePointerCapture(d.id); } catch (e) { /* já solto */ }
        render();
      }
      ctx.listen(gridEl, 'pointerdown', e => {
        const el = e.target.closest && e.target.closest('.tr-car');
        if (!el || drag || busy || ctx.status !== 'play') return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const i = +el.dataset.i, [lo, hi] = range(puz, pos, i);
        drag = { i, el, id: e.pointerId, x0: e.clientX, y0: e.clientY, p0: pos[i], lo, hi, f: pos[i], moved: false, eraSel: sel === i };
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* sem captura: os eventos ainda chegam pelo pátio */ }
      });
      ctx.listen(gridEl, 'pointermove', e => {
        if (!drag || e.pointerId !== drag.id || !L) return;
        const v = puz.v[drag.i], dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
        if (!drag.moved) {
          if (Math.hypot(dx, dy) < (e.pointerType === 'mouse' ? 5 : 9)) return;   // abaixo disso ainda é um toque
          drag.moved = true;
          drag.el.classList.add('drag');
          sel = null;
          render();
        }
        drag.f = Math.max(drag.lo, Math.min(drag.hi, drag.p0 + (v.h ? dx : dy) / L.cell));
        setXY(drag.i, drag.f);
      });
      const fimArrasto = (e, cancelou) => {
        if (!drag || e.pointerId !== drag.id) return;
        const d = drag;
        drag = null;
        d.el.classList.remove('drag');
        if (!d.moved) {                                    // toque: seleciona (ou tira a seleção)
          if (cancelou) return;
          sel = d.eraSel ? null : d.i;
          if (sel != null) d.el.focus({ preventScroll: true }); else d.el.blur();
          return render();
        }
        const to = cancelou ? d.p0 : Math.round(d.f);
        if (to !== d.p0) return mover(d.i, to);
        render();                                          // voltou para a mesma casa: não conta
        const v = puz.v[d.i], ao = Math.abs(v.h ? e.clientX - d.x0 : e.clientY - d.y0), cruz = Math.abs(v.h ? e.clientY - d.y0 : e.clientX - d.x0);
        if (!cancelou && L && cruz > L.cell * 0.6 && ao < L.cell * 0.3) avisoEixo(d.i);
      };
      ctx.listen(gridEl, 'pointerup', e => fimArrasto(e, false));
      ctx.listen(gridEl, 'pointercancel', e => fimArrasto(e, true));
      ctx.listen(gridEl, 'lostpointercapture', e => fimArrasto(e, false));

      // --- tocar numa casa marcada leva o veículo selecionado até ela ---
      ctx.listen(gridEl, 'click', e => {
        const cel = e.target.closest && e.target.closest('.tr-cell');
        if (!cel || sel == null || busy || ctx.status !== 'play') return;
        if (!cel.classList.contains('reach')) { sel = null; return render(); }
        const i = sel, v = puz.v[i], c = +cel.dataset.c, q = v.h ? c % N : Math.floor(c / N);
        mover(i, q > pos[i] ? q - v.len + 1 : q);
        if (!busy && ctx.status === 'play') els[i].focus({ preventScroll: true });
      });

      // --- teclado: Tab seleciona, setas deslizam (Shift + seta vai até o fim), Esc solta ---
      ctx.listen(gridEl, 'focusin', e => {
        const el = e.target.closest && e.target.closest('.tr-car');
        if (!el || drag || busy || ctx.status !== 'play') return;
        if (sel !== +el.dataset.i) { sel = +el.dataset.i; render(); }
      });
      ctx.listen(gridEl, 'focusout', e => {
        const to = e.relatedTarget;
        if (to && !gridEl.contains(to) && sel != null) { sel = null; render(); }
      });
      ctx.listen(gridEl, 'keydown', e => {
        const el = e.target.closest && e.target.closest('.tr-car');
        if (!el) return;
        const i = +el.dataset.i;
        if (e.key === 'Escape') { if (sel != null) { sel = null; render(); } return; }
        const seta = { ArrowLeft: [-1, true], ArrowRight: [1, true], ArrowUp: [-1, false], ArrowDown: [1, false] }[e.key];
        if (!seta) return;
        e.preventDefault();
        if (busy || drag || ctx.status !== 'play') return;
        if (sel !== i) { sel = i; render(); }
        const [dir, hz] = seta;
        if (hz !== puz.v[i].h) return avisoEixo(i);
        const [lo, hi] = range(puz, pos, i);
        const to = e.shiftKey ? (dir < 0 ? lo : hi) : pos[i] + dir;
        if (to < lo || to > hi || to === pos[i]) return bloqueado(i, dir);
        mover(i, to);
      });

      status();
      ctx.controls({ undo: false });

      return {
        onHint() {
          if (busy) return;
          soltar();
          const sol = solve(puz, pos);
          if (!sol || !sol.path.length) return;
          const m = sol.path[0], v = puz.v[m.i], casas = Math.abs(m.to - m.from);
          const dir = v.h ? (m.to > m.from ? 'para a direita' : 'para a esquerda') : (m.to > m.from ? 'para baixo' : 'para cima');
          hint = m;
          render();
          const resto = sol.dist === 1 ? 'Daqui, falta só este movimento.' : `Daqui, faltam ${sol.dist} movimentos.`;
          ctx.hint('Dica', `Mova o ${nome(m.i)} ${K.plural(casas, 'casa', 'casas')} ${dir}${m.i === 0 && m.to === FIM ? ', até a saída' : ''}. ${resto}`);
        },
        onUndo() {
          if (busy) return;
          soltar();
          const ult = hist.pop();
          if (!ult) return;
          pos[ult.i] = ult.from;
          moves--;
          hint = null;
          if (ctx.clearHint) ctx.clearHint();
          ctx.setMoves(moves);
          render();
        },
      };
    },
  });
})();
