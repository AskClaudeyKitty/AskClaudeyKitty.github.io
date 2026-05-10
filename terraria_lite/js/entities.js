const entities = [];
const particles = [];

function spawnEnemy(x, y, type) {
  entities.push({
    x, y, vx: 0, vy: 0,
    w: 20, h: 20,
    type,
    hp: type === 'slime' ? 15 : 30,
    maxHp: type === 'slime' ? 15 : 30,
    timer: 0,
    dir: Math.random() < 0.5 ? -1 : 1,
  });
}

function spawnDrop(x, y, id, count) {
  entities.push({
    x, y, vx: (Math.random() - 0.5) * 3, vy: -2,
    w: 10, h: 10,
    type: 'drop', id, count,
    life: 600,
  });
}

function spawnParticle(x, y, color) {
  for (let i = 0; i < 4; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 20 + Math.random() * 15,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function updateEntities() {
  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i];
    if (e.type === 'drop') {
      e.vy += 0.3;
      e.x += e.vx;
      e.y += e.vy;
      e.vx *= 0.9;
      const ty = Math.floor((e.y + e.h) / TILE);
      const tx = Math.floor((e.x + e.w/2) / TILE);
      if (isSolid(tx, ty)) {
        e.y = ty * TILE - e.h;
        e.vy = 0;
        e.vx *= 0.5;
      }
      const dx = (player.x + player.w/2) - (e.x + e.w/2);
      const dy = (player.y + player.h/2) - (e.y + e.h/2);
      if (Math.hypot(dx, dy) < 30) {
        addItem(e.id, e.count);
        showMsg(`+${e.count} ${ITEMS[e.id]?.name || BLOCKS[e.id]?.name}`);
        entities.splice(i, 1);
        continue;
      }
      e.life--;
      if (e.life <= 0) entities.splice(i, 1);
    } else if (e.type === 'slime' || e.type === 'zombie') {
      const dx = (player.x + player.w/2) - (e.x + e.w/2);
      const dy = (player.y + player.h/2) - (e.y + e.h/2);
      const dist = Math.hypot(dx, dy);
      
      if (dist < 300) {
        e.dir = dx > 0 ? 1 : -1;
        e.vx += e.dir * (e.type === 'slime' ? 0.08 : 0.12);
        if (e.onGround && Math.random() < 0.03) e.vy = -5;
      } else {
        e.vx += e.dir * 0.03;
        if (Math.random() < 0.01) e.dir *= -1;
      }
      
      e.vx *= 0.9;
      e.vy += 0.35;
      
      e.x += e.vx;
      let etx = Math.floor((e.x + e.w/2) / TILE);
      let ety = Math.floor((e.y + e.h/2) / TILE);
      if (isSolid(etx, Math.floor(e.y / TILE)) || isSolid(etx, Math.floor((e.y + e.h - 1) / TILE))) {
        e.x = (etx + (e.vx > 0 ? -0.6 : 0.6)) * TILE - e.w/2;
        e.vx = 0;
        e.dir *= -1;
      }
      
      e.y += e.vy;
      etx = Math.floor((e.x + e.w/2) / TILE);
      ety = Math.floor((e.y + e.h) / TILE);
      if (isSolid(etx, ety) || isSolid(Math.floor(e.x / TILE), ety)) {
        if (e.vy > 0) {
          e.y = ety * TILE - e.h;
          e.onGround = true;
        } else {
          e.y = (ety + 1) * TILE;
        }
        e.vy = 0;
      } else {
        e.onGround = false;
      }
      
      if (dist < 20 && player.hp > 0) {
        player.hp -= (e.type === 'slime' ? 0.3 : 0.5);
        player.vx += (dx > 0 ? 1 : -1) * 3;
        player.vy -= 2;
      }
      
      if (player.swing > 0 && dist < 40) {
        const tool = player.hotbar[player.selected];
        const dmg = tool && ITEMS[tool.id]?.tool === 'sword' ? ITEMS[tool.id].dmg : 5;
        e.hp -= dmg;
        e.vx += (dx > 0 ? -1 : 1) * 4;
        e.vy -= 3;
        spawnParticle(e.x + e.w/2, e.y + e.h/2, '#f44');
        if (e.hp <= 0) {
          if (e.type === 'slime') spawnDrop(e.x, e.y, 34, 1);
          else spawnDrop(e.x, e.y, 35, 1);
          entities.splice(i, 1);
        }
      }
    }
  }
  
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function updateSpawning() {
  const isDay = time < 12000;
  if (isDay) return;
  if (Math.random() < 0.003 && entities.filter(e => e.type === 'slime' || e.type === 'zombie').length < 8) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const sx = Math.floor((player.x + side * 400) / TILE);
    const sy = Math.floor(player.y / TILE);
    let gy = sy;
    while (gy < WORLD_H - 1 && getBlock(sx, gy) === 0) gy++;
    if (gy < WORLD_H - 1) {
      spawnEnemy(sx * TILE, (gy - 1) * TILE, Math.random() < 0.6 ? 'slime' : 'zombie');
    }
  }
}
