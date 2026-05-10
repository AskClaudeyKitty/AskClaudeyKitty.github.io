function updateLight() {
  const isDay = time < 12000;
  const ambient = isDay ? 180 : 30;
  
  for (let i = 0; i < light.length; i++) light[i] = ambient;
  
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const b = getBlock(x, y);
      if (BLOCKS[b]?.light) {
        const r = BLOCKS[b].light;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const d = Math.abs(dx) + Math.abs(dy);
            if (d > r) continue;
            const lx = x + dx, ly = y + dy;
            if (lx < 0 || lx >= WORLD_W || ly < 0 || ly >= WORLD_H) continue;
            const li = ly * WORLD_W + lx;
            light[li] = Math.max(light[li], 255 - d * 18);
          }
        }
      }
    }
  }
}

function draw() {
  const isDay = time < 12000;
  const skyR = isDay ? 100 : 10;
  const skyG = isDay ? 150 : 10;
  const skyB = isDay ? 220 : 30;
  ctx.fillStyle = `rgb(${skyR},${skyG},${skyB})`;
  ctx.fillRect(0, 0, W, H);
  
  const celestialX = W/2 + Math.cos((time / DAY_LEN) * Math.PI * 2 - Math.PI/2) * (W/2 - 40);
  const celestialY = H/2 + Math.sin((time / DAY_LEN) * Math.PI * 2 - Math.PI/2) * (H/2 - 40);
  if (isDay) {
    ctx.fillStyle = '#fd4';
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 20, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  
  if (!isDay) {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 50; i++) {
      const sx = ((i * 137) % W);
      const sy = ((i * 89) % (H/2));
      ctx.fillRect(sx, sy, 2, 2);
    }
  }
  
  ctx.save();
  ctx.translate(-Math.floor(camX), -Math.floor(camY));
  
  const startX = Math.floor(camX / TILE);
  const startY = Math.floor(camY / TILE);
  const endX = Math.min(WORLD_W, startX + Math.ceil(W / TILE) + 2);
  const endY = Math.min(WORLD_H, startY + Math.ceil(H / TILE) + 2);
  
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const b = getBlock(x, y);
      if (b === 0) continue;
      const block = BLOCKS[b];
      const li = y * WORLD_W + x;
      const l = light[li] / 255;
      
      const c = block.color;
      let r, g, bval, a = 1;
      if (c.length === 4) {
        r = parseInt(c[1] + c[1], 16);
        g = parseInt(c[2] + c[2], 16);
        bval = parseInt(c[3] + c[3], 16);
      } else {
        r = parseInt(c.slice(1, 3), 16);
        g = parseInt(c.slice(3, 5), 16);
        bval = parseInt(c.slice(5, 7), 16);
        if (c.length > 7) a = parseInt(c.slice(7, 9), 16) / 255;
      }
      ctx.fillStyle = `rgba(${Math.floor(r * l)},${Math.floor(g * l)},${Math.floor(bval * l)},${a})`;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      
      if (b === 3 && y > 0 && getBlock(x, y-1) === 0) {
        ctx.fillStyle = `rgba(60,160,40,${l})`;
        ctx.fillRect(x * TILE + 2, y * TILE, TILE - 4, 3);
      }
      if (b === 10) {
        ctx.fillStyle = `rgba(255,220,100,${l * 0.8})`;
        ctx.fillRect(x * TILE + 8, y * TILE + 4, 8, 14);
      }
    }
  }
  
  for (const e of entities) {
    if (e.type === 'drop') {
      const item = ITEMS[e.id] || BLOCKS[e.id];
      ctx.fillStyle = item.color || '#fff';
      ctx.font = '12px monospace';
      ctx.fillText(item.icon || item.name[0], e.x, e.y + 10);
    } else if (e.type === 'slime') {
      ctx.fillStyle = '#4a4';
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = '#6c6';
      ctx.fillRect(e.x + 4, e.y + 4, 4, 4);
      ctx.fillRect(e.x + 12, e.y + 4, 4, 4);
    } else if (e.type === 'zombie') {
      ctx.fillStyle = '#363';
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = '#f44';
      ctx.fillRect(e.x + (e.dir > 0 ? 12 : 4), e.y + 6, 4, 4);
    }
  }
  
  ctx.fillStyle = '#48a';
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = '#eca';
  ctx.fillRect(player.x + 2, player.y + 2, 14, 10);
  ctx.fillStyle = '#222';
  ctx.fillRect(player.x + (player.facing > 0 ? 10 : 4), player.y + 5, 3, 3);
  
  if (player.swing > 0) {
    ctx.fillStyle = '#eca';
    const swingAngle = player.swing * 0.3 * player.facing;
    ctx.save();
    ctx.translate(player.x + player.w/2, player.y + 16);
    ctx.rotate(swingAngle);
    ctx.fillRect(0, -2, 16, 4);
    ctx.restore();
    player.swing--;
  }
  
  if (player.mining) {
    const crack = Math.floor(player.mining.progress / player.mining.max * 4);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    const mx = player.mining.x * TILE;
    const my = player.mining.y * TILE;
    if (crack >= 1) { ctx.beginPath(); ctx.moveTo(mx + 4, my + 4); ctx.lineTo(mx + 20, my + 20); ctx.stroke(); }
    if (crack >= 2) { ctx.beginPath(); ctx.moveTo(mx + 20, my + 4); ctx.lineTo(mx + 4, my + 20); ctx.stroke(); }
    if (crack >= 3) { ctx.beginPath(); ctx.moveTo(mx + 12, my + 2); ctx.lineTo(mx + 12, my + 22); ctx.stroke(); }
  }
  
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 30;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  
  ctx.restore();
  
  if (!isDay) {
    ctx.fillStyle = 'rgba(0,0,20,0.4)';
    ctx.fillRect(0, 0, W, H);
  }
  
  const hpFill = document.getElementById('hp-fill');
  if (hpFill) hpFill.style.width = (player.hp / player.maxHp * 100) + '%';
  const timeEl = document.getElementById('time');
  if (timeEl) timeEl.textContent = isDay ? 'Day' : 'Night';
  const depthEl = document.getElementById('depth');
  if (depthEl) depthEl.textContent = Math.floor((player.y + player.h) / TILE - 60);
}
