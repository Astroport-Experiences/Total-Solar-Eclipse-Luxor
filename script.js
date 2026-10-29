// Totality reaches Luxor on 2 August 2027 (greatest eclipse approx. 10:07 UTC, 13:07 local)
const target = new Date("2027-08-02T10:07:00Z").getTime();
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgb = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
const pad = (n) => String(n).padStart(2, "0");

// ---------- Countdown in the footer ----------
function updateCountdown() {
  const el = document.getElementById("countdown");
  const diff = target - Date.now();
  if (diff <= 0) {
    el.textContent = "Totality has reached Luxor";
    return;
  }
  const days = Math.ceil(diff / 86400000);
  el.innerHTML = `<span id="days">${days}</span> ${days === 1 ? "day" : "days"} to totality in Luxor`;
}
updateCountdown();
setInterval(updateCountdown, 60000);

// ---------- Move through totality ----------
const moments = [
  [0, "The diamond ring fades. Pink prominences flash at the Moon's edge for a few seconds. Glasses off."],
  [20, "The corona opens out around the black Moon, pearl white and wider than the Moon itself. The brightest planets and stars appear."],
  [70, "Look at the horizon. A sunset glows on every side at once, while the temples stand in deep blue shadow. The air is noticeably cooler."],
  [160, "Mid-totality. The sky is at its darkest and the corona at its widest. Look away from the Sun for a moment: the horizon glows all the way round."],
  [230, "More than half gone. Take a last long look with your own eyes, without a camera between you and the Sun."],
  [330, "The far edge of the Moon starts to brighten and new prominences show on that side. Have your glasses in your hand."],
  [370, "Glasses on now. The second diamond ring is seconds away, and with it full daylight returns fast."]
];
const range = document.getElementById("scrub-range");
const timeOut = document.getElementById("scrub-time");
const textOut = document.getElementById("scrub-text");

function updateScrub() {
  const s = Number(range.value);
  let text = moments[0][1];
  for (const [at, line] of moments) if (s >= at) text = line;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  timeOut.textContent = `${m}:${pad(sec)}`;
  range.setAttribute("aria-valuetext", `${m} minute${m === 1 ? "" : "s"} ${sec} second${sec === 1 ? "" : "s"} into totality`);
  if (textOut.textContent !== text) textOut.textContent = text;
}
range.addEventListener("input", updateScrub);
updateScrub();

// ---------- The section: one clock drives the eclipse, the light in the temple and the readouts ----------
const hero = document.querySelector(".hero");
const drawing = document.querySelector(".section-drawing");
const corona = document.querySelector(".eclipse-corona");
const track = document.querySelector(".timescale-track");
const readCovered = document.getElementById("read-covered");
const readTime = document.getElementById("read-time");
const readTimeLabel = document.getElementById("read-time-label");
const scene = document.documentElement.classList.contains("scene");

const DAY = [241, 240, 236];      // by day the drawing sits on the page's limewash
const SHADOW = [91, 107, 124];    // --shadow
const NIGHT = [40, 49, 62];       // totality inside the drawing: a deep shadow blue, so the poche still reads
const PARTIAL_MINUTES = 80;       // the partial phase before totality lasts about 1 h 20 min

// share of the Sun's disc covered by a Moon of the same size, centres d diameters apart
function coverage(d) {
  if (d >= 1) return 0;
  const r = 0.5;
  const area = 2 * r * r * Math.acos(d / (2 * r)) - (d / 2) * Math.sqrt(4 * r * r - d * d);
  return area / (Math.PI * r * r);
}

let layout = null;
function measure() {
  layout = {
    heroTop: hero.offsetTop,
    heroScroll: Math.max(1, hero.offsetHeight - window.innerHeight),
    trackWidth: track.getBoundingClientRect().width
  };
  drawing.style.setProperty("--track-w", `${layout.trackWidth}px`);
}

function paintSection(y) {
  const p = scene ? clamp((y - layout.heroTop) / layout.heroScroll) : 0.45;
  const dist = Math.max(0, 1 - p / 0.8);          // Sun diameters between centres; 0 = totality
  const cov = coverage(dist);
  const light = 1 - cov;
  const dark = Math.pow(clamp((cov - 0.55) / 0.45), 1.4);
  const sky = dark < 0.6 ? mix(DAY, SHADOW, dark / 0.6) : mix(SHADOW, NIGHT, (dark - 0.6) / 0.4);
  const coronaOpacity = scene ? clamp((p - 0.76) / 0.1) : 0;

  drawing.style.setProperty("--moon-x", (dist * 0.935).toFixed(4));
  drawing.style.setProperty("--moon-y", (dist * -0.355).toFixed(4));
  drawing.style.setProperty("--sky-now", rgb(sky));
  drawing.style.setProperty("--beam-w", Math.max(0.02, light).toFixed(3));
  drawing.style.setProperty("--beam-o", (0.62 * clamp(light * 1.6)).toFixed(3));
  drawing.style.setProperty("--anno-ink", dark > 0.45 ? "var(--limewash)" : "var(--poche)");
  drawing.style.setProperty("--progress", clamp(p / 0.8).toFixed(4));
  drawing.style.setProperty("--corona", coronaOpacity.toFixed(3));
  // the blended corona layer is costly to draw: take it out entirely until it is needed
  corona.style.visibility = coronaOpacity > 0 ? "visible" : "hidden";

  const pct = String(Math.round(cov * 100));
  if (readCovered.textContent !== pct) readCovered.textContent = pct;
  let label = "To totality";
  let time;
  if (dist === 0) {
    label = "Totality";
    time = "6:23";
  } else {
    const secs = Math.round(dist * PARTIAL_MINUTES * 60);
    time = `${Math.floor(secs / 3600)}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`;
  }
  if (readTimeLabel.textContent !== label) readTimeLabel.textContent = label;
  if (readTime.textContent !== time) readTime.textContent = time;
}

// ---------- Entrances: content settles just before it arrives ----------
let pending = [];
if (!reduceMotion) {
  const groups = [
    ".trip",
    ".why-photo, .measures > li",
    ".stages > li",
    ".scrub-copy > *, .scrub-live > *"
  ];
  for (const selector of groups) {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.setAttribute("data-rise", "");
      el.style.setProperty("--i", String(i % 4));
      pending.push(el);
    });
  }
}
// an observer as well as the frame sweep, so content can never stay hidden after a jump
if (pending.length && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px 6% 0px" });
  pending.forEach((el) => io.observe(el));
}
function revealPassed() {
  if (!pending.length) return;
  const limit = window.innerHeight * 1.04;
  pending = pending.filter((el) => {
    if (el.getBoundingClientRect().top < limit) { el.classList.add("is-in"); return false; }
    return true;
  });
}

// ---------- One frame loop, driven by Lenis (eased wheel and trackpad) or the native scroll ----------
function frame(y = window.scrollY) {
  paintSection(y);
  revealPassed();
}
measure();
let lenis = null;
if (!reduceMotion && typeof window.Lenis === "function") {
  const bar = document.querySelector(".bar");
  lenis = new window.Lenis({ autoRaf: true, lerp: 0.085, wheelMultiplier: 0.95, anchors: { offset: -bar.offsetHeight } });
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
const refresh = () => { measure(); frame(lenis ? lenis.scroll : window.scrollY); };
window.addEventListener("resize", refresh);
window.addEventListener("load", refresh);
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

// ---------- Watch safely: the picture follows the topic beside it ----------
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
