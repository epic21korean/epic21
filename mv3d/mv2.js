// EPIC21 「시원시원한 여자」 실사 사진 + 3D 움직임 MV renderer v2 (deterministic t -> frame)
window.MV2BUILD = async function (LIB, BASE) {
const T = LIB.THREE;
const W = 1920, H = 1080, BEAT = 60 / 133.93, B0 = 0.30;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, u) => a + (b - a) * u;
const rnd = s => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const V = (x, y, z) => new T.Vector3(x, y, z);
const beatPh = t => ((t - B0) / BEAT % 1 + 1) % 1, beatN = t => Math.floor((t - B0) / BEAT);
const pulse = t => Math.exp(-beatPh(t) * 5);
const snapB = t => B0 + Math.round((t - B0) / BEAT) * BEAT;

// ---------- renderer ----------
const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.toneMapping = T.NoToneMapping;
const scene = new T.Scene(); scene.background = new T.Color(0x000000);
const camera = new T.PerspectiveCamera(30, W / H, 0.05, 100); const CZ = 1 / Math.tan(15 * Math.PI / 180); camera.position.set(0, 0, CZ);
const composer = new LIB.EffectComposer(renderer); composer.addPass(new LIB.RenderPass(scene, camera));
const bloom = new LIB.UnrealBloomPass(new T.Vector2(W / 2, H / 2), 0.45, 0.6, 0.86); composer.addPass(bloom); composer.addPass(new LIB.OutputPass());
const out = document.createElement('canvas'); out.width = W; out.height = H; let g2 = out.getContext('2d');

// ---------- photos ----------
const IDS = 'i01 i02 i03 i04 i05a i05b i06a i06b i07 i08a i08b i09 i10 i11a i11b c1a c1b c2 c3 c4 c5 c6 c7 h1 h2 h3 h4 v1a v1b v2 v3 v4 v5a v5b v6 b1 b2a b2b b3 b4 d1 f1 f2 f4 o1'.split(' ');
const TEX = {}; const loader = new T.TextureLoader();
await Promise.all(IDS.flatMap(id => ['A', 'B'].map(s => new Promise((res, rej) => loader.load(BASE + 'pics/' + id + '_' + s + '.jpg', tx => { tx.colorSpace = T.SRGBColorSpace; tx.minFilter = T.LinearMipmapLinearFilter; tx.anisotropy = 8; TEX[id + '_' + s] = tx; res(); }, undefined, rej)))));
const PA = 1376 / 768;
const mkPlane = () => { const m = new T.Mesh(new T.PlaneGeometry(2 * PA, 2), new T.MeshBasicMaterial({ transparent: true })); scene.add(m); return m; };
const planeA = mkPlane(), planeB = mkPlane();

// ---------- particles ----------
const glow = (c, k = 2.2) => new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k), transparent: true });
const cols = [0xff4fb0, 0xffe14d, 0x55f0ff, 0x8dff6a, 0xff8a3d, 0xffffff];
function inst(geo, mat, n, colorize) { const m = new T.InstancedMesh(geo, mat, n); if (colorize) { const c = new T.Color(); for (let i = 0; i < n; i++) m.setColorAt(i, c.set(cols[i % 6]).multiplyScalar(colorize)); } m.frustumCulled = false; scene.add(m); return m; }
const NB = 220, NC = 260, NF = 300, NS = 160, NK = 60;
const bubbles = inst(new T.SphereGeometry(1, 14, 10), new T.MeshBasicMaterial({ color: 0xd8fbff, transparent: true, opacity: 0.55 }), NB);
const bubRim = inst(new T.RingGeometry(0.85, 1, 24), glow(0xffffff, 1.6), NB);
const confetti = inst(new T.PlaneGeometry(0.035, 0.06), new T.MeshBasicMaterial({ side: T.DoubleSide }), NC, 1.5);
const fw = inst(new T.SphereGeometry(0.012, 6, 4), new T.MeshBasicMaterial(), NF, 3);
const snow = inst(new T.OctahedronGeometry(0.018), glow(0xe0f8ff, 2), NS);
const sparks = inst(new T.SphereGeometry(0.01, 6, 4), new T.MeshBasicMaterial(), NK, 3.5);
const hs = new T.Shape(); hs.moveTo(0, -0.5); hs.bezierCurveTo(-0.1, -0.35, -0.6, -0.1, -0.6, 0.2); hs.bezierCurveTo(-0.6, 0.55, -0.15, 0.6, 0, 0.3); hs.bezierCurveTo(0.15, 0.6, 0.6, 0.55, 0.6, 0.2); hs.bezierCurveTo(0.6, -0.1, 0.1, -0.35, 0, -0.5);
const hearts = inst(new T.ExtrudeGeometry(hs, { depth: 0.15, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3 }), glow(0xff5fae, 1.5), 40);
const ALLP = [bubbles, bubRim, confetti, fw, snow, sparks, hearts];
const M4 = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), S3 = new T.Vector3();
const zero = m => { for (let i = 0; i < m.count; i++) m.setMatrixAt(i, M4.makeScale(0, 0, 0)); };
// screen-normalized (0..1) to world at depth z (z=0 is photo plane)
function nw(nx, ny, z = 0.6) { const d = CZ - z, h = Math.tan(15 * Math.PI / 180) * d; return V((nx - 0.5) * 2 * h * W / H, (0.5 - ny) * 2 * h, z); }
function pBubbles(t, t0, nx, ny, spread = 1, n = NB) { bubbles.visible = bubRim.visible = true; const d = t - t0;
  for (let i = 0; i < NB; i++) { const dd = d - rnd(i) * 0.5; if (i >= n || dd < 0) { bubbles.setMatrixAt(i, M4.makeScale(0, 0, 0)); bubRim.setMatrixAt(i, M4.makeScale(0, 0, 0)); continue; }
    const z = 0.2 + rnd(i + 5) * 1.6, o = nw(nx, ny, z), a = rnd(i + 1) * 6.28, r = (0.05 + rnd(i + 2) * 0.5) * spread * Math.min(1, dd * 2.5);
    const s = (0.008 + rnd(i + 3) * 0.03) * (1 - clamp((dd - 2.6) / 0.8));
    S3.set(o.x + Math.cos(a) * r + Math.sin(dd * 3 + i) * 0.02, o.y + dd * (0.25 + rnd(i + 4) * 0.5), o.z); M4.compose(S3, Q.identity(), V(s, s, s)); bubbles.setMatrixAt(i, M4); bubRim.setMatrixAt(i, M4); }
  bubbles.instanceMatrix.needsUpdate = bubRim.instanceMatrix.needsUpdate = true; }
function pConfetti(t, t0, gold) { confetti.visible = true; const d = t - t0;
  for (let i = 0; i < NC; i++) { const z = 0.1 + rnd(i + 7) * 2.2, h = Math.tan(15 * Math.PI / 180) * (CZ - z); const y = h - ((d * (0.25 + rnd(i) * 0.35) + rnd(i + 1) * 2.2 * h) % (2.2 * h));
    E.set(d * 4 + i, d * 3 + i * 0.3, d * 2); Q.setFromEuler(E); M4.compose(V((rnd(i + 2) - 0.5) * 2.2 * h * W / H + Math.sin(d * 2 + i) * 0.03, y, z), Q, V(1, 1, 1)); confetti.setMatrixAt(i, M4);
    if (gold !== undefined) confetti.setColorAt(i, new T.Color(gold && i % 3 ? 0xffd23f : cols[i % 6]).multiplyScalar(1.5)); }
  confetti.instanceMatrix.needsUpdate = true; if (confetti.instanceColor) confetti.instanceColor.needsUpdate = true; }
function pFireworks(t, list) { fw.visible = true; let k = 0;
  for (const [t0, nx, ny] of list) { const d = t - t0, c = nw(nx, ny, 0.3); for (let i = 0; i < 60 && k < NF; i++, k++) { if (d < 0 || d > 1.5) { fw.setMatrixAt(k, M4.makeScale(0, 0, 0)); continue; }
      const a = rnd(k) * 6.28, b = (rnd(k + 1) - 0.5) * 3.1, r = 0.35 * (1 - Math.exp(-d * 3)), s = 1 - d / 1.5;
      M4.makeTranslation(c.x + Math.cos(a) * Math.cos(b) * r, c.y + Math.sin(b) * r - d * d * 0.08, c.z + Math.sin(a) * Math.cos(b) * r * 0.3); M4.scale(V(s, s, s)); fw.setMatrixAt(k, M4); } }
  for (; k < NF; k++) fw.setMatrixAt(k, M4.makeScale(0, 0, 0)); fw.instanceMatrix.needsUpdate = true; }
function pSnow(t) { snow.visible = true; for (let i = 0; i < NS; i++) { const z = 0.1 + rnd(i + 3) * 2, h = Math.tan(15 * Math.PI / 180) * (CZ - z); E.set(i, i * 2, 0); Q.setFromEuler(E); M4.compose(V((rnd(i) - 0.5) * 2.2 * h * W / H, h - ((rnd(i + 1) * 2 * h + t * 0.0) % (2 * h)), z), Q, V(1, 1, 1)); snow.setMatrixAt(i, M4); } snow.instanceMatrix.needsUpdate = true; }
function pSparks(t, nx, ny, R = 0.25) { sparks.visible = true; const c = nw(nx, ny, 0.5);
  for (let i = 0; i < NK; i++) { const ph = (t * (0.8 + rnd(i) * 0.8) + rnd(i + 1)) % 1, a = rnd(i + 2) * 6.28, r = R * ph, s = 1.6 * (1 - ph);
    M4.makeTranslation(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.8, c.z); M4.scale(V(s, s, s)); sparks.setMatrixAt(i, M4); } sparks.instanceMatrix.needsUpdate = true; }
function pHearts(t, nx, ny, n = 18, spread = 0.5) { hearts.visible = true;
  for (let i = 0; i < 40; i++) { if (i >= n) { hearts.setMatrixAt(i, M4.makeScale(0, 0, 0)); continue; } const ph = (t * 0.35 + rnd(i)) % 1, z = 0.3 + rnd(i + 4) * 1.2, c = nw(nx, ny, z);
    E.set(0, t * 2 + i, Math.sin(t * 3 + i) * 0.3); Q.setFromEuler(E); const s = (0.025 + rnd(i + 2) * 0.03) * Math.sin(ph * Math.PI);
    M4.compose(V(c.x + (rnd(i + 1) - 0.5) * spread * 2 + Math.sin(t * 2 + i) * 0.03, c.y + ph * 0.5, c.z), Q, V(s, s, s)); hearts.setMatrixAt(i, M4); } hearts.instanceMatrix.needsUpdate = true; }

// ---------- lyrics ----------
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

// ---------- sequence: [t0, t1, [images], fx] ----------
function chorusSeq(o, alt) { const a = alt ? ['B', 'A'] : ['A', 'B'];
  return [[43.0 + o, 45.0 + o, ['c1a_' + a[0], 'c1a_' + a[1]], { q: [[0.62, 0.22]] }], [45.0 + o, 47.0 + o, ['c1b_' + a[0], 'c1b_' + a[1]], { x: [[0.72, 0.3, 150]] }],
    [47.0 + o, 50.6 + o, ['c2_' + a[0], 'c2_' + a[1]], { hearts: [0.5, 0.45] }], [50.6 + o, 53.2 + o, ['c3_' + a[0], 'c3_' + a[1]], { q: [[0.33, 0.2]] }],
    [53.2 + o, 55.2 + o, ['c4_' + a[0], 'c4_' + a[1]], { hearts: [0.5, 0.35], dream: 1 }], [55.2 + o, 56.6 + o, ['c5_' + a[0]], { x: [[0.5, 0.42, 380]] }],
    [56.6 + o, 58.2 + o, ['c6_' + a[0]], { x: [[0.5, 0.42, 380]] }], [58.2 + o, 62.3 + o, ['c7_' + a[0], 'c7_' + a[1]], { bub: [0.35, 0.65], flash: 58.25 + o, conf: 1, shake: 1 }]]; }
const SEQ = [
  [0, 2.6, ['i01_A', 'i01_B'], { buzz: [0.55, 0.62], fadeIn: 1 }],
  [2.6, 7.9, ['i02_A', 'i02_B'], { title: 1, fw: [[3.2, 0.3, 0.2], [4.0, 0.7, 0.15], [4.9, 0.5, 0.12], [5.8, 0.2, 0.25], [6.6, 0.8, 0.2], [7.3, 0.45, 0.18]] }],
  [7.9, 11.8, ['i03_A', 'i03_B'], { buzz: [0.56, 0.58] }],
  [11.8, 15.7, ['i04_A', 'i04_B'], { sweat: [0.62, 0.25], shake: 0.5 }],
  [15.7, 17.0, ['i05a_A'], { arrowUp: [0.5, 0.35] }], [17.0, 18.7, ['i05b_A', 'i05b_B'], { x: [[0.5, 0.25, 200]] }],
  [18.7, 20.2, ['i06a_B'], { sparks: [0.6, 0.5], push: 1 }], [20.2, 22.0, ['i06b_A', 'i06b_B'], { sparks: [0.5, 0.45] }],
  [22.0, 26.7, ['i07_A', 'i07_B'], { conf: 1, fw: [[22.2, 0.2, 0.15], [23.0, 0.75, 0.1], [23.8, 0.35, 0.2], [24.6, 0.85, 0.2], [25.4, 0.15, 0.1], [26.1, 0.6, 0.15]] }],
  [26.7, 28.4, ['i08a_B'], { push: 1, tick: 1 }], [28.4, 30.7, ['i08b_A', 'i08b_B'], { arrow: [0.55, 0.45, 0] }],
  [30.7, 34.5, ['i09_A', 'i09_B'], { x: [[0.68, 0.4, 230]] }],
  [34.5, 37.8, ['i10_A', 'i10_B'], { speech: [[0.2, 0.26], [0.8, 0.24]] }],
  [37.8, 40.0, ['i11a_A', 'i11a_B'], { push: 1, beam: 1 }], [40.0, 42.9, ['i11b_A', 'i11b_B'], { hearts: [0.45, 0.4], dream: 0.6 }],
  ...chorusSeq(0, 0),
  [62.3, 69.6, ['h1_A', 'h2_A', 'h1_B', 'h2_B', 'h1_A', 'h2_B'], { conf: 1, fast: 1, bub: [0.5, 0.95] }],
  [69.6, 72.0, ['h3_A', 'h3_B'], { dots: [0.5, 0.2] }], [72.0, 74.5, ['h4_A', 'h4_B'], { excl: [0.62, 0.2] }],
  [74.5, 77.8, ['v1a_A'], { dark: 0.45, push: 1 }],
  [77.8, 80.3, ['v1a_A', 'v1a_B'], { chats: [0.62, 0.5] }], [80.3, 81.4, ['v1b_A', 'v1b_B'], {}],
  [81.4, 84.6, ['v2_A', 'v2_B'], { q: [[0.75, 0.2]] }],
  [84.6, 87.0, ['v3_A', 'v3_B'], { excl: [0.72, 0.22], flashBeat: 1, shake: 0.6 }],
  [87.0, 91.6, ['v4_A', 'v4_B'], { sparks: [0.5, 0.45], hearts: [0.5, 0.5] }],
  [91.6, 93.3, ['v5a_A', 'v5a_B'], { note: [0.3, 0.2] }], [93.3, 95.0, ['v5b_A', 'v5b_B'], { sparks: [0.5, 0.45] }],
  [95.0, 97.6, ['v6_A'], { freeze: 1 }],
  ...chorusSeq(54.8, 1),
  [117.2, 120.4, ['h2_B', 'd1_A', 'h1_B', 'd1_B'], { conf: 1, fast: 1, dimEnd: 1 }],
  [120.4, 124.4, ['b1_A', 'b1_B'], { soft: 1, slow: 1, tickStop: 1 }],
  [124.4, 126.2, ['b2a_A', 'b2a_B'], { soft: 1 }], [126.2, 128.0, ['b2b_A', 'b2b_B'], { soft: 1 }],
  [128.0, 131.2, ['b3_A', 'b3_B'], { soft: 1, sparks: [0.5, 0.45] }],
  [131.2, 135.2, ['b4_A', 'b4_B'], { soft: 1, slow: 1 }],
  [135.2, 140.0, ['d1_A', 'h2_A', 'd1_B', 'h1_A', 'd1_A', 'h2_B', 'd1_B', 'c7_B'], { conf: 1, fast: 1, strobe: 1, fw: [[135.4, 0.2, 0.15], [136.3, 0.8, 0.12], [137.2, 0.5, 0.1], [138.1, 0.3, 0.2], [139.0, 0.7, 0.15]] }],
  [140.0, 142.6, ['f1_A', 'f1_B'], { q: [[0.55, 0.2]], gold: 1 }], [142.6, 145.0, ['f2_A', 'f2_B'], { hearts: [0.5, 0.4], gold: 1, dream: 0.5 }],
  [145.0, 146.8, ['c5_B'], { x: [[0.5, 0.42, 380]], gold: 1 }], [146.8, 148.8, ['c6_B'], { x: [[0.5, 0.42, 380]], gold: 1 }],
  [148.8, 152.4, ['f4_A', 'f4_B'], { conf: 1, goldConf: 1, gold: 1, fw: [[149.0, 0.25, 0.15], [149.8, 0.75, 0.12], [150.6, 0.5, 0.1], [151.4, 0.15, 0.2]] }],
  [152.4, 154.0, ['c5_A'], { x: [[0.5, 0.42, 380]], gold: 1 }], [154.0, 157.3, ['c7_B', 'h2_A'], { bub: [0.4, 0.7], gold: 1 }],
  [157.3, 173.2, ['o1_A', 'o1_B'], { buzz: [0.5, 0.74], slow: 1, outro: 1 }],
];
// precompute cuts for every segment
const CUTS = []; // [t0, t1, img, segIndex, shotIndex]
SEQ.forEach((s, si) => { const [t0, t1, imgs, fx] = s; let n = imgs.length;
  let pts; if (fx.fast) { pts = [t0]; let k = 1; let c = snapB(t0) + 2 * BEAT; while (c < t1 - 0.3) { pts.push(c); c += 2 * BEAT; } }
  else { pts = [t0]; for (let k = 1; k < n; k++) { const c = snapB(t0 + (t1 - t0) * k / n); if (c > t0 + 0.4 && c < t1 - 0.4) pts.push(c); } }
  pts.forEach((p, k) => CUTS.push([p, k + 1 < pts.length ? pts[k + 1] : t1, imgs[k % n], si, CUTS.length])); });

// ---------- 2D overlay helpers ----------
const FONT = '"Pretendard", "Malgun Gothic", "Noto Sans CJK KR", sans-serif';
function drawLyric(t) {
  const l = LYR.find(l => t >= l[0] - 0.12 && t <= l[1] + 0.15); if (!l) return;
  const [t0, t1, text, kws] = l; const a = clamp((t - t0 + 0.12) / 0.15) * clamp((t1 + 0.15 - t) / 0.15), pop = 0.88 + 0.12 * sm((t - t0 + 0.12) / 0.2);
  let fs = 84; g2.font = `900 ${fs}px ${FONT}`; let w = g2.measureText(text).width; if (w > 1700) { fs = Math.floor(fs * 1700 / w); g2.font = `900 ${fs}px ${FONT}`; w = g2.measureText(text).width; }
  const prog = clamp((t - t0) / Math.max(0.5, t1 - t0 - 0.25));
  const segs = []; let i = 0; while (i < text.length) { const k = kws.find(k => text.startsWith(k, i)); if (k) { segs.push([k, 1]); i += k.length; } else { if (segs.length && !segs[segs.length - 1][1]) segs[segs.length - 1][0] += text[i]; else segs.push([text[i], 0]); i++; } }
  g2.save(); g2.globalAlpha = a; g2.translate(W / 2, 985); g2.scale(pop, pop); g2.textBaseline = 'middle'; g2.lineJoin = 'round';
  const pg = g2.createLinearGradient(-w / 2, 0, w / 2, 0); pg.addColorStop(0, 'rgba(30,5,50,0)'); pg.addColorStop(0.15, 'rgba(30,5,50,.6)'); pg.addColorStop(0.85, 'rgba(30,5,50,.6)'); pg.addColorStop(1, 'rgba(30,5,50,0)');
  g2.fillStyle = pg; g2.fillRect(-w / 2 - 120, -fs * 0.75, w + 240, fs * 1.5);
  let x = -w / 2; const fillEnd = -w / 2 + w * prog;
  for (const [s, k] of segs) { const sw = g2.measureText(s).width;
    g2.lineWidth = 16; g2.strokeStyle = k ? '#7a1250' : '#3a1060'; g2.strokeText(s, x, 4);
    g2.fillStyle = k ? '#5ff5ff' : '#ffffff'; g2.fillText(s, x, 0);
    if (fillEnd > x) { g2.save(); g2.beginPath(); g2.rect(x, -fs, Math.min(sw, fillEnd - x), fs * 2); g2.clip(); g2.fillStyle = k ? '#ff7ad9' : '#ffe14d'; g2.fillText(s, x, 0); g2.restore(); }
    x += sw; }
  g2.restore();
}
function ovX(x, y, s, a) { if (a <= 0) return; const k = 1 + 0.4 * (1 - sm(a * 1.4)); g2.save(); g2.globalAlpha = clamp(a * 2); g2.translate(x, y); g2.scale(k, k); g2.rotate(-0.08); g2.lineCap = 'round'; g2.shadowColor = 'rgba(0,0,0,.5)'; g2.shadowBlur = 20; g2.lineWidth = s * 0.26; g2.strokeStyle = '#fff'; g2.beginPath(); g2.moveTo(-s / 2, -s / 2); g2.lineTo(s / 2, s / 2); g2.moveTo(s / 2, -s / 2); g2.lineTo(-s / 2, s / 2); g2.stroke(); g2.shadowBlur = 0; g2.lineWidth = s * 0.17; g2.strokeStyle = '#ff2d55'; g2.stroke(); g2.restore(); }
function ovSym(ch, x, y, s, a, col = '#ffe14d') { if (a <= 0) return; g2.save(); g2.globalAlpha = clamp(a); g2.font = `900 ${s}px ${FONT}`; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.lineWidth = s * 0.14; g2.strokeStyle = '#3a1060'; g2.lineJoin = 'round'; g2.strokeText(ch, x, y); g2.fillStyle = col; g2.fillText(ch, x, y); g2.restore(); }
function ovArrow(x, y, ang, len, a, col = '#ffe14d') { if (a <= 0) return; g2.save(); g2.globalAlpha = clamp(a); g2.translate(x, y); g2.rotate(ang); g2.lineCap = 'round'; g2.lineJoin = 'round'; for (const [lw, c] of [[34, '#3a1060'], [20, col]]) { g2.lineWidth = lw; g2.strokeStyle = c; g2.beginPath(); g2.moveTo(0, 0); g2.lineTo(len, 0); g2.moveTo(len - 40, -36); g2.lineTo(len, 0); g2.lineTo(len - 40, 36); g2.stroke(); } g2.restore(); }
function ovTint(col, a, mode) { if (a <= 0) return; g2.save(); g2.globalAlpha = clamp(a); if (mode) g2.globalCompositeOperation = mode; g2.fillStyle = col; g2.fillRect(0, 0, W, H); g2.restore(); }
function ovVignette(a) { const r = g2.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 1.0); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, `rgba(10,0,25,${a})`); g2.fillStyle = r; g2.fillRect(0, 0, W, H); }
function ovBuzz(x, y, t) { g2.save(); g2.lineCap = 'round'; for (let i = 0; i < 3; i++) { const ph = (t * 2.2 + i / 3) % 1; g2.globalAlpha = 1 - ph; g2.lineWidth = 12; g2.strokeStyle = '#ffe14d'; g2.shadowColor = '#ffe14d'; g2.shadowBlur = 25;
  for (const s of [-1, 1]) { g2.beginPath(); g2.arc(x, y, 50 + ph * 120, s > 0 ? -0.6 : Math.PI - 0.6, s > 0 ? 0.6 : Math.PI + 0.6); g2.stroke(); } } g2.restore(); }
function ovSweat(x, y, t) { const ph = (t * 0.7) % 1; g2.save(); g2.globalAlpha = 1 - ph * 0.6; g2.translate(x, y + ph * 60); g2.fillStyle = '#8fe3ff'; g2.strokeStyle = '#ffffff'; g2.lineWidth = 6; g2.beginPath(); g2.moveTo(0, -45); g2.bezierCurveTo(30, -5, 28, 30, 0, 30); g2.bezierCurveTo(-28, 30, -30, -5, 0, -45); g2.fill(); g2.stroke(); g2.restore(); }
function ovSpeech(x, y, s, a) { if (a <= 0) return; g2.save(); g2.globalAlpha = clamp(a); g2.translate(x, y); g2.fillStyle = 'rgba(255,255,255,.95)'; g2.strokeStyle = '#3a1060'; g2.lineWidth = 8; g2.beginPath(); g2.ellipse(0, 0, s, s * 0.7, 0, 0, 7); g2.moveTo(-s * 0.3, s * 0.6); g2.lineTo(-s * 0.55, s * 1.1); g2.lineTo(-s * 0.02, s * 0.66); g2.fill(); g2.stroke(); g2.restore(); }
function ovChat(x, y, a) { if (a <= 0) return; g2.save(); g2.globalAlpha = clamp(a); g2.fillStyle = 'rgba(255,255,255,.95)'; g2.strokeStyle = '#3a1060'; g2.lineWidth = 6; g2.beginPath(); g2.roundRect(x - 110, y - 40, 220, 80, 30); g2.fill(); g2.stroke(); g2.fillStyle = '#9b7fd1'; for (let k = 0; k < 3; k++) { g2.beginPath(); g2.arc(x - 45 + k * 45, y, 12, 0, 7); g2.fill(); } g2.restore(); }
function ovBadge(x, y, n, s) { g2.save(); g2.translate(x, y); g2.scale(s, s); g2.fillStyle = '#ff2d55'; g2.strokeStyle = '#fff'; g2.lineWidth = 8; g2.beginPath(); g2.arc(0, 0, 60, 0, 7); g2.fill(); g2.stroke(); g2.fillStyle = '#fff'; g2.font = `900 64px ${FONT}`; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(String(n), 0, 4); g2.restore(); }
function ovClock(x, y, r, t, stop) { g2.save(); g2.translate(x, y); g2.fillStyle = 'rgba(255,248,232,.95)'; g2.strokeStyle = '#ff4f9a'; g2.lineWidth = 14; g2.beginPath(); g2.arc(0, 0, r, 0, 7); g2.fill(); g2.stroke();
  g2.fillStyle = '#3a1060'; g2.font = `800 ${r * 0.28}px ${FONT}`; g2.textAlign = 'center'; g2.textBaseline = 'middle'; for (const [n, a] of [[12, 0], [3, 1.5708], [6, 3.1416], [9, 4.712]]) g2.fillText(String(n), Math.sin(a) * r * 0.72, -Math.cos(a) * r * 0.72);
  const ma = stop ? 5.6 : t * 8, ha = stop ? 6.1 : t * 0.8; g2.lineCap = 'round'; g2.strokeStyle = '#3a1060'; g2.lineWidth = 10; g2.beginPath(); g2.moveTo(0, 0); g2.lineTo(Math.sin(ma) * r * 0.75, -Math.cos(ma) * r * 0.75); g2.stroke(); g2.lineWidth = 14; g2.beginPath(); g2.moveTo(0, 0); g2.lineTo(Math.sin(ha) * r * 0.48, -Math.cos(ha) * r * 0.48); g2.stroke(); g2.restore(); }
function ovTitle(t, t0, t1) { const a = clamp((t - t0) / 0.3) * clamp((t1 - t) / 0.4); if (a <= 0) return; const s = 0.6 + 0.4 * sm((t - t0) / 0.45) + 0.05 * Math.sin((t - t0) * 6) * clamp(1 - (t - t0) / 1.5);
  g2.save(); g2.globalAlpha = a; g2.translate(W / 2, H * 0.43); g2.scale(s, s); g2.rotate(-0.04); g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.lineJoin = 'round';
  g2.font = `900 170px ${FONT}`; g2.lineWidth = 46; g2.strokeStyle = '#3a1060'; g2.strokeText('시원시원한', 0, -95); g2.strokeText('여자', 0, 95);
  g2.lineWidth = 22; g2.strokeStyle = '#ffffff'; g2.strokeText('시원시원한', 0, -95); g2.strokeText('여자', 0, 95);
  const gr = g2.createLinearGradient(0, -190, 0, 190); gr.addColorStop(0, '#5ff5ff'); gr.addColorStop(0.5, '#ff7ad9'); gr.addColorStop(1, '#ffe14d'); g2.fillStyle = gr; g2.fillText('시원시원한', 0, -95); g2.fillText('여자', 0, 95); g2.restore(); }
function ovWatermark() { g2.save(); g2.globalAlpha = 0.8; g2.font = `800 34px ${FONT}`; g2.textAlign = 'right'; g2.lineWidth = 6; g2.strokeStyle = '#3a1060'; g2.lineJoin = 'round'; g2.strokeText('에픽21', W - 48, 62); g2.fillStyle = '#fff'; g2.fillText('에픽21', W - 48, 62); g2.restore(); }
function ovLeak(x, a, col) { if (a <= 0) return; const r = g2.createRadialGradient(x, H * 0.3, 0, x, H * 0.3, H * 0.9); r.addColorStop(0, col); r.addColorStop(1, 'rgba(0,0,0,0)'); g2.save(); g2.globalCompositeOperation = 'screen'; g2.globalAlpha = a; g2.fillStyle = r; g2.fillRect(0, 0, W, H); g2.restore(); }

// ---------- photo motion ----------
function placePhoto(p, img, tl, dur, si, fx, opacity = 1) {
  p.visible = true; p.material.map = TEX[img]; p.material.opacity = opacity; p.material.needsUpdate = true;
  const u = clamp(tl / dur), e = fx.slow ? u : sm(u * 0.85 + 0.15 * u);
  const r1 = rnd(si * 3.1), r2 = rnd(si * 7.7), r3 = rnd(si * 11.3);
  let z0 = 1.06, z1 = 1.18; if (r1 < 0.35) [z0, z1] = [z1, z0]; if (fx.push) { z0 = 1.04; z1 = 1.32; } if (fx.slow) { z0 = 1.04; z1 = 1.12; }
  let sc = lerp(z0, z1, e);
  const px = (r2 - 0.5) * 0.12 * (1 - 2 * e), py = (r3 - 0.5) * 0.06 * (1 - 2 * e);
  sc *= 1 + (fx.soft || fx.slow ? 0.008 : 0.03) * pulse(G.t);              // beat punch
  const intro = clamp(tl / 0.22); sc *= 1 + 0.16 * (1 - sm(intro));          // zoom-in on cut
  p.scale.setScalar(sc); p.position.set(px * sc, py * sc, 0); p.rotation.z = (r1 - 0.5) * 0.03 + (fx.shake ? Math.sin(G.t * 47) * 0.004 * fx.shake : 0);
  if (fx.shake) { p.position.x += Math.sin(G.t * 53) * 0.012 * fx.shake; p.position.y += Math.sin(G.t * 61) * 0.012 * fx.shake; }
}
// normalized photo coords -> screen pixels (follows photo motion)
function pp(p, nx, ny) { const v = V((nx - 0.5) * 2 * PA, (0.5 - ny) * 2, 0); p.updateMatrixWorld(); v.applyMatrix4(p.matrixWorld).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
const G = { t: 0 };

// ---------- frame ----------
function frame(t) {
  G.t = t; const tf = t;
  const c = CUTS.find(c => t >= c[0] && t < c[1]) || CUTS[CUTS.length - 1];
  const [c0, c1, img, si, ci] = c; const [s0, s1, , fx] = SEQ[si]; const tl = t - c0, ts = t - s0;
  ALLP.forEach(m => m.visible = false); planeB.visible = false;
  // freeze: hold the photo still
  if (fx.freeze) placePhoto(planeA, img, 0.4, 2.6, ci, Object.assign({}, fx, { soft: 1 }));
  else placePhoto(planeA, img, tl, c1 - c0, ci, fx);
  // whip-in transition on fast cuts: previous image slides out
  const prev = CUTS[ci - 1];
  if (prev && tl < 0.16 && !fx.freeze) { const k = sm(tl / 0.16), dir = ci % 2 ? 1 : -1; placePhoto(planeB, prev[2], prev[1] - prev[0], prev[1] - prev[0], ci - 1, SEQ[prev[3]][3]); planeB.position.x += dir * k * 4.5; planeB.position.z = 0.001; planeA.position.x -= dir * (1 - k) * 4.5; }
  // particles
  if (fx.bub) pBubbles(t, (fx.flash || s0) + 0.05, fx.bub[0], fx.bub[1], 1.4);
  if (fx.conf) pConfetti(t, s0, fx.goldConf ? 1 : undefined);
  if (fx.fw) pFireworks(t, fx.fw);
  if (fx.sparks) pSparks(t, fx.sparks[0], fx.sparks[1]);
  if (fx.hearts) pHearts(t, fx.hearts[0], fx.hearts[1]);
  if (fx.freeze) pSnow(t);
  const p = pulse(t);
  bloom.strength = fx.soft ? 0.35 : 0.45 + (fx.strobe ? 0.35 * p : 0.1 * p);
  composer.render();
  g2.clearRect(0, 0, W, H); g2.drawImage(renderer.domElement, 0, 0);
  // grading
  if (fx.soft) ovTint('#ffd6ec', 0.12, 'soft-light');
  if (fx.gold) ovTint('#ffcf5a', 0.14, 'soft-light');
  if (fx.dream) { const r = g2.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H); r.addColorStop(0, 'rgba(255,120,200,0)'); r.addColorStop(1, `rgba(255,120,200,${0.55 * fx.dream})`); g2.fillStyle = r; g2.fillRect(0, 0, W, H); }
  if (fx.freeze) { ovTint('#7fdcff', 0.3, 'color'); ovTint('#bff0ff', 0.12); g2.save(); g2.strokeStyle = 'rgba(220,250,255,.9)'; g2.lineWidth = 26; g2.strokeRect(13, 13, W - 26, H - 26); g2.restore(); }
  if (fx.dark) ovTint('#0a0018', fx.dark * (0.7 + 0.3 * (1 - p)));
  if (fx.strobe) ovTint(['#ff3fa8', '#30e0ff', '#ffe14d'][beatN(t) % 3], 0.16 * p, 'screen');
  ovLeak(W * (0.15 + 0.7 * rnd(ci)), 0.35 * (1 - sm(tl / 0.5)), ['rgba(255,90,180,.9)', 'rgba(80,220,255,.9)', 'rgba(255,200,80,.9)'][ci % 3]);
  ovVignette(0.5);
  // symbols
  const P = (nx, ny) => pp(planeA, nx, ny), ap = clamp((ts - 0.15) / 0.25);
  if (fx.buzz) { const [x, y] = P(...fx.buzz); ovBuzz(x, y, t); }
  if (fx.sweat) { const [x, y] = P(...fx.sweat); ovSweat(x, y, t); }
  if (fx.arrowUp) { const [x, y] = P(...fx.arrowUp); ovArrow(x, y + 120, -Math.PI / 2, 200, ap); }
  if (fx.arrow) { const [x, y] = P(...fx.arrow); ovArrow(x - 260, y, 0, 240, ap); }
  if (fx.x) for (const [nx, ny, s] of fx.x) { const [x, y] = P(nx, ny); ovX(x, y, s, clamp((ts - (s > 300 ? 0.35 : 0.3)) / 0.25)); }
  if (fx.q) for (const [nx, ny] of fx.q) { const [x, y] = P(nx, ny); ovSym('?', x, y, 170 + 30 * p, ap); }
  if (fx.excl) { const [x, y] = P(...fx.excl); ovSym('!', x, y, 190 + 30 * p, ap); }
  if (fx.dots) { const [x, y] = P(...fx.dots); ovSym('…', x, y, 160, ap, '#ffffff'); }
  if (fx.note) { const [x, y] = P(...fx.note); ovSym('♪', x, y + Math.sin(t * 6) * 10, 150, ap, '#ff7ad9'); }
  if (fx.speech) for (const [nx, ny] of fx.speech) { const [x, y] = P(nx, ny); ovSpeech(x, y, 95, ap); ovX(x, y, 95, clamp((ts - 0.6) / 0.25)); }
  if (fx.chats) { const [x, y] = P(...fx.chats); const n = Math.min(7, Math.floor(ts / 0.33) + 1); for (let k = 0; k < n; k++) ovChat(x + 300 + (k % 2) * 40, y + 200 - k * 95, clamp((ts - k * 0.33) / 0.15)); ovBadge(x + 470, y - 330, Math.min(99, Math.floor(1 + ts * ts * 14)), 1 + 0.15 * p); }
  if (fx.tick) ovClock(W * 0.83, H * 0.3, 150, t, 0);
  if (fx.tickStop) ovClock(W * 0.82, H * 0.28, 140, t, 1);
  if (fx.beam) { const k = sm(ts / 1.5); g2.save(); g2.globalCompositeOperation = 'screen'; const r = g2.createLinearGradient(0, H * 0.45, W, H * 0.45); r.addColorStop(0, 'rgba(255,80,200,0)'); r.addColorStop(0.5, `rgba(255,80,200,${0.5 * k})`); r.addColorStop(1, 'rgba(255,80,200,0)'); g2.fillStyle = r; g2.fillRect(0, H * 0.36, W, H * 0.18); g2.restore(); }
  if (fx.flash && t >= fx.flash) ovTint('#ffffff', 0.9 * (1 - clamp((t - fx.flash) / 0.35)));
  if (fx.flashBeat) ovTint('#ffffff', 0.25 * p);
  if (fx.title) ovTitle(t, 3.6, 7.7);
  drawLyric(t);
  if (t > 3.6) ovWatermark();
  if (fx.fadeIn) ovTint('#000', 1 - clamp(t / 0.6));
  if (fx.dimEnd) ovTint('#000', 0.4 * clamp((t - 119.6) / 0.8));
  if (fx.outro) ovTint('#000', sm((t - 169.6) / 3.0));
  return out;
}
return { frame, canvas: out, DUR: 173.12, CUTS, SEQ };
};
