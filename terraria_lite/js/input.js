const keys = {};
let mouseX = 0, mouseY = 0, mouseDown = false, mouseRight = false;

function getCanvas() { return document.getElementById('c'); }

getCanvas().addEventListener('mousemove', e => {
  const rect = getCanvas().getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

getCanvas().addEventListener('mousedown', e => {
  if (e.button === 0) {
    mouseDown = true;
    const t = getMouseTile();
    if (keys['Shift']) {
      placeBlock(t.x, t.y);
    } else {
      mineBlock(t.x, t.y);
      player.swing = 10;
    }
  } else if (e.button === 2) {
    mouseRight = true;
    const t = getMouseTile();
    placeBlock(t.x, t.y);
  }
});

getCanvas().addEventListener('mouseup', e => {
  if (e.button === 0) { mouseDown = false; player.mining = null; }
  if (e.button === 2) mouseRight = false;
});

getCanvas().addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key >= '1' && e.key <= '9') {
    player.selected = parseInt(e.key) - 1;
    updateHotbar();
  }
  if (e.key.toLowerCase() === 'e') {
    toggleInventory();
  }
  if (e.key.toLowerCase() === 'q') {
    const slot = player.hotbar[player.selected];
    if (slot) {
      spawnDrop(player.x, player.y, slot.id, 1);
      slot.count--;
      if (slot.count <= 0) player.hotbar[player.selected] = null;
      updateHotbar();
    }
  }
});

window.addEventListener('keyup', e => {
  keys[e.key] = false;
});
