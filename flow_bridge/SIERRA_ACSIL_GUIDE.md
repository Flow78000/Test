# FLOW Signals — Modification Sierra Chart (ACSIL)

Ce document explique comment **modifier ton étude SVI existante** pour qu'elle
écrive le fichier `C:\SierraChart\Data\flow_signals.json` que le bridge Python
lit ensuite pour alimenter Flow.

**Objectif :** ajouter ~80 lignes de C++ à ton étude. Aucune nouvelle DLL,
aucune nouvelle étude à compiler — on enrichit celle qui existe déjà.

---

## 1. Fichier à modifier

Emplacement : `C:\SierraChart\ACS_Source\RangeDashboard_CustomStudy.cpp`
(ou le nom de ton étude SVI si différent).

---

## 2. Snippet à coller dans la fonction de l'étude

À ajouter **à la fin** de la fonction `scsf_RangeDashboard` (juste avant
l'accolade de fermeture finale `}`). Le code :

1. Détecte la dernière barre du jour (évite de réécrire à chaque tick)
2. Calcule les 16 niveaux à partir du RMC + Open
3. Écrit d'abord dans `flow_signals.tmp`, puis renomme en `flow_signals.json`
   (écriture atomique — évite les lectures partielles par le bridge)

```cpp
// ===== FLOW SIGNALS EXPORT =====================================================
// Écrit C:\SierraChart\Data\flow_signals.json pour le bridge Flow.
// Fréquence : à chaque nouvelle bougie ou tous les N ticks (selon perf voulue).

{
    // --- Paramètres de débit : écrit toutes les 30 secondes max ---
    static double s_lastWriteSecs = 0.0;
    const double nowSecs = sc.CurrentSystemDateTime.GetAsDouble() * 86400.0;
    const bool timeToWrite = (nowSecs - s_lastWriteSecs) >= 30.0;

    if (timeToWrite && sc.ArraySize > 0)
    {
        s_lastWriteSecs = nowSecs;

        // --- Récupérer les valeurs clés depuis tes Subgraphs ---
        const int lastIdx = sc.ArraySize - 1;
        const double rmc         = sc.Subgraph[0][lastIdx];   // RMC
        const double pctOfRmc    = sc.Subgraph[3][lastIdx];   // % du range
        const double currentPrice = sc.Close[lastIdx];
        const double openPrice   = sc.OpenOfPeriodForChartDateTime(sc.BaseDateTimeIn[lastIdx], TIME_PERIOD_LENGTH_UNIT_DAYS, 1);
        const double dayHigh     = sc.DailyHigh[lastIdx];
        const double dayLow      = sc.DailyLow[lastIdx];
        const double currentRange = dayHigh - dayLow;

        // --- Niveau SVI ---
        const char* sviLevel = "low";
        if (pctOfRmc >= 125.0)       sviLevel = "extreme";
        else if (pctOfRmc >= 75.0)   sviLevel = "normal";
        else                         sviLevel = "low";

        // --- Symbole du chart ---
        SCString symbolStr = sc.Symbol;
        // On peut nettoyer des suffixes comme "-CME" si besoin :
        // symbolStr = symbolStr.GetSubString(symbolStr.IndexOf('-'));

        // --- Timestamps ISO-8601 UTC ---
        SCDateTime nowDT = sc.CurrentSystemDateTime;
        int year, month, day, hour, min, sec;
        nowDT.GetDateTimeYMDHMS(year, month, day, hour, min, sec);
        SCString tsStr;
        tsStr.Format("%04d-%02d-%02dT%02d:%02d:%02dZ", year, month, day, hour, min, sec);

        int yy, mm, dd;
        nowDT.GetDateYMD(yy, mm, dd);
        SCString sessionDateStr;
        sessionDateStr.Format("%04d-%02d-%02d", yy, mm, dd);

        // --- Construire le JSON ---
        SCString json;
        json.Format("{\n");
        json += SCString().Format("  \"timestamp\": \"%s\",\n", tsStr.GetChars());
        json += SCString().Format("  \"session_date\": \"%s\",\n", sessionDateStr.GetChars());

        // SVI bloc
        json += "  \"svi\": {\n";
        json += SCString().Format("    \"%s\": { \"rmc\": %.4f, \"current_range\": %.4f, \"pct_of_rmc\": %.2f, \"level\": \"%s\" }\n",
            symbolStr.GetChars(), rmc, currentRange, pctOfRmc, sviLevel);
        json += "  },\n";

        // Range levels bloc
        json += "  \"range_levels\": {\n";
        json += SCString().Format("    \"%s\": {\n", symbolStr.GetChars());
        json += SCString().Format("      \"open\": %.4f,\n", openPrice);
        json += SCString().Format("      \"current_price\": %.4f,\n", currentPrice);
        json += SCString().Format("      \"rmc\": %.4f,\n", rmc);
        json += "      \"levels\": [\n";

        const int pcts[] = { 200, 175, 150, 125, 100, 75, 50, 25,
                            -25, -50, -75, -100, -125, -150, -175, -200 };
        for (int i = 0; i < 16; ++i)
        {
            const int p = pcts[i];
            const double price = openPrice + (rmc * p / 100.0);
            const char* side = (p > 0) ? "up" : "down";
            const char* comma = (i < 15) ? "," : "";
            json += SCString().Format("        { \"pct\": %d, \"price\": %.4f, \"side\": \"%s\" }%s\n",
                p, price, side, comma);
        }
        json += "      ]\n";
        json += "    }\n";
        json += "  },\n";

        // Heatmap bloc (1 asset = celui de ce chart)
        // Pour un vrai multi-actifs, utiliser une étude "aggregator" séparée (voir section 4).
        json += "  \"range_heatmap\": {\n";
        json += SCString().Format("    \"date\": \"%s\",\n", sessionDateStr.GetChars());
        json += "    \"assets\": [\n";
        // Détection basique de la famille — à ajuster selon tes symboles
        const char* family = "indices";
        const char* sym = symbolStr.GetChars();
        if (strstr(sym, "USD") || strstr(sym, "EUR") || strstr(sym, "GBP") || strstr(sym, "JPY"))
            family = "fx";
        else if (strstr(sym, "GC") || strstr(sym, "SI") || strstr(sym, "CL") || strstr(sym, "NG") || strstr(sym, "HG"))
            family = "commodities";
        else if (strstr(sym, "ZN") || strstr(sym, "ZB") || strstr(sym, "ZF") || strstr(sym, "ZT"))
            family = "rates";
        else if (strstr(sym, "ZC") || strstr(sym, "ZS") || strstr(sym, "ZW") || strstr(sym, "ZL") || strstr(sym, "ZM"))
            family = "agri";

        json += SCString().Format("      { \"symbol\": \"%s\", \"family\": \"%s\", \"pct_vs_rmc\": %.2f, \"range_pts\": %.4f, \"rmc\": %.4f }\n",
            sym, family, pctOfRmc, currentRange, rmc);
        json += "    ]\n";
        json += "  }\n";
        json += "}\n";

        // --- Écriture atomique : tmp puis rename ---
        const char* tmpPath   = "C:\\SierraChart\\Data\\flow_signals.tmp";
        const char* finalPath = "C:\\SierraChart\\Data\\flow_signals.json";

        FILE* f = fopen(tmpPath, "w");
        if (f != NULL)
        {
            fwrite(json.GetChars(), 1, json.GetLength(), f);
            fclose(f);
            // rename() est atomique sur Windows si destination existe
            remove(finalPath);
            rename(tmpPath, finalPath);
        }
    }
}
// ===== FIN FLOW SIGNALS EXPORT =================================================
```

---

## 3. Compilation de l'étude

1. Dans Sierra Chart : `Analysis → Build Custom Studies DLL`
2. Sélectionne le fichier `RangeDashboard_CustomStudy.cpp`
3. Clique **Build**
4. Si la compilation réussit : `Remote Build Successful`
5. Recharge l'étude : `Analysis → Studies → Replay/Reload Study`

En cas d'erreur, le log de build est dans `C:\SierraChart\Logs\`.

---

## 4. Passer en mode multi-actifs (V2)

Le code ci-dessus écrit les signaux pour **un seul chart**. Pour obtenir la
heatmap complète avec 30 actifs, deux approches :

### Option A — Étude sur chaque chart + fusion par le bridge
- Chaque chart écrit un fichier par ticker : `flow_signals_ES.json`,
  `flow_signals_NQ.json`, etc.
- On ajoute côté bridge Python une fusion qui combine tous les fichiers
  en un seul payload avant broadcast.

### Option B — Une étude "aggregator" dédiée
- Une étude attachée à un chart "maître" qui lit via `sc.GetChartSnapshot()`
  les données des autres charts et produit le JSON unique.
- Plus complexe, mais plus propre.

**Recommandation :** commence par l'Option A — déploie l'étude sur
10-15 charts ouverts, la fusion dans le bridge prend 20 lignes de Python.

---

## 5. Vérification

Une fois l'étude chargée sur un chart ES :

1. Ouvre `C:\SierraChart\Data\flow_signals.json` dans VS Code
2. Le fichier doit contenir du JSON valide mis à jour toutes les 30 secondes
3. Démarre le bridge : `flow_bridge\start-bridge.bat`
4. Ouvre `http://localhost:5050/api/health` — `signals_file_exists` doit être `true`
5. Ouvre Flow : `http://localhost:3000/signals-flow`
6. Tu dois voir : **Source: sierra** et la jauge SVI se mettre à jour

---

## 6. Dépannage

| Symptôme | Cause probable | Fix |
|---|---|---|
| Fichier jamais créé | fopen retourne NULL | Vérifie les droits d'écriture sur `C:\SierraChart\Data\` |
| JSON malformé | caractères spéciaux dans le symbole | Nettoyer `symbolStr` (retirer `-CME`, etc.) |
| Valeurs 0 partout | mauvais indices Subgraph | Vérifier que `sc.Subgraph[0]` = ton RMC et `[3]` = ton % |
| Bridge ne voit rien | fichier hors du dossier watché | Le chemin DOIT être `C:\SierraChart\Data\flow_signals.json` exactement |
| Frontend ne se connecte pas | CORS / port | Vérifier que le bridge tourne bien sur 5050 |

---

*Document version 1.0 — Module Signals Flow — Phase 6 / Sierra ACSIL*
