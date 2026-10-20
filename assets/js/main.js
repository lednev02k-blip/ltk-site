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

  /* ---------- Отправка форм (EmailJS — письма приходят на почту) ---------- */

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

  /* ---------- Инициализация ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    seedForms();
    bindForms();
    bindPortfolioFilter();
  });
})();
