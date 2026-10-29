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
const NIGHT = [0, 0, 0];     // the sky at totality: true black, so the corona photograph sits in it seamlessly
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

function updateEclipse() {
  const scrollable = hero.offsetHeight - window.innerHeight;
  const p = scrollable > 0 ? clamp(-hero.getBoundingClientRect().top / scrollable) : 0.5;
  const dist = Math.max(0, 1 - p / 0.8);           // in Sun diameters; 0 = totality
  const cov = coverage(dist);
  const dark = Math.pow(clamp((cov - 0.75) / 0.25), 1.6);

  hero.style.setProperty("--moon-x", (dist * 0.935).toFixed(4));
  hero.style.setProperty("--moon-y", (dist * -0.355).toFixed(4));
  hero.style.setProperty("--corona", clamp((p - 0.76) / 0.1).toFixed(3));
  heroSky = rgb(mix(SKY, NIGHT, dark));
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

if (document.documentElement.classList.contains("scene")) {
  window.addEventListener("scroll", () => requestAnimationFrame(updateEclipse), { passive: true });
  window.addEventListener("resize", updateEclipse);
  updateEclipse();
}

// ---------- The bar takes the colour of the chapter beneath it ----------
const bar = document.querySelector(".bar");
const chapters = [...document.querySelectorAll("[data-chapter]")].filter((el) => el !== bar);

function chapterUnderBar() {
  const line = bar.offsetHeight / 2;
  let current = null;
  for (const el of chapters) {
    // a band inside a chapter (the questions' heading band) counts as its parent's colour
    const r = el.getBoundingClientRect();
    if (r.top <= line && r.bottom > line) current = el;
  }
  if (current) {
    let chapter = current.dataset.chapter;
    // inside the questions chapter, the paper bands set the bar to paper
    if (current.classList.contains("questions")) {
      const band = [...current.querySelectorAll(".band")].find((b) => {
        const r = b.getBoundingClientRect();
        return r.top <= line && r.bottom > line;
      });
      if (band && !band.classList.contains("band-head")) chapter = "paper";
    }
    if (bar.dataset.chapter !== chapter) bar.dataset.chapter = chapter;
    bar.style.backgroundColor = current === hero && heroSky ? heroSky : "";
  }
}
let ticking = false;
window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(() => { chapterUnderBar(); ticking = false; });
    ticking = true;
  }
}, { passive: true });
chapterUnderBar();

// ---------- Entrances: heading, then text, then picture, once per section ----------
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

if (!reduceMotion && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      }
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

  for (const selector of groups) {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.setAttribute("data-rise", "");
      el.style.setProperty("--i", String(i % 6));
      observer.observe(el);
    });
  }
  // the hero photograph settles from a slow zoom as it enters
  document.querySelectorAll(".mosaic-photo").forEach((el) => observer.observe(el));

  // a fast jump (a link, the end key) can skip past the observer: reveal anything already passed
  const sweep = () => {
    document.querySelectorAll("[data-rise]:not(.is-in), .mosaic-photo:not(.is-in)").forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-in");
    });
  };
  let sweepQueued = false;
  window.addEventListener("scroll", () => {
    if (!sweepQueued) {
      sweepQueued = true;
      setTimeout(() => { sweep(); sweepQueued = false; }, 120);
    }
  }, { passive: true });
} else {
  document.querySelectorAll(".mosaic-photo").forEach((el) => el.classList.add("is-in"));
}

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
