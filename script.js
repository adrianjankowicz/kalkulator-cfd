async function getPrice(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
    url
  )}`;
  const res = await fetch(proxyUrl);
  const text = await res.json();
  const data = JSON.parse(text.contents);
  const closePrices =
    data.chart.result[0].indicators.quote[0].close.filter(Boolean);
  return closePrices[closePrices.length - 1];
}

async function getUsdPlnRate() {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/USDPLN=X?interval=1d&range=1d";
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
    url
  )}`;
  const res = await fetch(proxyUrl);
  const text = await res.json();
  const data = JSON.parse(text.contents);
  const closePrices =
    data.chart.result[0].indicators.quote[0].close.filter(Boolean);
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
  const entryPrice = document.getElementById("entryPrice");
  const exitPrice = document.getElementById("exitPrice");
  entryPrice.value = "";
  exitPrice.value = "";

  if (defaultLeverage[selectedSymbol]) {
    leverageInput.value = defaultLeverage[selectedSymbol];
  } else {
    leverageInput.value = 10;
  }
});

document.getElementById("calculateBtn").addEventListener("click", calculate);

async function calculate() {
  const symbol = document.getElementById("symbol").value;
  const volume = parseFloat(document.getElementById("volume").value);
  const leverage = parseFloat(document.getElementById("leverage").value);
  // let fee = parseFloat(document.getElementById("fee").value);
  let fee = 1;
  const positionType = document.getElementById("positionType").value;
  const output = document.getElementById("output");
  let entryPrice = parseFloat(document.getElementById("entryPrice").value);
  let exitPriceManual = parseFloat(document.getElementById("exitPrice").value);

  output.innerHTML = `<p><strong>Obliczanie...</strong> Proszę czekać, trwa pobieranie danych.</p>`;

  if (isNaN(volume) || isNaN(leverage) || !entryPrice) {
    output.innerHTML = `<p style="color:red;"><strong>Błąd:</strong> Proszę uzupełnić wszystkie pola.</p>`;
    return;
  }

  // if (isNaN(fee) || fee === 0) {
  //   fee = 1;
  // }

  try {
    let rate = 1;
    if (symbol !== "USDPLN=X" && symbol !== "EURPLN=X") {
      rate = await getUsdPlnRate();
    }

    if (!entryPrice) {
      entryPrice = await getPrice(symbol);
    }

    const exitPrice = !exitPriceManual
      ? await getPrice(symbol)
      : exitPriceManual;

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

    const nominalUSD = entryPrice * multiplier * volume;
    let grossProfitUSD = 0;

    if (positionType === "long") {
      grossProfitUSD = (exitPrice - entryPrice) * multiplier * volume;
    } else {
      grossProfitUSD = (entryPrice - exitPrice) * multiplier * volume;
    }

    const nominalPLN = nominalUSD * rate;
    const grossProfitPLN = grossProfitUSD * rate;
    const investedCapitalPLN = nominalPLN / leverage;
    const totalFeePLN = investedCapitalPLN * (fee / 100) * 2;
    const netProfitPLN = grossProfitPLN - totalFeePLN;
    output.innerHTML = `
      <p><strong>Typ pozycji:</strong> ${
        positionType === "long" ? "Kupno (Long)" : "Sprzedaż (Short)"
      }</p>
      <p><strong>Cena wejścia:</strong> ${entryPrice.toFixed(2)} USD</p>
      <p><strong>Cena wyjścia:</strong> ${exitPrice.toFixed(2)} USD</p>
      <p><strong>Kurs USD/PLN:</strong> ${rate.toFixed(4)}</p>
      <p><strong>Ilość kontraktów:</strong> ${volume}</p>
  <p id="${
    grossProfitPLN >= 0 ? "green" : "red"
  }"><strong>Zysk: ${grossProfitPLN.toFixed(2)} PLN</strong></p>
    `;
  } catch (error) {
    output.innerHTML = `<p style="color:red;"><strong>Błąd:</strong> Nie udało się pobrać danych. Sprawdź połączenie lub spróbuj ponownie później.</p>`;
    console.error(error);
  }
}
