// --- 1. MODÈLE DE DONNÉES (Le Cerveau) ---
const STORAGE_KEY = "street_food_save_v1";

const defaultState = {
  money: 0,
  clickPower: 1,
  lastTick: Date.now(),
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

// Charge la sauvegarde existante ou prend l'état par défaut
let state = loadGame() || defaultState;

// --- 2. CALCULS MÉTIER ---

function getCost(producer) {
  return Math.floor(producer.baseCost * Math.pow(producer.costMultiplier, producer.count));
}

function getIncomePerSecond() {
  return state.producers.reduce((total, p) => total + (p.count * p.incomePerSec), 0);
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

function handleClick() {
  state.money += state.clickPower;
}

// --- 3. BOUCLE DE JEU (Delta-time fluide) ---
function gameLoop() {
  const now = Date.now();
  // Temps écoulé depuis la dernière frame, converti en secondes
  const dt = (now - state.lastTick) / 1000;
  state.lastTick = now;

  // Gain continu basé sur le temps réel écoulé
  state.money += getIncomePerSecond() * dt;

  render();
  requestAnimationFrame(gameLoop);
}

// --- 4. SAUVEGARDE & CHARGEMENT (localStorage) ---
function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved);
    // Gestion du gain hors-ligne : calcule le temps passé hors du jeu
    const offlineSeconds = (Date.now() - (parsed.lastTick || Date.now())) / 1000;
    
    // Recalcule le revenu avec les données chargées
    const offlineIncomeRate = parsed.producers.reduce((sum, p) => sum + (p.count * p.incomePerSec), 0);
    parsed.money += offlineIncomeRate * offlineSeconds;
    parsed.lastTick = Date.now();
    return parsed;
  } catch (e) {
    console.error("Erreur au chargement de la sauvegarde :", e);
    return null;
  }
}

// Sauvegarde automatique toutes les 5 secondes
setInterval(saveGame, 5000);

// --- 5. INTERFACE UTILISATEUR (Les Yeux) ---
const moneyDisplay = document.getElementById("money-display");
const cpsDisplay = document.getElementById("cps-display");
const serveButton = document.getElementById("serve-btn");
const producersList = document.getElementById("producers-list");

function createProducerCards() {
  producersList.innerHTML = "";

  state.producers.forEach(producer => {
    const card = document.createElement("div");
    card.className = "producer-card";
    card.id = `card-${producer.id}`;

    card.innerHTML = `
      <div class="producer-info">
        <strong>${producer.name}</strong>
        <span class="producer-gain">+${producer.incomePerSec} €/s</span>
      </div>
      <button class="buy-btn" id="btn-${producer.id}">
        Acheter (<span class="cost">${getCost(producer)}</span> €)
        <span class="count">x${producer.count}</span>
      </button>
    `;

    card.querySelector("button").addEventListener("click", () => buyProducer(producer.id));
    producersList.appendChild(card);
  });
}

function render() {
  // Affiche l'entier pour garder un affichage propre
  moneyDisplay.textContent = Math.floor(state.money);
  cpsDisplay.textContent = `+${getIncomePerSecond()} € / sec`;

  state.producers.forEach(producer => {
    const cost = getCost(producer);
    const card = document.getElementById(`card-${producer.id}`);
    const btn = document.getElementById(`btn-${producer.id}`);

    if (card && btn) {
      card.querySelector(".cost").textContent = cost;
      card.querySelector(".count").textContent = `x${producer.count}`;
      btn.disabled = state.money < cost;
    }
  });
}

// --- INITIALISATION ---
serveButton.addEventListener("click", handleClick);
createProducerCards();
state.lastTick = Date.now();
requestAnimationFrame(gameLoop);