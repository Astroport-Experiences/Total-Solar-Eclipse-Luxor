// Totality reaches Luxor on 2 August 2027 (greatest eclipse approx. 10:07 UTC, 13:07 local)
const target = new Date("2027-08-02T10:07:00Z").getTime();
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const pad = (n) => String(n).padStart(2, "0");

// ---------- Countdown, in the cover and the closing line ----------
function updateCountdown() {
  const diff = target - Date.now();
  const days = Math.max(0, Math.ceil(diff / 86400000));
  document.querySelectorAll(".days").forEach((el) => {
    if (el.textContent !== String(days)) el.textContent = days;
  });
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

// ---------- Entrances: content settles as it arrives (CSS skips this under reduced motion) ----------
const risers = document.querySelectorAll("[data-rise]");
if (!reduceMotion && "IntersectionObserver" in window) {
  // stagger siblings in the same row, at most four deep
  risers.forEach((el) => {
    const i = Array.prototype.indexOf.call(el.parentElement.children, el);
    el.style.setProperty("--i", String(i % 4));
  });
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -8% 0px" });
  risers.forEach((el) => io.observe(el));
} else {
  risers.forEach((el) => el.classList.add("is-in"));
}

// ---------- The time-lapse only loads and plays while it is on screen ----------
const video = document.querySelector(".stage-video");
if (video && !reduceMotion && "IntersectionObserver" in window) {
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) video.play().catch(() => {});
    else video.pause();
  }, { threshold: 0.25 }).observe(video);
} else if (video) {
  video.controls = true;
}
