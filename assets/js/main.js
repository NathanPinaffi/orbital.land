/*
 * Reconstrução dos scripts customizados do Superconscious (removidos na captura):
 * preloader, GSAP SplitText, view items, hover dos links, hover dos botões,
 * validação do formulário, cards do "How it works" e a seção About.
 * As interações IX2 (scroll do logo, cards empilhados, pop-up do formulário…)
 * continuam vindo do webflow.js original.
 */
(function () {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);
  const lenis = window.SScroll;

  // ---------------------------------------------------------------- Lenis <-> ScrollTrigger
  if (lenis && lenis.on) {
    lenis.on("scroll", ScrollTrigger.update);
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return a.addEventListener("click", (e) => e.preventDefault()); // botões que abrem o pop-up
      a.addEventListener("click", (e) => {
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target);
      });
    });
  }

  // ---------------------------------------------------------------- Split text
  // data-split="from-right-blur" -> caracteres; "from-down-blur" -> linhas
  function parseSettings(el) {
    const raw = el.getAttribute("split-settings") || el.getAttribute("split-setting") || "";
    const out = {};
    raw.split(";").forEach((pair) => {
      const [k, v] = pair.split(":").map((s) => s && s.trim());
      if (!k || !v) return;
      out[k] = isNaN(+v) ? v : +v;
    });
    return out;
  }

  const splitAnims = [];
  document.querySelectorAll("[data-split]").forEach((el) => {
    const type = el.getAttribute("data-split");
    const s = parseSettings(el);
    let targets, from;
    if (type === "from-right-blur") {
      targets = new SplitText(el, { type: "chars" }).chars;
      from = { x: "0.6em", opacity: 0, filter: "blur(0.6rem)" };
    } else {
      targets = new SplitText(el, { type: "lines" }).lines;
      from = { y: "100%", opacity: 0, filter: "blur(0.6rem)" };
    }
    gsap.set(el, { visibility: "visible" });
    const tween = gsap.from(targets, {
      ...from,
      duration: s.duration || 1.2,
      stagger: s.stagger != null ? s.stagger : type === "from-right-blur" ? 0.03 : 0.1,
      ease: s.ease || "power3.out",
      paused: true,
    });
    splitAnims.push({ el, tween });
  });

  // ---------------------------------------------------------------- View items
  function observeView(el, onEnter) {
    const margin = parseFloat(el.getAttribute("view-margin")) || 90;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { onEnter(); io.disconnect(); }
      }),
      { rootMargin: `0px 0px -${100 - margin}% 0px` }
    );
    io.observe(el);
  }

  function startScrollReveals() {
    splitAnims.forEach(({ el, tween }) => {
      if (el.hasAttribute("after-preloader")) return;
      observeView(el, () => tween.play());
    });
    document.querySelectorAll("[view-list]").forEach((list) => {
      const items = list.querySelectorAll("[view-item]");
      observeView(list, () => items.forEach((it, i) => setTimeout(() => it.classList.add("view"), i * 150)));
    });
    document.querySelectorAll("[view-item]").forEach((el) => {
      if (el.hasAttribute("after-preloader") || el.closest("[view-list]")) return;
      observeView(el, () => el.classList.add("view"));
    });
  }

  function revealHero() {
    splitAnims.forEach(({ el, tween }) => el.hasAttribute("after-preloader") && tween.play());
    document.querySelectorAll("[view-item][after-preloader]").forEach((el, i) =>
      setTimeout(() => el.classList.add("view"), 300 + i * 150)
    );
  }

  // ---------------------------------------------------------------- Splash da Orbital
  // 1) só o planeta, com anéis de impacto  2) o planeta vira o "O" e "RBITAL" desliza
  // 3) o lockup voa para o canto superior esquerdo e vira o botão home
  const preloader = document.querySelector(".preloader");
  const home = document.querySelector(".orbital-home");
  const homePlanet = home && home.querySelector(".orbital-home-planet");
  const homeWord = home && home.querySelector(".orbital-home-word");

  function lockupState(scale, ox, oy) {
    // posiciona o lockup (origem 0 0) para que o ponto local (ox, oy) fique no centro da tela
    const u = home.offsetWidth / 328;
    const bx = parseFloat(getComputedStyle(home).left);
    const by = parseFloat(getComputedStyle(home).top);
    return { x: innerWidth / 2 - ox * u * scale - bx, y: innerHeight / 2 - oy * u * scale - by, scale };
  }

  function runSplash() {
    if (!preloader || !home) return revealHero();
    lenis && lenis.stop && lenis.stop();
    window.scrollTo(0, 0);
    const u = home.offsetWidth / 328;
    const planetK = (Math.min(innerWidth, innerHeight) * 0.28) / (48 * u); // planeta ~28% da tela
    const lockK = Math.min((innerWidth * 0.62) / (328 * u), planetK * 0.55); // lockup ~62% da largura
    const rings = preloader.querySelectorAll(".orb-splash-ring");
    const orbit = preloader.querySelector(".orb-splash-orbit");

    gsap.set(home, { transformOrigin: "0 0", ...lockupState(planetK, 24, 34), pointerEvents: "none" });
    const glow = (blur, a) => `drop-shadow(0 0 ${blur}px rgba(249,115,22,${a}))`;
    gsap.set(homePlanet, { scale: 0, transformOrigin: "50% 50%", filter: glow(0, 0) });
    gsap.set(homeWord, { opacity: 0, x: 40 * u, filter: "blur(10px)", clipPath: "inset(0 100% 0 0)" });

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to(homePlanet, { scale: 1, duration: 0.9, ease: "back.out(2.2)", filter: glow(14, 0.55) }, 0.2)
      .fromTo(rings, { scale: 0.6, opacity: 0.9 }, { scale: 3.2, opacity: 0, duration: 1.4, stagger: 0.18, ease: "power2.out" }, 0.45)
      .fromTo(orbit, { scale: 0.4, opacity: 0, rotate: -40 }, { scale: 1, opacity: 1, rotate: -16, duration: 1.2 }, 0.5)
      // o planeta assume o lugar do "O"
      .to(home, { ...lockupState(lockK, 164, 35), duration: 1.1, ease: "power3.inOut" }, 1.6)
      .to(homePlanet, { filter: glow(0, 0), duration: 0.8 }, 1.8)
      .to(orbit, { opacity: 0, scale: 1.6, duration: 0.8, ease: "power2.in" }, 1.6)
      .to(homeWord, { opacity: 1, x: 0, filter: "blur(0px)", clipPath: "inset(0 0% 0 0)", duration: 0.9 }, 2.05)
      // o logo vai para o canto e vira o botão home
      .to(home, { x: 0, y: 0, scale: 1, duration: 1.15, ease: "expo.inOut" }, 3.35)
      .to(preloader, { opacity: 0, duration: 0.9, ease: "power2.inOut" }, 3.45)
      .add(() => revealHero(), 3.7)
      .add(() => {
        preloader.classList.add("hidden");
        gsap.set(home, { clearProps: "transform,pointerEvents" });
        gsap.set(homePlanet, { clearProps: "filter" });
        lenis && lenis.start && lenis.start();
      }, 4.5);
  }

  if (home) {
    home.addEventListener("click", (e) => {
      e.preventDefault();
      lenis && lenis.scrollTo ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: "smooth" });
      gsap.fromTo(homePlanet, { rotate: 0 }, { rotate: 360, duration: 1, ease: "power3.inOut" });
    });
  }

  // espera as fontes da marca, mas no máximo 1,2 s
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1200))])
    .then(runSplash);
  startScrollReveals();

  // ---------------------------------------------------------------- Hover dos links (texto)
  document.querySelectorAll("[text-hover-trigger]").forEach((trigger) => {
    const [original, clone] = trigger.querySelectorAll("[hover-text]");
    if (!original || !clone) return;
    const a = new SplitText(original, { type: "chars" }).chars;
    const b = new SplitText(clone, { type: "chars" }).chars;
    gsap.set(b, { yPercent: 100, opacity: 0, filter: "blur(0.2rem)" });
    const tl = gsap
      .timeline({ paused: true, defaults: { duration: 0.5, ease: "power2.inOut", stagger: 0.02 } })
      .to(a, { yPercent: -100, opacity: 0, filter: "blur(0.2rem)" })
      .to(b, { yPercent: 0, opacity: 1, filter: "blur(0rem)" }, 0);
    trigger.addEventListener("mouseenter", () => tl.play());
    trigger.addEventListener("mouseleave", () => tl.reverse());
  });

  // ---------------------------------------------------------------- Hover dos botões
  document.querySelectorAll("[data-hover-button]").forEach((bg) => {
    const btn = bg.parentElement;
    btn.addEventListener("mouseenter", () =>
      gsap.to(bg, { scaleX: 1.06, scaleY: 1.12, duration: 0.5, ease: "back.out(2)" })
    );
    btn.addEventListener("mouseleave", () =>
      gsap.to(bg, { scaleX: 1, scaleY: 1, duration: 0.5, ease: "power3.out" })
    );
  });

  // ---------------------------------------------------------------- Formulário (validação local)
  document.querySelectorAll("form").forEach((form) => {
    const submit = form.querySelector('[wr-type="submit"]');
    if (!submit) return;
    const wrap = form.parentElement;
    submit.addEventListener("click", (e) => {
      e.preventDefault();
      let ok = true;
      form.querySelectorAll('[wr-type="required-field"]').forEach((input) => {
        const err = input.parentElement.querySelector('[wr-type="error"]');
        const valid = input.value.trim() && (input.type !== "email" || /^\S+@\S+\.\S+$/.test(input.value));
        if (err) err.style.display = valid ? "none" : "block";
        if (!valid) ok = false;
      });
      if (!ok) return;
      form.style.display = "none";
      const done = wrap.querySelector(".w-form-done");
      if (done) done.style.display = "block";
    });
  });

  // ---------------------------------------------------------------- How it works: cards seguem o cursor
  const hwSection = document.querySelector(".how-work-sc");
  if (hwSection && matchMedia("(hover: hover)").matches) {
    const cards = [...hwSection.querySelectorAll("[data-hw-trigger]")];
    const movers = cards.map((c, i) => ({
      x: gsap.quickTo(c, "x", { duration: 1.2, ease: "power3.out" }),
      y: gsap.quickTo(c, "y", { duration: 1.2, ease: "power3.out" }),
      k: 0.6 + (i % 3) * 0.4,
    }));
    hwSection.addEventListener("mousemove", (e) => {
      const nx = e.clientX / innerWidth - 0.5;
      const ny = e.clientY / innerHeight - 0.5;
      movers.forEach((m) => { m.x(nx * 2 * rem() * m.k); m.y(ny * 2 * rem() * m.k); });
    });
    hwSection.addEventListener("mouseleave", () => movers.forEach((m) => { m.x(0); m.y(0); }));
  }

  // ---------------------------------------------------------------- About (desktop): pin + palavras
  ScrollTrigger.matchMedia({
    "(min-width: 480px)": function () {
      const aboutHeight = document.querySelector(".about-height");
      const aboutPin = document.querySelector(".about-pin");
      if (aboutHeight && aboutPin) {
        ScrollTrigger.create({ trigger: aboutHeight, start: "top top", end: "bottom bottom", pin: aboutPin });
        const tl = gsap.timeline({
          scrollTrigger: { trigger: aboutHeight, start: "top top", end: "bottom bottom", scrub: true },
        });
        const hole = aboutPin.querySelector(".orb-blackhole");
        if (hole) {
          // distância de cada palavra até o centro do buraco negro (os dois estão no mesmo bloco fixado)
          const toHole = (el, axis) => {
            const h = hole.getBoundingClientRect();
            const r = el.getBoundingClientRect();
            return axis === "x" ? h.left + h.width / 2 - (r.left + r.width / 2) : h.top + h.height / 2 - (r.top + r.height / 2);
          };
          tl.fromTo(hole, { scale: 0, opacity: 0, rotate: -60 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.3, ease: "power2.out" }, 0)
            .to("[data-about-move]", {
              x: (i, el) => toHole(el, "x"), y: (i, el) => toHole(el, "y"),
              scale: 0.04, rotate: (i) => 140 + i * 30, opacity: 0, filter: "blur(0.5rem)",
              stagger: 0.09, duration: 0.5, ease: "power3.in",
            }, 0.12)
            .to(hole, { scale: 1.18, duration: 0.15, ease: "sine.out" }, ">-0.12")
            .to(hole, { scale: 0, opacity: 0, rotate: 90, duration: 0.3, ease: "back.in(1.6)" })
            .to("[data-about-top]", { y: "-24rem", duration: 0.5, ease: "power1.inOut" }, "<");
        } else {
          tl.to("[data-about-move]", { x: "-20rem", opacity: 0, filter: "blur(0.6rem)", stagger: 0.1, duration: 0.5, ease: "power1.inOut" })
            .to("[data-about-top]", { y: "-24rem", duration: 0.5, ease: "power1.inOut" });
        }
      }

      const pgHeight = document.querySelector(".about-pg-height");
      const pgPin = document.querySelector(".about-pg-pin");
      const words = gsap.utils.toArray(".about-pg-word");
      if (pgHeight && pgPin) {
        ScrollTrigger.create({ trigger: pgHeight, start: "top top", end: "bottom bottom", pin: pgPin });
        gsap.timeline({
          scrollTrigger: { trigger: ".about-pg-area", start: "35% top", end: "90% bottom", scrub: true },
        }).to(words, { x: 0, opacity: 1, filter: "blur(0rem)", stagger: 0.2, duration: 0.5, ease: "power1.out" });
      }
    },
  });

  // ================================================================ Orbital: gráficos e movimento
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------- Fórmulas (KaTeX): escritas à mão + parallax
  // cada caractere (e cada traço de fração/raiz) aparece em sequência, como se fosse escrito
  function texUnits(root) {
    const units = [];
    const walk = (node) => {
      [...node.childNodes].forEach((c) => {
        if (c.nodeType === 3) {
          if (!c.textContent.trim()) return;
          const frag = document.createDocumentFragment();
          for (const ch of c.textContent) {
            const sp = document.createElement("span");
            sp.className = "orb-ch";
            sp.textContent = ch;
            frag.appendChild(sp);
            units.push(sp);
          }
          c.replaceWith(frag);
        } else if (c.nodeType === 1) {
          if (c.classList.contains("frac-line") || c.tagName.toLowerCase() === "svg") units.push(c);
          else walk(c);
        }
      });
    };
    walk(root.querySelector(".katex-html") || root);
    return units;
  }
  function writeTimeline(el, opts = {}) {
    const tl = gsap.timeline({ paused: true, ...opts });
    texUnits(el).forEach((u, i) => {
      const stroke = u.classList.contains("frac-line") || u.tagName.toLowerCase() === "svg";
      if (stroke) tl.fromTo(u, { scaleX: 0, transformOrigin: "0 50%" }, { scaleX: 1, duration: 0.35, ease: "power2.inOut" }, i * 0.075);
      else tl.fromTo(u, { opacity: 0, y: "0.12em", rotate: -8, filter: "blur(3px)" },
        { opacity: 1, y: 0, rotate: 0, filter: "blur(0px)", duration: 0.32, ease: "power2.out" }, i * 0.075);
    });
    return tl;
  }
  document.querySelectorAll("[data-tex]").forEach((el) => {
    if (window.katex) katex.render(el.getAttribute("data-tex"), el, { throwOnError: false });
    else el.textContent = el.getAttribute("data-tex");
  });
  if (!reduce) {
    document.querySelectorAll(".orb-f[data-tex]").forEach((el, i) => {
      // escreve, segura, apaga ao contrário e escreve de novo
      const tl = writeTimeline(el, { repeat: -1, yoyo: true, repeatDelay: 2.6 + (i % 3) * 0.7 });
      ScrollTrigger.create({ trigger: el, start: "top 95%", once: true, onEnter: () => tl.play() });
      const sp = parseFloat(el.getAttribute("data-speed"));
      const host = el.closest("section") || el.parentElement;
      gsap.fromTo(el, { y: 12 * sp + "rem", rotate: i % 2 ? -4 : 4 }, {
        y: -12 * sp + "rem", rotate: i % 2 ? 4 : -4, ease: "none",
        scrollTrigger: { trigger: host, start: "top bottom", end: "bottom top", scrub: true },
      });
    });
  }

  // ---------------------------------------------------------------- Hero: planeta em wireframe
  const lons = gsap.utils.toArray(".orb-hero-planet .orb-lon");
  if (lons.length && !reduce) {
    gsap.ticker.add((time) => {
      lons.forEach((el) => {
        const ph = (parseFloat(el.dataset.phase) * Math.PI) / 180 + time * 0.25;
        el.setAttribute("rx", Math.abs(290 * Math.sin(ph)).toFixed(1));
        el.style.opacity = Math.cos(ph) > 0 ? 1 : 0.35; // meridianos de trás mais apagados
      });
    });
  }
  gsap.utils.toArray(".hero-video-d, .hero-video-p").forEach((el) =>
    gsap.to(el, { yPercent: 18, scale: 1.08, ease: "none",
      scrollTrigger: { trigger: ".hero-sc", start: "top top", end: "bottom top", scrub: true } })
  );
  // celular em perspectiva 3D, balançando devagar
  const phone3d = document.querySelector(".orb-phone3d");
  if (phone3d) {
    gsap.set(phone3d, { transformPerspective: 1600, rotationY: -24, rotationX: 12, rotationZ: -2 });
    if (!reduce) {
      gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } })
        .to(phone3d, { rotationY: -8, rotationX: 5, rotationZ: 2, y: "-1.2rem", duration: 3.6 });
    }
  }
  const heroPhone = document.querySelector(".orb-phone3d > svg");
  if (heroPhone && matchMedia("(hover: hover)").matches && !reduce) {
    const rx = gsap.quickTo(heroPhone, "rotationY", { duration: 1.2, ease: "power3.out" });
    const ry = gsap.quickTo(heroPhone, "rotationX", { duration: 1.2, ease: "power3.out" });
    gsap.set(heroPhone, { transformPerspective: 1200 });
    document.querySelector(".hero-sc").addEventListener("mousemove", (e) => {
      rx((e.clientX / innerWidth - 0.5) * 10);
      ry((e.clientY / innerHeight - 0.5) * -8);
    });
  }

  // ---------------------------------------------------------------- About: lua seguindo o anel do planeta
  // percorre a mesma elipse do anel; na metade de trás passa atrás do planeta
  const moons = gsap.utils.toArray(".orb-moon").map((m, i) => ({
    m, svg: m.closest("svg"), off: i * 1.7,
    cx: +m.dataset.cx, cy: +m.dataset.cy, rx: +m.dataset.rx, ry: +m.dataset.ry,
  }));
  if (moons.length && !reduce) {
    gsap.ticker.add((time) => {
      moons.forEach((o) => {
        const t = time * 1.4 + o.off;
        o.m.setAttribute("cx", (o.cx + o.rx * Math.cos(t)).toFixed(2));
        o.m.setAttribute("cy", (o.cy + o.ry * Math.sin(t)).toFixed(2));
        const host = o.svg.querySelector(Math.sin(t) > 0 ? ".orb-moon-front" : ".orb-moon-back");
        if (o.m.parentNode !== host) host.appendChild(o.m);
      });
    });
  }

  // ---------------------------------------------------------------- Seção do logo: sistema orbital no scroll
  document.querySelectorAll(".logo-lottie .orb-system").forEach((sys) => {
    const draws = sys.querySelectorAll(".orb-draw");
    draws.forEach((c) => {
      const L = c.getTotalLength();
      gsap.set(c, { strokeDasharray: L, strokeDashoffset: L });
    });
    const planets = sys.querySelectorAll(".orb-planet");
    const sun = sys.querySelector(".orb-sun");
    const c = sys.viewBox.baseVal.width / 2; // os planetas giram em volta do Sol
    planets.forEach((pl) => gsap.set(pl, { svgOrigin: `${c} ${c}`, rotate: +pl.dataset.start - 220, opacity: 0 }));
    gsap.set(sun, { scale: 0, transformOrigin: "50% 50%" });
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ".logo-height", start: "top 60%", end: "bottom bottom", scrub: 1 },
    });
    tl.to(sun, { scale: 1, duration: 0.6, ease: "back.out(2)" }, 0)
      .to(draws, { strokeDashoffset: 0, duration: 1.4, stagger: 0.15, ease: "power2.inOut" }, 0.1)
      .to(planets, { opacity: 1, duration: 0.3, stagger: 0.15 }, 0.5)
      .to(planets, { rotate: (i, el) => +el.dataset.start, duration: 2, stagger: 0.1, ease: "power2.out" }, 0.5)
      .to(sys, { rotate: 25, duration: 2.6, ease: "none" }, 0);
  });

  // ---------------------------------------------------------------- Widgets: animam ao entrar na tela
  function onView(el, fn, start = "top 85%") {
    ScrollTrigger.create({ trigger: el, start, once: true, onEnter: fn });
  }
  document.querySelectorAll(".orb-ring-fill").forEach((c) => {
    const L = parseFloat(c.getAttribute("stroke-dasharray"));
    onView(c.closest("svg"), () => gsap.to(c, { strokeDashoffset: L * (1 - parseFloat(c.dataset.pct)), duration: 2, ease: "power3.out" }));
  });
  document.querySelectorAll("[data-count]").forEach((t) => {
    const end = parseFloat(t.dataset.count);
    const obj = { v: 0 };
    onView(t.closest("svg"), () => gsap.to(obj, { v: end, duration: 2, ease: "power3.out", onUpdate: () => (t.textContent = Math.round(obj.v)) }));
  });
  document.querySelectorAll(".orb-draw-line").forEach((p) => {
    const L = p.getTotalLength();
    gsap.set(p, { strokeDasharray: L, strokeDashoffset: L });
    onView(p.closest("svg"), () => gsap.to(p, { strokeDashoffset: 0, duration: 1.8, ease: "power2.inOut", delay: 0.2 }));
  });
  document.querySelectorAll(".orb-widget").forEach((w) => {
    const bars = w.querySelectorAll(".orb-bar, .orb-row, .orb-stack-card");
    if (!bars.length) return;
    gsap.set(bars, { opacity: 0, y: 14 });
    onView(w, () => gsap.to(bars, { opacity: (i, el) => el.getAttribute("opacity") || 1, y: 0, duration: 0.8, stagger: 0.09, ease: "back.out(1.6)" }));
  });
  // embaralhamento: as alternativas do "Aluno 2" trocam de lugar em loop
  document.querySelectorAll(".orb-shuffle").forEach((s) => {
    if (reduce) return;
    gsap.to(s.querySelectorAll(".orb-draw-line"), { opacity: 0.25, duration: 1.2, stagger: { each: 0.3, repeat: -1, yoyo: true }, ease: "sine.inOut" });
  });

  // ---------------------------------------------------------------- Parallax extra nas seções
  if (!reduce) {
    gsap.to(".name-bg-embed > svg", { scale: 1.25, rotate: 6, ease: "none",
      scrollTrigger: { trigger: ".name-sc", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.utils.toArray(".stack-image > svg, .cta-image > svg").forEach((el) =>
      gsap.fromTo(el, { yPercent: 8 }, { yPercent: -6, ease: "none",
        scrollTrigger: { trigger: el.closest("section"), start: "top bottom", end: "bottom top", scrub: true } })
    );
    gsap.utils.toArray(".stack-circle").forEach((el) =>
      gsap.fromTo(el, { scale: 0.8 }, { scale: 1.15, ease: "none",
        scrollTrigger: { trigger: el.closest("section"), start: "top bottom", end: "bottom top", scrub: true } })
    );
    gsap.fromTo(".footer-name .orb-lockup", { yPercent: 40, opacity: 0.2, filter: "blur(0.6rem)" }, {
      yPercent: 0, opacity: 1, filter: "blur(0rem)", ease: "none",
      scrollTrigger: { trigger: ".footer-down-block", start: "top bottom", end: "bottom bottom", scrub: true },
    });
    gsap.fromTo(".footer-name .orb-lockup-planet", { rotate: -120, xPercent: -60 }, {
      rotate: 0, xPercent: 0, ease: "none",
      scrollTrigger: { trigger: ".footer-down-block", start: "top bottom", end: "bottom bottom", scrub: true },
    });
  }

  // ---------------------------------------------------------------- Passo a passo: trilho horizontal fixado
  ScrollTrigger.matchMedia({
    "(min-width: 480px)": function () {
      const pin = document.querySelector(".orb-process-pin");
      const track = document.querySelector(".orb-process-track");
      if (!pin || !track) return;
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      gsap.timeline({
        scrollTrigger: { trigger: pin, start: "top top", end: () => "+=" + dist() * 1.1, pin: true, scrub: 0.8, invalidateOnRefresh: true },
      })
        .to(track, { x: () => -dist(), ease: "none" }, 0)
        .to(".orb-process-bar span", { scaleX: 1, ease: "none" }, 0);
    },
  });
  gsap.utils.toArray(".orb-page").forEach((pg, i) =>
    gsap.from(pg, { y: 40, opacity: 0, duration: 0.9, delay: i * 0.15, ease: "power3.out",
      scrollTrigger: { trigger: pg.closest("svg"), start: "top 85%" } })
  );

  // ---------------------------------------------------------------- Compatibilidade: código digitado + resultado escrito
  document.querySelectorAll(".orb-compat-card").forEach((card) => {
    const pre = card.querySelector(".orb-code");
    if (!pre) return;
    const out = pre.querySelector("code");
    const render = card.querySelector(".orb-render");
    const write = render ? writeTimeline(render) : null;
    const text = pre.dataset.code;
    if (reduce) { out.textContent = text; if (write) write.progress(1); return; }
    const obj = { n: 0 };
    const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 3 })
      .set(obj, { n: 0 })
      .to(obj, { n: text.length, duration: text.length * 0.04, ease: "none",
        onUpdate: () => (out.textContent = text.slice(0, Math.round(obj.n))) });
    if (write) tl.add(() => write.restart(), "+=0.2").to({}, { duration: write.duration() + 2.5 }).add(() => write.pause(0));
    ScrollTrigger.create({ trigger: card, start: "top 80%", once: true, onEnter: () => tl.play() });
  });
  document.querySelectorAll(".orb-tikz").forEach((svgEl) => {
    const bits = svgEl.querySelectorAll(".orb-tikz-pt, .orb-tikz-lbl");
    gsap.set(bits, { opacity: 0 });
    ScrollTrigger.create({ trigger: svgEl, start: "top 85%", once: true,
      onEnter: () => gsap.to(bits, { opacity: 1, duration: 0.5, stagger: 0.08, delay: 1.2 }) });
  });
  gsap.from(".orb-compat-card", { y: 60, opacity: 0, duration: 1.1, stagger: 0.15, ease: "power3.out",
    scrollTrigger: { trigger: ".orb-compat-grid", start: "top 85%" } });
  gsap.from(".orb-marquee-row", { opacity: 0, x: (i) => (i ? -120 : 120), duration: 1.4, stagger: 0.15, ease: "power3.out",
    scrollTrigger: { trigger: ".orb-marquee", start: "top 90%" } });

  // ---------------------------------------------------------------- Vestibulares: letreiro em loop
  // de cima desliza para a esquerda, de baixo para a direita; acelera com o scroll e para no hover
  const marquee = document.querySelector(".orb-marquee");
  if (marquee && !reduce) {
    const loops = gsap.utils.toArray(".orb-marquee-row").map((row) => {
      const right = row.classList.contains("is-rev");
      return gsap.fromTo(row, { xPercent: right ? -50 : 0 }, { xPercent: right ? 0 : -50, duration: right ? 52 : 46, ease: "none", repeat: -1 });
    });
    let hover = false, boost = 0, speed = 1;
    marquee.addEventListener("mouseenter", () => (hover = true));
    marquee.addEventListener("mouseleave", () => (hover = false));
    if (lenis && lenis.on) lenis.on("scroll", (e) => (boost = Math.min(Math.abs(e.velocity || 0) * 0.25, 4)));
    gsap.ticker.add(() => {
      boost *= 0.92;
      speed += ((hover ? 0 : 1 + boost) - speed) * 0.08;
      loops.forEach((t) => t.timeScale(speed));
    });

    // luz laranja/roxa contornando cards sorteados
    const exams = gsap.utils.toArray(".orb-exam");
    const lightUp = () => {
      const visible = exams.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.right > innerWidth * 0.12 && r.left < innerWidth * 0.88 && r.bottom > 0 && r.top < innerHeight;
      });
      const el = visible[Math.floor(Math.random() * visible.length)];
      if (el && !el.classList.contains("is-lit")) {
        el.classList.toggle("is-purple", Math.random() < 0.5);
        el.classList.add("is-lit");
        setTimeout(() => el.classList.remove("is-lit"), 1600 + Math.random() * 1600);
      }
      setTimeout(lightUp, 350 + Math.random() * 650);
    };
    ScrollTrigger.create({ trigger: marquee, start: "top bottom", once: true, onEnter: lightUp });
  }

  // sublinhado roxo em "um dos melhores do mundo!", uma linha depois da outra
  const underline = gsap.utils.toArray(".orb-exams .orb-underline");
  if (underline.length) {
    gsap.to(underline, { backgroundSize: "100% .07em", duration: 0.9, stagger: 0.55, ease: "power2.inOut", delay: 0.9,
      scrollTrigger: { trigger: ".orb-exams .orb-sec-title", start: "top 80%" } });
  }

  // ---------------------------------------------------------------- Para professores: blur ao subir
  // o card é movido pela interação do Webflow; o blur acompanha quanto ele já subiu até sair da tela
  const teacher = document.querySelector(".stack-card-wrapper.s1");
  if (teacher && !reduce) {
    let lastP = -1;
    gsap.ticker.add(() => {
      const r = teacher.getBoundingClientRect();
      if (r.top > innerHeight || r.bottom < -innerHeight) return;
      const ty = new DOMMatrix(getComputedStyle(teacher).transform).m42; // deslocamento atual (negativo = subindo)
      const rest = r.top - ty; // topo do card parado
      const p = gsap.utils.clamp(0, 1, -ty / (rest + r.height));
      if (Math.abs(p - lastP) < 0.002) return;
      lastP = p;
      teacher.style.filter = p > 0.001 ? `blur(${(p * 1.8).toFixed(3)}rem)` : "";
      teacher.style.opacity = 1 - p * 0.35;
    });
  }

  // ---------------------------------------------------------------- Rodapé: desfoca até aparecer inteiro
  if (!reduce) {
    gsap.fromTo(".footer-sc .container", { filter: "blur(1.2rem)", opacity: 0.35 }, {
      filter: "blur(0rem)", opacity: 1, ease: "none",
      scrollTrigger: { trigger: "footer.footer", start: "top bottom", end: "bottom bottom", scrub: true },
    });
  }

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
