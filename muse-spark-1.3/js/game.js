'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const COLS = 15, ROWS = 13, TILE = 40, W = COLS * TILE, H = ROWS * TILE;
const SCALE = 2;
const DIRS = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };
const OPP = { up:'down', down:'up', left:'right', right:'left' };
const $ = id => document.getElementById(id);

const TUNING = {
  bombFuse: 2.2,
  flameTime: 0.55,
  playerSpeed: 132,
  playerFire: 2,
  playerBombs: 1,
  maxFire: 8,
  maxBombs: 8,
  maxSpeed: 225,
  maxLives: 5,
  spawnInvuln: 2.5,
  hitInvuln: 2.5,
  slideSpeed: 340,
  kickRange: 99,
  punchRange: 3,
  stockMax: 2,
  hideoutHp: 8,
  flashRate: 12,
};

const THEMES={
  mountain:{ g1:'#46b04f', g2:'#3a9443', solid:'#6b5a4a', solidD:'#453a30', glow:'#ffd23f' },
  cave:    { g1:'#5a4a6e', g2:'#4c3d5e', solid:'#3d3348', solidD:'#241d2e', glow:'#c77dff' },
  arena:   { g1:'#7a8a99', g2:'#6b7a89', solid:'#4a4a58', solidD:'#2c2c36', glow:'#ff9f1c' },
};
const EMPTY=0, SOLID=1, SOFT=2, WATER=3, BRIDGE=4;
const AREAS=[
  { code:'1-1', era:'ERA PRIMITIVA · Montanha', time:179, fill:0.55, theme:'mountain', river:true, rocks:false,
    enemies:[['trike',4]], hideout:false, cage:null, boss:null, music:0,
    items:['bomb','fire','speed','clock'] },
  { code:'1-2', era:'ERA PRIMITIVA · Montanha', time:179, fill:0.58, theme:'mountain', river:true, rocks:true,
    enemies:[['demon',4]], hideout:false, cage:'red', boss:null, music:1,
    items:['bomb','fire','glove'] },
  { code:'1-3', era:'ERA PRIMITIVA · Montanha', time:239, fill:0.60, theme:'mountain', river:true, rocks:true,
    enemies:[['trike',2],['demon',2]], hideout:false, cage:null, boss:null, music:0,
    items:['bomb','fire','speed'] },
  { code:'1-4', era:'ERA PRIMITIVA · Caverna', time:239, fill:0.62, theme:'cave', river:false, rocks:false,
    enemies:[['uhho',4]], hideout:true, cage:'blue', boss:null, music:2,
    items:['bomb','spike','glove','clock'] },
  { code:'1-5', era:'ERA PRIMITIVA · Caverna', time:239, fill:0.62, theme:'cave', river:false, rocks:false,
    enemies:[['uhho',3],['dogunjr',2]], hideout:true, cage:null, boss:null, music:2,
    items:['fire','heart','food'] },
  { code:'1-6', era:'ERA PRIMITIVA · Caverna', time:239, fill:0.64, theme:'cave', river:false, rocks:false,
    enemies:[['angora',4]], hideout:false, cage:'green', boss:null, music:3,
    items:['bomb','kick','glove'] },
  { code:'1-7', era:'RIVAL · HAMMER BOMBER', time:Infinity, fill:0.35, theme:'arena', river:false, rocks:false,
    enemies:[['hammer',1]], hideout:false, cage:null, boss:'hammer', music:4,
    items:['bomb','fire','speed','kick','push'] },
  { code:'1-8', era:'CHEFE · DOGUN', time:Infinity, fill:0, theme:'arena', river:false, rocks:false,
    enemies:[['dogun',1]], hideout:false, cage:null, boss:'dogun', music:4,
    items:[] },
];
const PASSWORDS=['7352','8831','7255','5714','5289','1352','6892','6722'];
const ENEMY_DEF={
  trike:  { speed:48,  score:100, hp:1, ai:'straight' },
  demon:  { speed:60,  score:200, hp:1, ai:'aim' },
  uhho:   { speed:66,  score:200, hp:1, ai:'chase' },
  dogunjr:{ speed:55,  score:0,   hp:1, ai:'kickseek', egg:'dogun' },
  angora: { speed:62,  score:400, hp:1, ai:'dive', egg:'angora' },
  hammer: { speed:55,  score:800, hp:4, ai:'bossHammer', boss:true },
  dogun:  { speed:34,  score:3200,hp:9, ai:'bossDogun', boss:true, big:true },
};
// trike vira ovo de dinossauro ao morrer
ENEMY_DEF.trike.egg='dino';
// criaturas montáveis: ovo bio (claro) / mecânico (preto)
const MOUNTS={
  dino:  { name:'Dino', bio:true,  ability:'spike', abName:'Bomba perfurante', emoji:'🦕' },
  dogun: { name:'Dogun Jr.', bio:false, ability:'kick', abName:'Chute automático', emoji:'🏺' },
  angora:{ name:'Angora', bio:true, ability:'wpass', abName:'Atravessa blocos', emoji:'🐟' },
};
const ITEM_INFO={
  fire:{n:'FOGO+',e:'🔥'}, bomb:{n:'BOMBA+',e:'💣'}, speed:{n:'VEL+',e:'👟'},
  heart:{n:'CORAÇÃO!',e:'❤️'}, glove:{n:'SOCO!',e:'🥊'}, kick:{n:'CHUTE!',e:'🦵'},
  remote:{n:'REMOTO!',e:'🎮'}, spike:{n:'PERFURA!',e:'🌟'}, clock:{n:'RELÓGIO!',e:'⏱️'},
  vest:{n:'COLETE!',e:'🦺'}, food:{n:'+500',e:'🍰'}, potato:{n:'+1000',e:'🥔'},
  oneup:{n:'1UP!',e:'⭐'}, sandals:{n:'LENTO!',e:'🩴'}, push:{n:'EMPURRA!',e:'✋'},
};

// ---------- AUDIO (WebAudio puro) ----------
const AU = {
  ctx:null, master:null, musicGain:null, muted:false, musicTimer:null,
  step:0, level:0, urgent:false,
  init(){
    if (this.ctx) { if (this.ctx.state==='suspended') this.ctx.resume(); return; }
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.30; this.musicGain.connect(this.master);
      const m = localStorage.getItem('bomber_mute'); if (m==='1'){ this.muted=true; this.master.gain.value=0; }
      syncMuteBtn();
    }catch(e){ /* sem áudio */ }
  },
  toggleMute(){
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    try{ localStorage.setItem('bomber_mute', this.muted?'1':'0'); }catch(e){}
    syncMuteBtn();
  },
  tone(freq, dur, type, vol, slideTo, when, dest){
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + (when||0);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type||'square'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo), t+dur);
    g.gain.setValueAtTime(vol||0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t+dur);
    o.connect(g); g.connect(dest||this.master);
    o.start(t); o.stop(t+dur+0.02);
  },
  noise(dur, vol, freq){
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, len = Math.floor(this.ctx.sampleRate*dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
    const src=this.ctx.createBufferSource(); src.buffer=buf;
    const f=this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=freq||900;
    const g=this.ctx.createGain(); g.gain.setValueAtTime(vol||0.5,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
  },
  // --- sfx ---
  place(){ this.tone(220,0.12,'square',0.22,330); },
  tick(){ this.tone(1200,0.05,'square',0.10); },
  boom(){ this.noise(0.55,0.6,700); this.tone(90,0.45,'sawtooth',0.35,35); },
  pickup(){ this.tone(523,0.09,'square',0.22); this.tone(784,0.12,'square',0.22,null,0.09); },
  hurt(){ this.tone(400,0.4,'sawtooth',0.3,80); },
  kill(){ this.tone(600,0.18,'square',0.25,1200); },
  door(){ this.tone(330,0.12,'triangle',0.3); this.tone(440,0.12,'triangle',0.3,null,0.12); this.tone(660,0.2,'triangle',0.3,null,0.24); },
  clear(){ [523,659,784,1046].forEach((f,i)=>this.tone(f,0.16,'square',0.22,null,i*0.11)); },
  over(){ [392,330,262,196].forEach((f,i)=>this.tone(f,0.25,'sawtooth',0.22,null,i*0.18)); },
  win(){ [523,659,784,1046,784,1046,1318].forEach((f,i)=>this.tone(f,0.18,'square',0.22,null,i*0.13)); },
  mount(){ this.tone(392,0.09,'square',0.22); this.tone(587,0.14,'square',0.22,null,0.09); },
  // --- música: step-sequencer pentatônico, muda por fase ---
  startMusic(lv){
    this.stopMusic(); if(!this.ctx) return;
    this.level = lv; this.step = 0; this.urgent = false;
    const roots=[130.8,146.8,164.8,138.6,155.6];
    const base = roots[lv%roots.length];
    const N = n => base*Math.pow(2,n/12);
    const bassPat=[0,0,7,0, 5,0,3,2, 0,0,7,0, 5,7,10,7];
    const leadPat=[0,-1,4,-1, 7,-1,4,2, 0,-1,4,-1, 9,7,4,2];
    const tickFn=()=>{
      if(this.muted||!this.ctx) { this.step++; return; }
      const i=this.step%16;
      const b=bassPat[i], l=leadPat[i];
      this.tone(N(b),0.16,'triangle',0.5,undefined,0,this.musicGain);
      if(l>=0) this.tone(N(l)*2,0.14,'square',0.16,undefined,0,this.musicGain);
      if(i%4===0) this.tone(6000,0.03,'square',0.05); // chimbal sintético
      this.step++;
    };
    this.musicTimer=setInterval(tickFn, this.urgent?130:175);
  },
  setUrgent(u){
    if(u===this.urgent||!this.musicTimer) return;
    this.urgent=u; this.startMusic(this.level);
  },
  stopMusic(){ if(this.musicTimer){clearInterval(this.musicTimer);this.musicTimer=null;} }
};
function syncMuteBtn(){ const b=$('btn-mute'); if(b) b.textContent = AU.muted?'🔇':'🔊'; }

// ---------- INPUT ----------
const keys={};
let bombQueued=false, actQueued=false;
const TOUCHMAP={up:'up',down:'down',left:'left',right:'right'};
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k===' '?' ':k)) e.preventDefault();
  AU.init();
  if(k==='arrowup'||k==='w') keys.up=true;
  else if(k==='arrowdown'||k==='s') keys.down=true;
  else if(k==='arrowleft'||k==='a') keys.left=true;
  else if(k==='arrowright'||k==='d') keys.right=true;
  else if(k===' '||k==='enter'||k==='z'){
    if(e.repeat) return;
    if(G.state==='title') startGame();
    else if(G.state==='over'||G.state==='win') startGame();
    else bombQueued=true;
  }
  else if(k==='x'||k==='shift'||k==='c'){ if(!e.repeat) actQueued=true; }
  else if(k==='p') togglePause();
  else if(k==='m') AU.toggleMute();
});
addEventListener('keyup',e=>{
  const k=e.key.toLowerCase();
  if(k==='arrowup'||k==='w') keys.up=false;
  else if(k==='arrowdown'||k==='s') keys.down=false;
  else if(k==='arrowleft'||k==='a') keys.left=false;
  else if(k==='arrowright'||k==='d') keys.right=false;
});
document.querySelectorAll('#dpad button').forEach(b=>{
  const k=b.dataset.k;
  const on=e=>{e.preventDefault();AU.init();keys[TOUCHMAP[k]]=true;};
  const off=e=>{e.preventDefault();keys[TOUCHMAP[k]]=false;};
  b.addEventListener('touchstart',on,{passive:false}); b.addEventListener('touchend',off);
  b.addEventListener('mousedown',on); b.addEventListener('mouseup',off); b.addEventListener('mouseleave',off);
});
$('btn-bomb-t').addEventListener('touchstart',e=>{e.preventDefault();AU.init();bombQueued=true;},{passive:false});
$('btn-bomb-t').addEventListener('mousedown',e=>{e.preventDefault();bombQueued=true;});
const _actT=$('btn-act-t');
if(_actT){ _actT.addEventListener('touchstart',e=>{e.preventDefault();AU.init();actQueued=true;},{passive:false}); _actT.addEventListener('mousedown',e=>{e.preventDefault();actQueued=true;}); }
$('btn-start').onclick=()=>{AU.init();startGame();};
$('btn-pw').onclick=()=>{
  AU.init();
  const v=($('pw-input').value||'').trim();
  const i=PASSWORDS.indexOf(v);
  if(i>=0){ G.score=0; G.lives=3; loadLevel(i); }
  else { $('pw-input').value=''; $('pw-input').placeholder='???'; }
};
$('btn-retry').onclick=()=>{AU.init();startGame();};
$('btn-again').onclick=()=>{AU.init();startGame();};
$('btn-menu1').onclick=()=>toTitle(); $('btn-menu2').onclick=()=>toTitle();
$('btn-mute').onclick=()=>{AU.init();AU.toggleMute();};
$('btn-pause').onclick=()=>togglePause();

// ---------- ESTADO ----------
const G={
  state:'title', stateT:0,
  level:0, score:0, hi:0, lives:3,
  map:[], hidden:{}, holes:{}, goal:null,
  player:null, bombs:[], flames:[], flameSet:new Set(),
  enemies:[], hideouts:[], roamflames:[], eggs:[], allies:[], rocks:[],
  powerups:[], particles:[], floaters:[],
  timeLeft:0, freezeT:0, rockT:14, shake:0, t:0,
};
try{ G.hi=parseInt(localStorage.getItem('bomber_hi')||'0',10)||0; }catch(e){}
function saveHi(){ if(G.score>G.hi){G.hi=G.score; try{localStorage.setItem('bomber_hi',String(G.hi));}catch(e){}} }

const SCREENS=['screen-title','screen-intro','screen-clear','screen-over','screen-win','screen-pause'];
function show(id){ SCREENS.forEach(s=>$(s).classList.toggle('show',s===id)); }
function theme(){ return THEMES[AREAS[G.level].theme]; }
function area(){ return AREAS[G.level]; }

// ---------- FASE ----------
function startGame(){
  G.score=0; G.lives=3; G.level=0;
  loadLevel(0);
}
function toTitle(){ G.state='title'; AU.stopMusic(); show('screen-title'); updateHUD(); }
function createPlayer(){
  return {
    px:1*TILE+6, py:1*TILE+4, w:28, h:32, dir:'down', moving:false,
    speed:TUNING.playerSpeed, baseSpeed:TUNING.playerSpeed,
    fire:TUNING.playerFire, maxBombs:TUNING.playerBombs, invuln:TUNING.spawnInvuln,
    guard:false, glove:false, kick:false, remote:false, spike:false, push:false,
    slowT:0, mount:null, stock:[], walk:0, dead:false,
  };
}
function createBomb(tx,ty,opts={}){
  return {
    tx, ty, fuse:opts.fuse ?? TUNING.bombFuse, range:opts.range ?? 2,
    pass:opts.pass ?? true, tickSnd:0,
    remote:!!opts.remote, spike:!!opts.spike, sx:0, sy:0, sliding:false,
    owner:opts.owner ?? 'p',
  };
}
function loadLevel(idx){
  G.level=idx;
  const L=AREAS[idx];
  // mapa: 0 vazio, 1 sólido, 2 destrutível, 3 água, 4 ponte, 5 buraco
  G.map=[];
  for(let y=0;y<ROWS;y++){ G.map.push([]); for(let x=0;x<COLS;x++){
    if(x===0||y===0||x===COLS-1||y===ROWS-1) G.map[y].push(1);
    else if(L.river&&y===6) G.map[y].push((x>=6&&x<=8)?BRIDGE:WATER);
    else if(x%2===0&&y%2===0) G.map[y].push(1);
    else G.map[y].push(0);
  }}
  const safe=new Set(['1,1','1,2','2,1','1,3','3,1']);
  const softCells=[];
  for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++){
    if(G.map[y][x]!==0||safe.has(x+','+y)) continue;
    if(Math.random()<L.fill){ G.map[y][x]=2; softCells.push([x,y]); }
  }
  for(let i=softCells.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[softCells[i],softCells[j]]=[softCells[j],softCells[i]];}
  G.hidden={}; G.holes={}; G.goal=null;
  // esconderijo Wohho (1-4, 1-5): sólido com HP, cospe Uhho
  G.hideouts=[];
  if(L.hideout){
    const c=freeCellAny(7);
    if(c){
      G.map[c.y][c.x]=1; G.hideouts.push({tx:c.x,ty:c.y,hp:8,spawnT:5,alive:true});
      // respiro ao redor: remove macios vizinhos (sempre alcança e cospe)
      const cleared=new Set();
      for(const k of ['up','down','left','right']){
        const nx=c.x+DIRS[k].x, ny=c.y+DIRS[k].y;
        if(nx>0&&ny>0&&nx<COLS-1&&ny<ROWS-1&&G.map[ny][nx]===2){ G.map[ny][nx]=0; cleared.add(nx+','+ny); }
      }
      for(let i=softCells.length-1;i>=0;i--) if(cleared.has(softCells[i][0]+','+softCells[i][1])) softCells.splice(i,1);
    }
  }
  // itens da área (fiéis ao SB4) + jaula com aliado
  L.items.forEach((kind,i)=>{
    if(!softCells.length) return;
    const [px,py]=softCells.pop();
    G.hidden[px+','+py]={type:'power',kind};
  });
  if(L.cage&&softCells.length){
    const [px,py]=softCells.pop();
    G.hidden[px+','+py]={type:'cage',color:L.cage};
  }
  G.bombs=[];G.flames=[];G.flameSet=new Set();G.powerups=[];G.particles=[];G.floaters=[];
  G.enemies=[];G.roamflames=[];G.eggs=[];G.allies=[];G.rocks=[];
  G.player={ px:1*TILE+6, py:1*TILE+4, w:28, h:32, dir:'down', moving:false,
    speed:132, baseSpeed:132, fire:2, maxBombs:1, invuln:2.5,
    guard:false, glove:false, kick:false, remote:false, spike:false, push:false,
    slowT:0, mount:null, stock:[], walk:0, dead:false };
  L.enemies.forEach(([type,count])=>{ for(let i=0;i<count;i++) spawnEnemy(type); });
  G.timeLeft=L.time; G.freezeT=0; G.rockT=14; G.shake=0;
  // tela intro
  G.state='intro'; G.stateT=0;
  $('intro-title').textContent='ÁREA '+L.code+' / 8';
  $('intro-sub').textContent=L.era+' • '+fmtEnemies(L.enemies);
  $('intro-enemies').textContent=enemyEmojis(L.enemies)+(L.hideout?' 🦴':'')+(L.cage?' 🛖':'');
  show('screen-intro');
  AU.stopMusic(); AU.startMusic(L.music);
  updateHUD();
}
function fmtEnemies(list){ return list.map(([t,c])=>c+'× '+({trike:'Triceradops',demon:'Little Demon',uhho:'Uhho',dogunjr:'Dogun Jr.',angora:'Angora',hammer:'HAMMER BOMBER',dogun:'DOGUN'}[t])).join(' • '); }
function enemyEmojis(list){
  const e={trike:'🦕',demon:'😈',uhho:'🦍',dogunjr:'🏺',angora:'🐟',hammer:'🔨',dogun:'🗿'};
  return list.map(([t,c])=>e[t].repeat(Math.min(c,4))).join(' ');
}
// célula livre qualquer (p/ esconderijo, goal, itens)
function freeCellAny(minDist){
  for(let a=0;a<400;a++){
    const x=1+((Math.random()*(COLS-2))|0), y=1+((Math.random()*(ROWS-2))|0);
    if(G.map[y][x]!==0) continue;
    if(Math.abs(x-1)+Math.abs(y-1)<(minDist||5)) continue;
    return {x,y};
  }
  return null;
}
function freeCellForEnemy(type){
  for(let a=0;a<600;a++){
    const x=1+((Math.random()*(COLS-2))|0), y=1+((Math.random()*(ROWS-2))|0);
    const v=G.map[y][x];
    if(v!==0&&v!==BRIDGE) continue;
    if(G.bombs.some(b=>b.tx===x&&b.ty===y)) continue;
    if(G.powerups.some(p=>p.tx===x&&p.ty===y)) continue;
    const dx=Math.abs(x-1)+Math.abs(y-1); if(dx<6) continue;
    if(G.enemies.some(e=>Math.abs(e.tx-x)+Math.abs(e.ty-y)<2)) continue;
    // exige vizinhança aberta p/ não nascer encaixotado
    let open=0;
    for(const k of ['up','down','left','right']){
      const nx=x+DIRS[k].x, ny=y+DIRS[k].y;
      if(nx<1||ny<1||nx>=COLS-1||ny>=ROWS-1) continue;
      const v=G.map[ny][nx];
      if(v===0||v===BRIDGE) open++;
    }
    if(open<2) continue;
    return {x,y};
  }
  return null;
}
function spawnEnemy(type,fx,fy){
  const d=ENEMY_DEF[type];
  let c=fx!==undefined?{x:fx,y:fy}:freeCellForEnemy(type);
  if(!c) return;
  const dirs=['up','down','left','right'];
  const big=!!d.boss&&type==='dogun';
  const w=big?52:(type==='hammer'?34:32), h=big?52:(type==='hammer'?38:32);
  G.enemies.push({ tx:c.x, ty:c.y, px:c.x*TILE+TILE/2-w/2, py:c.y*TILE+TILE/2-h/2, w, h,
    type, dir:dirs[(Math.random()*4)|0], speed:d.speed*(0.92+Math.random()*0.16),
    hp:d.hp, maxHp:d.hp, ai:d.ai, boss:!!d.boss, egg:d.egg||null,
    hitCd:0, pauseT:0, diveT:3+Math.random()*3, diving:false, atkCd:3, bombCd:4,
    frame:Math.random()*10, wob:Math.random()*10, alive:true });
}

// ---------- COLISÃO ----------
function cellSolid(tx,ty,ghost){
  if(tx<0||ty<0||tx>=COLS||ty>=ROWS) return true;
  // buraco de ponte colapsada bloqueia até reconstruir
  if(G.holes[tx+','+ty]>0) return true;
  const v=G.map[ty][tx];
  if(v===1||v===WATER) return true;
  if(v===2&&!ghost) return true;
  return false;
}
function bombAt(tx,ty){ return G.bombs.find(b=>b.tx===tx&&b.ty===ty); }
function rectHitsWall(x,y,w,h,ghost,ignoreBomb){
  const x0=Math.floor(x/TILE), x1=Math.floor((x+w-1)/TILE);
  const y0=Math.floor(y/TILE), y1=Math.floor((y+h-1)/TILE);
  for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
    if(cellSolid(tx,ty,ghost)) return true;
    if(!ignoreBomb){ const b=bombAt(tx,ty); if(b&&!b.pass) return true; }
  }
  return false;
}
// move com slide-assist (arredonda para o corredor)
function moveEntity(e,dx,dy,ghost){
  // assist: puxa para o centro do corredor perpendicular
  if(dx!==0&&dy===0){
    const cy=Math.floor((e.py+e.h/2)/TILE)*TILE+TILE/2;
    const off=cy-(e.py+e.h/2);
    if(Math.abs(off)>2) e.py+=Math.sign(off)*Math.min(Math.abs(off),90*dtGlobal);
  } else if(dy!==0&&dx===0){
    const cx=Math.floor((e.px+e.w/2)/TILE)*TILE+TILE/2;
    const off=cx-(e.px+e.w/2);
    if(Math.abs(off)>2) e.px+=Math.sign(off)*Math.min(Math.abs(off),90*dtGlobal);
  }
  if(dx!==0){
    const nx=e.px+dx;
    if(!rectHitsWall(nx,e.py,e.w,e.h,ghost)) e.px=nx;
  }
  if(dy!==0){
    const ny=e.py+dy;
    if(!rectHitsWall(e.px,ny,e.w,e.h,ghost)) e.py=ny;
  }
  e.px=Math.max(2,Math.min(W-e.w-2,e.px));
  e.py=Math.max(2,Math.min(H-e.h-2,e.py));
}
function tileOf(e){ return { x:Math.floor((e.px+e.w/2)/TILE), y:Math.floor((e.py+e.h/2)/TILE) }; }
function atTileCenter(e,slack){
  const cx=Math.floor((e.px+e.w/2)/TILE)*TILE+TILE/2-(e.px+e.w/2);
  const cy=Math.floor((e.py+e.h/2)/TILE)*TILE+TILE/2-(e.py+e.h/2);
  return Math.abs(cx)<(slack||4)&&Math.abs(cy)<(slack||4);
}
function snapCenter(e){
  e.px=Math.floor((e.px+e.w/2)/TILE)*TILE+TILE/2-e.w/2;
  e.py=Math.floor((e.py+e.h/2)/TILE)*TILE+TILE/2-e.h/2;
}

// ---------- BOMBAS / EXPLOSÃO ----------
function activeBombs(){ return G.bombs.length; }
function tryPlaceBomb(){
  const p=G.player; if(!p||p.dead||G.state!=='playing') return;
  const t=tileOf(p);
  if(bombAt(t.x,t.y)) return;
  if(activeBombs()>=p.maxBombs) return;
  const spike=!!p.spike||(p.mount&&p.mount.c==='dino');
  G.bombs.push({tx:t.x,ty:t.y,fuse:p.remote?Infinity:2.2,range:p.fire,pass:true,tickSnd:0,
    remote:!!p.remote, spike, sx:0, sy:0, sliding:false, owner:'p'});
  AU.place();
}
// desliza bomba (chute/soco/empurrão): pierce = voa sobre bloco macio (soco)
function slideBomb(b,dx,dy,maxTiles,pierce){
  if(b.sliding) return false;
  let dist=0;
  for(let i=1;i<=maxTiles;i++){
    const x=b.tx+dx*i, y=b.ty+dy*i;
    if(x<0||y<0||x>=COLS||y>=ROWS) break;
    const v=G.map[y][x];
    if(v===1||v===WATER||v===HOLE||G.holes[x+','+y]>0) break;
    if(!pierce&&v===2) break;
    if(bombAt(x,y)) break;
    dist=i;
  }
  if(!dist) return false;
  b.sx=-dx*dist*TILE; b.sy=-dy*dist*TILE;
  b.tx+=dx*dist; b.ty+=dy*dist;
  b.pass=false; b.sliding=true;
  AU.tick();
  return true;
}
// botão de ação X: detona remoto > soco com luva
function useAction(){
  const p=G.player; if(!p||p.dead||G.state!=='playing') return;
  const remotes=G.bombs.filter(b=>b.remote&&b.owner==='p');
  if(remotes.length){ remotes.forEach(b=>{ b.fuse=0.01; }); AU.place(); return; }
  if(p.glove){
    const d=DIRS[p.dir], t=tileOf(p);
    const b=bombAt(t.x+d.x,t.y+d.y)||bombAt(t.x,t.y);
    if(b&&!b.sliding){ slideBomb(b,d.x,d.y,3,true); burst(b.tx*TILE+20,b.ty*TILE+20,'#fff',6); }
  }
}
function computeBlast(tx,ty,range,spike){
  const cells=[{x:tx,y:ty,k:'c'}];
  const dirs=[['up',0,-1,'v'],['down',0,1,'v'],['left',-1,0,'h'],['right',1,0,'h']];
  for(const [,dx,dy,axis] of dirs){
    for(let i=1;i<=range;i++){
      const x=tx+dx*i, y=ty+dy*i;
      if(x<0||y<0||x>=COLS||y>=ROWS) break;
      const hd=G.hideouts.find(h=>h.alive&&h.tx===x&&h.ty===y);
      if(G.map[y][x]===1&&!hd) break;
      if(hd){ cells.push({x,y,k:axis,end:true,dx,dy}); break; } // chama lambe o esconderijo e para
      if(G.map[y][x]===WATER) break;
      cells.push({x,y,k:axis,end:(i===range)||(!spike&&G.map[y][x]===2),dx,dy});
      if(G.map[y][x]===2&&!spike) break; // perfurante atravessa vários macios
    }
  }
  return cells;
}
function detonate(bomb){
  bomb.dead=true;
  const cells=computeBlast(bomb.tx,bomb.ty,bomb.range,bomb.spike);
  G.flames.push({cells,t:0,dur:0.55});
  cells.forEach(c=>G.flameSet.add(c.x+','+c.y));
  // destrói blocos + revela
  cells.forEach(c=>{
    if(G.map[c.y]&&G.map[c.y][c.x]===2){
      G.map[c.y][c.x]=0; addScore(10,c.x,c.y);
      burst(c.x*TILE+20,c.y*TILE+20,'#b7bfd2',10);
      const h=G.hidden[c.x+','+c.y];
      if(h){
        if(h.type==='cage'){ spawnAlly(h.color,c.x,c.y); floater(c.x,c.y,'ALIADO!','#7dff9b'); AU.door(); }
        else { G.powerups.push({tx:c.x,ty:c.y,kind:h.kind,bob:Math.random()*6}); }
        delete G.hidden[c.x+','+c.y];
      }
    }
    // esconderijo Wohho sofre dano
    const hd=G.hideouts.find(h=>h.alive&&h.tx===c.x&&h.ty===c.y);
    if(hd) damageHideout(hd);
    // ponte bombardeada colapsa (temporário)
    if(G.map[c.y]&&G.map[c.y][c.x]===BRIDGE&&!G.holes[c.x+','+c.y]){
      G.holes[c.x+','+c.y]=12; floater(c.x,c.y,'PONTE!','#ff9f1c');
    }
    // ovos e chamas-vivas no fogo se perdem
    const ei=G.eggs.findIndex(e=>e.tx===c.x&&e.ty===c.y);
    if(ei>=0){ burst(c.x*TILE+20,c.y*TILE+20,'#fff',8); G.eggs.splice(ei,1); }
    const ri=G.roamflames.findIndex(r=>Math.floor((r.px+8)/TILE)===c.x&&Math.floor((r.py+8)/TILE)===c.y);
    if(ri>=0){ addScore(100,c.x,c.y); burst(c.x*TILE+20,c.y*TILE+20,'#ff9f1c',10); G.roamflames.splice(ri,1); }
    // chain (chama detona até bomba remota)
    const other=bombAt(c.x,c.y);
    if(other&&!other.dead) other.fuse=Math.min(other.fuse,0.02);
  });
  G.shake=Math.min(9,G.shake+5);
  for(let i=0;i<14;i++) burst(bomb.tx*TILE+20+(Math.random()-0.5)*30,bomb.ty*TILE+20+(Math.random()-0.5)*30,['#fff','#ffd23f','#ff7b2e','#ff3b1f'][i%4],1);
  AU.boom();
}
function burst(x,y,color,n){
  for(let i=0;i<(n||8);i++){
    const a=Math.random()*Math.PI*2, s=40+Math.random()*140;
    G.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-40,life:0,max:0.4+Math.random()*0.4,color,size:2+Math.random()*3});
  }
  if(G.particles.length>400) G.particles.splice(0,G.particles.length-400);
}
function floater(tx,ty,text,color){ G.floaters.push({x:tx*TILE+20,y:ty*TILE+8,text,color:color||'#fff',t:0}); }

// ---------- DANO / MORTE ----------
function killPlayer(byTimeout){
  const p=G.player; if(!p||p.dead) return;
  if(p.invuln>0&&!byTimeout) return;
  // montaria absorve o golpe (vira ovo perdido) — como no SB4
  if(p.mount&&!byTimeout){
    burst(p.px+14,p.py+16,'#fff',18);
    floater(tileOf(p).x,tileOf(p).y,MOUNTS[p.mount.c].name+'!','#ffd23f');
    p.mount=null; p.invuln=2.5; AU.hurt();
    if(p.stock.length) mountCreature(p.stock.shift());
    updateHUD(); return;
  }
  if(p.guard&&!byTimeout){
    p.guard=false; p.invuln=2.5; AU.hurt();
    floater(tileOf(p).x,tileOf(p).y,'CORAÇÃO!','#ff8fb0');
    burst(p.px+14,p.py+16,'#ff8fb0',16); updateHUD(); return;
  }
  p.dead=true; p.mount=null; G.state='dying'; G.stateT=0;
  AU.hurt(); AU.stopMusic();
  burst(p.px+14,p.py+16,'#ffffff',20); burst(p.px+14,p.py+16,'#ff5d73',14);
}
function killEnemy(e,silent){
  if(!e.alive) return;
  if(e.hitCd>0) return;
  e.hp--;
  if(e.hp>0){
    e.hitCd=e.boss?1.2:0.01; burst(e.px+e.w/2,e.py+e.h/2,'#fff',8); AU.tick();
    if(e.type==='dogun') dogunSpit(e);
    return;
  }
  e.alive=false;
  const sc=ENEMY_DEF[e.type].score;
  const tx=Math.floor((e.px+e.w/2)/TILE), ty=Math.floor((e.py+e.h/2)/TILE);
  addScore(sc,tx,ty);
  burst(e.px+e.w/2,e.py+e.h/2,enemyColor(e.type),18);
  // vira ovo montável (SB4)
  if(e.egg&&G.map[ty]&&G.map[ty][tx]===0&&!bombAt(tx,ty)) G.eggs.push({tx,ty,c:e.egg,bob:Math.random()*6});
  if(!silent) AU.kill();
}
// monta criatura (chamado ao pegar ovo / estoque)
function mountCreature(c){
  const p=G.player;
  p.mount={c}; p.invuln=Math.max(p.invuln,1);
  AU.mount(); floater(tileOf(p).x,tileOf(p).y,MOUNTS[c].name+'!','#7dff9b');
  updateHUD();
}
function collectEgg(){
  const p=G.player, pcx=p.px+p.w/2, pcy=p.py+p.h/2;
  for(let i=0;i<G.eggs.length;i++){
    const e=G.eggs[i], ex=e.tx*TILE+20, ey=e.ty*TILE+20;
    if(Math.abs(pcx-ex)>17||Math.abs(pcy-ey)>17) continue;
    if(!p.mount){ G.eggs.splice(i,1); mountCreature(e.c); return; }
    if(p.mount.c===e.c&&p.stock.length<2){ G.eggs.splice(i,1); p.stock.push(e.c); AU.pickup(); floater(e.tx,e.ty,'ESTOQUE!', '#ffd23f'); updateHUD(); return; }
    if(p.mount.c!==e.c){ if(Math.random()<0.06) floater(e.tx,e.ty,'MESMO TIPO!','#ff9f1c'); return; }
    return;
  }
}
function spawnAlly(color,tx,ty){
  G.allies.push({px:tx*TILE+4,py:ty*TILE+6,w:28,h:30,dir:'down',color,walk:Math.random()*6,bombCd:3,tx,ty,frame:0});
  burst(tx*TILE+20,ty*TILE+20,'#7dff9b',14);
}
function damageHideout(h){
  h.hp--;
  burst(h.tx*TILE+20,h.ty*TILE+20,'#c9a86a',10); AU.tick(); G.shake=Math.min(9,G.shake+4);
  if(h.hp<=0){
    h.alive=false; G.map[h.ty][h.tx]=0;
    addScore(800,h.tx,h.ty);
    burst(h.tx*TILE+20,h.ty*TILE+20,'#8a6b3f',24);
    floater(h.tx,h.ty,'ESCONDERIJO!','#ffd23f'); AU.kill();
  }
}
function checkGoal(){
  if(G.goal) return;
  const foes=G.enemies.some(e=>e.alive)||G.hideouts.some(h=>h.alive);
  if(foes) return;
  const c=freeCellAny(4);
  if(!c) return;
  G.goal={x:c.x,y:c.y};
  AU.door(); AU.clear();
  floater(c.x,c.y,'GOAL!','#ffd23f');
}
function addScore(n,tx,ty){
  G.score+=n;
  if(tx!==undefined) floater(tx,ty,'+'+n,'#ffd23f');
  if(G.score>G.hi){G.hi=G.score;}
}
function collectPowerup(pu){
  const p=G.player, t=tileOf(p);
  if(t.x!==pu.tx||t.y!==pu.ty) return false;
  if(pu.taken) return false;
  pu.taken=true; AU.pickup();
  burst(pu.tx*TILE+20,pu.ty*TILE+20,'#ffd23f',12);
  const info=ITEM_INFO[pu.kind];
  switch(pu.kind){
    case 'fire': p.fire=Math.min(8,p.fire+1); addScore(50,pu.tx,pu.ty); break;
    case 'bomb': p.maxBombs=Math.min(8,p.maxBombs+1); addScore(50,pu.tx,pu.ty); break;
    case 'speed': p.speed=Math.min(225,p.speed+18); addScore(50,pu.tx,pu.ty); break;
    case 'heart': p.guard=true; addScore(100,pu.tx,pu.ty); break;
    case 'glove': case 'kick': case 'remote': case 'spike': case 'push':
      p[pu.kind]=true; addScore(100,pu.tx,pu.ty); break;
    case 'clock': G.freezeT=8; addScore(200,pu.tx,pu.ty); break;
    case 'vest': p.invuln=Math.max(p.invuln,10); addScore(200,pu.tx,pu.ty); break;
    case 'food': addScore(500,pu.tx,pu.ty); break;
    case 'potato': addScore(1000,pu.tx,pu.ty); break;
    case 'oneup': G.lives=Math.min(5,G.lives+1); addScore(500,pu.tx,pu.ty); break;
    case 'sandals': p.slowT=8; addScore(50,pu.tx,pu.ty); break;
  }
  floater(pu.tx,pu.ty,info.n,'#7dff9b');
  updateHUD(); return true;
}

// ---------- UPDATE ----------
let dtGlobal=0;
function update(dt){
  G.t+=dt; dtGlobal=dt;
  if(G.state==='intro'){
    G.stateT+=dt;
    if(G.stateT>2.0){ G.state='playing'; show(null); }
    updateParticles(dt); return;
  }
  if(G.state==='dying'){
    G.stateT+=dt; updateParticles(dt); updateFloaters(dt);
    if(G.stateT>1.6){
      G.lives--; saveHi(); updateHUD();
      if(G.lives<=0){ G.state='over'; $('over-score').textContent='Pontos: '+G.score+' • HI: '+G.hi; show('screen-over'); AU.over(); }
      else{
        // renasce no canto, mantém fase (perde montaria e estoque, como no SB4)
        const p=G.player;
        p.px=1*TILE+6;p.py=1*TILE+4;p.dead=false;p.invuln=3;p.dir='down';
        p.mount=null; p.stock=[];
        G.bombs=[];G.flames=[];G.flameSet=new Set();G.roamflames=[];
        G.state='playing'; show(null);
        AU.startMusic(area().music);
      }
    }
    return;
  }
  if(G.state==='clear'){
    G.stateT+=dt; updateParticles(dt); updateFloaters(dt);
    if(G.stateT>2.4){
      if(G.level>=AREAS.length-1){
        G.state='win'; $('win-score').textContent='Pontuação final: '+G.score;
        $('win-hi').textContent=G.score>=G.hi?'★ NOVO RECORDE! ★':'Recorde: '+G.hi;
        drawTrophy(); show('screen-win'); AU.win();
      } else loadLevel(G.level+1);
    }
    return;
  }
  if(G.state!=='playing') { updateParticles(dt); return; }
  const A=area();
  const frozen=G.freezeT>0;
  if(frozen) G.freezeT-=dt;
  // timer (chefes sem limite)
  if(isFinite(G.timeLeft)&&!frozen){
    G.timeLeft-=dt;
    if(G.timeLeft<=30.5) AU.setUrgent(true);
    if(G.timeLeft<=0){ G.timeLeft=0; killPlayer(true); }
  }
  // pedras caindo (armadilha da montanha)
  if(A.rocks&&isFinite(G.timeLeft)&&!frozen){
    G.rockT-=dt;
    if(G.rockT<=0){ G.rockT=16+Math.random()*6; for(let i=0;i<3;i++) spawnRock(); AU.tick(); }
  }
  G.rocks.forEach(r=>{ r.t-=dt; if(r.t<=0&&!r.done){ r.done=true; rockStrike(r); } });
  G.rocks=G.rocks.filter(r=>!r.done);
  // pontes colapsadas reconstroem
  for(const k in G.holes){
    G.holes[k]-=dt;
    if(G.holes[k]<=0){ delete G.holes[k]; const [hx,hy]=k.split(',').map(Number); burst(hx*TILE+20,hy*TILE+20,'#c9a86a',8); }
  }

  // --- player ---
  const p=G.player;
  if(p.invuln>0) p.invuln-=dt;
  if(p.slowT>0) p.slowT-=dt;
  let dx=0,dy=0,dir=p.dir;
  if(keys.up){dy=-1;dir='up';} else if(keys.down){dy=1;dir='down';}
  else if(keys.left){dx=-1;dir='left';} else if(keys.right){dx=1;dir='right';}
  p.dir=dir; p.moving=!!(dx||dy);
  const rideWpass=!!(p.mount&&p.mount.c==='angora');
  const spd=p.speed*(p.slowT>0?0.55:1)*(p.mount?1.15:1);
  if(p.moving){
    const ox=p.px, oy=p.py;
    p.walk+=dt*10; moveEntity(p,dx*spd*dt,dy*spd*dt,rideWpass);
    // encostou andando numa bomba? chute / empurrão
    if((dx!==0&&p.px===ox)||(dy!==0&&p.py===oy)){
      const pt0=tileOf(p), b=bombAt(pt0.x+dx,pt0.y+dy);
      if(b&&!b.pass&&!b.sliding){
        if(p.kick||(p.mount&&p.mount.c==='dogun')) slideBomb(b,dx,dy,99,false);
        else if(p.push) slideBomb(b,dx,dy,1,false);
      }
    }
  }
  if(bombQueued){ bombQueued=false; tryPlaceBomb(); }
  if(actQueued){ actQueued=false; useAction(); }
  // bomba atravessável até NINGUÉM mais encostar (player, inimigo ou aliado)
  G.bombs.forEach(b=>{
    if(!b.pass) return;
    const bx=b.tx*TILE, by=b.ty*TILE;
    const hit=[p,...G.enemies.filter(e=>e.alive),...G.allies].some(e=>
      e.px<bx+TILE&&e.px+e.w>bx&&e.py<by+TILE&&e.py+e.h>by);
    if(!hit) b.pass=false;
  });
  const pt=tileOf(p);
  // poeira ao correr
  if(p.moving&&Math.random()<dt*8) G.particles.push({x:p.px+14+(Math.random()-0.5)*16,y:p.py+30,vx:(Math.random()-0.5)*20,vy:-20-Math.random()*20,life:0,max:0.4,color:'rgba(255,255,255,.7)',size:2});

  // --- bombas (deslize + pavio; remota não queima sozinha) ---
  G.bombs.forEach(b=>{
    if(b.sliding){
      const st=340*dt;
      if(b.sx!==0) b.sx-=Math.sign(b.sx)*Math.min(Math.abs(b.sx),st);
      if(b.sy!==0) b.sy-=Math.sign(b.sy)*Math.min(Math.abs(b.sy),st);
      if(b.sx===0&&b.sy===0) b.sliding=false;
    }
    if(!isFinite(b.fuse)) return;
    b.fuse-=dt;
    if(b.fuse<1.0&&b.fuse+dt>=1.0) AU.tick();
    if(b.fuse<0.6&&b.fuse>0){ b.tickSnd-=dt; if(b.tickSnd<=0){AU.tick();b.tickSnd=0.18;} }
  });
  G.bombs.filter(b=>isFinite(b.fuse)&&b.fuse<=0).forEach(detonate);
  G.bombs=G.bombs.filter(b=>!b.dead);

  // --- chamas ---
  G.flameSet=new Set();
  G.flames.forEach(f=>{ f.t+=dt; f.cells.forEach(c=>G.flameSet.add(c.x+','+c.y)); });
  G.flames=G.flames.filter(f=>f.t<f.dur);
  // faísca contínua
  if(G.flames.length&&Math.random()<0.6){
    const f=G.flames[0], c=f.cells[(Math.random()*f.cells.length)|0];
    G.particles.push({x:c.x*TILE+20,y:c.y*TILE+20,vx:(Math.random()-0.5)*120,vy:-60-Math.random()*80,life:0,max:0.35,color:'#ffd23f',size:3});
  }
  // player na chama?
  if(G.flameSet.has(pt.x+','+pt.y)&&p.invuln<=0) killPlayer(false);
  // inimigo na chama? (angora mergulhada escapa)
  G.enemies.forEach(e=>{
    if(!e.alive||e.diving) return;
    const t=tileOf(e);
    if(G.flameSet.has(t.x+','+t.y)) killEnemy(e);
  });
  G.enemies=G.enemies.filter(e=>e.alive);

  // --- inimigos / chamas-vivas / aliado ---
  updateEnemies(dt,frozen);
  updateRoamflames(dt,frozen);
  updateAllies(dt,frozen);
  // contato player-inimigo (angora mergulhada não encosta)
  if(p.invuln<=0&&!p.dead){
    for(const e of G.enemies){
      if(!e.alive||e.diving) continue;
      const ex=e.px+e.w/2, ey=e.py+e.h/2, px2=p.px+p.w/2, py2=p.py+p.h/2;
      const rad=e.boss?30:24;
      if(Math.abs(ex-px2)<rad&&Math.abs(ey-py2)<rad+2){ killPlayer(false); break; }
    }
  }
  // ovos + itens
  G.eggs.forEach(e=>e.bob+=dt*4);
  collectEgg();
  G.powerups.forEach(pu=>pu.bob+=dt*4);
  G.powerups.filter(pu=>!pu.taken).forEach(collectPowerup);
  G.powerups=G.powerups.filter(pu=>!pu.taken);
  // goal: todos derrotados → portal
  checkGoal();
  if(G.goal&&!p.dead){
    const gx=G.goal.x*TILE+20, gy=G.goal.y*TILE+20;
    const px2=p.px+p.w/2, py2=p.py+p.h/2;
    if(Math.abs(gx-px2)<18&&Math.abs(gy-py2)<18){
      const bonus=isFinite(G.timeLeft)?Math.ceil(G.timeLeft)*10:1000;
      G.score+=bonus; saveHi();
      $('clear-bonus').textContent='Bônus +'+bonus+' • Total '+G.score;
      $('clear-pw').textContent=G.level<AREAS.length-1?('SENHA '+AREAS[G.level+1].code+': '+PASSWORDS[G.level+1]):'FIM DA ERA!';
      G.state='clear'; G.stateT=0; show('screen-clear'); AU.clear(); AU.stopMusic();
    }
  }

  updateParticles(dt); updateFloaters(dt);
  if(G.shake>0) G.shake=Math.max(0,G.shake-dt*22);
  updateHUD();
}
// pedras caindo (armadilha)
function spawnRock(){
  for(let a=0;a<40;a++){
    const x=1+((Math.random()*(COLS-2))|0), y=1+((Math.random()*(ROWS-2))|0);
    const v=G.map[y][x];
    if(v!==0&&v!==BRIDGE) continue;
    if(Math.abs(x-1)+Math.abs(y-1)<2) continue;
    G.rocks.push({tx:x,ty:y,t:1.2,done:false}); return;
  }
}
function rockStrike(r){
  burst(r.tx*TILE+20,r.ty*TILE+20,'#8a8f9e',16);
  G.shake=Math.min(9,G.shake+5); AU.noise(0.3,0.4,500);
  const p=G.player, t=tileOf(p);
  if(t.x===r.tx&&t.y===r.ty&&p.invuln<=0&&!p.dead) killPlayer(false);
  G.enemies.forEach(e=>{
    if(!e.alive||e.diving) return;
    const et=tileOf(e);
    if(et.x===r.tx&&et.y===r.ty) killEnemy(e);
  });
}
// Dogun cospe 2 chamas-vivas ao sofrer dano (máx 4)
function dogunSpit(e){
  if(G.roamflames.length>=4) return;
  const dirs=['up','down','left','right'];
  let n=0;
  for(const k of dirs){
    if(n>=2) break;
    const nx=e.tx+DIRS[k].x, ny=e.ty+DIRS[k].y;
    if(nx<1||ny<1||nx>=COLS-1||ny>=ROWS-1) continue;
    if(cellSolid(nx,ny,false)) continue;
    G.roamflames.push({px:nx*TILE+12,py:ny*TILE+12,w:16,h:16,dir:k,speed:130,life:8,wob:Math.random()*6});
    n++;
  }
  if(n) floater(e.tx,e.ty,'FOGO!','#ff9f1c');
}
// mangual do Hammer: arranca um upgrade e joga no chão
function flailSwipe(e){
  const p=G.player;
  G.shake=Math.min(10,G.shake+6); AU.hurt();
  burst(p.px+14,p.py+16,'#ffd23f',12);
  let kind=null;
  if(p.fire>2){ p.fire--; kind='fire'; }
  else if(p.maxBombs>1){ p.maxBombs--; kind='bomb'; }
  else if(p.speed>p.baseSpeed+1){ p.speed-=18; kind='speed'; }
  if(kind){
    const c=freeCellAny(2);
    if(c) G.powerups.push({tx:c.x,ty:c.y,kind,bob:0});
    floater(tileOf(p).x,tileOf(p).y,'AI! ITEM!','#ff5d73');
  } else floater(tileOf(p).x,tileOf(p).y,'SEM ITENS!','#ff5d73');
  updateHUD();
}
function updateRoamflames(dt,frozen){
  const p=G.player;
  for(const r of G.roamflames){
    r.wob+=dt*10;
    if(frozen) continue;
    r.life-=dt;
    const d=DIRS[r.dir];
    const nx=r.px+d.x*r.speed*dt, ny=r.py+d.y*r.speed*dt;
    const okX=!rectHitsWall(nx,r.py,r.w,r.h,false), okY=!rectHitsWall(r.px,ny,r.w,r.h,false);
    if(d.x!==0&&okX) r.px=nx; else if(d.y!==0&&okY) r.py=ny;
    else r.dir=['up','down','left','right'][(Math.random()*4)|0];
    // acende bomba próxima e queima player
    const t={x:Math.floor((r.px+8)/TILE),y:Math.floor((r.py+8)/TILE)};
    const b=bombAt(t.x,t.y);
    if(b&&!b.dead&&isFinite(b.fuse)) b.fuse=Math.min(b.fuse,0.02);
    if(!p.dead&&p.invuln<=0){
      const px2=p.px+p.w/2, py2=p.py+p.h/2;
      if(Math.abs(r.px+8-px2)<20&&Math.abs(r.py+8-py2)<22) killPlayer(false);
    }
  }
  G.roamflames=G.roamflames.filter(r=>r.life>0);
}
// aliado da jaula: passeia e planta bombas, invencível
function updateAllies(dt,frozen){
  const p=G.player;
  for(const a of G.allies){
    a.frame+=dt*8;
    if(frozen) continue;
    a.bombCd-=dt;
    const cxT=Math.floor((a.px+a.w/2)/TILE), cyT=Math.floor((a.py+a.h/2)/TILE);
    if((cxT!==a.tx||cyT!==a.ty)&&atTileCenter(a,6)){
      snapCenter(a); a.tx=cxT; a.ty=cyT;
      const opts=[];
      for(const k of ['up','down','left','right']){
        if(k===OPP[a.dir]) continue;
        const nx=a.tx+DIRS[k].x, ny=a.ty+DIRS[k].y;
        if(cellSolid(nx,ny,false)||bombAt(nx,ny)) continue;
        opts.push(k);
      }
      a.dir=opts.length?opts[(Math.random()*opts.length)|0]:OPP[a.dir];
    }
    const d=DIRS[a.dir];
    const nx=a.px+d.x*62*dt, ny=a.py+d.y*62*dt;
    if(d.x!==0&&!rectHitsWall(nx,a.py,a.w,a.h,false)) a.px=nx;
    else if(d.y!==0&&!rectHitsWall(a.px,ny,a.w,a.h,false)) a.py=ny;
    else a.dir=OPP[a.dir];
    // ajuda: bomba perto de bloco macio ou inimigo
    if(a.bombCd<=0){
      a.bombCd=6;
      const t=tileOf(a);
      let want=false;
      for(const k of ['up','down','left','right']) if(G.map[t.y+DIRS[k].y]&&G.map[t.y+DIRS[k].y][t.x+DIRS[k].x]===2) want=true;
      if(!want) want=G.enemies.some(e=>e.alive&&Math.abs(tileOf(e).x-t.x)+Math.abs(tileOf(e).y-t.y)<=4);
      if(want&&!bombAt(t.x,t.y)&&G.bombs.length<8){
        G.bombs.push({tx:t.x,ty:t.y,fuse:2.5,range:2,pass:true,tickSnd:0,remote:false,spike:false,sx:0,sy:0,sliding:false,owner:'ally'});
        AU.place();
      }
    }
  }
}
// escolha de direção por IA
function decideDir(e,pt){
  const free=k=>{
    const nx=e.tx+DIRS[k].x, ny=e.ty+DIRS[k].y;
    return !cellSolid(nx,ny,!!e.diving)&&!bombAt(nx,ny);
  };
  const opts=['up','down','left','right'].filter(k=>k!==OPP[e.dir]&&free(k));
  const back=OPP[e.dir], backFree=free(back);
  const r=Math.random();
  const bestToward=(cands,bonus)=>{
    let best=null,bd=1e9;
    for(const k of cands){
      const nx=e.tx+DIRS[k].x, ny=e.ty+DIRS[k].y;
      let dd=Math.abs(nx-pt.x)+Math.abs(ny-pt.y)-Math.random()*1.2;
      if(bonus){
        if(e.tx===pt.x&&(k==='up'||k==='down')) dd-=3;
        if(e.ty===pt.y&&(k==='left'||k==='right')) dd-=3;
      }
      if(dd<bd){bd=dd;best=k;}
    }
    return best;
  };
  switch(e.ai){
    case 'straight': { // trike: reto até bater
      if(free(e.dir)) return e.dir;
      const all=opts.concat(backFree?[back]:[]);
      return all.length?all[(Math.random()*all.length)|0]:back;
    }
    case 'aim': { // demon: mira no player, às vezes para
      const best=bestToward(opts.concat(backFree?[back]:[]),true);
      return r<0.6?(best||back):(opts[(Math.random()*opts.length)|0]||best||back);
    }
    case 'chase': { // uhho: persegue
      const best=bestToward(opts.concat(backFree?[back]:[]),false);
      return r<0.8?(best||back):(opts[(Math.random()*opts.length)|0]||best||back);
    }
    case 'kickseek': { // dogunjr: caça bomba alinhada
      for(const k of ['up','down','left','right']){
        for(let i=1;i<=5;i++){
          const nx=e.tx+DIRS[k].x*i, ny=e.ty+DIRS[k].y*i;
          if(cellSolid(nx,ny,false)) break;
          if(bombAt(nx,ny)) return k;
        }
      }
      return opts.length?opts[(Math.random()*opts.length)|0]:(backFree?back:e.dir);
    }
    case 'dive': // angora: vai ao player se alinhado
      if(e.tx===pt.x||e.ty===pt.y){
        const k=Math.abs(pt.x-e.tx)>Math.abs(pt.y-e.ty)?(pt.x>e.tx?'right':'left'):(pt.y>e.ty?'down':'up');
        if(k!==OPP[e.dir]&&free(k)) return k;
      }
      return opts.length?opts[(Math.random()*opts.length)|0]:(backFree?back:e.dir);
    case 'bossHammer': {
      const best=bestToward(opts.concat(backFree?[back]:[]),false);
      return best||back;
    }
    case 'bossDogun': { // patrulha vertical nos corredores
      if((e.dir==='up'||e.dir==='down')&&free(e.dir)) return e.dir;
      if(free('down')&&e.ty<8) return 'down';
      if(free('up')&&e.ty>3) return 'up';
      return backFree?back:e.dir;
    }
    default:
      return opts.length?opts[(Math.random()*opts.length)|0]:(backFree?back:e.dir);
  }
}
function updateEnemies(dt,frozen){
  const p=G.player, pt=tileOf(p);
  for(const e of G.enemies){
    if(!e.alive) continue;
    e.frame+=dt*8; e.wob+=dt*5;
    if(e.hitCd>0) e.hitCd-=dt;
    if(frozen) continue;
    if(e.pausing>0){ e.pausing-=dt; continue; }
    // angora mergulha / emerge
    if(e.ai==='dive'){
      e.diveT-=dt;
      if(e.diveT<=0){
        e.diving=!e.diving;
        e.diveT=e.diving?3.5+Math.random()*1.5:4+Math.random()*2;
        burst(e.px+16,e.py+16,'#8a6b3f',6);
      }
    }
    const cxT=Math.floor((e.px+e.w/2)/TILE), cyT=Math.floor((e.py+e.h/2)/TILE);
    if((cxT!==e.tx||cyT!==e.ty)&&atTileCenter(e,6)){
      snapCenter(e);
      e.tx=cxT; e.ty=cyT;
      e.dir=decideDir(e,pt);
      if((e.ai==='aim'||e.ai==='chase')&&Math.random()<0.22) e.pausing=0.8+Math.random()*0.6;
    }
    const sp=e.speed*(e.diving?1.35:1);
    const dd=DIRS[e.dir];
    const nx=e.px+dd.x*sp*dt, ny=e.py+dd.y*sp*dt;
    const canGhost=!!e.diving;
    const tryX=!rectHitsWall(nx,e.py,e.w,e.h,canGhost), tryY=!rectHitsWall(e.px,ny,e.w,e.h,canGhost);
    if(dd.x!==0&&tryX) e.px=nx; else if(dd.y!==0&&tryY) e.py=ny;
    else e.dir=OPP[e.dir];
    const et={x:Math.floor((e.px+e.w/2)/TILE),y:Math.floor((e.py+e.h/2)/TILE)};
    // dogunjr chuta bomba que divide o tile
    if(e.ai==='kickseek'){
      e.kickCd=(e.kickCd||0)-dt;
      const b=bombAt(et.x,et.y);
      if(b&&!b.sliding&&e.kickCd<=0){ e.kickCd=0.6; slideBomb(b,dd.x,dd.y,99,false); }
    }
    // hammer: planta spike + mangual
    if(e.ai==='bossHammer'){
      e.bombCd-=dt; e.atkCd-=dt;
      if(e.bombCd<=0){
        e.bombCd=5;
        const own=G.bombs.filter(b=>b.owner==='boss').length;
        if(own<2&&!bombAt(et.x,et.y)) G.bombs.push({tx:et.x,ty:et.y,fuse:2.4,range:3,pass:true,tickSnd:0,remote:false,spike:true,sx:0,sy:0,sliding:false,owner:'boss'});
      }
      if(e.atkCd<=0){
        e.atkCd=3;
        const px2=p.px+p.w/2, py2=p.py+p.h/2;
        if(!p.dead&&Math.hypot(e.px+e.w/2-px2,e.py+e.h/2-py2)<2.2*TILE) flailSwipe(e);
      }
    }
    // dogun: esmaga bombas no caminho
    if(e.ai==='bossDogun'){
      const b=bombAt(et.x,et.y);
      if(b&&!b.dead){ b.dead=true; burst(et.x*TILE+20,et.y*TILE+20,'#555',10); AU.tick(); G.bombs=G.bombs.filter(x=>!x.dead); }
    }
  }
  // esconderijo cospe uhho
  for(const h of G.hideouts){
    if(!h.alive) continue;
    h.spawnT-=dt;
    if(h.spawnT<=0){
      h.spawnT=7;
      const n=G.enemies.filter(e=>e.alive&&e.type==='uhho').length;
      if(n<3){
        const spots=[];
        for(const k of ['up','down','left','right']){
          const nx=h.tx+DIRS[k].x, ny=h.ty+DIRS[k].y;
          if(G.map[ny]&&(G.map[ny][nx]===0||G.map[ny][nx]===BRIDGE)&&!bombAt(nx,ny)) spots.push({x:nx,y:ny});
        }
        if(spots.length){ const s=spots[(Math.random()*spots.length)|0]; spawnEnemy('uhho',s.x,s.y); burst(s.x*TILE+20,s.y*TILE+20,'#c9a86a',8); }
      }
    }
  }
}
function updateParticles(dt){
  for(const q of G.particles){ q.life+=dt; q.x+=q.vx*dt; q.y+=q.vy*dt; q.vy+=160*dt; }
  G.particles=G.particles.filter(q=>q.life<q.max);
}
function updateFloaters(dt){
  for(const f of G.floaters){ f.t+=dt; f.y-=28*dt; }
  G.floaters=G.floaters.filter(f=>f.t<1.1);
}

// ---------- HUD / TELAS ----------
let hudCache='';
function updateHUD(){
  $('hud-score').textContent=G.score;
  $('hud-hi').textContent=G.hi;
  $('hud-level').textContent=AREAS[G.level].code+'/8';
  const t=$('hud-time');
  t.textContent=isFinite(G.timeLeft)?Math.ceil(G.timeLeft||AREAS[G.level].time):'∞';
  t.classList.toggle('urgent',isFinite(G.timeLeft)&&G.timeLeft<=30&&G.state==='playing');
  $('hud-lives').textContent='♥'.repeat(Math.max(0,G.lives))||'—';
  const p=G.player||{fire:2,maxBombs:1,guard:false,mount:null,stock:[],glove:false,kick:false,remote:false,spike:false,push:false};
  $('hud-fire').textContent='🔥×'+p.fire;
  $('hud-bombs').textContent='💣×'+p.maxBombs;
  $('hud-shield').textContent=p.guard?'❤️':'·';
  $('hud-shield').classList.toggle('on',!!p.guard);
  const mt=$('hud-mount');
  if(mt) mt.textContent=p.mount?(MOUNTS[p.mount.c].emoji+'×'+(1+p.stock.length)):'';
  const it=$('hud-items');
  if(it){
    const icons=[['glove','🥊'],['kick','🦵'],['remote','🎮'],['spike','🌟'],['push','✋']];
    const ab=p.mount?MOUNTS[p.mount.c].ability:null;
    it.innerHTML=icons.map(([k,e])=>{
      const lit=p[k]||ab===k||(k==='push'&&ab==='wpass');
      return `<span class="${lit?'lit':''}">${e}</span>`;
    }).join('');
  }
}
function drawTrophy(){
  $('trophy').textContent = G.score>=G.hi&&G.score>0 ? '🏆' : '🎖️';
}

// ---------- RENDER ----------
function rr(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}
function enemyColor(t){
  return {trike:'#5cc46a',demon:'#b678e8',uhho:'#a0714f',dogunjr:'#8a8f9e',angora:'#4fc3c3',hammer:'#3a3f5c',dogun:'#7a6a55'}[t]||'#fff';
}
function render(){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.setTransform(2,0,0,2,0,0); // backing 2x: nítido em tela grande
  ctx.save();
  if(G.shake>0) ctx.translate((Math.random()-0.5)*G.shake,(Math.random()-0.5)*G.shake);
  const th=theme();
  drawGround(th);
  if(G.goal) drawGoal();
  G.powerups.forEach(pu=>drawPowerup(pu));
  G.eggs.forEach(e=>drawEgg(e));
  // blocos
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(G.map[y][x]===1&&!G.hideouts.some(h=>h.alive&&h.tx===x&&h.ty===y)) drawSolid(x,y,th);
    else if(G.map[y][x]===2) drawSoft(x,y,th);
  }
  G.hideouts.forEach(h=>{ if(h.alive) drawHideout(h); });
  G.bombs.forEach(b=>drawBomb(b));
  drawFlames();
  drawRocks();
  G.allies.forEach(a=>drawAlly(a));
  G.enemies.forEach(e=>{ if(e.alive) drawEnemy(e); });
  G.roamflames.forEach(r=>drawRoamflame(r));
  if(G.player&&(G.state==='playing'||G.state==='dying'||G.state==='paused'||G.state==='clear')) drawPlayer();
  drawParticles(); drawFloaters();
  // vinheta + urgência
  const vg=ctx.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,H*0.85);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.35)');
  ctx.fillStyle=vg; ctx.fillRect(-10,-10,W+20,H+20);
  if(G.state==='playing'&&isFinite(G.timeLeft)&&G.timeLeft<=30){
    ctx.fillStyle=`rgba(255,40,60,${0.05+0.04*Math.sin(G.t*6)})`;
    ctx.fillRect(-10,-10,W+20,H+20);
  }
  if(G.freezeT>0){
    ctx.fillStyle=`rgba(80,160,255,${0.08+0.03*Math.sin(G.t*5)})`;
    ctx.fillRect(-10,-10,W+20,H+20);
  }
  ctx.restore();
}
function drawGround(th){
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const v=G.map[y][x];
    if(v===WATER||(v===BRIDGE&&G.holes[x+','+y]>0)){
      // rio animado
      const g=ctx.createLinearGradient(x*TILE,y*TILE,x*TILE,y*TILE+TILE);
      const cave=area().theme==='cave';
      g.addColorStop(0,cave?'#3d4a7a':'#3fa7e8'); g.addColorStop(1,cave?'#252c52':'#1f6fb8');
      ctx.fillStyle=g; ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
      ctx.strokeStyle=`rgba(255,255,255,${0.25+0.15*Math.sin(G.t*3+x+y)})`; ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(x*TILE+6,y*TILE+14+Math.sin(G.t*3+x)*3);
      ctx.quadraticCurveTo(x*TILE+20,y*TILE+10+Math.sin(G.t*3+x)*3,x*TILE+34,y*TILE+14+Math.sin(G.t*3+x)*3);
      ctx.moveTo(x*TILE+6,y*TILE+28-Math.sin(G.t*2.4+y)*3);
      ctx.quadraticCurveTo(x*TILE+20,y*TILE+24-Math.sin(G.t*2.4+y)*3,x*TILE+34,y*TILE+28-Math.sin(G.t*2.4+y)*3);
      ctx.stroke();
      continue;
    }
    if(v===BRIDGE){
      ctx.fillStyle=(x+y)%2?th.g1:th.g2; ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
      // ponte de tábuas com corrimão
      ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(x*TILE+2,y*TILE+3,TILE-4,TILE-2);
      ctx.fillStyle='#a5713d'; ctx.fillRect(x*TILE+3,y*TILE+4,TILE-6,TILE-8);
      ctx.fillStyle='#c08d4f'; ctx.fillRect(x*TILE+3,y*TILE+4,TILE-6,5);
      ctx.strokeStyle='#5e3a1c'; ctx.lineWidth=1.5;
      for(let i=1;i<4;i++){ ctx.beginPath(); ctx.moveTo(x*TILE+3+i*8.5,y*TILE+4); ctx.lineTo(x*TILE+3+i*8.5,y*TILE+TILE-4); ctx.stroke(); }
      ctx.fillStyle='#7d5225';
      ctx.fillRect(x*TILE+1,y*TILE+1,TILE-2,4); ctx.fillRect(x*TILE+1,y*TILE+TILE-5,TILE-2,4);
      continue;
    }
    ctx.fillStyle=(x+y)%2?th.g1:th.g2;
    ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
  }
  // textura: pontos claros + tufos escuros (grama do SB4)
  ctx.fillStyle='rgba(255,255,255,.05)';
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(G.map[y][x]!==0&&G.map[y][x]!==BRIDGE) continue;
    if((x*7+y*13)%9===0) ctx.fillRect(x*TILE+8,y*TILE+8,3,3);
  }
  ctx.fillStyle='rgba(0,0,0,.09)';
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(G.map[y][x]!==0&&G.map[y][x]!==BRIDGE) continue;
    if((x*5+y*11)%7===0) ctx.fillRect(x*TILE+24,y*TILE+27,4,3);
  }
}
function drawSolid(x,y,th){
  const px=x*TILE,py=y*TILE;
  ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(px+2,py+4,TILE-2,TILE-2);
  const g=ctx.createLinearGradient(px,py,px,py+TILE);
  g.addColorStop(0,th.solid); g.addColorStop(1,th.solidD);
  ctx.fillStyle=g; rr(px+1,py+1,TILE-2,TILE-2,8); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.45)'; ctx.lineWidth=2.5; rr(px+1,py+1,TILE-2,TILE-2,8); ctx.stroke();
  // topo rochoso claro + fendas (paredes de pedra do SB4)
  ctx.fillStyle='rgba(255,255,255,.3)'; rr(px+5,py+4,TILE-10,7,3.5); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(px+9,py+16); ctx.quadraticCurveTo(px+12,py+24,px+9,py+32);
  ctx.moveTo(px+22,py+14); ctx.quadraticCurveTo(px+25,py+24,px+22,py+33);
  ctx.moveTo(px+31,py+18); ctx.quadraticCurveTo(px+33,py+25,px+31,py+31);
  ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.22)';
  [[13,26],[26,30]].forEach(([ox,oy])=>{ctx.beginPath();ctx.arc(px+ox,py+oy,1.8,0,7);ctx.fill();});
}
function drawSoft(x,y,th){
  // pedregulho cinza do SB4 (sólido ou rosquinha, variando por posição)
  const px=x*TILE,py=y*TILE, cx=px+20, cy=py+21;
  ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(cx,py+35,15,5,0,0,7); ctx.fill();
  const ring=(x*3+y*5)%3===0;
  const g=ctx.createLinearGradient(cx,py+4,cx,py+36);
  g.addColorStop(0,'#e9edf6'); g.addColorStop(0.5,'#b7bfd2'); g.addColorStop(1,'#7c8499');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,15.5,0,7); ctx.fill();
  ctx.strokeStyle='#33374a'; ctx.lineWidth=2.5; ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(cx-6,cy-7,5,3.4,-0.6,0,7); ctx.fill();
  if(ring){
    ctx.fillStyle='#252a3d'; ctx.beginPath(); ctx.arc(cx,cy+1,6.5,0,7); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(cx-1.5,cy-1,2.4,0,7); ctx.fill();
  } else {
    ctx.fillStyle='rgba(51,55,74,.5)';
    const ox=(x*13+y*7)%3;
    [[6,4],[-7,6],[1,-8]].forEach(([sx,sy],i)=>{ ctx.beginPath(); ctx.arc(cx+sx+((ox+i)%3)-1,cy+sy,2.1,0,7); ctx.fill(); });
  }
  // jaula com aliado: grades sobre o pedregulho
  if(G.hidden[x+','+y]&&G.hidden[x+','+y].type==='cage'){
    ctx.strokeStyle='#5b6478'; ctx.lineWidth=3;
    for(let i=-1;i<=1;i++){
      ctx.beginPath(); ctx.moveTo(cx+i*9,cy-14); ctx.lineTo(cx+i*9,cy+14); ctx.stroke();
    }
    ctx.strokeStyle='#8a93ad'; ctx.lineWidth=1.5;
    for(let i=-1;i<=1;i++){
      ctx.beginPath(); ctx.moveTo(cx+i*9-1,cy-14); ctx.lineTo(cx+i*9-1,cy+14); ctx.stroke();
    }
    ctx.fillStyle='#ffd23f'; ctx.beginPath(); ctx.arc(cx,cy-14,3,0,7); ctx.fill();
  }
}
function drawGoal(){
  const {x,y}=G.goal, cx=x*TILE+20, cy=y*TILE+20;
  const pulse=0.6+0.4*Math.sin(G.t*4);
  ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(cx,cy+15,15,5,0,0,7); ctx.fill();
  // torii dourado
  ctx.fillStyle='#c8862a';
  ctx.fillRect(cx-14,cy-14,5,30); ctx.fillRect(cx+9,cy-14,5,30);
  ctx.fillRect(cx-18,cy-18,36,6); ctx.fillRect(cx-14,cy-8,28,4);
  ctx.fillStyle='#ffd23f';
  ctx.fillRect(cx-18,cy-18,36,2.5);
  ctx.fillRect(cx-14,cy-14,5,3); ctx.fillRect(cx+9,cy-14,5,3);
  // brilho
  ctx.strokeStyle=`rgba(255,210,63,${pulse})`; ctx.lineWidth=3;
  ctx.beginPath(); ctx.arc(cx,cy+2,17+Math.sin(G.t*5)*2,0,7); ctx.stroke();
  for(let i=0;i<3;i++){
    const a=G.t*2+i*2.1;
    ctx.fillStyle=`rgba(255,240,180,${0.5+0.5*Math.sin(G.t*4+i)})`;
    ctx.beginPath(); ctx.arc(cx+Math.cos(a)*14,cy+Math.sin(a)*12,2,0,7); ctx.fill();
  }
}
function drawPowerup(pu){
  // insígnia (itens do SB4 são ícones, ovos são só p/ criaturas)
  const cx=pu.tx*TILE+20, cy=pu.ty*TILE+20+Math.sin(pu.bob)*2;
  const info=ITEM_INFO[pu.kind]||{e:'❓'};
  ctx.fillStyle='rgba(255,210,63,.28)'; ctx.beginPath(); ctx.arc(cx,cy,16,0,7); ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(cx,cy+12,10,3.5,0,0,7); ctx.fill();
  const g=ctx.createRadialGradient(cx-4,cy-5,2,cx,cy,14);
  g.addColorStop(0,'#3a4066'); g.addColorStop(1,'#14172b');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,12.5,0,7); ctx.fill();
  ctx.strokeStyle='#ffd23f'; ctx.lineWidth=2; ctx.stroke();
  ctx.font='14px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(info.e,cx,cy+1);
  ctx.textBaseline='alphabetic';
}
function drawEgg(e){
  const bio=MOUNTS[e.c].bio;
  const cx=e.tx*TILE+20, cy=e.ty*TILE+21+Math.sin(e.bob)*2.5;
  ctx.fillStyle=bio?'rgba(255,255,255,.25)':'rgba(180,120,255,.25)';
  ctx.beginPath(); ctx.arc(cx,cy,16,0,7); ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(cx,cy+13,10,3.5,0,0,7); ctx.fill();
  const g=ctx.createLinearGradient(cx-10,cy-14,cx+10,cy+13);
  if(bio){ g.addColorStop(0,'#ffffff'); g.addColorStop(1,'#ccd1e4'); }
  else { g.addColorStop(0,'#4a4e68'); g.addColorStop(1,'#151724'); }
  ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(cx,cy,11,13.5,0,0,7); ctx.fill();
  ctx.strokeStyle=bio?'#4a4e68':'#8a93ad'; ctx.lineWidth=2; ctx.stroke();
  if(bio){
    ctx.fillStyle='rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(cx-4.5,cy-6,3,4.5,-.4,0,7); ctx.fill();
    ctx.fillStyle={dino:'#5cc46a',angora:'#35b6ff'}[e.c]||'#fff';
    [[4,-5],[-5,0],[3,5]].forEach(([sx,sy])=>{ ctx.beginPath(); ctx.arc(cx+sx,cy+sy,2.5,0,7); ctx.fill(); });
  } else {
    ctx.fillStyle='#ffd23f';
    [[-4,-4],[4,0],[-1,6]].forEach(([sx,sy])=>{ ctx.fillRect(cx+sx-1.5,cy+sy-1.5,3,3); });
  }
  // rostinho da criatura
  ctx.fillStyle=bio?'#23233d':'#ffd23f';
  ctx.beginPath(); ctx.arc(cx-3,cy-1,1.8,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+3,cy-1,1.8,0,7); ctx.fill();
}
function drawHideout(h){
  const cx=h.tx*TILE+20, cy=h.ty*TILE+20;
  ctx.fillStyle='rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(cx,cy+16,18,6,0,0,7); ctx.fill();
  // cabana de ossos
  ctx.fillStyle='#6e5a44'; rr(cx-17,cy-12,34,30,8); ctx.fill();
  ctx.strokeStyle='#2e2418'; ctx.lineWidth=2.5; ctx.stroke();
  ctx.fillStyle='#14101c'; ctx.beginPath(); ctx.arc(cx,cy+6,10,Math.PI,0); ctx.fill();
  ctx.fillStyle='#e8e2d2';
  ctx.beginPath(); ctx.arc(cx-9,cy-14,4,0,7); ctx.fill(); // crânio
  ctx.fillStyle='#14101c';
  ctx.beginPath(); ctx.arc(cx-10.5,cy-14.5,1.3,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(cx-7.5,cy-14.5,1.3,0,7); ctx.fill();
  ctx.strokeStyle='#e8e2d2'; ctx.lineWidth=2.5; // ossos cruzados
  ctx.beginPath(); ctx.moveTo(cx+4,cy-16); ctx.lineTo(cx+14,cy-8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+14,cy-16); ctx.lineTo(cx+4,cy-8); ctx.stroke();
  // vida
  for(let i=0;i<8;i++){
    ctx.fillStyle=i<h.hp?'#ff8f5d':'#ffffff22';
    ctx.fillRect(cx-16+i*4,cy+19,3,3);
  }
}
function drawAlly(a){
  const cx=a.px+a.w/2, baseY=a.py+a.h;
  drawShadow(cx,baseY-1,10);
  const bob=Math.sin(a.frame)*1.4;
  ctx.save(); ctx.translate(cx,baseY-15+bob*0.4);
  const cols={red:'#ff6b6b',blue:'#4dabff',green:'#5cc46a'};
  const c=cols[a.color]||'#fff';
  ctx.fillStyle=c; ctx.strokeStyle='#23233d'; ctx.lineWidth=1.8;
  ctx.beginPath(); ctx.arc(0,-8,10,0,7); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#ffd9b3'; ctx.beginPath(); ctx.ellipse(0,-6.5,7.5,5.5,0,0,7); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#1b1b26';
  ctx.beginPath(); ctx.ellipse(-3,-7,1.7,2.8,0,0,7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3,-7,1.7,2.8,0,0,7); ctx.fill();
  ctx.fillStyle=c; rr(-9,2,18,9,4); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawRoamflame(r){
  const cx=r.px+8, cy=r.py+8+Math.sin(r.wob)*1.5;
  const g=ctx.createRadialGradient(cx,cy,1,cx,cy,10);
  g.addColorStop(0,'#fff'); g.addColorStop(0.5,'#ffd23f'); g.addColorStop(1,'rgba(255,90,20,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,10,0,7); ctx.fill();
  ctx.fillStyle='#ff5d3b';
  ctx.beginPath(); ctx.moveTo(cx,cy-9); ctx.quadraticCurveTo(cx+4,cy-3,cx,cy+3); ctx.quadraticCurveTo(cx-4,cy-3,cx,cy-9); ctx.fill();
}
function drawRocks(){
  for(const r of G.rocks){
    const cx=r.tx*TILE+20, cy=r.ty*TILE+20;
    const k=1-r.t/1.2;
    ctx.fillStyle=`rgba(0,0,0,${0.15+0.3*k})`;
    ctx.beginPath(); ctx.ellipse(cx,cy,6+12*k,4+7*k,0,0,7); ctx.fill();
    ctx.fillStyle='#ff5d73'; ctx.font='bold 16px sans-serif'; ctx.textAlign='center';
    ctx.fillText('!',cx,cy-12);
  }
}
function drawBomb(b){
  // bomba clássica: esfera preta brilhante + pavio curto + faísca estrela
  const cx=b.tx*TILE+20+(b.sx||0), cy=b.ty*TILE+23+(b.sy||0);
  const urgent=isFinite(b.fuse)&&b.fuse<0.7;
  const s=1+(urgent?Math.sin(G.t*22)*0.08:Math.sin(G.t*5)*0.025);
  const OL='#101018';
  ctx.fillStyle='rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(cx,cy+12,12,4.5,0,0,7); ctx.fill();
  ctx.save(); ctx.translate(cx,cy); ctx.scale(s,s);
  const g=ctx.createRadialGradient(-5,-7,2,0,1,15);
  g.addColorStop(0,'#6b7392'); g.addColorStop(0.45,'#262a45'); g.addColorStop(1,'#0a0b16');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,13,0,7); ctx.fill();
  ctx.strokeStyle=b.spike?'#ffd23f':OL; ctx.lineWidth=b.spike?3:2; ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.9)';
  ctx.beginPath(); ctx.ellipse(-5.5,-6,4.2,6,-0.5,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(5,7.5,1.6,0,7); ctx.fill();
  if(b.remote){
    // LED azul piscando = bomba remota armada
    ctx.fillStyle=(Math.floor(G.t*5)%2)?'#35b6ff':'#123a5c';
    ctx.beginPath(); ctx.arc(0,-15,3,0,7); ctx.fill();
    ctx.strokeStyle=OL; ctx.lineWidth=1; ctx.stroke();
  } else {
    // tampinha + pavio curto
    ctx.fillStyle='#9aa0bd'; rr(-4,-18,8,5,2); ctx.fill(); ctx.strokeStyle=OL; ctx.lineWidth=1.5; ctx.stroke();
    ctx.strokeStyle='#d9b06a'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(2,-18); ctx.quadraticCurveTo(6,-21,8,-17); ctx.stroke();
    // faísca estrela
    const R=3.5+Math.random()*2.5;
    ctx.save(); ctx.translate(8,-17); ctx.rotate(Math.random()*Math.PI);
    ctx.fillStyle='rgba(255,120,20,.9)';
    ctx.beginPath();
    for(let i=0;i<8;i++){ const a2=i*Math.PI/4, rad=i%2?R*0.45:R*1.5; ctx.lineTo(Math.cos(a2)*rad,Math.sin(a2)*rad); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle='#fff6c9'; ctx.beginPath(); ctx.arc(0,0,R*0.55,0,7); ctx.fill();
    ctx.restore();
  }
  if(urgent){ ctx.strokeStyle=`rgba(255,60,60,${0.5+0.5*Math.sin(G.t*20)})`; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(0,0,15.5,0,7); ctx.stroke(); }
  ctx.restore();
}
function drawFlames(){
  // feixe estilo SB4: tile cheio laranja → faixa amarela → núcleo branco
  for(const f of G.flames){
    const a=Math.max(0,1-f.t/f.dur);
    const fl=1+Math.sin(G.t*36)*0.05;
    ctx.globalAlpha=a;
    for(const c of f.cells){
      const px=c.x*TILE, py=c.y*TILE, cx=px+20, cy=py+20;
      ctx.fillStyle='#ff7b1c'; ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle='#ffd23f';
      if(c.k==='h') ctx.fillRect(px,cy-11*fl,TILE,22*fl);
      else if(c.k==='v') ctx.fillRect(cx-11*fl,py,22*fl,TILE);
      else { ctx.fillRect(px,cy-11*fl,TILE,22*fl); ctx.fillRect(cx-11*fl,py,22*fl,TILE); }
      ctx.fillStyle='#fffdf4';
      if(c.k==='h') ctx.fillRect(px,cy-5.5*fl,TILE,11*fl);
      else if(c.k==='v') ctx.fillRect(cx-5.5*fl,py,11*fl,TILE);
      else { ctx.beginPath(); ctx.arc(cx,cy,11*fl,0,7); ctx.fill(); }
      if(c.end&&c.k!=='c'){
        // ponta arredondada do feixe
        ctx.beginPath(); ctx.arc(cx+c.dx*20,cy+c.dy*20,11*fl,0,7); ctx.fill();
      }
    }
    ctx.globalAlpha=1;
  }
}
// ----- inimigos com personalidade -----
function drawShadow(x,y,w){
  ctx.fillStyle='rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(x,y,w,w*0.38,0,0,7); ctx.fill();
}
function drawEyes(cx,cy,dir,dx,r){
  const ox=dir==='left'?-3:dir==='right'?3:0, oy=dir==='up'?-2:dir==='down'?2:0;
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(cx-dx+ox,cy+oy,r,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+dx+ox,cy+oy,r,0,7); ctx.fill();
  ctx.fillStyle='#14142b';
  ctx.beginPath(); ctx.arc(cx-dx+ox*1.6,cy+oy,r*0.5,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+dx+ox*1.6,cy+oy,r*0.5,0,7); ctx.fill();
}
function drawEnemy(e){
  const cx=e.px+e.w/2, cy=e.py+e.h/2-2;
  const sq=1+Math.sin(e.frame)*0.06;
  const OL='#23233d';
  if(e.type==='trike'){
    // Triceradops: dino verde de chifres, reto até bater
    drawShadow(cx,cy+14,12);
    const st=Math.sin(e.frame*2)*2.5;
    ctx.save(); ctx.translate(cx,cy+Math.sin(e.frame)*1.2); ctx.scale(1,sq);
    ctx.fillStyle='#3f9e4d'; // rabo
    ctx.beginPath(); ctx.moveTo(-10,4); ctx.quadraticCurveTo(-18,2,-20,-4+st*0.4); ctx.quadraticCurveTo(-14,-2,-9,-2); ctx.fill();
    const g=ctx.createLinearGradient(0,-13,0,13);
    g.addColorStop(0,'#a8e6a1'); g.addColorStop(0.55,'#5cc46a'); g.addColorStop(1,'#1f6e38');
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,13,11,0,0,7); ctx.fill();
    ctx.strokeStyle=OL; ctx.lineWidth=2; ctx.stroke();
    // folho + 3 chifres
    ctx.fillStyle='#f59b4b';
    ctx.beginPath(); ctx.ellipse(0,-8,9,6,0,Math.PI,0); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#fff';
    [[-6,-12],[0,-14],[6,-12]].forEach(([hx,hy])=>{
      ctx.beginPath(); ctx.moveTo(hx-2.5,hy+4); ctx.lineTo(hx,hy-3); ctx.lineTo(hx+2.5,hy+4); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    const ox=e.dir==='left'?-2.5:e.dir==='right'?2.5:0;
    ctx.fillStyle='#1d2b1d';
    ctx.beginPath(); ctx.arc(-3.5+ox,0,2.4,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(3.5+ox,0,2.4,0,7); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(-4.2+ox,-0.8,0.9,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(2.8+ox,-0.8,0.9,0,7); ctx.fill();
    ctx.fillStyle='#2c6e31'; // patinhas
    rr(-9,8+st*0.4,7,5,2); ctx.fill(); rr(2,8-st*0.4,7,5,2); ctx.fill();
    ctx.restore();
  } else if(e.type==='demon'){
    // Little Demon: diabrete roxo que mira no player
    drawShadow(cx,cy+14,11);
    const bobA=e.pausing>0?0:Math.sin(e.frame*1.4)*1.5;
    ctx.save(); ctx.translate(cx,cy+bobA); ctx.scale(1,sq);
    const g=ctx.createLinearGradient(0,-13,0,13);
    g.addColorStop(0,'#d3a6f5'); g.addColorStop(0.6,'#8a4fd0'); g.addColorStop(1,'#3d1f6e');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,12.5,0,7); ctx.fill();
    ctx.strokeStyle=OL; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#ffd23f'; // chifrinhos
    ctx.beginPath(); ctx.moveTo(-9,-8); ctx.lineTo(-12,-15); ctx.lineTo(-5,-10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9,-8); ctx.lineTo(12,-15); ctx.lineTo(5,-10); ctx.closePath(); ctx.fill(); ctx.stroke();
    const ox=e.dir==='left'?-2.5:e.dir==='right'?2.5:0;
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(-4.5+ox,-1,3.4,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(4.5+ox,-1,3.4,0,7); ctx.fill();
    ctx.fillStyle=e.pausing>0?'#555':'#c81e3a';
    ctx.beginPath(); ctx.arc(-4.5+ox*1.5,-1,1.7,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(4.5+ox*1.5,-1,1.7,0,7); ctx.fill();
    ctx.strokeStyle='#2a1545'; ctx.lineWidth=1.8; // boca brava
    ctx.beginPath(); ctx.moveTo(-4+ox,6); ctx.lineTo(-1+ox,4); ctx.lineTo(1+ox,6); ctx.lineTo(4+ox,4); ctx.stroke();
    ctx.fillStyle='#2a1545'; // pezinhos
    const st=Math.sin(e.frame*2)*2;
    rr(-8,9+st*0.4,6,5,2); ctx.fill(); rr(2,9-st*0.4,6,5,2); ctx.fill();
    ctx.restore();
  } else if(e.type==='uhho'){
    // Uhho: homem das cavernas que persegue
    drawShadow(cx,cy+14,12);
    ctx.save(); ctx.translate(cx,cy+Math.abs(Math.sin(e.frame*1.5))*-1.5); ctx.scale(1,sq);
    const g=ctx.createLinearGradient(0,-13,0,13);
    g.addColorStop(0,'#d9a066'); g.addColorStop(0.6,'#a0714f'); g.addColorStop(1,'#5e3a1c');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,13,0,7); ctx.fill();
    ctx.strokeStyle=OL; ctx.lineWidth=2; ctx.stroke();
    // cabelo + osso
    ctx.fillStyle='#3d2812';
    ctx.beginPath(); ctx.arc(0,-7,10,Math.PI*1.05,Math.PI*1.95); ctx.fill();
    ctx.strokeStyle='#e8e2d2'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(-3,-16); ctx.lineTo(4,-13); ctx.stroke();
    const ox=e.dir==='left'?-2.5:e.dir==='right'?2.5:0;
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(-4.5+ox,0,3.2,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(4.5+ox,0,3.2,0,7); ctx.fill();
    ctx.fillStyle='#1b1b26';
    ctx.beginPath(); ctx.arc(-4.5+ox*1.5,0,1.6,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(4.5+ox*1.5,0,1.6,0,7); ctx.fill();
    ctx.strokeStyle='#3d2812'; ctx.lineWidth=1.8;
    ctx.beginPath(); ctx.arc(ox,5.5,3.5,0.1*Math.PI,0.9*Math.PI); ctx.stroke();
    // tacape
    const swA=Math.sin(e.frame*1.5)*3;
    ctx.strokeStyle='#5e3a1c'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(12,2+swA); ctx.lineTo(18,-6+swA); ctx.stroke();
    ctx.fillStyle='#8a6b3f'; ctx.beginPath(); ctx.arc(18,-7+swA,3.5,0,7); ctx.fill();
    ctx.fillStyle='#3d2812'; // pezões
    const st=Math.sin(e.frame*2)*2.5;
    rr(-9,9+st*0.4,7,5,2); ctx.fill(); rr(2,9-st*0.4,7,5,2); ctx.fill();
    ctx.restore();
  } else if(e.type==='dogunjr'){
    // Dogun Jr.: pote de barro com olhos que chuta bombas (+ mini Uhho de carona)
    drawShadow(cx,cy+13,11);
    ctx.save(); ctx.translate(cx,cy+Math.sin(e.frame)*1); ctx.scale(1,sq);
    const g=ctx.createLinearGradient(-10,0,10,0);
    g.addColorStop(0,'#6e6a80'); g.addColorStop(0.5,'#a8a4bc'); g.addColorStop(1,'#55506a');
    ctx.fillStyle=g; rr(-11,-11,22,22,9); ctx.fill();
    ctx.strokeStyle=OL; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#8a93ad'; ctx.fillRect(-11,-2,22,3); // faixa
    const ox=e.dir==='left'?-2:e.dir==='right'?2:0;
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(-5+ox,-4,3,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(4+ox,-4,3,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(0+ox,3.5,2.4,0,7); ctx.fill();
    ctx.fillStyle='#c81e3a';
    ctx.beginPath(); ctx.arc(-5+ox*1.5,-4,1.4,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(4+ox*1.5,-4,1.4,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(ox,3.5,1.1,0,7); ctx.fill();
    // mini Uhho de carona
    ctx.fillStyle='#a0714f'; ctx.beginPath(); ctx.arc(0,-15,5.5,0,7); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#1b1b26';
    ctx.beginPath(); ctx.arc(-2,-15.5,1.2,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(2,-15.5,1.2,0,7); ctx.fill();
    ctx.fillStyle='#55506a'; // pezinhos
    const st=Math.sin(e.frame*2)*2;
    rr(-8,9+st*0.4,6,5,2); ctx.fill(); rr(2,9-st*0.4,6,5,2); ctx.fill();
    ctx.restore();
  } else if(e.type==='angora'){
    if(e.diving){
      // montinho de terra com barbatana
      drawShadow(cx,cy+13,12);
      ctx.fillStyle='#7d5a36';
      ctx.beginPath(); ctx.ellipse(cx,cy+8,14,8,0,Math.PI,0); ctx.fill();
      ctx.strokeStyle='#3d2c17'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle='#4fc3c3';
      ctx.beginPath(); ctx.moveTo(cx-3,cy+2); ctx.quadraticCurveTo(cx,cy-10,cx+3,cy+2); ctx.fill(); ctx.stroke();
      if(Math.random()<0.3) G.particles.push({x:cx+(Math.random()-0.5)*20,y:cy+6,vx:0,vy:-30,life:0,max:0.4,color:'#a5713d',size:2.5});
      ctx.globalAlpha=1; return;
    }
    // peixe-lanterna verde
    drawShadow(cx,cy+14,12);
    ctx.save(); ctx.translate(cx,cy+Math.sin(e.frame*1.3)*1.5); ctx.scale(e.dir==='left'?-1:1,sq);
    const g=ctx.createLinearGradient(0,-11,0,11);
    g.addColorStop(0,'#bff0e0'); g.addColorStop(0.55,'#4fc3a1'); g.addColorStop(1,'#1f6e5e');
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,13,10,0,0,7); ctx.fill();
    ctx.strokeStyle=OL; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#2a8a76'; // cauda + barbatanas
    const wg=Math.sin(e.frame*3)*3;
    ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(-19,-5+wg); ctx.lineTo(-19,5+wg); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2,9); ctx.lineTo(2,13); ctx.lineTo(5,8); ctx.closePath(); ctx.fill();
    // isca luminosa
    ctx.strokeStyle='#2a8a76'; ctx.lineWidth=1.8;
    ctx.beginPath(); ctx.moveTo(4,-9); ctx.quadraticCurveTo(8,-15,11,-13); ctx.stroke();
    ctx.fillStyle=(Math.floor(G.t*6)%2)?'#fff6c9':'#ffd23f';
    ctx.beginPath(); ctx.arc(11,-13,3,0,7); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(4,-1,3.2,0,7); ctx.fill();
    ctx.fillStyle='#10202a'; ctx.beginPath(); ctx.arc(5,-1,1.6,0,7); ctx.fill();
    ctx.strokeStyle='#123f37'; ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.arc(7,4,2.5,0.2*Math.PI,0.8*Math.PI); ctx.stroke();
    ctx.restore();
  } else if(e.type==='hammer'){
    // HAMMER BOMBER: rival sombrio de martelo
    drawShadow(cx,cy+17,15);
    const tele=e.atkCd<1; // telegrafa o mangual
    ctx.save(); ctx.translate(cx,cy); ctx.scale(1,1+Math.sin(e.frame)*0.03);
    const g=ctx.createLinearGradient(0,-17,0,17);
    g.addColorStop(0,'#5a5f7a'); g.addColorStop(0.6,'#2b2e45'); g.addColorStop(1,'#101018');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,15,0,7); ctx.fill();
    ctx.strokeStyle=e.hitCd>0?'#fff':OL; ctx.lineWidth=2.5; ctx.stroke();
    ctx.fillStyle='#c81e3a'; // olhos vermelhos
    const ox=e.dir==='left'?-2.5:e.dir==='right'?2.5:0;
    ctx.beginPath(); ctx.ellipse(-4.5+ox,-3,2.4,3.6,0,0,7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4.5+ox,-3,2.4,3.6,0,0,7); ctx.fill();
    // martelo girando (avisa quando vai golpear)
    const ha=tele?Math.sin(G.t*20)*0.9:-0.5+Math.sin(e.frame*0.7)*0.2;
    ctx.save(); ctx.rotate(ha);
    ctx.fillStyle='#8a6b3f'; ctx.fillRect(10,-2,16,4);
    ctx.fillStyle=tele?'#ff5d73':'#55506a'; rr(24,-7,10,12,2); ctx.fill();
    ctx.strokeStyle=OL; ctx.lineWidth=1.5; ctx.stroke();
    ctx.restore();
    for(let i=0;i<e.maxHp;i++){ ctx.fillStyle=i<e.hp?'#ff5d73':'#ffffff33'; ctx.beginPath(); ctx.arc(-15+i*10,-23,3.4,0,7); ctx.fill(); }
    ctx.restore();
  } else if(e.type==='dogun'){
    // DOGUN: besta-pote gigante que esmaga bombas
    drawShadow(cx,cy+24,24);
    ctx.save(); ctx.translate(cx,cy);
    const g=ctx.createLinearGradient(-26,0,26,0);
    g.addColorStop(0,'#5e5648'); g.addColorStop(0.5,'#a89a80'); g.addColorStop(1,'#4a4238');
    ctx.fillStyle=g; rr(-26,-24,52,48,16); ctx.fill();
    ctx.strokeStyle=e.hitCd>0?'#fff':'#241f18'; ctx.lineWidth=3; ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(-26,-4,52,6); // faixas
    ctx.fillRect(-26,10,52,4);
    const ox=e.dir==='left'?-3:e.dir==='right'?3:0;
    ctx.fillStyle='#fff'; // 3 olhos
    ctx.beginPath(); ctx.arc(-12+ox,-10,4.5,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(0+ox,-12,5,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(12+ox,-10,4.5,0,7); ctx.fill();
    ctx.fillStyle='#c81e3a';
    ctx.beginPath(); ctx.arc(-12+ox*1.5,-10,2.2,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(ox*1.5,-12,2.5,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(12+ox*1.5,-10,2.2,0,7); ctx.fill();
    ctx.strokeStyle='#241f18'; ctx.lineWidth=2.5; // boca
    ctx.beginPath(); ctx.moveTo(-10+ox,6); ctx.lineTo(-4+ox,10); ctx.lineTo(0+ox,6); ctx.lineTo(4+ox,10); ctx.lineTo(10+ox,6); ctx.stroke();
    ctx.fillStyle='#4a4238'; // pezões
    const st=Math.sin(e.frame*2)*3;
    rr(-20,22+st*0.4,12,7,3); ctx.fill(); rr(8,22-st*0.4,12,7,3); ctx.fill();
    for(let i=0;i<e.maxHp;i++){ ctx.fillStyle=i<e.hp?'#ffd23f':'#ffffff2e'; ctx.beginPath(); ctx.arc(-32+i*8,-30,3,0,7); ctx.fill(); }
    ctx.restore();
  }
  ctx.globalAlpha=1;
}
function drawPlayer(){
  const p=G.player, cx=p.px+p.w/2, baseY=p.py+p.h;
  if(p.invuln>0&&G.state==='playing'&&Math.floor(G.t*12)%2===0) ctx.globalAlpha=0.35;
  if(G.state==='dying'){
    // animação de morte: gira e encolhe
    const k=Math.min(1,G.stateT/1.4);
    ctx.save(); ctx.translate(cx,baseY-16); ctx.rotate(k*2.2); ctx.scale(1-k*0.5,1-k*0.5); ctx.globalAlpha=1-k*0.4;
    drawBomberBody(0,0,p,'up',0,true);
    ctx.restore(); ctx.globalAlpha=1; return;
  }
  drawShadow(cx,baseY-1,12);
  const bob=p.moving?Math.sin(p.walk*2)*1.6:Math.sin(G.t*3)*0.8;
  ctx.save(); ctx.translate(cx,baseY-16+bob*0.4);
  const lean=p.moving?(p.dir==='left'?-0.08:p.dir==='right'?0.08:0):0;
  ctx.rotate(lean);
  if(p.mount){
    drawMountCreature(p.mount.c,p);
    ctx.translate(0,-13); // sentado na criatura
    drawBomberBody(0,2,p,p.dir,p.moving?p.walk:G.t*2,false);
  } else {
    drawBomberBody(0,0,p,p.dir,p.moving?p.walk:G.t*2,false);
  }
  ctx.restore();
  // ovos de estoque atrás do player
  if(p.stock.length){
    const bx=p.dir==='right'?-1:p.dir==='left'?1:0, by=p.dir==='down'?-1:p.dir==='up'?1:0;
    p.stock.forEach((c,i)=>{
      const ex2=cx+bx*(20+i*16)+(p.dir==='up'||p.dir==='down'?(i?8:-8):0);
      const ey2=baseY-10+by*(20+i*14);
      drawMiniEgg(ex2,ey2,c);
    });
  }
  // coração (guarda) / colete (invencibilidade longa)
  if(p.guard){
    ctx.strokeStyle=`rgba(255,110,140,${0.6+0.3*Math.sin(G.t*6)})`; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(cx,baseY-16,22+Math.sin(G.t*6)*1.5,0,7); ctx.stroke();
  }
  if(p.invuln>3.2&&G.state==='playing'){
    ctx.strokeStyle=`rgba(255,210,63,${0.5+0.3*Math.sin(G.t*8)})`; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,baseY-16,26,0,7); ctx.stroke();
  }
  ctx.globalAlpha=1;
}
function drawMiniEgg(x,y,c){
  const bio=MOUNTS[c].bio;
  ctx.fillStyle=bio?'#eef1fb':'#2a2d45';
  ctx.beginPath(); ctx.ellipse(x,y,7,8.5,0,0,7); ctx.fill();
  ctx.strokeStyle=bio?'#4a4e68':'#8a93ad'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle={dino:'#5cc46a',dogun:'#ffd23f',angora:'#35b6ff'}[c];
  ctx.beginPath(); ctx.arc(x-2.5,y-1,1.8,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(x+2.5,y+2,1.8,0,7); ctx.fill();
}
function drawMountCreature(c,p){
  const step=Math.sin((p.moving?p.walk:G.t*2)*2);
  if(c==='dino'){
    // dinossauro verde de 3 chifres
    ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0,15,15,5,0,0,7); ctx.fill();
    const g=ctx.createLinearGradient(0,-6,0,14);
    g.addColorStop(0,'#8fe08f'); g.addColorStop(1,'#2c7a3d');
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,6,15,9,0,0,7); ctx.fill();
    ctx.strokeStyle='#1d4a26'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#2c7a3d'; // patas trotando
    const l1=Math.max(0,step)*3, l2=Math.max(0,-step)*3;
    rr(-12,10-l1,7,6,2.5); ctx.fill(); rr(-2,10-l2,6,6,2.5); ctx.fill();
    rr(4,10-l1,6,6,2.5); ctx.fill(); rr(10,10-l2,5,6,2.5); ctx.fill();
    ctx.fillStyle='#f59b4b'; // folho
    ctx.beginPath(); ctx.ellipse(0,-2,10,5,0,Math.PI,0); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#fff'; // chifres
    [[-6,-6],[0,-8],[6,-6]].forEach(([hx,hy])=>{
      ctx.beginPath(); ctx.moveTo(hx-2,hy+3); ctx.lineTo(hx,hy-2); ctx.lineTo(hx+2,hy+3); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    ctx.fillStyle='#2c7a3d'; // rabo
    ctx.beginPath(); ctx.moveTo(-14,6); ctx.quadraticCurveTo(-22,4+step*2,-24,-2); ctx.quadraticCurveTo(-18,0,-13,2); ctx.fill();
  } else if(c==='dogun'){
    // potinho mecânico de carona
    ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0,15,13,5,0,0,7); ctx.fill();
    const g=ctx.createLinearGradient(-11,0,11,0);
    g.addColorStop(0,'#6e6a80'); g.addColorStop(0.5,'#b0abc4'); g.addColorStop(1,'#55506a');
    ctx.fillStyle=g; rr(-12,-2,24,17,8); ctx.fill();
    ctx.strokeStyle='#23233d'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#ffd23f'; ctx.fillRect(-12,5,24,3);
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(-5,9,2.4,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(5,9,2.4,0,7); ctx.fill();
    ctx.fillStyle='#c81e3a';
    ctx.beginPath(); ctx.arc(-5,9,1.1,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(5,9,1.1,0,7); ctx.fill();
    // chave de corda girando
    ctx.save(); ctx.translate(0,-4); ctx.rotate(G.t*6);
    ctx.strokeStyle='#8a93ad'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(-5,0); ctx.lineTo(5,0); ctx.moveTo(0,-5); ctx.lineTo(0,5); ctx.stroke();
    ctx.restore();
    ctx.fillStyle='#55506a';
    const l1=Math.max(0,step)*2.5, l2=Math.max(0,-step)*2.5;
    rr(-9,12-l1,6,5,2); ctx.fill(); rr(3,12-l2,6,5,2); ctx.fill();
  } else {
    // angora: peixe-lanterna saltitante
    const hop=p.moving?Math.abs(Math.sin(p.walk*2))*-4:Math.sin(G.t*3)*-1.5;
    ctx.save(); ctx.translate(0,hop);
    ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0,15-hop,13,4,0,0,7); ctx.fill();
    const g=ctx.createLinearGradient(0,-4,0,12);
    g.addColorStop(0,'#bff0e0'); g.addColorStop(1,'#1f6e5e');
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,6,14,8,0,0,7); ctx.fill();
    ctx.strokeStyle='#123f37'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#2a8a76';
    ctx.beginPath(); ctx.moveTo(-13,6); ctx.lineTo(-20,1+step*2); ctx.lineTo(-20,11+step*2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#2a8a76'; ctx.lineWidth=1.8;
    ctx.beginPath(); ctx.moveTo(2,-2); ctx.quadraticCurveTo(6,-8,9,-6); ctx.stroke();
    ctx.fillStyle='#fff6c9'; ctx.beginPath(); ctx.arc(9,-6,2.6,0,7); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(5,5,2.6,0,7); ctx.fill();
    ctx.fillStyle='#10202a'; ctx.beginPath(); ctx.arc(5.7,5,1.3,0,7); ctx.fill();
    ctx.restore();
  }
}
function drawBomberBody(x,y,p,dir,walk,dead){
  // White Bomberman clássico: cabeção branco, rosto pêssego, olhos ovais,
  // corpo branco, cinto preto/fivela ouro, mãozinhas e pezinhos rosa
  const OL='#23233d';
  const step=dead?0:Math.sin(walk*2);
  const liftL=dead?0:Math.max(0,step)*3, liftR=dead?0:Math.max(0,-step)*3;
  const sw=dead?0:step*2.5;
  // bracinhos rosa (atrás)
  ctx.fillStyle='#ffcfd8'; ctx.strokeStyle=OL; ctx.lineWidth=1.6;
  rr(x-17,y-3+sw,6,10,3); ctx.fill(); ctx.stroke();
  rr(x+11,y-3-sw,6,10,3); ctx.fill(); ctx.stroke();
  // pezinhos rosa alternados
  ctx.fillStyle='#ff9fb0';
  rr(x-9,y+10-liftL,8,7,3.5); ctx.fill(); ctx.stroke();
  rr(x+1,y+10-liftR,8,7,3.5); ctx.fill(); ctx.stroke();
  // corpo branco
  const g=ctx.createLinearGradient(x-12,y-14,x+12,y+12);
  g.addColorStop(0,'#ffffff'); g.addColorStop(0.65,'#eef1fb'); g.addColorStop(1,'#b9c2e4');
  ctx.fillStyle=g; rr(x-12,y-14,24,27,10); ctx.fill();
  ctx.strokeStyle=OL; ctx.lineWidth=2; ctx.stroke();
  // cinto + fivela ouro
  ctx.fillStyle='#23233d'; rr(x-12,y+1,24,5.5,2); ctx.fill();
  ctx.fillStyle='#ffd23f'; rr(x-3.5,y+0.5,7,6.5,1.5); ctx.fill();
  ctx.strokeStyle='#8a5b00'; ctx.lineWidth=1; ctx.stroke();
  // cabeção branco
  const hg=ctx.createLinearGradient(x-13,y-26,x+13,y-2);
  hg.addColorStop(0,'#ffffff'); hg.addColorStop(0.7,'#f1f3fc'); hg.addColorStop(1,'#c2c9e8');
  ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(x,y-11,13,0,7); ctx.fill();
  ctx.strokeStyle=OL; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.9)'; ctx.beginPath(); ctx.ellipse(x-6,y-19,4.5,3,-0.6,0,7); ctx.fill();
  const back=dir==='up'&&!dead;
  if(!back){
    // rosto pêssego
    const fx=dir==='left'?-2:dir==='right'?2:0;
    ctx.fillStyle='#ffd9b3';
    ctx.beginPath(); ctx.ellipse(x+fx,y-9,10,7.5,0,0,7); ctx.fill();
    ctx.strokeStyle=OL; ctx.lineWidth=1.5; ctx.stroke();
    if(dead){
      ctx.strokeStyle='#23233d'; ctx.lineWidth=2;
      [[-4.5,-9.5],[3.5,-9.5]].forEach(([ex,ey])=>{ ctx.beginPath(); ctx.moveTo(x+ex-2.4,y+ey-2.4); ctx.lineTo(x+ex+2.4,y+ey+2.4); ctx.moveTo(x+ex+2.4,y+ey-2.4); ctx.lineTo(x+ex-2.4,y+ey+2.4); ctx.stroke(); });
    } else {
      const ox=dir==='left'?-2.5:dir==='right'?2.5:0;
      ctx.fillStyle='#1b1b26';
      ctx.beginPath(); ctx.ellipse(x-4+ox,y-9.5,2.1,3.6,0,0,7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x+4+ox,y-9.5,2.1,3.6,0,0,7); ctx.fill();
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.arc(x-4.7+ox,y-10.8,1,0,7); ctx.fill();
      ctx.beginPath(); ctx.arc(x+3.3+ox,y-10.8,1,0,7); ctx.fill();
    }
  } else {
    // costas do capacete
    ctx.strokeStyle='rgba(35,35,61,.35)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(x,y-11,9,Math.PI*1.15,Math.PI*1.85); ctx.stroke();
  }
  // antena com bolinha rosa
  ctx.strokeStyle=OL; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x+5,y-22); ctx.lineTo(x+8,y-28); ctx.stroke();
  ctx.fillStyle=(Math.floor(G.t*4)%2)?'#ff5d8f':'#ff8fb0';
  ctx.beginPath(); ctx.arc(x+8,y-29,3,0,7); ctx.fill();
  ctx.strokeStyle=OL; ctx.lineWidth=1.5; ctx.stroke();
}
function drawParticles(){
  for(const q of G.particles){
    ctx.globalAlpha=Math.max(0,1-q.life/q.max);
    ctx.fillStyle=q.color;
    ctx.fillRect(q.x-q.size/2,q.y-q.size/2,q.size,q.size);
  }
  ctx.globalAlpha=1;
}
function drawFloaters(){
  ctx.textAlign='center'; ctx.font='bold 14px "Segoe UI",sans-serif';
  for(const f of G.floaters){
    ctx.globalAlpha=Math.max(0,1-f.t/1.1);
    ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,.7)';
    ctx.strokeText(f.text,f.x,f.y); ctx.fillStyle=f.color; ctx.fillText(f.text,f.x,f.y);
  }
  ctx.globalAlpha=1;
}

// ---------- LOOP ----------
let last=performance.now();
function loop(now){
  let dt=(now-last)/1000; last=now;
  if(dt>0.05) dt=0.05;
  if(G.state!=='paused') update(dt);
  render();
  requestAnimationFrame(loop);
}

// ---------- BOOT ----------
// cenário de fundo atrás do título (sem trocar o estado)
(function backdrop(){
  G.timeLeft=AREAS[0].time;
  G.map=[];
  for(let y=0;y<ROWS;y++){G.map.push([]);for(let x=0;x<COLS;x++){
    if(x===0||y===0||x===COLS-1||y===ROWS-1||(x%2===0&&y%2===0))G.map[y].push(1);
    else G.map[y].push(((x*7+y*13)%5===0&&!(x<=2&&y<=2))?2:0);
  }}
})();
syncMuteBtn();
updateHUD();
show('screen-title');
requestAnimationFrame(loop);
