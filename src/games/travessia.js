/* Travessia do Rio — o teste de QI japonês da jangada */
(() => {
const CSS = `
.board-travessia{--sky-1:#8FCDEB;--sky-2:#DDF1F8;--hill-1:#AFC0E3;--hill-2:#93A9D8;--grass-1:#B3D873;--grass-2:#83B94A;--sand:#E9D092;--water-1:#5DB8DD;--water-2:#2C84B3;--wave:rgba(255,255,255,.6);--bank-label:rgba(27,42,40,.5);--cloud:#FFFFFF;--sun-o:1;--moon-o:0;--star-o:0;padding:0;display:block;min-height:0;background:var(--grass-2)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .board-travessia{--sky-1:#18224A;--sky-2:#3F3E73;--hill-1:#303A6B;--hill-2:#262F5A;--grass-1:#557F3E;--grass-2:#3C6330;--sand:#8E7B53;--water-1:#2A6A93;--water-2:#18466A;--wave:rgba(255,255,255,.28);--bank-label:rgba(228,238,234,.55);--cloud:#5A5F8C;--sun-o:0;--moon-o:1;--star-o:1;}}
:root[data-theme="dark"] .board-travessia{--sky-1:#18224A;--sky-2:#3F3E73;--hill-1:#303A6B;--hill-2:#262F5A;--grass-1:#557F3E;--grass-2:#3C6330;--sand:#8E7B53;--water-1:#2A6A93;--water-2:#18466A;--wave:rgba(255,255,255,.28);--bank-label:rgba(228,238,234,.55);--cloud:#5A5F8C;--sun-o:0;--moon-o:1;--star-o:1;}
.scene{position:relative;width:100%;height:400px;overflow:hidden;background:var(--grass-2);touch-action:manipulation;user-select:none;-webkit-user-select:none}
.tv-bg{position:absolute;left:0;top:0;display:block}
.scene.instant .char,.scene.instant .raft,.scene.instant .tag{transition:none!important}

/* SVG paint via tokens */
.s-sky1{stop-color:var(--sky-1)} .s-sky2{stop-color:var(--sky-2)}
.s-g1{stop-color:var(--grass-1)} .s-g2{stop-color:var(--grass-2)}
.s-w1{stop-color:var(--water-1)} .s-w2{stop-color:var(--water-2)}
.f-hill1{fill:var(--hill-1)} .f-hill2{fill:var(--hill-2)} .f-sand{fill:var(--sand)} .f-cloud{fill:var(--cloud)}
.w{fill:none;stroke:var(--wave);stroke-width:2;stroke-linecap:round}
.sun{opacity:var(--sun-o)} .moon{opacity:var(--moon-o)} .stars{opacity:var(--star-o)}
.bl{fill:var(--bank-label);font:900 11px "Nunito",sans-serif;letter-spacing:.16em}
.bl.on-water{fill:rgba(255,255,255,.85)}
.w.rap{stroke-width:2.4;stroke:rgba(255,255,255,.72)}
.cloud{animation:tv-drift 38s ease-in-out infinite alternate}
.cloud.c2{animation-duration:52s;animation-delay:-20s}
@keyframes tv-drift{to{transform:translateX(34px)}}

/* raft */
.raft{position:absolute;left:0;top:0;width:var(--rw);transition:transform var(--dur,1s) cubic-bezier(.55,0,.3,1);pointer-events:none;will-change:transform}
.raft svg{display:block;width:100%;height:auto;overflow:visible}
.raft.nope .raft-in{animation:tv-nope .38s ease-in-out}
.sail{transform-origin:104px 60px;animation:tv-flutter 2.6s ease-in-out infinite}
@keyframes tv-flutter{50%{transform:scaleX(.9)}}

/* characters */
.char{position:absolute;left:0;top:0;width:var(--cw);height:var(--fh);padding:0;margin:0;border:0;background:none;color:inherit;font:inherit;cursor:pointer;pointer-events:none;-webkit-tap-highlight-color:transparent;transition:transform var(--dur,.4s) cubic-bezier(.55,0,.3,1);will-change:transform}
.char.adult{--fh:var(--ah)} .char.kid{--fh:var(--kh)} .char.pet{--fh:var(--ph)}
.char:focus{outline:none}
.bob{position:absolute;inset:0;display:block}
.fig{position:absolute;left:0;top:0;width:100%;height:var(--fh);overflow:visible;pointer-events:none;transition:filter .2s}
.fig .hit{pointer-events:all;fill:transparent}
.tags{position:absolute;left:0;top:0;width:100%;height:100%;z-index:5000;pointer-events:none}
.tag{position:absolute;left:0;top:0;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;font:900 var(--tfs,12px)/1 "Nunito",sans-serif;padding:3px 7px 3px;border-radius:999px;background:rgba(255,255,255,.94);color:#1B2A28;box-shadow:0 1px 0 rgba(0,0,0,.18);pointer-events:auto;cursor:pointer;transition:transform var(--dur,.4s) cubic-bezier(.55,0,.3,1),background .2s,color .2s;will-change:transform}
.scene.narrow .tag{padding:2px 5px;gap:2px}
.scene.narrow.crowded .tag{padding:2px 3px;gap:1px;letter-spacing:-.02em}
.scene.narrow.crowded .tag svg{width:.8em;height:.8em}
.tag svg{width:1em;height:1em;flex:none}
.tag:hover{background:#FFF7E0}
.tag.focus{outline:3px solid var(--focus);outline-offset:2px}
.char:focus-visible .fig{filter:drop-shadow(0 0 3px var(--focus))}
.bang{position:absolute;right:-6px;top:0;z-index:1;width:22px;height:22px;border-radius:50%;background:var(--danger);color:#fff;font:900 15px/22px "Nunito",sans-serif;text-align:center;transform:scale(0);transition:transform .25s cubic-bezier(.3,1.6,.5,1);box-shadow:0 2px 0 rgba(0,0,0,.2)}
.char.culprit .bang{transform:scale(1)}
.m-worry,.m-joy,.m-sly{display:none}
.char.alarm .m-happy,.char.cheer .m-happy{display:none}
.char.alarm:not(.is-thief) .m-worry{display:inline}
.char.alarm.is-thief .m-sly{display:inline}
.char.cheer .m-joy{display:inline}
.char.alarm .fig{filter:drop-shadow(0 0 4px rgba(194,58,46,.9))}
.tag.alarm{background:var(--danger);color:#fff}
.char.alarm .bob{animation:tv-shake .5s ease-in-out 2}
.char.hinted .fig{filter:drop-shadow(0 0 2px var(--hint)) drop-shadow(0 0 7px var(--hint))}
.tag.hinted{background:var(--hint);color:#1B2A28}
.char.walk .bob{animation:tv-hop var(--dur,.4s) ease-in-out}
.char.nope .bob{animation:tv-nope .38s ease-in-out}
.char.cheer .bob{animation:tv-jump .46s ease-in-out infinite alternate;animation-delay:calc(var(--i) * -90ms)}
@keyframes tv-hop{35%,65%{transform:translateY(-7px)}}
@keyframes tv-nope{20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
@keyframes tv-shake{20%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}80%{transform:rotate(-3deg)}}
@keyframes tv-jump{from{transform:translateY(0)}to{transform:translateY(-12px)}}

`;

/* ---------- Ilustrações ---------- */
const INK = '#2A2433';
const OL = `stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"`;

function face(cx, ey, my, cheeks = true) {
  return `<circle cx="${cx - 5}" cy="${ey}" r="1.9" fill="${INK}"/><circle cx="${cx + 5}" cy="${ey}" r="1.9" fill="${INK}"/>` +
    (cheeks ? `<circle cx="${cx - 8.6}" cy="${ey + 4.2}" r="2.4" fill="#F07F7F" opacity=".45"/><circle cx="${cx + 8.6}" cy="${ey + 4.2}" r="2.4" fill="#F07F7F" opacity=".45"/>` : '') +
    mouths(cx, my);
}
function mouths(cx, my) {
  return `<path class="m-happy" d="M${cx - 3.6} ${my} Q${cx} ${my + 3.4} ${cx + 3.6} ${my}" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>` +
    `<ellipse class="m-worry" cx="${cx}" cy="${my + 1.2}" rx="2.3" ry="2.9" fill="${INK}"/>` +
    `<path class="m-joy" d="M${cx - 4.6} ${my - .6} Q${cx} ${my + 6.4} ${cx + 4.6} ${my - .6} Z" fill="${INK}"/>` +
    `<path class="m-sly" d="M${cx - 4} ${my + 1.2} Q${cx + 1} ${my + 3} ${cx + 4.6} ${my - 1.6}" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>`;
}
const shadowA = `<ellipse cx="32" cy="102" rx="16" ry="3" fill="rgba(0,0,0,.2)"/>`;
const shadowK = `<ellipse cx="32" cy="74" rx="13" ry="2.6" fill="rgba(0,0,0,.2)"/>`;
const hitA = `<rect class="hit" x="10" y="3" width="44" height="100" rx="14" fill="transparent"/>`;
const hitK = `<rect class="hit" x="12" y="5" width="40" height="70" rx="12" fill="transparent"/>`;

function adultBase({ skin, shirt, pants, shoes, arms }) {
  return `<rect x="22" y="70" width="9.5" height="28" rx="3" fill="${pants}"/><rect x="32.5" y="70" width="9.5" height="28" rx="3" fill="${pants}"/>` +
    `<path d="M17.5 101.5 q0-5.5 5.5-5.5 h8.5 v5.5 z" fill="${shoes}"/><path d="M46.5 101.5 q0-5.5 -5.5-5.5 h-8.5 v5.5 z" fill="${shoes}"/>` +
    `<rect x="10" y="42" width="9" height="25" rx="4.5" fill="${arms || shirt}"/><rect x="45" y="42" width="9" height="25" rx="4.5" fill="${arms || shirt}"/>` +
    `<circle cx="14.5" cy="68" r="4" fill="${skin}"/><circle cx="49.5" cy="68" r="4" fill="${skin}"/>` +
    `<rect x="17" y="39" width="30" height="35" rx="9" fill="${shirt}"/>` +
    `<rect x="28" y="32" width="8" height="9" fill="${skin}"/>` +
    `<circle cx="18.6" cy="23.5" r="3" fill="${skin}"/><circle cx="45.4" cy="23.5" r="3" fill="${skin}"/>` +
    `<circle cx="32" cy="22" r="13.5" fill="${skin}"/>`;
}

const ART = {
  pai() {
    const skin = '#E2A57A', hair = '#3B2A20';
    return shadowA + `<g ${OL}>` + adultBase({ skin, shirt: '#2E9E6B', pants: '#3F4466', shoes: '#2B2B2E' }) +
      `<path d="M26.5 39.6 L32 46 L37.5 39.6" fill="#F4EFE4"/>` +
      `<rect x="17.8" y="65" width="28.4" height="5" fill="#6A4327"/>` +
      `<path d="M18.6 20.5 C17.5 9 25 6 32 6 C40 6 47 9.5 45.4 20.5 C43 15.5 37.5 13.2 32 13.4 C26.5 13.6 21.5 15.5 18.6 20.5 Z" fill="${hair}"/></g>` +
      face(32, 21.5, 31, false) +
      `<path d="M26.2 27.8 Q29.2 25.4 32 27.1 Q34.8 25.4 37.8 27.8 Q35 30 32 28.8 Q29 30 26.2 27.8Z" fill="${hair}"/>` + hitA;
  },
  mae() {
    const skin = '#F3C7A2', hair = '#7B4FC2', dress = '#E0567C';
    return shadowA + `<g ${OL}>` +
      `<path d="M17 22 C15 8 25 4.5 32 4.5 C40 4.5 49 8 47 22 L49.5 45 Q41 50 32 49 Q23 50 14.5 45 Z" fill="${hair}"/>` +
      `<rect x="24" y="80" width="6.5" height="18" rx="3" fill="${skin}"/><rect x="33.5" y="80" width="6.5" height="18" rx="3" fill="${skin}"/>` +
      `<path d="M19.5 101.5 q0-4.8 4.8-4.8 h6.6 v4.8z" fill="#8E2F52"/><path d="M44.5 101.5 q0-4.8 -4.8-4.8 h-6.6 v4.8z" fill="#8E2F52"/>` +
      `<rect x="11" y="43" width="8" height="24" rx="4" fill="${skin}"/><rect x="45" y="43" width="8" height="24" rx="4" fill="${skin}"/>` +
      `<rect x="10.5" y="41" width="9" height="11" rx="4.5" fill="${dress}"/><rect x="44.5" y="41" width="9" height="11" rx="4.5" fill="${dress}"/>` +
      `<path d="M23 39 H41 Q46 39 47 44 L52 81 Q52.5 84 49.5 84 H14.5 Q11.5 84 12 81 L17 44 Q18 39 23 39 Z" fill="${dress}"/>` +
      `<path d="M16.3 56 H47.7 L48.2 60.5 H15.8 Z" fill="#F7C548"/>` +
      `<rect x="28" y="32" width="8" height="9" fill="${skin}"/><circle cx="32" cy="22" r="13.2" fill="${skin}"/>` +
      `<path d="M19 21 C19 10 26 7.5 32.5 7.5 C39 7.5 45.5 10.5 45 20 C41 14.5 35 13 30 14.5 C26 15.5 22 17.5 19 21Z" fill="${hair}"/></g>` +
      `<circle cx="18.6" cy="28.5" r="1.8" fill="#F7C548"/><circle cx="45.4" cy="28.5" r="1.8" fill="#F7C548"/>` +
      face(32, 23, 29.5) + hitA;
  },
  policial() {
    const skin = '#9A6240';
    return shadowA + `<g ${OL}>` + adultBase({ skin, shirt: '#2F5FA7', pants: '#223A69', shoes: '#18181C' }) +
      `<path d="M30 40 h4 l1.3 12.5 l-3.3 3 l-3.3-3z" fill="#1B2A4A"/>` +
      `<rect x="19.5" y="45" width="8" height="5" rx="1.5" fill="#28528F"/><rect x="36.5" y="45" width="8" height="5" rx="1.5" fill="#28528F"/>` +
      `<rect x="17.8" y="65" width="28.4" height="5" fill="#1B2335"/><rect x="29.5" y="64.5" width="5" height="6" rx="1" fill="#F2C230"/>` +
      `<path d="M17.5 17.5 C17 9 22 5.5 32 5.5 C42 5.5 47 9 46.5 17.5 Z" fill="#1F3B73"/>` +
      `<rect x="17.5" y="14.5" width="29" height="4.5" fill="#152B55"/>` +
      `<path d="M15.5 18.5 H48.5 Q50.5 18.5 49.3 20.8 Q32 24.6 14.7 20.8 Q13.5 18.5 15.5 18.5Z" fill="#0F1F40"/></g>` +
      `<circle cx="32" cy="11.3" r="2.6" fill="#F2C230"/>` +
      `<path d="M23.5 51 l1.3 2.7 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z" fill="#F2C230"/>` +
      face(32, 25, 31) + hitA;
  },
  ladrao() {
    const skin = '#EFC4A0';
    const stripes = [45, 52, 59, 66].map(y => `<rect x="14" y="${y}" width="36" height="3.4"/>`).join('');
    const armStripes = [47, 54, 61].map(y => `<rect x="10.8" y="${y}" width="7.4" height="3"/><rect x="45.8" y="${y}" width="7.4" height="3"/>`).join('');
    return shadowA +
      `<defs><clipPath id="lz-clip"><rect x="17" y="39" width="30" height="35" rx="9"/></clipPath></defs>` +
      `<g ${OL}>` +
      `<rect x="22" y="70" width="9.5" height="28" rx="3" fill="#3A3B45"/><rect x="32.5" y="70" width="9.5" height="28" rx="3" fill="#3A3B45"/>` +
      `<path d="M17.5 101.5 q0-5.5 5.5-5.5 h8.5 v5.5 z" fill="#1F1F24"/><path d="M46.5 101.5 q0-5.5 -5.5-5.5 h-8.5 v5.5 z" fill="#1F1F24"/>` +
      `<rect x="10" y="42" width="9" height="25" rx="4.5" fill="#F4F2EE"/><rect x="45" y="42" width="9" height="25" rx="4.5" fill="#F4F2EE"/></g>` +
      `<g fill="#26262E">${armStripes}</g>` +
      `<g ${OL}><circle cx="14.5" cy="68" r="4" fill="${skin}"/>` +
      `<path d="M50.5 63 q7.5 2 7.5 10 q0 6.5 -7.5 6.5 q-7.5 0 -7.5 -6.5 q0 -7 7.5 -10z" fill="#BCA68A"/><path d="M47.5 63.5 h6" fill="none"/>` +
      `<rect x="17" y="39" width="30" height="35" rx="9" fill="#F4F2EE"/></g>` +
      `<g clip-path="url(#lz-clip)" fill="#26262E">${stripes}</g>` +
      `<rect x="17" y="39" width="30" height="35" rx="9" fill="none" ${OL}/>` +
      `<g ${OL}><rect x="28" y="32" width="8" height="9" fill="${skin}"/>` +
      `<circle cx="18.6" cy="23.5" r="3" fill="${skin}"/><circle cx="45.4" cy="23.5" r="3" fill="${skin}"/>` +
      `<circle cx="32" cy="22" r="13.5" fill="${skin}"/>` +
      `<path d="M18 17.5 C18 7 24 4.5 32 4.5 C40 4.5 46 7 46 17.5 Z" fill="#5A5F6E"/>` +
      `<rect x="17" y="14.5" width="30" height="5.5" rx="2.75" fill="#474B58"/></g>` +
      `<rect x="19.2" y="19.6" width="25.6" height="7.6" rx="3.8" fill="#1C1C22"/>` +
      `<circle cx="27" cy="23.4" r="2.4" fill="#fff"/><circle cx="37" cy="23.4" r="2.4" fill="#fff"/>` +
      `<circle cx="27.5" cy="23.6" r="1.25" fill="${INK}"/><circle cx="37.5" cy="23.6" r="1.25" fill="${INK}"/>` +
      `<g fill="rgba(60,40,40,.45)"><circle cx="26.5" cy="31.5" r=".7"/><circle cx="29" cy="33.6" r=".7"/><circle cx="35" cy="33.6" r=".7"/><circle cx="37.5" cy="31.5" r=".7"/></g>` +
      mouths(32, 30) + hitA;
  },
};

function kidBase({ skin, top }) {
  return `<rect x="24.5" y="60" width="6" height="11" rx="2.5" fill="${skin}"/><rect x="33.5" y="60" width="6" height="11" rx="2.5" fill="${skin}"/>` +
    `<rect x="14.5" y="39" width="7.5" height="15" rx="3.75" fill="${top}"/><rect x="42" y="39" width="7.5" height="15" rx="3.75" fill="${top}"/>` +
    `<circle cx="18.25" cy="55" r="3.2" fill="${skin}"/><circle cx="45.75" cy="55" r="3.2" fill="${skin}"/>`;
}
function son(skin, shirt, cap, capDark) {
  return shadowK + `<g ${OL}>` + kidBase({ skin, top: shirt }) +
    `<path d="M20.5 74 q0-4.4 4.4-4.4 h6.4 v4.4z" fill="#FFFFFF"/><path d="M43.5 74 q0-4.4 -4.4-4.4 h-6.4 v4.4z" fill="#FFFFFF"/>` +
    `<rect x="22" y="53" width="20" height="9.5" rx="2.5" fill="#34507F"/>` +
    `<rect x="21" y="37" width="22" height="19" rx="7" fill="${shirt}"/>` +
    `<rect x="29" y="32" width="6" height="6" fill="${skin}"/>` +
    `<circle cx="18" cy="23.5" r="2.8" fill="${skin}"/><circle cx="46" cy="23.5" r="2.8" fill="${skin}"/>` +
    `<circle cx="32" cy="22.5" r="14" fill="${skin}"/>` +
    `<path d="M18.2 19 C18 9.5 24 6.5 32 6.5 C40 6.5 46 9.5 45.8 19 Z" fill="${cap}"/>` +
    `<path d="M31 17.6 H49 Q52.2 17.6 51 20.2 Q41 21.6 31 20.6 Z" fill="${capDark}"/></g>` +
    `<rect x="21.8" y="44.5" width="20.4" height="3" fill="rgba(255,255,255,.45)"/>` +
    `<circle cx="32" cy="6.9" r="1.6" fill="${capDark}"/>` +
    face(32, 25, 30) + hitK;
}
function daughter(skin, hair, dress, bow) {
  return shadowK + `<g ${OL}>` +
    `<circle cx="15.5" cy="25" r="6" fill="${hair}"/><circle cx="48.5" cy="25" r="6" fill="${hair}"/>` +
    kidBase({ skin, top: skin }) +
    `<path d="M21 74 q0-4.2 4.2-4.2 h6.2 v4.2z" fill="#7A2340"/><path d="M43 74 q0-4.2 -4.2-4.2 h-6.2 v4.2z" fill="#7A2340"/>` +
    `<rect x="14" y="38" width="8.5" height="7.5" rx="3.75" fill="${dress}"/><rect x="41.5" y="38" width="8.5" height="7.5" rx="3.75" fill="${dress}"/>` +
    `<path d="M25 37 H39 Q43 37 44 41 L47.5 61 Q48 63.5 45.5 63.5 H18.5 Q16 63.5 16.5 61 L20 41 Q21 37 25 37 Z" fill="${dress}"/>` +
    `<rect x="29" y="32" width="6" height="6" fill="${skin}"/>` +
    `<circle cx="32" cy="22.5" r="14" fill="${skin}"/>` +
    `<path d="M18 22.5 C17.5 11 24.5 7.5 32 7.5 C39.5 7.5 46.5 11 46 22.5 C43 16.5 38 15 34 16 C33 18 30 19 27 18.5 C24 18 20.5 19.5 18 22.5 Z" fill="${hair}"/>` +
    `<path d="M15.5 15.5 L20 18 L15.5 20.5 Z M24.5 15.5 L20 18 L24.5 20.5 Z" fill="${bow}"/>` +
    `<path d="M39.5 15.5 L44 18 L39.5 20.5 Z M48.5 15.5 L44 18 L48.5 20.5 Z" fill="${bow}"/></g>` +
    `<path d="M27.5 37.6 Q32 41.6 36.5 37.6" fill="#FFFFFF"/>` +
    face(32, 25.5, 30.5) + hitK;
}
ART.filho1 = () => son('#EDB88B', '#5DAA3C', '#5DAA3C', '#3E7F27');
ART.filho2 = () => son('#D89A6A', '#F08A24', '#F08A24', '#B85F10');
ART.filha1 = () => daughter('#F0BF95', '#7B4FC2', '#F2A0C0', '#F7C548');
ART.filha2 = () => daughter('#E3A87E', '#7A4526', '#F6C945', '#E0567C');
// Segunda dupla do nível "Muito difícil": mesmas peças, outras cores (e um rabo de cavalo na policial)
ART.policial2 = () => ART.policial().replace(/#9A6240/g, '#EDC19C')
  .replace('<g ', `<path d="M43 12 Q56 14 53 36 Q47 29 41 25 Z" fill="#5A3420" ${OL}/><g `);
ART.ladrao2 = () => ART.ladrao().replace(/#EFC4A0/g, '#B7815A').replace(/#5A5F6E/g, '#A63A3A')
  .replace(/#474B58/g, '#842C2C').replace(/lz-clip/g, 'lz-clip2');
ART.cao = () => `<ellipse cx="32" cy="54" rx="21" ry="2.6" fill="rgba(0,0,0,.2)"/>` +
  `<path d="M14 31 Q5 27 7.5 14" fill="none" stroke="${INK}" stroke-width="6.8" stroke-linecap="round"/>` +
  `<path d="M14 31 Q5 27 7.5 14" fill="none" stroke="#C98A4B" stroke-width="3.6" stroke-linecap="round"/>` +
  `<g ${OL}><rect x="15" y="35" width="7" height="18" rx="3" fill="#A86E38"/><rect x="40" y="35" width="7" height="18" rx="3" fill="#A86E38"/>` +
  `<rect x="22" y="37" width="7" height="16.5" rx="3" fill="#C98A4B"/><rect x="47" y="37" width="7" height="16.5" rx="3" fill="#C98A4B"/>` +
  `<ellipse cx="32" cy="32" rx="20" ry="11.5" fill="#C98A4B"/></g>` +
  `<ellipse cx="25" cy="28.5" rx="7" ry="5" fill="#A86E38"/>` +
  `<rect x="42.5" y="24" width="5" height="12" rx="2" fill="#D9463B" ${OL} transform="rotate(-24 45 30)"/>` +
  `<g ${OL}><circle cx="48" cy="20.5" r="11.5" fill="#C98A4B"/><ellipse cx="57" cy="24.5" rx="6.8" ry="5.2" fill="#E8B982"/>` +
  `<path d="M40.5 12 Q34 15 36.5 29 Q42 27 45 16 Z" fill="#8E5A2B"/></g>` +
  `<circle cx="46" cy="37" r="2.1" fill="#F2C230" stroke="${INK}" stroke-width="1"/>` +
  `<ellipse cx="62" cy="22.8" rx="2.5" ry="2" fill="${INK}"/><circle cx="50" cy="17.8" r="1.9" fill="${INK}"/>` +
  `<path class="m-happy" d="M53.8 28.6 Q57 31.4 60.2 28.6" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>` +
  `<ellipse class="m-worry" cx="57" cy="29.8" rx="1.8" ry="2.3" fill="${INK}"/>` +
  `<path class="m-joy" d="M53.4 28 Q57 35.5 60.6 28 Z" fill="${INK}"/><ellipse class="m-joy" cx="57" cy="31.8" rx="1.7" ry="1.3" fill="#F28B9B"/>` +
  `<rect class="hit" x="3" y="6" width="61" height="49" rx="12" fill="transparent"/>`;

// Segundo cachorro do NG+: mesmo desenho, pelagem cinza e coleira azul
ART.cao2 = () => ART.cao().replace(/#C98A4B/g, '#8A8F9C').replace(/#A86E38/g, '#5F6470').replace(/#8E5A2B/g, '#4A4E59')
  .replace(/#E8B982/g, '#E4E0D8').replace('#D9463B', '#3E7BD9');

function figSVG(id, size, cls = 'fig', viewBox) {
  const vb = viewBox || (size === 'pet' ? '0 0 64 56' : size === 'kid' ? '0 0 64 76' : '0 0 64 104');
  return `<svg class="${cls}" viewBox="${vb}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">${ART[id]()}</svg>`;
}

const HELM = `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="10" cy="10" r="5.6"/><path d="M10 1.5v3.2M10 15.3v3.2M1.5 10h3.2M15.3 10h3.2M4 4l2.2 2.2M13.8 13.8L16 16M16 4l-2.2 2.2M6.2 13.8L4 16"/></g><circle cx="10" cy="10" r="1.8" fill="currentColor"/></svg>`;

function raftSVG() {
  return `<svg viewBox="0 0 200 150" aria-hidden="true" focusable="false">` +
    `<ellipse cx="100" cy="137" rx="98" ry="9" fill="rgba(255,255,255,.22)"/>` +
    `<rect x="97" y="12" width="6" height="98" rx="3" fill="#6B4423" ${OL}/>` +
    `<path d="M103 8 l16 5 l-16 5z" fill="#D9463B" ${OL}/>` +
    `<g class="sail"><path d="M104 22 Q152 56 105 96 Z" fill="#FBF6EA" ${OL}/><path d="M104.5 50 Q128 58 105 74" fill="none" stroke="#E0701C" stroke-width="5"/></g>` +
    `<path d="M12 103 H188 L182 116 H18 Z" fill="#C98F52" ${OL}/>` +
    `<path d="M40 104 L36 115 M70 104 L68 115 M130 104 L132 115 M160 104 L164 115" stroke="#9A6534" stroke-width="1.6"/>` +
    `<rect x="8" y="114" width="184" height="14" rx="7" fill="#A86E3A" ${OL}/>` +
    `<rect x="16" y="125" width="168" height="10" rx="5" fill="#8C5A2D" ${OL}/>` +
    `<g fill="#E8CB8F" ${OL}><rect x="44" y="111" width="6" height="21" rx="2"/><rect x="97" y="111" width="6" height="21" rx="2"/><rect x="150" y="111" width="6" height="21" rx="2"/></g>` +
    `<circle cx="14" cy="121" r="7" fill="#DDAA6B" ${OL}/><circle cx="186" cy="121" r="7" fill="#DDAA6B" ${OL}/>` +
    `</svg>`;
}
/* ---------- Elenco, níveis e regras ---------- */
const CAST = {
  pai: { name: 'Pai', role: 'pai', size: 'adult', driver: true },
  mae: { name: 'Mãe', role: 'mae', size: 'adult', driver: true },
  policial: { name: 'Policial', role: 'pol', size: 'adult', driver: true },
  policial2: { name: 'Policial', role: 'pol', size: 'adult', driver: true },
  ladrao: { name: 'Ladrão', role: 'lad', size: 'adult' },
  ladrao2: { name: 'Ladrão', role: 'lad', size: 'adult' },
  filho1: { name: 'Filho', role: 'filho', size: 'kid' },
  filho2: { name: 'Filho', role: 'filho', size: 'kid' },
  filha1: { name: 'Filha', role: 'filha', size: 'kid' },
  filha2: { name: 'Filha', role: 'filha', size: 'kid' },
  cao: { name: 'Cachorro', role: 'cao', size: 'pet' },
  cao2: { name: 'Cachorro', role: 'cao', size: 'pet' },
};
// [artigo definido, artigo indefinido] — o indefinido só aparece quando há dois do mesmo papel
const ARTICLE = {
  pai: ['o pai', 'o pai'], mae: ['a mãe', 'a mãe'], pol: ['o policial', 'um policial'], lad: ['o ladrão', 'um ladrão'],
  filho: ['o filho', 'um filho'], filha: ['a filha', 'uma filha'], cao: ['o cachorro', 'um cachorro'],
};
const FAMILY_ROLES = new Set(['pai', 'mae', 'filho', 'filha', 'cao']);
const LEVELS = [
  { id: 'facil', name: 'Fácil', blurb: 'Família pequena: um filho e uma filha.',
    ids: ['pai', 'mae', 'policial', 'ladrao', 'filho1', 'filha1'] },
  { id: 'medio', name: 'Médio', blurb: 'O teste clássico, com a família completa.',
    ids: ['pai', 'mae', 'policial', 'ladrao', 'filho1', 'filho2', 'filha1', 'filha2'] },
  { id: 'dificil', name: 'Difícil', blurb: 'O cachorro da família vem junto e também precisa de proteção.', novo: 'ladrao',
    ids: ['pai', 'mae', 'policial', 'ladrao', 'filho1', 'filho2', 'filha1', 'filha2', 'cao'] },
  { id: 'muito', name: 'Muito difícil', blurb: 'Dois ladrões, dois policiais e o cachorro no mesmo rio.', novo: 'ladrao',
    ids: ['pai', 'mae', 'policial', 'policial2', 'ladrao', 'ladrao2', 'filho1', 'filho2', 'filha1', 'filha2', 'cao'] },
  // semAjuda: nível sem dica e sem desfazer depois de um erro (quebrou uma regra, recomeça do início)
  { id: 'ngplus', name: 'NG+', extra: true, semAjuda: true, novo: 'criancas', regras: ['criancas'],
    blurb: 'A revanche do Muito difícil, com dois cachorros e crianças que nunca podem ficar sem um adulto responsável.',
    ids: ['pai', 'mae', 'policial', 'policial2', 'ladrao', 'ladrao2', 'filho1', 'filho2', 'filha1', 'filha2', 'cao', 'cao2'] },
  // Nível Danilo: a família do Difícil, mas com três lugares (partida, ilha e chegada) e regras novas
  { id: 'danilo', name: 'Danilo', extra: true, semAjuda: true, novo: ['rota', 'lotacao', 'correnteza', 'caoPai'], regras: ['caoPai'],
    ilha: { cap: 4, correnteza: ['pol'] },
    blurb: 'Menos gente e regras novas: uma ilha no meio do rio, correnteza do lado da chegada e um cachorro que não suporta o ladrão.',
    ids: ['pai', 'mae', 'policial', 'ladrao', 'filho1', 'filho2', 'filha1', 'filha2', 'cao'] },
];
let LV = LEVELS[1];
let REGRAS = [];   // regras extras do nível atual (o NG+ acrescenta 'criancas'; o Danilo, 'caoPai')
let IDS = LV.ids;
const count = role => IDS.filter(id => CAST[id].role === role).length;
const art = (id, indef) => ARTICLE[CAST[id].role][indef && count(CAST[id].role) > 1 ? 1 : 0];
const other = s => (s === 'A' ? 'B' : 'A');
const PLACE = { A: 'Margem de partida', I: 'Na ilha', B: 'Margem de chegada', R: 'Na jangada, no meio do rio' };
// Onde fica cada lugar, em frases: "da ilha", "até a ilha", "na ilha"
const DA = { A: 'da margem de partida', I: 'da ilha', B: 'da margem de chegada' };
const ATE = { A: 'a margem de partida', I: 'a ilha', B: 'a margem de chegada' };
const NA = { A: 'na margem de partida', I: 'na ilha', B: 'na margem de chegada', R: 'na jangada' };
const ORDEM = { A: 0, I: 1, B: 2 };

function initState() {
  return { loc: Object.fromEntries(IDS.map(id => [id, 'A'])), raft: 'A', seats: [null, null], moves: 0 };
}
const clone = s => ({ loc: { ...s.loc }, raft: s.raft, seats: [...s.seats], moves: s.moves });

// Uma regra só: onde há família (ou o cachorro), não pode haver mais ladrões do que policiais.
// Com um ladrão só, isso é exatamente "o ladrão não pode ficar com a família sem o policial".
function check(ids, place) {
  const of = r => ids.filter(id => CAST[id].role === r);
  const thieves = of('lad'), cops = of('pol');
  if (thieves.length > cops.length) {
    const fam = ids.filter(id => FAMILY_ROLES.has(CAST[id].role));
    if (fam.length) return { rule: 'ladrao', place, culprits: thieves, victims: fam, cops: cops.length };
  }
  if (of('pai').length && !of('mae').length && of('filha').length) return { rule: 'pai', place, culprits: of('pai'), victims: of('filha') };
  if (of('mae').length && !of('pai').length && of('filho').length) return { rule: 'mae', place, culprits: of('mae'), victims: of('filho') };
  // NG+: criança nunca fica sem um adulto responsável (pai, mãe ou policial); o ladrão não conta
  if (REGRAS.includes('criancas')) {
    const kids = [...of('filho'), ...of('filha')];
    if (kids.length && !of('pai').length && !of('mae').length && !of('pol').length) return { rule: 'criancas', place, culprits: [], victims: kids };
  }
  // Danilo: o cachorro não suporta o ladrão; os dois só ficam no mesmo lugar com o pai junto
  if (REGRAS.includes('caoPai') && of('cao').length && thieves.length && !of('pai').length) return { rule: 'caoPai', place, culprits: of('cao'), victims: thieves };
  return null;
}

const joinPt = a => (a.length < 2 ? a[0] || '' : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1]);
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
function kidsText(n, role) {
  const total = count(role);
  if (total === 1) return ARTICLE[role][0];
  if (n === total) return role === 'filho' ? 'os dois filhos' : 'as duas filhas';
  return ARTICLE[role][1];
}
function famItems(ids) {
  const n = r => ids.filter(id => CAST[id].role === r).length, out = [];
  if (n('pai')) out.push('o pai');
  if (n('mae')) out.push('a mãe');
  if (n('filho')) out.push(kidsText(n('filho'), 'filho'));
  if (n('filha')) out.push(kidsText(n('filha'), 'filha'));
  if (n('cao')) out.push(count('cao') > 1 ? (n('cao') > 1 ? 'os dois cachorros' : 'um cachorro') : 'o cachorro');
  return out;
}
const famList = ids => joinPt(famItems(ids));
// "de" + artigo: do pai, da mãe, dos dois filhos, de uma filha
const de = s => s.replace(/^(o|a|os|as) /, 'd$1 ').replace(/^(um|uma) /, 'de $1 ');
function failText(f) {
  let why;
  if (f.rule === 'ladrao') {
    const t = f.culprits.length;
    why = f.cops === 0
      ? `${t > 1 ? 'os dois ladrões ficaram' : 'o ladrão ficou'} com ${famList(f.victims)} sem ${count('pol') > 1 ? 'nenhum policial' : 'o policial'} por perto.`
      : `eram ${t} ladrões para só ${f.cops} policial perto ${joinPt(famItems(f.victims).map(de))}.`;
  } else if (f.rule === 'pai') why = `o pai ficou com ${kidsText(f.victims.length, 'filha')} sem a mãe por perto.`;
  else if (f.rule === 'mae') why = `a mãe ficou com ${kidsText(f.victims.length, 'filho')} sem o pai por perto.`;
  else if (f.rule === 'caoPai') {
    const dogs = f.culprits.length > 1 ? 'os dois cachorros ficaram' : `${count('cao') > 1 ? 'um cachorro' : 'o cachorro'} ficou`;
    const thieves = f.victims.length > 1 ? 'os dois ladrões' : art(f.victims[0], true);
    why = `${dogs} com ${thieves} sem o pai junto.`;
  } else why =`${famList(f.victims)} ${f.victims.length > 1 ? 'ficaram' : 'ficou'} sem nenhum adulto responsável por perto (pai, mãe ou policial).`;
  return `${PLACE[f.place]}: ${why}`;
}
const crewNames = ids => ids.map(id => CAST[id].name).join(' + ');
const crewArt = (ids, indef) => joinPt(ids.map(id => art(id, indef)));
const driversText = () => `o pai, a mãe e ${count('pol') > 1 ? 'os policiais' : 'o policial'}`;

/* Rotas da jangada: sem ilha, de uma margem direto para a outra; com ilha, ela sempre para na ilha */
const ROUTES = l => (l.ilha ? { A: ['I'], I: ['A', 'B'], B: ['I'] } : { A: ['B'], B: ['A'] });
// Quem consegue conduzir num trecho: na correnteza (entre a ilha e a chegada) só os papéis que o nível indicar
const driverRoles = (l, a, b) => (l.ilha && l.ilha.correnteza && (a === 'B' || b === 'B') ? l.ilha.correnteza : ['pai', 'mae', 'pol']);

/* Busca em largura por papéis: quem tem o mesmo papel é intercambiável, então o estado é só quantos de cada papel
   estão em cada lugar e onde está a jangada. where: lugar de cada personagem (quem está na jangada conta no lugar
   onde ela está parada). Devolve a menor sequência de travessias: [{ g: quantos de cada papel vão, from, to }]. */
const ROLES = ['pai', 'mae', 'pol', 'lad', 'filho', 'filha', 'cao'];
function solve(l, where, raft) {
  const byRole = ROLES.map(r => l.ids.filter(id => CAST[id].role === r));
  const total = byRole.map(ids => ids.length), R = ROLES.length;
  const at = p => byRole.map(ids => ids.filter(id => where[id] === p).length);
  const sum = c => c.reduce((x, y) => x + y, 0);
  const memo = new Map();
  const ok = c => {   // nenhuma regra quebrada num lugar com estas quantidades
    const k = c.join('');
    if (!memo.has(k)) memo.set(k, !check(byRole.flatMap((ids, i) => ids.slice(0, c[i])), 'X'));
    return memo.get(k);
  };
  const routes = ROUTES(l), cap = l.ilha ? l.ilha.cap : Infinity;
  const key = (a, i, r) => a.join('') + i.join('') + r;
  const a0 = at('A'), i0 = at('I');
  if (!sum(a0) && !sum(i0)) return [];
  const prev = new Map([[key(a0, i0, raft), null]]);
  let frontier = [[a0, i0, raft]];
  while (frontier.length) {
    const next = [];
    for (const [a, i, r] of frontier) {
      const here = r === 'A' ? a : r === 'I' ? i : total.map((t, k) => t - a[k] - i[k]);
      const groups = [];   // grupos de 1 ou 2 com quem está onde a jangada está
      for (let x = 0; x < R; x++) {
        if (!here[x]) continue;
        const g = total.map(() => 0); g[x] = 1; groups.push(g);
        for (let y = x; y < R; y++) if (here[y] > (y === x ? 1 : 0)) { const g2 = g.slice(); g2[y]++; groups.push(g2); }
      }
      for (const g of groups) {
        if (!ok(g)) continue;   // regra quebrada dentro da jangada
        for (const to of routes[r]) {
          const drivers = driverRoles(l, r, to);
          if (!g.some((n, k) => n && drivers.includes(ROLES[k]))) continue;
          const na = a.slice(), ni = i.slice();
          g.forEach((n, k) => {
            if (r === 'A') na[k] -= n; else if (r === 'I') ni[k] -= n;
            if (to === 'A') na[k] += n; else if (to === 'I') ni[k] += n;
          });
          if (to === 'I' && sum(ni) > cap) continue;   // não cabe na ilha
          if (!ok(na) || !ok(ni) || !ok(total.map((t, k) => t - na[k] - ni[k]))) continue;
          const k2 = key(na, ni, to);
          if (prev.has(k2)) continue;
          prev.set(k2, [key(a, i, r), { g, from: r, to }]);
          if (!sum(na) && !sum(ni)) {
            const path = [];
            for (let s = k2; prev.get(s); s = prev.get(s)[0]) path.unshift(prev.get(s)[1]);
            return path;
          }
          next.push([na, ni, to]);
        }
      }
    }
    frontier = next;
  }
  return null;
}
const allAt = (l, p) => Object.fromEntries(l.ids.map(id => [id, p]));
LEVELS.forEach(l => { REGRAS = l.regras || []; l.min = solve(l, allAt(l, 'A'), 'A').length; });
REGRAS = [];

if (typeof module !== 'undefined' && module.exports) { module.exports = { LEVELS, CAST, check, solve }; return; }

/* ---------- Cena: medidas e cenário ---------- */
const RAFT_FEET = 108 / 150;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let G = null;

const FIG = { adult: 104, kid: 76, pet: 56 };
const figH = (g, id) => g.cw * FIG[CAST[id].size] / 64;
function sizes(g, cw) {
  g.cw = cw; g.ah = cw * 104 / 64; g.kh = cw * 76 / 64; g.ph = cw * 56 / 64;
  g.tfs = clamp(cw * 0.18, 10.5, 13);
  g.th = Math.round(g.tfs + 9);
  g.rw = cw * 2.8; g.rh = g.rw * 0.75;
}
// Mais altos atrás, menores na frente
const bySize = () => { const o = { adult: 0, kid: 1, pet: 2 }; return IDS.slice().sort((a, b) => o[CAST[a].size] - o[CAST[b].size]); };

function layout() {
  const W = scene.clientWidth;
  if (!W) return;
  const N = IDS.length, order = bySize(), isl = LV.ilha;
  const g = { W, vert: W < 700, slot: { A: {}, B: {} } };
  if (!g.vert) {
    // Tela larga: margens nas laterais, fileiras de 4 (com a ilha, o rio fica mais largo e as fileiras têm 3)
    g.riverW = isl ? clamp(W * 0.42, 300, 520) : clamp(W * 0.3, 220, 340);
    g.bankW = (W - g.riverW) / 2;
    g.pad = 12;
    const cols = isl ? 3 : 4, colW = (g.bankW - 2 * g.pad) / cols;
    sizes(g, Math.min(colW * 0.92, 78));
    g.sky = clamp(W * 0.12, 64, 120);
    let feet = 0;
    for (let r = 0; r * cols < N; r++) {
      const row = order.slice(r * cols, r * cols + cols);
      const h = Math.max(...row.map(id => figH(g, id)));
      feet = r === 0 ? g.sky + h * 0.72 : feet + g.th + h + 6;
      const off = (cols - row.length) / 2;
      row.forEach((id, c) => {
        g.slot.A[id] = { x: g.pad + (c + off + .5) * colW, feet };
        g.slot.B[id] = { x: W - g.pad - (c + off + .5) * colW, feet };
      });
    }
    g.raftFeet = feet + g.cw * 0.42;
    if (isl) {
      // Ilha no meio do rio, logo acima da linha da jangada: lugares em zigue-zague (de trás e da frente, alternados)
      const step = g.th + 4, front = g.raftFeet - g.ah - g.th - 4, s = g.cw * 0.62;
      g.islot = Array.from({ length: isl.cap }, (_, j) => ({ x: W / 2 + (j - (isl.cap - 1) / 2) * s, feet: front - (j % 2 ? 0 : step) }));
      g.islotOrder = [1, 2, 3, 0, 4, 5].filter(j => j < isl.cap);
      g.isle = { cx: W / 2, top: front - step - 12, bottom: front + g.th + 10, rx: ((isl.cap - 1) * s + g.cw) / 2 + 20 };
    }
    g.H = Math.round(g.raftFeet + g.rh * (0.97 - RAFT_FEET));
  } else {
    // Tela estreita: margens em cima e embaixo, personagens em zigue-zague (adultos atrás, menores entre eles)
    g.pad = 10;
    const k = 2, f = 0.6;
    let cw = Math.min((W - 2 * g.pad) / (1 + f * (N - 1)), 70);
    // Com a ilha, a jangada anda pela direita e a ilha fica à esquerda: os dois precisam caber lado a lado
    if (isl) cw = Math.min(cw, (W - 2 * g.pad - 8) / (1 + f * (isl.cap - 1) + 2.8));
    sizes(g, cw);
    g.sky = 36;
    const s = (W - 2 * g.pad - g.cw) / (N - 1);
    const slots = Array.from({ length: N }, (_, i) => ({ x: g.pad + g.cw / 2 + i * s, row: i % k }))
      .sort((a, b) => a.row - b.row || a.x - b.x);
    const step = g.th + 4, depth = (k - 1) * step;
    const aB = g.sky + g.ah * 0.8;
    g.raftFeetB = aB + depth + g.th + g.ah + 4;
    if (isl) {
      const gap = Math.max(54, g.cw * 0.9);
      g.raftFeetI = g.raftFeetB + gap;
      g.raftFeetA = g.raftFeetI + gap;
      g.raftX = W - g.pad - g.rw;
      const si = Math.min(g.cw * f, (g.raftX - 8 - g.pad - g.cw) / Math.max(1, isl.cap - 1));
      g.islot = Array.from({ length: isl.cap }, (_, j) => ({ x: g.pad + g.cw / 2 + j * si, feet: g.raftFeetI - (j % 2 ? 0 : step) }));
      g.islotOrder = g.islot.map((_, j) => j).reverse();   // enche a partir do lado da jangada
      const x0 = g.islot[0].x - g.cw / 2, x1 = g.islot[isl.cap - 1].x + g.cw / 2;
      g.isle = { cx: (x0 + x1) / 2, top: g.raftFeetI - step - 12, bottom: g.raftFeetI + g.th + 10, rx: (x1 - x0) / 2 + 8 };
    } else {
      g.raftFeetA = g.raftFeetB + Math.max(58, g.cw);
    }
    const aA = g.raftFeetA + g.th + g.ah + 4;
    g.H = Math.round(aA + depth + g.th + 26);
    order.forEach((id, i) => {
      const { x, row } = slots[i];
      g.slot.A[id] = { x, feet: aA + row * step };
      g.slot.B[id] = { x, feet: aB + row * step };
    });
  }
  G = g;
  scene.classList.toggle('narrow', g.vert);
  scene.classList.toggle('crowded', IDS.length >= 12);   // elenco grande no celular: etiquetas mais compactas
  scene.style.height = g.H + 'px';
  for (const [k, v] of Object.entries({ cw: g.cw, ah: g.ah, kh: g.kh, ph: g.ph, th: g.th, rw: g.rw, tfs: g.tfs }))
    scene.style.setProperty('--' + k, v + 'px');
  drawBg();
  scene.classList.add('instant');
  render(0);
  void scene.offsetWidth;
  scene.classList.remove('instant');
}

// Posição da jangada: parada em A, I ou B, ou no meio de um trecho ("A>I") quando uma regra é quebrada a bordo
function raftPos(at) {
  if (at.includes('>')) {
    const [p, q] = at.split('>').map(raftPos);
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, feet: (p.feet + q.feet) / 2 };
  }
  let x, feet;
  if (!G.vert) {
    feet = G.raftFeet;
    x = at === 'A' ? G.bankW - 0.1 * G.rw : at === 'B' ? G.W - G.bankW - 0.9 * G.rw : G.W / 2 - G.rw / 2;
  } else {
    x = G.raftX ?? G.W / 2 - G.rw / 2;
    feet = at === 'A' ? G.raftFeetA : at === 'B' ? G.raftFeetB : G.raftFeetI;
  }
  return { x, y: feet - G.rh * RAFT_FEET, feet };
}

function rng(seed) {
  return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const cloud = (x, y, k, cls) => `<g class="cloud ${cls}"><g class="f-cloud" transform="translate(${x} ${y}) scale(${k})"><ellipse cx="0" cy="0" rx="22" ry="10"/><ellipse cx="-13" cy="3" rx="14" ry="8"/><ellipse cx="14" cy="3" rx="15" ry="8"/><ellipse cx="3" cy="-6" rx="13" ry="9"/></g></g>`;
const reeds = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})" stroke="#5E8A34" stroke-width="2" stroke-linecap="round" fill="none"><path d="M0 0 q-2 -14 -6 -22"/><path d="M4 0 q1 -16 3 -26"/><path d="M8 0 q3 -12 9 -18"/><g fill="#7A4B2A" stroke="none"><rect x="-9" y="-31" width="4" height="10" rx="2" transform="rotate(-14 -7 -26)"/><rect x="5" y="-35" width="4" height="10" rx="2"/></g></g>`;
const tree = (x, base, k) => `<g transform="translate(${x} ${base}) scale(${k})" stroke="${INK}" stroke-width="1.5"><path d="M-7 0 L-4 -62 Q0 -66 4 -62 L7 0Z" fill="#7A4E2D"/><g style="fill:var(--grass-2)"><circle cx="0" cy="-80" r="30"/><circle cx="-25" cy="-62" r="21"/><circle cx="23" cy="-60" r="22"/><circle cx="-5" cy="-104" r="21"/></g><g style="fill:var(--grass-1)" stroke="none"><circle cx="-9" cy="-90" r="13"/><circle cx="16" cy="-72" r="9"/></g></g>`;
const palm = (x, base, k) => `<g transform="translate(${x} ${base}) scale(${k})" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"><path d="M-4 0 Q-7 -32 3 -60 L9 -59 Q1 -32 4 0Z" fill="#8A5A33"/><g style="fill:var(--grass-2)"><path d="M6 -60 Q-14 -72 -32 -54 Q-12 -62 6 -60Z"/><path d="M6 -60 Q26 -74 42 -55 Q22 -64 6 -60Z"/><path d="M6 -60 Q-6 -86 -22 -82 Q-4 -74 6 -60Z"/><path d="M6 -60 Q18 -88 34 -80 Q16 -74 6 -60Z"/></g><circle cx="3" cy="-57" r="3.6" fill="#7A4E2D"/><circle cx="9" cy="-56" r="3.6" fill="#7A4E2D"/></g>`;
// Ilha: espuma em volta, faixa de areia e o gramado por cima, com um coqueiro atrás
function islet(o, k) {
  const cy = (o.top + o.bottom) / 2, ry = (o.bottom - o.top) / 2;
  return `<ellipse cx="${o.cx}" cy="${cy + 3}" rx="${o.rx + 8}" ry="${ry + 7}" fill="rgba(255,255,255,.3)"/>` +
    `<ellipse class="f-sand" cx="${o.cx}" cy="${cy}" rx="${o.rx}" ry="${ry}" stroke="rgba(0,0,0,.12)" stroke-width="1.5"/>` +
    `<ellipse cx="${o.cx}" cy="${cy - ry * 0.16}" rx="${o.rx * 0.84}" ry="${ry * 0.66}" fill="url(#gGrass)"/>` +
    palm(o.cx - o.rx * 0.62, cy - ry * 0.2, k);
}
const house = (x, base, k) =>`<g transform="translate(${x} ${base}) scale(${k})" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"><rect x="0" y="-26" width="40" height="26" fill="#EDE3CF"/><path d="M-4 -26 L20 -44 L44 -26Z" fill="#B5553C"/><rect x="6" y="-19" width="8" height="8" fill="#F6D776"/><rect x="26" y="-19" width="8" height="8" fill="#F6D776"/><rect x="16" y="-14" width="8" height="14" fill="#7A4E2D"/></g>`;

function drawBg() {
  const { W, H, vert } = G, hz = G.sky, R = rng(7), isl = LV.ilha;
  const anim = reduceMotion.matches ? '' : `<animateTransform attributeName="patternTransform" type="translate" from="0 0" to="${vert ? '48 0' : '0 28'}" dur="${vert ? 4 : 2.8}s" repeatCount="indefinite"/>`;
  // Correnteza: setinhas de espuma correndo rio abaixo, mais rápidas que as ondas
  const animR = reduceMotion.matches ? '' : `<animateTransform attributeName="patternTransform" type="translate" from="0 0" to="${vert ? '32 0' : '0 20'}" dur="1.1s" repeatCount="indefinite"/>`;
  const rapid = vert
    ? `<pattern id="pRapid" width="32" height="20" patternUnits="userSpaceOnUse"><path class="w rap" d="M4 3 l6 4 l-6 4 M20 11 l6 4 l-6 4"/>${animR}</pattern>`
    : `<pattern id="pRapid" width="26" height="20" patternUnits="userSpaceOnUse"><path class="w rap" d="M3 4 l5 5 l5 -5 M14 13 l5 5 l5 -5"/>${animR}</pattern>`;
  let s = `<defs>${isl && isl.correnteza ? rapid : ''}
    <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="s-sky1"/><stop offset="1" class="s-sky2"/></linearGradient>
    <linearGradient id="gGrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="s-g1"/><stop offset="1" class="s-g2"/></linearGradient>
    <linearGradient id="gWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="s-w1"/><stop offset="1" class="s-w2"/></linearGradient>
    <pattern id="pWave" width="48" height="28" patternUnits="userSpaceOnUse"><path class="w" d="M4 8 q5 -4 10 0 t10 0"/><path class="w" d="M28 21 q4 -3 8 0 t8 0"/>${anim}</pattern>
  </defs>`;
  s += `<rect width="${W}" height="${hz + 2}" fill="url(#gSky)"/>`;
  s += `<g class="stars" fill="#FFFFFF">` + Array.from({ length: 16 }, () => `<circle cx="${(R() * W).toFixed(1)}" cy="${(R() * hz * 0.7).toFixed(1)}" r="${(0.6 + R() * 1.1).toFixed(1)}"/>`).join('') + `</g>`;
  const mx = W * (vert ? 0.86 : 0.9), my = hz * 0.4, mr = Math.min(hz * 0.17, 16);
  s += `<circle class="sun" cx="${mx}" cy="${my}" r="${mr}" fill="#FFD45C"/>`;
  s += `<path class="moon" d="M${mx} ${my - mr} A${mr} ${mr} 0 1 0 ${mx} ${my + mr} A${mr * 0.62} ${mr} 0 1 1 ${mx} ${my - mr} Z" fill="#F4F1DA"/>`;
  s += cloud(W * 0.22, hz * 0.34, vert ? 0.6 : 0.9, 'c1') + cloud(W * 0.58, hz * 0.22, vert ? 0.45 : 0.7, 'c2');
  const a = hz * (vert ? 0.5 : 0.42);
  s += `<path class="f-hill1" d="M0 ${hz} L0 ${hz - a * .5} C${W * .1} ${hz - a * .9} ${W * .2} ${hz - a} ${W * .32} ${hz - a * .45} C${W * .42} ${hz - a * .1} ${W * .5} ${hz - a * .8} ${W * .62} ${hz - a * .7} C${W * .74} ${hz - a * .6} ${W * .84} ${hz - a * 1.05} ${W} ${hz - a * .55} L${W} ${hz} Z"/>`;
  s += `<path class="f-hill2" d="M0 ${hz} L0 ${hz - a * .25} C${W * .15} ${hz - a * .5} ${W * .28} ${hz - a * .1} ${W * .4} ${hz - a * .3} C${W * .55} ${hz - a * .55} ${W * .7} ${hz - a * .12} ${W * .85} ${hz - a * .35} C${W * .93} ${hz - a * .45} ${W} ${hz - a * .3} ${W} ${hz - a * .3} L${W} ${hz} Z"/>`;
  s += `<rect y="${hz}" width="${W}" height="${H - hz}" fill="url(#gGrass)"/>`;
  // tufos de grama
  s += `<g fill="none" stroke="rgba(30,70,20,.32)" stroke-width="1.6" stroke-linejoin="round">`;
  for (let i = 0; i < (vert ? 16 : 26); i++) {
    const x = R() * W, y = hz + 10 + R() * (H - hz - 16);
    s += `<path d="M${(x - 5).toFixed(1)} ${y.toFixed(1)} l2 -7 l2 7 l2 -9 l2 9 l2 -6 l1 6"/>`;
  }
  s += `</g>`;

  if (!vert) {
    const cx = W / 2, gh = H - hz;
    // Com a ilha, o rio abre menos em perspectiva: precisa caber a ilha já no meio da cena
    const hw = t => G.riverW / 2 * (isl ? 0.66 + 0.44 * t : 0.3 + 0.85 * t);
    const y = t => hz + gh * t;
    const path = e => { const L = t => cx - hw(t) - e * (0.3 + t), Rr = t => cx + hw(t) + e * (0.3 + t);
      return `M${L(0)} ${hz} Q${L(.45) - 10} ${y(.45)} ${L(1.06)} ${y(1.06)} L${Rr(1.06)} ${y(1.06)} Q${Rr(.45) + 10} ${y(.45)} ${Rr(0)} ${hz} Z`; };
    s += tree(G.cw * 0.25, hz + 16, G.ah / 112);
    s += house(cx + hw(0) + 10, hz + 5, G.cw / 90);
    s += `<path class="f-sand" d="${path(7)}"/><path d="${path(0)}" fill="url(#gWater)"/><path d="${path(0)}" fill="url(#pWave)"/>`;
    if (isl) {
      if (isl.correnteza) {
        // metade do rio do lado da chegada, com a borda esfumada
        s += `<linearGradient id="gRapid" gradientUnits="userSpaceOnUse" x1="${cx - 30}" y1="0" x2="${cx + 40}" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>` +
          `<mask id="mRapid"><path d="${path(0)}" fill="url(#gRapid)"/></mask><rect mask="url(#mRapid)" x="0" y="${hz}" width="${W}" height="${gh}" fill="url(#pRapid)"/>`;
        s += `<text class="bl on-water" x="${cx + hw(0.1) * 0.55}" y="${y(0.1) + 4}" text-anchor="middle">CORRENTEZA</text>`;
      }
      s += islet(G.isle, G.ah / 120);
    }
    s += reeds(cx - hw(.5) - 16, y(.5), G.cw / 70) + reeds(cx + hw(.3) + 8, y(.3), G.cw / 80) + reeds(cx + hw(.62) + 10, y(.62), G.cw / 70);
    s += `<text class="bl" x="${G.bankW / 2}" y="${H - 9}" text-anchor="middle">PARTIDA</text>`;
    s += `<text class="bl" x="${W - G.bankW / 2}" y="${H - 9}" text-anchor="middle">CHEGADA</text>`;
  } else {
    const t = G.raftFeetB - 8, b = G.raftFeetA + G.rh * 0.22;
    const band = e => `M0 ${t - e} C${W * .3} ${t - e - 7} ${W * .65} ${t - e + 7} ${W} ${t - e - 3} L${W} ${b + e} C${W * .65} ${b + e + 7} ${W * .3} ${b + e - 7} 0 ${b + e + 3} Z`;
    s += `<path class="f-sand" d="${band(6)}"/><path d="${band(0)}" fill="url(#gWater)"/><path d="${band(0)}" fill="url(#pWave)"/>`;
    if (isl) {
      if (isl.correnteza) {
        // correnteza: da margem de chegada até a altura da ilha
        const yr = (G.raftFeetB + G.raftFeetI) / 2 + 6;
        s += `<linearGradient id="gRapid" gradientUnits="userSpaceOnUse" x1="0" y1="${yr - 28}" x2="0" y2="${yr + 12}"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
          `<mask id="mRapid"><path d="${band(0)}" fill="url(#gRapid)"/></mask><rect mask="url(#mRapid)" x="0" y="${t - 20}" width="${W}" height="${b - t + 40}" fill="url(#pRapid)"/>`;
      }
      s += islet(G.isle, G.ah / 130);
    }
    s += reeds(14, t + 4, G.cw / 90) + reeds(W - 30, b + 2, G.cw / 90);
    s += `<text class="bl" x="${G.pad}" y="15">CHEGADA</text>`;
    s += `<text class="bl" x="${W / 2}" y="${H - 8}" text-anchor="middle">PARTIDA</text>`;
  }
  bg.setAttribute('width', W);
  bg.setAttribute('height', H);
  bg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  bg.innerHTML = s;
}


  /* ---------- Integração com o kit da coleção ---------- */
  let scene, bg, raftEl, tagsEl, ctxRef;
  let reduceMotion = { matches: false };
  let S = null, history = [], status = 'play', raftAt = 'A', failInfo = null, hintIds = [];
  let els = {}, tagEls = {}, islandSeat = {};
  const TIME = () => (reduceMotion.matches ? { walk: 120, cross: 260 } : { walk: 380, cross: 1250 });

  const ICON = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="0" y="40" width="64" height="24" fill="#5DB8DD"/>
    <path d="M2 50q6-4 12 0t12 0t12 0t12 0t12 0" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/>
    <g stroke="#2A2433" stroke-width="1.6" stroke-linejoin="round"><rect x="33" y="8" width="3.2" height="32" rx="1.6" fill="#6B4423"/>
    <path d="M36.2 11 Q54 23 36.4 36Z" fill="#FBF6EA"/><path d="M8 38h48l-3 6H11z" fill="#C98F52"/>
    <circle cx="20" cy="20" r="5.5" fill="#E2A57A"/><path d="M14.6 18.5c0-5 4-7 5.4-7s5.4 2 5.4 6.5c-2-2-7-2.5-10.8.5z" fill="#3B2A20"/>
    <rect x="14.5" y="25.5" width="11" height="12.5" rx="3.5" fill="#2E9E6B"/></g></svg>`;
  // Ícones das regras do nível Danilo: a ilha (com a lotação no selo) e a correnteza
  const isleIco = n => `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M0 26h40v14H0z" fill="#5DB8DD"/>` +
    `<path d="M3 34q4-2.5 8 0t8 0t8 0t8 0" fill="none" stroke="#fff" stroke-width="1.6" opacity=".7"/>` +
    `<ellipse cx="18" cy="26" rx="14" ry="5" fill="#E9D092" stroke="${INK}" stroke-width="1.4"/>` +
    `<path d="M16 25 Q15 16 19 9" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/><path d="M16 25 Q15 16 19 9" fill="none" stroke="#8A5A33" stroke-width="2.2" stroke-linecap="round"/>` +
    `<g fill="#3FA66B" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"><path d="M19 9 Q11 5 5 11 Q12 8 19 9Z"/><path d="M19 9 Q27 4 33 10 Q26 8 19 9Z"/><path d="M19 9 Q17 2 10 2 Q16 4 19 9Z"/><path d="M19 9 Q23 2 29 3 Q23 5 19 9Z"/></g>` +
    (n ? `<circle cx="31" cy="29" r="7.5" fill="${INK}"/><text x="31" y="32.8" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="11" fill="#fff">${n}</text>` : '') + `</svg>`;
  // Seta circular (recomeçar), para a regra dos níveis sem ajuda
  const RESTART_ICO = `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect x="4" y="4" width="32" height="32" rx="10" fill="#D9463B"/>` +
    `<g fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M27.5 20 A7.5 7.5 0 1 1 25.3 14.7"/><path d="M20.3 14.7 H25.3 V9.7"/></g></svg>`;
  const RAPIDS_ICO =`<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect x="3" y="6" width="34" height="28" rx="8" fill="#2C84B3"/>` +
    `<g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12 l5 5 l5 -5 M21 12 l5 5 l5 -5"/><path d="M9 22 l5 5 l5 -5 M21 22 l5 5 l5 -5"/></g></svg>`;

  const ruleFig = k => figSVG(k, 'adult', 'ico-fig', '9 1 46 46').replace(/lz-clip/g, 'lz-clip-ico');
  function rulesFor(l) {
    const n = r => l.ids.filter(id => CAST[id].role === r).length;
    const isNew = k => [].concat(l.novo || []).includes(k);
    const dogs = n('cao'), sons = n('filho'), daus = n('filha');
    const doCao = dogs > 1 ? 'dos cachorros' : 'do cachorro';
    const items = [
      { key: 'cap', icon: raftSVG(), html: dogs ? `A jangada leva no máximo <b>2 passageiros</b> por vez. ${dogs > 1 ? 'Cada cachorro' : 'O cachorro'} conta como um.` : 'A jangada leva no máximo <b>2 pessoas</b> por vez.' },
      { key: 'drive', icon: HELM, html: `Só <b>o pai, a mãe e ${n('pol') > 1 ? 'os policiais' : 'o policial'}</b> sabem conduzir a jangada.` },
    ];
    if (l.ilha) {
      items.push({ key: 'rota', icon: isleIco(), novo: isNew('rota'), html: 'No meio do rio há uma <b>ilha</b>, e a jangada sempre para nela: partida ↔ ilha ↔ chegada.' });
      items.push({ key: 'lotacao', icon: isleIco(l.ilha.cap), novo: isNew('lotacao'), html: `A ilha é pequena: cabem no máximo <b>${l.ilha.cap}</b> nela, contando quem está na jangada parada lá.` });
      if (l.ilha.correnteza) items.push({ key: 'correnteza', icon: RAPIDS_ICO, novo: isNew('correnteza'),
        html: `Entre a ilha e a chegada há <b>correnteza</b>: nesse trecho, só ${n('pol') > 1 ? 'os policiais conseguem' : 'o policial consegue'} conduzir.` });
    }
    if (daus) items.push({ key: 'pai', icon: ruleFig('pai'), html: `O pai não pode ficar com <b>${daus > 1 ? 'nenhuma das filhas' : 'a filha'}</b> sem a mãe por perto.` });
    if (sons) items.push({ key: 'mae', icon: ruleFig('mae'), html: `A mãe não pode ficar com <b>${sons > 1 ? 'nenhum dos filhos' : 'o filho'}</b> sem o pai por perto.` });
    items.push({ key: 'ladrao', icon: ruleFig('ladrao'), novo: isNew('ladrao'), html: n('lad') > 1
      ? `Cada policial só vigia <b>um ladrão</b>. Perto da família ou ${doCao}, precisa haver um policial para cada ladrão.`
      : `O ladrão não pode ficar com <b>ninguém da família${dogs ? ', nem com o cachorro,' : ''}</b> sem o policial por perto.` });
    if ((l.regras || []).includes('criancas')) items.push({ key: 'criancas', icon: figSVG('filha1', 'kid', 'ico-fig', '11 5 42 42'), novo: isNew('criancas'),
      html: 'As crianças nunca podem ficar <b>sem um adulto responsável</b> por perto: o pai, a mãe ou um policial. O ladrão não conta.' });
    if ((l.regras || []).includes('caoPai')) items.push({ key: 'caoPai', icon: figSVG('cao', 'pet', 'ico-fig', '4 -2 62 62'), novo: isNew('caoPai'),
      html: 'O cachorro não suporta o ladrão: os dois só podem ficar no mesmo lugar se <b>o pai</b> também estiver.' });
    if (l.semAjuda) items.unshift({ key: 'semAjuda', icon: RESTART_ICO,
      html: '<b>Sem dicas</b> neste nível. Quebrou uma regra, a partida volta <b>do início</b>.' });
    return items;
  }

  function buildCast(ctx) {
    els = {}; tagEls = {};
    IDS.forEach((id, i) => {
      const p = CAST[id];
      const t = ctx.h('span', { class: 'tag', html: `${p.driver ? HELM : ''}${p.name}`, onclick: () => tapChar(id) });
      const b = ctx.h('button', { type: 'button', class: `char ${p.size}${p.role === 'lad' ? ' is-thief' : ''}`, style: { '--i': i }, onclick: () => tapChar(id),
        onfocus: () => t.classList.toggle('focus', b.matches(':focus-visible')), onblur: () => t.classList.remove('focus') },
      ctx.h('span', { class: 'bob', html: `<span class="bang" aria-hidden="true">!</span>${figSVG(id, p.size)}` }));
      scene.insertBefore(b, tagsEl);
      tagsEl.append(t);
      els[id] = b;
      tagEls[id] = t;
    });
  }

  // Lugar de cada um na ilha: quem chega pega o primeiro livre e fica nele até sair
  function seatIsland() {
    const here = IDS.filter(id => S.loc[id] === 'I');
    for (const id of Object.keys(islandSeat)) if (!here.includes(id)) delete islandSeat[id];
    const used = new Set(Object.values(islandSeat));
    for (const id of here) if (!(id in islandSeat)) {
      const j = G.islotOrder.find(k => !used.has(k)) ?? 0;
      islandSeat[id] = j;
      used.add(j);
    }
  }

  function render(dur = 0) {
    if (!G) return;
    const r = raftPos(raftAt);
    raftEl.style.setProperty('--dur', dur + 'ms');
    raftEl.style.transform = `translate3d(${r.x.toFixed(1)}px, ${r.y.toFixed(1)}px, 0)`;
    raftEl.style.zIndex = Math.round(r.feet);
    if (LV.ilha) seatIsland();
    const f = status === 'fail' ? failInfo : null;
    for (const id of IDS) {
      const p = CAST[id], el = els[id], t = tagEls[id], loc = S.loc[id];
      let x, feet, z;
      if (loc === 'R') { x = r.x + G.rw * (S.seats.indexOf(id) ? 0.71 : 0.29); feet = r.feet; z = Math.round(feet) + 2; }
      else if (loc === 'I') { ({ x, feet } = G.islot[islandSeat[id]]); z = Math.round(feet); }
      else { ({ x, feet } = G.slot[loc][id]); z = Math.round(feet); }
      el.style.setProperty('--dur', dur + 'ms');
      el.style.transform = `translate3d(${(x - G.cw / 2).toFixed(1)}px, ${(feet - figH(G, id)).toFixed(1)}px, 0)`;
      el.style.zIndex = z;
      const alarm = !!f && (f.culprits.includes(id) || f.victims.includes(id)), hinted = hintIds.includes(id);
      el.classList.toggle('alarm', alarm);
      el.classList.toggle('culprit', !!f && f.culprits.includes(id));
      el.classList.toggle('hinted', hinted);
      el.classList.toggle('cheer', status === 'won');
      t.style.setProperty('--dur', dur + 'ms');
      t.style.transform = `translate3d(${x.toFixed(1)}px, ${(feet + 1).toFixed(1)}px, 0) translateX(-50%)`;
      t.style.zIndex = z;
      t.classList.toggle('alarm', alarm);
      t.classList.toggle('hinted', hinted);
      el.setAttribute('aria-label', `${p.name}${p.driver ? ' (sabe conduzir)' : ''}, ${NA[loc]}`);
    }
    renderBar();
  }

  // Para onde a jangada pode ir: o botão principal segue rumo à chegada; o alternativo (só na ilha) volta para a partida
  const primaryTo = () => (LV.ilha ? (S.raft === 'I' ? 'B' : 'I') : other(S.raft));
  const altTo = () => (LV.ilha && S.raft === 'I' ? 'A' : null);
  const polArt = () => (count('pol') > 1 ? 'um policial' : 'o policial');
  function goLabel(to, text) {
    const fwd = ORDEM[to] > ORDEM[S.raft];
    const a = `<span class="arrow" aria-hidden="true">${G && G.vert ? (fwd ? '↑' : '↓') : (fwd ? '→' : '←')}</span>`;
    return fwd || !LV.ilha ? `${text} ${a}` : `${a} ${text}`;
  }
  // Por que a jangada não pode ir até "to" agora (null se pode)
  function blocker(to) {
    const riders = S.seats.filter(Boolean);
    if (!riders.length) return 'vazia';
    if (!riders.some(id => CAST[id].driver)) return 'drive';
    if (!riders.some(id => driverRoles(LV, S.raft, to).includes(CAST[id].role))) return 'correnteza';
    if (to === 'I' && IDS.filter(id => S.loc[id] === 'I').length + riders.length > LV.ilha.cap) return 'lotacao';
    return null;
  }

  function renderBar() {
    const ctx = ctxRef, riders = S.seats.filter(Boolean);
    ctx.setMoves(S.moves);
    ctx.busy(status === 'moving');
    ctx.controls({ undo: history.length > 0 });
    const to = primaryTo(), back = altTo(), narrow = G && G.vert, onIsle = back != null;
    const text = !LV.ilha ? 'Atravessar' : onIsle ? (narrow ? 'Chegada' : 'Seguir para a chegada') : 'Ir para a ilha';
    ctx.primary(goLabel(to, text), { disabled: !!blocker(to) });
    ctx.alt(onIsle ? goLabel(back, narrow ? 'Partida' : 'Voltar para a partida') : null, { disabled: onIsle && !!blocker(back) });
    if (status === 'moving') return ctx.say('Atravessando…', riders.length ? `Na jangada: ${crewNames(riders)}.` : '');
    if (status !== 'play') return;
    if (!riders.length) return ctx.say(S.moves ? 'Quem vai agora?' : 'Sua vez', `Toque em alguém ${DA[S.raft]} para embarcar. Cabem 2 na jangada.` +
      (onIsle ? ' Da ilha, a jangada pode voltar para a partida ou seguir para a chegada.' : '') +
      (LV.semAjuda && !S.moves ? ' Aqui não há dicas, e quem quebrar uma regra recomeça do início.' : ''));
    if (!riders.some(id => CAST[id].driver)) return ctx.say('Falta quem conduza', `${cap1(crewArt(riders))} não ${riders.length > 1 ? 'sabem' : 'sabe'} conduzir. Embarque ${count('pol') > 1 ? 'o pai, a mãe ou um policial' : 'o pai, a mãe ou o policial'}.`);
    const crew = `Na jangada: ${crewNames(riders)}.`;
    if (!LV.ilha) return ctx.say('Pronto para atravessar', `${crew} Toque em Atravessar.`);
    const why = blocker(to);
    if (onIsle) return why === 'correnteza'
      ? ctx.say('Pronto para voltar', `${crew} Para seguir até a chegada, só com ${polArt()} a bordo (correnteza).`)
      : ctx.say('Para onde?', `${crew} Volte para a partida ou siga para a chegada.`);
    if (why === 'correnteza') return ctx.say(`Falta ${polArt()}`, `Entre a chegada e a ilha há correnteza: só ${polArt()} consegue conduzir nesse trecho.`);
    if (why === 'lotacao') return ctx.say('Não cabe na ilha', `A ilha já tem ${IDS.filter(id => S.loc[id] === 'I').length} e cabem no máximo ${LV.ilha.cap}, contando quem chega na jangada.`);
    ctx.say('Pronto para ir', `${crew} Toque em Ir para a ilha.`);
  }

  function retriggerEl(el) { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); ctxRef.later(() => el.classList.remove('nope'), 420); }

  function tapChar(id) {
    if (status !== 'play' || ctxRef.status !== 'play') return;
    const loc = S.loc[id];
    if (loc === 'R') {
      S.seats[S.seats.indexOf(id)] = null;
      S.loc[id] = S.raft;
    } else if (loc === S.raft) {
      const free = S.seats.indexOf(null);
      if (free < 0) { retriggerEl(raftEl); return ctxRef.warn('A jangada está cheia', 'Ela leva no máximo 2. Toque em alguém na jangada para desembarcar.', 'cap'); }
      S.seats[free] = id;
      S.loc[id] = 'R';
    } else {
      retriggerEl(els[id]);
      return ctxRef.warn(LV.ilha ? 'A jangada está em outro lugar' : 'A jangada está do outro lado', `Para levar ${art(id)}, traga a jangada até ${ATE[loc]} primeiro.`);
    }
    const t = TIME().walk;
    const el = els[id];
    el.classList.remove('walk'); void el.offsetWidth; el.classList.add('walk');
    ctxRef.later(() => el.classList.remove('walk'), t);
    render(t);
  }

  function cross(to) {
    if (status !== 'play' || !to) return;
    const from = S.raft, riders = S.seats.filter(Boolean), why = blocker(to);
    if (why) {
      retriggerEl(raftEl);
      if (why === 'vazia') return ctxRef.warn('A jangada está vazia', `Toque em alguém ${DA[from]} para embarcar.`);
      if (why === 'drive') return ctxRef.warn('Falta quem conduza', `Só ${driversText()} sabem conduzir a jangada.`, 'drive');
      if (why === 'correnteza') return ctxRef.warn('Correnteza forte', `Entre a ilha e a margem de chegada, só ${polArt()} consegue conduzir. Embarque ${polArt()}.`, 'correnteza');
      return ctxRef.warn('Não cabe na ilha', `A ilha já tem ${IDS.filter(id => S.loc[id] === 'I').length} e cabem no máximo ${LV.ilha.cap}, contando quem chega na jangada.`, 'lotacao');
    }
    history.push(clone(S));
    const fail = check(IDS.filter(id => S.loc[id] === from), from) || check(riders, 'R') ||
      check(IDS.filter(id => S.loc[id] === to).concat(riders), to);
    S.raft = to;
    S.moves++;
    raftAt = fail && fail.place === 'R' ? `${from}>${to}` : to;
    hintIds = [];
    status = 'moving';
    const t = TIME().cross;
    render(t);
    ctxRef.later(() => {
      if (fail) {
        status = 'fail'; failInfo = fail;
        render(0);
        // Nos níveis sem ajuda o erro não se desfaz: a partida volta do início
        return ctxRef.fail({ title: 'Regra quebrada!', rule: fail.rule, final: !!LV.semAjuda,
          text: failText(fail) + (LV.semAjuda ? ' Neste nível não dá para desfazer: a partida recomeça do início.' : '') });
      }
      if (IDS.every(id => S.loc[id] === 'B' || (S.loc[id] === 'R' && S.raft === 'B'))) return win();
      status = 'play';
      render(0);
    }, t + 40);
  }

  function win() {
    S.seats.forEach(id => { if (id) S.loc[id] = 'B'; });
    S.seats = [null, null];
    status = 'won';
    render(TIME().walk);
    ctxRef.win();
  }

  function undo() {
    if (status === 'moving' || !history.length) return;
    S = history.pop(); raftAt = S.raft; failInfo = null; hintIds = [];
    const ms = Math.round(TIME().cross * 0.7);
    status = 'moving';
    render(ms);
    ctxRef.later(() => { status = 'play'; render(0); }, ms + 40);
  }

  const ROUTE_TXT = { AI: 'da partida até a ilha', IA: 'da ilha de volta para a partida', IB: 'da ilha até a chegada', BI: 'da chegada de volta para a ilha' };
  function hint() {
    if (status !== 'play') return;
    const where = Object.fromEntries(IDS.map(id => [id, S.loc[id] === 'R' ? S.raft : S.loc[id]]));
    const path = solve(LV, where, S.raft);
    if (!path) return ctxRef.warn('Sem saída daqui', 'Desfaça algumas travessias e tente outro caminho.');
    const m = path[0];
    // Quem vai: primeiro quem já está na jangada, depois quem está no lugar onde ela está
    const pool = [...S.seats.filter(Boolean), ...IDS.filter(id => S.loc[id] === S.raft)];
    hintIds = ROLES.flatMap((r, k) => pool.filter(id => CAST[id].role === r).slice(0, m.g[k]));
    render(0);
    const rota = LV.ilha ? `, ${ROUTE_TXT[m.from + m.to]}` : '';
    ctxRef.hint('Dica', `Próxima travessia: ${crewArt(hintIds, true)}${rota}. Daqui, dá para terminar em ${path.length} travessia${path.length > 1 ? 's' : ''}.`);
  }

  LEVELS.forEach(l => { l.sub = `<span class="cnt">${l.ids.length} personagens · </span>mín. ${l.min}`; });

  Jogos.register({
    id: 'travessia',
    name: 'Travessia do Rio',
    tagline: 'O teste de QI japonês: leve todo mundo para a outra margem sem quebrar as regras.',
    icon: ICON,
    css: CSS,
    metric: { label: 'Travessias', unit: ['travessia', 'travessias'] },
    levels: LEVELS,
    rules: rulesFor,
    how: l => (l.ilha
      ? 'As regras valem nas margens, na ilha e também dentro da jangada. Toque em uma pessoa para embarcar ou desembarcar; na ilha, escolha se a jangada <b>volta para a partida</b> ou <b>segue para a chegada</b>.'
      : 'As regras valem nas duas margens e também dentro da jangada. Toque em uma pessoa para embarcar ou desembarcar e depois em <b>Atravessar</b>.'),
    mount(ctx) {
      ctxRef = ctx;
      LV = ctx.level;
      IDS = LV.ids;
      REGRAS = LV.regras || [];
      reduceMotion = { get matches() { return ctx.reduced; } };
      S = initState(); history = []; status = 'play'; raftAt = 'A'; failInfo = null; hintIds = []; islandSeat = {}; G = null;
      ctx.setMin(LV.min);
      scene = ctx.h('div', { class: 'scene' });
      bg = ctx.svg('svg', { class: 'tv-bg', 'aria-hidden': 'true', focusable: 'false' });
      raftEl = ctx.h('div', { class: 'raft', 'aria-hidden': 'true' }, ctx.h('div', { class: 'raft-in', html: raftSVG() }));
      tagsEl = ctx.h('div', { class: 'tags', 'aria-hidden': 'true' });
      scene.append(bg, raftEl, tagsEl);
      ctx.board.append(scene);
      buildCast(ctx);
      ctx.onResize(() => layout());
      layout();   // já na montagem
      const ctrl = { onPrimary: () => cross(primaryTo()), onAlt: () => cross(altTo()), onUndo: undo };
      if (!LV.semAjuda) ctrl.onHint = hint;   // sem onHint, o kit esconde o botão Dica
      return ctrl;
    },
  });
})();
