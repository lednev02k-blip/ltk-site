/* ============================================================
   ЛТК — общий JS (Лаконичные, технологичные конструкции)
   Навигация, boot-заставка, reveal-анимации, формы заявок,
   фильтр портфолио, шапка при скролле, копирование заявки.
   ============================================================ */

(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /* ---------- Boot-заставка ---------- */

  var boot = document.getElementById("boot");
  if (boot) {
    window.addEventListener("load", function () {
      setTimeout(function () {
        boot.classList.add("is-done");
      }, 700);
    });
    var guard = setTimeout(function () {
      if (boot && !boot.classList.contains("is-done")) boot.classList.add("is-done");
    }, 4200);
  }

  /* ---------- Шапка при скролле + прогресс ---------- */

  var header = document.querySelector(".site-header");
  var progressBar = document.getElementById("scroll-progress");
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      if (header) header.classList.toggle("is-scrolled", y > 40);
      if (progressBar) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        progressBar.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
      }
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Мобильное меню ---------- */

  var toggle = document.getElementById("nav-toggle");
  var mobileMenu = document.getElementById("mobile-menu");

  if (toggle && mobileMenu) {
    var links = mobileMenu.querySelectorAll("a");
    var closeMenu = function () {
      mobileMenu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    };
    toggle.addEventListener("click", function () {
      var open = !mobileMenu.classList.contains("is-open");
      mobileMenu.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    });
    links.forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---------- Reveal-анимации ---------- */

  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-inview");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-inview"); });
  }

  /* ---------- Порты во всех формах: пресеты заявки ---------- */

  function decodeQuery() {
    if (!window.location.search) return null;
    var params = new URLSearchParams(window.location.search);
    return params.get("dir");
  }

  var dirPreset = decodeQuery();

  var directionOptions = [
    { id: "spk", label: "Светопрозрачные конструкции" },
    { id: "glass", label: "Цельностеклянные конструкции" },
    { id: "mash", label: "Машиностроение" },
    { id: "print3d", label: "3D-печать" }
  ];

  function seedForms() {
    document.querySelectorAll("select[name='direction']").forEach(function (sel) {
      if (sel.options.length === 0) {
        directionOptions.forEach(function (d) {
          var opt = document.createElement("option");
          opt.value = d.id;
          opt.textContent = d.label;
          sel.appendChild(opt);
        });
      }
      if (dirPreset) {
        var found = false;
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value === dirPreset) { sel.selectedIndex = i; found = true; break; }
        }
        if (!found) sel.value = dirPreset;
      }
    });
  }

  /* ---------- Отправка форм (EmailJS — работает из РФ без VPN) ---------- */

  // ─── Настройки EmailJS (заполните своими ключами) ───
  var EMAILJS_SERVICE_ID = "service_qds2nsn"; // Service ID
  var EMAILJS_TEMPLATE_ID = "template_arjnixp"; // Template ID
  var EMAILJS_PUBLIC_KEY = "s3VBTFe7dOg6MsaLc"; // Public Key
  var FORM_EMAIL = "lednevkiryusha@yandex.ru";
  var formBusy = false;

  function statusFor(form, ok, message) {
    var box = form.querySelector(".form-status");
    if (!box) return;
    box.textContent = message;
    box.classList.toggle("ok", ok);
    box.classList.toggle("err", !ok);
    box.classList.add("is-visible");
  }

  function collectFields(form) {
    var data = {};
    Array.prototype.forEach.call(form.querySelectorAll("[name]"), function (el) {
      var name = el.getAttribute("name");
      if (!name || name.charAt(0) === "_") return;
      data[name] = el.value || "";
    });
    var dir = data.direction;
    if (dir) {
      var labels = { spk: "СПК", glass: "Стекло", mash: "Машиностроение", print3d: "3D-печать" };
      data.direction = labels[dir] || dir;
    }
    var files = form.querySelector("input[type='file']");
    if (files && files.files && files.files.length) {
      var names = Array.prototype.map.call(files.files, function (f) { return f.name; });
      data.files = names.join(", ");
    } else {
      data.files = "нет";
    }
    return data;
  }

  function sendForm(form) {
    if (formBusy) return;
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      statusFor(form, false, "Форма готовится к запуску. Пока напишите на " + FORM_EMAIL + " — я отвечу лично.");
      return;
    }
    if (!window.emailjs) {
      statusFor(form, false, "Не удалось загрузить модуль отправки. Напишите на " + FORM_EMAIL);
      return;
    }
    formBusy = true;

    var btn = form.querySelector("button[type='submit']");
    var origBtn = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = "Отправляем…"; }

    var payload = collectFields(form);
    payload.to_email = FORM_EMAIL;
    payload.message = "Заявка с сайта ЛТК";

    emailjs.init(EMAILJS_PUBLIC_KEY);
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, payload)
      .then(function () {
        formBusy = false;
        if (btn) { btn.disabled = false; btn.innerHTML = origBtn; }
        statusFor(form, true, "Заявка отправлена!");
        if (btn) { btn.innerHTML = '<span class="btn-check">✓</span> Заявка отправлена'; }
        setTimeout(function () { if (btn) btn.innerHTML = origBtn; }, 6000);
        form.reset();
      })
      .catch(function (err) {
        formBusy = false;
        if (btn) { btn.disabled = false; btn.innerHTML = origBtn; }
        var msg = (err && err.text) ? err.text : "";
        statusFor(form, false, "Не удалось отправить. " + msg + " Напишите на " + FORM_EMAIL + " — я отвечу лично.");
      });
  }

  function bindForms() {
    document.querySelectorAll("form[data-request]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        sendForm(form);
      });

      var needField = form.querySelector("[name='need']");
      var dirSel = form.querySelector("select[name='direction']");
      if (needField && dirSel) {
        var placeholders = {
          spk: "Требуется комплект документации на окна/двери/фасад. Укажите тип конструкции, размеры, материалы.",
          glass: "Нужно спроектировать стеклянную перегородку / душевую / ограждение. Опишите геометрию и материалы.",
          mash: "Передаю техническое задание на пресс-форму / 3D-модель / комплект КД. Опишите деталь и требования.",
          print3d: "Нужно подготовить модель к печати или изготовить прототип. Опишите задачу, материал и цель.",
        };
        var updateNeed = function () {
          if (placeholders[dirSel.value]) needField.placeholder = placeholders[dirSel.value];
        };
        dirSel.addEventListener("change", updateNeed);
        updateNeed();
      }
    });
  }

  /* ---------- Прикрепление файлов в формах ---------- */

  function bindFileInputs() {
    document.querySelectorAll(".file-field").forEach(function (field) {
      var input = field.querySelector("input[type='file']");
      var drop = field.querySelector(".file-drop");
      var list = field.querySelector(".file-list");
      var label = field.querySelector(".file-drop__title");
      if (!input || !drop) return;

      var MAX_MB = 25;
      var update = function () {
        if (!list) return;
        list.innerHTML = "";
        var files = Array.prototype.slice.call(input.files || []);
        files.forEach(function (f) {
          var chip = document.createElement("span");
          chip.className = "file-chip";
          chip.textContent = f.name;
          var x = document.createElement("b");
          x.textContent = "×";
          x.setAttribute("role", "button");
          x.setAttribute("aria-label", "Удалить файл " + f.name);
          x.addEventListener("click", function () {
            var dt = new DataTransfer();
            Array.prototype.forEach.call(input.files, function (g) {
              if (g !== f) dt.items.add(g);
            });
            input.files = dt.files;
            update();
          });
          chip.appendChild(x);
          list.appendChild(chip);
        });
        if (label) {
          label.textContent = files.length
            ? "Прикреплено файлов: " + files.length
            : "Нажмите или перетащите файлы сюда";
        }
      };

      drop.addEventListener("click", function () { input.click(); });

      drop.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); }
      });
      drop.setAttribute("tabindex", "0");
      drop.setAttribute("role", "button");

      input.addEventListener("change", function () {
        var total = 0;
        Array.prototype.forEach.call(input.files || [], function (f) { total += f.size; });
        if (total > MAX_MB * 1024 * 1024) {
          input.value = "";
          if (list) list.innerHTML = "";
          if (label) label.textContent = "Суммарный размер превышает " + MAX_MB + " МБ";
          return;
        }
        update();
      });

      ["dragover", "dragenter"].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
          e.preventDefault();
          field.classList.add("is-dragover");
        });
      });
      ["dragleave", "drop"].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
          e.preventDefault();
          field.classList.remove("is-dragover");
        });
      });
      drop.addEventListener("drop", function (e) {
        var files = e.dataTransfer && e.dataTransfer.files;
        if (files && files.length) input.files = files;
        input.dispatchEvent(new Event("change"));
      });
    });
  }

  /* ---------- Кнопка «Скопировать заявку-пример» ---------- */

  function copyDemo() {
    var btn = document.getElementById("copy-demo");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var text = [
        "Заявка ЛТК",
        "Направление: Светопрозрачные конструкции",
        "Кто обращается: Частный клиент",
        "Задача: нужны чертежи и 3D-модель раздвижной системы для остекления террасы.",
        "Контакт: +7 900 000-00-00",
        "Дополнительно: рассмотреть варианты профилей."
      ].join("\n");
      var done = function () {
        btn.textContent = "Скопировано ✓";
        setTimeout(function () { btn.textContent = "Скопировать заявку-пример"; }, 2500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {});
      }
    });
  }

  /* ---------- Фильтр портфолио ---------- */

  function bindPortfolioFilter() {
    var bar = document.getElementById("portfolio-filter");
    if (!bar || !window.LEDNEV || !window.LEDNEV.PROJECTS) return;

    var grid = document.getElementById("portfolio-list");
    var filters = bar.querySelectorAll("[data-filter]");
    var filtersWrap = bar;

    function render(filter) {
      if (!grid) return;
      var items = window.LEDNEV.PROJECTS.filter(function (p) {
        return filter === "all" || p.dir === filter;
      });
      grid.innerHTML = "";
      items.forEach(function (p, i) {
        var card = document.createElement("article");
        card.className = "case-card reveal is-inview";
        card.innerHTML =
          '<div class="case-card__media">' +
            '<img src="' + p.img + '" alt="' + p.title + '" loading="lazy">' +
            '<span class="tag case-card__tag">' + p.dirName + " · " + p.year + "</span>" +
          "</div>" +
          '<div class="case-card__body">' +
            '<div class="case-card__num">КЕЙС <b>' + String(i + 1).padStart(2, "0") + "</b> // " + p.dirName + "</div>" +
            "<h3 class=\"case-card__title\">" + p.title + "</h3>" +
            "<p class=\"case-card__text\">" + p.result + "</p>" +
            '<div class="case-card__meta">' +
              p.tools.map(function (t) { return '<span class="tag">' + t + "</span>"; }).join("") +
            "</div>" +
            '<a class="case-card__link" href="contacts.html?dir=' + p.dir + '">Обсудить похожий проект <span class="arr">→</span></a>' +
          "</div>";
        grid.appendChild(card);
      });
    }

    filters.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filters.forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        render(btn.getAttribute("data-filter"));
      });
    });

    render("all");
  }

  /* ---------- Инициализация ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    seedForms();
    bindForms();
    bindFileInputs();
    bindPortfolioFilter();
  });
})();