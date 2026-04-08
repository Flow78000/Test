const fs = require("fs");
const html = fs.readFileSync("D:/cboe-ticker-analyzer/index.html", "utf8");
const rawMatch = html.match(/const RAW=`([\s\S]*?)`/);
const lines = rawMatch[1].split("\n").filter(l => l.includes("|"));

const CRYPTO_TOKENS = ["AAVE","ADA","ALGO","ATOM","AVAX","BAT","BCH","BTC","COMP","CRV","DOGE","DOT","ETC","ETH","FIL","GRT","LINK","LTC","MANA","MATIC","MKR","NEAR","SAND","SHIB","SOL","SUSHI","UMA","UNI","XLM","XRP","XTZ","YFI","ZEC","ZRX"];
const CRYPTO_KW = ["Bitcoin","Ethereum","Crypto","Blockchain","DeFi","Solana","Cardano","Polkadot","Chainlink","Dogecoin","Litecoin","Stellar","Cosmos","Algorand","Filecoin","Uniswap","Aave","Avalanche"];

function categorize(t, d) {
  t = t.toUpperCase(); d = d.toUpperCase();
  const cats = [];
  const isCrypto = CRYPTO_TOKENS.some(c => t.startsWith(c)) || CRYPTO_KW.some(k => d.includes(k.toUpperCase())) || /CM[A-Z]+USD|CM[A-Z]+EUR|CM[A-Z]+BTC/i.test(t);
  if (isCrypto) cats.push("Crypto");
  if (/VIX|VVIX|SKEW|GAMMA|SPOTVOL|LONGVOL|SHORTVOL|LOVOL|DLVIX|DSVIX|DSVIER|DSPX|LTV|SMILE|RXM|SVRPO|BITVX/i.test(t) || /VOLATILITY|VIX|SKEW|DISPERSION|CORRELATION|TWAP|VWAP/i.test(d) || /^UZ[A-Z]/i.test(t) || /^TW[A-Z]V\d/.test(t)) cats.push("Volatility");
  if (/BUYWRITE|PUTWRITE|COVERED.*COMBO|COLLAR|IRON.*CONDOR|IRON.*BUTTER|PUT.*PROTECTION|RISK.*REVERSAL/i.test(d)) cats.push("BuyWrite/PutWrite");
  if (/BUFFER|PROTECT|STRUCTURED OUTCOME|ENHANCED GROWTH|BUFFERED/i.test(d)) cats.push("Buffer/Protection");
  if (/\bETF\b|INAV|INTRADAY INDICATIVE VALUE|PROSHARES|ISHARES|ALLIANZIM|TRUESHARES|PACER SWAN|GOLDMAN SACHS.*ETF|GLOBAL X.*ETF|ALPHA VEE/i.test(d) && !cats.includes("Buffer/Protection")) cats.push("ETF/INAV");
  if (/EUROPE|EUROZONE|AUSTRIA|BELGIUM|SWITZERLAND|GERMANY|DENMARK|SPAIN|FINLAND|FRANCE|IRELAND|ITALY|NETHERLANDS|NORWAY|NORDIC|PORTUGAL|SWEDEN|UK\s|UNITED KINGDOM|FTSE/i.test(d) || /^B(AT20|BE20|CH20|DE40|DK25|EP50|ES35|EZ50|FI25|FR40|IE20|IT40|NL|NO25|PT20|SE30|UK)/i.test(t)) cats.push("Europe");
  if (/SECTOR|SELECT SECTOR|MATERIALS|ENERGY|FINANCIAL|TECHNOLOGY|HEALTH CARE|CONSUMER|UTILITIES|INDUSTRIALS|TELECOM|REAL ESTATE|SEMI/i.test(d) || /^SIX[A-Z]/i.test(t)) cats.push("Sector");
  if (/T-BILL|NOTE RATE|BOND RATE|TREASURY|BOX RATE|INTEREST RATE/i.test(d) || /^(IRX|FVX|TNX|TYX|BOX)/i.test(t)) cats.push("Rates");
  if (/OPTION|SETTLEMENT|SOQ|OTM|DELTA|PUT SPREAD|RANGE OPTION|BINARY/i.test(d) && cats.length === 0) cats.push("Options");
  if (/\bINDEX\b|S&P.*500|RUSSELL|NASDAQ|DJIA|DOW JONES/i.test(d) && cats.length === 0) cats.push("Index");
  if (/MORNINGSTAR/i.test(d) || /MSDX/i.test(t)) cats.push("Morningstar");
  if (cats.length === 0) {
    if (/IV_CGI$|INAV/i.test(t)) cats.push("ETF/INAV");
    else if (/INDEX/i.test(d)) cats.push("Index");
    else cats.push("Other");
  }
  return [...new Set(cats)];
}

function getSubcat(t, d, cats) {
  if (cats.includes("Crypto") && /RealPrice/i.test(d)) return "Cboe RealPrice";
  if (cats.includes("Crypto") && /CM\s/i.test(d)) return "CM Reference Price";
  if (cats.includes("Crypto") && /Bitwise/i.test(d)) return "Bitwise Crypto";
  if (cats.includes("Crypto") && /Proshares|ProShares/i.test(d)) return "ProShares Crypto ETFs";
  if (cats.includes("Crypto") && /Invesco/i.test(d)) return "Invesco Crypto ETFs";
  if (cats.includes("BuyWrite/PutWrite") && /BuyWrite/i.test(d)) return "Cboe BuyWrite";
  if (cats.includes("BuyWrite/PutWrite") && /PutWrite/i.test(d)) return "Cboe PutWrite";
  if (cats.includes("BuyWrite/PutWrite") && /Collar|Condor|Butterfly|Combo|Protection/i.test(d)) return "Cboe Options Strategies";
  if (cats.includes("Buffer/Protection") && /Enhanced Growth/i.test(d)) return "S&P 500 Enhanced Growth";
  if (cats.includes("Buffer/Protection") && /Buffer Protect|Buffered/i.test(d)) return "S&P 500 Buffer Protect";
  if (cats.includes("Buffer/Protection") && /Russell.*Buffer/i.test(d)) return "Russell 2000 Buffer";
  if (cats.includes("Buffer/Protection") && /Gold.*Buffer/i.test(d)) return "Gold Buffer Protect";
  if (cats.includes("Buffer/Protection") && /Structured Outcome/i.test(d)) return "TrueShares Structured";
  if (cats.includes("Buffer/Protection") && /AllianzIM/i.test(d)) return "AllianzIM Buffer";
  if (cats.includes("Buffer/Protection") && /Pacer Swan/i.test(d)) return "Pacer Swan SOS";
  if (cats.includes("Buffer/Protection") && /iShares.*Buffer/i.test(d)) return "iShares Buffer";
  if (cats.includes("Europe") && /UK\s|United Kingdom|Brexit/i.test(d)) return "Cboe UK Indices";
  if (cats.includes("Europe") && /Eurozone/i.test(d)) return "Morningstar Eurozone";
  if (cats.includes("Europe") && /Europe\s/i.test(d)) return "Cboe Europe Indices";
  if (cats.includes("Europe") && /Germany|France|Italy|Spain|Netherlands|Belgium|Austria|Switzerland|Denmark|Finland|Ireland|Norway|Nordic|Portugal|Sweden/i.test(d)) return "Cboe Country Indices";
  if (cats.includes("Volatility") && /VIX\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(d)) return "VIX Futures Marks";
  if (cats.includes("Volatility") && /TWAP|VWAP|TAS/i.test(d)) return "VIX TWAP/VWAP";
  if (cats.includes("Volatility") && /VIX/i.test(d)) return "VIX Family";
  if (cats.includes("Volatility")) return "Volatility Indices";
  if (cats.includes("ETF/INAV") && /Proshares|ProShares/i.test(d)) return "ProShares ETFs";
  if (cats.includes("ETF/INAV") && /iShares/i.test(d)) return "iShares ETFs";
  if (cats.includes("ETF/INAV") && /Global X/i.test(d)) return "Global X ETFs";
  if (cats.includes("ETF/INAV") && /Goldman Sachs/i.test(d)) return "Goldman Sachs ETFs";
  if (cats.includes("ETF/INAV") && /WEBS DEFINED/i.test(d)) return "WEBS Defined Vol ETFs";
  if (cats.includes("ETF/INAV") && /AllianzIM/i.test(d)) return "AllianzIM ETFs";
  if (cats.includes("ETF/INAV") && /Alpha Vee/i.test(d)) return "Alpha Vee Indices";
  if (cats.includes("ETF/INAV")) return "Other ETFs";
  if (cats.includes("Sector") && /Select Sector/i.test(d)) return "S&P Select Sectors";
  if (cats.includes("Sector")) return "Sector Indices";
  if (cats.includes("Rates") && /Box Rate/i.test(d)) return "Box Rates (SPX Options)";
  if (cats.includes("Rates")) return "Treasury Rates";
  if (cats.includes("Index") && /S&P|SPX/i.test(d)) return "S&P Indices";
  if (cats.includes("Index") && /Russell/i.test(d)) return "Russell Indices";
  if (cats.includes("Index") && /DJIA|Dow/i.test(d)) return "Dow Jones Indices";
  if (cats.includes("Index") && /Nasdaq/i.test(d)) return "Nasdaq Indices";
  if (cats.includes("Index")) return "Other Indices";
  return cats[0] || "Other";
}

function getExplanation(t, d, cats) {
  if (cats.includes("Crypto") && /RealPrice/i.test(d)) {
    const m = d.match(/([\d,]+K?)\s+(\w[\w\s]*?)\s*\/\s*US Dollar/i);
    const asset = m ? m[2].trim() : "crypto-actif";
    const qty = m ? m[1] : "";
    return "Indice RealPrice du Cboe suivant le prix de reference de " + qty + " unite(s) de " + asset + " par rapport au dollar americain. Les indices RealPrice fournissent des prix de reference transparents et fiables pour les actifs numeriques, utilisables par les gestionnaires de fonds et les plateformes de trading institutionnel.";
  }
  if (cats.includes("Crypto") && /CM\s/i.test(d)) return "Prix de reference CM (CoinMetrics) pour une paire crypto/fiat. Sert de prix de reference institutionnel pour l'evaluation de portefeuilles crypto, le reglement de contrats derives et le calcul de NAV de fonds.";
  if (cats.includes("Crypto") && /Bitwise/i.test(d)) return "Indice Bitwise Asset Management pour suivre un panier diversifie de crypto-actifs. Reference pour les investisseurs institutionnels souhaitant s'exposer au marche crypto de maniere structuree.";
  if (/BuyWrite/i.test(d)) return "Strategie BuyWrite (covered call) : detention de l'actif + vente d'un call. Genere un revenu supplementaire via la prime, en echange d'un plafonnement du potentiel de hausse. Prisee pour un rendement regulier avec volatilite reduite.";
  if (/PutWrite/i.test(d)) return "Strategie PutWrite : vente d'options de vente (put) sur un indice. Le vendeur encaisse la prime et s'engage a acheter si le prix baisse sous le strike. Genere des revenus reguliers, surperforme en marche neutre ou legerement haussier.";
  if (/Iron Butterfly/i.test(d)) return "Strategie Iron Butterfly : bull put spread + bear call spread avec meme strike central. Profite d'un marche stable. Profit maximum si le sous-jacent cloture exactement au strike central. Vente de volatilite avec risque et gain plafonnes.";
  if (/Iron Condor/i.test(d)) return "Strategie Iron Condor : bull put spread + bear call spread avec strikes differents. Profite d'un marche range. Profit maximum si le sous-jacent reste entre les deux strikes centraux. Tres utilisee pour vendre la volatilite implicite.";
  if (/Collar/i.test(d)) return "Strategie Collar : detention de l'actif + achat d'un put protecteur + vente d'un call. Cree une fourchette de prix avec perte limitee et gain plafonne. Couverture populaire chez les institutionnels.";
  if (/Covered Combo/i.test(d)) return "Strategie Covered Combo : covered call + vente de put cash-secured. Double source de revenus premium. Risque accru si le marche baisse fortement.";
  if (/Buffer Protect|Buffered/i.test(d)) return "Indice Buffer Protect : protection contre les premieres pertes (ex: 10% de buffer) avec gains plafonnes. Ideal pour participer a la hausse avec un filet de securite.";
  if (/Enhanced Growth/i.test(d)) return "Indice Enhanced Growth : levier ~2x a la hausse via options, avec buffer de protection et plafonnement des gains. Chaque serie mensuelle a sa propre date de renouvellement.";
  if (/Structured Outcome/i.test(d)) return "ETF TrueShares a resultat structure : options sur S&P 500 pour offrir des rendements predefinis avec protection partielle contre les baisses.";
  if (cats.includes("Volatility") && /VIX/i.test(t)) return "Le VIX mesure la volatilite implicite attendue a 30 jours du S&P 500. Surnomme l'indice de la peur, un VIX eleve signale une forte incertitude. Cette famille couvre differents horizons temporels et actifs sous-jacents.";
  if (cats.includes("Volatility") && /SKEW/i.test(t)) return "L'indice SKEW mesure l'asymetrie de la distribution des rendements du S&P 500. Un SKEW eleve indique un risque accru d'evenement extreme a la baisse (tail risk). Capture specifiquement la crainte de crashs.";
  if (cats.includes("Volatility")) return "Indice de volatilite servant de barometre du sentiment de marche, sous-jacent pour produits derives, et outil de couverture. Niveau eleve = forte incertitude, niveau bas = marche calme.";
  if (cats.includes("Europe")) return "Indice boursier europeen du Cboe. Versions N (Net, dividendes reinvestis) et P (Price, prix uniquement). Reference pour ETF, produits structures et analyse des marches europeens.";
  if (cats.includes("Sector") && /Select Sector/i.test(d)) return "Indice sectoriel S&P Select Sector representant un secteur du S&P 500. Les versions Settlement sont les valeurs de reglement pour options et derives. Utilise pour le trading sectoriel et la rotation.";
  if (cats.includes("Sector")) return "Indice sectoriel suivant un segment specifique du marche. Utilise pour mesurer la performance sectorielle, construire des strategies de rotation ou servir de sous-jacent a des derives.";
  if (cats.includes("Rates") && /Box Rate/i.test(d)) return "Box Rate sur options SPX : le box spread synthetise un pret/emprunt a taux fixe. Le taux implicite reflete les attentes du marche en matiere de taux d'interet.";
  if (cats.includes("Rates")) return "Taux d'interet de reference du marche americain (bons du Tresor). References fondamentales pour pricing des obligations, evaluation des credits, calcul des taux hypothecaires.";
  if (cats.includes("ETF/INAV") && /Proshares|ProShares/i.test(d)) return "INAV d'un ETF ProShares (levier Ultra 2x/3x, inverse Short -1x/-2x, ou thematique). L'INAV est la valeur nette estimee par part, servant de reference pour le trading et l'arbitrage.";
  if (cats.includes("ETF/INAV")) return "Valeur indicative intraday (INAV) d'un ETF. Estimation en temps reel de la valeur liquidative par part. Aide a evaluer si l'ETF se negocie a prime ou decote.";
  if (cats.includes("Options")) return "Valeur de reglement ou indice lie aux options. Utilisee lors du reglement des contrats d'options a expiration pour determiner le profit ou la perte finale.";
  if (cats.includes("Index") && /S&P 500|SPX/i.test(d)) return "Indice lie au S&P 500, le principal indice boursier americain (500 plus grandes caps). Represente ~80% de la capitalisation du marche americain.";
  if (cats.includes("Index") && /Russell/i.test(d)) return "Indice de la famille Russell. Le Russell 2000 couvre 2000 petites caps, le Russell 1000 les grandes caps. Tres suivi pour la sante economique des PME americaines.";
  if (cats.includes("Index") && /DJIA|Dow/i.test(d)) return "Indice lie au Dow Jones Industrial Average, le plus ancien indice boursier americain. 30 grandes entreprises industrielles, pondere par les prix.";
  if (cats.includes("Index")) return "Indice de marche servant de reference (benchmark) pour un segment specifique, de sous-jacent pour des derives, ou d'outil d'analyse pour les investisseurs.";
  return "Ticker CBOE servant de reference pour un segment du marche financier. Utilise comme sous-jacent pour des derives, benchmark de performance, ou outil d'analyse institutionnel.";
}

const seen = new Set();
const tickers = [];
for (const line of lines) {
  const [sym, desc] = line.split("|");
  const key = sym.trim().replace(/_CGI$/, "");
  if (seen.has(key) || !desc) continue;
  seen.add(key);
  const cats = categorize(sym.trim(), desc.trim());
  const subcat = getSubcat(sym.trim(), desc.trim(), cats);
  const explanation = getExplanation(sym.trim(), desc.trim(), cats);
  tickers.push({ sym: key, desc: desc.trim(), cats, subcat, explanation });
}

fs.writeFileSync("D:/flo-w/src/data/cboe-tickers.json", JSON.stringify(tickers));
console.log("Done:", tickers.length, "tickers with subcats + explanations");
