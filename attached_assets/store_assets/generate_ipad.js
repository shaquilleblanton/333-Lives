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
const BG    = '#0a0a0a';
const BG2   = '#141414';
const BG3   = '#1c1c1c';
const WHITE = '#F5F0E8';
const GRAY  = '#888888';

// iPad Pro 12.9" — 2048 x 2732
// Coordinate space: 1200 x 1601 => rendered at 2048 x 2732 (scale ~1.707)
const VW = 1200;
const VH = 1601;

function render(svgStr, outFile) {
  const resvg = new Resvg(svgStr, {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false },
    fitTo: { mode: 'width', value: 2048 },
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(`${OUT}/${outFile}`, png);
  console.log('OK', outFile);
}

const R = (x,y,w,h,fill,rx=0) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${rx}"/>`;
const T = (x,y,str,{fam='Inter',sz=28,fill=WHITE,wt='400',anchor='start',italic=false}={}) =>
  `<text x="${x}" y="${y}" font-family="${fam}" font-size="${sz}" font-weight="${wt}"
     fill="${fill}" text-anchor="${anchor}" dominant-baseline="auto"
     font-style="${italic?'italic':'normal'}">${str}</text>`;

function card(x,y,w,h,hi=false,rx=16){
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

function ring(cx,cy,r,pct,sw=14){
  const c=2*Math.PI*r, d=c*pct;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${BG3}" stroke-width="${sw}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${GOLD}" stroke-width="${sw}"
      stroke-dasharray="${d} ${c}" stroke-dashoffset="${c*0.25}" stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cy})"/>`;
}

function checkDot(cx,cy,r,done){
  return done
    ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${GOLD}"/>
       <text x="${cx}" y="${cy+1}" font-family="Inter" font-size="${Math.round(r*1.15)}"
         fill="${BG}" text-anchor="middle" dominant-baseline="middle" font-weight="700">v</text>`
    : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${GOLD}" stroke-width="2"/>`;
}

function barRow(x,y,w,pct,label,tag){
  return `${T(x,y,label,{sz:22,wt:'500'})}
    ${T(x+w,y,tag,{sz:19,fill:GOLD,anchor:'end',wt:'600'})}
    ${R(x,y+12,w,10,BG3,5)}
    <rect x="${x}" y="${y+12}" width="${w*pct/100}" height="10" fill="${GOLD}" rx="5"/>`;
}

function sectionLabel(x,y,txt){
  return T(x,y,txt,{fam:'Cinzel',sz:19,fill:GOLD,wt:'600'});
}

function topBar(W){
  let s = `${R(0,0,W,100,BG2)}${R(0,99,W,1,GOLD,0)}`;
  s += `<image href="${LOGO_HREF}" x="24" y="12" width="76" height="76"/>`;
  s += T(114,46,'333 LIVES',{fam:'Cinzel',sz:28,fill:GOLD,wt:'700'});
  s += T(114,80,'Wednesday, July 22, 2026',{sz:18,fill:GRAY});
  return s;
}

// ─── iPad 1 — Dashboard (two-column) ─────────────────────────────────────────
function makeIpad1(){
  const W=VW, H=VH;
  const C1=32, C2=620, CW=548, R1=120;

  let s = topBar(W);
  s += T(W-32,46,'Good morning, Shad',{fam:'Cinzel',sz:26,fill:WHITE,wt:'600',anchor:'end'});
  s += T(W-32,80,'14-Day Streak',{sz:18,fill:GOLD,anchor:'end'});

  // Left — Intentions
  s += sectionLabel(C1, R1+40, "TODAY'S INTENTIONS");
  const intents=[
    {txt:'Morning meditation',  sub:'Personal growth',   done:true},
    {txt:'30-minute workout',   sub:'Health and fitness', done:true},
    {txt:'Read for 20 minutes', sub:'Learning and growth',done:false},
  ];
  intents.forEach((it,i)=>{
    const y=R1+62+i*130;
    s+=card(C1,y,CW,114,!it.done,12);
    s+=checkDot(C1+48,y+57,28,it.done);
    s+=T(C1+88,y+42,it.txt,{sz:22,wt:'600',fill:it.done?'#666':WHITE});
    s+=T(C1+88,y+74,it.sub,{sz:18,fill:it.done?'#444':GOLD});
    if(it.done) s+=`<line x1="${C1+88}" y1="${y+50}" x2="${C1+88+it.txt.length*12.4}" y2="${y+50}" stroke="#555" stroke-width="1.2"/>`;
  });
  // ring
  s += ring(C1+CW-72, R1+462, 56, 0.667, 10);
  s += T(C1+CW-72, R1+448,'67%',{fam:'Cinzel',sz:28,fill:GOLD,wt:'700',anchor:'middle'});
  s += T(C1+CW-72, R1+488,'done',{sz:16,fill:GRAY,anchor:'middle'});

  // Right — Gratitude
  s += sectionLabel(C2, R1+40, "GRATITUDE");
  s += card(C2, R1+62, CW, 178, true, 12);
  s += T(C2+28,R1+104,"Today's entry",{sz:20,fill:GRAY});
  s += divLine(C2+28,R1+118,CW-56,'tg1');
  s += T(C2+28,R1+152,'"I am grateful for the strength',{sz:20,fill:WHITE,italic:true});
  s += T(C2+28,R1+180,'I found this morning."',{sz:20,fill:WHITE,italic:true});
  s += T(C2+28,R1+216,'Tap to continue writing...',{sz:17,fill:'#555'});
  const gEntries=['Tue — "Grateful for my support system..."','Mon — "Thankful for this app..."'];
  gEntries.forEach((e,i)=>{
    const y=R1+258+i*86;
    s+=card(C2,y,CW,72,false,10);
    s+=T(C2+24,y+42,e,{sz:18,fill:GRAY});
  });

  // Divider
  const divY = R1+540;
  s += R(0,divY,W,1,GOLD+'33');

  // Bottom left — Goals
  s += sectionLabel(C1, divY+36, "GOALS AND HABITS");
  const goals=[
    {n:'Daily Reading',pct:74,tag:'11 days'},
    {n:'Exercise',     pct:88,tag:'14 days'},
    {n:'Meditation',   pct:60,tag:'7 days'},
    {n:'Cold Shower',  pct:45,tag:'4 days'},
  ];
  goals.forEach((g,i)=>{
    s+=barRow(C1,divY+64+i*148,CW,g.pct,g.n,g.tag);
    s+=T(C1,divY+64+i*148+46,`${g.pct}% complete`,{sz:17,fill:GRAY});
  });

  // Bottom right — People
  s += sectionLabel(C2, divY+36, "MY PEOPLE");
  const people=[
    {name:'Angela Rivera',  rel:'Mother',          urgent:true},
    {name:'Marcus Johnson', rel:'Best Friend',      urgent:false},
    {name:'Devon Williams', rel:'Mentor',           urgent:false},
    {name:'Priya Kapoor',   rel:'Business Partner', urgent:false},
  ];
  people.forEach((p,i)=>{
    const y=divY+58+i*136;
    s+=card(C2,y,CW,120,p.urgent,12);
    const ini=p.name.split(' ').map(w=>w[0]).join('');
    s+=`<circle cx="${C2+50}" cy="${y+60}" r="38" fill="${BG3}"/>`;
    s+=`<circle cx="${C2+50}" cy="${y+60}" r="38" fill="none" stroke="${p.urgent?GOLD:GOLD+'33'}" stroke-width="1.5"/>`;
    s+=T(C2+50,y+66,ini,{sz:20,fill:p.urgent?GOLD:GRAY,anchor:'middle',wt:'600'});
    s+=T(C2+100,y+44,p.name,{sz:20,wt:'600'});
    s+=T(C2+100,y+72,p.rel,{sz:17,fill:GOLD});
    if(p.urgent){
      s+=`<rect x="${C2+CW-100}" y="${y+38}" width="84" height="30" fill="${GOLD}" rx="15"/>`;
      s+=T(C2+CW-58,y+59,'Today',{sz:16,fill:BG,anchor:'middle',wt:'600'});
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
      width="${W}" height="${H}">
    <defs><radialGradient id="ibg1" cx="50%" cy="0%" r="65%">
      <stop offset="0%" stop-color="#1e1600"/>
      <stop offset="100%" stop-color="${BG}"/>
    </radialGradient></defs>
    ${R(0,0,W,H,'url(#ibg1)')}${s}
  </svg>`;
}

// ─── iPad 2 — Reflection & Stats ─────────────────────────────────────────────
function makeIpad2(){
  const W=VW, H=VH;

  let s = topBar(W);
  s += T(W-32,46,'Daily Reflection',{fam:'Cinzel',sz:24,fill:WHITE,anchor:'end'});
  s += T(W-32,80,'Wednesday, July 22',{sz:18,fill:GRAY,anchor:'end'});

  // Mood row
  s += sectionLabel(32,148,"HOW ARE YOU FEELING?");
  const moods=['Low','Okay','Good','Great','Amazing'];
  const mW=210,mH=128,mGap=14;
  moods.forEach((m,i)=>{
    const mx=32+i*(mW+mGap), act=i===3;
    s+=act
      ? `${R(mx,166,mW,mH,GOLD,14)}<rect x="${mx+1}" y="167" width="${mW-2}" height="${mH-2}" fill="${BG}" rx="13"/><rect x="${mx}" y="166" width="${mW}" height="${mH}" fill="${GOLD}" opacity="0.14" rx="14"/><rect x="${mx}" y="166" width="${mW}" height="${mH}" fill="none" stroke="${GOLD}" stroke-width="2" rx="14"/>`
      : `${card(mx,166,mW,mH,false,14)}`;
    s+=T(mx+mW/2,222,`${i+1}`,{fam:'Cinzel',sz:38,fill:act?GOLD:GRAY,anchor:'middle',wt:act?'700':'400'});
    s+=T(mx+mW/2,272,m,{sz:19,fill:act?GOLD:GRAY,anchor:'middle',wt:act?'600':'400'});
  });

  // Stats row
  s += sectionLabel(32,334,"THIS WEEK'S PROGRESS");
  const stats=[{val:'21',l:'Intentions'},{val:'7',l:'Days Consistent'},{val:'6',l:'Gratitude Entries'},{val:'14',l:'Day Streak'}];
  const stW=272,stH=180,stGap=18;
  stats.forEach((st,i)=>{
    const sx=32+i*(stW+stGap);
    s+=card(sx,352,stW,stH,false,16);
    s+=`<rect x="${sx}" y="352" width="${stW}" height="${stH}" fill="${GOLD}" opacity="0.06" rx="16"/>`;
    s+=T(sx+stW/2,434,st.val,{fam:'Cinzel',sz:56,fill:GOLD,wt:'700',anchor:'middle'});
    s+=T(sx+stW/2,472,st.l,{sz:17,fill:GRAY,anchor:'middle'});
  });

  // Reflection
  s += sectionLabel(32,572,"TODAY'S REFLECTION");
  s += card(32,594,W-64,246,true,18);
  s += T(70,638,'What did you learn today?',{sz:21,fill:GRAY});
  s += divLine(70,654,W-140,'rf1');
  s += T(70,692,'"Today I learned that consistency beats perfection every time.',{sz:22,fill:WHITE,italic:true});
  s += T(70,726,'Showing up — even imperfectly — is better than not showing up.',{sz:22,fill:WHITE,italic:true});
  s += T(70,760,'My 14-day streak proves I can do this."',{sz:22,fill:WHITE,italic:true});
  s += T(70,800,'Tap to continue writing...',{sz:19,fill:'#555'});

  // Weekly calendar
  s += sectionLabel(32,878,"THIS WEEK");
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const done=[true,true,true,true,true,true,false];
  const calW=W-64, cellW=calW/7;
  days.forEach((d,i)=>{
    const cx=32+i*cellW+cellW/2;
    s+=`<circle cx="${cx}" cy="948" r="46" fill="${done[i]?GOLD+'22':BG2}"/>
      <circle cx="${cx}" cy="948" r="46" fill="none" stroke="${done[i]?GOLD:GOLD+'22'}" stroke-width="${done[i]?2:1}"/>`;
    s+=T(cx,932,d,{sz:18,fill:GRAY,anchor:'middle'});
    s+=T(cx,960,done[i]?'v':'-',{sz:22,fill:done[i]?GOLD:'#444',anchor:'middle',wt:'700'});
  });

  // Quote
  s += card(32,1018,W-64,200,false,20);
  s += `<rect x="32" y="1018" width="${W-64}" height="200" fill="${GOLD}" opacity="0.05" rx="20"/>`;
  s += T(70,1070,'"',{fam:'Cinzel',sz:48,fill:GOLD});
  s += T(W/2,1098,'The secret of your future is hidden in your daily routine.',{fam:'Cinzel',sz:24,fill:WHITE,anchor:'middle',italic:true});
  s += T(W/2,1134,'— Mike Murdock',{sz:19,fill:GOLD,anchor:'middle'});
  s += T(W/2,1168,'Embrace the process. Trust the journey. Live with intention.',{sz:18,fill:GRAY,anchor:'middle'});

  // Bottom app showcase
  s += sectionLabel(32,1264,"EVERYTHING IN ONE PLACE");
  const features=[
    {icon:'*',label:'Daily Intentions',sub:'3 goals every day'},
    {icon:'@',label:'Gratitude Journal',sub:'Daily reflections'},
    {icon:'O',label:'My People',sub:'Stay connected'},
    {icon:'#',label:'Goals + Habits',sub:'Track progress'},
  ];
  const fW=(W-64-3*16)/4;
  features.forEach((f,i)=>{
    const fx=32+i*(fW+16);
    s+=card(fx,1284,fW,240,false,14);
    s+=T(fx+fW/2,1354,f.icon,{sz:40,fill:GOLD,anchor:'middle'});
    s+=T(fx+fW/2,1406,f.label,{sz:20,fill:WHITE,anchor:'middle',wt:'600'});
    s+=T(fx+fW/2,1438,f.sub,{sz:16,fill:GRAY,anchor:'middle'});
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
      width="${W}" height="${H}">
    <defs><radialGradient id="ibg2" cx="50%" cy="0%" r="65%">
      <stop offset="0%" stop-color="#1e1600"/>
      <stop offset="100%" stop-color="${BG}"/>
    </radialGradient></defs>
    ${R(0,0,W,H,'url(#ibg2)')}${s}
  </svg>`;
}

[
  ['ipad_screenshot_1.png', makeIpad1],
  ['ipad_screenshot_2.png', makeIpad2],
].forEach(([name,fn])=>{
  try { render(fn(),name); }
  catch(e){ console.error('FAIL',name,e.message); }
});
