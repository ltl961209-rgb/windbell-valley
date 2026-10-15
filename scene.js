const WORLD = { width: 3072, height: 2048 };
const point = (x, y) => ({ x: x * 2, y: y * 2 });

export const locations = [
  { id: 'tea', name: '风铃茶屋', ...point(390, 460), description: '茶汤升起细细的热气，屋檐下的风铃正在等风。' },
  { id: 'shrine', name: '古树神社', ...point(403, 202), description: '沿着苔石阶拾级而上，听见树叶替你许下愿望。' },
  { id: 'bridge', name: '听溪石桥', ...point(798, 427), description: '在桥中央停一会儿，让溪水带走赶路的心事。' },
  { id: 'mill', name: '山坡磨坊', ...point(1360, 250), description: '面粉、暖风和向日葵，都是山坡上慢慢转动的日常。' },
  { id: 'garden', name: '花间温室', ...point(1240, 620), description: '玻璃里住着春天，篱笆外开着不知名字的小花。' },
  { id: 'camp', name: '溪畔营地', ...point(680, 800), description: '给自己留一张溪边的椅子，今晚的星星会很亮。' },
  { id: 'tree', name: '风铃古树', ...point(370, 805), description: '把愿望轻轻挂在枝头，下一阵风会替你记得。' },
];

// 路段只沿画面里的小径、庭院和桥面连接；河道两岸通过桥相通。
const roads = [
  [[403, 202], [420, 238], [441, 286], [466, 333], [500, 373], [529, 414], [552, 445]],
  [[552, 445], [493, 459], [446, 465], [390, 460]],
  [[552, 445], [500, 483], [449, 514], [421, 559], [395, 615], [382, 676], [377, 741], [380, 804], [405, 858]],
  [[380, 804], [370, 805], [338, 811]],
  [[421, 559], [469, 574], [520, 599], [583, 622], [649, 640], [718, 655], [804, 675], [890, 706], [974, 746], [1012, 770]],
  [[583, 622], [562, 672], [527, 714], [519, 765], [555, 793], [620, 804], [680, 800]],
  [[382, 676], [437, 677], [484, 694], [527, 714]],
  [[405, 858], [456, 881], [501, 918], [564, 956], [649, 985], [741, 1002], [841, 1004], [946, 988], [1030, 957], [1093, 914], [1080, 883], [1046, 835], [1012, 770]],
  [[552, 445], [624, 425], [685, 415], [744, 416], [798, 427], [849, 448], [899, 476], [948, 507], [987, 530]],
  [[987, 530], [1005, 578], [1005, 624], [1068, 655], [1165, 686], [1286, 719], [1393, 755], [1509, 798]],
  [[987, 530], [1017, 482], [1065, 434], [1107, 393], [1176, 358], [1212, 337]],
  [[1212, 337], [1193, 300], [1169, 272], [1157, 243], [1172, 198], [1197, 176], [1254, 197], [1320, 238], [1360, 250], [1395, 256], [1484, 265]],
  [[1212, 337], [1293, 362], [1370, 346], [1446, 315], [1484, 265]],
  [[1172, 198], [1120, 157], [1087, 141], [1045, 112], [976, 111], [902, 88], [851, 60]],
  [[1157, 243], [1105, 244], [1060, 251]],
  [[1068, 655], [1147, 650], [1207, 632], [1240, 620], [1291, 598]],
  [[1012, 770], [1052, 738], [1102, 714], [1140, 709], [1165, 686]],
];

const nodes = [];
const edges = [];
const nodeLookup = new Map();
for (const line of roads) {
  let previous = null;
  for (const [x, y] of line) {
    const key = `${x},${y}`;
    if (!nodeLookup.has(key)) {
      nodeLookup.set(key, nodes.length);
      nodes.push({ ...point(x, y), neighbors: [] });
    }
    const index = nodeLookup.get(key);
    if (previous !== null) {
      const length = Math.hypot(nodes[index].x - nodes[previous].x, nodes[index].y - nodes[previous].y);
      nodes[previous].neighbors.push({ index, length });
      nodes[index].neighbors.push({ index: previous, length });
      edges.push({ a: previous, b: index, width: 39 });
    }
    previous = index;
  }
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
function project(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
  const q = { x: a.x + dx * t, y: a.y + dy * t };
  return { ...q, distance: distance(p, q) };
}

function nearestRoad(p) {
  let closest = null;
  for (const edge of edges) {
    const q = project(p, nodes[edge.a], nodes[edge.b]);
    if (!closest || q.distance < closest.distance) closest = { ...q, edge };
  }
  return closest;
}

function routeBetween(start, end) {
  const from = nearestRoad(start);
  const to = nearestRoad(end);
  if (from.edge === to.edge) return [{ x: to.x, y: to.y }];
  const costs = nodes.map(() => Infinity);
  const previous = nodes.map(() => -1);
  const done = new Set();
  for (const index of [from.edge.a, from.edge.b]) costs[index] = distance(from, nodes[index]);
  for (let i = 0; i < nodes.length; i++) {
    let index = -1;
    for (let j = 0; j < nodes.length; j++) {
      if (!done.has(j) && (index === -1 || costs[j] < costs[index])) index = j;
    }
    if (index === -1 || !Number.isFinite(costs[index])) break;
    done.add(index);
    for (const next of nodes[index].neighbors) {
      const cost = costs[index] + next.length;
      if (cost < costs[next.index]) {
        costs[next.index] = cost;
        previous[next.index] = index;
      }
    }
  }
  const last = [to.edge.a, to.edge.b].sort((a, b) => costs[a] + distance(nodes[a], to) - costs[b] - distance(nodes[b], to))[0];
  const path = [];
  for (let index = last; index !== -1; index = previous[index]) path.unshift({ x: nodes[index].x, y: nodes[index].y });
  if (distance(start, from) > 2) path.unshift({ x: from.x, y: from.y });
  path.push({ x: to.x, y: to.y });
  return path;
}

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`无法加载场景素材：${path}`));
    img.src = new URL(path, import.meta.url).href;
  });
}

export async function createScene(canvas, { onVisit, onTalk, onRegion, onMove } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('此浏览器无法创建 Canvas 2D 场景。');
  const names = ['traveler', 'tea-maker', 'gardener', 'cat'];
  const [background, ...frames] = await Promise.all([
    loadImage('./assets/valley.webp'),
    ...names.flatMap(name => Array.from({ length: 4 }, (_, index) => loadImage(`./assets/actors/${name}-${index}.webp`))),
  ]);
  const sprites = Object.fromEntries(names.map((name, index) => [name, frames.slice(index * 4, index * 4 + 4)]));
  const player = { id: 'traveler', ...point(531, 460), height: 108, speed: 174, facing: 1, moving: false, walk: 0, path: [] };
  const npcs = [
    { id: 'tea-maker', name: '阿禾爷爷', ...point(390, 460), height: 103, speed: 69, facing: 1, moving: false, walk: 0, wait: 3, stop: 0, path: [], stops: [[446, 465], [493, 459], [390, 460]] },
    { id: 'gardener', name: '小满', ...point(1240, 620), height: 105, speed: 76, facing: -1, moving: false, walk: 0, wait: 1, stop: 0, path: [], stops: [[1291, 598], [1207, 632], [1147, 650], [1240, 620]] },
    { id: 'cat', name: '小猫栗子', ...point(449, 514), height: 44, speed: 105, facing: -1, moving: false, walk: 0, wait: 5, stop: 0, path: [], stops: [[390, 460], [449, 514], [421, 559], [395, 615], [380, 804], [421, 559]] },
  ];
  const visited = new Set();
  const camera = { ...point(850, 500), zoom: 0.6 };
  let width = 1;
  let height = 1;
  let dpr = 1;
  let zoomMin = 0.2;
  const zoomMax = 1.5;
  let initialized = false;
  let mode = 'day';
  let dusk = 0;
  let paused = false;
  let inputEnabled = true;
  let follow = false;
  let time = 0;
  let last = performance.now();
  let lastMove = 0;
  let lastRegion = '';
  let destination = null;
  let raf = 0;
  let destroyed = false;
  const keys = new Set();
  const pointers = new Map();
  let drag = null;
  let pinch = null;
  let hoverNpc = null;
  let toastPoint = null;
  const listeners = [];
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  };
  let seed = 287;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const leaves = Array.from({ length: 34 }, () => ({ x: random() * WORLD.width, y: random() * WORLD.height, phase: random() * Math.PI * 2, size: 3 + random() * 4, speed: 10 + random() * 16 }));
  const fireflies = Array.from({ length: 35 }, () => ({ x: 600 + random() * 1700, y: 1040 + random() * 870, phase: random() * Math.PI * 2 }));
  const water = [[717, 180], [784, 292], [853, 358], [804, 512], [831, 568], [864, 617], [948, 684], [1129, 798], [1191, 852], [678, 897], [749, 900], [789, 934]];
  const chimneys = [[305, 236], [570, 211], [995, 121], [1194, 429]];
  canvas.style.touchAction = 'none';

  function constrainCamera() {
    const halfW = width / camera.zoom / 2;
    const halfH = height / camera.zoom / 2;
    camera.x = halfW >= WORLD.width / 2 ? WORLD.width / 2 : clamp(camera.x, halfW, WORLD.width - halfW);
    camera.y = halfH >= WORLD.height / 2 ? WORLD.height / 2 : clamp(camera.y, halfH, WORLD.height - halfH);
  }

  function resize() {
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width);
    height = Math.max(1, box.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    zoomMin = Math.max(width / WORLD.width, height / WORLD.height) * 0.92;
    if (!initialized) {
      camera.zoom = clamp(width / (width < 700 ? 1400 : 2300), zoomMin, zoomMax);
      initialized = true;
    } else camera.zoom = clamp(camera.zoom, zoomMin, zoomMax);
    if (width < 600) {
      camera.x = player.x;
      camera.y = player.y;
    }
    constrainCamera();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  function worldAt(x, y) {
    return { x: camera.x + (x - width / 2) / camera.zoom, y: camera.y + (y - height / 2) / camera.zoom };
  }
  function screenAt(p) {
    return { x: (p.x - camera.x) * camera.zoom + width / 2, y: (p.y - camera.y) * camera.zoom + height / 2 };
  }
  function eventPoint(event) {
    const box = canvas.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }
  function canInput() {
    return inputEnabled && !document.querySelector('dialog[open]');
  }
  function setZoom(value, anchor = { x: width / 2, y: height / 2 }) {
    const before = worldAt(anchor.x, anchor.y);
    camera.zoom = clamp(value, zoomMin, zoomMax);
    const after = worldAt(anchor.x, anchor.y);
    camera.x += before.x - after.x;
    camera.y += before.y - after.y;
    constrainCamera();
  }
  function walkTo(target) {
    player.path = routeBetween(player, target);
    destination = { ...target };
    follow = true;
    keys.clear();
    toastPoint = { ...target, until: time + 1.5 };
  }
  function clickAt(p) {
    if (!canInput() || paused) return;
    const world = worldAt(p.x, p.y);
    const npc = npcs.find(actor => Math.abs(world.x - actor.x) < 52 && world.y > actor.y - actor.height && world.y < actor.y + 20);
    if (npc) {
      if (distance(player, npc) < 235) {
        npc.wait = 7;
        npc.path = [];
        npc.moving = false;
        onTalk?.(npc.id);
      } else walkTo(nearestRoad(npc));
      return;
    }
    const nearest = nearestRoad(world);
    if (nearest.distance <= 120) walkTo(nearest);
    else toastPoint = { ...world, until: time + 0.6, blocked: true };
  }

  listen(canvas, 'pointerdown', event => {
    if (!canInput() || (event.button !== 0 && event.button !== 1)) return;
    canvas.focus({ preventScroll: true });
    const p = eventPoint(event);
    pointers.set(event.pointerId, p);
    canvas.setPointerCapture(event.pointerId);
    if (pointers.size === 1) drag = { pointer: event.pointerId, start: p, last: p, moved: false };
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { distance: distance(a, b), zoom: camera.zoom };
      if (drag) drag.moved = true;
      follow = false;
    }
  });
  listen(canvas, 'pointermove', event => {
    const p = eventPoint(event);
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, p);
    if (pointers.size >= 2 && pinch) {
      const [a, b] = [...pointers.values()];
      setZoom(pinch.zoom * distance(a, b) / pinch.distance, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      return;
    }
    if (drag?.pointer === event.pointerId) {
      if (distance(p, drag.start) > 6) drag.moved = true;
      if (drag.moved) {
        camera.x -= (p.x - drag.last.x) / camera.zoom;
        camera.y -= (p.y - drag.last.y) / camera.zoom;
        follow = false;
        constrainCamera();
      }
      drag.last = p;
      canvas.style.cursor = drag.moved ? 'grabbing' : 'grab';
    } else {
      const w = worldAt(p.x, p.y);
      hoverNpc = npcs.find(npc => Math.abs(w.x - npc.x) < 48 && w.y < npc.y + 15 && w.y > npc.y - npc.height) || null;
      canvas.style.cursor = hoverNpc ? 'pointer' : 'grab';
    }
  });
  function endPointer(event) {
    if (event.type === 'pointerup' && drag?.pointer === event.pointerId && !drag.moved && pointers.size === 1) clickAt(eventPoint(event));
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
    if (drag?.pointer === event.pointerId) drag = null;
    canvas.style.cursor = 'grab';
  }
  listen(canvas, 'pointerup', endPointer);
  listen(canvas, 'pointercancel', endPointer);
  listen(canvas, 'lostpointercapture', event => { pointers.delete(event.pointerId); if (drag?.pointer === event.pointerId) drag = null; });
  listen(canvas, 'dblclick', event => {
    if (!canInput()) return;
    event.preventDefault();
    setZoom(camera.zoom * 1.35, eventPoint(event));
  });
  listen(canvas, 'wheel', event => {
    if (!canInput()) return;
    event.preventDefault();
    follow = false;
    setZoom(camera.zoom * Math.exp(-event.deltaY * 0.0012), eventPoint(event));
  }, { passive: false });
  const movementKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D']);
  listen(window, 'keydown', event => {
    if (!movementKeys.has(event.key) || !canInput() || paused || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target instanceof HTMLElement && (event.target.matches('input, textarea, select') || event.target.isContentEditable)) return;
    event.preventDefault();
    keys.add(event.key.toLowerCase());
    player.path = [];
    destination = null;
    follow = true;
  });
  listen(window, 'keyup', event => keys.delete(event.key.toLowerCase()));
  listen(window, 'blur', () => { keys.clear(); pointers.clear(); drag = null; pinch = null; });
  listen(document, 'visibilitychange', () => { keys.clear(); last = performance.now(); });

  function advance(actor, dt) {
    actor.moving = false;
    let remaining = actor.speed * dt;
    while (remaining > 0 && actor.path.length) {
      const target = actor.path[0];
      const length = distance(actor, target);
      if (length < 0.5) { actor.path.shift(); continue; }
      const amount = Math.min(remaining, length);
      const dx = (target.x - actor.x) / length;
      const dy = (target.y - actor.y) / length;
      actor.x += dx * amount;
      actor.y += dy * amount;
      if (Math.abs(dx) > 0.1) actor.facing = dx > 0 ? 1 : -1;
      actor.moving = true;
      actor.walk += amount;
      remaining -= amount;
      if (amount >= length) actor.path.shift();
    }
  }

  function update(dt) {
    if (paused) return;
    time += dt;
    dusk += ((mode === 'dusk' ? 1 : 0) - dusk) * Math.min(1, dt * 1.2);
    const horizontal = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    const vertical = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
    if (canInput()) {
      if (horizontal || vertical) {
        const length = Math.hypot(horizontal, vertical);
        const dx = horizontal / length * player.speed * dt;
        const dy = vertical / length * player.speed * dt;
        const before = { x: player.x, y: player.y };
        for (const candidate of [{ x: player.x + dx, y: player.y + dy }, { x: player.x + dx, y: player.y }, { x: player.x, y: player.y + dy }]) {
          const road = nearestRoad(candidate);
          if (road.distance <= road.edge.width) {
            player.x = candidate.x;
            player.y = candidate.y;
            break;
          }
        }
        const step = distance(before, player);
        player.moving = step > 0.01;
        player.walk += step;
        if (horizontal) player.facing = horizontal;
      } else advance(player, dt);
      if (!player.path.length && destination && distance(player, destination) < 6) destination = null;
    } else {
      keys.clear();
      player.moving = false;
    }
    for (const npc of npcs) {
      if (npc.path.length) advance(npc, dt);
      else {
        npc.moving = false;
        npc.wait -= dt;
        if (npc.wait <= 0) {
          const next = npc.stops[npc.stop % npc.stops.length];
          npc.path = routeBetween(npc, point(next[0], next[1]));
          npc.stop++;
          npc.wait = npc.id === 'cat' ? 4.5 + random() * 5 : 3 + random() * 4;
        }
      }
    }
    if (follow && !drag) {
      const amount = 1 - Math.exp(-dt * 2.8);
      camera.x += (player.x - camera.x) * amount;
      camera.y += (player.y - camera.y) * amount;
      constrainCamera();
    }
    let closest = locations[0];
    for (const location of locations) {
      if (distance(player, location) < distance(player, closest)) closest = location;
      if (distance(player, location) < 94 && !visited.has(location.id)) {
        visited.add(location.id);
        onVisit?.(location.id);
      }
    }
    if (lastRegion !== closest.id) {
      lastRegion = closest.id;
      onRegion?.(closest.id);
    }
    if (time - lastMove >= 0.1) {
      lastMove = time;
      onMove?.({ x: player.x, y: player.y, moving: player.moving });
    }
  }

  function drawWater() {
    ctx.save();
    ctx.lineWidth = 1.8;
    for (let i = 0; i < water.length; i++) {
      const [x, y] = water[i];
      const phase = (time * 0.42 + i * 0.37) % 1;
      ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.27;
      ctx.strokeStyle = '#fff7cb';
      ctx.beginPath();
      ctx.ellipse(x * 2 + Math.sin(time + i) * 5, y * 2 + phase * 18, 10 + phase * 28, 2 + phase * 4, -0.1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha *= 0.6;
      ctx.beginPath();
      ctx.moveTo(x * 2 - 18, y * 2 + phase * 18 + 17);
      ctx.quadraticCurveTo(x * 2, y * 2 + phase * 18 + 22, x * 2 + 21, y * 2 + phase * 18 + 15);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPath() {
    if (!player.path.length) return;
    ctx.save();
    ctx.strokeStyle = '#fff0ac';
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 3 / camera.zoom;
    ctx.setLineDash([1 / camera.zoom, 10 / camera.zoom]);
    ctx.lineDashOffset = -time * 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    for (const p of player.path) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();
    if (destination) {
      ctx.save();
      ctx.strokeStyle = '#fff7d2';
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2 / camera.zoom;
      ctx.beginPath();
      ctx.ellipse(destination.x, destination.y, 18 + Math.sin(time * 3) * 3, 9 + Math.sin(time * 3) * 1.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawActor(actor) {
    const moving = actor.moving && !paused;
    const frame = moving ? Math.floor(actor.walk / 20) % 4 : 0;
    const img = sprites[actor.id][frame];
    const spriteWidth = actor.height * img.width / img.height;
    const bob = moving ? Math.sin(actor.walk / 20 * Math.PI) * 1.2 : Math.sin(time * 1.7 + actor.x) * 0.65;
    ctx.save();
    ctx.fillStyle = 'rgba(29,39,21,.26)';
    ctx.beginPath();
    ctx.ellipse(actor.x, actor.y - 2, actor.id === 'cat' ? 21 : 22, actor.id === 'cat' ? 7 : 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(actor.x, actor.y + bob);
    ctx.scale(actor.facing, 1);
    ctx.drawImage(img, -spriteWidth / 2, -actor.height, spriteWidth, actor.height);
    ctx.restore();
    if (actor.id === 'traveler') {
      const s = screenAt({ x: actor.x, y: actor.y - actor.height - 14 });
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#fcf5cf';
      ctx.strokeStyle = '#5b6c3b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x - 4, s.y - 4);
      ctx.lineTo(s.x + 4, s.y - 4);
      ctx.lineTo(s.x, s.y + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (distance(player, actor) < 235 || hoverNpc === actor) {
      const s = screenAt({ x: actor.x, y: actor.y - actor.height - 13 });
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#fbf6e6';
      ctx.strokeStyle = '#b8b394';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(s.x - 12, s.y - 10, 24, 19, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#5b6c3b';
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(s.x + i * 4, s.y - 0.5, 1.2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  }

  function drawAtmosphere() {
    ctx.save();
    for (let i = 0; i < chimneys.length; i++) {
      const [x, y] = chimneys[i];
      for (let n = 0; n < 5; n++) {
        const phase = (time * 0.11 + n * 0.2 + i * 0.17) % 1;
        ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.07;
        ctx.fillStyle = '#f7edd1';
        ctx.beginPath();
        ctx.ellipse(x * 2 + phase * 50 + Math.sin(phase * 7 + i) * 8, y * 2 - phase * 135, 9 + phase * 23, 10 + phase * 28, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 0.68;
    for (const leaf of leaves) {
      const x = (leaf.x + time * leaf.speed) % WORLD.width;
      const y = (leaf.y + time * leaf.speed * 0.26 + Math.sin(time * 0.7 + leaf.phase) * 16) % WORLD.height;
      ctx.fillStyle = leaf.phase > Math.PI ? '#d9ba68' : '#c1ce83';
      ctx.beginPath();
      ctx.ellipse(x, y, leaf.size, Math.max(0.6, Math.abs(Math.cos(time * 1.7 + leaf.phase)) * leaf.size * 0.4), Math.sin(time + leaf.phase), 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 9; i++) {
      const base = i < 5 ? point(1220 + i * 25, 617 + i * 12) : point(485 + i * 20, 744 + i * 8);
      const x = base.x + Math.sin(time * 0.6 + i * 2) * 35;
      const y = base.y + Math.cos(time * 0.9 + i) * 21;
      const wing = 2 + Math.abs(Math.sin(time * 14 + i)) * 6;
      ctx.fillStyle = i % 2 ? '#fff5bb' : '#f5dba1';
      ctx.beginPath();
      ctx.ellipse(x - wing / 2, y, wing, 2.5, -0.65, 0, Math.PI * 2);
      ctx.ellipse(x + wing / 2, y, wing, 2.5, 0.65, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.44;
    ctx.strokeStyle = '#394d35';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const x = (time * 53 + i * 43) % (WORLD.width + 400) - 200;
      const y = 330 + i * 30 + Math.sin(time * 0.3 + i) * 90;
      const wing = Math.sin(time * 7 + i) * 7;
      ctx.beginPath();
      ctx.moveTo(x - 13, y - wing);
      ctx.quadraticCurveTo(x - 4, y - 3, x, y + 2);
      ctx.quadraticCurveTo(x + 4, y - 3, x + 13, y - wing);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLighting() {
    if (dusk < 0.005) return;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = `rgba(48,41,77,${dusk * 0.35})`;
    ctx.fillRect(0, 0, width, height);
    const glow = ctx.createLinearGradient(0, 0, width, height);
    glow.addColorStop(0, `rgba(255,174,86,${dusk * 0.22})`);
    glow.addColorStop(0.6, 'rgba(255,174,86,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.setTransform(dpr * camera.zoom, 0, 0, dpr * camera.zoom, dpr * (width / 2 - camera.x * camera.zoom), dpr * (height / 2 - camera.y * camera.zoom));
    ctx.globalCompositeOperation = 'screen';
    for (const [x, y] of [[400, 371], [345, 359], [548, 285], [1211, 477], [692, 767], [1364, 150], [287, 109]]) {
      const radius = 40 + Math.sin(time * 2 + x) * 4;
      const light = ctx.createRadialGradient(x * 2, y * 2, 0, x * 2, y * 2, radius);
      light.addColorStop(0, `rgba(255,180,65,${dusk * 0.52})`);
      light.addColorStop(1, 'rgba(255,167,62,0)');
      ctx.fillStyle = light;
      ctx.fillRect(x * 2 - radius, y * 2 - radius, radius * 2, radius * 2);
    }
    for (const fly of fireflies) {
      const x = fly.x + Math.sin(time * 0.65 + fly.phase) * 22;
      const y = fly.y + Math.sin(time * 0.8 + fly.phase * 2) * 13;
      const alpha = dusk * (0.3 + Math.sin(time * 2 + fly.phase) * 0.3);
      ctx.fillStyle = `rgba(250,243,137,${alpha})`;
      ctx.shadowColor = '#f8ee8c';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#d6d7b4';
    ctx.fillRect(0, 0, width, height);
    ctx.setTransform(dpr * camera.zoom, 0, 0, dpr * camera.zoom, dpr * (width / 2 - camera.x * camera.zoom), dpr * (height / 2 - camera.y * camera.zoom));
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(background, 0, 0, WORLD.width, WORLD.height);
    drawWater();
    drawPath();
    for (const actor of [...npcs, player].sort((a, b) => a.y - b.y)) drawActor(actor);
    drawAtmosphere();
    if (toastPoint && toastPoint.until > time && !destination) {
      ctx.save();
      ctx.globalAlpha = clamp((toastPoint.until - time) * 1.3, 0, 0.65);
      ctx.strokeStyle = toastPoint.blocked ? '#fff5dd' : '#fff1a9';
      ctx.lineWidth = 2 / camera.zoom;
      ctx.beginPath();
      ctx.ellipse(toastPoint.x, toastPoint.y, 17, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    drawLighting();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.35, width / 2, height / 2, Math.max(width, height) * 0.76);
    vignette.addColorStop(0, 'rgba(38,51,24,0)');
    vignette.addColorStop(1, 'rgba(38,51,24,.17)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  function tick(now) {
    if (destroyed) return;
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  return {
    locations,
    setMode(value) { if (value === 'day' || value === 'dusk') { mode = value; if (paused) dusk = value === 'dusk' ? 1 : 0; } },
    setPaused(value) { paused = Boolean(value); if (paused) keys.clear(); },
    setInputEnabled(value) { inputEnabled = Boolean(value); if (!inputEnabled) keys.clear(); },
    setZoom,
    zoomBy(factor) { setZoom(camera.zoom * factor); },
    goTo(id) {
      const location = locations.find(item => item.id === id);
      if (location) { walkTo(location); return true; }
      return false;
    },
    home() {
      follow = false;
      camera.x = 1700;
      camera.y = 1000;
      camera.zoom = clamp(width / (width < 700 ? 1400 : 2300), zoomMin, zoomMax);
      constrainCamera();
    },
    setFollow(value) {
      follow = Boolean(value);
      if (follow) {
        camera.x = player.x;
        camera.y = player.y;
        constrainCamera();
      }
    },
    getState() {
      return { player: { x: player.x, y: player.y, moving: player.moving }, camera: { ...camera }, mode, paused, follow, zoomMin, zoomMax, visited: [...visited], progress: visited.size / locations.length, npcs: npcs.map(({ id, x, y, moving }) => ({ id, x, y, moving })), destination: destination ? { x: destination.x, y: destination.y } : null, world: { ...WORLD } };
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      for (const remove of listeners) remove();
      keys.clear();
      pointers.clear();
    },
  };
}
