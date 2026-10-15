import { createScene, locations } from './scene.js';

const $ = (id) => document.getElementById(id);
const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const stories = {
  tea: ['第一杯茶，留给远道而来的你。', '茶屋门口的风铃响了三下。阿禾爷爷端来一杯麦茶，说面包刚刚出炉，坐多久都没关系。'],
  shrine: ['古树比村庄更懂得等候。', '石阶尽头，树荫把午后变得很轻。小小的木牌上没有愿望，只有一句：愿远行的人，记得回家的路。'],
  bridge: ['把心事交给流水。', '站在石桥中间，听见溪水从脚下流过。一片叶子绕了一个小圈，又继续它自己的旅程。'],
  mill: ['风把麦香送得很远。', '山坡上的风慢慢转过磨坊。金黄的花田旁，有一条小路通向下一个晴天。'],
  garden: ['每一朵花都有自己的季节。', '小满正在整理今天的花束。她送你一枝小雏菊，说不必急着开花，慢慢长大也很好。'],
  camp: ['今晚，可以数着星星入睡。', '帐篷旁的小锅已经煮开。猫咪把营地巡视了一遍，又在最暖的一块石头上伸了个懒腰。'],
  tree: ['七枚风铃，七段溪谷时光。', '古树的枝头挂着村民们做的风铃。风来时，清脆的声音像一封没有署名的信：谢谢你来过。'],
};
const people = {
  'tea-maker': { name:'阿禾爷爷', role:'茶屋主人', sprite:'tea-maker', text:'“刚烤好的面包，配一杯麦茶。走累了就坐一会儿，溪谷的下午很长。”', note:'茶屋的灯，会一直亮到最后一位旅人回家。' },
  gardener: { name:'小满', role:'花园照料人', sprite:'gardener', text:'“这束花里藏着今天的阳光。送给你——希望路上的风，都是温柔的。”', note:'沿着石桥往东，能找到小满照看的玻璃温室。' },
  cat: { name:'栗子', role:'溪谷的巡逻员', sprite:'cat', text:'“喵——” 它轻轻蹭了蹭你的鞋边，又装作什么也没发生。', note:'它没有固定的工作时间，午睡除外。' },
};
let saved=[];
try { saved=JSON.parse(localStorage.getItem('windbell-memories') || '[]'); } catch {}
const visited = new Set(Array.isArray(saved) ? saved.filter(id => stories[id]) : []);
let scene, toastTimer, mapImage, zoomBase=1, isPaused=false, activeRegion='tea';
let audioContext, audioBuffer, audioSource, gain, soundEnabled=false, volume=.45, soundPending=false;

$('place-list').innerHTML = locations.map((loc,i)=>`<li><button class="place-button" data-place="${loc.id}" aria-label="沿路前往${loc.name}"><span class="place-number">0${i+1}</span><span class="place-name">${loc.name}</span><span class="place-indicator" aria-hidden="true"></span></button></li>`).join('');

function updateProgress() {
  $('discovered').textContent=visited.size;
  $('nav-count').textContent=visited.size;
  $('progress').style.width=`${visited.size/7*100}%`;
  document.querySelectorAll('[data-place]').forEach(button=>{
    button.classList.toggle('visited',visited.has(button.dataset.place));
    button.classList.toggle('selected',button.dataset.place===activeRegion);
  });
}
function toast(text) {
  clearTimeout(toastTimer);
  $('scene-toast').textContent=text;
  $('scene-toast').classList.add('show');
  toastTimer=setTimeout(()=>$('scene-toast').classList.remove('show'),4300);
}
function visit(id) {
  if(visited.has(id)) return;
  visited.add(id);
  try { localStorage.setItem('windbell-memories',JSON.stringify([...visited])); } catch {}
  updateProgress();
  const place=locations.find(loc=>loc.id===id);
  toast(visited.size===7 ? '七段溪谷时光，已全部收藏。谢谢你慢慢走过。' : `已收藏 · ${place.name}。去旅人手记，读一读这里的故事。`);
  if(soundEnabled) playBell();
}
function region(id) {
  activeRegion=id;
  $('region').textContent=locations.find(loc=>loc.id===id)?.name || '溪谷小路';
  updateProgress();
}
function openDialog(content) {
  $('dialog-content').innerHTML=content;
  if(!$('dialog').open) $('dialog').showModal();
  scene?.setInputEnabled?.(false);
}
function closeDialog() { $('dialog').close(); }
$('dialog-close').onclick=closeDialog;
$('dialog').addEventListener('close',()=>{ scene?.setInputEnabled?.(true); });
$('dialog').addEventListener('click',event=>{if(event.target===$('dialog')){ const r=$('dialog').getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) closeDialog(); }});

function notebook() {
  openDialog(`<p class="dialog-eyebrow">LITTLE MEMORIES OF THE VALLEY</p><h2>旅人手记</h2><p class="dialog-description">有些风景，走近了才会成为故事。<br>你已经收藏了 ${visited.size} / 7 段溪谷时光。</p><div class="journal-list">${locations.map((loc,i)=>`<div class="journal-item ${visited.has(loc.id)?'':'locked'}"><span>0${i+1}</span><div><h3>${loc.name}</h3><p>${visited.has(loc.id)?stories[loc.id][0]:'沿着小路，去遇见这段故事。'}</p></div><button data-${visited.has(loc.id)?'read':'travel'}="${loc.id}">${visited.has(loc.id)?'读一读':'去看看'}</button></div>`).join('')}</div>`);
}
function readStory(id) {
  const place=locations.find(loc=>loc.id===id);
  openDialog(`<p class="dialog-eyebrow">A MOMENT TO KEEP · ${String(locations.indexOf(place)+1).padStart(2,'0')}</p><h2>${place.name}</h2><p class="dialog-description">${stories[id][0]}</p><div class="story-quote">${stories[id][1]}</div><button class="dialog-button" id="back-journal">回到旅人手记</button>`);
  $('back-journal').onclick=notebook;
}
function talk(id) {
  const person=people[id]; if(!person) return;
  openDialog(`<p class="dialog-eyebrow">A FRIEND IN THE VALLEY</p><h2>${person.name} <small class="person-role">${person.role}</small></h2><div class="talk-layout"><img src="assets/actors/${person.sprite}-1.webp" alt="${person.name}"><p>${person.text}</p></div><p class="talk-footer">${person.note}</p><button class="dialog-button" id="continue">继续散步</button>`);
  $('continue').onclick=closeDialog;
}
function goTo(id) {
  if(!scene) return;
  if(isPaused){isPaused=false;scene.setPaused(false);updatePause();}
  scene.goTo(id);
  const loc=locations.find(loc=>loc.id===id);
  toast(`沿着小路，前往${loc.name}…`);
  $('scene').focus({preventScroll:true});
}
document.addEventListener('click',event=>{
  const place=event.target.closest('[data-place],[data-travel],[data-read]');
  if(!place) return;
  if(place.dataset.read) {readStory(place.dataset.read);return;}
  if($('dialog').open) closeDialog();
  goTo(place.dataset.place || place.dataset.travel);
});
$('notebook').onclick=notebook;
$('start').onclick=()=>goTo('bridge');
$('wander').onclick=()=>{scene?.home();$('scene').focus({preventScroll:true});};
$('about').onclick=()=>openDialog(`<p class="dialog-eyebrow">WELCOME TO WINDBELL VALLEY</p><h2>风铃溪谷</h2><p class="dialog-description">一座藏在山风与溪水之间的小村庄。<br>你是戴草帽的旅人“风禾”。在这里，拜访邻居、沿溪散步、收集七段寻常日子，都是值得认真做的小事。</p><div class="about-image"><img src="assets/valley.webp" alt="手绘风铃溪谷全景" width="1536" height="1024"></div><div class="credits">场景与人物为本项目生成的原创手绘风格素材；人物采用透明序列帧动画，环境以独立图层实时合成。<br>配乐《午后的来信》：原创合成，75 BPM · 3/4 拍 · 96 秒循环。<br>场景组织参考 <a href="https://github.com/aldegad/sprite-gen/blob/main/docs/scene.md" target="_blank" rel="noopener">aldegad / sprite-gen</a> 的分层、脚底锚点与独立动画循环。未使用参考项目的画面素材。</div><div class="dialog-links"><a href="assets/audio/windbell-valley.mp3" download>下载原创配乐</a><a href="assets/characters.png" download>下载角色原图</a><a href="assets/animation.json" download>动画帧说明</a></div>`);

function help() {
  openDialog(`<p class="dialog-eyebrow">TAKE YOUR TIME</p><h2>慢慢走，就很好。</h2><p class="dialog-description">不需要完成任务，也不用赶路。<br>七处地点的小故事，正等着你走近。</p><ul class="guide-list"><li><strong>点击小路</strong><span>旅人会沿道路走过去。点击左侧地点，也可以自动前往。</span></li><li><strong>WASD / 方向键</strong><span>控制旅人移动，房屋和溪水无法穿越，请从桥上通过。</span></li><li><strong>拖动 / 滚轮</strong><span>拖动浏览地图，滚轮或 ＋ / − 调整远近。手机用手指拖动、轻点行走。</span></li><li><strong>遇见邻居</strong><span>走近后点击阿禾爷爷、小满或栗子猫，与它们打个招呼。</span></li><li><strong>收藏时光</strong><span>走到七处地点就会留下手记。本设备会记住你的发现。相机按钮可保存当前风景。</span></li></ul><label class="volume-control" for="volume">配乐音量<input id="volume" type="range" min="0" max="100" value="${Math.round(volume*100)}"><span id="volume-number">${Math.round(volume*100)}%</span></label>`);
  $('volume').oninput=event=>{volume=Number(event.target.value)/100;if(gain)gain.gain.setTargetAtTime(volume,audioContext.currentTime,.12);$('volume-number').textContent=`${event.target.value}%`;};
}
$('help').onclick=help;
function setMode(mode) {
  scene?.setMode(mode);
  document.body.classList.toggle('dusk',mode==='dusk');
  $('day').setAttribute('aria-pressed',String(mode==='day'));
  $('dusk').setAttribute('aria-pressed',String(mode==='dusk'));
  $('time-label').textContent=mode==='day'?'午后 15:24':'日暮 18:42';
}
$('day').onclick=()=>setMode('day');$('dusk').onclick=()=>setMode('dusk');
$('zoom-in').onclick=()=>scene?.zoomBy(1.2);
$('zoom-out').onclick=()=>scene?.zoomBy(1/1.2);
$('home').onclick=()=>{scene?.setFollow(true);toast('镜头已回到旅人身边。');};
function updatePause(){ $('pause').innerHTML=icon(isPaused?'play':'pause');$('pause').setAttribute('aria-label',isPaused?'继续场景动画':'暂停场景动画');$('pause').setAttribute('aria-pressed',String(isPaused));$('hint').textContent=isPaused?'溪谷暂时停在这一刻':'点击小路行走 · 拖动浏览'; }
$('pause').onclick=()=>{isPaused=!isPaused;scene?.setPaused(isPaused);updatePause();};

function updateSound(){ $('sound').innerHTML=icon(soundEnabled?'sound':'mute')+`<span>${soundEnabled?'溪谷正在奏鸣':'听见溪谷'}</span>`;$('sound').setAttribute('aria-pressed',String(soundEnabled));$('sound').setAttribute('aria-label',soundEnabled?'关闭音乐':'开启音乐'); }
async function toggleSound(){
  if(soundPending) return;
  if(soundEnabled){gain.gain.setTargetAtTime(0,audioContext.currentTime,.2);soundEnabled=false;updateSound();return;}
  soundPending=true;$('sound').disabled=true;
  try {
    if(!audioContext){audioContext=new (window.AudioContext||window.webkitAudioContext)();gain=audioContext.createGain();gain.gain.value=0;gain.connect(audioContext.destination);}
    await audioContext.resume();
    if(!audioBuffer){const response=await fetch('assets/audio/windbell-valley.mp3');if(!response.ok)throw new Error('音频未能加载');audioBuffer=await audioContext.decodeAudioData(await response.arrayBuffer());}
    if(!audioSource){audioSource=audioContext.createBufferSource();audioSource.buffer=audioBuffer;audioSource.loop=true;audioSource.connect(gain);audioSource.start();}
    gain.gain.setTargetAtTime(volume,audioContext.currentTime,.6);soundEnabled=true;updateSound();
    toast('正在播放《午后的来信》 · 原创循环配乐');
  }catch(error){toast('音乐暂时未能播放，请再点一次试试。');console.error(error);}finally{soundPending=false;$('sound').disabled=false;}
}
$('sound').onclick=toggleSound;
function playBell(){
  if(!audioContext||audioContext.state!=='running')return;
  [784,1176,1568].forEach((frequency,i)=>{const oscillator=audioContext.createOscillator(),envelope=audioContext.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;envelope.gain.setValueAtTime(0,audioContext.currentTime);envelope.gain.linearRampToValueAtTime(.06/(i+1),audioContext.currentTime+.012);envelope.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+1.7);oscillator.connect(envelope);envelope.connect(gain);oscillator.start();oscillator.stop(audioContext.currentTime+1.8);});
}
document.addEventListener('visibilitychange',()=>{if(!audioContext)return;if(document.hidden)audioContext.suspend();else if(soundEnabled)audioContext.resume().catch(()=>{});});

$('photo').onclick=()=>{
  if(!scene)return;
  const source=$('scene'),out=document.createElement('canvas');out.width=source.width;out.height=source.height+Math.round(source.width*.095);
  const ctx=out.getContext('2d');ctx.fillStyle='#f6f3ea';ctx.fillRect(0,0,out.width,out.height);ctx.drawImage(source,0,0);
  const size=Math.max(17,Math.round(out.width*.025));ctx.fillStyle='#526a46';ctx.font=`${size}px Georgia, SimSun, serif`;ctx.fillText('风铃溪谷 / Windbell Valley',out.width*.035,source.height+out.width*.048);ctx.font=`${Math.round(size*.48)}px sans-serif`;ctx.fillStyle='#8c967d';ctx.fillText('愿你的每一步，都不必着急。',out.width*.035,source.height+out.width*.073);
  out.toBlob(blob=>{if(!blob){toast('明信片生成失败，请重试。');return;}const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='风铃溪谷-明信片.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);},'image/png');
  $('photo-flash').classList.remove('flash');void $('photo-flash').offsetWidth;$('photo-flash').classList.add('flash');toast('这一刻，已装进你的明信片。');
};
function paintMinimap(){
  if(!scene||!mapImage)return;
  const canvas=$('minimap'),ctx=canvas.getContext('2d'),state=scene.getState(),scale=canvas.width/3072;
  ctx.clearRect(0,0,300,200);ctx.drawImage(mapImage,0,0,300,200);ctx.fillStyle='#f8f6e526';ctx.fillRect(0,0,300,200);
  const w=$('scene').clientWidth/state.camera.zoom*scale,h=$('scene').clientHeight/state.camera.zoom*scale;
  ctx.strokeStyle='#fff9dfd9';ctx.lineWidth=1.5;ctx.strokeRect(state.camera.x*scale-w/2,state.camera.y*scale-h/2,w,h);
  ctx.beginPath();ctx.arc(state.player.x*scale,state.player.y*scale,4,0,Math.PI*2);ctx.fillStyle='#f9eed3';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#556e45';ctx.stroke();
  $('zoom-label').textContent=`${Math.round(state.camera.zoom/zoomBase*100)}%`;
}
updateProgress();
try {
  scene=await createScene($('scene'),{onVisit:visit,onTalk:talk,onRegion:region,onMove:paintMinimap});
  zoomBase=scene.getState().camera.zoom;
  mapImage=new Image();mapImage.src='assets/valley.webp';await mapImage.decode();
  $('loading').classList.add('hide');
  $('loading').setAttribute('aria-hidden','true');
  setInterval(()=>{if(!document.hidden)paintMinimap();},200);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){isPaused=true;scene.setPaused(true);updatePause();}
  paintMinimap();
}catch(error){
  console.error(error);
  $('loading').innerHTML=`${icon('bell')}<p>溪谷还在路上</p><span>地图加载失败，请检查网络后重试。</span><button class="retry" id="retry">重新打开画卷</button>`;
  $('retry').onclick=()=>location.reload();
}
