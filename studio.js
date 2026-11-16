import { addNoise, filter } from './core.js';

// A generated reference lets beginners compare noise against known detail.
export function lampScene() {
  return Uint8Array.from({length: 96 * 96}, (_, i) => {
    const x = i % 96, y = Math.floor(i / 96);
    const glow = 62 * Math.exp(-((x-62)**2 + (y-28)**2)/120);
    let v = 36 + y * .48 + glow;
    const roof = [53,60,48,55,50,57,62,48][Math.floor(x/12)];
    if (y >= roof && y < 76) v = y > roof + 3 && x % 7 < 2 && y % 8 < 3 ? 133 : 40;
    if (y >= 76) v = 98 - (y-76)*1.8;
    if (y === 76 || y === 80) v = 140;
    if (x === 69 && y >= 23 && y <= 78 || y === 23 && x >= 62 && x <= 69) v = 193;
    if (Math.abs(x-62) + Math.abs(y-26) < 5) v = 230;
    if (y === 25 && x >= 58 && x <= 66) v = 253;
    return Math.round(v);
  });
}

const street = lampScene();
const speckles = addNoise(street, 'salt', 16, 42);
const clean = filter(speckles, 96, 96, 'median');
const plates = { street, speckles, clean };
export function paintScenes() {
  document.querySelectorAll('canvas[data-scene]').forEach(canvas => {
    const ctx = canvas.getContext('2d');
    const frame = ctx.createImageData(96,96);
    plates[canvas.dataset.scene].forEach((v,i) => frame.data.set([v,v,v,255],i*4));
    ctx.putImageData(frame,0,0);
  });
}

function plate(key, label) {
  return '<figure><canvas width="96" height="96" data-scene="'+key+'" aria-label="'+label+'"></canvas><figcaption>'+label+'</figcaption></figure>';
}
export function homePage() {
  return `<div class="studio"><section class="studio-hero"><div><p class="studio-kicker">红外去噪研究台</p><h1>照片里的白点，<br>哪些该留下？</h1><p>看右边这条街。同一盏路灯，第二张图里多了许多黑白点。我们要清掉杂点，也要尽量保住细细的灯杆。</p><a class="studio-cta" href="#knowledge">从第一张图开始 →</a></div><div class="street-pair">${plate('street','原本的街景')}${plate('speckles','加入杂点后')}</div></section>
    <div class="module-cards">${[['knowledge','基础知识入手','看图分辨像素、噪声和真实细节。','看生活例子'],['guide','工作台使用教程','先看操作演示，再亲手移动滑块、选择方法、保存。','跟着操作'],['lab','自主实验','在同一张图上比较三种方法，保存数据、导入论文、记下想法。','打开实验台']].map(([route,title,desc,link],i)=>`<a href="#${route}"><small>第 ${i+1} 站</small><h2>${title}</h2><p>${desc}</p><strong>${link} →</strong></a>`).join('')}</div></div>`;
}

export function illustratedLesson() {
  return `<section class="story-panel"><div><h2>夜里拍路灯，哪些点是噪声？</h2><p>先看原图，找到发亮的灯头和细灯杆；再切到含噪图。突然散落在天空中的黑白点，是我们人为加进去的噪声。最后看看滤波器是否也擦掉了灯杆。</p><div class="story-controls" role="group" aria-label="选择街景">${[['street','原图'],['speckles','加上杂点'],['clean','中值去噪后']].map(([v,s],i)=>`<button data-show-scene="${v}" aria-pressed="${i===0}">${s}</button>`).join('')}</div><p id="scene-caption" aria-live="polite">这是一张合成教学图：灯头和灯杆都是想保留的信号。</p></div><div class="street-pair solo">${plate('street','街景示意图 · 96 × 96 像素')}</div></section>
    <section class="story-panel"><div><h2>同一面墙，九次读数</h2><p>把一小块灰墙放大，每个方格就是一个像素。假设周围八格的亮度都是 80，中心却变成了 255。取平均时，这个白点会把结果拉高；把九个数排队取第五个，它仍是 80。下面按「添加白点」亲手算一次。</p></div><div class="wall-strip" aria-label="八格灰色，一格白色">灰墙 <span></span> 八格 80 ＋ 一格 255</div></section>`;
}

export function bindStory() {
  paintScenes();
  const captions = {street:'这是一张合成教学图：灯头和灯杆都是想保留的信号。',speckles:'天空多了散落的黑白点。对照原图，可以确认这些位置是人为加入的噪声。',clean:'许多杂点消失了，但细灯杆也变得断续。只追求画面平滑，会损失真实细节。'};
  document.querySelectorAll('[data-show-scene]').forEach(button => button.onclick=()=>{
    const key=button.dataset.showScene;
    document.querySelector('.solo canvas').dataset.scene=key;
    document.getElementById('scene-caption').textContent=captions[key];
    document.querySelectorAll('[data-show-scene]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    paintScenes();
  });
}

export function readRis(text) {
  const records = [];
  let fields = null, last = '';
  for (const line of text.replace(/^\uFEFF/,'').split(/\r?\n/)) {
    const tag = line.match(/^([A-Z0-9]{2})\s*-\s?(.*)$/);
    if (!tag) {
      if (fields && last && line.trim()) fields[last][fields[last].length-1] += ' '+line.trim();
      continue;
    }
    const [,key,value] = tag;
    if (key==='TY') fields={};
    if (!fields) continue;
    (fields[key] ||= []).push(value.trim());
    last=key;
    if (key!=='ER') continue;
    const title=(fields.TI || fields.T1 || [])[0];
    if (!title || title.length>1000) throw Error('有一条引文缺少有效标题，请检查 TI 或 T1 字段。');
    const doi=fields.DO?.[0] || '';
    records.push({title, url:fields.UR?.[0] || (doi?'https://doi.org/'+doi:''), abstract:(fields.AB || fields.N2 || []).join(' '), keywords:(fields.KW || []).join('；'), authors:(fields.AU || fields.A1 || []).join('；'),doi,status:'待阅读'});
    fields=null;
  }
  if (fields || !records.length) throw Error('请选择完整的 RIS 引文文件，每条以 TY 开始、以 ER 结束。');
  return records;
}

export function paperTools() {
  return `<section class="learn-help research-tools"><h2>把论文带进实验</h2><p>在 IEEE Xplore 找到论文，点「Cite This」，选择 RIS 并下载。把引文文件导入这里，即可在论文笔记中补充方法、数据和想法。摘要取决于导出的内容。</p><div class="controls"><a href="https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=infrared%20image%20denoising" target="_blank" rel="noopener">在 IEEE Xplore 查论文 ↗</a><label class="file-pick">导入 RIS 引文<input id="paperRis" type="file" accept=".ris,application/x-research-info-systems"></label><a href="#papers">我的论文笔记 →</a></div><p id="risMessage" role="status"></p></section>`;
}
