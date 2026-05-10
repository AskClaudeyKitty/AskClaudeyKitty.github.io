const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

let time = 0;

function gameLoop() {
  time = (time + 1) % DAY_LEN;
  
  updatePlayer();
  updateEntities();
  updateLight();
  updateSpawning();
  
  if (mouseDown && !keys['Shift']) {
    const t = getMouseTile();
    mineBlock(t.x, t.y);
  }
  
  draw();
  requestAnimationFrame(gameLoop);
}

generate();
addItem(10, 8);
updateHotbar();
updateLight();
gameLoop();
