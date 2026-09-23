// Junta o kit e todos os jogos em um único arquivo: jogos-de-logica.html
// Uso: node build.js
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, 'jogos-de-logica.html');
// Ordem em que os jogos aparecem no menu
const ORDER = ['travessia', 'hanoi', 'balanca', 'jarras', 'senha', 'transito', 'luzes', 'sudoku', 'deslizante', 'rainhas', 'quem-mora-onde'];

const read = p => fs.readFileSync(path.join(SRC, p), 'utf8');
// Opcional: node build.js --only=hanoi,travessia (gera só com esses jogos, útil para testar)
const onlyArg = process.argv.find(a => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice(7).split(',') : null;
const keep = id => !only || only.includes(id);
const found = ORDER.filter(id => keep(id) && fs.existsSync(path.join(SRC, 'games', id + '.js')));
const extra = fs.readdirSync(path.join(SRC, 'games')).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3)).filter(id => !ORDER.includes(id) && keep(id));

const games = [...found, ...extra].map(id => {
  const code = read(`games/${id}.js`);
  if (/<\/script/i.test(code)) throw new Error(`${id}.js contém "</script", o que quebraria a página`);
  try { new Function(code); } catch (e) { throw new Error(`${id}.js tem erro de sintaxe: ${e.message}`); }
  return `/* ===== ${id} ===== */\n${code}`;
});

const html = read('shell.html')
  .replace('/*KIT_CSS*/', () => read('kit.css'))
  .replace('/*KIT_CORE*/', () => read('kit-core.js'))
  .replace('/*KIT_JS*/', () => read('kit.js'))
  .replace('/*GAMES_JS*/', () => games.join('\n\n'));

// O arquivo local leva o doctype (modo padrão do navegador). Na publicação como Artifact ele é removido, porque a plataforma já envolve a página num esqueleto com doctype.
fs.writeFileSync(OUT, '<!doctype html>\n' + html);
console.log(`jogos-de-logica.html: ${games.length} jogos (${[...found, ...extra].join(', ')}), ${(html.length / 1024).toFixed(0)} KB`);
