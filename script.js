"use strict";

const SETS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?/~",
};

const AMBIGUOUS = /([Il1O0o|`'"])/g;

const $ = (id) => document.getElementById(id);

const els = {
  password: $("password"),
  length: $("length"),
  lenValue: $("lenValue"),
  generate: $("generate"),
  copy: $("copy"),
  toast: $("toast"),
  strengthFill: $("strengthFill"),
  strengthLabel: $("strengthLabel"),
};

// Криптостойкий случайный целый в диапазоне [0, max)
function secureRandomInt(max) {
  if (max <= 0) return 0;
  const buf = new Uint32Array(1);
  // Отклонение с повторным запросом для равномерного распределения
  const limit = Math.floor(0xffffffff / max) * max;
  let x;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}

function getActiveSets() {
  const active = [];
  for (const key of Object.keys(SETS)) {
    const box = $(key);
    if (box && box.checked) active.push(key);
  }
  return active;
}

function filterChars(chars) {
  if ($("noAmbiguous").checked) return chars.replace(AMBIGUOUS, "");
  return chars;
}

function generatePassword() {
  const length = Number(els.length.value);
  const active = getActiveSets();

  if (active.length === 0) {
    els.password.value = "";
    updateStrength("");
    showToast("Выберите хотя бы один набор символов", true);
    return;
  }

  const pools = active.map((k) => filterChars(SETS[k])).filter((p) => p.length > 0);
  if (pools.length === 0) {
    els.password.value = "";
    updateStrength("");
    showToast("Нет доступных символов", true);
    return;
  }

  // Гарантируем минимум один символ из каждого выбранного набора
  const chars = pools.map((p) => p[secureRandomInt(p.length)]);

  // Остальные символы — из общего пула
  const all = pools.join("");
  while (chars.length < length) {
    chars.push(all[secureRandomInt(all.length)]);
  }

  // Перемешиваем (Fisher–Yates)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  const pwd = chars.slice(0, length).join("");
  els.password.value = pwd;
  updateStrength(pwd);
}

function updateStrength(pwd) {
  if (!pwd) {
    els.strengthFill.style.width = "0%";
    els.strengthLabel.textContent = "—";
    return;
  }

  // Оценка энтропии: log2(размер пула) * длина
  const pools = getActiveSets().map((k) => filterChars(SETS[k])).filter((p) => p.length);
  const poolSize = pools.reduce((sum, p) => sum + p.length, 0);
  const entropy = poolSize > 1 ? Math.log2(poolSize) * pwd.length : 0;

  let level, color, width;
  if (entropy < 45) { level = "Слабый"; color = "#ef4444"; width = 25; }
  else if (entropy < 70) { level = "Средний"; color = "#f59e0b"; width = 50; }
  else if (entropy < 100) { level = "Хороший"; color = "#22c55e"; width = 75; }
  else { level = "Отличный"; color = "#38bdf8"; width = 100; }

  els.strengthFill.style.width = width + "%";
  els.strengthFill.style.background = color;
  els.strengthLabel.textContent = `${level} (~${Math.round(entropy)} бит)`;
}

async function copyPassword() {
  const pwd = els.password.value;
  if (!pwd) return;
  try {
    await navigator.clipboard.writeText(pwd);
    showToast("Скопировано в буфер обмена ✓");
  } catch {
    els.password.select();
    document.execCommand("copy");
    showToast("Скопировано ✓");
  }
}

let toastTimer;
function showToast(msg, isError = false) {
  els.toast.textContent = msg;
  els.toast.style.color = isError ? "#ef4444" : "#4ade80";
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2000);
}

// События
els.generate.addEventListener("click", generatePassword);
els.copy.addEventListener("click", copyPassword);
els.length.addEventListener("input", () => {
  els.lenValue.textContent = els.length.value;
  if (els.password.value) generatePassword();
});
document.querySelectorAll(".options input").forEach((cb) => {
  cb.addEventListener("change", () => {
    if (els.password.value) generatePassword();
  });
});

// Первый пароль при загрузке
generatePassword();
