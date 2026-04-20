// Script B v2 — Ajustar campaña Search - Brand (creada manual) · risk-ads · Fase 1 Tarea 1.5 / 1.7

var DRY_RUN = true;

// Constants
var BRAND_CAMPAIGN_NAME = 'Brand';
var BRAND_AD_GROUP_NAME = 'Risk';
var BRAND_BUDGET_MXN = 115;
var BRAND_TARGET_ROAS = 10.0;
var SEARCH_BUDGET_REDUCTION_MXN = 115;
var SEARCH_CAMPAIGN_NAME = 'Search';
var UBICACIONES_CAMPAIGN_NAME = 'Ubicaciones';

var stats = {
  budgetsAdjusted: 0,
  biddingAdjusted: 0,
  adGroupsCreated: 0,
  adGroupsFlagged: 0,
  keywordsAdded: 0,
  keywordsPaused: 0,
  rsasCreated: 0,
  negativesAdded: 0
};

function log(msg) {
  var prefix = DRY_RUN ? '[DRY_RUN] ' : '';
  Logger.log(prefix + msg);
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
      log('WARNING: monthly projection ' + monthly.toFixed(0) + ' < 110,000 MXN floor');
    }
  } catch (e) {
    log('ERROR in diagnostic: ' + e.toString());
  }
}

function main() {
  // Action 0: PRE-CHANGE snapshot
  printAccountDiagnostic('Action 0: PRE-CHANGE snapshot');

  // Action 1: Verify 'Search - Brand' exists + inspect state
  log('\n=== Action 1: Verify Search - Brand exists + inspect state ===');
  var brandCampaign = null;
  try {
    var campaignIter = AdsApp.campaigns().withCondition("Name = '" + BRAND_CAMPAIGN_NAME + "'").get();
    if (campaignIter.hasNext()) {
      brandCampaign = campaignIter.next();
      var currentBudget = brandCampaign.getBudget().getAmount();
      var biddingStrategy = brandCampaign.bidding().getStrategyType();
      var campaignStatus = brandCampaign.isEnabled() ? 'ENABLED' : (brandCampaign.isPaused() ? 'PAUSED' : 'UNKNOWN');
      log('Campaign found: ' + BRAND_CAMPAIGN_NAME);
      log('  Current daily budget: ' + currentBudget.toFixed(0) + ' MXN');
      log('  Bidding strategy: ' + biddingStrategy);
      log('  Status: ' + campaignStatus);
    } else {
      log('ERROR: Campaign not found. Create manually in UI first.');
      return;
    }
  } catch (e) {
    log('ERROR in Action 1: ' + e.toString());
    return;
  }

  // Action 2: Adjust 'Search - Brand' budget to 115 MXN/día
  log('\n=== Action 2: Adjust Search - Brand budget to 115 MXN/día ===');
  try {
    var currentAmount = brandCampaign.getBudget().getAmount();
    if (currentAmount === BRAND_BUDGET_MXN) {
      log('Budget already 115 MXN. Skipping.');
    } else {
      log('Adjusting budget: ' + currentAmount.toFixed(0) + ' MXN → ' + BRAND_BUDGET_MXN.toFixed(0) + ' MXN');
      if (!DRY_RUN) {
        brandCampaign.getBudget().setAmount(BRAND_BUDGET_MXN);
      }
      stats.budgetsAdjusted++;
    }
  } catch (e) {
    log('ERROR in Action 2: ' + e.toString());
  }

  // Action 3: Set bidding strategy Target ROAS 10.0
  log('\n=== Action 3: Set bidding strategy Target ROAS 10.0 ===');
  try {
    var bidding = brandCampaign.bidding();
    if (!DRY_RUN) {
      bidding.setStrategy('TARGET_ROAS');
      bidding.setTargetRoas(BRAND_TARGET_ROAS);
      log('Set bidding strategy to TARGET_ROAS with target ' + BRAND_TARGET_ROAS.toFixed(1));
      stats.biddingAdjusted++;
    } else {
      log('DRY_RUN: would set bidding strategy to TARGET_ROAS with target ' + BRAND_TARGET_ROAS.toFixed(1));
    }
  } catch (e) {
    log('WARNING: Could not set Target ROAS via API: ' + e.toString());
    log('MANUAL ACTION REQUIRED: Set bidding strategy in UI to Target ROAS = 10.0 (1000%)');
  }

  // Action 4: Inspect + flag inherited ad groups from Search copy-paste
  log('\n=== Action 4: Inspect + flag inherited ad groups ===');
  var riskBrandExists = false;
  var brandAdGroup = null;
  try {
    var adGroupIter = brandCampaign.adGroups().get();
    log('Existing ad groups in Search - Brand campaign:');
    while (adGroupIter.hasNext()) {
      var adGroup = adGroupIter.next();
      var adGroupName = adGroup.getName();
      var adGroupStatus = adGroup.isEnabled() ? 'ENABLED' : (adGroup.isPaused() ? 'PAUSED' : 'UNKNOWN');
      var keywordIter = adGroup.keywords().get();
      var kwCount = 0;
      while (keywordIter.hasNext()) {
        keywordIter.next();
        kwCount++;
      }
      log('  - ' + adGroupName + ' | status=' + adGroupStatus + ' | kw_count=' + kwCount);

      if (adGroupName === BRAND_AD_GROUP_NAME) {
        riskBrandExists = true;
        brandAdGroup = adGroup;
      } else {
        log('FLAGGED FOR MANUAL PAUSE: ad group "' + adGroupName + '" inherited from Search copy-paste. Recomendado: pausar en UI para aislar Risk Brand.');
        stats.adGroupsFlagged++;
      }
    }
  } catch (e) {
    log('ERROR in Action 4: ' + e.toString());
  }

  // Action 5: Create 'Risk Brand' ad group (if not exists)
  log('\n=== Action 5: Create Risk Brand ad group (if not exists) ===');
  try {
    if (riskBrandExists) {
      log('Ad group "Risk Brand" already exists. Using existing.');
    } else {
      log('Ad group "Risk Brand" does not exist. Attempting creation...');
      if (!DRY_RUN) {
        var adGroupBuilder = brandCampaign.newAdGroupBuilder().withName(BRAND_AD_GROUP_NAME);
        var adGroupOp = adGroupBuilder.build();
        if (adGroupOp.isSuccessful()) {
          brandAdGroup = adGroupOp.getResult();
          log('Ad group "Risk Brand" created successfully');
          stats.adGroupsCreated++;
        } else {
          log('ERROR: Ad group builder returned unsuccessful operation');
          brandAdGroup = null;
        }
      } else {
        log('DRY_RUN: ad group would be created, skipping kw/rsa preview');
        brandAdGroup = null;
      }
    }
  } catch (e) {
    log('ERROR in Action 5: ' + e.toString());
    brandAdGroup = null;
  }

  // Action 5b: Pause non-EXACT/PHRASE keywords in Risk ad group (BROAD cleanup)
  log('\n=== Action 5b: Pause BROAD (non-exact/phrase) keywords in Risk ad group ===');
  if (brandAdGroup) {
    try {
      var cleanupIter = brandAdGroup.keywords().get();
      while (cleanupIter.hasNext()) {
        var kwToCheck = cleanupIter.next();
        var matchType = kwToCheck.getMatchType();
        if (matchType !== 'EXACT' && matchType !== 'PHRASE') {
          log('Pausing: "' + kwToCheck.getText() + '" | match=' + matchType);
          if (!DRY_RUN) {
            kwToCheck.pause();
          }
          stats.keywordsPaused++;
        } else {
          log('Keep: "' + kwToCheck.getText() + '" | match=' + matchType);
        }
      }
    } catch (e) {
      log('ERROR in Action 5b: ' + e.toString());
    }
  } else {
    log('Ad group "Risk" not available. Skipping BROAD cleanup.');
  }

  // Action 6: Add 8 keywords to 'Risk' ad group (dedup by normalized text + match_type)
  log('\n=== Action 6: Add keywords to Risk ad group ===');
  if (brandAdGroup) {
    try {
      // Build existing key: "text|MATCH_TYPE" (text lowercased, no brackets/quotes — getText strips them)
      var existingKeywords = {};
      var existingKwIter = brandAdGroup.keywords().get();
      log('Existing keywords in ad group:');
      while (existingKwIter.hasNext()) {
        var existingKw = existingKwIter.next();
        var existingText = existingKw.getText().toLowerCase();
        var existingMatch = existingKw.getMatchType();
        var existingKey = existingText + '|' + existingMatch;
        existingKeywords[existingKey] = true;
        log('  - "' + existingKw.getText() + '" | match=' + existingMatch);
      }

      // Target keywords: [{text_raw, normalized_text, match_type}]
      var targets = [
        { raw: '[risk tactical]',         text: 'risk tactical',         match: 'EXACT'  },
        { raw: '[risk top tactical]',     text: 'risk top tactical',     match: 'EXACT'  },
        { raw: '[risk mexico]',           text: 'risk mexico',           match: 'EXACT'  },
        { raw: '[risk tactical mexico]',  text: 'risk tactical mexico',  match: 'EXACT'  },
        { raw: '"risk tactical"',         text: 'risk tactical',         match: 'PHRASE' },
        { raw: '"risk top tactical"',     text: 'risk top tactical',     match: 'PHRASE' },
        { raw: '"risk mexico"',           text: 'risk mexico',           match: 'PHRASE' },
        { raw: '"risk tactical mexico"',  text: 'risk tactical mexico',  match: 'PHRASE' }
      ];

      for (var k = 0; k < targets.length; k++) {
        try {
          var t = targets[k];
          var targetKey = t.text + '|' + t.match;
          if (existingKeywords[targetKey]) {
            log('SKIP: ' + t.raw + ' (already exists as ' + t.match + ')');
          } else {
            if (!DRY_RUN) {
              var kwBuilder = brandAdGroup.newKeywordBuilder().withText(t.raw);
              var kwOp = kwBuilder.build();
              if (kwOp.isSuccessful()) {
                log('Added: ' + t.raw);
                stats.keywordsAdded++;
              } else {
                log('WARNING: Could not add keyword "' + t.raw + '" (builder unsuccessful)');
              }
            } else {
              log('Added (DRY_RUN): ' + t.raw);
              stats.keywordsAdded++;
            }
          }
        } catch (kwError) {
          log('ERROR adding keyword "' + targets[k].raw + '": ' + kwError.toString());
        }
      }
    } catch (e) {
      log('ERROR in Action 6: ' + e.toString());
    }
  } else {
    log('Ad group "Risk" not available. Skipping keyword addition.');
  }

  // Action 7: Create RSA (if none exists in 'Risk Brand')
  log('\n=== Action 7: Create Responsive Search Ad (RSA) ===');
  if (brandAdGroup) {
    try {
      var adsIter = brandAdGroup.ads().get();
      var adCount = 0;
      while (adsIter.hasNext()) {
        adsIter.next();
        adCount++;
      }

      if (adCount > 0) {
        log('SKIP: ad group already has ' + adCount + ' ad(s). Manual review recommended.');
      } else {
        var headlines = [
          'Risk Tactical México',
          'Marca Risk Oficial',
          'Táctico Premium MX',
          'Risk | Ropa Táctica',
          'Envío Nacional MX',
          'Risk Tactical Store',
          'Gear Táctico Risk',
          'Catálogo Risk 2026',
          'Risk Top Tactical',
          'Comprar Risk MX',
          'Risk Mexico Oficial',
          '[HEADLINE 12]',
          '[HEADLINE 13]',
          '[HEADLINE 14]',
          '[HEADLINE 15]'
        ];

        var descriptions = [
          'Marca táctica mexicana Risk. Calidad premium. Envío a todo MX.',
          'Ropa y equipo táctico Risk. Directo del fabricante.',
          '[DESCRIPTION 3]',
          '[DESCRIPTION 4]'
        ];

        if (!DRY_RUN) {
          var rsaBuilder = brandAdGroup.newAd().responsiveSearchAdBuilder()
            .addHeadlines(headlines)
            .addDescriptions(descriptions)
            .withFinalUrl('https://risktactical.com')
            .withPath1('tactical')
            .withPath2('mx');

          var rsaOp = rsaBuilder.build();
          if (rsaOp.isSuccessful()) {
            log('Responsive Search Ad created successfully');
            stats.rsasCreated++;
            log('IMPORTANT: Usuario debe editar headlines 12-15 y descriptions 3-4 en UI antes de activar.');
          } else {
            log('WARNING: RSA builder returned unsuccessful operation');
          }
        } else {
          log('DRY_RUN: RSA would be created with 15 headlines and 4 descriptions');
          stats.rsasCreated++;
        }
      }
    } catch (e) {
      log('ERROR in Action 7: ' + e.toString());
    }
  } else {
    log('Ad group "Risk Brand" not available. Skipping RSA creation.');
  }

  // Action 8: Add brand negatives to 'Search' and 'Ubicaciones'
  log('\n=== Action 8: Add brand negatives to Search and Ubicaciones ===');
  var negativeKeywords = [
    '"risk tactical"',
    '"risk top tactical"',
    '"risk mexico"',
    '"risk tactical mexico"'
  ];

  var campaignNamesToAddNegatives = [SEARCH_CAMPAIGN_NAME, UBICACIONES_CAMPAIGN_NAME];

  for (var c = 0; c < campaignNamesToAddNegatives.length; c++) {
    try {
      var campName = campaignNamesToAddNegatives[c];
      var campIter = AdsApp.campaigns().withCondition("Name = '" + campName + "'").get();

      if (campIter.hasNext()) {
        var camp = campIter.next();
        var existingNegatives = {};
        var negIter = camp.negativeKeywords().get();
        while (negIter.hasNext()) {
          var existingNeg = negIter.next();
          existingNegatives[existingNeg.getText()] = true;
        }

        for (var n = 0; n < negativeKeywords.length; n++) {
          try {
            var negText = negativeKeywords[n];
            if (existingNegatives[negText]) {
              log('SKIP: ' + negText + ' (already exists in ' + campName + ')');
            } else {
              if (!DRY_RUN) {
                camp.createNegativeKeyword(negText);
                log('Added negative: ' + negText + ' to ' + campName);
                stats.negativesAdded++;
              } else {
                log('Added negative (DRY_RUN): ' + negText + ' to ' + campName);
                stats.negativesAdded++;
              }
            }
          } catch (negError) {
            log('WARNING: Could not add negative "' + negativeKeywords[n] + '" to "' + campName + '": ' + negError.toString());
          }
        }
      } else {
        log('WARNING: Campaign "' + campName + '" not found. Cannot add negatives.');
      }
    } catch (e) {
      log('ERROR in Action 8 for campaign "' + campaignNamesToAddNegatives[c] + '": ' + e.toString());
    }
  }

  // Action 9: Reduce 'Search' campaign budget by 115 MXN/día (Tarea 1.7) — idempotent
  log('\n=== Action 9: Reduce Search campaign budget to 990 MXN/día ===');
  var SEARCH_TARGET_BUDGET = 990; // fixed target, idempotent on re-runs
  try {
    var searchIter = AdsApp.campaigns().withCondition("Name = '" + SEARCH_CAMPAIGN_NAME + "'").get();
    if (searchIter.hasNext()) {
      var searchCampaign = searchIter.next();
      var searchBudget = searchCampaign.getBudget();
      var currentAmount = searchBudget.getAmount();

      if (currentAmount <= SEARCH_TARGET_BUDGET) {
        log('Search budget already ' + currentAmount.toFixed(0) + ' MXN (≤ target ' + SEARCH_TARGET_BUDGET + '). Skipping (idempotent).');
      } else if (SEARCH_TARGET_BUDGET < 500) {
        log('WARNING: Target ' + SEARCH_TARGET_BUDGET + ' MXN below floor 500. Skipping.');
      } else {
        log('Adjusting budget for "Search": ' + currentAmount.toFixed(0) + ' MXN → ' + SEARCH_TARGET_BUDGET + ' MXN (−' + (currentAmount - SEARCH_TARGET_BUDGET).toFixed(0) + ' MXN reallocated to Brand)');
        if (!DRY_RUN) {
          searchBudget.setAmount(SEARCH_TARGET_BUDGET);
        }
        stats.budgetsAdjusted++;
      }
    } else {
      log('WARNING: Campaign "' + SEARCH_CAMPAIGN_NAME + '" not found. Cannot reduce budget.');
    }
  } catch (e) {
    log('ERROR in Action 9: ' + e.toString());
  }

  // Post-change diagnostic + Summary
  printAccountDiagnostic('POST-CHANGE snapshot (reflects real values only when DRY_RUN=false)');

  log('\n=== SUMMARY ===');
  log('Budgets adjusted: ' + stats.budgetsAdjusted);
  log('Bidding adjusted: ' + stats.biddingAdjusted);
  log('Ad groups created: ' + stats.adGroupsCreated);
  log('Ad groups flagged: ' + stats.adGroupsFlagged);
  log('Keywords paused (BROAD cleanup): ' + stats.keywordsPaused);
  log('Keywords added: ' + stats.keywordsAdded);
  log('RSAs created: ' + stats.rsasCreated);
  log('Negatives added: ' + stats.negativesAdded);

  log('\n=== MANUAL ACTIONS REMAINING ===');
  if (stats.adGroupsFlagged > 0) {
    log('1. PAUSE inherited ad groups from Search copy-paste (see Action 4 logs)');
  }
  if (stats.biddingAdjusted === 0) {
    log('2. If setStrategy failed: set bidding strategy in UI to Target ROAS = 10.0');
  }
  if (stats.rsasCreated > 0) {
    log('3. Edit headlines 12-15 and descriptions 3-4 in UI before activating RSA');
  }
  log('4. Activate Search - Brand campaign when ready');
}

main();
