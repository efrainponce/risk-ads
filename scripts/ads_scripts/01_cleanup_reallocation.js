// Script A — Limpieza + Reallocation · risk-ads · Fase 1 Tarea 1.3

var DRY_RUN = true;

var stats = {
  keywordsPaused: 0,
  keywordsBidChanged: 0,
  campaignsPaused: 0,
  budgetsAdjusted: 0
};

function log(msg) {
  var prefix = DRY_RUN ? '[DRY_RUN] ' : '';
  Logger.log(prefix + msg);
}

function getKeywordBidMap(campaignName) {
  var map = {};
  try {
    var report = AdsApp.report(
      "SELECT ad_group_criterion.keyword.text, ad_group_criterion.effective_cpc_bid_micros " +
      "FROM keyword_view " +
      "WHERE campaign.name = '" + campaignName + "' " +
      "AND ad_group_criterion.status != 'REMOVED'"
    );
    var rows = report.rows();
    while (rows.hasNext()) {
      var r = rows.next();
      var text = r['ad_group_criterion.keyword.text'];
      var micros = parseInt(r['ad_group_criterion.effective_cpc_bid_micros'], 10);
      if (text && !isNaN(micros)) {
        map[text.toLowerCase()] = micros / 1000000;
      }
    }
  } catch (e) {
    log('WARNING: could not fetch bid map for "' + campaignName + '": ' + e.toString());
  }
  return map;
}

function findKeywordsInCampaign(campaignName, keywordTexts) {
  var keywords = [];
  var keywordIterator = AdsApp.keywords()
    .withCondition("CampaignName = '" + campaignName + "'")
    .get();

  var targets = {};
  for (var j = 0; j < keywordTexts.length; j++) {
    targets[keywordTexts[j].toLowerCase()] = true;
  }

  while (keywordIterator.hasNext()) {
    var kw = keywordIterator.next();
    var kwText = kw.getText().toLowerCase();
    if (targets[kwText]) {
      keywords.push(kw);
    }
  }

  return keywords;
}

function adjustBudget(campaignName, multiplier, selectorFn) {
  var campaign = null;
  var selector = selectorFn();
  var iter = selector.withCondition("campaign.name = '" + campaignName + "'").get();

  if (iter.hasNext()) {
    campaign = iter.next();
  }

  if (!campaign) {
    log('WARNING: Campaign "' + campaignName + '" not found');
    return false;
  }

  var budget = campaign.getBudget();
  var currentAmount = budget.getAmount();
  var newAmount = currentAmount * multiplier;

  log('Adjusting budget for "' + campaignName + '": ' + currentAmount + ' MXN → ' + newAmount.toFixed(2) + ' MXN (×' + multiplier + ')');

  if (!DRY_RUN) {
    budget.setAmount(newAmount);
  }

  stats.budgetsAdjusted++;
  return true;
}

function printAccountDiagnostic(label) {
  log('\n=== ' + label + ' ===');
  try {
    var report = AdsApp.report(
      "SELECT campaign.name, campaign.status, campaign.bidding_strategy_type, " +
      "campaign.maximize_conversion_value.target_roas, campaign.target_roas.target_roas, " +
      "campaign_budget.amount_micros, " +
      "metrics.cost_micros, metrics.conversions, metrics.conversions_value, " +
      "metrics.search_budget_lost_impression_share, metrics.search_rank_lost_impression_share " +
      "FROM campaign " +
      "WHERE campaign.status = 'ENABLED' " +
      "AND segments.date DURING LAST_30_DAYS"
    );
    var rows = report.rows();
    var totalDaily = 0;
    var totalCost = 0;
    var totalRevenue = 0;
    var campaigns = [];
    while (rows.hasNext()) {
      var r = rows.next();
      var name = r['campaign.name'];
      var daily = parseInt(r['campaign_budget.amount_micros'], 10) / 1000000;
      var cost = parseInt(r['metrics.cost_micros'], 10) / 1000000;
      var convs = parseFloat(r['metrics.conversions']);
      var revenue = parseFloat(r['metrics.conversions_value']);
      var lostBudget = parseFloat(r['metrics.search_budget_lost_impression_share']);
      var lostRank = parseFloat(r['metrics.search_rank_lost_impression_share']);
      var strategy = r['campaign.bidding_strategy_type'] || '-';
      var tRoasMCV = parseFloat(r['campaign.maximize_conversion_value.target_roas']);
      var tRoasStd = parseFloat(r['campaign.target_roas.target_roas']);
      var tRoas = !isNaN(tRoasMCV) && tRoasMCV > 0 ? tRoasMCV : (!isNaN(tRoasStd) && tRoasStd > 0 ? tRoasStd : null);
      var roas = cost > 0 ? (revenue / cost) : 0;
      totalDaily += daily;
      totalCost += cost;
      totalRevenue += revenue;
      campaigns.push({
        name: name,
        daily: daily,
        strategy: strategy,
        tRoas: tRoas,
        roas: roas,
        revenue: revenue,
        lostBudget: lostBudget,
        lostRank: lostRank,
        cost: cost,
        convs: convs
      });
    }
    campaigns.sort(function(a, b) { return b.daily - a.daily; });
    for (var i = 0; i < campaigns.length; i++) {
      var c = campaigns[i];
      var tRoasStr = c.tRoas != null ? c.tRoas.toFixed(2) : '-';
      log(
        '  ' + c.name +
        ' | daily=' + c.daily.toFixed(0) +
        ' | strat=' + c.strategy +
        ' | tROAS=' + tRoasStr +
        ' | ROAS=' + c.roas.toFixed(2) +
        ' | Rev30d=' + c.revenue.toFixed(0) +
        ' | Cost30d=' + c.cost.toFixed(0) +
        ' | Conv30d=' + c.convs.toFixed(1) +
        ' | LostIS(Bud)=' + (c.lostBudget * 100).toFixed(1) + '%' +
        ' | LostIS(Rank)=' + (c.lostRank * 100).toFixed(1) + '%'
      );
    }
    var acctRoas = totalCost > 0 ? (totalRevenue / totalCost) : 0;
    log('ACCOUNT 30d: Cost=' + totalCost.toFixed(0) + ' MXN · Revenue=' + totalRevenue.toFixed(0) + ' MXN · ROAS=' + acctRoas.toFixed(2));
    var monthly = totalDaily * 30.4;
    log('TOTAL daily budget (enabled): ' + totalDaily.toFixed(0) + ' MXN → ~' + monthly.toFixed(0) + ' MXN/mes');
    if (monthly < 110000) {
      log('⚠️  WARNING: monthly projection ' + monthly.toFixed(0) + ' < 110,000 MXN floor');
    }
  } catch (e) {
    log('ERROR in diagnostic: ' + e.toString());
  }
}

function main() {
  // 0. Pre-change diagnostic snapshot
  printAccountDiagnostic('Action 0: PRE-CHANGE snapshot');

  // 1. Pause keywords in campaign 'Search'
  log('\n=== Action 1: Pause keywords in Search campaign ===');
  try {
    var pauseKeywords = ['botas 5.11', 'tienda 511', 'camisa 5.11', 'ropa 5.11', '5.11 mexico', '511'];
    var keywordsToPause = findKeywordsInCampaign('Search', pauseKeywords);

    for (var i = 0; i < keywordsToPause.length; i++) {
      log('Pausing keyword: "' + keywordsToPause[i].getText() + '"');
      if (!DRY_RUN) {
        keywordsToPause[i].pause();
      }
      stats.keywordsPaused++;
    }

    if (keywordsToPause.length === 0) {
      log('No keywords found matching pause list');
    }
  } catch (e) {
    log('ERROR in Action 1: ' + e.toString());
  }

  // Fetch bid map once for Search campaign
  var searchBidMap = getKeywordBidMap('Search');

  // 2. Bid -30% on keywords in campaign 'Search'
  log('\n=== Action 2: Bid -30% on keywords in Search campaign ===');
  try {
    var bidDownKeywords = ['pantalon 5.11', '5.11 clothing', 'risk 5.11', 'tienda 5.11'];
    var keywordsToBidDown = findKeywordsInCampaign('Search', bidDownKeywords);

    for (var i = 0; i < keywordsToBidDown.length; i++) {
      var kw = keywordsToBidDown[i];
      var kwText = kw.getText().toLowerCase();
      var currentBid = searchBidMap[kwText];

      if (currentBid == null || currentBid === 0) {
        log('SKIP "' + kw.getText() + '": no manual CPC bid (campaign likely uses auto-bidding strategy)');
        continue;
      }

      var newBid = currentBid * 0.70;
      log('Reducing bid for "' + kw.getText() + '": ' + currentBid.toFixed(2) + ' MXN → ' + newBid.toFixed(2) + ' MXN (×0.70)');
      if (!DRY_RUN) {
        kw.bidding().setCpc(newBid);
      }
      stats.keywordsBidChanged++;
    }

    if (keywordsToBidDown.length === 0) {
      log('No keywords found matching bid-down list');
    }
  } catch (e) {
    log('ERROR in Action 2: ' + e.toString());
  }

  // 3. Bid +30% on keywords in campaign 'Search'
  log('\n=== Action 3: Bid +30% on keywords in Search campaign ===');
  try {
    var bidUpKeywords = ['risk top tactical', 'risk tactical'];
    var keywordsToBidUp = findKeywordsInCampaign('Search', bidUpKeywords);

    for (var i = 0; i < keywordsToBidUp.length; i++) {
      var kw = keywordsToBidUp[i];
      var kwText = kw.getText().toLowerCase();
      var currentBid = searchBidMap[kwText];

      if (currentBid == null || currentBid === 0) {
        log('SKIP "' + kw.getText() + '": no manual CPC bid (campaign likely uses auto-bidding strategy)');
        continue;
      }

      var newBid = currentBid * 1.30;
      log('Increasing bid for "' + kw.getText() + '": ' + currentBid.toFixed(2) + ' MXN → ' + newBid.toFixed(2) + ' MXN (×1.30)');
      if (!DRY_RUN) {
        kw.bidding().setCpc(newBid);
      }
      stats.keywordsBidChanged++;
    }

    if (keywordsToBidUp.length === 0) {
      log('No keywords found matching bid-up list');
    }
  } catch (e) {
    log('ERROR in Action 3: ' + e.toString());
  }

  // 4. Pause keywords in campaign 'Ubicaciones'
  log('\n=== Action 4: Pause keywords in Ubicaciones campaign ===');
  try {
    var pauseUbicacionesKeywords = ['tienda 5.11 cdmx', '5.11 merida', 'tienda 5.11 veracruz'];
    var ubicacionesKeywords = findKeywordsInCampaign('Ubicaciones', pauseUbicacionesKeywords);

    for (var i = 0; i < ubicacionesKeywords.length; i++) {
      log('Pausing keyword: "' + ubicacionesKeywords[i].getText() + '"');
      if (!DRY_RUN) {
        ubicacionesKeywords[i].pause();
      }
      stats.keywordsPaused++;
    }

    if (ubicacionesKeywords.length < pauseUbicacionesKeywords.length) {
      log('WARNING: matched ' + ubicacionesKeywords.length + '/' + pauseUbicacionesKeywords.length + ' expected. Listing all Ubicaciones keywords containing "5.11":');
      var allIter = AdsApp.keywords().withCondition("CampaignName = 'Ubicaciones'").get();
      while (allIter.hasNext()) {
        var t = allIter.next().getText();
        if (t.toLowerCase().indexOf('5.11') !== -1) {
          log('  - "' + t + '"');
        }
      }
    }
  } catch (e) {
    log('ERROR in Action 4: ' + e.toString());
  }

  // 5. Pause campaign 'Miguel Caballero Demand Gen' (Demand Gen via videoCampaigns)
  log('\n=== Action 5: Pause Miguel Caballero Demand Gen campaign ===');
  try {
    var campaignName = 'Miguel Caballero Demand Gen';
    var found = false;
    var selectors = [
      { name: 'Search', fn: function() { return AdsApp.campaigns(); } },
      { name: 'Shopping', fn: function() { return AdsApp.shoppingCampaigns(); } },
      { name: 'PerformanceMax', fn: function() { return AdsApp.performanceMaxCampaigns(); } },
      { name: 'Video', fn: function() { return AdsApp.videoCampaigns(); } }
    ];

    for (var s = 0; s < selectors.length && !found; s++) {
      try {
        var iter = selectors[s].fn().withCondition("campaign.name = '" + campaignName + "'").get();
        if (iter.hasNext()) {
          var campaign = iter.next();
          log('Pausing campaign: "' + campaign.getName() + '" (type: ' + selectors[s].name + ')');
          if (!DRY_RUN) {
            campaign.pause();
          }
          stats.campaignsPaused++;
          found = true;
        }
      } catch (inner) {
        // selector not available in this account, skip
      }
    }

    if (!found) {
      log('WARNING: Campaign "' + campaignName + '" not found. Demand Gen campaigns may not be mutable via Scripts — pause manually in UI.');
    }
  } catch (e) {
    log('ERROR in Action 5: ' + e.toString());
  }

  // 6. Daily budget adjustments
  log('\n=== Action 6: Daily budget adjustments ===');

  // PMAX Winners ×1.30
  try {
    adjustBudget('PMAX Winners', 1.30, function() {
      return AdsApp.performanceMaxCampaigns();
    });
  } catch (e) {
    log('ERROR adjusting PMAX Winners: ' + e.toString());
  }

  // PMAX Improvers HOLD — Lost IS(Bud) 0.4%, ya satura
  log('PMAX Improvers: HOLD (no change) — Lost IS(Bud) 0.4%');

  // PMAX Champions HOLD — ROAS 3.12 < tROAS 4.50, subir no resuelve
  log('PMAX Champions: HOLD (no change) — ROAS 3.12 < tROAS 4.50');

  // Search ×0.85 — menos agresivo; trae 95K rev/mes, bids ya ajustados
  try {
    adjustBudget('Search', 0.85, function() {
      return AdsApp.campaigns();
    });
  } catch (e) {
    log('ERROR adjusting Search: ' + e.toString());
  }

  // Shopping - Bleeders ×2.00 — ROAS 13.42, Lost IS(Bud) 90%; respeta cap Zombies 5K/mes
  try {
    var shoppingIter = AdsApp.shoppingCampaigns().get();
    var bleedersFound = false;
    while (shoppingIter.hasNext()) {
      var sc = shoppingIter.next();
      var scName = sc.getName();
      if (scName.toLowerCase().indexOf('bleeders') !== -1) {
        var scBudget = sc.getBudget();
        var scCurrent = scBudget.getAmount();
        var scNew = scCurrent * 2.00;
        // Cap Zombies: 5000 MXN/mes ≈ 164/día
        if (scNew > 164) {
          log('CAPPING Bleeders new budget ' + scNew.toFixed(2) + ' → 164 MXN/día (cap Zombies 5K/mes)');
          scNew = 164;
        }
        log('Adjusting budget for "' + scName + '": ' + scCurrent + ' MXN → ' + scNew.toFixed(2) + ' MXN (×2.00 capped)');
        if (!DRY_RUN) {
          scBudget.setAmount(scNew);
        }
        stats.budgetsAdjusted++;
        bleedersFound = true;
      }
    }
    if (!bleedersFound) {
      log('WARNING: No shopping campaign matching "bleeders" found. Listing all shopping campaigns:');
      var allShopping = AdsApp.shoppingCampaigns().get();
      while (allShopping.hasNext()) {
        log('  - "' + allShopping.next().getName() + '"');
      }
    }
  } catch (e) {
    log('ERROR adjusting Bleeders: ' + e.toString());
  }

  // Ubicaciones ×0.70 — menos agresivo; rev=0 es tracking roto (store visits), no juzgar por ROAS
  try {
    adjustBudget('Ubicaciones', 0.70, function() {
      return AdsApp.campaigns();
    });
  } catch (e) {
    log('ERROR adjusting Ubicaciones: ' + e.toString());
  }

  // Post-change diagnostic (shows projected new budget totals; live reflects real)
  printAccountDiagnostic('POST-CHANGE snapshot (reflects real values only when DRY_RUN=false)');

  // Summary
  log('\n=== SUMMARY ===');
  log('Keywords paused: ' + stats.keywordsPaused);
  log('Keywords bid-changed: ' + stats.keywordsBidChanged);
  log('Campaigns paused: ' + stats.campaignsPaused);
  log('Budgets adjusted: ' + stats.budgetsAdjusted);
}
