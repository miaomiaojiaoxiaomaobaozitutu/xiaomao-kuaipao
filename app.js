'use strict';
const $=id=>document.getElementById(id);
const canvas=$('board'), ctx=canvas.getContext('2d');
const selection=$('selection'),play=$('play'),overlay=$('overlay');
const STEP=300, STORAGE='cat-run-web-best-v1';
let game, skin='tutu', mode='selection', last=0, accumulator=0, best=null, storageOK=true;
const art={tutu:{},baozi:{}};
let fishImage=null;
try {const data=JSON.parse(localStorage.getItem(STORAGE));if(data&&Number.isInteger(data.score)&&data.score>0&&Number.isInteger(data.ms)&&data.ms>0)best=data;}catch{storageOK=false;}
function loadImage(url){return new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=url;});}
function chooseSkin(value){skin=value;document.querySelectorAll('[data-skin]').forEach(button=>{const chosen=button.dataset.skin===skin;button.classList.toggle('selected',chosen);button.setAttribute('aria-pressed',String(chosen));button.querySelector('.badge').textContent=chosen?'已选择':'选择';});}
function seed(){try{return crypto.getRandomValues(new Uint32Array(1))[0];}catch{return Date.now()>>>0;}}
function updateRecord(){const score=game.score(),ms=game.elapsed_ms();if(score>0&&(!best||score>best.score||(score===best.score&&ms<best.ms))){best={score,ms};try{localStorage.setItem(STORAGE,JSON.stringify(best));}catch{storageOK=false;$('notice').textContent='浏览器不允许保存，本次纪录仅在当前页面保留。';}}}
function updateStats(){
 $('score').textContent=game.score();$('time').innerHTML=(game.elapsed_ms()/1000).toFixed(1)+'<span>秒</span>';
 $('record').textContent=best?`${best.score}分 / ${(best.ms/1000).toFixed(1)}秒`:'暂无';
 $('hazards').textContent=`💩 ${game.poop_size()} / 2`;
}
function start(){if(!game)return;game.reset(seed());mode='playing';last=performance.now();accumulator=0;selection.hidden=true;play.hidden=false;overlay.hidden=true;$('pause').textContent='暂停';updateStats();draw();canvas.focus({preventScroll:true});}
function showOverlay(title,detail,paused){$('overlay-title').textContent=title;$('overlay-detail').textContent=detail;$('end-icon').textContent=paused?'🐾':game.state()===4?'🎉':'💩';$('resume').hidden=!paused;$('again').hidden=paused;overlay.hidden=false;(paused?$('resume'):$('again')).focus({preventScroll:true});}
function pause(){if(mode!=='playing')return;mode='paused';accumulator=0;$('pause').textContent='继续';showOverlay('已暂停','用时已暂停。',true);}
function resume(){if(mode!=='paused')return;mode='playing';last=performance.now();accumulator=0;overlay.hidden=true;$('pause').textContent='暂停';canvas.focus({preventScroll:true});}
function back(){mode='selection';play.hidden=true;selection.hidden=false;overlay.hidden=true;accumulator=0;$('start').focus({preventScroll:true});}
function changeDirection(d){if(mode==='playing')game.turn(d);}
function angle(dx,dy){return dx>0?Math.PI/2:dx<0?-Math.PI/2:dy>0?Math.PI:0;}
function part(image,x,y,rotation,fallback){ctx.save();ctx.translate(x*60+30,y*60+30);ctx.rotate(rotation);if(image)ctx.drawImage(image,-30,-30,60,60);else fallback?.();ctx.restore();}
function bodyFallback(){ctx.fillStyle=skin==='tutu'?'#fff6f9':'#fff';ctx.fillRect(-23,-31,46,62);ctx.strokeStyle='#b7b0ad';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-23,-30);ctx.lineTo(-23,30);ctx.moveTo(23,-30);ctx.lineTo(23,30);ctx.stroke();if(skin==='baozi'){ctx.fillStyle='#4c4949';ctx.beginPath();ctx.ellipse(6,0,12,17,.4,0,Math.PI*2);ctx.fill();}}
function cornerFallback(){ctx.strokeStyle=skin==='tutu'?'#fff6f9':'#fff';ctx.lineWidth=46;ctx.lineCap='butt';ctx.beginPath();ctx.moveTo(-31,0);ctx.quadraticCurveTo(0,0,0,31);ctx.stroke();}
function emoji(text,x,y,size){ctx.font=`${size}px -apple-system, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x,y);}
function draw(){
 ctx.clearRect(0,0,780,480);for(let y=0;y<8;y++)for(let x=0;x<13;x++){ctx.fillStyle=(x+y)%2?'#f9f6ef':'#eee6d7';ctx.fillRect(x*60,y*60,60,60);}
 for(let i=0;i<game.poop_size();i++)emoji('💩',game.poop_x(i)*60+30,game.poop_y(i)*60+31,37);
 if(game.fish_x()>=0){const x=game.fish_x()*60,y=game.fish_y()*60;if(fishImage)ctx.drawImage(fishImage,x+7,y+7,46,46);else emoji('🐟',x+30,y+31,36);}
 const n=game.cat_size(),images=art[skin];
 for(let i=n-1;i>=1;i--){const x=game.cat_x(i),y=game.cat_y(i),fx=game.cat_x(i-1),fy=game.cat_y(i-1);let rotation=angle(fx-x,fy-y),image,fallback=bodyFallback;
  if(i===n-1){image=images.tail;fallback=()=>{ctx.fillStyle=skin==='tutu'?'#fff6f9':'#555';ctx.beginPath();ctx.ellipse(0,0,21,28,0,0,Math.PI*2);ctx.fill();};}
  else {const bx=game.cat_x(i+1),by=game.cat_y(i+1);if(fx!==bx&&fy!==by){const left=fx<x||bx<x,up=fy<y||by<y;rotation=left?(up?Math.PI/2:0):(up?Math.PI:Math.PI*1.5);image=images.corner;fallback=cornerFallback;}else image=i%2?images.body1:images.body2;}
  part(image,x,y,rotation,fallback);
 }
 part(images.head,game.cat_x(0),game.cat_y(0),game.heading()*Math.PI/2,()=>emoji(skin==='tutu'?'🐱':'🐈‍⬛',0,0,44));
}
function frame(now){
 if(mode==='playing'){
  accumulator+=Math.min(now-last,600);
  if(accumulator>=STEP){accumulator-=STEP;game.tick();updateRecord();updateStats();draw();if(game.state()){mode='ended';const reasons=['','撞到墙壁了','碰到便便了','撞到自己的身体了','空格都被你填满了！'];showOverlay(game.state()===4?'你赢了！':'OUT！',`${reasons[game.state()]} · ${game.score()} 分 · ${(game.elapsed_ms()/1000).toFixed(1)} 秒`,false);}}
 }
 last=now;requestAnimationFrame(frame);
}
document.querySelectorAll('[data-skin]').forEach(b=>b.addEventListener('click',()=>chooseSkin(b.dataset.skin)));
$('start').onclick=start;$('again').onclick=start;$('restart').onclick=start;$('resume').onclick=resume;$('pause').onclick=()=>mode==='paused'?resume():pause();$('back').onclick=back;$('choose').onclick=back;
document.querySelectorAll('[data-dir]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();changeDirection(Number(b.dataset.dir));}));
let swipe=null;
canvas.addEventListener('pointerdown',e=>{if(mode!=='playing')return;swipe={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!swipe||swipe.id!==e.pointerId)return;const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;changeDirection(Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?2:0));swipe.x=e.clientX;swipe.y=e.clientY;});
canvas.addEventListener('pointerup',()=>swipe=null);canvas.addEventListener('pointercancel',()=>swipe=null);
document.addEventListener('keydown',e=>{
 if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
 if(!overlay.hidden&&e.key==='Tab'){const buttons=[...overlay.querySelectorAll('button')].filter(b=>!b.hidden);const first=buttons[0],end=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();end.focus();}else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();first.focus();}return;}
 if(mode==='selection')return;
 const dirs={ArrowUp:0,KeyW:0,ArrowRight:1,KeyD:1,ArrowDown:2,KeyS:2,ArrowLeft:3,KeyA:3};
 if(e.code in dirs){e.preventDefault();changeDirection(dirs[e.code]);}
 else if(e.code==='Space'){e.preventDefault();if(!e.repeat)(mode==='paused'?resume:pause)();}
 else if(e.code==='KeyR'&&!e.repeat){e.preventDefault();start();}
 else if(e.code==='Escape'){if(mode==='playing')pause();else if(mode==='paused')resume();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('blur',pause);
async function init(){
 try{
  const response=await fetch('game.wasm');if(!response.ok)throw new Error('找不到 game.wasm');
  const {instance}=await WebAssembly.instantiate(await response.arrayBuffer(),{});game=instance.exports;
  const missing=[];
  await Promise.all(['tutu','baozi'].map(async name=>{await Promise.all(['head','body1','tail','corner',...(name==='baozi'?['body2']:[])].map(async p=>{const url=`assets/${name}/${p}.png`;art[name][p]=await loadImage(url);if(!art[name][p])missing.push(url);}));if(name==='tutu')art[name].body2=art[name].body1;}));
  fishImage=await loadImage('assets/fish.png');if(!fishImage)missing.push('assets/fish.png');
  $('start').disabled=false;$('start').textContent='开始游戏';
  if(missing.length)$('notice').textContent='部分素材使用临时图案。替换图片后刷新即可：'+missing.join('、');
  else if(!storageOK)$('notice').textContent='当前浏览器未开放本地存储，纪录可能无法保留。';
  requestAnimationFrame(frame);
 }catch(error){$('start').textContent='加载失败';$('notice').textContent=`加载失败：${error.message}。请使用“启动网页.command”，不要直接双击 HTML 文件。`;}
}
init();
