import { filter, metrics } from './core.js';
import { paperTools } from './studio.js';

export function labPage(demoPanel, recordsMarkup) {
  return `<div class="studio lab"><header class="learn-head"><p class="learn-kicker">自主实验</p><h1>哪种方法能留下那根细线？</h1><p>先选「路灯街景」，固定噪声与随机种子。三种方法会同时处理同一张含噪图。先看图，再看分数，最后保存对照。</p></header>
    <div class="lab-exercises"><button id="lampPreset">载入路灯街景 · 椒盐 16%</button><details><summary>进阶练习：一次只改一个条件</summary><ol><li>载入街景，保存第一组对比。</li><li>只把噪声密度提高到 40%，保持种子、阈值不变，再保存一组。观察灯杆和天空。</li><li>将密度调回 16%，在「实验设置与保存」里只改开关阈值，看看开关中值的误差是否改变。</li></ol></details></div>
    ${demoPanel}<section class="learn-help"><h2>三种方法并排看</h2><p>三幅图共用输入。误差条表示与参考图逐像素比较的均方误差（MSE）；本组内条越短，像素误差越小。PSNR 和 SSIM 可与下方已保存的数据一起核对。</p><div id="labComparison" class="lab-results"></div><button class="primary" id="saveComparison">保存三种方法的对比数据</button></section>
    <section class="learn-help"><h2>我的对比记录</h2><div id="labHistory">${recordsMarkup}</div><a href="#experiments">管理全部实验记录 →</a></section>
    ${paperTools()}<section class="learn-help"><h2>添加创新点</h2><p>例如：如果只替换孤立亮点，能否比普通中值更好地保住灯杆？写下你要改什么、用哪组记录作比较，以及什么结果会推翻这个想法。</p><div class="controls"><button data-action="idea-template">写下我的创新点</button><a href="#ideas">查看我的想法 →</a></div></section></div>`;
}

export function compareMethods(input, noisy, names) {
  return Object.entries(names).map(([key,name])=>{
    const pixels=filter(noisy,96,96,key,input.threshold);
    const { mse,psnr,ssim }=metrics(input.reference,pixels,96,96);
    return {key,name,pixels,mse,psnr,ssim};
  });
}
export function displayComparison(rows, draw) {
  const max=Math.max(1,...rows.map(r=>r.mse));
  document.getElementById('labComparison').innerHTML=rows.map(r=>
    `<figure><canvas id="compare-${r.key}" width="96" height="96" aria-label="${r.name}去噪图"></canvas><figcaption><h3>${r.name}</h3><p>MSE ${r.mse.toFixed(2)}</p><div class="error-track"><i style="width:${100*r.mse/max}%"></i></div><p>PSNR ${Number.isFinite(r.psnr)?r.psnr.toFixed(2):'∞'} dB<br>SSIM ${r.ssim.toFixed(4)}</p></figcaption></figure>`).join('');
  rows.forEach(r=>draw('#compare-'+r.key,r.pixels));
}
