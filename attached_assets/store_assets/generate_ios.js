'use strict';
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');

const OUT = '/home/runner/workspace/attached_assets/store_assets';
fs.mkdirSync(OUT, { recursive: true });

const LOGO_B64 = fs.readFileSync(
  '/home/runner/workspace/attached_assets/A3723975-BCF9-4735-B4BA-5FF8121CF538_1784651224799.png'
).toString('base64');
const LOGO_HREF = `data:image/png;base64,${LOGO_B64}`;

const FONT_FILES = ['/tmp/screenshot-tool/cinzel.ttf', '/tmp/screenshot-tool/inter.ttf'];

const GOLD  = '#C9A84C';
const GOLDL = '#FFD166';
const BG    = '#0a0a0a';
const BG2   = '#141414';
const BG3   = '#1c1c1c';
const WHITE = '#F5F0E8';
const GRAY  = '#888888';

// iOS 6.5" display: 1242 x 2688
// Strategy: render at 1080-coord space, scale to 1242 width
// viewBox 1080 x 2337 => rendered at 1242 x 2688 (scale 1.15)
const VW = 1080; // coordinate space width
const VH = 2337; // coordinate space height (2688 / 1.15)
const RW = 1242; // rendered output width
const RH = 2688; // rendered output height

function render(svgStr, outFile) {
  const resvg = new Resvg(svgStr, {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false },
    fitTo: { mode: 'width', value: RW },
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(`${OUT}/${outFile}`, png);
  console.log('OK', outFile);
}

const R  = (x,y,w,h,fill,rx=0) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${rx}"/>`;
const T  = (x,y,str,{fam='Inter',sz=28,fill=WHITE,wt='400',anchor='start',italic=false}={}) =>
  `<text x="${x}" y="${y}" font-family="${fam}" font-size="${sz}" font-weight="${wt}"
     fill="${fill}" text-anchor="${anchor}" dominant-baseline="auto"
     font-style="${italic?'italic':'normal'}">${str}</text>`;

function card(x,y,w,h,hi=false,rx=20){
  const stroke = hi ? `stroke="${GOLD}" stroke-opacity="0.55"` : `stroke="${GOLD}" stroke-opacity="0.18"`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${BG2}" rx="${rx}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${stroke} stroke-width="1.5" rx="${rx}"/>
    ${hi ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${GOLD}" rx="${rx}" opacity="0.07"/>` : ''}`;
}

function divLine(x,y,w,id){
  return `<defs><linearGradient id="dl${id}" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="${GOLD}" stop-opacity="0"/>
    <stop offset="50%" stop-color="${GOLD}" stop-opacity="0.55"/>
    <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
  </linearGradient></defs>
  <rect x="${x}" y="${y}" width="${w}" height="1" fill="url(#dl${id})"/>`;
}

function ring(cx,cy,r,pct,sw=18){
  const c=2*Math.PI*r, d=c*pct;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${BG3}" stroke-width="${sw}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${GOLD}" stroke-width="${sw}"
      stroke-dasharray="${d} ${c}" stroke-dashoffset="${c*0.25}" stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cy})"/>`;
}

function statusBar(W){
  return `${R(0,0,W,64,BG)}
    ${T(52,47,'9:41',{sz:30,wt:'600'})}
    ${T(W-52,47,'|||  [=====]',{sz:22,fill:GRAY,anchor:'end'})}`;
}

function navBar(W,H,activeIdx){
  const items=['Intentions','Gratitude','People','Goals','Journal'];
  const icons=['*','@','O','#','~'];
  const iW=W/5; const y=H-164;
  let s=`${R(0,y,W,164,BG2)}${R(0,y,W,1,GOLD,0)}`;
  items.forEach((lbl,i)=>{
    const cx=iW*i+iW/2, act=i===activeIdx;
    s+=T(cx,y+64,icons[i],{sz:32,fill:act?GOLD:'#555',anchor:'middle',wt:act?'700':'400'});
    s+=T(cx,y+114,lbl,{sz:20,fill:act?GOLD:'#555',anchor:'middle'});
    if(act) s+=`<rect x="${cx-28}" y="${H-8}" width="56" height="4" fill="${GOLD}" rx="2"/>`;
  });
  return s;
}

function phoneHeader(line1,line2){
  return `${T(56,132,line1,{sz:26,fill:GRAY})}
    ${T(56,196,line2,{fam:'Cinzel',sz:52,wt:'700'})}
    ${divLine(56,214,968,'hdr')}`;
}

function checkDot(cx,cy,r,done){
  return done
    ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${GOLD}"/>
       <text x="${cx}" y="${cy+1}" font-family="Inter" font-size="${Math.round(r*1.15)}"
         fill="${BG}" text-anchor="middle" dominant-baseline="middle" font-weight="700">v</text>`
    : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${GOLD}" stroke-width="2.5"/>`;
}

function sectionLabel(x,y,txt){
  return T(x,y,txt,{fam:'Cinzel',sz:20,fill:GOLD,wt:'600'});
}

// ─── iOS PHONE 1 — Today's Intentions  1080 x 2337 (renders to 1242 x 2688) ──
function makePhone1(){
  const W=VW, H=VH;
  const intents=[
    {txt:'Morning meditation',  sub:'Personal growth',   done:true},
    {txt:'30-minute workout',   sub:'Health and fitness', done:true},
    {txt:'Read for 20 minutes', sub:'Learning and growth',done:false},
  ];
  let cards='';
  intents.forEach((it,i)=>{
    const y=940+i*188;
    cards+=card(56,y,968,166,!it.done);
    cards+=checkDot(120,y+83,36,it.done);
    const tc=it.done?'#666':WHITE;
    cards+=T(178,y+68,it.txt,{sz:28,wt:'600',fill:tc});
    cards+=T(178,y+108,it.sub,{sz:22,fill:it.done?'#555':GOLD});
    if(it.done) cards+=`<line x1="178" y1="${y+76}" x2="${178+it.txt.length*16}" y2="${y+76}" stroke="#555" stroke-width="1.5"/>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
      width="${W}" height="${H}">
    <defs><radialGradient id="pbg" cx="50%" cy="0%" r="58%">
      <stop offset="0%" stop-color="#1e1600"/>
      <stop offset="100%" stop-color="${BG}"/>
    </radialGradient></defs>
    ${R(0,0,W,H,'url(#pbg)')}
    ${statusBar(W)}
    ${phoneHeader('Good morning, Shad',"Today's Intentions")}
    ${ring(540,590,148,0.667,22)}
    ${T(540,565,'2',{fam:'Cinzel',sz:76,fill:GOLD,wt:'700',anchor:'middle'})}
    ${T(540,628,'of 3 done',{sz:24,fill:GRAY,anchor:'middle'})}
    ${cards}
    ${card(56,1536,968,120)}
    ${T(108,1606,'STREAK',{fam:'Cinzel',sz:22,fill:GOLD,wt:'700'})}
    ${T(108,1640,'14 days in a row',{sz:22,fill:GRAY})}
    ${T(W-100,1596,'14',{fam:'Cinzel',sz:64,fill:GOLD,wt:'900',anchor:'middle'})}
    ${T(W-100,1646,'days',{sz:20,fill:GRAY,anchor:'middle'})}
    ${navBar(W,H,0)}
  </svg>`;
}

// ─── iOS PHONE 2 — Gratitude Journal ─────────────────────────────────────────
function makePhone2(){
  const W=VW, H=VH;
  const entries=[
    {date:'Tuesday, July 20',   body:'"Grateful for my support system and'},
    {date:'Monday, July 19',    body:'"Thankful for this app keeping me'},
    {date:'Sunday, July 18',    body:'"Good health, clarity of mind, and'},
  ];
  const bods=[
    'the people who believe in me."',
    'accountable every single day."',
    'a purpose-driven day."',
  ];

  let ec='';
  entries.forEach((e,i)=>{
    const y=1240+i*228;
    ec+=card(56,y,968,204);
    ec+=T(92,y+48,e.date,{sz:24,wt:'600'});
    ec+=divLine(92,y+64,880,`e${i}`);
    ec+=T(92,y+100,e.body,{sz:22,fill:'#bbb',italic:true});
    ec+=T(92,y+138,bods[i],{sz:22,fill:'#bbb',italic:true});
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
      width="${W}" height="${H}">
    <defs><radialGradient id="pbg2" cx="50%" cy="0%" r="58%">
      <stop offset="0%" stop-color="#1e1600"/>
      <stop offset="100%" stop-color="${BG}"/>
    </radialGradient></defs>
    ${R(0,0,W,H,'url(#pbg2)')}
    ${statusBar(W)}
    ${phoneHeader('Wednesday, July 21','Gratitude Journal')}
    ${card(56,268,968,330,true)}
    ${T(96,326,'Today\'s Gratitude',{fam:'Cinzel',sz:26,fill:GOLD,wt:'600'})}
    ${divLine(96,344,880,'tdg')}
    ${T(96,394,'"I am grateful for the strength I found in',{sz:26,fill:WHITE,italic:true})}
    ${T(96,436,'this morning\'s workout and the clarity',{sz:26,fill:WHITE,italic:true})}
    ${T(96,478,'it gave me."',{sz:26,fill:WHITE,italic:true})}
    ${divLine(96,514,880,'tdg2')}
    ${T(96,558,'Tap to continue writing...',{sz:22,fill:'#555'})}
    ${sectionLabel(56,648,'RECENT ENTRIES')}
    ${ec}
    ${navBar(W,H,1)}
  </svg>`;
}

// ─── iOS PHONE 3 — My People ──────────────────────────────────────────────────
function makePhone3(){
  const W=VW, H=VH;
  const people=[
    {name:'Angela Rivera',   rel:'Mother',           note:'Call on Sunday',           urgent:true},
    {name:'Marcus Johnson',  rel:'Best Friend',       note:'Check in this week',       urgent:false},
    {name:'Devon Williams',  rel:'Mentor',            note:'Schedule monthly call',    urgent:false},
    {name:'Priya Kapoor',    rel:'Business Partner',  note:'Review project together',  urgent:false},
    {name:'Coach Davis',     rel:'Trainer',           note:'Share progress update',    urgent:false},
  ];

  let cards='';
  people.forEach((p,i)=>{
    const y=290+i*208;
    cards+=card(56,y,968,182,p.urgent);
    cards+=`<circle cx="140" cy="${y+91}" r="60" fill="${BG3}"/>
      <circle cx="140" cy="${y+91}" r="60" fill="none" stroke="${p.urgent?GOLD:GOLD+'44'}" stroke-width="2"/>`;
    const initials=p.name.split(' ').map(w=>w[0]).join('');
    cards+=T(140,y+99,initials,{sz:30,fill:p.urgent?GOLD:GRAY,anchor:'middle',wt:'600'});
    cards+=T(222,y+64,p.name,{sz:28,wt:'600'});
    cards+=T(222,y+104,p.rel,{sz:22,fill:GOLD});
    cards+=T(222,y+140,p.note,{sz:20,fill:GRAY});
    if(p.urgent){
      cards+=`<rect x="${W-190}" y="${y+72}" width="110" height="40" fill="${GOLD}" rx="20"/>`;
      cards+=T(W-135,y+99,'Today',{sz:20,fill:BG,anchor:'middle',wt:'600'});
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
      width="${W}" height="${H}">
    <defs><radialGradient id="pbg3" cx="50%" cy="0%" r="58%">
      <stop offset="0%" stop-color="#1e1600"/>
      <stop offset="100%" stop-color="${BG}"/>
    </radialGradient></defs>
    ${R(0,0,W,H,'url(#pbg3)')}
    ${statusBar(W)}
    ${phoneHeader('Relationships and Connections','My People')}
    ${cards}
    ${navBar(W,H,2)}
  </svg>`;
}

// ─── render ───────────────────────────────────────────────────────────────────
[
  ['ios_screenshot_1.png', makePhone1],
  ['ios_screenshot_2.png', makePhone2],
  ['ios_screenshot_3.png', makePhone3],
].forEach(([name,fn])=>{
  try { render(fn(),name); }
  catch(e){ console.error('FAIL',name,e.message); }
});
