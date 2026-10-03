// --- 1. LE CERVEAU (Modèle de données) ---
const state = {
  money: 0,
  clickPower: 1 // Rapporte 1 € par clic au début
};

// --- 2. SÉLECTION DES ÉLÉMENTS DE LA VUE ---
const moneyDisplay = document.getElementById("money-display");
const serveButton = document.getElementById("serve-btn");

// --- 3. LES YEUX (Mise à jour visuelle) ---
function render() {
  moneyDisplay.textContent = state.money;
}

// --- 4. LA LOGIQUE MÉTIER ---
function handleClick() {
  state.money += state.clickPower;
  render();
}

// --- 5. ÉCOUTEURS D'ÉVÉNEMENTS ---
serveButton.addEventListener("click", handleClick);

// Initialisation au chargement
render();