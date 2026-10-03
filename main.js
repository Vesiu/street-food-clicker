// --- 1. MODÈLE DE DONNÉES (Le Cerveau) ---
const STORAGE_KEY = "street_food_save_v1";

const defaultState = {
  money: 0,
  totalMoneyEarned: 0,
  baseClickPower: 1,
  lastTick: Date.now(),
  upgrades: [
    {
      id: "crispy_fries",
      name: "Sel de Guérande",
      description: "Le clic rapporte 2× plus",
      cost: 50,
      unlockAt: 20,
      bought: false,
      type: "click",
      multiplier: 2
    },
    {
      id: "mayo_bucket",
      name: "Fût de mayo géant",
      description: "Les distributeurs sont 2× plus efficaces",
      cost: 250,
      unlockAt: 120,
      bought: false,
      type: "building",
      targetId: "sauce_dispenser",
      multiplier: 2
    },
    {
      id: "potato_terroir",
      name: "Patates de terroir",
      description: "Les coupe-frites sont 2× plus efficaces",
      cost: 1500,
      unlockAt: 800,
      bought: false,
      type: "building",
      targetId: "potato_cutter",
      multiplier: 2
    },
    {
      id: "pro_oil",
      name: "Huile de compèt'",
      description: "Les friteuses sont 2× plus efficaces",
      cost: 8000,
      unlockAt: 4000,
      bought: false,
      type: "building",
      targetId: "double_fryer",
      multiplier: 2
    }
  ],
  producers: [
    {
      id: "sauce_dispenser",
      name: "Distributeur de sauces",
      count: 0,
      baseCost: 15,
      costMultiplier: 1.15,
      incomePerSec: 1,
      unlockAt: 0
    },
    {
      id: "potato_cutter",
      name: "Coupe-frites pro",
      count: 0,
      baseCost: 100,
      costMultiplier: 1.15,
      incomePerSec: 5,
      unlockAt: 40
    },
    {
      id: "double_fryer",
      name: "Friteuse double bac",
      count: 0,
      baseCost: 1100,
      costMultiplier: 1.15,
      incomePerSec: 32,
      unlockAt: 500
    },
    {
      id: "student_helper",
      name: "Pote étudiant en renfort",
      count: 0,
      baseCost: 12000,
      costMultiplier: 1.15,
      incomePerSec: 260,
      unlockAt: 5000
    },
    {
      id: "speaker",
      name: "Enceinte Bluetooth",
      count: 0,
      baseCost: 130000,
      costMultiplier: 1.15,
      incomePerSec: 1400,
      unlockAt: 60000
    }
  ]
};

let state = loadGame() || defaultState;

// --- 2. CALCULS & UTILITAIRES ---

function formatNumber(num) {
  if (num < 1000) return Math.floor(num).toString();
  const suffixes = [
    { value: 1e12, symbol: " T" },
    { value: 1e9, symbol: " Md" },
    { value: 1e6, symbol: " M" },
    { value: 1e3, symbol: " k" }
  ];
  const item = suffixes.find(s => num >= s.value);
  if (!item) return Math.floor(num).toString();
  return (num / item.value).toFixed(2).replace(".", ",") + item.symbol;
}

function getClickPower() {
  let power = state.baseClickPower;
  state.upgrades.forEach(u => {
    if (u.bought && u.type === "click") {
      power *= u.multiplier;
    }
  });
  return power;
}

function getProducerIncome(producer) {
  let income = producer.incomePerSec;
  state.upgrades.forEach(u => {
    if (u.bought && u.type === "building" && u.targetId === producer.id) {
      income *= u.multiplier;
    }
  });
  return income;
}

function getIncomePerSecond() {
  return state.producers.reduce((total, p) => total + (p.count * getProducerIncome(p)), 0);
}

function getCost(producer) {
  return Math.floor(producer.baseCost * Math.pow(producer.costMultiplier, producer.count));
}

function buyProducer(producerId) {
  const producer = state.producers.find(p => p.id === producerId);
  if (!producer) return;

  const cost = getCost(producer);
  if (state.money >= cost) {
    state.money -= cost;
    producer.count += 1;
    saveGame();
    renderProducers();
  }
}

function buyUpgrade(upgradeId) {
  const upgrade = state.upgrades.find(u => u.id === upgradeId);
  if (!upgrade || upgrade.bought) return;

  if (state.money >= upgrade.cost) {
    state.money -= upgrade.cost;
    upgrade.bought = true;
    saveGame();
    renderUpgrades();
    renderProducers();
  }
}

function handleClick() {
  const gain = getClickPower();
  state.money += gain;
  state.totalMoneyEarned += gain;
}

// --- 3. BOUCLE DE JEU (Delta-Time) ---
function gameLoop() {
  const now = Date.now();
  const dt = (now - state.lastTick) / 1000;
  state.lastTick = now;

  const passiveGain = getIncomePerSecond() * dt;
  state.money += passiveGain;
  state.totalMoneyEarned += passiveGain;

  // Vérifie si de nouveaux éléments doivent apparaître à l'écran
  checkNewUnlocks();

  render();
  requestAnimationFrame(gameLoop);
}

// --- 4. PERSISTANCE ---
function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    const offlineSeconds = (Date.now() - (parsed.lastTick || Date.now())) / 1000;
    
    let incomeRate = 0;
    parsed.producers?.forEach(p => {
      let unitIncome = p.incomePerSec;
      parsed.upgrades?.forEach(u => {
        if (u.bought && u.type === "building" && u.targetId === p.id) {
          unitIncome *= u.multiplier;
        }
      });
      incomeRate += p.count * unitIncome;
    });

    const offlineGain = incomeRate * offlineSeconds;
    parsed.money += offlineGain;
    parsed.totalMoneyEarned = (parsed.totalMoneyEarned || parsed.money) + offlineGain;
    parsed.lastTick = Date.now();
    return parsed;
  } catch (e) {
    console.error("Erreur de sauvegarde :", e);
    return null;
  }
}

setInterval(saveGame, 5000);

// --- 5. INTERFACE UTILISATEUR & GESTION DU MASQUAGE ---
const moneyDisplay = document.getElementById("money-display");
const cpsDisplay = document.getElementById("cps-display");
const serveButton = document.getElementById("serve-btn");
const producersList = document.getElementById("producers-list");
const shopUpgradesList = document.getElementById("shop-upgrades-list");

const slotSauce = document.getElementById("slot-sauce");
const slotCutter = document.getElementById("slot-cutter");
const fryerPot = document.querySelector(".fryer-pot");
const slotStudent = document.getElementById("slot-student");

// Rend uniquement les améliorations débloquées et non achetées
function renderUpgrades() {
  shopUpgradesList.innerHTML = "";

  state.upgrades.forEach(u => {
    if (u.bought) return;
    if (state.totalMoneyEarned < u.unlockAt) return; // Reste masqué

    const card = document.createElement("div");
    card.className = "upgrade-card";
    card.id = `upgrade-${u.id}`;

    card.innerHTML = `
      <div>
        <strong>${u.name}</strong>
        <p class="upgrade-desc">${u.description}</p>
      </div>
      <button class="buy-upgrade-btn" id="btn-up-${u.id}">
        ${formatNumber(u.cost)} €
      </button>
    `;

    card.querySelector("button").addEventListener("click", () => buyUpgrade(u.id));
    shopUpgradesList.appendChild(card);
  });
}

// Rend uniquement les équipements débloqués
function renderProducers() {
  producersList.innerHTML = "";

  state.producers.forEach(p => {
    if (state.totalMoneyEarned < p.unlockAt) return; // Reste masqué

    const card = document.createElement("div");
    card.className = "producer-card";
    card.id = `card-${p.id}`;

    card.innerHTML = `
      <div class="producer-info">
        <strong>${p.name}</strong>
        <span class="producer-gain" id="gain-${p.id}">+${formatNumber(getProducerIncome(p))} €/s</span>
      </div>
      <button class="buy-btn" id="btn-${p.id}">
        Acheter (<span class="cost">${formatNumber(getCost(p))}</span> €)
        <span class="count">x${p.count}</span>
      </button>
    `;

    card.querySelector("button").addEventListener("click", () => buyProducer(p.id));
    producersList.appendChild(card);
  });
}

let lastUnlockedProducerCount = 0;
let lastUnlockedUpgradeCount = 0;

function checkNewUnlocks() {
  const visibleProducers = state.producers.filter(p => state.totalMoneyEarned >= p.unlockAt).length;
  const visibleUpgrades = state.upgrades.filter(u => !u.bought && state.totalMoneyEarned >= u.unlockAt).length;

  if (visibleProducers !== lastUnlockedProducerCount) {
    lastUnlockedProducerCount = visibleProducers;
    renderProducers();
  }
  if (visibleUpgrades !== lastUnlockedUpgradeCount) {
    lastUnlockedUpgradeCount = visibleUpgrades;
    renderUpgrades();
  }
}

function render() {
  moneyDisplay.textContent = formatNumber(state.money);
  cpsDisplay.textContent = `+${formatNumber(getIncomePerSecond())} € / sec`;
  serveButton.textContent = `🍟 Servir (+${formatNumber(getClickPower())} €)`;

  state.producers.forEach(p => {
    const cost = getCost(p);
    const card = document.getElementById(`card-${p.id}`);
    const btn = document.getElementById(`btn-${p.id}`);
    const gainLabel = document.getElementById(`gain-${p.id}`);

    if (card && btn) {
      card.querySelector(".cost").textContent = formatNumber(cost);
      card.querySelector(".count").textContent = `x${p.count}`;
      if (gainLabel) gainLabel.textContent = `+${formatNumber(getProducerIncome(p))} €/s`;
      btn.disabled = state.money < cost;
    }
  });

  state.upgrades.forEach(u => {
    const btn = document.getElementById(`btn-up-${u.id}`);
    if (btn) {
      btn.disabled = state.money < u.cost;
    }
  });

  // --- MISE À JOUR DE LA VITRINE EN DIRECT ---
  const sauceCount = state.producers.find(p => p.id === "sauce_dispenser")?.count || 0;
  const cutterCount = state.producers.find(p => p.id === "potato_cutter")?.count || 0;
  const fryerCount = state.producers.find(p => p.id === "double_fryer")?.count || 0;
  const studentCount = state.producers.find(p => p.id === "student_helper")?.count || 0;

  if (slotSauce) {
    slotSauce.textContent = "🧴";
    slotSauce.classList.toggle("active", sauceCount > 0);
  }
  if (slotCutter) {
    slotCutter.textContent = "🥔";
    slotCutter.classList.toggle("active", cutterCount > 0);
  }
  if (fryerPot) {
    fryerPot.classList.toggle("cooking", fryerCount > 0);
  }
  if (slotStudent) {
    slotStudent.textContent = studentCount > 0 ? `🧑‍🍳 × ${studentCount}` : "";
    slotStudent.classList.toggle("active", studentCount > 0);
  }
}

// --- INITIALISATION ---
serveButton.addEventListener("click", handleClick);
renderProducers();
renderUpgrades();
state.lastTick = Date.now();
requestAnimationFrame(gameLoop);