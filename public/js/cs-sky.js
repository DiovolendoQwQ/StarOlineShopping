(() => {
  function initDom(){
    let sky = document.querySelector('.sky-bg');
    let stars = document.getElementById('sky-stars');
    let meteors = document.getElementById('sky-meteors');
    if (!sky) {
      sky = document.createElement('div');
      sky.className = 'sky-bg';
      const layer = document.createElement('div');
      layer.className = 'sky-layer';
      stars = document.createElement('canvas');
      stars.id = 'sky-stars';
      meteors = document.createElement('canvas');
      meteors.id = 'sky-meteors';
      layer.appendChild(stars);
      layer.appendChild(meteors);
      sky.appendChild(layer);
      document.body.appendChild(sky);
    }
    return { sky, stars, meteors };
  }

  let stars, meteors, sctx, mctx;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let W = 0, H = 0;
  let particlesNear = [], particlesFar = [];
  let densityFactor = 1;
  let lastTs = 0, accDt = 0, accFrames = 0;
  let parallax = {x:0,y:0};
  function resize(){
    W = window.innerWidth; H = window.innerHeight;
    stars.width = Math.floor(W*dpr); stars.height = Math.floor(H*dpr);
    meteors.width = Math.floor(W*dpr); meteors.height = Math.floor(H*dpr);
    sctx.setTransform(dpr,0,0,dpr,0,0);
    mctx.setTransform(dpr,0,0,dpr,0,0);
    initParticles();
  }
  function initParticles(){
    const base = Math.floor(W*H/3500);
    const count = Math.min(2400, Math.max(400, Math.floor(base * densityFactor)));
    const nearCount = Math.floor(count * 0.4);
    const farCount = count - nearCount;
    particlesNear = new Array(nearCount).fill(0).map(()=>({
      x: Math.random()*W,
      y: Math.random()*H,
      r: Math.random()*2.0+0.8,
      a: Math.random()*0.6+0.35,
      z: 1.2+Math.random()*0.6,
      vx: (Math.random()-0.5)*0.025,
      vy: (Math.random()-0.5)*0.025,
      tw: Math.random()*Math.PI*2,
      tc: Math.random()*0.035+0.012,
      bl: 1,
      blLeft: 0
    }));
    particlesFar = new Array(farCount).fill(0).map(()=>({
      x: Math.random()*W,
      y: Math.random()*H,
      r: Math.random()*1.2+0.3,
      a: Math.random()*0.5+0.3,
      z: 0.5+Math.random()*0.4,
      vx: (Math.random()-0.5)*0.015,
      vy: (Math.random()-0.5)*0.015,
      tw: Math.random()*Math.PI*2,
      tc: Math.random()*0.02+0.006,
      bl: 1,
      blLeft: 0
    }));
  }
  function drawNebula(){
    const g1 = sctx.createRadialGradient(W*0.22,H*0.18,0,W*0.22,H*0.18,Math.max(W,H)*0.65);
    g1.addColorStop(0,'rgba(99,102,241,0.18)');
    g1.addColorStop(1,'rgba(99,102,241,0)');
    sctx.fillStyle = g1; sctx.fillRect(0,0,W,H);
    const g2 = sctx.createRadialGradient(W*0.78,H*0.35,0,W*0.78,H*0.35,Math.max(W,H)*0.55);
    g2.addColorStop(0,'rgba(59,130,246,0.14)');
    g2.addColorStop(1,'rgba(59,130,246,0)');
    sctx.fillStyle = g2; sctx.fillRect(0,0,W,H);
    const g3 = sctx.createRadialGradient(W*0.5,H*0.7,0,W*0.5,H*0.7,Math.max(W,H)*0.5);
    g3.addColorStop(0,'rgba(168,85,247,0.12)');
    g3.addColorStop(1,'rgba(168,85,247,0)');
    sctx.fillStyle = g3; sctx.fillRect(0,0,W,H);
  }
  function tick(){
    const now = performance.now();
    if (lastTs) { const dt = now - lastTs; accDt += dt; accFrames++; }
    lastTs = now;
    sctx.clearRect(0,0,W,H);
    drawNebula();
    for(const p of particlesFar){
      p.tw += p.tc; const twinkle = (Math.sin(p.tw)+1)/2;
      if (p.blLeft <= 0 && Math.random() < 0.0015) { p.blLeft = 36; p.bl = 2; }
      if (p.blLeft > 0) { p.blLeft--; if (p.blLeft === 0) p.bl = 1; }
      p.vx += (Math.random()-0.5)*0.002 * p.z;
      p.vy += (Math.random()-0.5)*0.002 * p.z;
      const vmax = 0.05; if (p.vx > vmax) p.vx = vmax; if (p.vx < -vmax) p.vx = -vmax; if (p.vy > vmax) p.vy = vmax; if (p.vy < -vmax) p.vy = -vmax;
      p.x += p.vx; p.y += p.vy;
      if(p.x<0) p.x=W; if(p.x>W) p.x=0; if(p.y<0) p.y=H; if(p.y>H) p.y=0;
      const px = p.x + parallax.x*0.03*p.z; const py = p.y + parallax.y*0.02*p.z;
      const coreAlpha = Math.min(1, p.a*(0.7*twinkle + 0.3)*p.bl);
      const glowAlpha = Math.min(0.3, p.a*twinkle*0.25);
      sctx.globalAlpha = coreAlpha;
      sctx.beginPath(); sctx.arc(px,py,p.r,0,Math.PI*2); sctx.fillStyle = '#ffffff'; sctx.fill();
      sctx.globalAlpha = glowAlpha;
      sctx.beginPath(); sctx.arc(px,py,p.r*2.4,0,Math.PI*2); sctx.fillStyle = '#ffffff'; sctx.fill();
    }
    for(const p of particlesNear){
      p.tw += p.tc; const twinkle = (Math.sin(p.tw)+1)/2;
      if (p.blLeft <= 0 && Math.random() < 0.0025) { p.blLeft = 44; p.bl = 2; }
      if (p.blLeft > 0) { p.blLeft--; if (p.blLeft === 0) p.bl = 1; }
      p.vx += (Math.random()-0.5)*0.003 * p.z;
      p.vy += (Math.random()-0.5)*0.003 * p.z;
      const vmax = 0.07; if (p.vx > vmax) p.vx = vmax; if (p.vx < -vmax) p.vx = -vmax; if (p.vy > vmax) p.vy = vmax; if (p.vy < -vmax) p.vy = -vmax;
      p.x += p.vx; p.y += p.vy;
      if(p.x<0) p.x=W; if(p.x>W) p.x=0; if(p.y<0) p.y=H; if(p.y>H) p.y=0;
      const px = p.x + parallax.x*0.06*p.z; const py = p.y + parallax.y*0.04*p.z;
      const coreAlpha = Math.min(1, p.a*(0.7*twinkle + 0.3)*p.bl);
      const glowAlpha = Math.min(0.4, p.a*twinkle*0.35);
      sctx.globalAlpha = coreAlpha;
      sctx.beginPath(); sctx.arc(px,py,p.r,0,Math.PI*2); sctx.fillStyle = '#ffffff'; sctx.fill();
      sctx.globalAlpha = glowAlpha;
      sctx.beginPath(); sctx.arc(px,py,p.r*3.0,0,Math.PI*2); sctx.fillStyle = '#ffffff'; sctx.fill();
    }
    if (accFrames >= 120) {
      const fps = (accFrames * 1000) / accDt;
      accFrames = 0; accDt = 0;
      const prev = densityFactor;
      if (fps < 50) densityFactor = Math.max(0.6, densityFactor - 0.1);
      else if (fps > 58) densityFactor = Math.min(1.2, densityFactor + 0.1);
      if (densityFactor !== prev) initParticles();
    }
    sctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }
  function spawnMeteor(){
    const sx = Math.random()<0.5 ? -40 : W+40;
    const sy = Math.random()*H*0.6;
    const ex = sx<0 ? W+60 : -60;
    const ey = sy + (Math.random()*H*0.25 - H*0.12);
    const angle = Math.atan2(ey-sy, ex-sx);
    const len = 100;
    const steps = 48;
    let i = 0;
    function draw(){
      mctx.clearRect(0,0,W,H);
      const t = i/steps; 
      const x = sx + (ex-sx)*t; 
      const y = sy + (ey-sy)*t;
      const tx = x - Math.cos(angle) * len;
      const ty = y - Math.sin(angle) * len;
      const grad = mctx.createLinearGradient(x,y,tx,ty);
      grad.addColorStop(0,'rgba(255,255,255,0.95)');
      grad.addColorStop(1,'rgba(124,140,255,0)');
      mctx.strokeStyle = grad; mctx.lineWidth = 2;
      mctx.beginPath(); mctx.moveTo(x,y); mctx.lineTo(tx,ty); mctx.stroke();
      i++; if(i<=steps) requestAnimationFrame(draw); else setTimeout(()=>mctx.clearRect(0,0,W,H),60);
    }
    requestAnimationFrame(draw);
  }
  window.__csSpawnMeteor = spawnMeteor;
  function boot(){
    const el = initDom();
    stars = el.stars; meteors = el.meteors;
    sctx = stars.getContext('2d');
    mctx = meteors.getContext('2d');
    window.addEventListener('mousemove',e=>{ const cx=W/2,cy=H/2; parallax.x = (e.clientX-cx)/cx; parallax.y=(e.clientY-cy)/cy; });
    window.addEventListener('resize',resize);
    resize(); tick();
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
