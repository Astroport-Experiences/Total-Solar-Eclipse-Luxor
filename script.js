// Totality reaches Luxor on 2 August 2027 (greatest eclipse approx. 10:07 UTC, 13:07 local)
const target = new Date("2027-08-02T10:07:00Z").getTime();
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Countdown in the footer ----------
function updateCountdown() {
  const el = document.getElementById("countdown");
  const diff = target - Date.now();
  if (diff <= 0) {
    el.textContent = "Totality has reached Luxor";
    return;
  }
  const days = Math.ceil(diff / 86400000);
  el.innerHTML = `<span id="days">${days}</span>&nbsp;${days === 1 ? "day" : "days"} to&nbsp;go`;
}
updateCountdown();
setInterval(updateCountdown, 60000);

// ---------- Move through totality ----------
const moments = [
  [0, "The diamond ring fades. Pink prominences flash at the Moon's edge for a few seconds. Glasses off."],
  [20, "The corona opens out around the black Moon, pearl white and wider than the Moon itself. The brightest planets and stars appear."],
  [70, "Look at the horizon. A sunset glows on every side at once, while the temples stand in deep blue shadow. The air is noticeably cooler."],
  [160, "Mid-totality. The sky is at its darkest and the corona at its widest. Look away from the Sun for a moment: the horizon glows orange all the way round."],
  [230, "More than half gone. Take a last long look with your own eyes, without a camera between you and the Sun."],
  [330, "The far edge of the Moon starts to brighten and new prominences show on that side. Have your glasses in your hand."],
  [370, "Glasses on now. The second diamond ring is seconds away, and with it full daylight returns fast."]
];

const range = document.getElementById("scrub-range");
const timeOut = document.getElementById("scrub-time");
const textOut = document.getElementById("scrub-text");

function formatTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function updateScrub() {
  const s = Number(range.value);
  let text = moments[0][1];
  for (const [at, line] of moments) if (s >= at) text = line;
  timeOut.textContent = formatTime(s);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  range.setAttribute("aria-valuetext", `${m} minute${m === 1 ? "" : "s"} ${sec} second${sec === 1 ? "" : "s"} into totality`);
  if (textOut.textContent !== text) textOut.textContent = text;
}
range.addEventListener("input", updateScrub);
updateScrub();

// ---------- The eclipse in the first screen follows the scroll ----------
const hero = document.querySelector(".hero");
const phase = document.getElementById("eclipse-phase");
const SKY = [56, 88, 165];   // --sky
// the sky at totality ends on the next chapter's tone, so the first screen hands over without an edge
const NIGHT = (() => {
  const hex = getComputedStyle(document.documentElement).getPropertyValue("--tone-why").trim().replace("#", "");
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
})();
let heroSky = null;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgb = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

// share of the Sun's disc covered by a Moon of the same size, centres d diameters apart
function coverage(d) {
  if (d >= 1) return 0;
  const r = 0.5;
  const area = 2 * r * r * Math.acos(d / (2 * r)) - (d / 2) * Math.sqrt(4 * r * r - d * d);
  return area / (Math.PI * r * r);
}


// ---------- Scroll: one frame loop drives the eclipse, the ground, the bar and the reveals ----------
// Lenis gives the wheel and trackpad an eased, inertial scroll (skipped when motion is reduced).
// Everything that follows the scroll is updated once per frame from the same scroll value, so the
// first screen, the ground behind the page and the bar can never drift apart.
const scene = document.documentElement.classList.contains("scene");
const bar = document.querySelector(".bar");
const ground = document.querySelector(".ground");
const corona = document.querySelector(".eclipse-corona");
const rootStyle = getComputedStyle(document.documentElement);
const toneOf = (name) => {
  const hex = rootStyle.getPropertyValue(name).trim().replace("#", "");
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
};
const chapterEls = [".why", ".minutes", ".safety", ".next", ".questions", ".footer"].map((s) => document.querySelector(s));
const chapterTones = ["--tone-why", "--tone-minutes", "--tone-safety", "--tone-next", "--tone-questions", "--tone-footer"].map(toneOf);
const smooth = (t) => t * t * (3 - 2 * t);
let heroSkyRgb = SKY;
let layout = null;

// measure once (and again on resize), not on every frame
function measure() {
  layout = {
    vh: window.innerHeight,
    barMid: bar.offsetHeight / 2,
    heroTop: hero.offsetTop,
    heroScroll: Math.max(1, hero.offsetHeight - window.innerHeight),
    heroBottom: hero.offsetTop + hero.offsetHeight,
    bounds: chapterEls.map((el) => [el.offsetTop, el.offsetTop + el.offsetHeight])
  };
}

function updateEclipse(y) {
  const p = scene ? clamp((y - layout.heroTop) / layout.heroScroll) : 0.5;
  const dist = Math.max(0, 1 - p / 0.8);           // in Sun diameters; 0 = totality
  const cov = coverage(dist);
  const dark = scene ? Math.pow(clamp((cov - 0.75) / 0.25), 1.6) : 0;
  const coronaOpacity = scene ? clamp((p - 0.76) / 0.1) : 0;

  heroSkyRgb = mix(SKY, NIGHT, dark);
  heroSky = rgb(heroSkyRgb);
  if (!scene) return;
  hero.style.setProperty("--moon-x", (dist * 0.935).toFixed(4));
  hero.style.setProperty("--moon-y", (dist * -0.355).toFixed(4));
  hero.style.setProperty("--corona", coronaOpacity.toFixed(3));
  // the blended corona layer is costly to draw: take it out entirely until it is needed
  corona.style.visibility = coronaOpacity > 0 ? "visible" : "hidden";
  hero.style.setProperty("--sky-now", heroSky);
  // the dark line of the title flips to white early, so it never sits grey on a grey-blue sky
  hero.style.setProperty("--dark-ink-now", rgb(mix([0, 0, 0], [255, 255, 255], clamp((dark - 0.08) / 0.18))));

  const pct = Math.round(cov * 100);
  let text;
  if (dist === 0) text = "Totality · 6 min 23 s of darkness";
  else if (dist > 0.985) text = "First contact · 1 h 20 min before totality";
  else if (cov < 0.8) text = `Partial eclipse · ${pct}% of the Sun covered`;
  else if (cov < 0.985) text = `${pct}% covered · the light turns strange`;
  else text = "The diamond ring · seconds to go";
  if (phase.textContent !== text) phase.textContent = text;
}

// the ground's colour at a page position: a chapter's tone, blended across each boundary
function groundAt(pageY) {
  const zone = layout.vh * 0.45;
  const tones = [heroSkyRgb, ...chapterTones];
  const edges = [layout.heroBottom, ...layout.bounds.map((b) => b[1])];  // bottom of each chapter
  for (let i = 0; i < tones.length; i++) {
    const end = edges[i];
    if (i < tones.length - 1 && pageY > end - zone && pageY < end + zone) {
      return mix(tones[i], tones[i + 1], smooth((pageY - (end - zone)) / (2 * zone)));
    }
    if (pageY <= end || i === tones.length - 1) return tones[i];
  }
  return tones[tones.length - 1];
}

let pending = [];
function revealPassed() {
  if (!pending.length) return;
  pending = pending.filter((el) => {
    if (el.getBoundingClientRect().top < layout.vh * 1.05) { el.classList.add("is-in"); return false; }
    return true;
  });
}

function frame(y = window.scrollY) {
  updateEclipse(y);
  // one colour for the whole screen; the bar wears it too, except while it sits over the first screen
  const tint = rgb(groundAt(y + layout.vh / 2));
  ground.style.backgroundColor = tint;
  bar.style.setProperty("--bar-ground", y + layout.barMid < layout.heroBottom ? heroSky : tint);
  revealPassed();
}

measure();
let lenis = null;
if (!reduceMotion && typeof window.Lenis === "function") {
  lenis = new window.Lenis({
    autoRaf: true,
    lerp: 0.085,                 // how softly the page settles after each wheel or trackpad move
    wheelMultiplier: 0.95,
    anchors: { offset: -bar.offsetHeight }
  });
  lenis.on("scroll", ({ scroll }) => frame(scroll));
} else {
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => { frame(); ticking = false; });
    }
  }, { passive: true });
}
window.addEventListener("resize", () => { measure(); frame(lenis ? lenis.scroll : window.scrollY); });
window.addEventListener("load", () => { measure(); frame(lenis ? lenis.scroll : window.scrollY); });

// ---------- Entrances: heading, then text, then picture, once per section ----------
// They start just before an element reaches the screen, so content is already settling as it arrives.
const groups = [
  ".hero-title > span, .hero-lede",
  ".why-head > *, .mosaic-photo, .tile",
  ".stages-head > *, .stage",
  ".scrub-copy > *, .scrub-live > *",
  ".safety-pin-inner > h2, .safety-pin-inner > p",
  ".safety-block",
  "#next h2, .poster-list li",
  ".band"
];

if (!reduceMotion) {
  for (const selector of groups) {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.setAttribute("data-rise", "");
      el.style.setProperty("--i", String(i % 4));
      pending.push(el);
    });
  }
  document.querySelectorAll(".mosaic-photo").forEach((el) => { if (!pending.includes(el)) pending.push(el); });
} else {
  document.querySelectorAll(".mosaic-photo").forEach((el) => el.classList.add("is-in"));
}
frame();

// ---------- The time-lapse only plays while it is on screen ----------
const video = document.querySelector(".stage-video");
if (video) {
  if (reduceMotion) {
    video.removeAttribute("autoplay");
    video.pause();
  } else if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    }).observe(video);
  }
}

// ---------- Watch safely: the picture in the black field follows the topic beside it ----------
const stageImages = document.querySelectorAll(".safety-stage img");
if (stageImages.length && "IntersectionObserver" in window) {
  const topicObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const index = entry.target.dataset.index;
      stageImages.forEach((img) => img.classList.toggle("is-active", img.dataset.index === index));
    }
  }, { rootMargin: "-45% 0px -45% 0px" });
  document.querySelectorAll(".safety-block").forEach((block) => topicObserver.observe(block));
}
