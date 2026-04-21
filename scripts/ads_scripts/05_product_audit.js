// Script F — Product audit · risk-ads · Fase 3 quick win
// Read-only. Output: Logger.log. Pegar log en reports/{date}/product_audit.md
// Clasifica productos 90D en 4 buckets (Champions/Winners/Improvers/Zombies) + flag misplaced

function log(msg) {
  Logger.log(msg);
}

function formatNum(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date) {
  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function calcRoas(cost, revenue) {
  return cost > 0 ? (revenue / cost) : 0;
}

function padRight(str, width) {
  var s = String(str);
  while (s.length < width) {
    s = s + ' ';
  }
  return s;
}

function truncateTitle(title, maxLen) {
  if (title.length > maxLen) {
    return title.substring(0, maxLen);
  }
  return title;
}

function classify(roas, clicks) {
  if (clicks < 30) return 'Zombies';
  if (roas >= 8 && clicks >= 100) return 'Champions';
  if (roas >= 4) return 'Winners';
  if (roas >= 2) return 'Improvers';
  return 'Zombies';
}

function getCurrentBucket(campaignName) {
  var lower = campaignName.toLowerCase();
  if (lower.indexOf('champion') >= 0) return 'Champions';
  if (lower.indexOf('winner') >= 0) return 'Winners';
  if (lower.indexOf('improver') >= 0) return 'Improvers';
  if (lower.indexOf('bleeder') >= 0 || lower.indexOf('zombie') >= 0 || lower.indexOf('dead') >= 0) return 'Zombies';
  return 'Other';
}

function getSeverity(currentBucket, recommendedBucket) {
  if (currentBucket === recommendedBucket) return null;

  var high_drains = (currentBucket === 'Champions' || currentBucket === 'Winners') && recommendedBucket === 'Zombies';
  var high_hidden = (currentBucket === 'Zombies' || currentBucket === 'Other') && (recommendedBucket === 'Champions' || recommendedBucket === 'Winners');

  if (high_drains || high_hidden) return 'HIGH';

  var order = { 'Champions': 0, 'Winners': 1, 'Improvers': 2, 'Zombies': 3, 'Other': 4 };
  var currOrder = order[currentBucket] || 999;
  var recOrder = order[recommendedBucket] || 999;
  var distance = Math.abs(currOrder - recOrder);

  if (distance === 1) return 'MEDIUM';
  return 'LOW';
}

function queryProductsWithCampaigns() {
  try {
    var endDate = new Date();
    var startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    var startStr = formatDate(startDate);
    var endStr = formatDate(endDate);

    var gaql = "SELECT " +
      "segments.product_item_id, " +
      "segments.product_title, " +
      "campaign.name, " +
      "campaign.advertising_channel_type, " +
      "metrics.cost_micros, " +
      "metrics.conversions_value, " +
      "metrics.clicks, " +
      "metrics.conversions " +
      "FROM shopping_performance_view " +
      "WHERE segments.date >= '" + startStr + "' AND segments.date <= '" + endStr + "' " +
      "AND campaign.advertising_channel_type IN ('SHOPPING', 'PERFORMANCE_MAX')";

    var report = AdsApp.report(gaql);
    var rows = report.rows();
    var products = {};
    var totalCost = 0;
    var totalRevenue = 0;
    var totalConversions = 0;

    if (!rows.hasNext()) {
      log('WARNING: No shopping_performance_view rows returned for LAST_90_DAYS');
      return { list: [], totalCost: 0, totalRevenue: 0, totalConversions: 0 };
    }

    while (rows.hasNext()) {
      var r = rows.next();
      var itemId = r['segments.product_item_id'];
      var title = r['segments.product_title'];
      var campaignName = r['campaign.name'];
      var cost = parseInt(r['metrics.cost_micros'], 10) / 1000000;
      var revenue = parseFloat(r['metrics.conversions_value']) || 0;
      var clicks = parseInt(r['metrics.clicks'], 10);
      var conversions = parseFloat(r['metrics.conversions']) || 0;

      if (!products[itemId]) {
        products[itemId] = {
          title: title,
          cost: 0,
          revenue: 0,
          clicks: 0,
          conversions: 0,
          campaignCosts: {}
        };
      }

      products[itemId].cost += cost;
      products[itemId].revenue += revenue;
      products[itemId].clicks += clicks;
      products[itemId].conversions += conversions;

      if (!products[itemId].campaignCosts[campaignName]) {
        products[itemId].campaignCosts[campaignName] = 0;
      }
      products[itemId].campaignCosts[campaignName] += cost;

      totalCost += cost;
      totalRevenue += revenue;
      totalConversions += conversions;
    }

    var list = [];
    for (var key in products) {
      var p = products[key];
      var roas = calcRoas(p.cost, p.revenue);
      var primaryCampaign = '';
      var maxCost = 0;
      for (var camp in p.campaignCosts) {
        if (p.campaignCosts[camp] > maxCost) {
          maxCost = p.campaignCosts[camp];
          primaryCampaign = camp;
        }
      }

      list.push({
        itemId: key,
        title: p.title,
        cost: p.cost,
        revenue: p.revenue,
        roas: roas,
        clicks: p.clicks,
        conversions: p.conversions,
        primaryCampaign: primaryCampaign
      });
    }

    list.sort(function(a, b) { return b.cost - a.cost; });

    return {
      list: list,
      totalCost: totalCost,
      totalRevenue: totalRevenue,
      totalConversions: totalConversions
    };
  } catch (e) {
    log('ERROR querying products: ' + e.toString());
    return { list: [], totalCost: 0, totalRevenue: 0, totalConversions: 0 };
  }
}

function main() {
  var today = new Date();
  log('\n');
  log('=== SCRIPT F: PRODUCT AUDIT ===');
  log('Generated: ' + formatDate(today));
  log('Window: LAST_90_DAYS');
  log('');

  var data = queryProductsWithCampaigns();
  var products = data.list;

  if (products.length === 0) {
    log('ERROR: No products found in 90D window. Aborting.');
    return;
  }

  var accountRoas = calcRoas(data.totalCost, data.totalRevenue);
  log('Total products audited: ' + products.length);
  log('Total cost (90D): ' + formatNum(data.totalCost));
  log('Total revenue (90D): ' + formatNum(data.totalRevenue));
  log('Account ROAS (90D): ' + accountRoas.toFixed(2));
  log('');

  // === Section 1: Distribution summary
  log('=== Section 1: Distribution summary ===');

  var bucketCounts = {
    'Champions': 0,
    'Winners': 0,
    'Improvers': 0,
    'Zombies': 0,
    'Other': 0
  };

  var recommendedCounts = {
    'Champions': 0,
    'Winners': 0,
    'Improvers': 0,
    'Zombies': 0,
    'Other': 0
  };

  var misplaced = [];
  var zombiesBySpend = [];
  var hiddenChampions = [];

  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    var currentBucket = getCurrentBucket(p.primaryCampaign);
    var recommendedBucket = classify(p.roas, p.clicks);

    bucketCounts[currentBucket]++;
    recommendedCounts[recommendedBucket]++;

    if (recommendedBucket === 'Zombies') {
      zombiesBySpend.push({
        itemId: p.itemId,
        title: p.title,
        currentBucket: currentBucket,
        recommendedBucket: recommendedBucket,
        roas: p.roas,
        cost: p.cost,
        revenue: p.revenue,
        clicks: p.clicks
      });
    }

    if (recommendedBucket === 'Champions' && (currentBucket === 'Zombies' || currentBucket === 'Other')) {
      hiddenChampions.push({
        itemId: p.itemId,
        title: p.title,
        currentBucket: currentBucket,
        recommendedBucket: recommendedBucket,
        roas: p.roas,
        cost: p.cost,
        revenue: p.revenue,
        clicks: p.clicks
      });
    }

    if (currentBucket !== recommendedBucket && currentBucket !== 'Other' && p.clicks >= 30) {
      var severity = getSeverity(currentBucket, recommendedBucket);
      if (severity) {
        misplaced.push({
          itemId: p.itemId,
          title: p.title,
          currentBucket: currentBucket,
          recommendedBucket: recommendedBucket,
          roas: p.roas,
          cost: p.cost,
          revenue: p.revenue,
          clicks: p.clicks,
          severity: severity
        });
      }
    }
  }

  log('');
  log(padRight('Bucket', 15) + ' | ' +
      padRight('Current', 10) + ' | ' +
      padRight('Recommended', 12) + ' | ' +
      padRight('Delta', 8));
  log(Array(50).join('-'));

  var bucketNames = ['Champions', 'Winners', 'Improvers', 'Zombies', 'Other'];
  for (var b = 0; b < bucketNames.length; b++) {
    var name = bucketNames[b];
    var curr = bucketCounts[name];
    var rec = recommendedCounts[name];
    var delta = rec - curr;
    var deltaStr = delta > 0 ? '+' + delta : delta.toString();
    log(padRight(name, 15) + ' | ' +
        padRight(curr.toString(), 10) + ' | ' +
        padRight(rec.toString(), 12) + ' | ' +
        padRight(deltaStr, 8));
  }

  log('');

  // === Section 2: Misplaced HIGH severity
  log('=== Section 2: Misplaced HIGH severity (top 30 by cost) ===');

  var highSeverity = misplaced.filter(function(m) { return m.severity === 'HIGH'; });
  highSeverity.sort(function(a, b) { return b.cost - a.cost; });
  highSeverity = highSeverity.slice(0, 30);

  log('');
  log(padRight('item_id', 18) + ' | ' +
      padRight('title', 41) + ' | ' +
      padRight('current', 12) + ' | ' +
      padRight('recommended', 12) + ' | ' +
      padRight('ROAS', 6) + ' | ' +
      padRight('cost', 10) + ' | ' +
      padRight('revenue', 10) + ' | ' +
      padRight('clicks', 8) + ' | ' +
      padRight('severity', 10) + ' | reason');
  log(Array(180).join('-'));

  for (var i = 0; i < highSeverity.length; i++) {
    var m = highSeverity[i];
    var reason = '';
    if (m.currentBucket === 'Champions' && m.recommendedBucket === 'Zombies') {
      reason = 'ROAS<2 in Champions campaign';
    } else if (m.currentBucket === 'Winners' && m.recommendedBucket === 'Zombies') {
      reason = 'ROAS<2 in Winners campaign';
    } else if ((m.currentBucket === 'Zombies' || m.currentBucket === 'Other') && (m.recommendedBucket === 'Champions' || m.recommendedBucket === 'Winners')) {
      reason = 'High ROAS, hidden in ' + m.currentBucket;
    }

    log(padRight(m.itemId.substring(0, 17), 18) + ' | ' +
        padRight(truncateTitle(m.title, 40), 41) + ' | ' +
        padRight(m.currentBucket, 12) + ' | ' +
        padRight(m.recommendedBucket, 12) + ' | ' +
        padRight(m.roas.toFixed(2), 6) + ' | ' +
        padRight(formatNum(m.cost), 10) + ' | ' +
        padRight(formatNum(m.revenue), 10) + ' | ' +
        padRight(m.clicks.toString(), 8) + ' | ' +
        padRight(m.severity, 10) + ' | ' + reason);
  }

  log('');

  // === Section 3: Misplaced MEDIUM severity
  log('=== Section 3: Misplaced MEDIUM severity (top 30 by cost) ===');

  var mediumSeverity = misplaced.filter(function(m) { return m.severity === 'MEDIUM'; });
  mediumSeverity.sort(function(a, b) { return b.cost - a.cost; });
  mediumSeverity = mediumSeverity.slice(0, 30);

  log('');
  log(padRight('item_id', 18) + ' | ' +
      padRight('title', 41) + ' | ' +
      padRight('current', 12) + ' | ' +
      padRight('recommended', 12) + ' | ' +
      padRight('ROAS', 6) + ' | ' +
      padRight('cost', 10) + ' | ' +
      padRight('revenue', 10) + ' | ' +
      padRight('clicks', 8) + ' | ' +
      padRight('severity', 10));
  log(Array(160).join('-'));

  for (var i = 0; i < mediumSeverity.length; i++) {
    var m = mediumSeverity[i];
    log(padRight(m.itemId.substring(0, 17), 18) + ' | ' +
        padRight(truncateTitle(m.title, 40), 41) + ' | ' +
        padRight(m.currentBucket, 12) + ' | ' +
        padRight(m.recommendedBucket, 12) + ' | ' +
        padRight(m.roas.toFixed(2), 6) + ' | ' +
        padRight(formatNum(m.cost), 10) + ' | ' +
        padRight(formatNum(m.revenue), 10) + ' | ' +
        padRight(m.clicks.toString(), 8) + ' | ' +
        padRight(m.severity, 10));
  }

  log('');

  // === Section 4: Top 20 Zombies by cost
  log('=== Section 4: Top 20 Zombies by cost ===');

  zombiesBySpend.sort(function(a, b) { return b.cost - a.cost; });
  zombiesBySpend = zombiesBySpend.slice(0, 20);

  log('');
  log(padRight('item_id', 18) + ' | ' +
      padRight('title', 41) + ' | ' +
      padRight('ROAS', 6) + ' | ' +
      padRight('cost', 10) + ' | ' +
      padRight('clicks', 8));
  log(Array(90).join('-'));

  for (var i = 0; i < zombiesBySpend.length; i++) {
    var z = zombiesBySpend[i];
    log(padRight(z.itemId.substring(0, 17), 18) + ' | ' +
        padRight(truncateTitle(z.title, 40), 41) + ' | ' +
        padRight(z.roas.toFixed(2), 6) + ' | ' +
        padRight(formatNum(z.cost), 10) + ' | ' +
        padRight(z.clicks.toString(), 8));
  }

  log('');

  // === Section 5: Top 20 hidden Champions
  log('=== Section 5: Top 20 hidden Champions (currently in Zombies/Other) ===');

  hiddenChampions.sort(function(a, b) { return b.cost - a.cost; });
  hiddenChampions = hiddenChampions.slice(0, 20);

  log('');
  log(padRight('item_id', 18) + ' | ' +
      padRight('title', 41) + ' | ' +
      padRight('current', 12) + ' | ' +
      padRight('ROAS', 6) + ' | ' +
      padRight('cost', 10) + ' | ' +
      padRight('revenue', 10) + ' | ' +
      padRight('clicks', 8));
  log(Array(130).join('-'));

  for (var i = 0; i < hiddenChampions.length; i++) {
    var h = hiddenChampions[i];
    log(padRight(h.itemId.substring(0, 17), 18) + ' | ' +
        padRight(truncateTitle(h.title, 40), 41) + ' | ' +
        padRight(h.currentBucket, 12) + ' | ' +
        padRight(h.roas.toFixed(2), 6) + ' | ' +
        padRight(formatNum(h.cost), 10) + ' | ' +
        padRight(formatNum(h.revenue), 10) + ' | ' +
        padRight(h.clicks.toString(), 8));
  }

  log('');

  // === Section 6: Summary + recommended actions
  log('=== Section 6: Summary + recommended actions ===');
  log('');

  var drainProducts = misplaced.filter(function(m) {
    return m.severity === 'HIGH' && (m.currentBucket === 'Champions' || m.currentBucket === 'Winners') && m.recommendedBucket === 'Zombies';
  });
  var estimatedSavings = 0;
  var savingsAssumption = 0.5;
  for (var i = 0; i < drainProducts.length; i++) {
    var d = drainProducts[i];
    var targetRoas = 4.0;
    var currentRoas = d.roas > 0 ? d.roas : 0.1;
    var savingsPct = Math.min((1 - (currentRoas / targetRoas)), savingsAssumption);
    estimatedSavings += d.cost * savingsPct;
  }

  var hiddenWinnersRevenueLift = 0;
  var hiddenWinnersCurrentRoas = 2.0;
  var hiddenWinnersTargetRoas = 6.0;
  for (var i = 0; i < hiddenChampions.length; i++) {
    var h = hiddenChampions[i];
    hiddenWinnersRevenueLift += h.cost * (hiddenWinnersTargetRoas - hiddenWinnersCurrentRoas);
  }

  log('Estimated savings (HIGH severity drains): $' + estimatedSavings.toFixed(2) + ' (50% assumption)');
  log('Estimated revenue lift (hidden winners): $' + hiddenWinnersRevenueLift.toFixed(2));
  log('');
  log('Recommended next steps:');
  log('1. Export top-30 HIGH severity to CSV → update Shopify custom_label_0');
  log('2. Wait 7-14d for Merchant Center sync and repropagation');
  log('3. Monitor PMAX Champions ROAS — expect recovery if zombies demoted');
  log('4. Re-run Script F after iter_2 for delta analysis');
  log('');
  log('Paste this entire output into: reports/' + formatDate(today) + '/product_audit.md');
}

main();
