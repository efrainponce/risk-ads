// Script C — Reporting trends + YoY · risk-ads · Fase 1 bonus
// Read-only. Output: Logger.log. Pegar log en reports/{date}/trends.md

var WINDOWS = [
  { label: 'LAST_7_DAYS',   type: 'preset', value: 'LAST_7_DAYS' },
  { label: 'LAST_14_DAYS',  type: 'preset', value: 'LAST_14_DAYS' },
  { label: 'LAST_30_DAYS',  type: 'preset', value: 'LAST_30_DAYS' },
  { label: 'LAST_90_DAYS',  type: 'preset', value: 'LAST_90_DAYS' },
  { label: 'LAST_180_DAYS', type: 'preset', value: 'LAST_180_DAYS' }
];

function log(msg) {
  Logger.log(msg);
}

function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date) {
  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function formatNum(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcRoas(cost, revenue) {
  return cost > 0 ? (revenue / cost) : 0;
}

function pct(n) {
  return (n * 100).toFixed(1);
}

function padRight(str, width) {
  var s = String(str);
  while (s.length < width) {
    s = s + ' ';
  }
  return s;
}

function queryAccount(dateFilter) {
  try {
    var gaql = "SELECT metrics.cost_micros, metrics.conversions, metrics.conversions_value, " +
      "metrics.clicks, metrics.impressions " +
      "FROM campaign " +
      "WHERE campaign.status = 'ENABLED' AND " + dateFilter;
    var report = AdsApp.report(gaql);
    var rows = report.rows();
    var result = { cost: 0, convs: 0, revenue: 0, clicks: 0, imps: 0 };
    while (rows.hasNext()) {
      var r = rows.next();
      result.cost += parseInt(r['metrics.cost_micros'], 10) / 1000000;
      result.convs += parseFloat(r['metrics.conversions']) || 0;
      result.revenue += parseFloat(r['metrics.conversions_value']) || 0;
      result.clicks += parseInt(r['metrics.clicks'], 10);
      result.imps += parseInt(r['metrics.impressions'], 10);
    }
    return result;
  } catch (e) {
    log('ERROR querying account metrics: ' + e.toString());
    return { cost: 0, convs: 0, revenue: 0, clicks: 0, imps: 0 };
  }
}

function queryCampaigns(dateFilter) {
  try {
    var gaql = "SELECT campaign.name, campaign.status, campaign.bidding_strategy_type, " +
      "campaign.maximize_conversion_value.target_roas, campaign.target_roas.target_roas, " +
      "campaign_budget.amount_micros, " +
      "metrics.cost_micros, metrics.conversions, metrics.conversions_value, " +
      "metrics.search_budget_lost_impression_share, metrics.search_rank_lost_impression_share " +
      "FROM campaign " +
      "WHERE campaign.status = 'ENABLED' AND " + dateFilter;
    var report = AdsApp.report(gaql);
    var rows = report.rows();
    var campaigns = [];
    while (rows.hasNext()) {
      var r = rows.next();
      var name = r['campaign.name'];
      var daily = parseInt(r['campaign_budget.amount_micros'], 10) / 1000000;
      var cost = parseInt(r['metrics.cost_micros'], 10) / 1000000;
      var convs = parseFloat(r['metrics.conversions']) || 0;
      var revenue = parseFloat(r['metrics.conversions_value']) || 0;
      var lostBudget = parseFloat(r['metrics.search_budget_lost_impression_share']) || 0;
      var lostRank = parseFloat(r['metrics.search_rank_lost_impression_share']) || 0;
      var strategy = r['campaign.bidding_strategy_type'] || '-';
      var tRoasMCV = parseFloat(r['campaign.maximize_conversion_value.target_roas']);
      var tRoasStd = parseFloat(r['campaign.target_roas.target_roas']);
      var tRoas = !isNaN(tRoasMCV) && tRoasMCV > 0 ? tRoasMCV : (!isNaN(tRoasStd) && tRoasStd > 0 ? tRoasStd : null);
      var roas = calcRoas(cost, revenue);
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
    campaigns.sort(function(a, b) { return b.cost - a.cost; });
    return campaigns;
  } catch (e) {
    log('ERROR querying campaigns: ' + e.toString());
    return [];
  }
}

function queryKeywords(dateFilter) {
  try {
    var gaql = "SELECT campaign.name, ad_group.name, ad_group_criterion.keyword.text, " +
      "ad_group_criterion.keyword.match_type, " +
      "metrics.cost_micros, metrics.conversions, metrics.conversions_value, " +
      "metrics.clicks, metrics.impressions " +
      "FROM keyword_view " +
      "WHERE ad_group_criterion.status = 'ENABLED' AND " + dateFilter;
    var report = AdsApp.report(gaql);
    var rows = report.rows();
    var keywords = [];
    while (rows.hasNext()) {
      var r = rows.next();
      var cost = parseInt(r['metrics.cost_micros'], 10) / 1000000;
      if (cost < 200) continue;
      var revenue = parseFloat(r['metrics.conversions_value']) || 0;
      var roas = calcRoas(cost, revenue);
      keywords.push({
        campaign: r['campaign.name'],
        adgroup: r['ad_group.name'],
        text: r['ad_group_criterion.keyword.text'],
        matchType: r['ad_group_criterion.keyword.match_type'],
        cost: cost,
        revenue: revenue,
        roas: roas,
        clicks: parseInt(r['metrics.clicks'], 10),
        convs: parseFloat(r['metrics.conversions']) || 0
      });
    }
    return keywords;
  } catch (e) {
    log('ERROR querying keywords: ' + e.toString());
    return [];
  }
}

function querySearchTerms(dateFilter) {
  try {
    var gaql = "SELECT campaign.name, search_term_view.search_term, " +
      "metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.clicks " +
      "FROM search_term_view " +
      "WHERE " + dateFilter + " AND metrics.cost_micros > 200000000";
    var report = AdsApp.report(gaql);
    var rows = report.rows();
    var terms = [];
    while (rows.hasNext()) {
      var r = rows.next();
      var cost = parseInt(r['metrics.cost_micros'], 10) / 1000000;
      var revenue = parseFloat(r['metrics.conversions_value']) || 0;
      var roas = calcRoas(cost, revenue);
      terms.push({
        campaign: r['campaign.name'],
        term: r['search_term_view.search_term'],
        cost: cost,
        revenue: revenue,
        roas: roas,
        clicks: parseInt(r['metrics.clicks'], 10),
        convs: parseFloat(r['metrics.conversions']) || 0
      });
    }
    return terms;
  } catch (e) {
    log('ERROR querying search terms: ' + e.toString());
    return [];
  }
}

function queryProducts(dateFilter) {
  try {
    var gaql = "SELECT segments.product_item_id, segments.product_title, " +
      "metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.clicks " +
      "FROM shopping_performance_view " +
      "WHERE " + dateFilter;
    var report = AdsApp.report(gaql);
    var rows = report.rows();
    var products = {};
    var totalCost = 0;
    var totalRevenue = 0;
    while (rows.hasNext()) {
      var r = rows.next();
      var itemId = r['segments.product_item_id'];
      var title = r['segments.product_title'];
      var cost = parseInt(r['metrics.cost_micros'], 10) / 1000000;
      var revenue = parseFloat(r['metrics.conversions_value']) || 0;
      var clicks = parseInt(r['metrics.clicks'], 10);
      var convs = parseFloat(r['metrics.conversions']) || 0;
      if (!products[itemId]) {
        products[itemId] = { title: title, cost: 0, revenue: 0, clicks: 0, convs: 0 };
      }
      products[itemId].cost += cost;
      products[itemId].revenue += revenue;
      products[itemId].clicks += clicks;
      products[itemId].convs += convs;
      totalCost += cost;
      totalRevenue += revenue;
    }
    var list = [];
    for (var key in products) {
      var p = products[key];
      p.roas = calcRoas(p.cost, p.revenue);
      list.push({ itemId: key, title: p.title, cost: p.cost, revenue: p.revenue, roas: p.roas, clicks: p.clicks, convs: p.convs });
    }
    list.sort(function(a, b) { return b.revenue - a.revenue; });
    return { list: list, totalCost: totalCost, totalRevenue: totalRevenue };
  } catch (e) {
    log('ERROR querying products: ' + e.toString());
    return { list: [], totalCost: 0, totalRevenue: 0 };
  }
}

function queryAssets(dateFilter) {
  try {
    var gaql = "SELECT asset_group.name, asset.type, asset_group_asset.performance_label, " +
      "metrics.cost_micros " +
      "FROM asset_group_asset " +
      "WHERE " + dateFilter;
    var report = AdsApp.report(gaql);
    var rows = report.rows();
    var assetData = [];
    while (rows.hasNext()) {
      var r = rows.next();
      var cost = parseInt(r['metrics.cost_micros'], 10) / 1000000;
      assetData.push({
        assetGroup: r['asset_group.name'],
        type: r['asset.type'],
        performanceLabel: r['asset_group_asset.performance_label'],
        cost: cost
      });
    }
    return assetData;
  } catch (e) {
    log('WARNING: could not query asset data (common if limited permissions): ' + e.toString());
    return [];
  }
}

function main() {
  var today = new Date();
  var yoyCurrent = {
    from: formatDate(addDays(today, -90)),
    to: formatDate(today)
  };
  var yoYPrior = {
    from: formatDate(addDays(today, -90 - 365)),
    to: formatDate(addDays(today, -365))
  };

  log('\n');
  log('=== SCRIPT C: REPORTING TRENDS + YoY ===');
  log('Generated: ' + formatDate(today));
  log('');

  // === Section 1: Account-level rollup per window
  log('=== Section 1: Account-level rollup ===');
  try {
    var windowData = {};
    for (var w = 0; w < WINDOWS.length; w++) {
      var window = WINDOWS[w];
      var data = queryAccount('segments.date DURING ' + window.value);
      var roas = calcRoas(data.cost, data.revenue);
      var ctr = data.imps > 0 ? (data.clicks / data.imps) : 0;
      var cvr = data.clicks > 0 ? (data.convs / data.clicks) : 0;
      windowData[window.label] = {
        cost: data.cost,
        revenue: data.revenue,
        roas: roas,
        convs: data.convs,
        clicks: data.clicks,
        imps: data.imps,
        ctr: ctr,
        cvr: cvr
      };
    }

    var yoYCurrentData = queryAccount("segments.date BETWEEN '" + yoyCurrent.from + "' AND '" + yoyCurrent.to + "'");
    var yoYPriorData = queryAccount("segments.date BETWEEN '" + yoYPrior.from + "' AND '" + yoYPrior.to + "'");
    var yoYCurrentRoas = calcRoas(yoYCurrentData.cost, yoYCurrentData.revenue);
    var yoYPriorRoas = calcRoas(yoYPriorData.cost, yoYPriorData.revenue);

    windowData['YoY_current'] = {
      cost: yoYCurrentData.cost,
      revenue: yoYCurrentData.revenue,
      roas: yoYCurrentRoas,
      convs: yoYCurrentData.convs,
      clicks: yoYCurrentData.clicks,
      imps: yoYCurrentData.imps,
      ctr: yoYCurrentData.imps > 0 ? (yoYCurrentData.clicks / yoYCurrentData.imps) : 0,
      cvr: yoYCurrentData.clicks > 0 ? (yoYCurrentData.convs / yoYCurrentData.clicks) : 0
    };

    windowData['YoY_prior'] = {
      cost: yoYPriorData.cost,
      revenue: yoYPriorData.revenue,
      roas: yoYPriorRoas,
      convs: yoYPriorData.convs,
      clicks: yoYPriorData.clicks,
      imps: yoYPriorData.imps,
      ctr: yoYPriorData.imps > 0 ? (yoYPriorData.clicks / yoYPriorData.imps) : 0,
      cvr: yoYPriorData.clicks > 0 ? (yoYPriorData.convs / yoYPriorData.clicks) : 0
    };

    log('');
    log(padRight('Window', 16) + ' | ' +
        padRight('Cost', 12) + ' | ' +
        padRight('Revenue', 12) + ' | ' +
        padRight('ROAS', 8) + ' | ' +
        padRight('Conv', 10) + ' | ' +
        padRight('Clicks', 10) + ' | ' +
        padRight('Imps', 12) + ' | ' +
        padRight('CTR%', 8) + ' | ' +
        padRight('CVR%', 8));
    log(Array(120).join('-'));

    for (var w = 0; w < WINDOWS.length; w++) {
      var label = WINDOWS[w].label;
      var d = windowData[label];
      log(padRight(label, 16) + ' | ' +
          padRight(formatNum(d.cost), 12) + ' | ' +
          padRight(formatNum(d.revenue), 12) + ' | ' +
          padRight(d.roas.toFixed(2), 8) + ' | ' +
          padRight(d.convs.toFixed(1), 10) + ' | ' +
          padRight(d.clicks.toString(), 10) + ' | ' +
          padRight(d.imps.toString(), 12) + ' | ' +
          padRight(pct(d.ctr), 8) + ' | ' +
          padRight(pct(d.cvr), 8));
    }

    log('');
    var d7 = windowData['LAST_7_DAYS'];
    var d30 = windowData['LAST_30_DAYS'];
    var d90 = windowData['LAST_90_DAYS'];
    var d180 = windowData['LAST_180_DAYS'];

    var trendFlag = '~ flat';
    if (d7.roas > d30.roas && d30.roas > d90.roas && d90.roas > d180.roas) {
      trendFlag = '↑ improving';
    } else if (d7.roas < d30.roas && d30.roas < d90.roas && d90.roas < d180.roas) {
      trendFlag = '↓ degrading';
    }
    log('Trend ROAS: ' + trendFlag + ' (7d=' + d7.roas.toFixed(2) + ', 30d=' + d30.roas.toFixed(2) + ', 90d=' + d90.roas.toFixed(2) + ', 180d=' + d180.roas.toFixed(2) + ')');

    var yoYRoasDelta = (yoYCurrentRoas / yoYPriorRoas - 1) * 100;
    var yoYSpendDelta = (yoYCurrentData.cost / yoYPriorData.cost - 1) * 100;
    log('YoY ROAS delta: ' + (yoYRoasDelta > 0 ? '+' : '') + yoYRoasDelta.toFixed(1) + '%');
    log('YoY Spend delta: ' + (yoYSpendDelta > 0 ? '+' : '') + yoYSpendDelta.toFixed(1) + '%');
  } catch (e) {
    log('ERROR in Section 1: ' + e.toString());
  }

  // === Section 2: Campaign-level per window
  log('');
  log('=== Section 2: Campaign-level (LAST_30_DAYS) ===');
  try {
    var campaigns30 = queryCampaigns("segments.date DURING LAST_30_DAYS");
    log('');
    log(padRight('Campaign', 25) + ' | ' +
        padRight('Daily', 10) + ' | ' +
        padRight('Strategy', 15) + ' | ' +
        padRight('tROAS', 8) + ' | ' +
        padRight('ROAS', 8) + ' | ' +
        padRight('Rev', 12) + ' | ' +
        padRight('Cost', 12) + ' | ' +
        padRight('Conv', 8) + ' | ' +
        padRight('LostIS(B)%', 10) + ' | ' +
        padRight('LostIS(R)%', 10));
    log(Array(150).join('-'));

    for (var c = 0; c < campaigns30.length; c++) {
      var camp = campaigns30[c];
      var tRoasStr = camp.tRoas != null ? camp.tRoas.toFixed(2) : '-';
      log(padRight(camp.name.substring(0, 24), 25) + ' | ' +
          padRight(camp.daily.toFixed(0), 10) + ' | ' +
          padRight(camp.strategy, 15) + ' | ' +
          padRight(tRoasStr, 8) + ' | ' +
          padRight(camp.roas.toFixed(2), 8) + ' | ' +
          padRight(formatNum(camp.revenue), 12) + ' | ' +
          padRight(formatNum(camp.cost), 12) + ' | ' +
          padRight(camp.convs.toFixed(1), 8) + ' | ' +
          padRight(pct(camp.lostBudget), 10) + ' | ' +
          padRight(pct(camp.lostRank), 10));
    }

    log('');
    log('Campaign trend flags:');
    var campaigns90 = queryCampaigns("segments.date DURING LAST_90_DAYS");
    var camp90Map = {};
    for (var c = 0; c < campaigns90.length; c++) {
      camp90Map[campaigns90[c].name] = campaigns90[c].roas;
    }

    for (var c = 0; c < campaigns30.length; c++) {
      var camp = campaigns30[c];
      var roas30 = camp.roas;
      var roas90 = camp90Map[camp.name] || 0;
      var flag = '✓ healthy';

      if (roas30 > 4.0 && camp.lostBudget > 0.05) {
        flag = '↑ opportunity';
      } else if (roas30 < 3.0) {
        flag = '↓ drain';
      } else if (roas30 < roas90 * 0.85) {
        flag = '⚠ degrading';
      }

      if (flag !== '✓ healthy') {
        log('  ' + camp.name + ': ' + flag + ' (ROAS30d=' + roas30.toFixed(2) + ', ROAS90d=' + roas90.toFixed(2) + ')');
      }
    }
  } catch (e) {
    log('ERROR in Section 2: ' + e.toString());
  }

  // === Section 3: Top/Bottom keywords
  log('');
  log('=== Section 3: Top 15 keywords by revenue (LAST_30_DAYS) ===');
  try {
    var keywords = queryKeywords("segments.date DURING LAST_30_DAYS");
    keywords.sort(function(a, b) { return b.revenue - a.revenue; });
    var top15 = keywords.slice(0, 15);

    log('');
    log(padRight('Campaign', 20) + ' | ' +
        padRight('AdGroup', 18) + ' | ' +
        padRight('Keyword', 30) + ' | ' +
        padRight('Match', 8) + ' | ' +
        padRight('Cost', 12) + ' | ' +
        padRight('Revenue', 12) + ' | ' +
        padRight('ROAS', 8) + ' | ' +
        padRight('Clicks', 8));
    log(Array(140).join('-'));

    for (var k = 0; k < top15.length; k++) {
      var kw = top15[k];
      log(padRight(kw.campaign.substring(0, 19), 20) + ' | ' +
          padRight(kw.adgroup.substring(0, 17), 18) + ' | ' +
          padRight(kw.text.substring(0, 29), 30) + ' | ' +
          padRight(kw.matchType, 8) + ' | ' +
          padRight(formatNum(kw.cost), 12) + ' | ' +
          padRight(formatNum(kw.revenue), 12) + ' | ' +
          padRight(kw.roas.toFixed(2), 8) + ' | ' +
          padRight(kw.clicks.toString(), 8));
    }

    log('');
    log('=== Bottom 15 keywords by ROAS (LAST_30_DAYS, cost>200) ===');
    var bottom15 = keywords.filter(function(k) { return k.convs === 0 || k.roas < 2; }).sort(function(a, b) { return a.roas - b.roas; }).slice(0, 15);

    log('');
    for (var k = 0; k < bottom15.length; k++) {
      var kw = bottom15[k];
      log(padRight(kw.campaign.substring(0, 19), 20) + ' | ' +
          padRight(kw.adgroup.substring(0, 17), 18) + ' | ' +
          padRight(kw.text.substring(0, 29), 30) + ' | ' +
          padRight(kw.matchType, 8) + ' | ' +
          padRight(formatNum(kw.cost), 12) + ' | ' +
          padRight(formatNum(kw.revenue), 12) + ' | ' +
          padRight(kw.roas.toFixed(2), 8) + ' | ' +
          padRight(kw.clicks.toString(), 8));
    }
  } catch (e) {
    log('ERROR in Section 3: ' + e.toString());
  }

  // === Section 4: Search terms miner
  log('');
  log('=== Section 4: Search terms miner (LAST_30_DAYS) ===');
  try {
    var terms = querySearchTerms("segments.date DURING LAST_30_DAYS");

    var candidates = terms.filter(function(t) { return t.roas >= 4.0 && t.convs >= 2; }).sort(function(a, b) { return b.revenue - a.revenue; }).slice(0, 20);
    log('');
    log('→ Candidatos a keyword nueva (ROAS≥4.0, conv≥2):');
    log(padRight('Campaign', 20) + ' | ' +
        padRight('Search Term', 35) + ' | ' +
        padRight('Cost', 12) + ' | ' +
        padRight('Revenue', 12) + ' | ' +
        padRight('ROAS', 8));
    log(Array(100).join('-'));
    for (var i = 0; i < candidates.length; i++) {
      var t = candidates[i];
      log(padRight(t.campaign.substring(0, 19), 20) + ' | ' +
          padRight(t.term.substring(0, 34), 35) + ' | ' +
          padRight(formatNum(t.cost), 12) + ' | ' +
          padRight(formatNum(t.revenue), 12) + ' | ' +
          padRight(t.roas.toFixed(2), 8));
    }

    var negatives = terms.filter(function(t) { return t.cost > 300 && t.convs === 0; }).sort(function(a, b) { return b.cost - a.cost; }).slice(0, 20);
    log('');
    log('→ Candidatos a negative (cost>300, conv=0):');
    log(padRight('Campaign', 20) + ' | ' +
        padRight('Search Term', 35) + ' | ' +
        padRight('Cost', 12) + ' | ' +
        padRight('Clicks', 8));
    log(Array(80).join('-'));
    for (var i = 0; i < negatives.length; i++) {
      var t = negatives[i];
      log(padRight(t.campaign.substring(0, 19), 20) + ' | ' +
          padRight(t.term.substring(0, 34), 35) + ' | ' +
          padRight(formatNum(t.cost), 12) + ' | ' +
          padRight(t.clicks.toString(), 8));
    }
  } catch (e) {
    log('ERROR in Section 4: ' + e.toString());
  }

  // === Section 5: Shopping products
  log('');
  log('=== Section 5: Shopping products (LAST_30_DAYS) ===');
  try {
    var shoppingData = queryProducts("segments.date DURING LAST_30_DAYS");
    var products = shoppingData.list;

    var heroes = products.filter(function(p) { return p.roas >= 5; }).slice(0, 10);
    log('');
    log('Heroes (ROAS≥5):');
    log(padRight('Product ID', 15) + ' | ' +
        padRight('Title', 40) + ' | ' +
        padRight('Revenue', 12) + ' | ' +
        padRight('ROAS', 8));
    log(Array(80).join('-'));
    for (var i = 0; i < heroes.length; i++) {
      var p = heroes[i];
      log(padRight(p.itemId, 15) + ' | ' +
          padRight(p.title.substring(0, 39), 40) + ' | ' +
          padRight(formatNum(p.revenue), 12) + ' | ' +
          padRight(p.roas.toFixed(2), 8));
    }

    var drains = products.filter(function(p) { return p.clicks >= 50 && p.convs === 0; });
    log('');
    log('Drains (clicks≥50, conv=0): ' + drains.length + ' products');
    for (var i = 0; i < drains.length; i++) {
      var p = drains[i];
      log('  ' + p.itemId + ' | ' + p.title + ' (cost=' + formatNum(p.cost) + ', clicks=' + p.clicks + ')');
    }

    log('');
    var buckRoas = shoppingData.totalCost > 0 ? (shoppingData.totalRevenue / shoppingData.totalCost) : 0;
    log('Bucket summary: ' + products.length + ' products | Cost=' + formatNum(shoppingData.totalCost) + ' | Revenue=' + formatNum(shoppingData.totalRevenue) + ' | ROAS=' + buckRoas.toFixed(2));
  } catch (e) {
    log('ERROR in Section 5: ' + e.toString());
  }

  // === Section 6: Asset-level PMAX
  log('');
  log('=== Section 6: Asset-level PMAX (LAST_30_DAYS) ===');
  try {
    var assetData = queryAssets("segments.date DURING LAST_30_DAYS");
    if (assetData.length === 0) {
      log('No asset data available (check permissions)');
    } else {
      var assetMap = {};
      for (var i = 0; i < assetData.length; i++) {
        var a = assetData[i];
        var key = a.assetGroup + '|' + a.type + '|' + a.performanceLabel;
        if (!assetMap[key]) {
          assetMap[key] = { count: 0, cost: 0 };
        }
        assetMap[key].count++;
        assetMap[key].cost += a.cost;
      }

      log('');
      log(padRight('AssetGroup', 20) + ' | ' +
          padRight('Type', 15) + ' | ' +
          padRight('PerformanceLabel', 15) + ' | ' +
          padRight('Count', 8) + ' | ' +
          padRight('Cost', 12));
      log(Array(85).join('-'));

      for (var key in assetMap) {
        var parts = key.split('|');
        var data = assetMap[key];
        log(padRight(parts[0].substring(0, 19), 20) + ' | ' +
            padRight(parts[1].substring(0, 14), 15) + ' | ' +
            padRight(parts[2].substring(0, 14), 15) + ' | ' +
            padRight(data.count.toString(), 8) + ' | ' +
            padRight(formatNum(data.cost), 12));
      }

      var perfCounts = { BEST: 0, GOOD: 0, LOW: 0, LEARNING: 0, PENDING: 0 };
      for (var i = 0; i < assetData.length; i++) {
        var label = assetData[i].performanceLabel;
        if (perfCounts[label] !== undefined) {
          perfCounts[label]++;
        }
      }
      log('');
      log('Performance distribution: BEST=' + perfCounts['BEST'] + ', GOOD=' + perfCounts['GOOD'] + ', LOW=' + perfCounts['LOW'] + ', LEARNING=' + perfCounts['LEARNING'] + ', PENDING=' + perfCounts['PENDING']);
    }
  } catch (e) {
    log('ERROR in Section 6: ' + e.toString());
  }

  // === Section 7: Summary + next actions
  log('');
  log('=== Section 7: Summary + next actions ===');
  try {
    var d7 = windowData['LAST_7_DAYS'];
    var d30 = windowData['LAST_30_DAYS'];
    var d90 = windowData['LAST_90_DAYS'];
    var d180 = windowData['LAST_180_DAYS'];
    var yoYCurr = windowData['YoY_current'];
    var yoYPrev = windowData['YoY_prior'];

    log('');
    log('Account ROAS trend:');
    log('  7d:   ' + d7.roas.toFixed(2));
    log('  30d:  ' + d30.roas.toFixed(2));
    log('  90d:  ' + d90.roas.toFixed(2));
    log('  180d: ' + d180.roas.toFixed(2));
    log('  YoY:  ' + yoYCurr.roas.toFixed(2) + ' (vs ' + yoYPrev.roas.toFixed(2) + ' prior year, ' + ((yoYCurr.roas / yoYPrev.roas - 1) * 100).toFixed(1) + '%)');

    log('');
    log('Critical flags:');
    var campaigns30 = queryCampaigns("segments.date DURING LAST_30_DAYS");
    var criticalCount = 0;
    for (var c = 0; c < campaigns30.length; c++) {
      var camp = campaigns30[c];
      if (camp.roas < 3.0) {
        log('  ↓ DRAIN: ' + camp.name + ' (ROAS=' + camp.roas.toFixed(2) + ')');
        criticalCount++;
      }
    }
    if (criticalCount === 0) {
      log('  ✓ No drain campaigns detected');
    }

    log('');
    log('Copy this output to reports/' + formatDate(today) + '/trends.md');
  } catch (e) {
    log('ERROR in Section 7: ' + e.toString());
  }
}

main();
