async function getPrice(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  const text = await res.json();
  const data = JSON.parse(text.contents);
  const closePrices = data.chart.result[0].indicators.quote[0].close.filter(Boolean);
  return closePrices[closePrices.length - 1];
}

async function getUsdPlnRate() {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/USDPLN=X?interval=1d&range=1d";
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  const text = await res.json();
  const data = JSON.parse(text.contents);
  const closePrices = data.chart.result[0].indicators.quote[0].close.filter(Boolean);
  return closePrices[closePrices.length - 1];
}

const defaultLeverage = {
  "CC=F": 10,
  AAPL: 5,
  TSLA: 5,
  "BTC-USD": 2,
  "DE40.DE": 20,
  "^NDX": 20,
  "NG=F": 10,
  "GC=F": 20,
  "SI=F": 10,
  "CL=F": 10,
  "KC=F": 10,
  "USDPLN=X": 20,
  "EURPLN=X": 20,
};

document.getElementById("symbol").addEventListener("change", function () {
  const selectedSymbol = this.value;
  const leverageInput = document.getElementById("leverage");
  const exitPrice = document.getElementById("exitPrice");

  exitPrice.value = "";
  leverageInput.value = defaultLeverage[selectedSymbol] || 10;
  positionsContainer.innerHTML = `
    <div class="position-entry">
      <input type="number" step="0.01" value="0.01" placeholder="Wolumen" class="volume-entry" />
    <input type="number" step="0.0001" placeholder="Cena wejścia" class="price-entry" />
      <button id="addPosition" type="button">+</button>
    </div>
  `;
});

document.getElementById("addPosition").addEventListener("click", () => {
  const container = document.getElementById("positionsContainer");
  const div = document.createElement("div");
  div.classList.add("position-entry");
  div.innerHTML = `
    <input type="number" step="0.01" value="0.01" placeholder="Wolumen" class="volume-entry" />
    <input type="number" step="0.0001" placeholder="Cena wejścia" class="price-entry" />
  `;
  container.appendChild(div);
});

document.getElementById("calculateBtn").addEventListener("click", calculate);

async function calculate() {
  const symbol = document.getElementById("symbol").value;
  const leverage = parseFloat(document.getElementById("leverage").value);
  let fee = 1;
  const positionType = document.getElementById("positionType").value;
  const output = document.getElementById("output");
  const exitPriceManual = parseFloat(document.getElementById("exitPrice").value);

  const volumeInputs = document.querySelectorAll(".volume-entry");
  const priceInputs = document.querySelectorAll(".price-entry");

  let totalVolume = 0;
  let weightedEntryPrice = 0;

  for (let i = 0; i < volumeInputs.length; i++) {
    const vol = parseFloat(volumeInputs[i].value);
    const price = parseFloat(priceInputs[i].value);
    if (isNaN(vol) || isNaN(price)) {
      output.innerHTML = `<p style="color:red;"><strong>Błąd:</strong> Wszystkie pola muszą być uzupełnione.</p>`;
      return;
    }
    totalVolume += vol;
    weightedEntryPrice += vol * price;
  }

  if (totalVolume === 0) {
    output.innerHTML = `<p style="color:red;"><strong>Błąd:</strong> Wolumen nie może być zerowy.</p>`;
    return;
  }

  const entryPrice = weightedEntryPrice / totalVolume;

  output.innerHTML = `<p><strong>Obliczanie...</strong> Proszę czekać, trwa pobieranie danych.</p>`;

  try {
    let rate = 1;
    if (symbol !== "USDPLN=X" && symbol !== "EURPLN=X") {
      rate = await getUsdPlnRate();
    }

    const exitPrice = !exitPriceManual ? await getPrice(symbol) : exitPriceManual;

    const multipliers = {
      "CC=F": 10,
      AAPL: 1,
      TSLA: 1,
      "BTC-USD": 1,
      "DE40.DE": 25,
      "^NDX": 20,
      "NG=F": 30000,
      "GC=F": 100,
      "SI=F": 5000,
      "CL=F": 1000,
      "KC=F": 37500,
      "USDPLN=X": 100000,
      "EURPLN=X": 100000,
    };

    const multiplier = multipliers[symbol] || 1;

    const nominalUSD = entryPrice * multiplier * totalVolume;
    let grossProfitUSD = 0;

    if (positionType === "long") {
      grossProfitUSD = (exitPrice - entryPrice) * multiplier * totalVolume;
    } else {
      grossProfitUSD = (entryPrice - exitPrice) * multiplier * totalVolume;
    }

    const nominalPLN = nominalUSD * rate;
    const grossProfitPLN = grossProfitUSD * rate;
    const investedCapitalPLN = nominalPLN / leverage;
    const totalFeePLN = investedCapitalPLN * (fee / 100) * 2;
    const netProfitPLN = grossProfitPLN - totalFeePLN;

    output.innerHTML = `
      <p><strong>Typ pozycji:</strong> ${positionType === "long" ? "Kupno (Long)" : "Sprzedaż (Short)"}</p>
      <p><strong>Średnia cena wejścia:</strong> ${entryPrice.toFixed(4)} USD</p>
      <p><strong>Cena wyjścia:</strong> ${exitPrice.toFixed(4)} USD</p>
      <p><strong>Kurs USD/PLN:</strong> ${rate.toFixed(4)}</p>
      <p><strong>Suma kontraktów:</strong> ${totalVolume}</p>
      <p id="${grossProfitPLN >= 0 ? "green" : "red"}"><strong>Zysk: ${grossProfitPLN.toFixed(2)} PLN</strong></p>
    `;
  } catch (error) {
    output.innerHTML = `<p style="color:red;"><strong>Błąd:</strong> Nie udało się pobrać danych. Spróbuj ponownie później.</p>`;
    console.error(error);
  }
}
