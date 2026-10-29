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
} else {
  heroSky = rgb(SKY);   // reduced motion: the still partial eclipse sits in the day sky
}

// ---------- One ground for the page: its tint drifts between chapter tones as you scroll ----------
// Each chapter has a tone (CSS custom properties --tone-*). Around every boundary the ground
// blends from one tone to the next over most of a screen, so there is never a hard colour edge.
const bar = document.querySelector(".bar");
const rootStyle = getComputedStyle(document.documentElement);
const toneOf = (name) => {
  const hex = rootStyle.getPropertyValue(name).trim().replace("#", "");
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
};
const parseRgb = (s) => (s.match(/\d+/g) || [0, 0, 0]).slice(0, 3).map(Number);
const chapters = [
  [hero, () => (heroSky ? parseRgb(heroSky) : [0, 0, 0])],
  [document.querySelector(".why"), () => toneOf("--tone-why")],
  [document.querySelector(".minutes"), () => toneOf("--tone-minutes")],
  [document.querySelector(".safety"), () => toneOf("--tone-safety")],
  [document.querySelector(".next"), () => toneOf("--tone-next")],
  [document.querySelector(".questions"), () => toneOf("--tone-questions")],
  [document.querySelector(".footer"), () => toneOf("--tone-footer")]
];
const smooth = (t) => t * t * (3 - 2 * t);

// the ground colour at a point on screen (y in viewport pixels)
function groundAt(y) {
  const zone = window.innerHeight * 0.4;   // half-width of each blend
  const rects = chapters.map(([el]) => el.getBoundingClientRect());
  let i = rects.findIndex((r) => y >= r.top && y < r.bottom);
  if (i === -1) i = y < rects[0].top ? 0 : rects.length - 1;
  const here = chapters[i][1]();
  // blend towards the neighbour whose boundary is within the zone
  const toNext = rects[i].bottom - y;
  const fromPrev = y - rects[i].top;
  if (i < chapters.length - 1 && toNext < zone) {
    return mix(here, chapters[i + 1][1](), smooth(0.5 - toNext / (2 * zone)));
  }
  if (i > 0 && fromPrev < zone) {
    return mix(chapters[i - 1][1](), here, smooth(0.5 + fromPrev / (2 * zone)));
  }
  return here;
}

function paintGround() {
  document.body.style.backgroundColor = rgb(groundAt(window.innerHeight / 2));
  const overHero = hero.getBoundingClientRect().bottom > bar.offsetHeight / 2;
  bar.style.setProperty("--bar-ground", overHero && heroSky ? heroSky : rgb(groundAt(bar.offsetHeight / 2)));
}
let ticking = false;
window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(() => { paintGround(); ticking = false; });
    ticking = true;
  }
}, { passive: true });
window.addEventListener("resize", paintGround);
paintGround();

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
