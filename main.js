// --- 1. MODÈLE DE DONNÉES ---
const STORAGE_KEY = "street_food_save_v1";

const defaultState = {
  money: 0,
  baseClickPower: 1,
  lastTick: Date.now(),
  upgrades: [
    {
      id: "crispy_fries",
      name: "Sel de Guérande",
      description: "Le clic rapporte 2× plus",
      cost: 50,
      bought: false,
      type: "click",
      multiplier: 2
    },
    {
      id: "mayo_bucket",
      name: "Fût de mayo géant",
      description: "Les distributeurs sont 2× plus efficaces",
      cost: 200,
      bought: false,
      type: "building",
      targetId: "sauce_dispenser",
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
      incomePerSec: 1
    },
    {
      id: "potato_cutter",
      name: "Coupe-frites pro",
      count: 0,
      baseCost: 100,
      costMultiplier: 1.15,
      incomePerSec: 5
    }
  ]
};

let state = loadGame() || defaultState;

// --- 2. CALCULS MÉTIER ---

// Calcule la puissance de clic avec les upgrades
function getClickPower() {
  let power = state.baseClickPower;
  state.upgrades.forEach(u => {
    if (u.bought && u.type === "click") {
      power *= u.multiplier;
    }
  });
  return power;
}

// Calcule le revenu d'un bâtiment spécifique avec ses upgrades
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
  }
}

function handleClick() {
  state.money += getClickPower();
}

// --- 3. BOUCLE DE JEU ---
function gameLoop() {
  const now = Date.now();
  const dt = (now - state.lastTick) / 1000;
  state.lastTick = now;

  state.money += getIncomePerSecond() * dt;

  render();
  requestAnimationFrame(gameLoop);
}

// --- 4. SAUVEGARDE & PERSISTANCE ---
function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved);
    const offlineSeconds = (Date.now() - (parsed.lastTick || Date.now())) / 1000;
    
    // Calcul hors-ligne avec multiplicateurs
    let incomeRate = 0;
    parsed.producers.forEach(p => {
      let unitIncome = p.incomePerSec;
      parsed.upgrades?.forEach(u => {
        if (u.bought && u.type === "building" && u.targetId === p.id) {
          unitIncome *= u.multiplier;
        }
      });
      incomeRate += p.count * unitIncome;
    });

    parsed.money += incomeRate * offlineSeconds;
    parsed.lastTick = Date.now();
    return parsed;
  } catch (e) {
    console.error("Erreur de sauvegarde :", e);
    return null;
  }
}

setInterval(saveGame, 5000);

// --- 5. INTERFACE UTILISATEUR ---
const moneyDisplay = document.getElementById("money-display");
const cpsDisplay = document.getElementById("cps-display");
const serveButton = document.getElementById("serve-btn");
const producersList = document.getElementById("producers-list");
const shopUpgradesList = document.getElementById("shop-upgrades-list");

function renderUpgrades() {
  shopUpgradesList.innerHTML = "";

  state.upgrades.forEach(u => {
    // Si déjà acheté, on peut masquer ou marquer comme possédé
    if (u.bought) return;

    const card = document.createElement("div");
    card.className = "upgrade-card";
    card.id = `upgrade-${u.id}`;

    card.innerHTML = `
      <div>
        <strong>${u.name}</strong>
        <p class="upgrade-desc">${u.description}</p>
      </div>
      <button class="buy-upgrade-btn" id="btn-up-${u.id}">
        ${u.cost} €
      </button>
    `;

    card.querySelector("button").addEventListener("click", () => buyUpgrade(u.id));
    shopUpgradesList.appendChild(card);
  });
}

function createProducerCards() {
  producersList.innerHTML = "";

  state.producers.forEach(p => {
    const card = document.createElement("div");
    card.className = "producer-card";
    card.id = `card-${p.id}`;

    card.innerHTML = `
      <div class="producer-info">
        <strong>${p.name}</strong>
        <span class="producer-gain" id="gain-${p.id}">+${getProducerIncome(p)} €/s</span>
      </div>
      <button class="buy-btn" id="btn-${p.id}">
        Acheter (<span class="cost">${getCost(p)}</span> €)
        <span class="count">x${p.count}</span>
      </button>
    `;

    card.querySelector("button").addEventListener("click", () => buyProducer(p.id));
    producersList.appendChild(card);
  });
}

function render() {
moneyDisplay.textContent = formatNumber(state.money);
cpsDisplay.textContent = `+${formatNumber(getIncomePerSecond())} € / sec`;
  serveButton.textContent = `🍟 Servir (+${getClickPower()} €)`;

  // Mise à jour de l'état des générateurs
  state.producers.forEach(p => {
    const cost = getCost(p);
    const card = document.getElementById(`card-${p.id}`);
    const btn = document.getElementById(`btn-${p.id}`);
    const gainLabel = document.getElementById(`gain-${p.id}`);

    if (card && btn) {
      card.querySelector(".cost").textContent = cost;
      card.querySelector(".count").textContent = `x${p.count}`;
      gainLabel.textContent = `+${getProducerIncome(p)} €/s`;
      btn.disabled = state.money < cost;
    }
  });

  // Mise à jour de l'accessibilité des boutons d'upgrades
  state.upgrades.forEach(u => {
    const btn = document.getElementById(`btn-up-${u.id}`);
    if (btn) {
      btn.disabled = state.money < u.cost;
    }
  });
}

// --- INITIALISATION ---
serveButton.addEventListener("click", handleClick);
createProducerCards();
renderUpgrades();
state.lastTick = Date.now();
requestAnimationFrame(gameLoop);

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

  // Affiche 2 décimales propres : ex. 1.25 M
  return (num / item.value).toFixed(2).replace(".", ",") + item.symbol;
}