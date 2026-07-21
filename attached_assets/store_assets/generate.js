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

function render(svgStr, outFile) {
  const resvg = new Resvg(svgStr, {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false },
    fitTo: { mode: 'original' },
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(`${OUT}/${outFile}`, png);
  console.log('OK', outFile);
}

// ─── tiny helpers ─────────────────────────────────────────────────────────────
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
  const icons=['*','@','O','#','~']; // simple safe chars
  const iW=W/5; const y=H-150;
  let s=`${R(0,y,W,150,BG2)}${R(0,y,W,1,GOLD,0)}`;
  items.forEach((lbl,i)=>{
    const cx=iW*i+iW/2, act=i===activeIdx;
    s+=T(cx,y+58,icons[i],{sz:32,fill:act?GOLD:'#555',anchor:'middle',wt:act?'700':'400'});
    s+=T(cx,y+106,lbl,{sz:20,fill:act?GOLD:'#555',anchor:'middle'});
    if(act) s+=`<rect x="${cx-28}" y="${H-6}" width="56" height="4" fill="${GOLD}" rx="2"/>`;
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

function barRow(x,y,w,pct,label,tag){
  return `${T(x,y,label,{sz:24,wt:'500'})}
    ${T(x+w,y,tag,{sz:20,fill:GOLD,anchor:'end',wt:'600'})}
    ${R(x,y+14,w,12,BG3,6)}
    <rect x="${x}" y="${y+14}" width="${w*pct/100}" height="12" fill="${GOLD}" rx="6"/>`;
}

function sectionLabel(x,y,txt){
  return T(x,y,txt,{fam:'Cinzel',sz:20,fill:GOLD,wt:'600'});
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE GRAPHIC  1024 x 500
// ─────────────────────────────────────────────────────────────────────────────
function makeFeature(){
  const W=1024,H=500;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
      width="${W}" height="${H}">
    <defs>
      <radialGradient id="bg" cx="42%" cy="50%" r="68%">
        <stop offset="0%" stop-color="#1e1600"/>
        <stop offset="100%" stop-color="${BG}"/>
      </radialGradient>
      <linearGradient id="gt" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${GOLDL}"/>
        <stop offset="55%" stop-color="${GOLD}"/>
        <stop offset="100%" stop-color="#8B6914"/>
      </linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="8" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    ${R(0,0,W,H,'url(#bg)')}
    <image href="${LOGO_HREF}" x="72" y="68" width="340" height="340" filter="url(#glow)"/>
    <rect x="454" y="72" width="2" height="352" fill="${GOLD}" opacity="0.32"/>
    <text x="486" y="172" font-family="Cinzel" font-size="80" font-weight="900"
      fill="url(#gt)">333 LIVES</text>
    ${divLine(486,192,500,'fg1')}
    ${T(486,252,'THREE INTENTIONS.',{fam:'Cinzel',sz:27,fill:GOLD})}
    ${T(486,302,'EVERY SINGLE DAY.',{fam:'Cinzel',sz:27,fill:WHITE})}
    ${divLine(486,324,500,'fg2')}
    ${T(486,374,'Your daily life management platform',{sz:22,fill:GRAY})}
  </svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHONE 1 — Today's Intentions  1080 x 1920
// ─────────────────────────────────────────────────────────────────────────────
function makePhone1(){
  const W=1080,H=1920;
  const intents=[
    {txt:'Morning meditation',  sub:'Personal growth',   done:true},
    {txt:'30-minute workout',   sub:'Health and fitness', done:true},
    {txt:'Read for 20 minutes', sub:'Learning and growth',done:false},
  ];
  let cards='';
  intents.forEach((it,i)=>{
    const y=870+i*178;
    cards+=card(56,y,968,155,!it.done);
    cards+=checkDot(120,y+77,36,it.done);
    const tc=it.done?'#666':WHITE;
    cards+=T(178,y+60,it.txt,{sz:28,wt:'600',fill:tc});
    cards+=T(178,y+100,it.sub,{sz:22,fill:it.done?'#555':GOLD});
    if(it.done) cards+=`<line x1="178" y1="${y+68}" x2="${178+it.txt.length*16}" y2="${y+68}" stroke="#555" stroke-width="1.5"/>`;
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
    ${ring(540,560,140,0.667,22)}
    ${T(540,538,'2',{fam:'Cinzel',sz:72,fill:GOLD,wt:'700',anchor:'middle'})}
    ${T(540,600,'of 3 done',{sz:24,fill:GRAY,anchor:'middle'})}
    ${cards}
    ${card(56,1432,968,112)}
    ${T(108,1498,'STREAK',{fam:'Cinzel',sz:22,fill:GOLD,wt:'700'})}
    ${T(108,1530,'14 days in a row',{sz:22,fill:GRAY})}
    ${T(W-100,1490,'14',{fam:'Cinzel',sz:64,fill:GOLD,wt:'900',anchor:'middle'})}
    ${T(W-100,1538,'days',{sz:20,fill:GRAY,anchor:'middle'})}
    ${navBar(W,H,0)}
  </svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHONE 2 — Gratitude Journal  1080 x 1920
// ─────────────────────────────────────────────────────────────────────────────
function makePhone2(){
  const W=1080,H=1920;
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
    const y=1160+i*222;
    ec+=card(56,y,968,198);
    ec+=T(92,y+44,e.date,{sz:24,wt:'600'});
    ec+=divLine(92,y+58,880,`e${i}`);
    ec+=T(92,y+94,e.body,{sz:22,fill:'#bbb',italic:true});
    ec+=T(92,y+130,bods[i],{sz:22,fill:'#bbb',italic:true});
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
    ${card(56,258,968,308,true)}
    ${T(96,316,'Today\'s Gratitude',{fam:'Cinzel',sz:26,fill:GOLD,wt:'600'})}
    ${divLine(96,334,880,'tdg')}
    ${T(96,384,'"I am grateful for the strength I found in',{sz:26,fill:WHITE,italic:true})}
    ${T(96,424,'this morning\'s workout and the clarity',{sz:26,fill:WHITE,italic:true})}
    ${T(96,464,'it gave me."',{sz:26,fill:WHITE,italic:true})}
    ${divLine(96,494,880,'tdg2')}
    ${T(96,534,'Tap to continue writing...',{sz:22,fill:'#555'})}
    ${sectionLabel(56,614,'RECENT ENTRIES')}
    ${ec}
    ${navBar(W,H,1)}
  </svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHONE 3 — My People  1080 x 1920
// ─────────────────────────────────────────────────────────────────────────────
function makePhone3(){
  const W=1080,H=1920;
  const people=[
    {name:'Angela Rivera',   rel:'Mother',           note:'Call on Sunday',           urgent:true},
    {name:'Marcus Johnson',  rel:'Best Friend',       note:'Check in this week',       urgent:false},
    {name:'Devon Williams',  rel:'Mentor',            note:'Schedule monthly call',    urgent:false},
    {name:'Priya Kapoor',    rel:'Business Partner',  note:'Review project together',  urgent:false},
    {name:'Coach Davis',     rel:'Trainer',           note:'Share progress update',    urgent:false},
  ];

  let cards='';
  people.forEach((p,i)=>{
    const y=270+i*196;
    cards+=card(56,y,968,170,p.urgent);
    // avatar circle
    cards+=`<circle cx="140" cy="${y+85}" r="58" fill="${BG3}"/>
      <circle cx="140" cy="${y+85}" r="58" fill="none" stroke="${p.urgent?GOLD:GOLD+'44'}" stroke-width="2"/>`;
    // initials
    const initials=p.name.split(' ').map(w=>w[0]).join('');
    cards+=T(140,y+92,initials,{sz:30,fill:p.urgent?GOLD:GRAY,anchor:'middle',wt:'600'});
    cards+=T(222,y+60,p.name,{sz:28,wt:'600'});
    cards+=T(222,y+98,p.rel,{sz:22,fill:GOLD});
    cards+=T(222,y+134,p.note,{sz:20,fill:GRAY});
    if(p.urgent){
      cards+=`<rect x="${W-184}" y="${y+66}" width="108" height="38" fill="${GOLD}" rx="19"/>`;
      cards+=T(W-130,y+91,'Today',{sz:20,fill:BG,anchor:'middle',wt:'600'});
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

// ─────────────────────────────────────────────────────────────────────────────
// TABLET 1 — Dashboard  1200 x 1920
// ─────────────────────────────────────────────────────────────────────────────
function makeTablet1(){
  const W=1200,H=1920;
  const C1=40,C2=630,CW=550,R1=140,R2=990;

  // top bar
  let s=`${R(0,0,W,116,BG2)}${R(0,115,W,1,GOLD,0)}`;
  s+=`<image href="${LOGO_HREF}" x="28" y="16" width="84" height="84"/>`;
  s+=T(126,54,'333 LIVES',{fam:'Cinzel',sz:30,fill:GOLD,wt:'700'});
  s+=T(126,90,'Wednesday, July 21, 2026',{sz:19,fill:GRAY});
  s+=T(W-40,52,'Good morning, Shad',{fam:'Cinzel',sz:30,fill:WHITE,wt:'600',anchor:'end'});
  s+=T(W-40,90,'14-Day Streak — Keep going',{sz:20,fill:GOLD,anchor:'end'});

  // ── Intentions top-left ──
  s+=sectionLabel(C1,R1+50,'TODAY\'S INTENTIONS');
  const intents=[
    {txt:'Morning meditation',   sub:'Personal growth',   done:true},
    {txt:'30-minute workout',    sub:'Health and fitness', done:true},
    {txt:'Read for 20 minutes',  sub:'Learning and growth',done:false},
  ];
  intents.forEach((it,i)=>{
    const y=R1+72+i*148;
    s+=card(C1,y,CW,128,!it.done,14);
    s+=checkDot(C1+56,y+64,28,it.done);
    s+=T(C1+100,y+46,it.txt,{sz:24,wt:'600',fill:it.done?'#666':WHITE});
    s+=T(C1+100,y+80,it.sub,{sz:20,fill:it.done?'#444':GOLD});
    if(it.done) s+=`<line x1="${C1+100}" y1="${y+54}" x2="${C1+100+it.txt.length*13.6}" y2="${y+54}" stroke="#555" stroke-width="1.2"/>`;
  });
  // mini ring
  s+=ring(C1+CW-90,R1+700,64,0.667,12);
  s+=T(C1+CW-90,R1+684,'67%',{fam:'Cinzel',sz:32,fill:GOLD,wt:'700',anchor:'middle'});
  s+=T(C1+CW-90,R1+730,'done',{sz:18,fill:GRAY,anchor:'middle'});

  // ── Gratitude top-right ──
  s+=sectionLabel(C2,R1+50,'GRATITUDE');
  s+=card(C2,R1+72,CW,198,true,14);
  s+=T(C2+32,R1+118,'Today\'s entry',{sz:22,fill:GRAY});
  s+=divLine(C2+32,R1+134,CW-64,`tg1`);
  s+=T(C2+32,R1+170,'"I am grateful for the strength I',{sz:22,fill:WHITE,italic:true});
  s+=T(C2+32,R1+202,'found in this morning\'s workout."',{sz:22,fill:WHITE,italic:true});
  s+=T(C2+32,R1+238,'— and the clarity it gave me.',{sz:20,fill:GRAY,italic:true});
  const gEntries=[
    'Tue — "Grateful for my support system..."',
    'Mon — "Thankful for this app..."',
    'Sun — "Good health, clarity, and purpose."',
  ];
  gEntries.forEach((e,i)=>{
    const y=R1+288+i*96;
    s+=card(C2,y,CW,80,false,12);
    s+=T(C2+28,y+46,e,{sz:20,fill:GRAY});
  });

  // ── Goals bottom-left ──
  s+=sectionLabel(C1,R2+50,'GOALS AND HABITS');
  const goals=[
    {n:'Daily Reading',pct:74,tag:'11 days'},
    {n:'Exercise',     pct:88,tag:'14 days'},
    {n:'Meditation',   pct:60,tag:'7 days'},
    {n:'Cold Shower',  pct:45,tag:'4 days'},
  ];
  goals.forEach((g,i)=>{
    s+=barRow(C1,R2+80+i*168,CW,g.pct,g.n,g.tag);
    s+=T(C1,R2+80+i*168+52,`${g.pct}% complete`,{sz:19,fill:GRAY});
  });

  // ── People bottom-right ──
  s+=sectionLabel(C2,R2+50,'MY PEOPLE');
  const people=[
    {name:'Angela Rivera',  rel:'Mother',           urgent:true},
    {name:'Marcus Johnson', rel:'Best Friend',       urgent:false},
    {name:'Devon Williams', rel:'Mentor',            urgent:false},
    {name:'Priya Kapoor',   rel:'Business Partner',  urgent:false},
  ];
  people.forEach((p,i)=>{
    const y=R2+80+i*164;
    s+=card(C2,y,CW,144,p.urgent,14);
    const ini=p.name.split(' ').map(w=>w[0]).join('');
    s+=`<circle cx="${C2+60}" cy="${y+72}" r="44" fill="${BG3}"/>`;
    s+=`<circle cx="${C2+60}" cy="${y+72}" r="44" fill="none" stroke="${p.urgent?GOLD:GOLD+'33'}" stroke-width="1.5"/>`;
    s+=T(C2+60,y+78,ini,{sz:24,fill:p.urgent?GOLD:GRAY,anchor:'middle',wt:'600'});
    s+=T(C2+120,y+52,p.name,{sz:24,wt:'600'});
    s+=T(C2+120,y+86,p.rel,{sz:20,fill:GOLD});
    if(p.urgent){
      s+=`<rect x="${C2+CW-110}" y="${y+46}" width="96" height="34" fill="${GOLD}" rx="17"/>`;
      s+=T(C2+CW-62,y+69,'Today',{sz:18,fill:BG,anchor:'middle',wt:'600'});
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
      width="${W}" height="${H}">
    <defs><radialGradient id="tbg1" cx="50%" cy="0%" r="65%">
      <stop offset="0%" stop-color="#1e1600"/>
      <stop offset="100%" stop-color="${BG}"/>
    </radialGradient></defs>
    ${R(0,0,W,H,'url(#tbg1)')}${s}
  </svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLET 2 — Reflection and Stats  1200 x 1920
// ─────────────────────────────────────────────────────────────────────────────
function makeTablet2(){
  const W=1200,H=1920;

  let s=`${R(0,0,W,116,BG2)}${R(0,115,W,1,GOLD,0)}`;
  s+=`<image href="${LOGO_HREF}" x="28" y="16" width="84" height="84"/>`;
  s+=T(126,54,'333 LIVES',{fam:'Cinzel',sz:30,fill:GOLD,wt:'700'});
  s+=T(126,90,'Daily Reflection',{sz:19,fill:GRAY});
  s+=T(W-40,70,'Wednesday, July 21, 2026',{fam:'Cinzel',sz:26,fill:WHITE,anchor:'end'});

  // Mood
  s+=sectionLabel(40,176,'HOW ARE YOU FEELING?');
  const moods=['Low','Okay','Good','Great','Amazing'];
  const mW=194,mH=152,mGap=18;
  moods.forEach((m,i)=>{
    const mx=40+i*(mW+mGap), act=i===3;
    s+=act
      ? `${R(mx,200,mW,mH,GOLD,16)}${R(mx,200,mW,mH,BG,14)}<rect x="${mx+1}" y="201" width="${mW-2}" height="${mH-2}" fill="${GOLD}" opacity="0.14" rx="15"/><rect x="${mx}" y="200" width="${mW}" height="${mH}" fill="none" stroke="${GOLD}" stroke-width="2" rx="16"/>`
      : `${card(mx,200,mW,mH,false,16)}`;
    const stars = i===0?'1':i===1?'2':i===2?'3':i===3?'4':'5';
    s+=T(mx+mW/2,264,stars,{fam:'Cinzel',sz:44,fill:act?GOLD:GRAY,anchor:'middle',wt:act?'700':'400'});
    s+=T(mx+mW/2,340,m,{sz:22,fill:act?GOLD:GRAY,anchor:'middle',wt:act?'600':'400'});
  });

  // Stats grid
  s+=sectionLabel(40,398,'THIS WEEK\'S PROGRESS');
  const stats=[
    {val:'21',l1:'Intentions',l2:'Completed'},
    {val:'7', l1:'Days',      l2:'Consistent'},
    {val:'6', l1:'Gratitude', l2:'Entries'},
    {val:'14',l1:'Day',       l2:'Streak'},
  ];
  const stW=258,stH=224,stGap=26;
  stats.forEach((st,i)=>{
    const sx=40+i*(stW+stGap);
    s+=card(sx,420,stW,stH,false,20);
    s+=`<rect x="${sx}" y="420" width="${stW}" height="${stH}" fill="${GOLD}" opacity="0.06" rx="20"/>`;
    s+=T(sx+stW/2,520,st.val,{fam:'Cinzel',sz:64,fill:GOLD,wt:'700',anchor:'middle'});
    s+=T(sx+stW/2,576,`${st.l1} ${st.l2}`,{sz:20,fill:GRAY,anchor:'middle'});
  });

  // Reflection
  s+=sectionLabel(40,700,'TODAY\'S REFLECTION');
  s+=card(40,724,1120,298,true,20);
  s+=T(80,776,'What did you learn today?',{sz:24,fill:GRAY});
  s+=divLine(80,796,1040,'rf1');
  s+=T(80,842,'"Today I learned that consistency beats perfection every time.',{sz:26,fill:WHITE,italic:true});
  s+=T(80,886,'Showing up — even imperfectly — is better than not showing up.',{sz:26,fill:WHITE,italic:true});
  s+=T(80,930,'My 14-day streak proves I can do this."',{sz:26,fill:WHITE,italic:true});
  s+=divLine(80,964,1040,'rf2');
  s+=T(80,1004,'Tap to continue writing...',{sz:22,fill:'#555'});

  // Weekly calendar
  s+=sectionLabel(40,1088,'THIS WEEK');
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const done=[true,true,true,true,true,true,false];
  const calW=1120, cellW=calW/7;
  days.forEach((d,i)=>{
    const cx=40+i*cellW+cellW/2;
    s+=`<circle cx="${cx}" cy="1170" r="54" fill="${done[i]?GOLD+'22':BG2}"/>
      <circle cx="${cx}" cy="1170" r="54" fill="none" stroke="${done[i]?GOLD:GOLD+'22'}" stroke-width="${done[i]?2:1}"/>`;
    s+=T(cx,1150,d,{sz:20,fill:GRAY,anchor:'middle'});
    s+=T(cx,1182,done[i]?'v':'-',{sz:26,fill:done[i]?GOLD:'#444',anchor:'middle',wt:'700'});
  });

  // Quote
  s+=card(40,1272,1120,242,false,24);
  s+=`<rect x="40" y="1272" width="1120" height="242" fill="${GOLD}" opacity="0.05" rx="24"/>`;
  s+=T(86,1330,'"',{fam:'Cinzel',sz:56,fill:GOLD});
  s+=T(600,1358,'The secret of your future is hidden in your daily routine.',{fam:'Cinzel',sz:28,fill:WHITE,anchor:'middle',italic:true});
  s+=T(600,1402,'— Mike Murdock',{sz:22,fill:GOLD,anchor:'middle'});
  s+=T(600,1448,'Embrace the process. Trust the journey. Live with intention.',{sz:21,fill:GRAY,anchor:'middle'});

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
      width="${W}" height="${H}">
    <defs><radialGradient id="tbg2" cx="50%" cy="0%" r="65%">
      <stop offset="0%" stop-color="#1e1600"/>
      <stop offset="100%" stop-color="${BG}"/>
    </radialGradient></defs>
    ${R(0,0,W,H,'url(#tbg2)')}${s}
  </svg>`;
}

// ─── render all ───────────────────────────────────────────────────────────────
[
  ['feature_graphic.png',    makeFeature ],
  ['phone_screenshot_1.png', makePhone1  ],
  ['phone_screenshot_2.png', makePhone2  ],
  ['phone_screenshot_3.png', makePhone3  ],
  ['tablet_screenshot_1.png',makeTablet1 ],
  ['tablet_screenshot_2.png',makeTablet2 ],
].forEach(([name,fn])=>{
  try { render(fn(),name); }
  catch(e){ console.error('FAIL',name,e.message); }
});
