'use strict';
/* =====================================================================
   SUPER BOMBERMAN 4 — ERA PRIMITIVA · fan remake HTML5 (sem assets)
   Áreas 1-1 .. 1-5 do Mundo 1. Tudo desenhado/gerado por código.
   ===================================================================== */
const TILE=16, COLS=15, ROWS=11, HUD_H=32, W=256, H=224, FX=8, FY=40;
const FPS_STEP=1000/60;
const cv=document.getElementById('game'), ctx=cv.getContext('2d');
ctx.imageSmoothingEnabled=false;

/* ------------------------------ util ------------------------------ */
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const dist2=(ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy;};
const now=()=>performance.now();
const rnd=(a,b)=>a+Math.random()*(b-a);
const irnd=(a,b)=>Math.floor(rnd(a,b+1));
function mulberry(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;
  let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;
  return((t^t>>>14)>>>0)/4294967296;};}
function mkC(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function bake(rows,pal){
  const h=rows.length,w=Math.max(...rows.map(r=>r.length));
  const c=mkC(w,h),g=c.getContext('2d');
  for(let y=0;y<h;y++){const r=rows[y];
    for(let x=0;x<r.length;x++){const ch=r[x];if(ch==='.'||ch===' ')continue;
      const col=pal[ch];if(!col)continue;g.fillStyle=col;g.fillRect(x,y,1,1);}}
  return c;}
function flipH(c){const n=mkC(c.width,c.height),g=n.getContext('2d');
  g.translate(c.width,0);g.scale(-1,1);g.drawImage(c,0,0);return n;}
const sym=h=>h+[...h].reverse().join('');
function outlined(c,col){ // contorno 1px ao redor da silhueta
  const n=mkC(c.width+2,c.height+2),g=n.getContext('2d');
  for(const[dx,dy]of[[0,1],[2,1],[1,0],[1,2]])g.drawImage(c,dx,dy);
  g.globalCompositeOperation='source-in';g.fillStyle=col;
  g.fillRect(0,0,n.width,n.height);
  g.globalCompositeOperation='source-over';g.drawImage(c,1,1);return n;}
function ell(g,cx,cy,rx,ry,col){g.fillStyle=col;g.beginPath();
  g.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);g.fill();}
function rc(g,x,y,w,h,col){g.fillStyle=col;g.fillRect(x,y,w,h);}

/* ------------------------ fonte bitmap 5x7 ------------------------ */
const FONT={
A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[14,17,16,16,16,17,14],
D:[28,18,17,17,17,18,28],E:[31,16,16,30,16,16,31],F:[31,16,16,30,16,16,16],
G:[14,17,16,23,17,17,15],H:[17,17,17,31,17,17,17],I:[14,4,4,4,4,4,14],
J:[7,2,2,2,2,18,12],K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],
M:[17,27,21,21,17,17,17],N:[17,25,21,19,17,17,17],O:[14,17,17,17,17,17,14],
P:[30,17,17,30,16,16,16],Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],
S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],U:[17,17,17,17,17,17,14],
V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,21,10],X:[17,17,10,4,10,17,17],
Y:[17,17,10,4,4,4,4],Z:[31,1,2,4,8,16,31],
'0':[14,17,19,21,25,17,14],'1':[4,12,4,4,4,4,14],'2':[14,17,1,6,8,16,31],
'3':[31,2,4,2,1,17,14],'4':[2,6,10,18,31,2,2],'5':[31,16,30,1,1,17,14],
'6':[6,8,16,30,17,17,14],'7':[31,1,2,4,8,8,8],'8':[14,17,17,14,17,17,14],
'9':[14,17,17,15,1,2,12],
'.':[0,0,0,0,0,4,4],'!':[4,4,4,4,4,0,4],'?':[14,17,1,6,4,0,4],
':':[0,4,4,0,4,4,0],'-':[0,0,0,14,0,0,0],'+':[0,4,4,31,4,4,0],
'>':[8,12,14,12,8,0,0],'<':[2,6,14,6,2,0,0],"'":[4,4,8,0,0,0,0],' ':[0,0,0,0,0,0,0]};
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const textW=(s,sc=1)=>s.length*6*sc-sc;
function txt(g,s,x,y,o={}){
  s=norm(s);const sc=o.scale||1;
  if(o.align==='center')x-=textW(s,sc)/2;else if(o.align==='right')x-=textW(s,sc);
  x|=0;y|=0;
  if(o.shadow)_raw(g,s,x+sc,y+sc,o.shadow,sc);
  _raw(g,s,x,y,o.color||'#fff',sc);}
function _raw(g,s,x,y,col,sc){g.fillStyle=col;
  for(let i=0;i<s.length;i++){const gl=FONT[s[i]];if(!gl)continue;
    for(let r=0;r<7;r++){const b=gl[r];
      for(let c=0;c<5;c++)if(b>>(4-c)&1)g.fillRect(x+i*6*sc+c*sc,y+r*sc,sc,sc);}}}

/* ==================== SPRITES · BOMBERMAN (strings) ================= */
/* paleta fiel ao sprite-bomber.png (SB4): visor laranja c/ moldura
   vermelha, capacete branco, traje azul, luvas/botas rosa                */
const PB={o:'#161626',w:'#f8f8fa',d:'#c9cede',v:'#0018c8',b:'#2a54f0',
          p:'#f0509e',q:'#b02a68',F:'#ffc900',R:'#f01000'};
const HEAD_F=bake([
 '.......pp.......',
 '.......oo.......',
 '.....oooooo.....',
 '....owwwwwwo....',
 '..owwwwwwwwwwo..',
 '.owRRRRRRRRRRdo.',
 '.owRFooFFooFRdo.',
 '.owRFooFFooFRdo.',
 '.owRFooFFooFRdo.',
 '.owRRRRRRRRRRdo.',
 '...owwwwwwwwo...',
 '....oooooooo....'],PB);
const HEAD_B=bake([
 '.......pp.......',
 '.......oo.......',
 '.....oooooo.....',
 '....owwwwwwo....',
 '..owwwwwwwwwwo..',
 '.owwwwwwwwwwdo..',
 '.owwwwwwwwwwdo..',
 '.owwwwwwwwwwdo..',
 '.owwwwwwwwwwdo..',
 '.owwwwwwwwwwdo..',
 '...owwwwwwwwo...',
 '....oooooooo....'],PB);
const HEAD_S=bake([
 '................',
 '...pp...........',
 '...ppoooooo.....',
 '...oowwwwwwo....',
 '..owwwwwwwwwwo..',
 '..owwwwwRRRRRo..',
 '..odwwwwRFoFRo..',
 '..odwwwwRFoFRo..',
 '..odwwwwRFoFRo..',
 '..owwwwwRRRRRo..',
 '...owwwwwwwwo...',
 '....oooooooo....'],PB);
const TORSO=bake([
 sym('...obvvv'),
 sym('..opvvvv'),
 sym('..opvvFv'),
 sym('...ovvvv'),
 sym('....oooo')],PB);
const LEGS_F=[
 bake([sym('...ovvo.'),sym('...oppo.'),sym('...oooo.')],PB),
 bake([sym('....ovv.'),sym('....opp.'),sym('....ooo.')],PB),
 bake([sym('..ovvo..'),sym('..oppo..'),sym('..oooo..')],PB)];
const LEGS_R=[
 bake([sym('...ovvo.'),sym('...oppo.'),sym('...oooo.')],PB),
 bake([sym('.ovvo...'),sym('.oppo...'),sym('.oooo...')],PB),
 bake([sym('....ovv.'),sym('....opp.'),sym('....ooo.')],PB)];
function bomFrame(head,dir,pose){
  const c=mkC(16,20),g=c.getContext('2d');
  g.drawImage(head,0,0);g.drawImage(TORSO,0,12);
  g.drawImage(dir==='R'||dir==='L'?LEGS_R[pose]:LEGS_F[pose],0,17);
  return c;}
const FR={
 D:[bomFrame(HEAD_F,'D',0),bomFrame(HEAD_F,'D',1),bomFrame(HEAD_F,'D',2)],
 U:[bomFrame(HEAD_B,'U',0),bomFrame(HEAD_B,'U',1),bomFrame(HEAD_B,'U',2)],
 R:[bomFrame(HEAD_S,'R',0),bomFrame(HEAD_S,'R',1),bomFrame(HEAD_S,'R',2)]};
FR.L=FR.R.map(flipH);

/* ========================= TILES DE CENÁRIO ========================= */
function speckFill(g,base,specks,seed){
  g.fillStyle=base;g.fillRect(0,0,16,16);
  const r=mulberry(seed);
  for(const[col,n,px]of specks){g.fillStyle=col;
    for(let i=0;i<n;i++)g.fillRect((r()*16)|0,(r()*16)|0,px,px);}}
function goldRock(seed){ // montinho de rocha dourada (borda/pilares clássicos)
  const c=mkC(16,16),g=c.getContext('2d');
  g.fillStyle='#6a4416';g.fillRect(0,0,16,16); // fendas marrons
  const r=mulberry(seed);
  const bumps=[[8,8.6,6.8],[2.4,3,3.4],[13.6,3.4,3],[3,13.6,2.8],[13,13.2,3.2]];
  for(const[bx,by,br]of bumps){
    const ox=r()*1.6-.8,oy=r()*1.6-.8;
    ell(g,bx+ox,by+oy,br,br*.88,'#b8863c');
    ell(g,bx+ox-1,by+oy-1.2,br*.66,br*.55,'#dcae58');
    ell(g,bx+ox-1.6,by+oy-2,br*.34,br*.28,'#f0d088');}
  g.fillStyle='#8a5c22';
  g.fillRect(2,14,5,1);g.fillRect(9,13,4,1);g.fillRect(12,7,2,1);
  return c;}
function grassTile(seed,stripe){
  const c=mkC(16,16),g=c.getContext('2d');
  speckFill(g,'#4ca030',[['#3c8426',7,2],['#64bc44',5,1],['#2e6e1c',3,1]],seed);
  if(stripe){g.fillStyle='#5cb43c';g.fillRect(1,3,6,1);g.fillRect(9,10,6,1);}
  return c;}
function dirtTile(seed){
  const c=mkC(16,16),g=c.getContext('2d');
  speckFill(g,'#b28278',[['#9a645e',7,2],['#c89c92',5,1],['#8a544e',3,1]],seed);
  return c;}
const BOULDER_C=(()=>{ // pedregulho cinza-azulado (bloco macio da grama)
  const c=mkC(16,16),g=c.getContext('2d');
  g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(8,13.5,7,2.4,0,0,7);g.fill();
  ell(g,8,8.6,6.8,5.8,'#5c6c80');
  ell(g,8,8.2,6.4,5.4,'#8a9aa8');
  ell(g,6.4,6.4,4.4,3.4,'#c2d2d8');
  g.fillStyle='#e0ecf0';g.fillRect(4,4,4,2);g.fillRect(3,6,2,2);
  g.fillStyle='#6a7c90';g.fillRect(9,9,4,2);g.fillRect(6,11,5,2);
  g.fillStyle='#4a5a6e';g.fillRect(5,9,3,1);g.fillRect(11,6,1,2);
  return outlined(c,'#232c38');})();
const THEMES={
 out:{floor:[grassTile(101,false),grassTile(202,true)],
      hard:goldRock(7),soft:BOULDER_C,scenery:'water'},
 cave:{floor:[dirtTile(303),dirtTile(404)],
      hard:goldRock(7),soft:null,scenery:'cave'}};
{ // crânio de dinossauro fossilizado (bloco macio da terra)
  const c=mkC(16,16),g=c.getContext('2d'),Wl='#dce4c0',S='#b4c094',K='#4a5238',D='#20260f';
  g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(8,13,7,2.4,0,0,7);g.fill();
  g.fillStyle=Wl;g.fillRect(3,2,10,9);g.fillRect(2,4,12,5);g.fillRect(4,11,8,2);
  g.fillStyle=S;g.fillRect(3,9,10,1);g.fillRect(12,5,2,4);g.fillRect(3,13,10,1);
  g.fillStyle=D;g.fillRect(4,5,3,3);g.fillRect(9,5,3,3);g.fillRect(7,8,2,1);
  g.fillStyle='#000';g.fillRect(5,6,1,1);g.fillRect(10,6,1,1);
  g.fillStyle=Wl;for(let i=0;i<4;i++)g.fillRect(4+i*2,11,1,2);
  g.fillStyle=K;g.fillRect(3,1,10,1);g.fillRect(2,2,1,8);g.fillRect(13,2,1,8);
  g.fillRect(3,12,10,1);g.fillRect(4,13,8,1);
  THEMES.cave.soft=c;
}
const DOOR_TILE=(()=>{ // escadaria de pedra (saída clássica)
  const c=mkC(16,16),g=c.getContext('2d');
  g.fillStyle='#4a505c';g.fillRect(1,1,14,15);
  const steps=[[2,'#d0d4da'],[5,'#b0b6be'],[8,'#8c939e'],[11,'#6a717c']];
  for(const[y,col]of steps){g.fillStyle=col;g.fillRect(2,y,12,3);}
  g.fillStyle='#e8ecf0';g.fillRect(2,2,12,1);g.fillRect(2,5,12,1);
  return c;})();

/* --------------------------- explosões ---------------------------- */
const FLAME_LAY=['#e85818','#fb9020','#ffd23e','#fff0a0','#ffffff'];
function flameTile(kind,fr){ // kind c|h|v|lh|rh|tv|bv ; fr 0..2
  const c=mkC(16,16),g=c.getContext('2d');
  const TH=[11,14,16][fr];
  const band=(horiz)=>{ // faixa central com camadas
    for(let i=0;i<FLAME_LAY.length;i++){
      const th=Math.max(1,TH-(FLAME_LAY.length-1-i)*((TH)/FLAME_LAY.length));
      const off=(16-Math.round(th))/2;
      g.fillStyle=FLAME_LAY[i];
      if(horiz)g.fillRect(kind[0]==='l'?i:kind[0]==='r'?0:0,off,
        kind[0]==='c'?16:16,Math.round(th));
      else g.fillRect(off,0,Math.round(th),16);}};
  if(kind==='h'||kind==='lh'||kind==='rh'){
    for(let i=0;i<5;i++){const th=Math.max(2,Math.round(TH*(5-i)/5));
      const off=(16-th)>>1;g.fillStyle=FLAME_LAY[i];
      if(kind!=='rh')g.fillRect(0,off,16,th);
      else g.fillRect(fr===0&&i>2?2:0,off,16,th);}
    if(kind==='h'){ // brilho central
      g.fillStyle='#ffffff';g.fillRect(5,7,6,2);}
  }else if(kind==='v'||kind==='tv'||kind==='bv'){
    for(let i=0;i<5;i++){const th=Math.max(2,Math.round(TH*(5-i)/5));
      const off=(16-th)>>1;g.fillStyle=FLAME_LAY[i];
      if(kind!=='bv')g.fillRect(off,0,th,16);
      else g.fillRect(off,fr===0&&i>2?2:0,th,16);}
    if(kind==='v'){g.fillStyle='#ffffff';g.fillRect(7,5,2,6);}
  }else{ // centro
    for(let i=0;i<5;i++){const th=Math.max(3,Math.round(TH*(5-i)/4.2));
      const off=(16-th)>>1;g.fillStyle=FLAME_LAY[i];
      g.fillRect(0,off,16,th);g.fillRect(off,0,th,16);}
    const s=[5,7,9][fr];g.fillStyle='#ffffff';g.fillRect(8-s/2,8-s/2,s,s);
  }
  // pontas arredondadas nas extremidades externas
  const r=TH/2;
  if(kind==='lh'){ell(g,0.5,8,r,r,FLAME_LAY[1]);ell(g,0.5,8,r*.6,r*.6,FLAME_LAY[3]);}
  if(kind==='rh'){ell(g,15.5,8,r,r,FLAME_LAY[1]);ell(g,15.5,8,r*.6,r*.6,FLAME_LAY[3]);}
  if(kind==='tv'){ell(g,8,0.5,r,r,FLAME_LAY[1]);ell(g,8,0.5,r*.6,r*.6,FLAME_LAY[3]);}
  if(kind==='bv'){ell(g,8,15.5,r,r,FLAME_LAY[1]);ell(g,8,15.5,r*.6,r*.6,FLAME_LAY[3]);}
  // faíscas determinísticas
  const rr=mulberry(fr*77+kind.charCodeAt(0));g.fillStyle=FLAME_LAY[4];
  for(let i=0;i<4;i++)g.fillRect((rr()*16)|0,(rr()*16)|0,1,1);
  return c;}
const FLAMES={};
for(const k of['c','h','v','lh','rh','tv','bv'])
  FLAMES[k]=[flameTile(k,0),flameTile(k,1),flameTile(k,2)];

/* ----------------------------- itens ------------------------------ */
function itemIcon(type){
  const c=mkC(16,16),g=c.getContext('2d');
  const K='#181420';
  if(type==='bombup'){
    ell(g,8,9.5,5.6,5.4,K);ell(g,8,9.5,4.6,4.4,'#2c2c3a');
    g.fillStyle='#808094';g.fillRect(5,6,3,2);g.fillRect(4,8,1,2);
    rc(g,7,2,3,2,'#444454');rc(g,8,1,2,1,'#c8a850');rc(g,10,0,1,1,'#ffd854');
  }else if(type==='fire'){
    ell(g,8,10,5,5,'#ef5810');
    g.fillStyle='#fb9000';g.beginPath();g.moveTo(8,1);
    g.quadraticCurveTo(13,6,11,12);g.lineTo(5,12);g.quadraticCurveTo(3,6,8,1);g.fill();
    g.fillStyle='#ffe040';g.beginPath();g.moveTo(8,5);
    g.quadraticCurveTo(11,8,10,13);g.lineTo(6,13);g.quadraticCurveTo(5,8,8,5);g.fill();
    g.fillStyle='#fff8c0';g.fillRect(7,9,2,4);
  }else if(type==='speed'){
    g.fillStyle='#2036a0';g.fillRect(4,3,7,6);g.fillStyle='#5a7ce8';g.fillRect(5,4,4,4);
    g.fillStyle='#e8ecf6';g.fillRect(3,9,10,2);
    g.fillStyle='#9aa4bc';g.fillRect(3,11,10,1);
    g.fillStyle='#303650';g.fillRect(3,12,3,2);g.fillRect(9,12,3,2);
    g.fillStyle='#ffd23e';g.fillRect(12,4,3,1);g.fillRect(11,6,2,1);
  }else if(type==='time'){
    ell(g,8,8,6,6,'#7a5410');ell(g,8,8,5,5,'#ffd23e');
    g.fillStyle='#fff8d0';g.fillRect(7,4,2,4);g.fillRect(8,8,4,2);
    g.fillStyle='#7a5410';g.fillRect(7,1,2,2);g.fillRect(11,2,2,2);
  }else if(type==='glove'){
    g.fillStyle='#183898';g.fillRect(3,4,8,8);
    g.fillStyle='#3f68e8';g.fillRect(4,5,6,6);
    g.fillStyle='#183898';g.fillRect(2,6,1,4);g.fillRect(11,5,3,2);
    g.fillStyle='#e8ecf6';g.fillRect(11,8,4,3);
    g.fillStyle='#3f68e8';g.fillRect(4,2,2,2);g.fillRect(7,2,2,2);
  }else if(type==='punch'){
    ell(g,8,7,5.4,5,'#a01830');ell(g,8,7,4.4,4,'#ef3050');
    g.fillStyle='#ffb0b8';g.fillRect(5,4,3,2);
    rc(g,5,12,6,3,'#882018');rc(g,6,13,4,1,'#c04838');
  }else if(type==='pierce'){
    ell(g,8,8.5,5,5,'#20242e');ell(g,8,8.5,4,4,'#4c5064');
    g.fillStyle='#8a90a4';
    for(const[a,b]of[[8,1],[8,14],[2,8],[14,8],[4,4],[12,4],[4,12],[12,12]]){
      g.beginPath();g.moveTo(a,b);g.lineTo(a-1.6,b+(b<8?2:b<9?0:-2)+ (a<3||a>13?0:(b===4?-2:0)));
      g.lineTo(a+1.6,b);g.fill();}
    g.fillStyle='#aab0c4';g.fillRect(6,6,3,2);
  }else if(type==='heart'){
    g.fillStyle='#e82040';
    g.beginPath();g.arc(5.4,6.4,3.2,0,7);g.arc(10.6,6.4,3.2,0,7);g.fill();
    g.beginPath();g.moveTo(2.3,7.6);g.lineTo(8,14);g.lineTo(13.7,7.6);g.closePath();g.fill();
    g.fillStyle='#ff90a0';g.fillRect(4,5,2,2);
  }else if(type==='cake'){
    g.fillStyle='#f8f0e0';g.beginPath();g.moveTo(3,13);g.lineTo(13,13);g.lineTo(13,6);
    g.quadraticCurveTo(8,2,3,6);g.closePath();g.fill();
    g.fillStyle='#f0a0b8';g.fillRect(3,7,10,2);
    g.fillStyle='#e84060';ell(g,8,4,1.6,1.6,'#e84060');
    g.fillStyle='#c88048';g.fillRect(3,12,10,1);
  }else if(type==='egg'){
    ell(g,8,9,4.6,6,'#e8e4d8');ell(g,7,7,1.6,2,'#f8f6ee');
    g.fillStyle='#7cb84c';g.fillRect(6,10,2,2);g.fillRect(9,7,1.6,1.6);g.fillRect(8,12,1.4,1.4);
  }else if(type==='clockfx'){ /* nada */ }
  return c;}
const ITEMS={};
for(const t of['bombup','fire','speed','time','glove','punch','pierce','heart','cake','egg'])
  ITEMS[t]=itemIcon(t);

/* ----------------------------- bombas ----------------------------- */
function bombCanvas(spike){
  const c=mkC(16,16),g=c.getContext('2d');
  if(spike){ // cones da perfuradora (atrás do corpo)
    for(const[sx,sy]of[[3.2,3.2],[12.8,3.2],[1.2,9],[14.8,9],[4.4,14],[11.6,14]]){
      const dx=sx-8,dy=sy-9,d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d;
      g.fillStyle='#aab4c4';
      g.beginPath();
      g.moveTo(sx-uy*2,sy+ux*2);g.lineTo(sx+ux*3,sy+uy*3);g.lineTo(sx+uy*2,sy-ux*2);
      g.closePath();g.fill();
      g.fillStyle='#6a7484';
      g.beginPath();
      g.moveTo(sx+ux*3,sy+uy*3);g.lineTo(sx+uy*2,sy-ux*2);g.lineTo(sx+ux*.5,sy+uy*.5);
      g.closePath();g.fill();}}
  ell(g,8,9.4,6.4,6,'#141a26');ell(g,8,9.4,5.4,5,'#232c3e');
  g.fillStyle='#d8e2ec'; // crescente de brilho
  g.beginPath();g.arc(6.4,7.4,4.4,Math.PI*.95,Math.PI*1.55);g.arc(7.6,8.6,3.4,Math.PI*1.5,Math.PI*.92,true);
  g.closePath();g.fill();
  g.fillStyle='#8898ac';g.fillRect(4,7,2,2);
  rc(g,6,2,4,3,'#1a1e2a');rc(g,7,1,2,1,'#3c4656'); // capa + pavio
  return c;}
const BOMB_C=bombCanvas(false),BOMB_S=bombCanvas(true);
const tintRed=c=>{const n=mkC(c.width,c.height),g=n.getContext('2d');
  g.drawImage(c,0,0);g.globalCompositeOperation='source-atop';
  g.fillStyle='rgba(255,48,16,.5)';g.fillRect(0,0,n.width,n.height);return n;};
const BOMB_R=tintRed(BOMB_C),BOMB_RS=tintRed(BOMB_S);

/* =================== SPRITES · INIMIGOS (procedurais) =============== */
function spikyFrame(st){ // criatura verde espinhosa (andarilho 1-1)
  const c=mkC(16,14),g=c.getContext('2d');
  g.fillStyle='#2c7a14';
  g.fillRect(st?3.4:5.2,11.4,2.6,2);g.fillRect(st?10:8.2,11.4,2.6,2);
  for(const[sx,sy]of[[4,3.4],[8,2],[12,3.4]]){
    g.beginPath();g.moveTo(sx-2,sy+2.4);g.lineTo(sx,sy-2.6);g.lineTo(sx+2,sy+2.4);g.fill();}
  g.beginPath();g.moveTo(2,8);g.lineTo(1,4.6);g.lineTo(3.4,6.8);g.fill();
  g.beginPath();g.moveTo(14,8);g.lineTo(15,4.6);g.lineTo(12.6,6.8);g.fill();
  ell(g,8,7.6,6,5.2,'#58c828');
  ell(g,6.2,5.8,3.2,2.4,'#8ce858');
  g.fillStyle='#fff';g.fillRect(4.2,5.4,3,3.4);g.fillRect(8.8,5.4,3,3.4);
  g.fillStyle='#101a08';
  g.fillRect(st?5.4:4.8,6.8,1.4,1.8);g.fillRect(st?9.6:10.2,6.8,1.4,1.8);
  g.fillStyle='#1c4a0c';g.fillRect(7,10.2,2,1);
  return outlined(c,'#123006');}
function dinoFrame(st,horn,frill,body,belly,out){ // montaria: dino c/ chifres rosa
  const c=mkC(20,14),g=c.getContext('2d');
  // cauda
  g.fillStyle=body;g.beginPath();g.moveTo(0,9);g.lineTo(5,5.4);g.lineTo(5,10.4);g.fill();
  // pernas (atrás do corpo)
  g.fillStyle='#4c8a20';
  if(st){g.fillRect(4.4,9.6,2.2,4);g.fillRect(12.8,9.6,2.2,4);}
  else{g.fillRect(6,9.6,2.2,4);g.fillRect(11.2,9.6,2.2,4);}
  // corpo
  ell(g,8.6,7.6,6.2,4.2,body);
  ell(g,8.6,9.4,5.2,2.2,belly);
  g.fillStyle=frill;g.fillRect(4,5.4,6,1); // crista dorsal
  // franja (atrás da cabeça)
  ell(g,13.6,5.2,4.2,4,frill);
  g.fillStyle=horn;
  g.fillRect(11,1.8,1.8,2);g.fillRect(14,1.2,1.8,2); // espinhos da franja
  // cabeça
  ell(g,15.2,6.4,3.4,3,body);
  // chifre nasal
  g.fillStyle=horn;
  g.beginPath();g.moveTo(19.8,6.2);g.lineTo(16.2,5.6);g.lineTo(17,8);g.fill();
  // bico
  g.fillStyle='#d8c890';g.beginPath();g.moveTo(18.8,7.4);g.lineTo(16.4,7.2);g.lineTo(17.6,9);g.fill();
  // olho
  g.fillStyle='#fff';g.fillRect(14.4,5.2,2.2,2.2);
  g.fillStyle='#10240c';g.fillRect(15.4,5.8,1,1.2);
  return outlined(c,out);}
function tanFrame(st){ // criatura bege (andarilho 1-2/1-3)
  const c=mkC(16,15),g=c.getContext('2d');
  g.fillStyle='#8a6428';
  g.fillRect(st?4:5,13.2,2.4,1.6);g.fillRect(st?9.6:8.6,13.2,2.4,1.6);
  g.fillStyle='#e8c878';
  g.beginPath();g.moveTo(3,13.4);g.quadraticCurveTo(2.4,4.2,8,3.4);
  g.quadraticCurveTo(13.6,4.2,13,13.4);g.closePath();g.fill();
  g.fillStyle='#c09850';g.fillRect(3.4,11.4,9.2,2);
  g.fillStyle='#f4e0a8';g.fillRect(6,4.2,4,1.6);
  g.fillStyle='#201408';g.fillRect(5.4,7,1.6,2.2);g.fillRect(9,7,1.6,2.2);
  if(st)ell(g,8,10.4,1.8,1.4,'#7a4c14');else{g.fillStyle='#7a4c14';g.fillRect(7,10.2,2,1.2);}
  g.fillStyle='#f0a870';g.fillRect(4,9.2,1.4,1);g.fillRect(10.6,9.2,1.4,1);
  return outlined(c,'#5c3c10');}
function bluespFrame(st){ // espinhoso azul, corpo vermelho (perseguidor 1-4/1-5)
  const c=mkC(16,16),g=c.getContext('2d');
  g.fillStyle='#5a1c10';
  g.fillRect(st?4:5,14,2.4,1.8);g.fillRect(st?9.6:8.6,14,2.4,1.8);
  ell(g,8,11.2,5.6,4,'#a03818');
  ell(g,8,12.6,4.4,2.2,'#c86030');
  g.fillStyle='#1848a0';
  for(const[sx,sy]of[[3.6,4.6],[6,2.6],[8.6,2],[11.2,3]]){
    g.beginPath();g.moveTo(sx-1.6,sy+2);g.lineTo(sx,sy-2.4);g.lineTo(sx+1.6,sy+2);g.fill();}
  ell(g,8,6.6,5.6,4.2,'#2868d8');
  ell(g,6.4,5,2.6,1.8,'#5898f0');
  g.fillStyle='#fff';g.fillRect(5,6.2,2.4,2.6);g.fillRect(8.6,6.2,2.4,2.6);
  g.fillStyle='#101828';g.fillRect(6,7.2,1.1,1.3);g.fillRect(9.6,7.2,1.1,1.3);
  g.fillStyle='#401008';g.fillRect(7,10.6,2,1);
  return outlined(c,'#0c1030');}
function bigblueFrame(st){ // espinhoso azul grande (1-5, chuta bombas)
  const c=mkC(18,18),g=c.getContext('2d');
  g.fillStyle='#5a1c10';
  g.fillRect(st?4.6:5.8,15.8,2.8,2);g.fillRect(st?10.6:9.4,15.8,2.8,2);
  ell(g,9,12,6.6,4.8,'#a03818');
  ell(g,9,13.6,5.2,2.6,'#c86030');
  g.fillStyle='#1848a0';
  for(const[sx,sy]of[[4,4.6],[6.8,2.2],[9.6,1.6],[12.6,3]]){
    g.beginPath();g.moveTo(sx-2,sy+2.4);g.lineTo(sx,sy-3);g.lineTo(sx+2,sy+2.4);g.fill();}
  ell(g,9,7.2,6.4,4.8,'#2868d8');
  ell(g,7,5.2,3,2,'#5898f0');
  g.fillStyle='#fff';g.fillRect(5.6,6.6,2.6,2.8);g.fillRect(9.8,6.6,2.6,2.8);
  g.fillStyle='#101828';g.fillRect(6.8,7.8,1.2,1.4);g.fillRect(10.6,7.8,1.2,1.4);
  g.fillStyle='#1848a0';g.fillRect(5.4,5.6,2.8,1);g.fillRect(9.8,5.6,2.8,1);
  g.fillStyle='#401008';
  g.beginPath();g.moveTo(6.4,12.6);g.lineTo(7.8,11.6);g.lineTo(9.2,12.6);
  g.lineTo(10.6,11.6);g.lineTo(12,12.6);g.lineTo(11.2,13.4);g.lineTo(7.2,13.4);g.fill();
  return outlined(c,'#0c1030');}
function hideoutFrame(fr){ // plataforma de pedra do chefe, 4 tochas
  const c=mkC(18,18),g=c.getContext('2d');
  ell(g,9,12,8.4,5.4,'#7c8088');
  ell(g,9,10.8,7.6,5,'#a8acb4');
  ell(g,9,9.6,5.6,3.4,'#ccd0d6');
  g.strokeStyle='#5c6068';g.lineWidth=1;
  g.beginPath();g.arc(9,10,5.2,Math.PI*1.1,Math.PI*1.9);g.stroke();
  g.fillStyle='#1a1622';g.beginPath();g.arc(9,15.4,3.2,Math.PI,0);g.rect(5.8,15.4,6.4,2.6);g.fill();
  for(const[tx,ty]of[[3.2,6.6],[14.8,6.6],[2,11.8],[16,11.8]]){
    g.fillStyle='#6a4a20';g.fillRect(tx-.6,ty,1.2,2.6);
    ell(g,tx,ty-1,1.7,2.1,'#e85818');
    ell(g,tx,ty-1.4,fr?.9:.7,1.3,fr?'#ffd23e':'#ff9020');}
  return outlined(c,'#262a32');}
const HIDEOUT_FR=[hideoutFrame(0),hideoutFrame(1)];
const ENEMY_FR={
 trike:[spikyFrame(0),spikyFrame(1)],
 omajin:[tanFrame(0),tanFrame(1)],
 uhho:[bluespFrame(0),bluespFrame(1)],
 dogun:[bigblueFrame(0),bigblueFrame(1)],
 dogun0:[bigblueFrame(0),bigblueFrame(1)]};
const MOUNT_FR=[dinoFrame(0,'#f078b0','#e86aa0','#6ad038','#f0f4c0','#1c4010'),
                dinoFrame(1,'#f078b0','#e86aa0','#6ad038','#f0f4c0','#1c4010')];
const ROCK_C=(()=>{const c=mkC(14,14),g=c.getContext('2d');
  ell(g,7,7,6,5.6,'#6b4a2a');ell(g,6.4,6.4,4.8,4.4,'#93643a');
  g.fillStyle='#b8834e';g.fillRect(4,4,3,2);g.fillRect(3,6,2,2);
  g.fillStyle='#54371c';g.fillRect(8,8,3,2);g.fillRect(6,10,3,1);
  return outlined(c,'#2e1c0c');})();
const EGG_C=ITEMS.egg;
const CAGE_C=(()=>{const c=mkC(16,16),g=c.getContext('2d');
  g.fillStyle='#5c4a20';g.fillRect(2,13,12,2);
  g.fillStyle='#8a7038';g.fillRect(2,13,12,1);
  g.fillStyle='#c8a850';
  for(let i=0;i<5;i++)g.fillRect(2+i*3,2,1.6,12);
  g.fillRect(2,2,12,1.6);g.fillRect(2,7,12,1.4);
  g.fillStyle='#8a7038';g.fillRect(1,1,3,2);g.fillRect(12,1,3,2);
  return c;})();

/* ============================== ÁUDIO ============================== */
const AU={ctx:null,muted:false,gain:null,noise:null,music:{on:false,step:0,next:0}};
function auInit(){
  if(AU.ctx)return;
  const C=new(window.AudioContext||window.webkitAudioContext)();
  AU.ctx=C;AU.gain=C.createGain();AU.gain.gain.value=.5;AU.gain.connect(C.destination);
  const len=C.sampleRate*.5,buf=C.createBuffer(1,len,C.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=Math.random()*2-1;AU.noise=buf;}
function beep(f0,f1,t,type,vol,when=0){
  if(!AU.ctx||AU.muted)return;const C=AU.ctx,T=C.currentTime+when;
  const o=C.createOscillator(),g=C.createGain();
  o.type=type;o.frequency.setValueAtTime(f0,T);
  if(f1)o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),T+t);
  g.gain.setValueAtTime(vol,T);g.gain.exponentialRampToValueAtTime(.001,T+t);
  o.connect(g);g.connect(AU.gain);o.start(T);o.stop(T+t+.02);}
function noiseHit(t,vol,fq,when=0){
  if(!AU.ctx||AU.muted)return;const C=AU.ctx,T=C.currentTime+when;
  const s=C.createBufferSource();s.buffer=AU.noise;s.loop=true;
  const f=C.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(fq,T);
  f.frequency.exponentialRampToValueAtTime(60,T+t);
  const g=C.createGain();g.gain.setValueAtTime(vol,T);
  g.gain.exponentialRampToValueAtTime(.001,T+t);
  s.connect(f);f.connect(g);g.connect(AU.gain);s.start(T);s.stop(T+t+.02);}
const SFX={
 place(){beep(520,260,.09,'square',.22);},
 explode(){noiseHit(.4,.5,900);beep(120,38,.35,'triangle',.5);beep(300,60,.2,'square',.2);},
 item(){beep(880,0,.07,'square',.22);beep(1320,0,.12,'square',.22,.07);},
 hurt(){beep(400,50,.5,'sawtooth',.3);},
 die(){beep(600,40,.9,'sawtooth',.32);noiseHit(.5,.2,500,.1);},
 clearJ(){[523,659,784,1047].forEach((f,i)=>beep(f,0,.16,'square',.25,i*.13));},
 door(){[660,880,1100].forEach((f,i)=>beep(f,0,.09,'triangle',.25,i*.06));},
 tick(){beep(1000,0,.05,'square',.2);},
 kick(){beep(240,480,.08,'square',.25);},
 punch(){noiseHit(.12,.3,2500);},
 rock(){noiseHit(.25,.4,700);beep(180,60,.25,'triangle',.4);},
 warn(){beep(1200,800,.1,'square',.14);},
 cage(){[659,784,988,1319].forEach((f,i)=>beep(f,0,.14,'square',.24,i*.1));},
 start(){beep(660,0,.08,'square',.25);beep(990,0,.14,'square',.25,.08);},
 pause(){beep(880,0,.06,'square',.2);beep(660,0,.08,'square',.2,.07);},
 mount(){beep(392,0,.08,'square',.22);beep(523,0,.1,'square',.22,.08);beep(659,0,.14,'square',.22,.16);}
};
const midi=n=>440*Math.pow(2,(n-69)/12);
const M_LEAD=[57,0,60,0,62,0,60,0,57,0,0,55,0,52,0,0,
              57,0,60,0,62,64,0,62,60,0,57,0,55,0,57,0];
const M_BASS=[45,0,0,0,45,0,0,0,48,0,0,0,43,0,0,0,
              45,0,0,0,48,0,0,0,52,0,0,0,43,0,45,0];
function musicTick(){
  if(!AU.ctx||AU.muted||!AU.music.on)return;const C=AU.ctx;
  const spb=60/138/2;
  while(AU.music.next<C.currentTime+.12){
    const st=AU.music.step%32,t=Math.max(0,AU.music.next-C.currentTime);
    const l=M_LEAD[st];if(l)beep(midi(l),0,spb*.9,'square',.09,t);
    const b=M_BASS[st];if(b)beep(midi(b),0,spb*1.8,'triangle',.16,t);
    if(st%8===0||st%8===5)noiseHit(.06,.16,st%8===0?300:600,t);
    else if(st%2===0)noiseHit(.03,.06,1500,t);
    AU.music.step++;AU.music.next+=spb;}}
function musicStart(){if(!AU.ctx)return;AU.music.on=true;
  AU.music.step=0;AU.music.next=AU.ctx.currentTime+.05;}
function musicStop(){AU.music.on=false;}

/* ============================ NÍVEIS =============================== */
/* pilares clássicos: casas (c%2==0 && r%2==0) são blocos fixos       */
const STAGE_DEFS=[
 {area:'1-1',time:179,outdoor:true,density:.42,seed:11,rocks:false,
  items:{bombup:[3,1],fire:[11,7],speed:[7,5],time:[5,7]},
  door:[7,3],cages:[],hideouts:[],hideHP:0,
  enemies:[['trike',4,3],['trike',10,3],['trike',4,7],['trike',10,7]]},
 {area:'1-2',time:179,outdoor:true,density:.46,seed:22,rocks:true,
  items:{bombup:[9,1],fire:[3,7],glove:[7,5]},
  door:[11,5],cages:[[1,5,'red']],hideouts:[],
  enemies:[['omajin',3,3],['omajin',11,3],['omajin',5,7],['omajin',9,7]]},
 {area:'1-3',time:239,outdoor:true,density:.5,seed:33,rocks:true,
  items:{bombup:[1,7],fire:[13,7],speed:[7,1]},
  door:[7,9],cages:[],hideouts:[],
  enemies:[['trike',3,5],['trike',11,5],['omajin',7,3],['omajin',7,7]]},
 {area:'1-4',time:239,outdoor:false,density:.52,seed:44,rocks:false,
  items:{bombup:[3,3],pierce:[11,3],punch:[7,7],time:[1,9]},
  door:[13,9],cages:[[7,5,'blue']],hideouts:[[7,1]],hideHP:5,
  enemies:[['uhho',5,3],['uhho',11,5],['uhho',5,9],['uhho',9,9]]},
 {area:'1-5',time:239,outdoor:false,density:.56,seed:55,rocks:false,
  items:{fire:[7,3],heart:[1,5],cake:[11,7]},
  door:[7,5],cages:[],hideouts:[[13,1]],hideHP:8,
  enemies:[['uhho',5,1],['uhho',9,1],['uhho',1,7],
           ['dogun',3,7],['dogun',11,9]]}];

/* ======================= ESTADO DO JOGO ============================= */
const G={
 st:'title',areaIdx:0,lives:3,score:0,hi:+(localStorage.getItem('sb4hi')||0),
 grid:null,under:null,items:[],eggs:[],bombs:[],enemies:[],cages:[],hideouts:[],
 flames:[],parts:[],floaters:[],rocks:[],door:null,
 timeLeft:0,clockT:0,shake:0,stageT:0,reason:'',
  player:null,paused:false,bannerT:0,bonusShow:0,titleSel:0,
 trans:null,titleT:0,introT:0,endT:0,overT:0,god:false
};
const key=(c,r)=>c+','+r;
const cellOf=(x,y)=>[Math.floor((x-FX)/TILE),Math.floor((y-FY)/TILE)];
const cx=c=>FX+c*TILE, cy=r=>FY+r*TILE;

function carvePath(sc,sr,tc,tr){ // garante rota do spawn do jogador até (tc,tr)
  // fases: só piso livre → abre macios sem item → abre qualquer macio
  for(const[soft,under]of[[false,false],[true,false],[true,true]]){
    const prev=new Map([[key(sc,sr),'']]);
    const q=[[sc,sr]];let hit='';
    while(q.length&&!hit){
      const[c,r]=q.shift();
      for(const[dc,dr]of[[1,0],[-1,0],[0,1],[0,-1]]){
        const nc=c+dc,nr=r+dr;
        if(nc<1||nr<1||nc>COLS-2||nr>ROWS-2)continue;
        const k2=key(nc,nr);
        if(prev.has(k2))continue;
        const v=G.grid[nr*COLS+nc];
        if(v===1)continue;
        if(v===2&&(!soft||G.under.has(k2)&&!under))continue;
        prev.set(k2,key(c,r));
        if(nc===tc&&nr===tr){hit=k2;break;}
        q.push([nc,nr]);}}
    if(hit){let k=hit;
      while(k){const[c,r]=k.split(',').map(Number);
        if(G.grid[r*COLS+c]===2){G.grid[r*COLS+c]=0;G.under.delete(k);}
        k=prev.get(k);}
      return;}}}
function buildStage(i,carry){
  const def=STAGE_DEFS[i],rng=mulberry(def.seed);
  G.grid=new Uint8Array(COLS*ROWS);G.under=new Map();
  G.items=[];G.eggs=[];G.bombs=[];G.enemies=[];G.cages=[];G.hideouts=[];
  G.flames=[];G.parts=[];G.floaters=[];G.rocks=[];
  G.clockT=0;G.shake=0;G.stageT=0;G.timeLeft=def.time;
  const FLOOR=0,HARD=1,SOFT=2;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)
    G.grid[r*COLS+c]=(c===0||r===0||c===COLS-1||r===ROWS-1||(c%2===0&&r%2===0))?HARD:FLOOR;
  const setSoft=(c,r,it)=>{if(c<1||c>COLS-2||r<1||r>ROWS-2)return;
    if(G.grid[r*COLS+c]===HARD)return;
    G.grid[r*COLS+c]=SOFT;if(it)G.under.set(key(c,r),it);};
  // zona segura do spawn
  const safe=[[1,1],[2,1],[1,2]];
  const isSafe=(c,r)=>safe.some(([a,b])=>a===c&&b===r);
  for(let r=1;r<ROWS-1;r++)for(let c=1;c<COLS-1;c++){
    if(G.grid[r*COLS+c]!==FLOOR||isSafe(c,r))continue;
    if(rng()<def.density)setSoft(c,r,null);}
  // itens sob blocos
  for(const[it,[c,r]]of Object.entries(def.items))setSoft(c,r,{type:'item',item:it});
  setSoft(def.door[0],def.door[1],{type:'door'});
  // gaiolas / abrigos (em piso livre)
  for(const[c,r,col]of def.cages){
    G.grid[r*COLS+c]=FLOOR;G.cages.push({c,r,hp:1,col:col||'red'});}
  for(const[c,r]of def.hideouts){
    G.grid[r*COLS+c]=FLOOR;G.hideouts.push({c,r,hp:def.hideHP,max:def.hideHP,spawnT:4});}
  // inimigos: limpa a célula do spawn e garante rota livre até o jogador
  for(const[t,c,r]of def.enemies){
    G.grid[r*COLS+c]=FLOOR;G.under.delete(key(c,r));
    carvePath(1,1,c,r);}
  for(const[t,c,r]of def.enemies)spawnEnemy(t,c,r,false);
  G.initUhho=def.enemies.filter(e=>e[0]==='uhho').length;
  // porta
  G.door={c:def.door[0],r:def.door[1],revealed:false,active:false};
  // jogador (mantém power-ups quando vem de outra fase)
  G.player=makePlayer(carry);
  updateDoorState();
}
function makePlayer(carry){
  const p={x:cx(1)+8,y:cy(1)+13,dir:'D',moving:false,animT:0,frame:0,
    bombsMax:1,fire:1,speedLv:0,glove:false,punch:false,pierce:false,kick:false,
    shield:false,mount:null,carrying:null,
    invuln:2,dead:false,deadT:0,vy:0,vrot:0,rot:0,
    standBomb:null,holdT:0,throwing:null};
  if(carry)Object.assign(p,carry);
  return p;}

/* ============================ ENTIDADES ============================= */
let eid=0;
function spawnEnemy(t,c,r,ridden){
  const base={id:++eid,type:t,c,r,x:cx(c)+8,y:cy(r)+12,dir:'D',animT:rnd(0,.5),
    dead:false,deadT:0,pauseT:0,thinkT:0,home:r};
  if(t==='trike')Object.assign(base,{speed:26,pts:100});
  if(t==='omajin')Object.assign(base,{speed:36,pts:200});
  if(t==='uhho')Object.assign(base,{speed:24,chase:40,pts:200});
  if(t==='dogun')Object.assign(base,{speed:30,chase:44,pts:300,ridden:true});
  G.enemies.push(base);}

function solidCell(c,r,opt){
  if(c<0||r<0||c>=COLS||r>=ROWS)return true;
  const v=G.grid[r*COLS+c];
  if(v===1)return true;if(v===2)return!(opt&&opt.softPass);
  const b=bombAt(c,r);
  if(b&&(!opt||!opt.bombKeys||!opt.bombKeys.has(key(c,r))))return true;
  return false;}
function bombAt(c,r){for(const b of G.bombs)if(b.c===c&&b.r===r&&!b.flying&&!b.carried)return b;return null;}

function hitbox(e){return{x:e.x-4,y:e.y-8,w:8,h:8};}
function solidStrip(x0,x1,y0,y1,opt){
  const c0=Math.floor((x0-FX)/TILE),c1=Math.floor((x1-FX)/TILE);
  const r0=Math.floor((y0-FY)/TILE),r1=Math.floor((y1-FY)/TILE);
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)
    if(solidCell(c,r,opt))return true;
  return false;}

function moveEntity(e,dx,dy,opt){
  let moved=false;
  if(dx!==0){
    const nx=e.x+dx;
    const lead=dx>0?nx+4:nx-4;
    if(!solidStrip(lead,lead,e.y-8,e.y-1,opt)){e.x=nx;moved=true;}
    else{ // desliza para alinhar no corredor (auxiliar de quina)
      const lane=Math.round((e.y-FY-12)/TILE)*TILE+FY+12;
      const pull=clamp(lane-e.y,-Math.abs(dx),Math.abs(dx));
      if(pull&&!solidStrip(lead,lead,e.y-8+pull,e.y-1+pull,opt)){
        e.y+=pull;
        if(!solidStrip(lead,lead,e.y-8,e.y-1,opt)){e.x=nx;moved=true;}
      }
    }
  }
  if(dy!==0){
    const ny=e.y+dy;
    const lead=dy>0?ny-1:ny-8;
    if(!solidStrip(e.x-4,e.x+4,lead,lead,opt)){e.y=ny;moved=true;}
    else{
      const lane=Math.round((e.x-FX-8)/TILE)*TILE+FX+8;
      const pull=clamp(lane-e.x,-Math.abs(dy),Math.abs(dy));
      if(pull&&!solidStrip(e.x-4+pull,e.x+4+pull,lead,lead,opt)){
        e.x+=pull;
        if(!solidStrip(e.x-4,e.x+4,lead,lead,opt)){e.y=ny;moved=true;}
      }
    }
  }
  e.x=clamp(e.x,FX+6,FX+(COLS-1)*TILE+10-6);
  e.y=clamp(e.y,FY+13,FY+(ROWS-1)*TILE+2);
  return moved;}

/* ------------------------- bombas & fogo -------------------------- */
function placeBomb(p){
  const[c,r]=cellOf(p.x,p.y-4);
  if(bombAt(c,r)||G.bombs.filter(b=>!b.carried&&!b.flying).length>=p.bombsMax)return;
  if(solidCell(c,r))return;
  const b={c,r,x:cx(c)+8,y:cy(r)+8,fuse:2.5,owner:p,pierce:p.pierce,
    moving:null,carried:false,flying:false};
  G.bombs.push(b);p.standBomb=key(c,r);SFX.place();}
function explode(b){
  b.dead=true;
  const cells=[[b.c,b.r,'c']];
  const dirs=[['h',1,0,'rh'],['h',-1,0,'lh'],['v',0,1,'bv'],['v',0,-1,'tv']];
  for(const[ax,dx,dy,tip]of dirs){
    for(let i=1;i<=b.owner.fire;i++){
      const c=b.c+dx*i,r=b.r+dy*i;
      const v=G.grid[r*COLS+c];
      if(v===1)break;
      const ob=bombAt(c,r);if(ob){ob.fuse=Math.min(ob.fuse,.05);}
      const ho=hideoutAt(c,r);if(ho){damageHideout(ho);break;}
      const ca=cageAt(c,r);if(ca){breakCage(ca);break;}
      if(v===2){
        burnSoft(c,r);
        cells.push([c,r,ax==='h'?'h':'v']);
        if(b.pierce)cells.push([c,r,i===b.owner.fire?tip:(dx?'h':'v')]);
        if(!b.pierce)break;
        continue;}
      cells.push([c,r,i===b.owner.fire?tip:(dx?'h':'v')]);
    }}
  for(const[c,r,k]of cells)G.flames.push({c,r,k,t:.45});
  SFX.explode();G.shake=5;
  puff(cx(b.c)+8,cy(b.r)+8,'#555',6);
}
function hideoutAt(c,r){return G.hideouts.find(h=>h.c===c&&h.r===r&&!h.dead);}
function cageAt(c,r){return G.cages.find(k=>k.c===c&&k.r===r&&!k.dead);}
function burnSoft(c,r){
  G.grid[r*COLS+c]=0;puff(cx(c)+8,cy(r)+8,'#c8b894',5);
  const u=G.under.get(key(c,r));
  if(u){G.under.delete(key(c,r));
    if(u.type==='door'){G.door.revealed=true;updateDoorState();SFX.door();
      floatTxt(cx(c)+8,cy(r),'SAIDA!','#7cf')}
    else G.items.push({c,r,item:u.item,prot:.3});}}
function damageHideout(h){
  h.hp--;h.flash=.2;puff(cx(h.c)+8,cy(h.r)+6,'#aab',4);
  if(h.hp<=0){h.dead=true;G.score+=800;
    floatTxt(cx(h.c)+8,cy(h.r),'800','#ffd23e');
    puff(cx(h.c)+8,cy(h.r)+8,'#99a2b2',12);SFX.rock();updateDoorState();}}
function breakCage(k){
  k.dead=true;G.score+=1000;
  floatTxt(cx(k.c)+8,cy(k.r),'1000','#ffd23e');SFX.cage();
  for(let i=0;i<10;i++)part(cx(k.c)+8,cy(k.r)+6,rnd(-60,60),rnd(-120,-30),'#c8a850',.6);
  // amigo libertado: pulinha e some
  G.parts.push({friend:true,x:cx(k.c)+8,y:cy(k.r)+8,vy:-40,t:1.6,col:k.col});}

function updateFlames(dt){
  const set=new Set();
  for(const f of G.flames){f.t-=dt;set.add(key(f.c,f.r));}
  G.flames=G.flames.filter(f=>f.t>0);
  G.flameSet=set;
  // cadeia + destruição de itens expostos
  for(const b of G.bombs)if(set.has(key(b.c,b.r)))b.fuse=Math.min(b.fuse,.03);
  for(const it of G.items)if(it.prot<=0&&set.has(key(it.c,it.r)))it.burn=true;
  G.items=G.items.filter(it=>{
    if(it.burn){puff(cx(it.c)+8,cy(it.r)+8,'#fff',4);return false;}return true;});
  // dano
  const pl=G.player;
  for(const f of G.flames){
    const fx=FX+f.c*TILE+2,fy=FY+f.r*TILE+2;
    for(const e of G.enemies)if(!e.dead){
      const b=hitbox(e);
      if(b.x<fx+12&&b.x+b.w>fx&&b.y<fy+12&&b.y+b.h>fy)killEnemy(e);}
    if(!pl.dead&&pl.invuln<=0){
      const b=hitbox(pl);
      if(b.x<fx+12&&b.x+b.w>fx&&b.y<fy+12&&b.y+b.h>fy)hurtPlayer();}
    for(const k of G.rocks)if(k.phase==='fall'&&key(Math.floor((k.x-FX)/16),Math.floor((k.y-FY)/16))===key(f.c,f.r))k.hitByFlame=true;
  }}

/* ------------------------- morte / dano --------------------------- */
function hurtPlayer(){
  const p=G.player;
  if(p.mount){loseMount();return;}
  if(p.shield){p.shield=false;p.invuln=2;SFX.hurt();
    floatTxt(p.x,p.y-18,'ESCUDO PERDIDO','#7cf');return;}
  killPlayer();}
function loseMount(){
  const p=G.player;
  if(p.mount==='trike')p.pierce=false;
  if(p.mount==='dogun')p.kick=false;
  p.mount=null;p.invuln=2;SFX.hurt();
  puff(p.x,p.y-10,'#8ed84e',8);floatTxt(p.x,p.y-18,'MONTARIA!','#fd5');}
function killPlayer(){
  const p=G.player;if(p.dead)return;
  p.dead=true;p.deadT=0;p.vy=-130;p.rot=0;musicStop();SFX.die();}
function killEnemy(e){
  e.dead=true;e.deadT=0;G.score+=e.pts;
  floatTxt(e.x,e.y-14,String(e.pts),'#fff');
  if(e.type==='trike')G.eggs.push({c:e.c,r:e.r,kind:'trike',t:.5});
  if(e.type==='dogun'){G.eggs.push({c:e.c,r:e.r,kind:'dogun',t:.5});
    if(e.riderAlive!==false)spawnEnemy('uhho',e.c,e.r);}
  if(e.type==='uhho'){ // voa lutando fora da tela
    SFX.hurt();}
  puff(e.x,e.y-6,'#fff',5);}

/* ----------------------- estado da saída -------------------------- */
function updateDoorState(){
  const alive=G.enemies.some(e=>!e.dead)||G.hideouts.some(h=>!h.dead);
  G.door.active=!alive;
  if(G.door.active&&!G._doorWasActive)SFX.door();
  G._doorWasActive=G.door.active;}

/* ============================ ATUALIZAÇÃO =========================== */
const IN={l:0,r:0,u:0,d:0,a:0,b:0,start:0,aEdge:0,bEdge:0,bRelease:0,lEdge:0,rEdge:0};
function playerUpdate(dt){
  const p=G.player;
  if(p.dead){
    p.deadT+=dt;p.vy+=340*dt;p.y+=p.vy*dt;p.rot+=10*dt;
    if(p.deadT>1.6)afterDeath();
    return;}
  p.invuln=Math.max(0,p.invuln-dt);
  // direção dominante
  let dx=(IN.r?1:0)-(IN.l?1:0),dy=(IN.d?1:0)-(IN.u?1:0);
  if(dx&&dy)dy=0; // um eixo por vez (clássico)
  const sp=52+p.speedLv*10;
  p.moving=!!(dx||dy);
  if(dx>0)p.dir='R';else if(dx<0)p.dir='L';
  else if(dy>0)p.dir='D';else if(dy<0)p.dir='U';
  const opt={bombKeys:p.standBomb?new Set([p.standBomb]):null};
  moveEntity(p,dx*sp*dt,dy*sp*dt,opt);
  // limpa memória da bomba quando sai da célula dela
  const[pc,pr]=cellOf(p.x,p.y-4);
  if(p.standBomb&&p.standBomb!==key(pc,pr)){
    const[sc,sr]=p.standBomb.split(',').map(Number);
    if(pc!==sc||pr!==sr)p.standBomb=null;}
  if(p.moving){p.animT+=dt*sp/34;p.frame=Math.floor(p.animT)%2+1;}
  else{p.frame=0;p.animT=0;}
  // chuta bombas ao encostar (montaria Dogun / habilidade)
  if(p.kick){
    for(const b of G.bombs){
      if(b.moving||b.carried||b.flying)continue;
      if(Math.abs(b.x-p.x)<12&&Math.abs(b.y-(p.y-6))<12){
        kickBomb(b,dx||((p.dir==='L')?-1:p.dir==='R'?1:0),dy||(p.dir==='U'?-1:p.dir==='D'?1:0));}}}
  // ação A: bomba | segurar B: pegar/arremessar | tap B: soco
  if(IN.aEdge&&!p.carrying)placeBomb(p);
  handleActionB(dt);
  // carregando bomba
  if(p.carrying){p.carrying.x=p.x;p.carrying.y=p.y-24;p.carrying.carried=true;}
  if(p.throwing){
    const t=p.throwing;t.t+=dt/.5;
    const tt=Math.min(1,t.t);
    t.bomb.x=t.x0+(t.x1-t.x0)*tt;
    t.bomb.y=t.y0+(t.y1-t.y0)*tt-Math.sin(tt*Math.PI)*22;
    if(tt>=1){t.bomb.flying=false;t.bomb.c=t.tc;t.bomb.r=t.tr;
      t.bomb.x=cx(t.tc);t.bomb.y=cy(t.tr);p.throwing=null;SFX.place();}}
  // pegar item/montaria
  pickupCheck();
  // entrar na porta
  if(G.door.revealed&&G.door.active&&!p.carrying){
    const dcx=cx(G.door.c)+8,dcy=cy(G.door.r)+10;
    if(dist2(p.x,p.y-4,dcx,dcy)<36)startClear();}
  if(G.clockT>0){} // congelado é tratado fora
}
function handleActionB(dt){
  const p=G.player;
  if(IN.b){
    p.holdT+=dt;
    if(!p.carrying&&p.glove&&p.holdT>.18){
      const[dx,dy]=dirVec(p.dir);
      const tc=Math.floor((p.x-FX)/16)+dx,tr=Math.floor((p.y-FY)/16)+dy;
      const b=bombAt(tc,tr);
      if(b){b.carried=true;p.carrying=b;p.standBomb=null;SFX.punch();}}
  }else{
    if(p.carrying&&p.glove&&p.holdT>.18){ // soltar = arremessar
      throwCarry();
    }else if(IN.bEdge&&p.punch){ // soco
      const[dx,dy]=dirVec(p.dir);
      const tc=Math.floor((p.x-FX)/16)+dx,tr=Math.floor((p.y-FY)/16)+dy;
      const b=bombAt(tc,tr);
      if(b)kickBomb(b,dx,dy,3),SFX.punch();
    }
    p.holdT=0;}
}
function dirVec(d){return d==='L'?[-1,0]:d==='R'?[1,0]:d==='U'?[0,-1]:[0,1];}
function throwCarry(){
  const p=G.player,b=p.carrying;p.carrying=null;
  const[dx,dy]=dirVec(p.dir);
  let tc=Math.floor((p.x-FX)/16),tr=Math.floor((p.y-FY)/16);
  for(let i=0;i<3;i++){
    const nc=tc+dx,nr=tr+dy;
    if(nc<1||nr<1||nc>COLS-2||nr>ROWS-2)break;
    if(G.grid[nr*COLS+nc]!==0||bombAt(nc,nr)||hideoutAt(nc,nr)||cageAt(nc,nr))break;
    tc=nc;tr=nr;}
  b.carried=false;b.flying=true;
  p.throwing={bomb:b,x0:b.x,y0:b.y,x1:cx(tc)+8,y1:cy(tr)+8,tc,tr,t:0};
  SFX.kick();}
function kickBomb(b,dx,dy,maxCells){
  if(!dx&&!dy)return;
  b.moving={dx:dx*130,dy:dy*130,left:maxCells||99};SFX.kick();}
function bombUpdate(dt){
  for(const b of G.bombs){
    if(b.carried)continue;
    b.fuse-=dt;
    if(b.flying)continue;
    if(b.moving){
      const m=b.moving;
      const nx=b.x+m.dx*dt,ny=b.y+m.dy*dt;
      const c=Math.floor((nx-FX)/16),r=Math.floor((ny-FY)/16);
      const blocked=solidCell(c,r)&&!(c===b.c&&r===b.r);
      if(blocked||m.left<=0){b.moving=null;b.c=Math.round((b.x-FX-8)/16);
        b.r=Math.round((b.y-FY-8)/16);b.x=cx(b.c)+8;b.y=cy(b.r)+8;}
      else{b.x=nx;b.y=ny;m.left-=Math.abs(m.dx*dt)/16;
        b.c=c;b.r=r;}
    }
    if(b.fuse<=0&&!b.dead)explode(b);}
  G.bombs=G.bombs.filter(b=>!b.dead);}

/* --------------------------- inimigos ----------------------------- */
function enemyUpdate(e,dt){
  if(e.dead){e.deadT+=dt;return;}
  if(G.clockT>0){e.animT+=dt*.4;return;} // congelado pelo relógio
  e.thinkT-=dt;e.pauseT-=dt;
  const[pc,pr]=[Math.floor((e.x-FX)/16),Math.floor((e.y-FY-4)/16)];
  e.c=pc;e.r=pr;
  const atCenter=Math.abs((e.x-FX)%16-8)<2&&Math.abs((e.y-FY-4)%16-8)<2;
  const pl=G.player;
  let vx=0,vy=0;
  const[dx,dy]=dirVec(e.dir);
  if(e.pauseT>0){vx=vy=0;}
  else{
    if(e.type==='uhho'||e.type==='dogun'){
      // persegue se alinhado
      const aligned=Math.abs(pl.y-e.y)<6||Math.abs(pl.x-e.x)<6;
      const see=lineClear(e.x,e.y,pl.x,pl.y);
      if(aligned&&see&&e.thinkT<=0){
        e.dir=Math.abs(pl.y-e.y)<6?(pl.x>e.x?'R':'L'):(pl.y>e.y?'D':'U');}
      const spd=(aligned&&see)?e.chase:e.speed;
      [vx,vy]=dirVec(e.dir).map(v=>v*spd);
      if(atCenter&&e.thinkT<=0){e.thinkT=rnd(2,4);
        if(Math.random()<.3)e.pauseT=.9;}
    }else if(e.type==='omajin'){
      if(atCenter&&e.thinkT<=0){
        e.thinkT=rnd(1.5,3);
        const toPl=Math.random()<.55;
        const opts=[];
        for(const d of[['R',1,0],['L',-1,0],['D',0,1],['U',0,-1]])
          if(!solidCell(pc+d[1],pr+d[2]))opts.push(d);
        if(opts.length){
          let pick;
          if(toPl){
            pick=opts.find(o=>o[1]===Math.sign(pl.x-e.x)&&o[1]!==0)||
                 opts.find(o=>o[2]===Math.sign(pl.y-e.y)&&o[2]!==0);}
          if(!pick)pick=opts[(Math.random()*opts.length)|0];
          e.dir=pick[0];}
        if(Math.random()<.18)e.pauseT=1;}
      [vx,vy]=dirVec(e.dir).map(v=>v*e.speed);
    }else{ // trike: segue reto até bater
      [vx,vy]=dirVec(e.dir).map(v=>v*e.speed);
      if(atCenter&&e.thinkT<=0){
        const nx=pc+dx,ny=pr+dy;
        if(solidCell(nx,ny)){
          e.thinkT=.2;
          const opts=[];
          for(const d of[['R',1,0],['L',-1,0],['D',0,1],['U',0,-1]])
            if(!solidCell(pc+d[1],pr+d[2]))opts.push(d);
          if(opts.length)e.dir=opts[(Math.random()*opts.length)|0][0];}}
    }}
  // Dogun Jr.: se há bomba na linha, vai até ela e chuta
  if(e.type==='dogun'){
    for(const b of G.bombs){
      if(b.moving||b.carried||b.flying)continue;
      if(Math.abs(b.y-(e.y-6))<8){
        const dir=b.x>e.x?1:-1;
        if(lineClear(e.x,e.y-6,b.x-dir*12,b.y)){
          e.dir=dir>0?'R':'L';vx=dir*e.chase;vy=0;
          if(Math.abs(b.x-e.x)<24){kickAway(b,dir,0);}}}
      else if(Math.abs(b.x-e.x)<8){
        const dir=b.y>e.y?1:-1;
        if(lineClear(e.x,e.y-6,b.x,b.y-dir*12)){
          e.dir=dir>0?'D':'U';vy=dir*e.chase;vx=0;
          if(Math.abs(b.y-6-e.y)<24){kickAway(b,0,dir);}}}}}
  const moved=moveEntity(e,vx*dt,vy*dt);
  if(!moved&&(vx||vy)){ // bateu: escolhe outra direção
    const opts=[];
    for(const d of[['R',1,0],['L',-1,0],['D',0,1],['U',0,-1]])
      if(!solidCell(Math.floor((e.x-FX)/16)+d[1],Math.floor((e.y-FY-4)/16)+d[2]))opts.push(d);
    if(opts.length)e.dir=opts[(Math.random()*opts.length)|0][0];}
  e.animT+=dt*3;
  // encostou no jogador
  const pb=hitbox(G.player),eb=hitbox(e);
  if(!G.player.dead&&pb.x<eb.x+eb.w&&pb.x+pb.w>eb.x&&pb.y<eb.y+eb.h&&pb.y+pb.h>eb.y)
    hurtPlayer();}
function kickAway(b,dx,dy){
  if(b.moving)return;
  b.moving={dx:dx*130,dy:dy*130,left:99};
  SFX.kick();floatTxt(b.x,b.y-12,'CHUTE!','#fa0');}
function lineClear(x0,y0,x1,y1){
  const steps=Math.ceil(dist2(x0,y0,x1,y1)**.5/8);
  for(let i=1;i<steps;i++){
    const x=x0+(x1-x0)*i/steps,y=y0+(y1-y0)*i/steps;
    const c=Math.floor((x-FX)/16),r=Math.floor((y-FY)/16);
    const v=G.grid[r*COLS+c];
    if(v===1||v===2)return false;
    if(bombAt(c,r))return false;}
  return true;}

/* -------------------- montarias / itens / rochas ------------------- */
function pickupCheck(){
  const p=G.player;
  for(const eg of G.eggs){
    if(eg.taken)continue;
    if(dist2(p.x,p.y-6,cx(eg.c)+8,cy(eg.r)+8)<100){
      eg.taken=true;p.mount=eg.kind;SFX.mount();
      if(eg.kind==='trike')p.pierce=true; else p.kick=true;
      floatTxt(p.x,p.y-20,eg.kind==='trike'?'PERFURANTE!':'CHUTE!','#8f5');
      for(let i=0;i<8;i++)part(p.x,p.y-10,rnd(-50,50),rnd(-90,-20),'#fff',.5);}}
  G.eggs=G.eggs.filter(e=>!e.taken);
  for(const it of G.items){
    if(it.taken)continue;
    if(dist2(p.x,p.y-6,cx(it.c)+8,cy(it.r)+8)<110){
      it.taken=true;applyItem(it.item);}}
  G.items=G.items.filter(i=>!i.taken);}
function applyItem(t){
  const p=G.player;SFX.item();
  sparkles(cx(Math.floor((p.x-FX)/16))+8,cy(Math.floor((p.y-FY)/16))+8);
  if(t==='bombup'&&p.bombsMax<8){p.bombsMax++;floatTxt(p.x,p.y-20,'BOMBA +1','#fff');}
  else if(t==='fire'&&p.fire<8){p.fire++;floatTxt(p.x,p.y-20,'FOGO +1','#f80');}
  else if(t==='speed'&&p.speedLv<5){p.speedLv++;floatTxt(p.x,p.y-20,'TURBO +1','#5af');}
  else if(t==='time'){G.clockT=8;floatTxt(p.x,p.y-20,'TEMPO PARADO!','#ff0');}
  else if(t==='glove'){p.glove=true;floatTxt(p.x,p.y-20,'PEGAR BOMBAS!','#48f');}
  else if(t==='punch'){p.punch=true;floatTxt(p.x,p.y-20,'SOCO BOMBA!','#f44');}
  else if(t==='pierce'){p.pierce=true;floatTxt(p.x,p.y-20,'PERFURANTE!','#adf');}
  else if(t==='heart'){p.shield=true;floatTxt(p.x,p.y-20,'ESCUDO!','#f66');}
  else if(t==='cake'){G.score+=500;floatTxt(p.x,p.y-20,'500','#fd6');}
  G.score+=0;}
function rocksUpdate(dt){
  const def=STAGE_DEFS[G.areaIdx];
  if(!def.rocks)return;
  G.rockTimer=(G.rockTimer??rnd(3,6))-dt;
  if(G.rockTimer<=0){G.rockTimer=rnd(4.5,8);
    for(let tries=0;tries<12;tries++){
      const c=irnd(1,COLS-2),r=irnd(1,ROWS-2);
      if(c%2===0&&r%2===0)continue;
      if(G.grid[r*COLS+c]===1)continue;
      const[pc,pr]=cellOf(G.player.x,G.player.y-4);
      if(Math.abs(pc-c)+Math.abs(pr-r)<2)continue;
      G.rocks.push({c,r,x:cx(c)+8,y:cy(r)+8,phase:'warn',t:.85});
      SFX.warn();break;}}
  for(const k of G.rocks){
    if(k.phase==='warn'){k.t-=dt;if(k.t<=0){k.phase='fall';k.t=.32;}}
    else if(k.phase==='fall'){k.t-=dt;
      if(k.t<=0){k.phase='done';landRock(k);}}
  }
  G.rocks=G.rocks.filter(k=>k.phase!=='done');}
function landRock(k){
  SFX.rock();G.shake=4;dust(k.x,k.y+6);
  const c=k.c,r=k.r,v=G.grid[r*COLS+c];
  if(v===2)burnSoft(c,r);
  const pl=G.player;
  if(!pl.dead&&pl.invuln<=0){
    const[pc,pr]=cellOf(pl.x,pl.y-4);
    if(pc===c&&pr===r)hurtPlayer();}
  for(const e of G.enemies){
    if(e.dead)continue;
    const[ec,er]=cellOf(e.x,e.y-4);
    if(ec===c&&er===r){killEnemy(e);G.score+=0;}}}

/* ------------------------- partículas / texto ---------------------- */
function part(x,y,vx,vy,col,t){G.parts.push({x,y,vx,vy,col,t,life:t});}
function puff(x,y,col,n){for(let i=0;i<n;i++)
  part(x,y,rnd(-40,40),rnd(-70,-10),col,rnd(.3,.6));}
function dust(x,y){for(let i=0;i<8;i++)
  part(x+rnd(-6,6),y,rnd(-30,30),rnd(-50,-10),'#c9b18a',rnd(.3,.5));}
function sparkles(x,y){for(let i=0;i<8;i++){
  const a=i/8*Math.PI*2;
  part(x,y,Math.cos(a)*46,Math.sin(a)*46,['#fff','#ff0','#8f8'][i%3],.4);}}
function floatTxt(x,y,s,col){G.floaters.push({x,y,s,col,t:1});}
function partsUpdate(dt){
  for(const p of G.parts){
    if(p.friend){p.t-=dt;p.y-=14*dt;if(p.t<=0)p.dead=true;continue;}
    p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=160*dt;
    if(p.t<=0)p.dead=true;}
  G.parts=G.parts.filter(p=>!p.dead);
  for(const f of G.floaters){f.t-=dt;f.y-=16*dt;}
  G.floaters=G.floaters.filter(f=>f.t>0);}

/* ======================== FLUXO DE ESTADOS ========================= */
function startClear(){
  if(G.st!=='play')return;
  const p=G.player;
  G.carry={bombsMax:p.bombsMax,fire:p.fire,speedLv:p.speedLv,glove:p.glove,
    punch:p.punch,pierce:p.pierce,kick:p.kick,shield:p.shield,mount:p.mount};
  G.st='clear';G.bannerT=0;G.clearBonus=G.timeLeft*5|0;musicStop();SFX.clearJ();}
function afterDeath(){
  G.lives--;G.carry=null; // morreu: perde os power-ups
  if(G.lives<0){G.st='over';G.overT=0;if(G.score>G.hi){G.hi=G.score;localStorage.setItem('sb4hi',G.hi);}}
  else{beginArea(G.areaIdx);}}
function beginArea(i,carry){
  G.areaIdx=i;buildStage(i,carry);G.st='intro';G.introT=0;G.reason='';}
function startPlay(){
  G.st='play';musicStart();}
function irisTo(fn){
  G.trans={t:0,mid:fn,done:false};}

/* --------------------------- atualizar ---------------------------- */
function update(dt){
  musicTick();
  if(G.trans){
    G.trans.t+=dt*2.2;
    if(G.trans.t>=1&&!G.trans.done){G.trans.done=true;G.trans.mid();}
    if(G.trans.t>=2)G.trans=null;
    return;}
  if(G.st==='title'){G.titleT+=dt;
    if(IN.lEdge){G.titleSel=(G.titleSel+STAGE_DEFS.length-1)%STAGE_DEFS.length;SFX.tick();}
    if(IN.rEdge){G.titleSel=(G.titleSel+1)%STAGE_DEFS.length;SFX.tick();}
    if(IN.startEdge){SFX.start();G.carry=null;irisTo(()=>beginArea(G.titleSel));}return;}
  if(G.st==='intro'){G.introT+=dt;if(G.introT>1.5||IN.startEdge&&G.introT>.4)startPlay();return;}
  if(G.st==='over'){G.overT+=dt;if(IN.startEdge){SFX.start();irisTo(()=>{G.st='title';G.titleT=0;G.lives=3;G.score=0;G.carry=null;});}return;}
  if(G.st==='end'){G.endT+=dt;if(IN.startEdge)irisTo(()=>{G.st='title';G.titleT=0;G.lives=3;G.score=0;G.carry=null;});return;}
  if(G.st==='clear'){
    G.bannerT+=dt;partsUpdate(dt);
    G.bonusShow=Math.min(G.clearBonus,Math.floor(G.bannerT*300));
    if(G.bannerT>2.4){
      if(G.areaIdx>=STAGE_DEFS.length-1){irisTo(()=>{G.st='end';G.endT=0;
        if(G.score>G.hi){G.hi=G.score;localStorage.setItem('sb4hi',G.hi);}});}
      else irisTo(()=>beginArea(G.areaIdx+1,G.carry));}
    return;}
  /* ---- play ---- */
  if(IN.startEdge){G.paused=!G.paused;SFX.pause();}
  if(G.paused)return;
  G.stageT+=dt;
  if(G.clockT>0){G.clockT-=dt;}else{G.timeLeft-=dt;}
  if(G.timeLeft<=10&&G.timeLeft>0){
    G.tickT=(G.tickT??0)-dt;if(G.tickT<=0){G.tickT=1;SFX.tick();}}
  if(G.timeLeft<=0&&!G.player.dead){G.reason='TIME UP!';killPlayer();}
  playerUpdate(dt);
  if(G.clockT<=0){
    for(const e of G.enemies)enemyUpdate(e,dt);
    // abrigos geram uhho
    for(const h of G.hideouts){
      if(h.dead)continue;h.flash=Math.max(0,(h.flash||0)-dt);
      const mine=G.enemies.filter(e=>!e.dead&&e.type==='uhho').length;
      if(mine<G.initUhho){h.spawnT-=dt;
        if(h.spawnT<=0){h.spawnT=6;
          const spot=freeSpotAround(h.c,h.r);
          if(spot)spawnEnemy('uhho',spot[0],spot[1]);}}}
  }else for(const e of G.enemies)if(e.dead)e.deadT+=dt;
  // doguns mortos viram montaria
  bombUpdate(dt);
  updateFlames(dt);
  rocksUpdate(dt);
  partsUpdate(dt);
  G.shake=Math.max(0,G.shake-dt*20);
  // fim: todos mortos?
  updateDoorState();}
function freeSpotAround(c,r){
  for(const[dx,dy]of[[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]){
    const nc=c+dx,nr=r+dy;
    if(nc<1||nr<1||nc>COLS-2||nr>ROWS-2)continue;
    if(G.grid[nr*COLS+nc]===0&&!bombAt(nc,nr)&&!cageAt(nc,nr))return[nc,nr];}
  return null;}

/* ============================== RENDER ============================= */
function drawShadow(g,x,y,w){g.fillStyle='rgba(0,0,0,.25)';
  g.beginPath();g.ellipse(x,y,w,w*.4,0,0,7);g.fill();}

function drawScenery(){ // faixas de cenário fora do campo (8px sup/inf)
  const outdoor=STAGE_DEFS[G.areaIdx].outdoor;
  const top=HUD_H,bot=FY+ROWS*TILE;
  if(outdoor){ // água, montanhas e franja de grama
    ctx.fillStyle='#4888d0';ctx.fillRect(0,top,W,FY-top);ctx.fillRect(0,bot,W,H-bot);
    const r=mulberry(9);ctx.fillStyle='#88b8f0';
    for(let i=0;i<12;i++){const x=(r()*W)|0,y=top+1+(r()*(FY-top-2))|0;ctx.fillRect(x,y,3,1);}
    for(let i=0;i<8;i++){const x=(r()*W)|0,y=bot+1+(r()*(H-bot-2))|0;ctx.fillRect(x,y,3,1);}
    ctx.fillStyle='#7a90b0';
    for(const mx of[24,72,128,184,232]){
      ctx.beginPath();ctx.moveTo(mx-8,FY);ctx.lineTo(mx,FY-5);ctx.lineTo(mx+8,FY);ctx.fill();}
    ctx.fillStyle='#4ca030';ctx.fillRect(0,FY-2,W,2);ctx.fillRect(0,bot,W,2);
    ctx.fillStyle='#64bc44';
    for(const gx of[16,52,90,130,170,210,244]){ctx.fillRect(gx,FY-3,2,1);ctx.fillRect(gx+7,bot+2,2,1);}
  }else{ // caverna: pedra escura
    ctx.fillStyle='#241c2e';ctx.fillRect(0,top,W,FY-top);ctx.fillRect(0,bot,W,H-bot);
    const r=mulberry(9);ctx.fillStyle='#322844';
    for(let i=0;i<16;i++){const x=(r()*W)|0;
      ctx.fillRect(x,top+(r()*(FY-top))|0,2,1);ctx.fillRect(x,bot+(r()*(H-bot))|0,2,1);}
    ctx.fillStyle='#3a3048';
    for(const sx of[20,80,140,200,246]){ctx.fillRect(sx,FY-2,4,2);ctx.fillRect(sx+9,bot,4,2);}
  }
}
function renderField(){
  const th=THEMES[STAGE_DEFS[G.areaIdx].outdoor?'out':'cave'];
  ctx.save();
  if(G.shake>0)ctx.translate(irnd(-1,1),irnd(-1,1));
  drawScenery();
  // piso
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)
    ctx.drawImage(th.floor[(c+r)&1],cx(c),cy(r));
  // laterais: rocha da borda sangrando até as margens
  for(let r=0;r<ROWS;r++){
    ctx.drawImage(th.hard,FX-16,cy(r));
    ctx.drawImage(th.hard,FX+COLS*TILE,cy(r));}
  // porta
  if(G.door.revealed){
    ctx.drawImage(DOOR_TILE,cx(G.door.c),cy(G.door.r));
    if(G.door.active){
      const t=G.stageT*6;
      ctx.globalAlpha=.75+.25*Math.sin(t);
      ctx.strokeStyle='#ffe040';ctx.lineWidth=1;
      ctx.strokeRect(cx(G.door.c)+2.5,cy(G.door.r)+2.5,11,11);
      ctx.globalAlpha=1;
      for(let i=0;i<2;i++){
        const a=t+i*Math.PI;
        ctx.fillStyle='#fff';
        ctx.fillRect(cx(G.door.c)+8+Math.cos(a)*6,cy(G.door.r)+8+Math.sin(a)*6,1.6,1.6);}}}
  // itens
  for(const it of G.items){
    const bob=Math.sin(G.stageT*5+it.c)*1.2;
    drawShadow(ctx,cx(it.c)+8,cy(it.r)+14,5);
    ctx.drawImage(ITEMS[it.item],cx(it.c),cy(it.r)-1+bob);
    if(G.stageT*3%1<.5){ctx.fillStyle='#fff';
      ctx.fillRect(cx(it.c)+12+((G.stageT*8)|0)%3,cy(it.r)+2-bob,1,1);}}
  // montarias no chão
  for(const eg of G.eggs){
    drawShadow(ctx,cx(eg.c)+8,cy(eg.r)+14,5);
    ctx.drawImage(ITEMS.egg,cx(eg.c)+3,cy(eg.r)+2+Math.sin(G.stageT*5)*1);}
  // blocos
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const v=G.grid[r*COLS+c];
    if(v===1)ctx.drawImage(th.hard,cx(c),cy(r));
    else if(v===2)ctx.drawImage(th.soft,cx(c),cy(r));}
  // gaiolas
  for(const k of G.cages){
    if(k.dead)continue;
    drawShadow(ctx,cx(k.c)+8,cy(k.r)+14,6);
    // amiguinho dentro
    ctx.save();ctx.beginPath();ctx.rect(cx(k.c)+2,cy(k.r)+2,12,13);ctx.clip();
    const bob=Math.sin(G.stageT*4+k.c)*.8;
    ctx.drawImage(FR.D[Math.floor(G.stageT*4)%2+1],cx(k.c)+3,cy(k.r)+3+bob,10,13);
    ctx.restore();
    ctx.drawImage(CAGE_C,cx(k.c),cy(k.r));}
  // abrigos (plataforma do chefe com tochas animadas)
  for(const h of G.hideouts){
    if(h.dead){ctx.fillStyle='#3a3630';
      ctx.fillRect(cx(h.c)+3,cy(h.r)+10,10,4);continue;}
    if(h.flash>0&&(h.flash*30|0)%2){ctx.globalAlpha=.6;}
    ctx.drawImage(HIDEOUT_FR[(G.stageT*8|0)%2],cx(h.c)-1,cy(h.r)-1);
    ctx.globalAlpha=1;
    // rachaduras conforme dano
    const dmg=1-h.hp/h.max;
    if(dmg>0){ctx.strokeStyle='#1c2028';ctx.lineWidth=1;ctx.beginPath();
      ctx.moveTo(cx(h.c)+5,cy(h.r)+4);ctx.lineTo(cx(h.c)+7,cy(h.r)+7);
      if(dmg>.4){ctx.lineTo(cx(h.c)+6,cy(h.r)+10);}
      if(dmg>.7){ctx.moveTo(cx(h.c)+12,cy(h.r)+5);ctx.lineTo(cx(h.c)+10,cy(h.r)+9);}ctx.stroke();}}
  // bombas
  for(const b of G.bombs){
    if(b.carried)continue;
    const pulse=1+.14*Math.sin(G.stageT*10+(b.x*3|0));
    const danger=b.fuse<.6;
    const img=danger?(b.pierce?BOMB_RS:BOMB_R):(b.pierce?BOMB_S:BOMB_C);
    const s=16*pulse;
    drawShadow(ctx,b.x,b.y+7,5);
    ctx.drawImage(img,b.x-s/2,b.y-s/2,s,s);
    // faísca no pavio
    ctx.fillStyle=(G.stageT*10|0)%2?'#fff':'#ffd23e';
    ctx.fillRect(b.x+3,b.y-s/2-.5,1.5,1.5);}
  // inimigos
  for(const e of G.enemies){
    if(e.dead&&e.deadT>.5)continue;
    ctx.save();
    if(e.dead){const k=e.deadT/.5;
      ctx.globalAlpha=1-k;ctx.translate(e.x,e.y);ctx.scale(1-k*.5,1-k*.5);ctx.translate(-e.x,-e.y);}
    if(e.dead&&e.type==='uhho'){ // voa pra fora
      ctx.translate(e.deadT*-160,e.deadT*-90);ctx.rotate(e.deadT*9);}
    const fr=ENEMY_FR[e.type][(e.animT|0)%2];
    const wob=e.pauseT>0&&e.type==='omajin'?(e.animT*8|0)%2?1:0:0;
    const img=wob?ENEMY_FR.omajin[1]:fr;
    drawShadow(ctx,e.x,e.y,6);
    ctx.drawImage(img,e.x-img.width/2+1,e.y-img.height+1);
    ctx.restore();}
  // jogador
  const p=G.player;
  if(!(p.dead&&p.deadT>1.2)){
    ctx.save();
    if(p.dead){ctx.translate(p.x,p.y-8);ctx.rotate(p.rot);ctx.translate(-p.x,-(p.y-8));
      ctx.globalAlpha=p.deadT>1?.2:1;}
    else{
      if(p.invuln>0&&(p.invuln*12|0)%2)ctx.globalAlpha=.35;
      if(p.shield){ctx.strokeStyle='rgba(255,80,110,.8)';ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(p.x,p.y-8,11+Math.sin(G.stageT*6),0,7);ctx.stroke();}}
    if(p.mount==='trike'){
      drawShadow(ctx,p.x,p.y+2,7);
      const tf=MOUNT_FR[p.moving?(G.stageT*8|0)%2:0];
      ctx.drawImage(tf,p.x-tf.width/2,p.y-tf.height+2);
      ctx.drawImage(FR[p.dir][p.frame],p.x-8,p.y-24);}
    else{
      drawShadow(ctx,p.x,p.y+2,6);
      ctx.drawImage(FR[p.dir][p.frame],p.x-8,p.y-18);}
    ctx.restore();
    if(p.carrying){
      ctx.drawImage(p.carrying.pierce?BOMB_S:BOMB_C,p.x-8,p.y-34);}}
  // chamas
  for(const f of G.flames){
    const ph=f.t/.45,idx=ph>.7?0:ph>.35?1:2;
    ctx.drawImage(FLAMES[f.k][idx],cx(f.c),cy(f.r));}
  // rochas caindo
  for(const k of G.rocks){
    if(k.phase==='warn'){
      if((k.t*10|0)%2){ctx.strokeStyle='#ff4040';ctx.lineWidth=1;
        ctx.strokeRect(cx(k.c)+3.5,cy(k.r)+3.5,9,9);
        ctx.fillStyle='#ff4040';
        ctx.fillRect(cx(k.c)+7,cy(k.r)+7,2,2);}}
    else{const pr=1-k.t/.32;
      drawShadow(ctx,k.x,k.y+6,3+4*pr);
      const s=4+10*pr;
      ctx.drawImage(ROCK_C,k.x-s/2+7,k.y-s-6+s*.2,s,s);}}
  // partículas
  for(const q of G.parts){
    if(q.friend){
      ctx.save();ctx.globalAlpha=Math.min(1,q.t);
      const img=q.col==='red'?FR.D[1]:q.col==='blue'?FR.U[1]:FR.R[1];
      ctx.drawImage(img,q.x-8,q.y-19+Math.sin(q.t*10)*2);ctx.restore();continue;}
    ctx.globalAlpha=clamp(q.t/q.life,0,1);ctx.fillStyle=q.col;
    ctx.fillRect(q.x,q.y,q.t>.3?2:1,q.t>.3?2:1);}
  ctx.globalAlpha=1;
  // textos flutuantes
  for(const f of G.floaters){
    ctx.globalAlpha=clamp(f.t*2,0,1);
    txt(ctx,f.s,f.x,f.y-8,{align:'center',color:f.col,shadow:'#000'});
    ctx.globalAlpha=1;}
  ctx.restore();}

/* -------------------------------- HUD ------------------------------ */
const HEART_C=(()=>{const c=mkC(10,9),g=c.getContext('2d');
  g.fillStyle='#e82040';
  g.beginPath();g.arc(3,3,2.7,0,7);g.arc(7,3,2.7,0,7);g.fill();
  g.beginPath();g.moveTo(.5,4.6);g.lineTo(5,8.8);g.lineTo(9.5,4.6);g.closePath();g.fill();
  g.fillStyle='#ff90a0';g.fillRect(2,2,1.6,1.6);return c;})();
const MINI_BOMB=(()=>{const c=mkC(10,10),g=c.getContext('2d');
  ell(g,5,6.2,4,3.6,'#141a26');ell(g,5,6.2,3.2,2.9,'#232c3e');
  g.fillStyle='#d8e2ec';g.fillRect(2.4,3.4,1.6,1.6);g.fillRect(1.8,4.8,1.2,1.2);
  rc(g,4,1.4,2,2,'#1a1e2a');g.fillStyle='#3c4656';g.fillRect(5.8,.4,1.4,1.4);return c;})();
function renderHUD(){
  // barra verde clássica
  ctx.fillStyle='#007000';ctx.fillRect(0,0,W,HUD_H);
  ctx.fillStyle='#289028';ctx.fillRect(0,0,W,1);ctx.fillRect(0,HUD_H-1,W,1);
  ctx.fillStyle='#004800';ctx.fillRect(0,1,W,1);ctx.fillRect(0,HUD_H-2,W,1);
  // vidas: coração + número
  txt(ctx,'RESTO',5,3,{color:'#a8e0a8'});
  ctx.drawImage(HEART_C,5,15);
  txt(ctx,String(Math.max(0,G.lives)),17,13,{scale:2,color:'#fff',shadow:'#003800'});
  ctx.drawImage(MINI_BOMB,32,14);
  // score em pílula preta com borda dourada
  txt(ctx,'PONTOS',49,3,{color:'#a8e0a8'});
  ctx.fillStyle='#101010';ctx.fillRect(49,11,86,18);
  ctx.strokeStyle='#ffd23e';ctx.strokeRect(49.5,11.5,85,17);
  txt(ctx,String(G.score).padStart(7,'0'),92,15,{scale:2,align:'center',color:'#fff'});
  // tempo
  txt(ctx,G.clockT>0?'PARALISIA '+Math.ceil(G.clockT):'TEMPO',150,3,{color:'#a8e0a8'});
  const t=Math.max(0,Math.ceil(G.timeLeft)),mm=Math.floor(t/60),ss=t%60;
  const flash=t<=10&&(t*2|0)%2;
  txt(ctx,mm+':'+String(ss).padStart(2,'0'),150,11,{scale:2,
    color:flash?'#fff':t<=10?'#ff4020':'#fff',shadow:'#003800'});
  // direita: área atual
  txt(ctx,'AREA '+STAGE_DEFS[G.areaIdx].area,W-5,25,{align:'right',color:'#ffe040'});
}

/* ------------------------------ telas ------------------------------ */
function starBG(g,t){
  g.fillStyle='#0a0a18';g.fillRect(0,0,W,H);
  const r=mulberry(7);
  for(let i=0;i<40;i++){const x=(r()*W)|0,y=(r()*120)|0;
    g.fillStyle=(i+((t*2|0)))%7?'#3a3a5a':'#c8c8e8';
    g.fillRect(x,y,1,1);}}
function renderTitle(){
  const g=ctx,t=G.titleT;
  // céu do amanhecer pré-histórico
  const gr=g.createLinearGradient(0,0,0,H);
  gr.addColorStop(0,'#2a1848');gr.addColorStop(.45,'#7a3060');
  gr.addColorStop(.7,'#d86030');gr.addColorStop(1,'#f8a040');
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  // sol
  g.fillStyle='#ffd854';g.beginPath();g.arc(W/2,150,26,0,7);g.fill();
  g.fillStyle='#fff0b0';g.beginPath();g.arc(W/2,150,20,0,7);g.fill();
  // estrelas
  const r=mulberry(3);g.fillStyle='#e8d8ff';
  for(let i=0;i<26;i++){const x=(r()*W)|0,y=(r()*90)|0;
    if(((t*2|0)+i)%9)g.fillRect(x,y,1,1);}
  // vulcão
  g.fillStyle='#241430';
  g.beginPath();g.moveTo(30,168);g.lineTo(80,96);g.lineTo(112,108);g.lineTo(140,168);g.fill();
  g.fillStyle='#48203a';
  g.beginPath();g.moveTo(80,96);g.lineTo(92,100);g.lineTo(84,106);g.closePath();g.fill();
  // lava pulsando
  g.fillStyle=`rgba(255,${120+40*Math.sin(t*3)|0},40,.9)`;
  g.beginPath();g.arc(84,94+Math.sin(t*2)*1.5,3.4,0,7);g.fill();
  for(let i=0;i<3;i++){const ph=(t*.7+i*.33)%1;
    g.globalAlpha=1-ph;g.fillRect(82+Math.sin(i*9+t)*4,92-ph*30,2,2);}
  g.globalAlpha=1;
  // montanhas
  g.fillStyle='#1a1028';
  g.beginPath();g.moveTo(120,168);g.lineTo(180,116);g.lineTo(256,168);g.fill();
  g.beginPath();g.moveTo(0,168);g.lineTo(50,128);g.lineTo(96,168);g.fill();
  // árvores mortas
  g.fillStyle='#140c1e';
  for(const[x,s]of[[16,1],[210,1.3],[238,.8]]){
    g.fillRect(x,168-26*s,3*s,26*s);
    g.fillRect(x-5*s,168-20*s,6*s,2*s);g.fillRect(x+3*s,168-23*s,6*s,2*s);}
  // chão
  g.fillStyle='#301c30';g.fillRect(0,168,W,56);
  g.fillStyle='#241228';for(let i=0;i<W;i+=8)g.fillRect(i,172,4,2);
  // logo
  const ly=34+Math.sin(t*1.4)*2;
  txt(g,'SUPER',W/2,ly-14,{scale:2,align:'center',color:'#ffe040',shadow:'#802000'});
  txt(g,'BOMBERMAN',W/2,ly+6,{scale:3,align:'center',color:'#ffd23e',shadow:'#a02800'});
  txt(g,'BOMBERMAN',W/2,ly+5,{scale:3,align:'center',color:'#ff8828'});
  // número 4
  const fy=ly+8+Math.sin(t*2.4)*3;
  txt(g,'4',218,fy,{scale:6,color:'#ff4020',shadow:'#600'});
  txt(g,'4',216,fy-2,{scale:6,color:'#ff7838'});
  txt(g,'ERA PRIMITIVA',W/2,ly+34,{scale:1,align:'center',color:'#8ce8ff',shadow:'#123'});
  // bomberman andando + trikeratops perseguindo
  const wx=(t*36)%(W+60)-30;
  const wf=(t*8|0)%2, bf=wf+1;
  g.drawImage(MOUNT_FR[wf],wx-34,H-46+Math.sin(t*8)*.8);
  g.drawImage(FR.L[bf],wx-8,H-52+Math.sin(t*8)*.8);
  // prompt + seletor de área
  const sel=STAGE_DEFS[G.titleSel];
  txt(g,'< AREA '+sel.area+' >',W/2,188,{scale:2,align:'center',
    color:((t*3|0)%2)?'#ffd23e':'#fff',shadow:'#000'});
  if((t*1.6|0)%2)txt(g,'ENTER PARA JOGAR',W/2,207,{align:'center',color:'#fff',shadow:'#000'});
  txt(g,'FAN REMAKE - HTML5 - 2026',W/2,216,{align:'center',color:'#6a5880'});
  if(G.hi)txt(g,'RECORDE '+G.hi,W/2,174,{align:'center',color:'#ffd23e',shadow:'#000'});}
function renderIntro(){
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  const t=G.introT,sl=Math.min(1,t*2.5);
  txt(ctx,'MUNDO 1',W/2,74,{align:'center',scale:2,color:'#8ce8ff'});
  txt(ctx,'ERA PRIMITIVA',W/2,96,{align:'center',color:'#7cb84c'});
  if(t>.5){
    ctx.globalAlpha=Math.min(1,(t-.5)*3);
    txt(ctx,'AREA '+STAGE_DEFS[G.areaIdx].area,W/2,124,{align:'center',scale:3,color:'#fff',shadow:'#456'});
    ctx.globalAlpha=1;}
  if(t>.9)txt(ctx,'DERROTE TODOS OS INIMIGOS!',W/2,158,{align:'center',color:'#8892a8'});}
function renderClear(){
  renderField();renderHUD();
  const t=G.bannerT;
  ctx.fillStyle='rgba(0,0,20,.72)';ctx.fillRect(0,80,W,64);
  ctx.strokeStyle='#ffd23e';ctx.strokeRect(4.5,84.5,W-9,55);
  txt(ctx,'AREA '+STAGE_DEFS[G.areaIdx].area+' CONCLUIDA!',W/2,94,{align:'center',scale:2,color:'#ffd23e',shadow:'#530'});
  txt(ctx,'BONUS '+String(G.bonusShow).padStart(5,'0'),W/2,118,{align:'center',color:'#fff'});
  if(t>1.4&&G.areaIdx>=STAGE_DEFS.length-1)
    txt(ctx,'PREPARE-SE...',W/2,132,{align:'center',color:'#8ce8ff'});}
function renderOver(){
  ctx.fillStyle='#100408';ctx.fillRect(0,0,W,H);
  const t=G.overT;
  for(let i=0;i<20;i++){const r=mulberry(i)();
    ctx.fillStyle='rgba(120,10,20,'+(.1+.08*Math.sin(t*2+i))+')';
    ctx.fillRect(0,i*12,W,8);}
  txt(ctx,'GAME OVER',W/2,84,{align:'center',scale:3,color:'#f84020',shadow:'#400'});
  txt(ctx,'PONTOS '+G.score,W/2,120,{align:'center',color:'#fff'});
  txt(ctx,'RECORDE '+G.hi,W/2,132,{align:'center',color:'#ffd23e'});
  if(t>1&&(t*1.6|0)%2)txt(ctx,'PRESSIONE ENTER',W/2,164,{align:'center',color:'#fff',shadow:'#000'});}
function tintFrame(c,col,a){const n=mkC(c.width,c.height),g=n.getContext('2d');
  g.drawImage(c,0,0);g.globalCompositeOperation='source-atop';
  g.globalAlpha=a;g.fillStyle=col;g.fillRect(0,0,n.width,n.height);
  return n;}
const TINT={
 red:FR.D.map(c=>tintFrame(c,'#ff4040',.5)),
 blue:FR.L.map(c=>tintFrame(c,'#4068ff',.5)),
 green:FR.R.map(c=>tintFrame(c,'#40c050',.5))};
function renderEnd(){
  const g=ctx,t=G.endT;
  starBG(g,t);
  // chão caverna
  g.fillStyle='#2c2438';g.fillRect(0,140,W,84);
  g.fillStyle='#241c30';for(let i=0;i<W;i+=10)g.fillRect(i,146,5,2);
  // fogueira
  const fx=W/2,fy=150;
  g.fillStyle='#5c4020';g.fillRect(fx-9,fy+4,18,3);g.fillRect(fx-7,fy+1,14,3);
  for(let i=0;i<3;i++){
    const fl=Math.sin(t*7+i*2.1)*2;
    g.fillStyle=['#ef5810','#fb9000','#ffe040'][i];
    g.beginPath();g.moveTo(fx-7+i*4,fy);
    g.quadraticCurveTo(fx-6+i*4+fl,fy-8-i*3,fx-4+i*4,fy);
    g.fill();}
  if(t%.4<.2)part(fx+rnd(-3,3),fy-8,rnd(-6,6),-24,'#ffb040',.5);
  // amigos libertados + herói dançando
  const dancers=[[TINT.red,-34],[TINT.blue,-17],[TINT.green,17],[FR.R,34]];
  dancers.forEach(([frames,off],i)=>{
    const hop=Math.abs(Math.sin(t*4+i))*3;
    g.drawImage(frames[(t*6|0+i)%2+1],fx+off-8,fy-14-hop);});
  // confete
  const r=mulberry(5);
  for(let i=0;i<30;i++){
    const x=(r()*W+t*14*(0.5+r()))%W,y=(r()*H+t*22)%H;
    g.fillStyle=['#ff5050','#ffd23e','#50c8ff','#70e070'][i%4];
    g.fillRect(x,y,2,2);}
  txt(g,'PARABENS!',W/2,26,{align:'center',scale:3,color:'#ffd23e',shadow:'#830'});
  txt(g,'VOCE LIMPOU A ERA PRIMITIVA!',W/2,54,{align:'center',color:'#fff',shadow:'#000'});
  txt(g,'PONTOS '+G.score,W/2,68,{align:'center',color:'#8ce8ff'});
  if((t|0)%2)txt(g,'CONTINUA...',W/2,190,{align:'center',color:'#aaa'});
  txt(g,'PRESSIONE ENTER',W/2,208,{align:'center',color:'#666'});}

/* --------------------- transição íris (clássica) ------------------- */
function renderTrans(){
  if(!G.trans)return;
  const t=G.trans.t;
  const rad=t<1?(1-t):0;
  const p=G.player;
  let fx=W/2,fy=H/2;
  if(p&&(G.st==='play')){fx=clamp(p.x,0,W);fy=clamp(p.y-8,0,H);}
  ctx.save();
  ctx.fillStyle='#000';
  ctx.beginPath();ctx.rect(0,0,W,H);
  ctx.arc(fx,fy,Math.max(0,rad*270),0,Math.PI*2);
  ctx.fill('evenodd');
  ctx.restore();}

function render(){
  ctx.clearRect(0,0,W,H);
  if(G.st==='title')renderTitle();
  else if(G.st==='intro')renderIntro();
  else if(G.st==='clear')renderClear();
  else if(G.st==='over')renderOver();
  else if(G.st==='end')renderEnd();
  else if(G.st==='play'){
    ctx.fillStyle=THEMES[STAGE_DEFS[G.areaIdx].outdoor?'out':'cave'].floor[0]
      ?'#111':'#111';
    ctx.fillRect(0,0,W,H);
    renderField();renderHUD();
    if(G.paused){
      ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,0,W,H);
      txt(ctx,'PAUSA',W/2,96,{align:'center',scale:3,color:'#fff',shadow:'#000'});
      const pp=G.player;
      txt(ctx,'BOMBAS '+pp.bombsMax+'  FOGO '+pp.fire+'  TURBO '+pp.speedLv,
        W/2,132,{align:'center',color:'#ffd23e'});
      const perks=[['LUVA',pp.glove],['SOCO',pp.punch],['PERF',pp.pierce],
        ['ESCUDO',pp.shield],['MONTARIA',!!pp.mount]]
        .filter(k=>k[1]).map(k=>k[0]).join(' - ');
      if(perks)txt(ctx,perks,W/2,146,{align:'center',color:'#8ce8ff'});
      txt(ctx,'ENTER PARA VOLTAR',W/2,170,{align:'center',color:'#8892a8'});}
    if(G.reason){
      txt(ctx,G.reason,W/2,60,{align:'center',scale:2,color:'#ff4040',shadow:'#000'});}}
  renderTrans();}

/* =============================== INPUT ============================= */
const KEYMAP={ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r',ArrowUp:'u',KeyW:'u',
  ArrowDown:'d',KeyS:'d',KeyZ:'a',Space:'a',KeyX:'b',ShiftLeft:'b',ShiftRight:'b'};
addEventListener('keydown',e=>{
  auInit();
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  if(e.code==='Enter'){if(!e.repeat)IN.startEdge=true;return;}
  if(e.code==='KeyM'&&!e.repeat){AU.muted=!AU.muted;return;}
  if(e.code==='KeyP'&&!e.repeat){if(G.st==='play')G.paused=!G.paused,SFX.pause();return;}
  const k=KEYMAP[e.code];if(!k)return;
  if(k==='a'&&!e.repeat)IN.aEdge=true;
  if(k==='b'&&!e.repeat)IN.bEdge=true;
  if(k==='l'&&!e.repeat)IN.lEdge=true;
  if(k==='r'&&!e.repeat)IN.rEdge=true;
  IN[k]=1;});
addEventListener('keyup',e=>{
  if(e.code==='Enter')return;
  const k=KEYMAP[e.code];if(!k)return;
  IN[k]=0;
  if(k==='b')IN.bRelease=true;});

/* ============================ LAÇO PRINCIPAL ======================== */
let last=now(),acc=0;
function frame(){
  const t=now();let dt=(t-last)/1000;last=t;
  dt=Math.min(dt,.1);acc+=dt*1000;
  while(acc>=FPS_STEP){
    const s=FPS_STEP/1000;
    IN.startEdge&&(IN._se=true);
    update(s);
    IN.startEdge=false;IN.aEdge=false;IN.bEdge=false;IN.lEdge=false;IN.rEdge=false;
    acc-=FPS_STEP;}
  render();
  requestAnimationFrame(frame);}

/* -------------------- parâmetros de URL (testes) ------------------- */
(()=>{
  const q=new URLSearchParams(location.search);
  if(q.get('mute')==='1')AU.muted=true;
  const area=parseInt(q.get('area')||'0');
  if(q.get('state')==='play'&&area>=1&&area<=5){
    G.areaIdx=area-1;buildStage(area-1);G.st='play';}
  else if(q.get('state')==='end'){G.st='end';}
  else if(q.get('state')==='over'){G.st='over';}
})();

/* ------------------ API de apoio a testes/debug -------------------- */
window.GAME={
  get state(){return G.st;},get area(){return G.areaIdx+1;},
  get score(){return G.score;},get lives(){return G.lives;},
  get timeLeft(){return G.timeLeft;},
  player(){return G.player;},
  tile(c,r){return G.grid[r*COLS+c];},
  enemies(){return G.enemies.filter(e=>!e.dead).length;},
  press(k){ // simula tecla para testes automatizados
    if(k==='enter'){IN.startEdge=true;setTimeout(()=>IN.startEdge=false,50);}
    else if(KEYMAP[k]||KEYMAP['Key'+k.toUpperCase()]){
      const kk=KEYMAP[k]||KEYMAP['Key'+k.toUpperCase()];IN[kk]=1;
      setTimeout(()=>IN[kk]=0,80);}},
  hold(k,on){const kk=KEYMAP[k];if(kk)IN[kk]=on?1:0;},
  cheat:{
    killAll(){for(const e of G.enemies)if(!e.dead)killEnemy(e);
      for(const h of G.hideouts)if(!h.dead){h.hp=0;damageHideout(h);}updateDoorState();},
    give(t){applyItem(t);},
    reveal(){G.door.revealed=true;burnSoft(G.door.c,G.door.r);updateDoorState();},
    win(){startClear();},
    time(s){G.timeLeft=s;},
    god(on){G.god=on;},
    skip(){G.areaIdx=Math.min(STAGE_DEFS.length-1,G.areaIdx+1);buildStage(G.areaIdx);G.st='play';}}
};

requestAnimationFrame(frame);
