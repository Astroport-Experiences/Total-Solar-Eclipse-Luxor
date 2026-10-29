// Countdown to totality in Luxor, 2 August 2027 (greatest eclipse approx. 10:07 UTC, 13:07 local)
const target = new Date("2027-08-02T10:07:00Z").getTime();

function pad(n) {
  return String(n).padStart(2, "0");
}

function updateCountdown() {
  const diff = target - Date.now();

  if (diff <= 0) {
    document.getElementById("countdown").innerHTML =
      "<p>Totality has reached Luxor.</p>";
    clearInterval(timer);
    return;
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  document.getElementById("days").textContent = days;
  document.getElementById("hours").textContent = pad(hours);
  document.getElementById("minutes").textContent = pad(minutes);
  document.getElementById("seconds").textContent = pad(seconds);
}

const timer = setInterval(updateCountdown, 1000);
updateCountdown();
