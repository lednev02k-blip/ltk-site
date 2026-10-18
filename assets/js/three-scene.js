/* ============================================================
   ЛТК — интерактивная 3D-сцена (Three.js)
   Четыре режима:
     0 — Дом (экстерьер, подсветка фасада)
     1 — Раздвижная система (створка, профиль)
     2 — Инженерная лаборатория (пресс-форма)
     3 — 3D-принтер (послойный рост детали)
   Работает офлайн: библиотека лежит в assets/vendors/three.
   При ошибке загрузки страница переходит в статический режим.
   ============================================================ */

(function () {
  "use strict";

  var wrapper = document.getElementById("three-scene");
  if (!wrapper) return;

  var canvasMount = document.getElementById("three-canvas");
  var stageEl = document.getElementById("three-stage");
  var captionEl = document.getElementById("three-caption");
  var titleEl = document.getElementById("three-title");
  var textEl = document.getElementById("three-text");
  var navWrap = document.querySelector(".canvas-nav");
  var reducedEl = document.getElementById("three-reduced");

  /* ---------- Защита от тяжёлой сцены ---------- */

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lowPerformance =
    navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 &&
    !window.WebGLRenderingContext;

  function toStatic(reason) {
    if (!reducedEl) return;
    reducedEl.classList.remove("is-hidden");
    canvasMount.classList.add("is-hidden");
    if (navWrap) navWrap.classList.add("is-hidden");
    return;
  }

  /* ---------- Импорт Three.js (глобальный или UMD) ---------- */

  var THREE = null;
  try {
    THREE = window.THREE;
    if (!THREE) throw new Error("THREE not loaded");
  } catch (e) {
    toStatic("three-js-missing");
    return;
  }

  try {
    if (!THREE.WebGLRenderer) throw new Error("no renderer");
    var testRenderer = new THREE.WebGLRenderer({ antialias: true });
    testRenderer.dispose();
  } catch (e) {
    toStatic("webgl-unavailable");
    return;
  }

  if (reducedMotion || lowPerformance) {
    toStatic("reduced-motion");
    return;
  }

  /* ---------- Сцена, камера, рендерер ---------- */

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101214);
  scene.fog = new THREE.Fog(0x101214, 26, 60);

  var camera = new THREE.PerspectiveCamera(42, wrapper.clientWidth / wrapper.clientHeight, 0.1, 200);
  camera.position.set(0, 3.2, 14);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  canvasMount.appendChild(renderer.domElement);

  /* ---------- Свет ---------- */

  var hemi = new THREE.HemisphereLight(0xE9E4D8, 0x0A0B0C, 0.55);
  scene.add(hemi);

  var key = new THREE.DirectionalLight(0xFFF4E0, 1.6);
  key.position.set(8, 12, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  var fill = new THREE.DirectionalLight(0x8AA4C8, 0.4);
  fill.position.set(-6, 4, -8);
  scene.add(fill);

  var warm = new THREE.PointLight(0xFFB86B, 14, 18, 2);
  warm.position.set(0, 2.2, 2.6);
  scene.add(warm);

  var backWarm = new THREE.PointLight(0xD8A05F, 8, 16, 2);
  backWarm.position.set(0, 4, -5);
  scene.add(backWarm);

  /* ---------- Общие материалы ---------- */

  function mat(color, opts) {
    return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.55, metalness: 0.35 }, opts || {}));
  }

  var M = {
    graphite: mat(0x1C1F22),
    deep: mat(0x141618),
    silver: mat(0x9A9C99, { metalness: 0.85, roughness: 0.28 }),
    bronze: mat(0x88765B, { metalness: 0.7, roughness: 0.32 }),
    ivory: mat(0xEDEAE2),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xBFD4E0,
      metalness: 0.1,
      roughness: 0.08,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  };

  /* ---------- Сцены-модели ---------- */

  var groups = {};
  var anims = {};

  function add(sceneGroup) {
    scene.add(sceneGroup.group);
    groups[sceneGroup.id] = sceneGroup;
  }

  /* --- Режим 0: Дом --- */

  (function house() {
    var g = new THREE.Group();
    var ground = new THREE.Mesh(new THREE.BoxGeometry(26, 0.4, 26), M.deep);
    ground.position.y = -0.2;
    g.add(ground);

    var body = new THREE.Mesh(new THREE.BoxGeometry(11, 4.2, 8), M.graphite);
    body.position.set(0, 2.1, 0);
    g.add(body);

    var roof = new THREE.Mesh(new THREE.BoxGeometry(12.4, 1.1, 9.4), M.deep);
    roof.position.set(0, 4.85, 0);
    g.add(roof);

    var glassW = 4.4, glassH = 2.6;
    var glassPanel = new THREE.Mesh(new THREE.BoxGeometry(glassW, glassH, 0.06), M.glass);
    glassPanel.position.set(0, 2.15, 4.011);
    g.add(glassPanel);

    var profileMat = M.silver;
    var mull1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, glassH, 0.1), profileMat);
    var mull2 = mull1.clone();
    mull1.position.set(-glassW / 2 + 0.2, 2.15, 4.02);
    mull2.position.set(glassW / 2 - 0.2, 2.15, 4.02);
    var transom = new THREE.Mesh(new THREE.BoxGeometry(glassW, 0.08, 0.1), profileMat);
    transom.position.set(0, 2.15 + glassH / 2 - 0.4, 4.02);
    g.add(mull1, mull2, transom);

    var sideGlass1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.8, 2.4), M.glass);
    sideGlass1.position.set(5.51, 1.4, 1.2);
    var sideGlass2 = sideGlass1.clone();
    sideGlass2.position.set(5.51, 1.4, -1.2);
    g.add(sideGlass1, sideGlass2);

    var glowStrip = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.05, 0.05), M.bronze);
    glowStrip.position.set(0, 4.55, 4.02);
    g.add(glowStrip);

    var door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.06), M.glass);
    door.position.set(2.6, 2.15, 4.011);
    g.add(door);

    var slate = new THREE.Mesh(new THREE.PlaneGeometry(13, 2.2), mat(0x23272B));
    slate.rotation.x = -Math.PI / 2;
    slate.position.set(0, -0.09, 5.2);
    g.add(slate);

    groups["house"] = {
      id: "house",
      group: g,
      intro: function () {
        g.position.set(0, -0.4, 0);
        g.scale.setScalar(0.96);
        warm.intensity = 6;
        backWarm.intensity = 4;
      },
      update: function (t, d) {
        var w = Math.min(d / 2.5, 1);
        g.position.y = -0.4 * (1 - w);
        g.scale.setScalar(0.96 + 0.04 * w);
        warm.intensity = 6 + 8 * w;
      }
    };
  })();

  /* --- Режим 1: Раздвижная система --- */

  (function slider() {
    var g = new THREE.Group();
    g.rotation.y = 0.5;
    g.scale.setScalar(0.72);

    var casing = new THREE.Mesh(new THREE.BoxGeometry(9, 3.2, 0.45), M.deep);
    g.add(casing);

    var frameTop = new THREE.Mesh(new THREE.BoxGeometry(9, 0.22, 0.5), M.silver);
    frameTop.position.y = 1.72;
    var frameBottom = new THREE.Mesh(new THREE.BoxGeometry(9, 0.22, 0.5), M.silver);
    frameBottom.position.y = -1.55;
    g.add(frameTop, frameBottom);

    function panel(w, h, x, z, bronze) {
      var p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), bronze ? M.bronze : M.glass);
      p.position.set(x, 0, z);
      var fr = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.09), M.silver);
      fr.position.set(x, 0, z + 0.02);
      g.add(p, fr);
      return p;
    }

    var p1 = panel(3.2, 2.6, -2.3, 0.16, false);
    var p2 = panel(3.2, 2.6, 1.35, 0.16, false);

    var handle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.045, 0.06), M.bronze);
    handle.position.set(1.65, -1.1, 0.3);
    g.add(handle);

    var label = new THREE.Group();
    var labelBg = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.02), mat(0x17191B, { transparent: true, opacity: 0.85 }));
    labelBg.position.y = 0;
    label.add(labelBg);
    g.add(label);

    groups["slider"] = {
      id: "slider",
      group: g,
      intro: function () {
        p2.position.x = 1.35;
        handle.position.x = 1.65;
      },
      update: function (t, d) {
        var open = Math.max(0, Math.min(1, (d - 0.35) / 0.45));
        p2.position.x = 1.35 + open * 3.0;
        handle.position.x = 1.65 + open * 3.0;
        var step = Math.max(0, Math.min(1, (d - 0.75) / 0.2));
        g.scale.setScalar(0.72 + 0.05 * step);
        g.rotation.y = 0.5 - step * 0.35;
        g.position.z = step * -0.8;
      }
    };
  })();

  /* --- Режим 2: Инженерная лаборатория (пресс-форма) --- */

  (function mold() {
    var g = new THREE.Group();
    g.position.set(0, -0.3, 0);

    var grid = new THREE.GridHelper(24, 20, 0x3A3F45, 0x23272B);
    g.add(grid);

    var base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 2.6), M.deep);
    base.position.y = 0.15;
    g.add(base);

    var plate1 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.5, 2.2), M.graphite);
    plate1.position.y = 0.55;
    g.add(plate1);

    var plate2 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.5, 2.2), M.silver);
    plate2.position.y = 1.15;
    g.add(plate2);

    var core = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 1.0), M.bronze);
    core.position.y = 1.95;
    g.add(core);

    var pinA = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 10), M.silver);
    pinA.position.set(-1.1, 1.2, 0.8);
    var pinB = pinA.clone();
    pinB.position.set(1.1, 1.2, -0.8);
    var pinC = pinA.clone();
    pinC.position.set(1.1, 1.2, 0.8);
    g.add(pinA, pinB, pinC);

    var spring = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 8), M.bronze);
    spring.position.set(-1.1, 0.65, -0.8);
    g.add(spring);

    var hole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 16), M.deep);
    hole.position.set(0, 0.58, 0);
    g.add(hole);

    var exploded = [
      { m: plate1, from: new THREE.Vector3(0, 0.55, 0), to: new THREE.Vector3(0, 2.2, 0) },
      { m: plate2, from: new THREE.Vector3(0, 1.15, 0), to: new THREE.Vector3(2.8, 1.8, 0) },
      { m: core, from: new THREE.Vector3(0, 1.95, 0), to: new THREE.Vector3(-2.6, 3.4, -0.4) }
    ];

    groups["lab"] = {
      id: "lab",
      group: g,
      intro: function () {
        exploded.forEach(function (e) {
          e.m.position.copy(e.from);
        });
        g.rotation.y = 0;
      },
      update: function (t, d) {
        var explode = Math.max(0, Math.min(1, (d - 0.2) / 0.5));
        exploded.forEach(function (e) {
          e.m.position.lerpVectors(e.from, e.to, explode);
        });
        var spin = d > 0.55 ? 1 : 0;
        g.rotation.y = Math.sin(t * 0.35) * 0.35 * spin;
      }
    };
  })();

  /* --- Режим 3: 3D-принтер --- */

  (function printer() {
    var g = new THREE.Group();
    g.position.set(0, -0.4, 0);

    var frame = new THREE.Group();
    var post1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.6, 0.14), M.graphite);
    post1.position.set(-1.4, 1.8, -1.2);
    var post2 = post1.clone(); post2.position.set(1.4, 1.8, -1.2);
    var post3 = post1.clone(); post3.position.set(-1.4, 1.8, 1.2);
    var post4 = post1.clone(); post4.position.set(1.4, 1.8, 1.2);
    frame.add(post1, post2, post3, post4);
    g.add(frame);

    var basePad = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 3.0), M.deep);
    basePad.position.y = 0.1;
    g.add(basePad);

    var bed = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 2.6), M.silver);
    bed.position.y = 0.42;
    var bedMat = M.silver;
    g.add(bed);

    var headRail = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.1), M.silver);
    headRail.position.y = 2.9;
    g.add(headRail);

    var head = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), M.graphite);
    var nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.24, 8), M.bronze);
    nozzle.position.y = -0.35;
    head.add(body, nozzle);
    head.position.y = 2.9;
    g.add(head);

    var part = new THREE.Group();
    var partCore = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.5), M.ivory);
    partCore.position.y = 0.5;
    part.add(partCore);
    var partCap = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.5, 20), M.ivory);
    partCap.position.y = 0.25;
    part.add(partCap);
    for (var i = 0; i < 4; i++) {
      var rib = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.06), M.bronze);
      rib.position.y = 0.15 + i * 0.22;
      part.add(rib);
    }
    part.scale.setScalar(0.001);
    g.add(part);

    var filamentSpool = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 18), M.bronze);
    filamentSpool.rotation.x = Math.PI / 2;
    filamentSpool.position.set(1.9, 2.7, -1.4);
    g.add(filamentSpool);

    groups["printer"] = {
      id: "printer",
      group: g,
      intro: function () {
        part.scale.setScalar(0.001);
        head.position.y = 2.9;
      },
      update: function (t, d) {
        var print = Math.max(0, Math.min(1, (d - 0.25) / 0.55));
        var e = 0.001 + print * (1 - 0.001);
        part.scale.set(e, e, e);
        part.position.y = 0.9 * print;
        head.position.y = 2.9 - 2.4 * print;
        head.rotation.y = t * 0.8;
      }
    };
  })();

  /* ---------- Управление режимами ---------- */

  var STAGES = [
    { id: "house", el: "home" },
    { id: "slider", el: "spk" },
    { id: "lab", el: "mash" },
    { id: "printer", el: "print" }
  ];

  var current = null;
  var progress = 0;
  var clock = new THREE.Clock();

  var LABELS = {
    home: ["Дом / Экстерьер", "Путешествие по инженерному дому", "Современная архитектура с панорамным остеклением — первый взгляд на результат работы."],
    spk: ["Раздвижная система", "Инженерия в деталях", "Откройте створку: проследите за движением по направляющей и увидите, как устроен профиль."],
    mash: ["Инженерная лаборатория", "От 3D-модели к производству", "Пресс-форма разбирается на компоненты — так выглядит конструкторская работа до запуска в серию."],
    print: ["3D-принтер", "Аддитивное производство", "Деталь растёт слой за слоем: от цифровой модели к физическому изделию."]
  };

  function setStage(idx) {
    if (current && current.id === STAGES[idx].id) return;
    Object.keys(groups).forEach(function (k) {
      groups[k].group.visible = false;
    });
    current = groups[STAGES[idx].id];
    current.group.visible = true;
    current.intro();
    progress = 0;

    var c = LABELS[STAGES[idx].el];
    if (titleEl) titleEl.textContent = c[1];
    if (textEl) textEl.textContent = c[2];
    if (captionEl) captionEl.textContent = c[0];
    if (stageEl) stageEl.textContent = String(idx + 1).padStart(2, "0");
  }

  /* ---------- Скролл-навигация по режимам ---------- */

  var scrollTriggerListener = function () {
    var rect = wrapper.getBoundingClientRect();
    var vh = window.innerHeight;
    var center = vh / 2;
    if (rect.bottom < 0 || rect.top > vh) return;
    var viewportProgress = (center - rect.top) / rect.height;
    var idx = Math.min(3, Math.max(0, Math.floor(viewportProgress * 4)));
    setStage(idx);
  };
  window.addEventListener("scroll", scrollTriggerListener, { passive: true });
  window.addEventListener("resize", scrollTriggerListener);

  var navBtns = Array.prototype.slice.call(document.querySelectorAll(".canvas-nav button"));
  navBtns.forEach(function (b, i) {
    b.addEventListener("click", function () {
      setStage(i);
      if (navWrap) navWrap.classList.add("is-progress_clicked");
    });
  });

  /* ---------- Плавный прогресс внутри сцены ---------- */

  function lerp(a, b, k) { return a + (b - a) * k; }

  function animate() {
    requestAnimationFrame(animate);
    var delta = clock.getDelta();
    var t = clock.elapsedTime;

    var rect = wrapper.getBoundingClientRect();
    var vh = window.innerHeight;
    if (rect.bottom > 0 && rect.top < vh) {
      var target = Math.max(0, Math.min(1, 1 - (rect.bottom - vh * 0.35) / (rect.height - vh * 0.7)));
      progress = lerp(progress, target, 0.08);
    }

    if (current && current.update) {
      current.update(t, progress);
    }

    /* медленное вращение камеры-атмосферы */
    camera.position.x = Math.sin(t * 0.12) * 0.5;
    camera.lookAt(0, 1.6, 0);

    renderer.render(scene, camera);
  }

  window.addEventListener("resize", function () {
    camera.aspect = wrapper.clientWidth / wrapper.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
  });

  setStage(0);
  animate();

  /* поддержка клавиатуры: переключение режимов стрелками */
  document.addEventListener("keydown", function (e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    var inCanvas = wrapper.getBoundingClientRect().top < window.innerHeight && wrapper.getBoundingClientRect().bottom > 0;
    if (!inCanvas) return;
    var idx = STAGES.findIndex(function (s) { return groups[s.id] === current; });
    if (idx < 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); setStage((idx + 1) % 4); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); setStage((idx + 3) % 4); }
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) clock.getDelta();
  });
})();