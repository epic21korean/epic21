// EPIC21 「시원시원한 여자」 3D MV — deterministic renderer (t -> frame)
window.MVBUILD = function (LIB) {
const T = LIB.THREE;
const W = 1920, H = 1080, BEAT = 60 / 133.93, B0 = 0.30;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, u) => a + (b - a) * u;
const rnd = s => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const ease = u => sm(u);
const V = (x, y, z) => new T.Vector3(x, y, z);

// ---------- renderer ----------
const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(40, W / H, 0.1, 300);
const composer = new LIB.EffectComposer(renderer);
composer.addPass(new LIB.RenderPass(scene, camera));
const bloom = new LIB.UnrealBloomPass(new T.Vector2(W / 2, H / 2), 0.7, 0.5, 0.97);
composer.addPass(bloom);
composer.addPass(new LIB.OutputPass());
const out = document.createElement('canvas'); out.width = W; out.height = H;
let g2 = out.getContext('2d');

// ---------- materials ----------
const grad = (() => { const d = new Uint8Array([90, 170, 255]); const t = new T.DataTexture(d, 3, 1, T.RedFormat); t.needsUpdate = true; t.minFilter = t.magFilter = T.NearestFilter; return t; })();
const toon = (c, e = 0) => new T.MeshToonMaterial({ color: c, gradientMap: grad, emissive: c, emissiveIntensity: e });
const glow = (c, k = 2.2) => new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k) });
const black = new T.MeshBasicMaterial({ color: 0x1a0d22, side: T.BackSide });
function M(geo, mat, parent, pos, outline = 0.035) {
  const m = new T.Mesh(geo, mat); if (pos) m.position.copy(pos);
  m.castShadow = true; m.receiveShadow = true;
  if (outline) { const o = new T.Mesh(geo, black); o.scale.setScalar(1 + outline / Math.max(0.05, geoSize(geo))); m.add(o); }
  if (parent) parent.add(m); return m;
}
function geoSize(g) { g.computeBoundingSphere(); return g.boundingSphere.radius; }
const G = {
  sph: (r, s = 32) => new T.SphereGeometry(r, s, Math.round(s * 0.7)),
  cyl: (a, b, h, s = 28) => new T.CylinderGeometry(a, b, h, s),
  cap: (r, l) => new T.CapsuleGeometry(r, l, 6, 16),
  box: (x, y, z) => new T.BoxGeometry(x, y, z),
  tor: (r, t, arc = Math.PI * 2) => new T.TorusGeometry(r, t, 12, 40, arc),
};
const heartShape = (() => { const s = new T.Shape(); s.moveTo(0, -0.5); s.bezierCurveTo(-0.1, -0.35, -0.6, -0.1, -0.6, 0.2); s.bezierCurveTo(-0.6, 0.55, -0.15, 0.6, 0, 0.3); s.bezierCurveTo(0.15, 0.6, 0.6, 0.55, 0.6, 0.2); s.bezierCurveTo(0.6, -0.1, 0.1, -0.35, 0, -0.5); return s; })();
const heartGeo = new T.ExtrudeGeometry(heartShape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 4, curveSegments: 18 }); heartGeo.center();

// ---------- lights ----------
const hemi = new T.HemisphereLight(0xc9b8ff, 0x402060, 1.3); scene.add(hemi);
const key = new T.DirectionalLight(0xfff0e0, 2.2); key.position.set(-6, 12, 10); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 }); scene.add(key);
const pinkL = new T.PointLight(0xff3fa8, 30, 18); scene.add(pinkL);
const cyanL = new T.PointLight(0x30e0ff, 30, 18); scene.add(cyanL);

// ---------- sky ----------
const skyMat = new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, uniforms: { dawn: { value: 0 }, gold: { value: 0 } },
  vertexShader: 'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform float dawn,gold;varying vec3 p;void main(){float h=clamp(p.y*1.6+0.08,0.,1.);vec3 top=vec3(.07,.03,.22);vec3 hor=mix(vec3(.95,.25,.6),vec3(1.,.6,.35),dawn);hor=mix(hor,vec3(1.,.75,.2),gold);vec3 c=mix(hor,top,pow(h,.55));gl_FragColor=vec4(c,1.);}' });
scene.add(new T.Mesh(new T.SphereGeometry(150, 32, 16), skyMat));
const stars = new T.InstancedMesh(G.sph(0.18, 6), glow(0xffffff, 2), 260);
{ const m = new T.Matrix4(); for (let i = 0; i < 260; i++) { const a = rnd(i) * 6.28, e = 0.15 + rnd(i + 9) * 1.2, r = 120; m.makeTranslation(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r - 20); stars.setMatrixAt(i, m); } }
scene.add(stars);
const moon = M(G.sph(4, 40), glow(0xfff4c8, 1.6), scene, V(18, 26, -80), 0);

// ---------- world: rooftop pool party ----------
const world = new T.Group(); scene.add(world);
const floor = new T.Mesh(new T.CircleGeometry(40, 64), toon(0x8a5cc8)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);
// tiles ring
for (let i = 0; i < 2; i++) { const r = new T.Mesh(new T.RingGeometry(7 + i * 5, 7.3 + i * 5, 64), glow(i ? 0xff5fd0 : 0x55f0ff, 1.4)); r.rotation.x = -Math.PI / 2; r.position.y = 0.01; world.add(r); }
// pool
const poolGeo = new T.PlaneGeometry(4.2, 7, 40, 60); poolGeo.rotateX(-Math.PI / 2);
const pool = new T.Mesh(poolGeo, new T.MeshToonMaterial({ color: 0x23d5ff, gradientMap: grad, emissive: 0x0a80c0, emissiveIntensity: 0.2 })); pool.position.set(0, 0.07, -0.5); world.add(pool);
M(G.box(4.6, 0.1, 7.4), toon(0xd9c9ff), world, V(0, -0.02, -0.5), 0);
const poolBase = poolGeo.attributes.position.array.slice();
// rim neon
for (const [w, d, x, z] of [[4.6, 0.06, 0, 3.2], [4.6, 0.06, 0, -4.2], [0.06, 7.4, 2.3, -0.5], [0.06, 7.4, -2.3, -0.5]]) { const r = new T.Mesh(G.box(w, 0.05, d), glow(0x7ff7ff, 2)); r.position.set(x, 0.06, z); world.add(r); }
// skyline
const skyline = new T.InstancedMesh(G.box(1, 1, 1), toon(0x2a1650), 60); const winMesh = new T.InstancedMesh(new T.PlaneGeometry(0.35, 0.5), glow(0xffd28a, 1.5), 700);
{ const m = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(); let wi = 0;
  for (let i = 0; i < 60; i++) { const x = -60 + i * 2.1 + rnd(i) * 1.5, h = 6 + rnd(i + 3) * 22, w = 1.6 + rnd(i + 7) * 1.4, z = -34 - rnd(i + 5) * 10;
    m.compose(V(x, h / 2 - 4, z), q, s.set(w, h, 2)); skyline.setMatrixAt(i, m);
    for (let k = 0; k < 12 && wi < 700; k++) { if (rnd(i * 31 + k) < 0.45) continue; m.makeTranslation(x - w / 2 + 0.4 + rnd(i * 7 + k) * (w - 0.8), -3 + rnd(i * 13 + k) * (h - 2), z + 1.02); winMesh.setMatrixAt(wi++, m); } }
  winMesh.count = wi; }
world.add(skyline, winMesh);
// palms
function palm(x, z, s) { const p = new T.Group(); p.position.set(x, 0, z); p.scale.setScalar(s);
  for (let i = 0; i < 7; i++) M(G.cyl(0.16, 0.2, 0.62, 12), toon(0xa0683a), p, V(i * 0.06, 0.3 + i * 0.6, 0), 0.02);
  for (let i = 0; i < 7; i++) { const l = M(new T.ConeGeometry(0.35, 2.4, 6), toon(0x2fd27a), p, V(0.45, 4.3, 0), 0.03); l.rotation.set(0, i * 0.9, 1.9); l.position.set(0.4 + Math.cos(i * 0.9) * 0.9, 4.1, -Math.sin(i * 0.9) * 0.9); l.lookAt(V(x + 0.4, 4.2, z).add(V(Math.cos(i * 0.9) * 4, -1.5, -Math.sin(i * 0.9) * 4))); l.rotateX(Math.PI / 2); }
  world.add(p); return p; }
palm(-8, -5, 1.1); palm(8.5, -6, 1.2); palm(-11, 2, 0.9); palm(11, 1, 1.0);
// string lights
const bulbs = []; const bulbCols = [0xff4fb0, 0xffe14d, 0x55f0ff, 0x8dff6a, 0xff8a3d];
for (let L = 0; L < 3; L++) { const z = -6 + L * 3.5; for (let i = 0; i <= 22; i++) { const u = i / 22, x = -9 + u * 18, y = 5.2 - Math.sin(u * Math.PI) * 1.1;
  const b = new T.Mesh(G.sph(0.09, 8), glow(bulbCols[(i + L) % 5], 2.5)); b.position.set(x, y, z); world.add(b); bulbs.push(b); } }
for (const x of [-9, 9]) for (const z of [-6, -2.5, 1]) M(G.cyl(0.06, 0.06, 5.2, 8), toon(0x333344), world, V(x, 2.6, z), 0);
// neon heart sign
const neonHeart = new T.Mesh(heartGeo, glow(0xff3fa8, 2.6)); neonHeart.scale.setScalar(2.2); neonHeart.position.set(0, 5.6, -9); world.add(neonHeart);
const neonRing = new T.Mesh(G.tor(2.1, 0.06), glow(0x55f0ff, 2.4)); neonRing.position.set(0, 5.6, -9.1); world.add(neonRing);
// tables & stools
function table(x, z, col) { const g = new T.Group(); g.position.set(x, 0, z); M(G.cyl(0.7, 0.7, 0.08), toon(0xd9c9ff), g, V(0, 1.05, 0)); M(G.cyl(0.07, 0.07, 1.0, 10), toon(0xdddddd), g, V(0, 0.5, 0)); M(G.cyl(0.4, 0.45, 0.06), toon(0xdddddd), g, V(0, 0.03, 0)); world.add(g); return g; }
function stool(x, z, col) { const g = new T.Group(); g.position.set(x, 0, z); M(G.cyl(0.32, 0.32, 0.12), toon(col), g, V(0, 0.86, 0)); M(G.cyl(0.05, 0.05, 0.8, 8), toon(0xcccccc), g, V(0, 0.42, 0)); M(G.tor(0.22, 0.025), toon(0xcccccc), g, V(0, 0.35, 0)).rotation.x = Math.PI / 2; world.add(g); return g; }
const herTable = table(-3.1, 0.9), hisTable = table(3.1, 0.6);
const herStool = stool(-3.6, 1.8, 0xff5fa2), hisStool = stool(3.6, 1.5, 0x3fb7ff);
// drinks on tables
function drink(parent, col) { const d = new T.Group(); M(G.cyl(0.11, 0.08, 0.3, 16), new T.MeshToonMaterial({ color: col, gradientMap: grad, transparent: true, opacity: 0.85 }), d, V(0, 0.15, 0), 0.02); M(G.cyl(0.012, 0.012, 0.4, 6), toon(0xffffff), d, V(0.04, 0.3, 0), 0); M(G.sph(0.05, 10), toon(0xff2244), d, V(-0.05, 0.32, 0), 0.01); parent.add(d); return d; }
drink(herTable, 0xff7ac8).position.set(0.25, 1.09, 0.1); drink(hisTable, 0x7ae0ff).position.set(-0.25, 1.09, 0.1);
// exit door
const door = new T.Group(); door.position.set(-9.5, 0, -1.5); door.rotation.y = Math.PI / 2; world.add(door);
M(G.box(1.8, 3.0, 0.2), toon(0x44405a), door, V(0, 1.5, 0), 0.02);
const doorPanel = new T.Group(); doorPanel.position.set(-0.75, 0, 0.11); door.add(doorPanel); M(G.box(1.5, 2.7, 0.08), toon(0xf2b84b), doorPanel, V(0.75, 1.35, 0), 0.02);
const exitCv = document.createElement('canvas'); exitCv.width = 256; exitCv.height = 128; { const c = exitCv.getContext('2d'); c.fillStyle = '#0fbf5a'; c.fillRect(0, 0, 256, 128); c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineWidth = 12; c.lineCap = 'round';
  c.beginPath(); c.arc(80, 30, 13, 0, 7); c.fill(); c.beginPath(); c.moveTo(78, 46); c.lineTo(68, 80); c.lineTo(90, 100); c.moveTo(68, 80); c.lineTo(48, 106); c.moveTo(76, 55); c.lineTo(100, 66); c.moveTo(76, 55); c.lineTo(55, 60); c.stroke();
  c.beginPath(); c.moveTo(140, 64); c.lineTo(215, 64); c.moveTo(195, 42); c.lineTo(220, 64); c.lineTo(195, 86); c.stroke(); }
const exitSign = new T.Mesh(new T.PlaneGeometry(0.9, 0.45), new T.MeshBasicMaterial({ map: new T.CanvasTexture(exitCv) })); exitSign.material.map.colorSpace = T.SRGBColorSpace; exitSign.material.color.setScalar(1.6); exitSign.position.set(0, 3.35, 0.12); door.add(exitSign);

// ---------- characters ----------
function makeChar(girl) {
  const C = { root: new T.Group() }; const skin = toon(0xffd9c2);
  const shirt = toon(girl ? 0xff4f9a : 0x2bc4e8), pants = toon(girl ? 0xffffff : 0x26335c), hairM = toon(girl ? 0x4a2418 : 0x1d1a26);
  C.hips = new T.Group(); C.hips.position.y = 0.75; C.root.add(C.hips);
  C.spine = new T.Group(); C.hips.add(C.spine);
  if (girl) { M(new T.CylinderGeometry(0.22, 0.52, 0.5, 28), shirt, C.spine, V(0, -0.02, 0)); M(G.cyl(0.2, 0.24, 0.42), shirt, C.spine, V(0, 0.42, 0)); M(G.tor(0.215, 0.035), toon(0x3ff0c8), C.spine, V(0, 0.24, 0), 0.01).rotation.x = Math.PI / 2; }
  else { M(G.cyl(0.24, 0.26, 0.55), shirt, C.spine, V(0, 0.33, 0)); M(G.cyl(0.25, 0.26, 0.2), pants, C.spine, V(0, 0.02, 0));
    for (let i = 0; i < 6; i++) M(G.sph(0.045, 8), toon(0xffe14d), C.spine, V(Math.cos(i * 1.7) * 0.25, 0.2 + (i % 3) * 0.13, Math.sin(i * 1.7) * 0.25), 0); }
  C.neck = new T.Group(); C.neck.position.y = 0.66; C.spine.add(C.neck);
  C.head = new T.Group(); C.neck.add(C.head);
  M(G.sph(0.56, 40), skin, C.head, V(0, 0.5, 0), 0.03);
  // face
  C.eyes = []; C.happy = [];
  for (const s of [-1, 1]) { const e = M(G.sph(0.085, 16), toon(0x1a0d22), C.head, V(s * 0.2, 0.5, 0.5), 0); e.scale.set(0.85, 1.25, 0.6);
    M(G.sph(0.03, 8), new T.MeshBasicMaterial({ color: 0xffffff }), e, V(0.03, 0.04, 0.07), 0); C.eyes.push(e);
    const hp = M(G.tor(0.07, 0.018, Math.PI), toon(0x1a0d22), C.head, V(s * 0.2, 0.48, 0.53), 0); hp.visible = false; C.happy.push(hp);
    if (girl) { const bl = M(G.sph(0.07, 12), toon(0xff8fb0), C.head, V(s * 0.33, 0.36, 0.43), 0); bl.scale.set(1, 0.55, 0.4); }
    if (girl) for (let k = 0; k < 2; k++) { const l = M(G.cyl(0.006, 0.006, 0.06, 4), toon(0x1a0d22), e, V(s * (0.05 + k * 0.03), 0.09, 0), 0); l.rotation.z = -s * (0.4 + k * 0.4); } }
  C.smile = M(G.tor(0.08, 0.018, Math.PI), toon(0xb3264f), C.head, V(0, 0.3, 0.53), 0); C.smile.rotation.z = Math.PI;
  C.open = M(G.sph(0.075, 16), toon(0x9e1f3f), C.head, V(0, 0.28, 0.52), 0); C.open.scale.set(1, 1, 0.4);
  // hair
  if (girl) { const h = M(G.sph(0.6, 40), hairM, C.head, V(0, 0.58, -0.06)); h.scale.set(1.02, 1, 1);
    const bang = M(G.sph(0.42, 24), hairM, C.head, V(0, 0.82, 0.3), 0.02); bang.scale.set(1.25, 0.45, 0.6);
    C.pony = new T.Group(); C.pony.position.set(0, 0.95, -0.45); C.head.add(C.pony);
    for (let i = 0; i < 4; i++) M(G.sph(0.2 - i * 0.03, 16), hairM, C.pony, V(0, -i * 0.2, -0.12 - i * 0.04), 0.02);
    M(G.tor(0.12, 0.04), toon(0x3ff0c8), C.pony, V(0, 0.05, -0.05), 0.01).rotation.x = Math.PI / 2;
    // sunglasses + tiara (summer queen)
    for (const s of [-1, 1]) { const gl = M(G.sph(0.13, 16), toon(0x2a1a3a), C.head, V(s * 0.17, 1.02, 0.22), 0.01); gl.scale.set(1.15, 0.8, 0.35); gl.rotation.x = -0.6; }
    const tia = M(G.tor(0.3, 0.03, Math.PI), toon(0xffd23f, 0.4), C.head, V(0, 1.02, 0.0), 0.01); tia.rotation.set(-0.3, 0, 0);
    for (let i = -1; i <= 1; i++) M(new T.ConeGeometry(0.05, 0.14, 8), toon(0xffd23f, 0.4), C.head, V(i * 0.18, 1.25 - Math.abs(i) * 0.06, 0.05 - Math.abs(i) * 0.03), 0.01);
  } else { const h = M(G.sph(0.6, 40), hairM, C.head, V(0, 0.65, -0.05)); h.scale.set(1.03, 0.82, 1.02);
    for (let i = -2; i <= 2; i++) { const sp = M(new T.ConeGeometry(0.12, 0.3, 8), hairM, C.head, V(i * 0.16, 0.98, 0.3), 0.01); sp.rotation.x = 0.9; } }
  // arms
  const arm = (s) => { const sh = new T.Group(); sh.position.set(s * 0.29, 0.58, 0); C.spine.add(sh);
    M(G.cap(0.075, 0.25), girl ? skin : shirt, sh, V(0, -0.17, 0), 0.02);
    const el = new T.Group(); el.position.y = -0.33; sh.add(el); M(G.cap(0.068, 0.22), skin, el, V(0, -0.15, 0), 0.02);
    const hd = new T.Group(); hd.position.y = -0.33; el.add(hd); M(G.sph(0.1, 16), skin, hd, V(0, 0, 0), 0.02);
    const fg = M(G.cap(0.03, 0.12), skin, hd, V(0, -0.12, 0.02), 0.01); fg.visible = false;
    const th = M(G.cap(0.035, 0.08), skin, hd, V(s * -0.06, 0.08, 0.04), 0.01); th.visible = false;
    return { sh, el, hd, fg, th }; };
  C.L = arm(1); C.R = arm(-1);
  const leg = (s) => { const hp = new T.Group(); hp.position.set(s * 0.14, 0, 0); C.hips.add(hp);
    M(G.cap(0.09, 0.22), girl ? skin : pants, hp, V(0, -0.2, 0), 0.02);
    const kn = new T.Group(); kn.position.y = -0.38; hp.add(kn); M(G.cap(0.08, 0.2), skin, kn, V(0, -0.16, 0), 0.02);
    const sh = M(G.sph(0.12, 16), toon(girl ? 0xffffff : 0xff6a3d), kn, V(0, -0.34, 0.05), 0.02); sh.scale.set(0.9, 0.6, 1.5);
    return { hp, kn }; };
  C.LL = leg(1); C.RL = leg(-1);
  C.set = (p) => {
    const q = Object.assign({ x: 0, y: 0, z: 0, ry: 0, lean: 0, twist: 0, side: 0, hx: 0, hy: 0, hz: 0, lsx: 0, lsz: 0.12, lex: 0, rsx: 0, rsz: -0.12, rex: 0, llx: 0, rlx: 0, lkx: 0, rkx: 0, mouth: 0, eye: 'open', lfg: 0, rfg: 0, lth: 0, rth: 0, pony: 0, lhz: 0, rhz: 0, sc: 1 }, p);
    C.root.position.set(q.x, q.y, q.z); C.root.rotation.y = q.ry; C.root.scale.setScalar(q.sc);
    C.spine.rotation.set(q.lean, q.twist, q.side); C.head.rotation.set(q.hx, q.hy, q.hz);
    C.L.sh.rotation.set(q.lsx, 0, q.lsz); C.L.el.rotation.x = q.lex; C.R.sh.rotation.set(q.rsx, 0, q.rsz); C.R.el.rotation.x = q.rex;
    C.L.hd.rotation.z = q.lhz; C.R.hd.rotation.z = q.rhz;
    C.LL.hp.rotation.x = q.llx; C.RL.hp.rotation.x = q.rlx; C.LL.kn.rotation.x = q.lkx; C.RL.kn.rotation.x = q.rkx;
    C.L.fg.visible = !!q.lfg; C.R.fg.visible = !!q.rfg; C.L.th.visible = !!q.lth; C.R.th.visible = !!q.rth;
    C.smile.visible = q.mouth < 0.5; C.open.visible = q.mouth >= 0.5; C.open.scale.set(1, 0.6 + q.mouth * 0.6, 0.4);
    const hap = q.eye === 'happy', wink = q.eye === 'wink';
    C.eyes[0].visible = !hap; C.eyes[1].visible = !(hap || wink); C.happy[0].visible = hap; C.happy[1].visible = hap || wink;
    if (C.pony) C.pony.rotation.set(q.pony * 0.5, 0, q.pony);
  };
  world.add(C.root); return C;
}
const girl = makeChar(true), boy = makeChar(false);

// ---------- props ----------
const phone = new T.Group(); M(G.box(0.2, 0.38, 0.04), toon(0x221a33), phone, null, 0.01);
const phCv = document.createElement('canvas'); phCv.width = 200; phCv.height = 380; const phTex = new T.CanvasTexture(phCv); phTex.colorSpace = T.SRGBColorSpace;
const phScreen = new T.Mesh(new T.PlaneGeometry(0.18, 0.35), new T.MeshBasicMaterial({ map: phTex })); phScreen.position.z = 0.021; phone.add(phScreen);
phScreen.material.color.setScalar(1.5);
scene.add(phone);
function drawPhone(mode, t, n = 0) {
  const c = phCv.getContext('2d'); const gr = c.createLinearGradient(0, 0, 0, 380); gr.addColorStop(0, '#ff6fb5'); gr.addColorStop(1, '#6a4cff'); c.fillStyle = gr; c.fillRect(0, 0, 200, 380);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (mode === 'call') { const p = 1 + 0.15 * Math.sin(t * 25); c.fillStyle = '#fff'; c.beginPath(); c.arc(100, 140, 50 * p, 0, 7); c.fill(); c.fillStyle = '#ff4f9a'; drawHeart(c, 100, 145, 50); c.fillStyle = '#2fe07a'; c.beginPath(); c.arc(100, 300, 34, 0, 7); c.fill(); drawHandset(c, 100, 300); }
  if (mode === 'keypad') { c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(20, 24, 160, 56); c.fillStyle = '#4a2a7a'; c.font = 'bold 38px sans-serif'; c.fillText(('010-' + '????').slice(0, 5 + Math.floor(n * 4)), 100, 54);
    for (let i = 0; i < 9; i++) { const x = 45 + (i % 3) * 55, y = 120 + Math.floor(i / 3) * 62; c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(x, y, 24, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 30px sans-serif'; c.fillText(String(i + 1), x, y + 2); }
    c.fillStyle = '#2fe07a'; c.beginPath(); c.arc(100, 330, 26, 0, 7); c.fill(); drawHandset(c, 100, 330); }
  if (mode === 'msgs') { for (let i = 0; i < 5; i++) { c.fillStyle = 'rgba(255,255,255,.92)'; const y = 40 + i * 62; c.beginPath(); c.roundRect(18, y, 164, 48, 14); c.fill(); c.fillStyle = '#b9a6d9'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(70 + k * 30, y + 24, 7, 0, 7); c.fill(); } }
    c.fillStyle = '#ff2d55'; c.beginPath(); c.arc(160, 30, 28, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 30px sans-serif'; c.fillText(String(n), 160, 32); }
  if (mode === 'friends') { for (let i = 0; i < 3; i++) { const x = 45 + i * 55; c.fillStyle = ['#ffd23f', '#3ff0c8', '#ff8a3d'][i]; c.beginPath(); c.arc(x, 150, 22, 0, 7); c.fill(); c.beginPath(); c.arc(x, 200, 30, Math.PI, 0); c.fill(); }
    c.fillStyle = '#fff'; c.beginPath(); c.roundRect(30, 250, 140, 60, 18); c.fill(); c.fillStyle = '#6a4cff'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(70 + k * 30, 280, 8, 0, 7); c.fill(); } }
  phTex.needsUpdate = true;
}
function drawHeart(c, x, y, s) { c.beginPath(); c.moveTo(x, y + s * 0.45); c.bezierCurveTo(x - s * 1.1, y - s * 0.2, x - s * 0.45, y - s * 0.95, x, y - s * 0.35); c.bezierCurveTo(x + s * 0.45, y - s * 0.95, x + s * 1.1, y - s * 0.2, x, y + s * 0.45); c.fill(); }
function drawHandset(c, x, y) { c.save(); c.translate(x, y); c.rotate(-0.6); c.strokeStyle = '#fff'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, 13, 0.4, 2.7); c.stroke(); c.restore(); }
const buzz = []; for (let i = 0; i < 3; i++) { const a = new T.Mesh(G.tor(0.16 + i * 0.09, 0.018, 1.4), glow(0xffe14d, 2.2)); scene.add(a); buzz.push(a); }
// clock
const clk = new T.Group(); scene.add(clk);
const ckCv = document.createElement('canvas'); ckCv.width = ckCv.height = 512; { const c = ckCv.getContext('2d'); c.fillStyle = '#fff8e8'; c.beginPath(); c.arc(256, 256, 250, 0, 7); c.fill(); c.lineWidth = 22; c.strokeStyle = '#ff4f9a'; c.stroke();
  c.fillStyle = '#3a2160'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 84px sans-serif'; for (let i = 1; i <= 12; i++) { const a = i / 12 * 6.283; c.font = (i % 3 ? 'bold 52px' : 'bold 84px') + ' sans-serif'; c.fillText(String(i), 256 + Math.sin(a) * 185, 262 - Math.cos(a) * 185); } }
const ckTex = new T.CanvasTexture(ckCv); ckTex.colorSpace = T.SRGBColorSpace;
M(G.cyl(1.2, 1.2, 0.25, 48), toon(0xff4f9a), clk, null, 0.04).rotation.x = Math.PI / 2;
const ckFace = new T.Mesh(new T.CircleGeometry(1.1, 48), new T.MeshBasicMaterial({ map: ckTex })); ckFace.position.z = 0.13; clk.add(ckFace);
const hHand = new T.Group(), mHand = new T.Group(); hHand.position.z = mHand.position.z = 0.16; clk.add(hHand, mHand);
M(G.box(0.09, 0.6, 0.03), toon(0x3a2160), hHand, V(0, 0.27, 0), 0); M(G.box(0.06, 0.9, 0.03), toon(0x3a2160), mHand, V(0, 0.42, 0.01), 0);
M(G.sph(0.08, 12), toon(0xffd23f), clk, V(0, 0, 0.18), 0);
for (const s of [-1, 1]) M(G.sph(0.25, 16), toon(0xffd23f), clk, V(s * 0.8, 1.05, 0), 0.02);
// soda can
const can = new T.Group(); scene.add(can);
M(G.cyl(0.5, 0.5, 1.3, 40), toon(0x3ff0c8), can, null, 0.04); M(G.cyl(0.505, 0.505, 0.35, 40), toon(0xffffff), can, V(0, 0.1, 0), 0); M(G.cyl(0.42, 0.5, 0.12, 40), toon(0xd0d0e0), can, V(0, 0.7, 0), 0.02);
M(new T.Mesh(heartGeo).geometry, toon(0xff4f9a), can, V(0, 0.1, 0.52), 0).scale.setScalar(0.35);
// particles
const NB = 260; const bubbles = new T.InstancedMesh(G.sph(1, 12), new T.MeshToonMaterial({ color: 0xbff8ff, gradientMap: grad, emissive: 0x6fe8ff, emissiveIntensity: 0.8, transparent: true, opacity: 0.9 }), NB); scene.add(bubbles);
const NC = 320; const confetti = new T.InstancedMesh(new T.PlaneGeometry(0.12, 0.2), new T.MeshBasicMaterial({ side: T.DoubleSide }), NC); scene.add(confetti);
{ const col = new T.Color(); for (let i = 0; i < NC; i++) confetti.setColorAt(i, col.set(bulbCols[i % 5]).multiplyScalar(1.6)); }
const NF = 360; const fw = new T.InstancedMesh(G.sph(0.12, 6), new T.MeshBasicMaterial(), NF); scene.add(fw);
{ const col = new T.Color(); for (let i = 0; i < NF; i++) fw.setColorAt(i, col.set(bulbCols[Math.floor(i / 60) % 5]).multiplyScalar(3)); }
const hearts = []; for (let i = 0; i < 16; i++) { const h = M(heartGeo, toon(0xff4f9a, 0.35), scene, null, 0.03); h.scale.setScalar(0.4); hearts.push(h); }
const snow = new T.InstancedMesh(new T.OctahedronGeometry(0.08), glow(0xd8f6ff, 2), 200); scene.add(snow);
// sight beam & rope
const beamMat = glow(0xff5fc8, 2.6); let beam = new T.Mesh(new T.BufferGeometry(), beamMat); scene.add(beam);
const ropes = []; for (let i = 0; i < 4; i++) { const r = new T.Mesh(G.tor(0.62, 0.035), beamMat); r.rotation.x = Math.PI / 2; scene.add(r); ropes.push(r); }
// speech bubbles
function bubble3D() { const b = new T.Group(); const p = M(G.cyl(0.7, 0.7, 0.12, 40), toon(0xeee4ff), b, null, 0.03); p.rotation.x = Math.PI / 2; p.scale.set(1.25, 1, 1); const tl = M(new T.ConeGeometry(0.18, 0.45, 12), toon(0xeee4ff), b, V(-0.35, -0.68, 0), 0.03); tl.rotation.z = 0.5; scene.add(b); return b; }
const sbA = bubble3D(), sbB = bubble3D();
const msgStack = []; for (let i = 0; i < 9; i++) { const m = new T.Group(); M(G.box(0.9, 0.42, 0.1), toon(0xffffff), m, null, 0.03); for (let k = 0; k < 3; k++) M(G.sph(0.06, 8), toon(0xb9a6d9), m, V(-0.22 + k * 0.22, 0, 0.06), 0); scene.add(m); msgStack.push(m); }
// sweat drop, spark, podium, muscle
const sweat = M(G.sph(0.09, 12), toon(0x7fd8ff, 0.4), scene, null, 0.01); sweat.scale.set(1, 1.5, 1);
const sparks = []; for (let i = 0; i < 8; i++) { const s = new T.Mesh(new T.ConeGeometry(0.06, 0.7, 4), glow(0xffe14d, 3)); scene.add(s); sparks.push(s); }
const podium = new T.Group(); scene.add(podium); M(G.box(2.2, 1.2, 1.4), toon(0xffd23f, 0.25), podium, V(0, 0.6, 0), 0.04);
const p1Cv = document.createElement('canvas'); p1Cv.width = p1Cv.height = 256; { const c = p1Cv.getContext('2d'); c.fillStyle = '#ffd23f'; c.fillRect(0, 0, 256, 256); c.fillStyle = '#c2410c'; c.font = 'bold 210px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('1', 128, 140); }
const p1 = new T.Mesh(new T.PlaneGeometry(1.0, 1.0), new T.MeshBasicMaterial({ map: new T.CanvasTexture(p1Cv) })); p1.material.map.colorSpace = T.SRGBColorSpace; p1.position.set(0, 0.6, 0.71); podium.add(p1);
const globe = new T.Group(); scene.add(globe); M(G.sph(1.3, 40), toon(0x2f8cff), globe, null, 0.04);
for (let i = 0; i < 7; i++) { const l = M(G.sph(0.5, 16), toon(0x37d67a), globe, null, 0); const a = i * 1.3, b = Math.sin(i * 2.1) * 0.8; l.position.set(Math.cos(a) * Math.cos(b) * 1.05, Math.sin(b) * 1.05, Math.sin(a) * Math.cos(b) * 1.05); l.scale.set(1, 0.6, 1); }

// ---------- helpers ----------
const ALL_PROPS = [phone, clk, can, bubbles, confetti, fw, snow, beam, sbA, sbB, sweat, podium, globe, ...buzz, ...ropes, ...hearts, ...msgStack, ...sparks];
const beatPh = t => ((t - B0) / BEAT % 1 + 1) % 1, beatN = t => Math.floor((t - B0) / BEAT);
const pulse = t => Math.exp(-beatPh(t) * 5);
function attachToHand(obj, C, side = 'R', off = V(0, -0.12, 0.08)) { const hd = C[side].hd; hd.updateWorldMatrix(true, false); obj.position.copy(off).applyMatrix4(hd.matrixWorld); obj.quaternion.setFromRotationMatrix(hd.matrixWorld); }
function headPos(C, y = 0.5, z = 0) { C.head.updateWorldMatrix(true, false); return V(0, y, z).applyMatrix4(C.head.matrixWorld); }
function setBubbles(origin, t0, t, n = NB, spread = 1, up = 3) { const m = new T.Matrix4(); bubbles.visible = true; const dt = t - t0;
  for (let i = 0; i < NB; i++) { if (i >= n || dt < rnd(i) * 0.4) { m.makeScale(0, 0, 0); bubbles.setMatrixAt(i, m); continue; }
    const d = dt - rnd(i) * 0.4, a = rnd(i + 1) * 6.28, r = (0.3 + rnd(i + 2) * 2.2) * spread * Math.min(1, d * 1.5), s = (0.06 + rnd(i + 3) * 0.16) * (1 - clamp((d - 2.2) / 1.2));
    m.makeTranslation(origin.x + Math.cos(a) * r, origin.y + d * up * (0.5 + rnd(i + 4)) + Math.sin(d * 4 + i) * 0.1, origin.z + Math.sin(a) * r); m.scale(V(s, s, s)); bubbles.setMatrixAt(i, m); }
  bubbles.instanceMatrix.needsUpdate = true; }
function setConfetti(t, t0, center = V(0, 0, 0)) { confetti.visible = true; const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(); const d = t - t0;
  for (let i = 0; i < NC; i++) { const y = 9 - ((d * (1 + rnd(i) * 1.2) + rnd(i + 1) * 9) % 10); e.set(d * 3 + i, d * 2 + i * 0.3, 0); q.setFromEuler(e);
    m.compose(V(center.x + (rnd(i + 2) - 0.5) * 16 + Math.sin(d + i) * 0.4, y, center.z + (rnd(i + 3) - 0.5) * 10), q, V(1, 1, 1)); confetti.setMatrixAt(i, m); }
  confetti.instanceMatrix.needsUpdate = true; }
function setFireworks(t, list) { fw.visible = true; const m = new T.Matrix4(); let k = 0;
  for (const [t0, c] of list) { const d = t - t0; for (let i = 0; i < 60; i++, k++) { if (d < 0 || d > 1.6) { m.makeScale(0, 0, 0); fw.setMatrixAt(k, m); continue; }
      const a = rnd(k) * 6.28, b = (rnd(k + 1) - 0.5) * 3.1, r = 3.2 * (1 - Math.exp(-d * 3)), s = 1 - d / 1.6;
      m.makeTranslation(c.x + Math.cos(a) * Math.cos(b) * r, c.y + Math.sin(b) * r - d * d * 0.8, c.z + Math.sin(a) * Math.cos(b) * r); m.scale(V(s, s, s)); fw.setMatrixAt(k, m); } }
  for (; k < NF; k++) { m.makeScale(0, 0, 0); fw.setMatrixAt(k, m); } fw.instanceMatrix.needsUpdate = true; }
function setSnow(t) { snow.visible = true; const m = new T.Matrix4(); for (let i = 0; i < 200; i++) { m.makeTranslation((rnd(i) - 0.5) * 18, 8 - ((t * 0.4 + rnd(i + 1) * 9) % 9), (rnd(i + 2) - 0.5) * 10 + 1); snow.setMatrixAt(i, m); } snow.instanceMatrix.needsUpdate = true; }
function setBeam(a, b, u) { const mid = a.clone().lerp(b, 0.5).add(V(0, 0.8, 0)); const curve = new T.QuadraticBezierCurve3(a, mid, b); const pts = curve.getPoints(40).slice(0, Math.max(2, Math.round(40 * u) + 1));
  beam.geometry.dispose(); beam.geometry = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, 0.04, 8); beam.visible = true; }

// poses
const P = {
  sit: (t, o = {}) => Object.assign({ y: 0.12, llx: -1.45, rlx: -1.45, lkx: 1.45, rkx: 1.45, lsz: 0.25, rsz: -0.25 }, o),
  bounce: t => Math.abs(Math.sin(Math.PI * beatPh(t))) * 0.08,
  dance(t, k = 1) { const b = beatPh(t), n = beatN(t), s = n % 2 ? 1 : -1, w = Math.sin(Math.PI * b);
    return { y: w * 0.12 * k, side: s * 0.12 * k, lsz: 0.4 + (s > 0 ? 1.9 * w * k : 0.3), rsz: -(0.4 + (s < 0 ? 1.9 * w * k : 0.3)), lex: -0.6 * w, rex: -0.6 * w, hz: -s * 0.15 * k, llx: s > 0 ? -0.3 * w : 0, rlx: s < 0 ? -0.3 * w : 0, lkx: s > 0 ? 0.5 * w : 0, rkx: s < 0 ? 0.5 * w : 0, pony: s * 0.4, eye: 'happy', mouth: 0.6 }; },
  sing: (t, on) => on ? 0.35 + 0.6 * Math.abs(Math.sin(t * 11)) : 0,
};
const lyricOn = t => LYR.some(l => t >= l[0] && t <= l[1]);
const pos = (C, x, z, ry) => ({ x, z, ry });

// ---------- lyrics ----------
// [t0, t1, text, keywords]
const LYR = [
  [8.0, 11.7, '주머니 속 핸드폰 진동', ['핸드폰', '진동']], [12.2, 15.6, '점점 더 나를 초조하게 만들어', ['초조하게']], [15.8, 18.6, '이대로 일어설 수 없어', ['일어설 수 없어']],
  [18.8, 21.8, '이 짜릿한 순간을 놓칠 수 없어', ['짜릿한']], [22.0, 26.6, '화려한 이 밤은 오직 내 편이어야만 해', ['화려한', '내 편']],
  [26.8, 30.6, '시계의 숫자는 계속해서 날 떠밀지만', ['시계', '떠밀지만']], [30.8, 34.4, '이 자리를 떠날 수 없어 난', ['떠날 수 없어']], [34.6, 37.7, '주고받은 말 한마디 없이도', ['말 한마디 없이도']], [37.8, 42.5, '넌 이미 눈빛으로 나를 묶어뒀어', ['눈빛', '묶어뒀어']],
  ...chorus(0), [62.6, 69.4, '시원시원한 여자야', ['시원시원한']], [69.7, 74.2, '망설이지 마', ['망설이지 마']],
  [77.8, 81.2, '읽지 못한 문자는 쌓여만 가는데', ['문자', '쌓여만']], [81.4, 84.5, '친구 핑계 대고 여기 더 있을까?', ['핑계']], [84.6, 87.0, '무슨 일이 있어야만 돼, 오늘 밤엔', ['오늘 밤']],
  [87.0, 89.6, '무슨 일이 벌어져야만 돼, 너와 나 사이', ['너와 나 사이']], [91.6, 95.0, '말을 건넬 때까지, 번호를 줄 때까지', ['말을 건넬', '번호']], [95.1, 97.5, '시간아 멈춰라', ['멈춰라']],
  ...chorus(54.8),
  [120.4, 124.3, '시간이 잠시 멈춰야만 해', ['멈춰야만']], [124.4, 127.9, '어서 일어나서 나에게 다가와', ['일어나서', '다가와']], [128.0, 131.1, '망설이지 말고 좀 더 남자답게', ['남자답게']], [131.2, 135.0, '이 밤이 다 지나가기 전에', ['지나가기 전에']],
  [140.0, 142.5, '내 번호를 빨리 물어봐 줘', ['번호', '물어봐']], [142.6, 144.9, '난 이미 너의 여자친구야', ['여자친구']], [145.0, 146.7, '나는 튕기지 않아 (절대!)', ['튕기지 않아']], [146.8, 148.7, '나는 도도하지 않아', ['도도하지 않아']],
  [148.8, 152.3, '세상에서 제일 쿨한 시원시원한 여자야', ['세상에서 제일', '시원시원한']], [152.4, 153.9, '나는 튕기지 않아', ['튕기지 않아']], [154.0, 157.2, '나는 시원시원한 여자야', ['시원시원한']],
];
function chorus(o) { return [[43.0 + o, 46.9 + o, '건너편에서 힐끔 쳐다보지 마', ['건너편', '힐끔']], [47.0 + o, 50.5 + o, '난 이미 너의 품에 안길 준비가 됐어', ['품에 안길']], [50.6 + o, 53.1 + o, '내 번호를 빨리 물어봐 줘', ['번호', '물어봐']],
  [53.2 + o, 55.1 + o, '난 이미 너의 여자친구야', ['여자친구']], [55.2 + o, 56.5 + o, '나는 튕기지 않아', ['튕기지 않아']], [56.6 + o, 58.1 + o, '나는 도도하지 않아', ['도도하지 않아']], [58.2 + o, 62.3 + o, '탄산처럼 터지는 나는 시원시원한 여자야', ['탄산처럼 터지는', '시원시원한']]]; }

// ---------- overlay (2D) ----------
const OV = []; // per-frame overlay ops
const FONT = '"Pretendard", "Malgun Gothic", "Noto Sans CJK KR", sans-serif';
function drawLyric(t) {
  const l = LYR.find(l => t >= l[0] - 0.12 && t <= l[1] + 0.15); if (!l) return;
  const [t0, t1, text, kws] = l; const a = clamp((t - t0 + 0.12) / 0.15) * clamp((t1 + 0.15 - t) / 0.15), pop = 0.88 + 0.12 * sm((t - t0 + 0.12) / 0.2);
  let fs = 84; g2.font = `900 ${fs}px ${FONT}`; let w = g2.measureText(text).width; if (w > 1700) { fs = Math.floor(fs * 1700 / w); g2.font = `900 ${fs}px ${FONT}`; w = g2.measureText(text).width; }
  const prog = clamp((t - t0) / Math.max(0.5, t1 - t0 - 0.25));
  const segs = []; let i = 0; while (i < text.length) { const k = kws.find(k => text.startsWith(k, i)); if (k) { segs.push([k, 1]); i += k.length; } else { if (segs.length && !segs[segs.length - 1][1]) segs[segs.length - 1][0] += text[i]; else segs.push([text[i], 0]); i++; } }
  g2.save(); g2.globalAlpha = a; g2.translate(W / 2, 985); g2.scale(pop, pop); g2.textBaseline = 'middle'; g2.lineJoin = 'round';
  // backing glow pill
  const pg = g2.createLinearGradient(-w / 2, 0, w / 2, 0); pg.addColorStop(0, 'rgba(60,10,90,0)'); pg.addColorStop(0.15, 'rgba(60,10,90,.55)'); pg.addColorStop(0.85, 'rgba(60,10,90,.55)'); pg.addColorStop(1, 'rgba(60,10,90,0)');
  g2.fillStyle = pg; g2.fillRect(-w / 2 - 120, -fs * 0.75, w + 240, fs * 1.5);
  let x = -w / 2; const fillEnd = -w / 2 + w * prog;
  for (const [s, k] of segs) { const sw = g2.measureText(s).width;
    g2.lineWidth = 16; g2.strokeStyle = k ? '#7a1250' : '#4a1670'; g2.strokeText(s, x, 4);
    g2.fillStyle = k ? '#5ff5ff' : '#ffffff'; g2.fillText(s, x, 0);
    if (fillEnd > x) { g2.save(); g2.beginPath(); g2.rect(x, -fs, Math.min(sw, fillEnd - x), fs * 2); g2.clip(); g2.fillStyle = k ? '#ff7ad9' : '#ffe14d'; g2.fillText(s, x, 0); g2.restore(); }
    x += sw; }
  g2.restore();
}
function proj(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }
function ovX(x, y, s, a) { g2.save(); g2.globalAlpha = a; g2.translate(x, y); g2.rotate(-0.08); g2.lineCap = 'round'; g2.lineWidth = s * 0.26; g2.strokeStyle = '#fff'; g2.beginPath(); g2.moveTo(-s / 2, -s / 2); g2.lineTo(s / 2, s / 2); g2.moveTo(s / 2, -s / 2); g2.lineTo(-s / 2, s / 2); g2.stroke(); g2.lineWidth = s * 0.17; g2.strokeStyle = '#ff2d55'; g2.stroke(); g2.restore(); }
function ovSym(ch, x, y, s, a, col = '#ffe14d') { g2.save(); g2.globalAlpha = a; g2.font = `900 ${s}px ${FONT}`; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.lineWidth = s * 0.14; g2.strokeStyle = '#4a1670'; g2.lineJoin = 'round'; g2.strokeText(ch, x, y); g2.fillStyle = col; g2.fillText(ch, x, y); g2.restore(); }
function ovArrow(x, y, ang, len, a, col = '#ffe14d') { g2.save(); g2.globalAlpha = a; g2.translate(x, y); g2.rotate(ang); g2.lineCap = 'round'; g2.lineJoin = 'round'; for (const [lw, c] of [[34, '#4a1670'], [20, col]]) { g2.lineWidth = lw; g2.strokeStyle = c; g2.beginPath(); g2.moveTo(0, 0); g2.lineTo(len, 0); g2.moveTo(len - 40, -36); g2.lineTo(len, 0); g2.lineTo(len - 40, 36); g2.stroke(); } g2.restore(); }
function ovTint(col, a) { g2.save(); g2.globalAlpha = a; g2.fillStyle = col; g2.fillRect(0, 0, W, H); g2.restore(); }
function ovVignette(a) { const r = g2.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, `rgba(20,0,40,${a})`); g2.fillStyle = r; g2.fillRect(0, 0, W, H); }
function ovTitle(t, t0, t1) { const a = clamp((t - t0) / 0.3) * clamp((t1 - t) / 0.4); if (a <= 0) return; const s = 0.6 + 0.4 * sm((t - t0) / 0.45) + 0.06 * Math.sin((t - t0) * 6) * clamp(1 - (t - t0) / 1.5);
  g2.save(); g2.globalAlpha = a; g2.translate(W / 2, H * 0.43); g2.scale(s, s); g2.rotate(-0.04); g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.lineJoin = 'round';
  g2.font = `900 170px ${FONT}`; g2.lineWidth = 46; g2.strokeStyle = '#4a1670'; g2.strokeText('시원시원한', 0, -95); g2.strokeText('여자', 0, 95);
  g2.lineWidth = 22; g2.strokeStyle = '#ffffff'; g2.strokeText('시원시원한', 0, -95); g2.strokeText('여자', 0, 95);
  const gr = g2.createLinearGradient(0, -190, 0, 190); gr.addColorStop(0, '#5ff5ff'); gr.addColorStop(0.5, '#ff7ad9'); gr.addColorStop(1, '#ffe14d'); g2.fillStyle = gr; g2.fillText('시원시원한', 0, -95); g2.fillText('여자', 0, 95); g2.restore(); }
function ovWatermark() { g2.save(); g2.globalAlpha = 0.75; g2.font = `800 34px ${FONT}`; g2.textAlign = 'right'; g2.lineWidth = 6; g2.strokeStyle = '#4a1670'; g2.lineJoin = 'round'; g2.strokeText('에픽21', W - 48, 62); g2.fillStyle = '#fff'; g2.fillText('에픽21', W - 48, 62); g2.restore(); }

// ---------- shots ----------
const GP = { x: -3.6, z: 1.8 }, BP = { x: 3.6, z: 1.5 }; // seats
const girlRy = 0.9, boyRy = -0.9;
let FX = {}; // per-frame flags
function camSet(p, tg, fov = 40) { camera.position.copy(p); camera.lookAt(tg); camera.fov = fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); }
function camMove(u, p0, p1, t0, t1, fov = 40) { const e = ease(u); camSet(p0.clone().lerp(p1, e), t0.clone().lerp(t1, e), fov); }
function shake(a, t) { camera.position.x += Math.sin(t * 53) * a; camera.position.y += Math.sin(t * 61 + 1) * a; }
const gHead = () => headPos(girl), bHead = () => headPos(boy);
const sitG = (t, o = {}) => P.sit(t, Object.assign({ x: GP.x, z: GP.z, ry: girlRy, mouth: P.sing(t, lyricOn(t)) }, o));
const sitB = (t, o = {}) => P.sit(t, Object.assign({ x: BP.x, z: BP.z, ry: boyRy }, o));
const standG = (t, o = {}) => Object.assign({ x: -2.6, z: 2.4, ry: 0.5, y: P.bounce(t), mouth: P.sing(t, lyricOn(t)) }, o);

// chorus block (o = offset)
function chorusShots(o, v) { return [
  [43.0 + o, 47.0 + o, (t, u) => { // 힐끔 쳐다보지 마
    const gl = (Math.sin((t - o) * 3.2) > 0.3); girl.set(sitG(t, { hy: 0.2, rsx: -1.5, rex: -1.3, rfg: 1, rhz: Math.sin(t * 18) * 0.5, eye: 'open' })); boy.set(sitB(t, { hy: gl ? -0.75 : 0.2, twist: gl ? -0.2 : 0 }));
    camMove(u, V(0.5, 3.4, 10.5), V(-0.5, 3.0, 9.0), V(0, 1.4, 1), V(0, 1.4, 1)); if (gl) { setBeam(headPos(boy, 0.5, 0.5), headPos(girl, 0.5, 0.3), 1); beam.material.color.setRGB(2.4, 2.4, 0.8); }
    const [x, y] = proj(headPos(boy, 1.4)); if (gl) ovSym('👀'.length ? '?' : '?', x, y, 120, 1, '#5ff5ff'); const [gx, gy] = proj(headPos(girl, 1.4)); ovX(gx, gy, 120, sm((t - 43 - o) / 0.3)); }],
  [47.0 + o, 50.6 + o, (t, u) => { // 품에 안길 준비
    girl.set(standG(t, { lsz: 1.5 + 0.1 * Math.sin(t * 8), rsz: -1.5 - 0.1 * Math.sin(t * 8), lsx: -0.5, rsx: -0.5, eye: 'happy', ry: 0.2 })); boy.set(sitB(t));
    camMove(u, V(-1.0, 2.2, 7.0), V(-1.8, 2.1, 5.8), V(-2.6, 1.6, 2.4), V(-2.6, 1.7, 2.4), 36);
    hearts.forEach((h, i) => { const d = (t - 47 - o) * 0.9 + i / 16; h.visible = true; const a = i / 16 * 6.28 + t * 0.6; h.position.set(-2.6 + Math.cos(a) * (1 + d * 0.3), 1.2 + (d % 1.5) * 1.6, 2.4 + Math.sin(a) * 1.0); h.rotation.set(0, t * 2 + i, 0); h.scale.setScalar(0.18 + 0.08 * Math.sin(t * 6 + i)); }); }],
  [50.6 + o, 53.2 + o, (t, u) => { // 번호 물어봐
    girl.set(standG(t, { rsx: -1.4, rex: -0.4, lsx: -1.3, lsz: -0.1, lfg: 1, ry: 0.35, hy: 0.25 })); boy.set(sitB(t, { hy: -0.3 }));
    phone.visible = true; attachToHand(phone, girl, 'R', V(0, -0.2, 0.05)); FX.face = 1; phone.scale.setScalar(1.5); drawPhone('keypad', t, (t - 50.6 - o) / 2.6);
    camMove(u, V(-1.6, 2.4, 6.4), V(-1.9, 2.3, 5.4), V(-2.4, 1.6, 2.8), V(-2.4, 1.6, 2.8), 34);
    const [x, y] = proj(phone.position.clone().add(V(0, 1.0, 0))); ovSym('?', x, y, 150 + 20 * pulse(t), 1); }],
  [53.2 + o, 55.2 + o, (t, u) => { // 여자친구
    girl.set({ x: -0.7, z: 3.2, ry: 0.3, y: P.bounce(t), lsz: 0.2, rsx: -0.4, rsz: -0.6, rex: -0.6, eye: 'happy', mouth: P.sing(t, 1), hz: -0.15 }); boy.set({ x: 0.7, z: 3.2, ry: -0.3, y: P.bounce(t), lsx: -0.4, lsz: 0.6, lex: -0.6, eye: 'happy', hz: 0.15 });
    camMove(u, V(0, 2.4, 9.2), V(0, 2.2, 8.0), V(0, 2.0, 3), V(0, 2.1, 3), 38); FX.dream = 1;
    hearts.forEach((h, i) => { h.visible = i < 1; h.position.set(0, 3.9 + 0.08 * Math.sin(t * 9), 3); h.scale.setScalar(0.75 + 0.15 * pulse(t)); h.rotation.set(0, Math.sin(t * 2) * 0.4, 0); }); }],
  [55.2 + o, 56.6 + o, (t, u) => { // 튕기지 않아
    const d = (t - 55.2 - o) / 1.4; girl.set(standG(t, { rsx: -1.55, rex: 0, rhz: 0.3, ry: 0.2, hy: 0.2 })); boy.set(sitB(t));
    const h = hearts[0]; h.visible = true; h.scale.setScalar(0.45); const hx = d < 0.45 ? lerp(1.5, -1.95, d / 0.45) : lerp(-1.95, 1.5, (d - 0.45) / 0.55); h.position.set(hx, 2.0 + Math.sin(d * 6.28) * 0.3, 3.0); h.rotation.set(0, t * 6, 0);
    camSet(V(-0.6, 2.4, 8.4), V(-0.9, 1.8, 2.6), 38); const [x, y] = proj(V(-0.9, 2.0, 3)); ovX(x, y - 40, 320, sm((d - 0.4) / 0.12)); }],
  [56.6 + o, 58.2 + o, (t, u) => { // 도도하지 않아
    girl.set(standG(t, { lsx: -0.9, lsz: -0.55, lex: -1.7, rsx: -0.9, rsz: 0.55, rex: -1.7, hx: -0.4, hy: -0.6, eye: 'wink', y: 0, ry: 0.3 })); boy.set(sitB(t));
    camSet(V(-2.0, 2.0, 6.2), V(-2.6, 1.7, 2.4), 34); const [x, y] = proj(headPos(girl, 0.4)); ovX(x, y, 360, sm((t - 56.75 - o) / 0.15)); }],
  [58.2 + o, 62.3 + o, (t, u) => { // 탄산처럼 터지는
    const d = t - 58.2 - o; girl.set(Object.assign(P.dance(t, 1.2), { x: -1.2, z: 2.6, ry: 0.15, y: Math.max(0, Math.sin(Math.min(d, 1.2) * Math.PI / 1.2)) * 0.9 + P.bounce(t), lsz: 2.6, rsz: -2.6, rth: 1, lth: 1, mouth: P.sing(t, 1) })); boy.set(sitB(t, { lsz: 1.2, eye: 'happy' }));
    can.visible = true; can.position.set(1.4, 1.0 + d * 0.2, 1.2); can.rotation.set(0, d * 1.5, Math.sin(d * 20) * 0.1 * clamp(1 - d)); can.scale.setScalar(1.3);
    setBubbles(V(1.4, 2.0, 1.2), 58.4 + o, t, NB, 1.6, 3); setConfetti(t, 58.2 + o, V(0, 0, 1)); FX.flash = clamp(1 - (d - 0.2) / 0.3) * (d > 0.2 ? 1 : 0);
    const r = 9 - d * 0.6, a = -0.35 + d * 0.18; camSet(V(Math.sin(a) * r, 2.6 + d * 0.2, 3 + Math.cos(a) * r - 3), V(0, 1.8, 1.8), 42); shake(0.04 * clamp(1 - d), t); }],
]; }

const SHOTS = [
  // INTRO
  [0, 2.6, (t, u) => { girl.set(sitG(t, { hy: 0.3 })); boy.set(sitB(t)); phone.visible = true; phone.position.set(-3.0, 1.12, 0.9); phone.rotation.set(-Math.PI / 2, 0, 0.3 + Math.sin(t * 40) * 0.05); phone.scale.setScalar(1.6); drawPhone('call', t);
    buzz.forEach((b, i) => { b.visible = true; b.position.set(-3.0, 1.25, 0.9); b.rotation.set(-Math.PI / 2, 0, Math.PI * 0.8 + (i % 2) * Math.PI); b.scale.setScalar(1.6 + ((t * 2 + i / 3) % 1) * 0.8); });
    camMove(u, V(-2.4, 2.2, 2.4), V(-2.6, 1.9, 1.9), V(-3.0, 1.1, 0.9), V(-3.0, 1.1, 0.9), 34); FX.fade = 1 - clamp(t / 0.6); }],
  [2.6, 7.9, (t, u) => { girl.set(sitG(t, { hy: 0.3 })); boy.set(sitB(t)); camMove(u, V(0, 14, 22), V(0, 3.6, 11.5), V(0, 5, -6), V(0, 1.4, 0)); setFireworks(t, [[3.4, V(-6, 10, -14)], [4.2, V(6, 11, -16)], [5.0, V(0, 13, -18)], [5.9, V(-9, 9, -12)], [6.7, V(8, 10, -13)], [7.3, V(0, 11, -15)]]); FX.title = 1; }],
  // VERSE 1
  [7.9, 11.8, (t, u) => { girl.set(sitG(t, { hx: 0.45 + 0.08 * Math.sin(t * 3), hy: 0.5, lsx: -0.3 })); boy.set(sitB(t)); phone.visible = true; girl.hips.updateWorldMatrix(true, false);
    phone.position.copy(V(0.2, 0.05, 0.36).applyMatrix4(girl.hips.matrixWorld)); phone.rotation.set(0, girlRy, Math.sin(t * 45) * 0.12); phone.scale.setScalar(1.3); drawPhone('call', t);
    buzz.forEach((b, i) => { b.visible = true; b.position.copy(phone.position); b.rotation.set(0, girlRy, (i % 2 ? Math.PI : 0) + 0.8); b.scale.setScalar(1 + ((t * 2.5 + i / 3) % 1)); });
    camMove(u, V(-1.2, 1.6, 4.5), V(-1.8, 1.5, 3.9), V(-3.3, 1.2, 2.2), V(-3.3, 1.2, 2.2), 32); }],
  [11.8, 15.7, (t, u) => { const n = Math.sin(t * 7); girl.set(sitG(t, { hy: Math.sin(t * 2.4) * 0.7, hx: 0.1, lkx: 1.45 + Math.abs(Math.sin(t * 14)) * 0.35, lsx: -0.6, lex: -1.4, rsx: -0.6, rex: -1.4, eye: 'open' })); boy.set(sitB(t));
    sweat.visible = true; sweat.position.copy(headPos(girl, 0.85, 0.45)).add(V(0.35, -((t * 0.6) % 0.5), 0)); camMove(u, V(-2.3, 2.3, 5.2), V(-2.6, 2.1, 4.6), V(-3.4, 1.8, 1.8), V(-3.4, 1.8, 1.8), 30); shake(0.015, t); }],
  [15.7, 18.7, (t, u) => { const d = t - 15.7, up = d < 1.1 ? Math.sin(d / 1.1 * Math.PI) : 0; girl.set(sitG(t, { y: 0.12 + up * 0.35, llx: -1.45 + up * 1.1, rlx: -1.45 + up * 1.1, lkx: 1.45 - up * 1.1, rkx: 1.45 - up * 1.1, hy: d > 1.2 ? Math.sin(d * 10) * 0.4 : 0, lsx: -0.8, rsx: -0.8, lex: -0.6, rex: -0.6 })); boy.set(sitB(t));
    camSet(V(-1.6, 2.0, 6.0), V(-3.4, 1.6, 1.8), 34); const [x, y] = proj(headPos(girl, 1.2)); ovArrow(x - 0, y + 20, -Math.PI / 2, 170, clamp(d / 0.2)); if (d > 1.1) ovX(x, y - 60, 200, sm((d - 1.1) / 0.15)); }],
  [18.7, 22.0, (t, u) => { girl.set(sitG(t, { hy: 0.35, lsx: -1.0, lex: -1.8, rsx: -1.0, rex: -1.8, eye: 'open' })); boy.set(sitB(t, { lsz: 1.0 + 0.4 * Math.sin(t * 6), eye: 'happy' }));
    camMove(u, V(-3.6, 2.5, 4.4), V(-2.0, 2.3, 4.0), V(0, 1.7, 1.5), V(3.4, 1.8, 1.5), 30);
    sparks.forEach((s, i) => { s.visible = true; const a = i / 8 * 6.28 + t * 2; const b = headPos(boy, 0.5); s.position.set(b.x + Math.cos(a) * 1.1, b.y + Math.sin(a) * 1.1, b.z); s.rotation.set(0, 0, a - Math.PI / 2); s.scale.setScalar(0.6 + 0.6 * pulse(t)); }); }],
  [22.0, 26.7, (t, u) => { const d = t - 22; girl.set(Object.assign(sitG(t), { lsz: 2.3, rsz: -2.3, lex: -0.3, rex: -0.3, eye: 'happy', hx: -0.2 })); boy.set(sitB(t, { hy: -0.4 }));
    camMove(u, V(-9, 7, 13), V(4, 5, 12), V(-2, 2, 0), V(-2, 2.5, 0), 44); setFireworks(t, [[22.2, V(-6, 9, -10)], [22.9, V(4, 10, -12)], [23.6, V(-1, 12, -14)], [24.3, V(-8, 8, -9)], [25.0, V(6, 9, -10)], [25.7, V(-3, 11, -12)]]); FX.spot = 1; }],
  // PRE
  [26.7, 30.7, (t, u) => { const d = t - 26.7; girl.set(sitG(t, { x: GP.x - d * 0.35, hy: 0.6, lsx: -1.2, lex: -0.5, rsx: -1.2, rex: -0.5, lean: 0.25, eye: 'open', mouth: P.sing(t, 1) })); boy.set(sitB(t));
    herStool.position.x = GP.x - d * 0.35; clk.visible = true; clk.position.set(-1.2 - d * 0.3, 2.4, 2.0); clk.rotation.set(0, -0.6, Math.sin(t * 9) * 0.06); clk.scale.setScalar(0.85);
    mHand.rotation.z = -t * 9; hHand.rotation.z = -t * 0.9; camMove(u, V(-2.6, 3.0, 8.2), V(-3.8, 2.8, 7.6), V(-4.2, 1.6, 1), V(-5, 1.6, 0.5), 40);
    const [x, y] = proj(V(-2.8 - d * 0.3, 2.4, 2)); ovArrow(x + 120, y, Math.PI, 200, 1); }],
  [30.7, 34.5, (t, u) => { const d = t - 30.7; herStool.position.x = GP.x - 1.4; girl.set(sitG(t, { x: GP.x - 1.4, lsx: -1.5, lex: -0.2, rsx: -1.5, rex: -0.2, hy: Math.sin(d * 9) * 0.45, lean: -0.15 })); boy.set(sitB(t));
    doorPanel.rotation.y = -1.3 * (1 - sm(d / 0.5)); camMove(u, V(-5.5, 3.2, 8.5), V(-6.0, 3.0, 7.5), V(-7, 1.6, 0), V(-7, 1.6, 0), 42);
    const [x, y] = proj(V(-9.3, 1.6, -1.5)); ovX(x, y, 240, sm((d - 0.45) / 0.15)); }],
  [34.5, 37.8, (t, u) => { girl.set(sitG(t, { mouth: 0, hy: 0.15 })); boy.set(sitB(t, { hy: -0.15 })); camMove(u, V(0, 3.6, 10.5), V(0, 3.4, 9.6), V(0, 1.8, 1), V(0, 1.8, 1));
    for (const [sb, C, s] of [[sbA, girl, 1], [sbB, boy, -1]]) { sb.visible = true; sb.position.copy(headPos(C, 1.5)).add(V(s * 0.6, 0, 0)); sb.scale.set(-s, 1, 1).multiplyScalar(0.8); sb.lookAt(camera.position); sb.scale.x = 0.8 * (s > 0 ? 1 : -1); const [x, y] = proj(sb.position); ovX(x, y, 110, sm((t - 35) / 0.2)); } }],
  [37.8, 42.8, (t, u) => { const d = t - 37.8; girl.set(sitG(t, { eye: d > 2 ? 'happy' : 'open', side: d > 2 ? Math.sin(t * 4) * 0.1 : 0 })); boy.set(sitB(t, { hx: -0.05 }));
    setBeam(headPos(boy, 0.5, 0.5), headPos(girl, 0.4, 0), clamp(d / 1.4)); camMove(u, V(0, 3, 9.5), V(-1.8, 2.6, 7.5), V(0, 1.8, 1.4), V(-2.8, 1.5, 1.8), 40);
    ropes.forEach((r, i) => { r.visible = d > 1.4 + i * 0.25; r.position.set(GP.x, 0.95 + i * 0.28, GP.z); r.scale.setScalar(0.9 + 0.1 * Math.sin(t * 6 + i)); }); }],
  ...chorusShots(0, 0),
  // HOOK
  [62.3, 69.6, (t, u) => { girl.set(Object.assign(P.dance(t), { x: -1.4, z: 3.0, ry: 0.3 + Math.sin(t * 0.8) * 0.4, mouth: P.sing(t, 1) })); boy.set(sitB(t, { hy: -0.2, y: 0.12 + P.bounce(t) * 0.5 }));
    const a = (t - 62.3) * 0.32 - 0.6; camSet(V(-1.4 + Math.sin(a) * 6.5, 2.4, 3 + Math.cos(a) * 6.5), V(-1.4, 1.6, 3), 40); setBubbles(V(-1.4, 0.5, 3), 62.3, t, 120, 2.2, 1.4); can.visible = false; }],
  [69.6, 74.5, (t, u) => { const d = t - 69.6, st = Math.sin(d * 5) > 0; girl.set(standG(t, { x: -1.4, z: 2.8, ry: 0.6, rsx: -1.3, rex: -1.2 * (0.5 + 0.5 * Math.sin(t * 12)), hy: 0.3 }));
    boy.set({ x: 3.0 + (st ? -0.25 : 0.05), z: 2.0, ry: boyRy, llx: st ? -0.4 : 0.2, rkx: 0.2, lsx: -0.2, rsx: -2.6, rex: -2.0, rhz: Math.sin(t * 20) * 0.3, hy: 0.2 });
    camMove(u, V(0.8, 2.6, 9.4), V(0.8, 2.4, 8.6), V(0.8, 1.6, 2.2), V(0.8, 1.6, 2.2), 40); const [x, y] = proj(headPos(boy, 1.15)); ovSym('…', x, y, 110, 1, '#ffffff'); const [gx, gy] = proj(headPos(girl, 1.4)); ovSym('!', gx, gy, 130, clamp(d / 0.2)); }],
  [74.5, 77.8, (t, u) => { girl.set(sitG(t, { hx: 0.5, rsx: -0.9, rex: -1.3 })); boy.set(sitB(t)); phone.visible = true; attachToHand(phone, girl, 'R', V(0, -0.16, 0.05)); FX.face = 1; phone.scale.setScalar(1.4); drawPhone('msgs', t, 1);
    camMove(u, V(-2.4, 2.4, 4.6), V(-2.9, 2.0, 3.6), V(-3.4, 1.4, 1.9), V(-3.4, 1.4, 1.9), 30); FX.dark = 0.45; }],
  // VERSE 2
  [77.8, 81.3, (t, u) => { const d = t - 77.8; girl.set(sitG(t, { hx: 0.3, rsx: -1.1, rex: -1.1, hy: d > 2.4 ? -0.5 : 0.2, eye: d > 2.4 ? 'wink' : 'open' })); boy.set(sitB(t));
    phone.visible = true; attachToHand(phone, girl, 'R', V(0, -0.16, 0.05)); FX.face = d > 2.4 ? -1 : 1; phone.scale.setScalar(1.4); const n = Math.min(99, Math.floor(1 + d * d * 12)); drawPhone('msgs', t, n);
    msgStack.forEach((m, i) => { m.visible = d > i * 0.27; m.position.copy(headPos(girl, 0.3)).add(V(0.9 + (i % 2) * 0.15, -0.4 + i * 0.5, 0.5)); m.lookAt(camera.position); m.scale.setScalar(0.8 * sm((d - i * 0.27) / 0.15)); });
    camMove(u, V(-1.0, 2.6, 6.4), V(-1.2, 3.2, 6.8), V(-3, 2.0, 1.8), V(-2.8, 2.8, 1.8), 40); const [x, y] = proj(phone.position.clone().add(V(0, 0.6, 0))); ovSym(String(n), x + 60, y - 40, 70, 1, '#ff5f7a'); }],
  [81.3, 84.6, (t, u) => { const d = t - 81.3; girl.set(sitG(t, { rsx: -2.4, rsz: -0.4, rex: -2.0, hy: 0.4, eye: 'wink', hz: 0.12 })); boy.set(sitB(t));
    phone.visible = true; attachToHand(phone, girl, 'R', V(0, -0.1, 0.06)); FX.face = 1; phone.scale.setScalar(1.0); drawPhone('friends', t);
    camMove(u, V(-0.6, 2.6, 7.0), V(-1.0, 2.5, 6.4), V(-3.0, 2.1, 1.8), V(-3.0, 2.1, 1.8), 36);
    sbA.visible = true; sbA.position.copy(headPos(girl, 1.25)).add(V(0.9, 0, 0.3)); sbA.lookAt(camera.position); sbA.scale.set(-0.7, 0.7, 0.7); const [x, y] = proj(sbA.position); ovSym('?', x, y, 120, 1, '#ff7ad9'); }],
  [84.6, 87.0, (t, u) => { girl.set(sitG(t, { lsx: -1.0, lex: -1.9, rsx: -1.0, rex: -1.9, lean: 0.15, eye: 'open' })); boy.set(sitB(t)); camSet(V(-2.4 + (t - 84.6) * 0.2, 2.0, 4.6), V(-3.4, 1.9, 1.8), 30);
    const [x, y] = proj(headPos(girl, 0.5)); ovSym('!', x + 260, y - 60, 170 + 30 * pulse(t), 1); FX.flash = 0.4 * pulse(t); }],
  [87.0, 91.6, (t, u) => { const d = t - 87; girl.set(sitG(t, { hy: 0.1 })); boy.set(sitB(t, { hy: -0.1 })); camMove(u, V(0, 6, 9), V(0, 4.2, 9.5), V(0, 1.6, 1), V(0, 1.8, 1), 42);
    sparks.forEach((s, i) => { s.visible = true; const a = i / 8 * 6.28 + t; s.position.set(Math.cos(a) * (0.6 + pulse(t)), 2.0 + Math.sin(a) * (0.6 + pulse(t)), 1.6); s.rotation.set(0, 0, a - Math.PI / 2); s.scale.setScalar(1 + pulse(t)); });
    hearts.forEach((h, i) => { h.visible = i < 1; h.position.set(0, 2.0, 1.6); h.scale.setScalar(0.5 + 0.2 * pulse(t)); h.rotation.y = t * 2; }); setFireworks(t, [[88.0, V(0, 6, -6)], [89.2, V(-4, 7, -8)], [90.4, V(4, 7, -8)]]); }],
  [91.6, 95.0, (t, u) => { const d = t - 91.6, h1 = d < 1.7; girl.set(sitG(t, { eye: 'happy' })); boy.set(sitB(t, { mouth: h1 ? P.sing(t, 1) : 0, rsx: h1 ? 0 : -1.2 }));
    camSet(V(0, 3.2, 9.5), V(0, 1.8, 1), 40); sbB.visible = h1; sbB.position.copy(headPos(boy, 0.6)).lerp(headPos(girl, 0.6), sm(d / 1.5)).add(V(0, 0.9, 0)); sbB.lookAt(camera.position); sbB.scale.setScalar(0.6);
    phone.visible = !h1; if (!h1) { const e = sm((d - 1.7) / 1.3); phone.position.copy(headPos(girl, 0)).lerp(headPos(boy, 0), e).add(V(0, Math.sin(e * Math.PI) * 1.2, 0.3)); phone.rotation.set(0, t * 3, 0); phone.scale.setScalar(2.4); drawPhone('keypad', t, e); }
    if (h1) { const [x, y] = proj(sbB.position); ovSym('♪', x, y, 90, 1, '#ff4f9a'); } }],
  [95.0, 97.6, (t, u) => { const tf = 95.25; girl.set(standG(tf, { x: -2.6, rsx: -1.6, rex: -0.1, ry: 0.5, mouth: 0.8 })); boy.set(sitB(tf, { hy: -0.5 }));
    clk.visible = true; clk.position.set(0, 3.8, 0); clk.rotation.set(0, 0, 0); clk.scale.setScalar(1.2); mHand.rotation.z = -1.0; hHand.rotation.z = 2.0; setSnow(t);
    camSet(V(-0.5, 3.0, 9.4 - u * 0.6), V(-0.5, 2.4, 1), 40); FX.freeze = 1; }],
  ...chorusShots(54.8, 1),
  [117.2, 120.4, (t, u) => { girl.set(Object.assign(P.dance(t), { x: -1.4, z: 3.0, ry: 0.2, mouth: 0.6 })); boy.set(Object.assign(P.dance(t + 0.2, 0.6), { x: 1.2, z: 2.6, ry: -0.3, eye: 'happy' })); const a = (t - 117.2) * 0.4; camSet(V(Math.sin(a) * 8, 2.6, 2.8 + Math.cos(a) * 8), V(0, 1.6, 2.8), 40); setConfetti(t, 110); FX.dim = clamp((t - 119.6) / 0.8); }],
  // BRIDGE (slow)
  [120.4, 124.4, (t, u) => { const ts = 120.4 + (t - 120.4) * 0.3; girl.set(sitG(ts, { hx: -0.45, hy: 0.4, eye: 'open', mouth: P.sing(t, 1) * 0.5 })); boy.set(sitB(ts));
    clk.visible = true; clk.position.set(-1.0, 4.6, -1); clk.rotation.set(0.1, 0.3, Math.sin(t) * 0.05); clk.scale.setScalar(1.0); mHand.rotation.z = -1.2; hHand.rotation.z = 2.4;
    camMove(u, V(-5.0, 1.6, 6.0), V(-5.4, 1.8, 5.2), V(-1.5, 4.0, -2), V(-1.5, 4.2, -2), 44); FX.soft = 1; }],
  [124.4, 128.0, (t, u) => { const d = (t - 124.4) / 3.6; const st = clamp(d / 0.25), w = clamp((d - 0.25) / 0.75);
    girl.set(sitG(t, { lsx: -1.2, lsz: 0.6, lex: -0.2, hy: 0.5, eye: 'happy' }));
    const bx = lerp(BP.x, 1.2, sm(w)), bz = lerp(BP.z, 3.2, sm(w)), ws = Math.sin(t * 9) * 0.5 * (w > 0 && w < 1 ? 1 : 0);
    boy.set({ x: bx, z: bz, y: lerp(0.12, 0, st), ry: w > 0 ? -1.4 : boyRy, llx: lerp(-1.45, 0, st) + ws, rlx: lerp(-1.45, 0, st) - ws, lkx: lerp(1.45, 0, st), rkx: lerp(1.45, 0, st), lsx: -ws, rsx: ws });
    camMove(u, V(0.5, 3.0, 9.5), V(-0.5, 2.6, 8.4), V(0.4, 1.4, 2.4), V(-0.8, 1.4, 2.4), 42); FX.soft = 1; }],
  [128.0, 131.2, (t, u) => { const d = t - 128; girl.set(sitG(t, { eye: 'happy', hy: 0.6 })); boy.set({ x: 1.2, z: 3.2, ry: -0.5, y: 0, rsx: 0, rsz: -1.5, rex: -1.7 - 0.2 * Math.sin(t * 8), lsz: 0.3, lean: -0.15, hx: -0.15, eye: 'open' });
    camMove(u, V(2.6, 2.2, 7.4), V(2.2, 2.0, 6.6), V(1.2, 1.7, 3.2), V(1.2, 1.7, 3.2), 34);
    sparks.forEach((s, i) => { s.visible = d > 0.6; const a = i / 8 * 6.28; const p0 = boy.R.hd.getWorldPosition(V(0, 0, 0)); s.position.set(p0.x + Math.cos(a) * 0.5, p0.y + Math.sin(a) * 0.5, p0.z); s.rotation.set(0, 0, a - Math.PI / 2); s.scale.setScalar(0.5 + 0.5 * pulse(t)); }); FX.soft = 1; }],
  [131.2, 135.2, (t, u) => { const d = (t - 131.2) / 4; girl.set(sitG(t, { eye: 'open', hy: 0.6, mouth: P.sing(t, 1) * 0.5 })); boy.set({ x: 1.2, z: 3.2, ry: -0.7, hy: -0.3 });
    clk.visible = true; clk.position.set(0, 4.2, -2); clk.rotation.set(0, 0, 0); clk.scale.setScalar(0.9); mHand.rotation.z = -d * 12; hHand.rotation.z = -d * 1.6;
    moon.position.y = lerp(26, 10, sm(d)); skyMat.uniforms.dawn.value = sm(d) * 0.8; camMove(u, V(0, 2.4, 12), V(0, 3.0, 13.5), V(0, 3, -2), V(0, 4, -4), 46); FX.soft = 1; }],
  // DANCE BREAK
  [135.2, 140.0, (t, u) => { girl.set(Object.assign(P.dance(t, 1.3), { x: -1.4, z: 3.0, ry: Math.sin(t * 2) * 0.5, mouth: 0.6 })); boy.set(Object.assign(P.dance(t + BEAT, 1.1), { x: 1.4, z: 3.0, ry: -Math.sin(t * 2) * 0.5, eye: 'happy' }));
    const a = (t - 135.2) * 0.9; camSet(V(Math.sin(a) * 9, 2.6 + Math.sin(a * 2) * 0.6, 3 + Math.cos(a) * 9), V(0, 1.5, 3), 40); setConfetti(t, 135.2); setFireworks(t, [[135.4, V(-6, 9, -10)], [136.3, V(6, 10, -12)], [137.2, V(0, 11, -14)], [138.1, V(-5, 8, -9)], [139.0, V(5, 9, -10)]]); FX.strobe = 1; }],
  // FINAL CHORUS (gold)
  [140.0, 142.6, (t, u) => { girl.set(standG(t, { x: -0.8, z: 3.0, ry: 0.5, eye: 'happy' })); boy.set({ x: 0.7, z: 3.0, ry: -0.6, rsx: -1.4, rex: -0.4, y: P.bounce(t), mouth: P.sing(t, 1) * 0.6 });
    phone.visible = true; attachToHand(phone, boy, 'R', V(0, -0.2, 0.05)); FX.face = 1; phone.scale.setScalar(1.5); drawPhone('keypad', t, (t - 140) / 2.4);
    camMove(u, V(0.6, 2.4, 7.6), V(0.4, 2.2, 6.6), V(0, 1.6, 3), V(0, 1.6, 3), 36); const [x, y] = proj(phone.position.clone().add(V(0, 0.9, 0))); ovSym('?', x, y, 140, 1); FX.gold = 1; }],
  [142.6, 145.0, (t, u) => { girl.set({ x: -0.45, z: 3.2, ry: 0.3, y: P.bounce(t), rsx: -0.4, rsz: -0.5, eye: 'happy', mouth: P.sing(t, 1), hz: -0.18 }); boy.set({ x: 0.45, z: 3.2, ry: -0.3, y: P.bounce(t), lsx: -0.4, lsz: 0.5, eye: 'happy', hz: 0.18 });
    camMove(u, V(0, 2.2, 7.8), V(0, 2.4, 6.8), V(0, 2.0, 3), V(0, 2.2, 3), 38); hearts.forEach((h, i) => { h.visible = true; const a = i / 16 * 6.28 + t; h.position.set(Math.cos(a) * 1.7, 2.1 + Math.sin(a * 2) * 0.4, 3 + Math.sin(a) * 1.0); h.scale.setScalar(0.2); h.rotation.y = t * 3; }); FX.gold = 1; FX.dream = 1; }],
  [145.0, 146.8, (t, u) => { const d = (t - 145) / 1.8; girl.set(standG(t, { x: -0.8, z: 3.0, rsx: -1.55, rhz: 0.3, ry: 0.2 })); boy.set({ x: 1.6, z: 2.6, ry: -0.5, eye: 'happy' });
    const h = hearts[0]; h.visible = true; h.scale.setScalar(0.45); const hx = d < 0.45 ? lerp(1.2, -0.25, d / 0.45) : lerp(-0.25, 1.4, (d - 0.45) / 0.55); h.position.set(hx, 2.0, 3.6); h.rotation.y = t * 6;
    camSet(V(0, 2.4, 8.6), V(0, 1.8, 3), 38); const [x, y] = proj(V(-0.2, 2.0, 3.6)); ovX(x, y - 40, 340, sm((d - 0.4) / 0.1)); FX.gold = 1; }],
  [146.8, 148.8, (t, u) => { girl.set(standG(t, { x: -0.8, z: 3.0, lsx: -0.9, lsz: -0.55, lex: -1.7, rsx: -0.9, rsz: 0.55, rex: -1.7, hx: -0.4, hy: -0.6, ry: 0.4, y: 0, eye: 'wink' })); boy.set({ x: 1.6, z: 2.6, ry: -0.5 });
    camSet(V(0.2, 2.1, 6.0), V(-0.8, 1.8, 3), 34); const [x, y] = proj(headPos(girl, 0.4)); ovX(x, y, 380, sm((t - 147) / 0.12)); FX.gold = 1; }],
  [148.8, 152.4, (t, u) => { const d = t - 148.8; podium.visible = true; podium.position.set(0, 0, 2.2); globe.visible = true; globe.position.set(0, 4.4, -4); globe.rotation.y = t * 0.6;
    girl.set(Object.assign(P.dance(t, 0.7), { x: 0, z: 2.2, y: 1.2 + P.bounce(t), ry: 0, lsz: 2.6, rsz: -2.6, lth: 1, rth: 1, mouth: P.sing(t, 1) })); boy.set({ x: 2.2, z: 3.4, ry: -0.6, lsz: 2.2, rsz: -2.2, eye: 'happy', y: P.bounce(t) });
    camMove(u, V(0, 1.4, 9.5), V(0, 2.6, 8.2), V(0, 2.6, 2), V(0, 3.0, 1), 44); setConfetti(t, 148.8); setFireworks(t, [[149.0, V(-5, 9, -8)], [149.8, V(5, 10, -9)], [150.6, V(0, 12, -11)], [151.4, V(-7, 8, -7)]]); FX.gold = 1; }],
  [152.4, 157.3, (t, u) => { const d = t - 152.4; girl.set(Object.assign(standG(t, { x: -0.6, z: 3.0, ry: 0.2, rsx: -1.4, rex: -0.4, rth: 1, eye: d > 1.6 ? 'wink' : 'happy' }), d > 1.6 ? { lsz: 2.4 } : {})); boy.set({ x: 1.0, z: 2.8, ry: -0.4, eye: 'happy', y: P.bounce(t) });
    can.visible = true; can.position.set(1.8, 0.8, 1.2); can.rotation.set(0, t, 0); can.scale.setScalar(1.0); setBubbles(V(1.8, 1.5, 1.2), 153.6, t, NB, 1.4, 2.5);
    camMove(u, V(-0.4, 2.0, 6.4), V(0.4, 2.2, 7.4), V(-0.4, 1.8, 3), V(0.2, 1.8, 3), 36); FX.gold = 1; }],
  // OUTRO
  [157.3, 173.2, (t, u) => { const d = t - 157.3; girl.set(sitG(t, { x: -0.55, z: 0.0, ry: 0.25, mouth: 0, eye: 'happy', y: 0.12, lsx: -1.0, rsx: -0.9, rex: -0.6 })); boy.set(sitB(t, { x: 0.55, z: 0.0, ry: -0.25, eye: 'happy', lsx: -0.9, lex: -0.6 }));
    herStool.position.set(-0.55, 0, 0.0); hisStool.position.set(0.55, 0, 0.0); herTable.position.set(0, 0, 0.9); hisTable.visible = false;
    phone.visible = true; phone.position.set(0.1, 1.12, 1.1); phone.rotation.set(-Math.PI / 2, 0, Math.sin(t * 40) * 0.05 * (d < 11 ? 1 : 0)); phone.scale.setScalar(1.6); drawPhone('call', t);
    buzz.forEach((b, i) => { b.visible = d < 11; b.position.set(0.1, 1.25, 1.1); b.rotation.set(-Math.PI / 2, 0, Math.PI * 0.8 + (i % 2) * Math.PI); b.scale.setScalar(1.6 + ((t * 2 + i / 3) % 1) * 0.8); });
    camMove(clamp(d / 14), V(0.1, 2.3, 2.2), V(0, 9, 16), V(0.1, 1.1, 1.1), V(0, 1.6, 0.5), 34); FX.fade = sm((d - 12.6) / 2.6); FX.gold = 0.5; }],
];

// ---------- frame ----------
function reset() {
  ALL_PROPS.forEach(o => o.visible = false); phone.scale.setScalar(1); doorPanel.rotation.y = 0;
  herStool.position.set(GP.x, 0, GP.z); hisStool.position.set(BP.x, 0, BP.z); herTable.position.set(-3.1, 0, 0.9); hisTable.visible = true;
  moon.position.y = 26; skyMat.uniforms.dawn.value = 0; skyMat.uniforms.gold.value = 0; beam.material.color.setRGB(2.6, 0.5, 1.9); FX = {};
}
let curShot = null;
function frame(t) {
  reset();
  const sh = SHOTS.find(s => t >= s[0] && t < s[1]) || SHOTS[SHOTS.length - 1];
  const u = clamp((t - sh[0]) / (sh[1] - sh[0]));
  g2.clearRect(0, 0, W, H);
  // world animation
  const p = pulse(t), tf = FX.freeze ? 95.25 : t;
  const pa = poolGeo.attributes.position.array; for (let i = 0; i < pa.length; i += 3) pa[i + 1] = Math.sin(poolBase[i] * 2.2 + tf * 2.2) * 0.04 + Math.cos(poolBase[i + 2] * 1.7 + tf * 1.6) * 0.04; poolGeo.attributes.position.needsUpdate = true; poolGeo.computeVertexNormals();
  bulbs.forEach((b, i) => b.material.color.set(bulbCols[(i + beatN(tf)) % 5]).multiplyScalar(1.4 + 1.6 * ((i + beatN(tf)) % 3 === 0 ? pulse(tf) : 0.2)));
  neonHeart.scale.setScalar(2.2 * (1 + 0.06 * pulse(tf))); neonRing.rotation.z = tf * 0.4;
  pinkL.position.set(Math.sin(tf * 0.7) * 6, 4, 3 + Math.cos(tf * 0.7) * 3); cyanL.position.set(-Math.sin(tf * 0.6) * 6, 4, 2 - Math.cos(tf * 0.6) * 3);
  pinkL.intensity = 10 + 14 * pulse(tf); cyanL.intensity = 10 + 14 * pulse(tf + BEAT / 2);
    // run shot (shot draws overlay into a deferred canvas)
  OVC.clearRect(0, 0, W, H); g2_ = OVC; sh[2](t, u); g2_ = null;
  if (FX.gold) { skyMat.uniforms.gold.value = 0.55 * FX.gold; hemi.color.set(0xffe3a8); } else hemi.color.set(0xc9b8ff);
  if (FX.soft) { bloom.strength = 0.6; renderer.toneMappingExposure = 0.95; } else { bloom.strength = 0.7 + (FX.strobe ? 0.5 * p : 0.12 * p); renderer.toneMappingExposure = 1.05; }
  if (FX.face) { phone.lookAt(camera.position); if (FX.face < 0) phone.rotateY(Math.PI); }
  composer.render();
  g2.drawImage(renderer.domElement, 0, 0);
  if (FX.dream) { const r = g2.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H); r.addColorStop(0, 'rgba(255,120,200,0)'); r.addColorStop(1, 'rgba(255,120,200,.55)'); g2.fillStyle = r; g2.fillRect(0, 0, W, H); }
  if (FX.freeze) { ovTint('#6fd8ff', 0.28); g2.save(); g2.strokeStyle = 'rgba(220,250,255,.9)'; g2.lineWidth = 26; g2.strokeRect(13, 13, W - 26, H - 26); g2.restore(); }
  if (FX.spot) { const [x, y] = proj(headPos(girl, 0.2)); const r = g2.createRadialGradient(x, y, 50, x, y, 520); r.addColorStop(0, 'rgba(255,240,180,.35)'); r.addColorStop(1, 'rgba(255,240,180,0)'); g2.fillStyle = r; g2.fillRect(0, 0, W, H); }
  if (FX.dark) ovTint('#120024', FX.dark);
  if (FX.strobe) ovTint(['#ff3fa8', '#30e0ff', '#ffe14d'][beatN(t) % 3], 0.18 * p);
  ovVignette(0.55);
  g2.drawImage(OVcv, 0, 0);
  if (FX.flash) ovTint('#ffffff', FX.flash * 0.8);
  if (FX.title) ovTitle(t, 3.6, 7.7);
  drawLyric(t);
  if (t > 3.6) ovWatermark();
  if (FX.dim) ovTint('#000', FX.dim * 0.35);
  if (FX.fade) ovTint('#000', FX.fade);
  return out;
}
// overlay redirect: shot overlay funcs draw into OVC
const OVcv = document.createElement('canvas'); OVcv.width = W; OVcv.height = H; const OVC = OVcv.getContext('2d'); let g2_ = null;
// wrap overlay functions to use OVC while in shot
const _draw = { ovX, ovSym, ovArrow };
ovX = (...a) => withCtx(() => _draw.ovX(...a)); ovSym = (...a) => withCtx(() => _draw.ovSym(...a)); ovArrow = (...a) => withCtx(() => _draw.ovArrow(...a));
function withCtx(f) { if (!g2_) return f(); const s = g2; g2 = g2_; try { f(); } finally { g2 = s; } }
return { frame, renderer, W, H, LYR, SHOTS, canvas: out, DUR: 173.1 };
};
