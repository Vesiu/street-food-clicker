// --- 1. LE CERVEAU (Modèle de données) ---
const state = {
  money: 0,
  clickPower: 1,
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

// --- 2. CALCULS MÉTIER ---

// Calcule le prix actuel d'un équipement : base * 1.15^quantité
function getCost(producer) {
  return Math.floor(producer.baseCost * Math.pow(producer.costMultiplier, producer.count));
}

// Calcule les gains totaux par seconde
function getIncomePerSecond() {
  return state.producers.reduce((total, p) => total + (p.count * p.incomePerSec), 0);
}

// Action d'achat
function buyProducer(producerId) {
  const producer = state.producers.find(p => p.id === producerId);
  if (!producer) return;

  const cost = getCost(producer);
  if (state.money >= cost) {
    state.money -= cost;
    producer.count += 1;
    render();
  }
}

// Action du clic principal
function handleClick() {
  state.money += state.clickPower;
  render();
}

// Boucle de jeu : s'exécute chaque seconde (1000 ms)
function gameLoop() {
  state.money += getIncomePerSecond();
  render();
}

// --- 3. LES YEUX (Affichage dynamique) ---
const moneyDisplay = document.getElementById("money-display");
const cpsDisplay = document.getElementById("cps-display");
const serveButton = document.getElementById("serve-btn");
const producersList = document.getElementById("producers-list");

// Dessine les boutons d'achats une seule fois au chargement
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
        <span class="count">${producer.count}</span>
      </button>
    `;

    // Écouteur sur le bouton d'achat
    card.querySelector("button").addEventListener("click", () => buyProducer(producer.id));

    producersList.appendChild(card);
  });
}

// Met à jour les valeurs à l'écran
function render() {
  moneyDisplay.textContent = state.money;
  cpsDisplay.textContent = `+${getIncomePerSecond()} € / sec`;

  // Met à jour chaque bouton (prix, quantité et activation)
  state.producers.forEach(producer => {
    const cost = getCost(producer);
    const card = document.getElementById(`card-${producer.id}`);
    const btn = document.getElementById(`btn-${producer.id}`);

    if (card && btn) {
      card.querySelector(".cost").textContent = cost;
      card.querySelector(".count").textContent = `x${producer.count}`;
      btn.disabled = state.money < cost; // Grisé si pas assez de sous
    }
  });
}

// --- 4. INITIALISATION ---
serveButton.addEventListener("click", handleClick);
createProducerCards();
render();

// Démarre la production passive (1 fois par seconde)
setInterval(gameLoop, 1000);