// Script D — Structure audit · risk-ads · Fase 2 support
// Read-only. Output: Logger.log. Pegar log en reports/{date}/audit.md
// Diagnostica gaps vs estructura target: Brand + Search 4 buckets + Shopping/PMax 4 buckets

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

function getAccountInfo() {
  try {
    var account = AdsApp.currentAccount();
    return {
      name: account.getName(),
      currency: account.getCurrencyCode(),
      timezone: account.getTimeZone()
    };
  } catch (e) {
    log('⚠ Account info skipped: ' + e.toString());
    return { name: '?', currency: '?', timezone: '?' };
  }
}

function getCampaignStats() {
  try {
    var campaignList = [];
    var enabledCount = 0;
    var pausedCount = 0;

    // Search campaigns
    try {
      var searchCampaigns = AdsApp.campaigns()
        .withCondition('Status IN [ENABLED, PAUSED]')
        .get();
      while (searchCampaigns.hasNext()) {
        var camp = searchCampaigns.next();
        enabledCount += camp.isEnabled() ? 1 : 0;
        pausedCount += camp.isPaused() ? 1 : 0;

        var name = camp.getName();
        var status = camp.isEnabled() ? 'ENABLED' : 'PAUSED';
        var type = camp.getAdvertisingChannelType();
        var budget = null;
        var dailyBudget = 0;
        try {
          budget = camp.getBudget();
          dailyBudget = budget ? (budget.getAmount() / 1000000) : 0;
        } catch (e) {}

        var strategy = '-';
        try {
          strategy = camp.getBiddingStrategyType() || '-';
        } catch (e) {}

        var tRoas = null;
        var tCpa = null;
        try {
          var bidStrategy = camp.getBiddingStrategy();
          if (bidStrategy) {
            var strategyName = bidStrategy.getName();
            if (strategyName && strategyName.indexOf('tROAS') > -1) {
              tRoas = bidStrategy.getTargetRoasMultiplier ? bidStrategy.getTargetRoasMultiplier() : null;
            }
            if (strategyName && strategyName.indexOf('tCPA') > -1) {
              tCpa = bidStrategy.getTargetCpaMultiplier ? bidStrategy.getTargetCpaMultiplier() : null;
            }
          }
        } catch (e) {}

        campaignList.push({
          name: name,
          status: status,
          type: type,
          dailyBudget: dailyBudget,
          strategy: strategy,
          tRoas: tRoas,
          tCpa: tCpa,
          campaign: camp
        });
      }
    } catch (e) {}

    // Shopping campaigns
    try {
      var shoppingCampaigns = AdsApp.shoppingCampaigns()
        .withCondition('Status IN [ENABLED, PAUSED]')
        .get();
      while (shoppingCampaigns.hasNext()) {
        var camp = shoppingCampaigns.next();
        enabledCount += camp.isEnabled() ? 1 : 0;
        pausedCount += camp.isPaused() ? 1 : 0;

        var name = camp.getName();
        var status = camp.isEnabled() ? 'ENABLED' : 'PAUSED';
        var type = 'SHOPPING';
        var dailyBudget = 0;
        try {
          var budget = camp.getBudget();
          dailyBudget = budget ? (budget.getAmount() / 1000000) : 0;
        } catch (e) {}

        var strategy = '-';
        try {
          strategy = camp.getBiddingStrategyType() || '-';
        } catch (e) {}

        var tRoas = null;
        var tCpa = null;
        try {
          var bidStrategy = camp.getBiddingStrategy();
          if (bidStrategy) {
            var strategyName = bidStrategy.getName();
            if (strategyName && strategyName.indexOf('tROAS') > -1) {
              tRoas = bidStrategy.getTargetRoasMultiplier ? bidStrategy.getTargetRoasMultiplier() : null;
            }
            if (strategyName && strategyName.indexOf('tCPA') > -1) {
              tCpa = bidStrategy.getTargetCpaMultiplier ? bidStrategy.getTargetCpaMultiplier() : null;
            }
          }
        } catch (e) {}

        campaignList.push({
          name: name,
          status: status,
          type: type,
          dailyBudget: dailyBudget,
          strategy: strategy,
          tRoas: tRoas,
          tCpa: tCpa,
          campaign: camp
        });
      }
    } catch (e) {}

    // PMax campaigns
    try {
      var pmaxCampaigns = AdsApp.performanceMaxCampaigns()
        .withCondition('Status IN [ENABLED, PAUSED]')
        .get();
      while (pmaxCampaigns.hasNext()) {
        var camp = pmaxCampaigns.next();
        enabledCount += camp.isEnabled() ? 1 : 0;
        pausedCount += camp.isPaused() ? 1 : 0;

        var name = camp.getName();
        var status = camp.isEnabled() ? 'ENABLED' : 'PAUSED';
        var type = 'PERFORMANCE_MAX';
        var dailyBudget = 0;
        try {
          var budget = camp.getBudget();
          dailyBudget = budget ? (budget.getAmount() / 1000000) : 0;
        } catch (e) {}

        var strategy = '-';
        try {
          strategy = camp.getBiddingStrategyType() || '-';
        } catch (e) {}

        var tRoas = null;
        var tCpa = null;
        try {
          var bidStrategy = camp.getBiddingStrategy();
          if (bidStrategy) {
            var strategyName = bidStrategy.getName();
            if (strategyName && strategyName.indexOf('tROAS') > -1) {
              tRoas = bidStrategy.getTargetRoasMultiplier ? bidStrategy.getTargetRoasMultiplier() : null;
            }
            if (strategyName && strategyName.indexOf('tCPA') > -1) {
              tCpa = bidStrategy.getTargetCpaMultiplier ? bidStrategy.getTargetCpaMultiplier() : null;
            }
          }
        } catch (e) {}

        campaignList.push({
          name: name,
          status: status,
          type: type,
          dailyBudget: dailyBudget,
          strategy: strategy,
          tRoas: tRoas,
          tCpa: tCpa,
          campaign: camp
        });
      }
    } catch (e) {}

    return {
      campaignList: campaignList,
      enabledCount: enabledCount,
      pausedCount: pausedCount
    };
  } catch (e) {
    log('⚠ Campaign stats skipped: ' + e.toString());
    return { campaignList: [], enabledCount: 0, pausedCount: 0 };
  }
}

function getCampaignL30DMetrics(campaign) {
  try {
    var report = AdsApp.report(
      "SELECT metrics.cost_micros, metrics.conversions_value " +
      "FROM campaign " +
      "WHERE campaign.id = " + campaign.getId() + " AND segments.date DURING LAST_30_DAYS"
    );
    var rows = report.rows();
    var cost = 0;
    var revenue = 0;
    while (rows.hasNext()) {
      var r = rows.next();
      cost = parseInt(r['metrics.cost_micros'], 10) / 1000000;
      revenue = parseFloat(r['metrics.conversions_value']) || 0;
    }
    return { cost: cost, revenue: revenue };
  } catch (e) {
    return { cost: 0, revenue: 0 };
  }
}

function getAdGroupL30DMetrics(adGroup) {
  try {
    var report = AdsApp.report(
      "SELECT metrics.cost_micros, metrics.conversions_value " +
      "FROM ad_group " +
      "WHERE ad_group.id = " + adGroup.getId() + " AND segments.date DURING LAST_30_DAYS"
    );
    var rows = report.rows();
    var cost = 0;
    var revenue = 0;
    while (rows.hasNext()) {
      var r = rows.next();
      cost = parseInt(r['metrics.cost_micros'], 10) / 1000000;
      revenue = parseFloat(r['metrics.conversions_value']) || 0;
    }
    return { cost: cost, revenue: revenue };
  } catch (e) {
    return { cost: 0, revenue: 0 };
  }
}

function getAdGroupsForCampaign(campaign) {
  try {
    var adgroups = campaign.adGroups()
      .withCondition('Status IN [ENABLED, PAUSED]')
      .get();
    var adgroupList = [];

    while (adgroups.hasNext()) {
      var ag = adgroups.next();
      var agName = ag.getName();
      var agStatus = ag.isEnabled() ? 'ENABLED' : 'PAUSED';

      var exactKws = 0, phraseKws = 0, broadKws = 0, negatives = 0;
      var rsaCount = 0, etaCount = 0;

      try {
        var keywords = ag.keywords().get();
        while (keywords.hasNext()) {
          var kw = keywords.next();
          var matchType = kw.getMatchType();
          if (matchType === 'EXACT') exactKws++;
          else if (matchType === 'PHRASE') phraseKws++;
          else if (matchType === 'BROAD') broadKws++;
        }
      } catch (e) {}

      try {
        var negKws = ag.negativeKeywords().get();
        while (negKws.hasNext()) {
          negKws.next();
          negatives++;
        }
      } catch (e) {}

      try {
        var ads = ag.ads().get();
        while (ads.hasNext()) {
          var ad = ads.next();
          if (ad.isType().EXPANDED_TEXT_AD) {
            etaCount++;
          } else if (ad.isType().RESPONSIVE_SEARCH_AD) {
            rsaCount++;
          }
        }
      } catch (e) {}

      var metrics = getAdGroupL30DMetrics(ag);
      var roas = calcRoas(metrics.cost, metrics.revenue);

      adgroupList.push({
        name: agName,
        status: agStatus,
        exactKws: exactKws,
        phraseKws: phraseKws,
        broadKws: broadKws,
        negatives: negatives,
        rsaCount: rsaCount,
        etaCount: etaCount,
        cost: metrics.cost,
        roas: roas,
        campaign: campaign,
        adgroup: ag
      });
    }

    return adgroupList;
  } catch (e) {
    return [];
  }
}

function getSharedNegativeLists() {
  try {
    var lists = AdsApp.negativeKeywordLists().get();
    var listData = [];
    while (lists.hasNext()) {
      var list = lists.next();
      var name = list.getName();
      var keywords = list.keywords().get();
      var count = 0;
      while (keywords.hasNext()) {
        keywords.next();
        count++;
      }
      var campaigns = list.campaigns().get();
      var campCount = 0;
      while (campaigns.hasNext()) {
        campaigns.next();
        campCount++;
      }
      listData.push({
        name: name,
        keywordCount: count,
        campaignCount: campCount
      });
    }
    return listData;
  } catch (e) {
    log('⚠ Negative keyword lists skipped: ' + e.toString());
    return [];
  }
}

function getCampaignNegativeLists(campaign) {
  try {
    var lists = campaign.negativeKeywordLists().get();
    var count = 0;
    while (lists.hasNext()) {
      lists.next();
      count++;
    }
    return count;
  } catch (e) {
    return 0;
  }
}

function getAudiencesForCampaign(campaign) {
  try {
    var audiences = campaign.targeting().getTargetingCriteria();
    var targetingAudiences = [];
    var observationAudiences = [];

    for (var i = 0; i < audiences.length; i++) {
      var aud = audiences[i];
      if (aud.getAudienceType) {
        var isTargeting = aud.isTargeting && aud.isTargeting();
        var audName = aud.getName ? aud.getName() : 'Unknown';
        if (isTargeting) {
          targetingAudiences.push(audName);
        } else {
          observationAudiences.push(audName);
        }
      }
    }

    return {
      targeting: targetingAudiences,
      observation: observationAudiences
    };
  } catch (e) {
    return { targeting: [], observation: [] };
  }
}

function getExtensionsForAccount() {
  try {
    var extensions = {
      sitelinks: 0,
      callouts: 0,
      snippets: 0,
      promotions: 0,
      prices: 0,
      images: 0,
      logos: 0
    };

    try {
      var sitelinks = AdsApp.extensions().sitelinks().get();
      while (sitelinks.hasNext()) { sitelinks.next(); extensions.sitelinks++; }
    } catch (e) {}

    try {
      var callouts = AdsApp.extensions().callouts().get();
      while (callouts.hasNext()) { callouts.next(); extensions.callouts++; }
    } catch (e) {}

    try {
      var snippets = AdsApp.extensions().structuredSnippets().get();
      while (snippets.hasNext()) { snippets.next(); extensions.snippets++; }
    } catch (e) {}

    try {
      var promo = AdsApp.extensions().promotions().get();
      while (promo.hasNext()) { promo.next(); extensions.promotions++; }
    } catch (e) {}

    try {
      var prices = AdsApp.extensions().prices().get();
      while (prices.hasNext()) { prices.next(); extensions.prices++; }
    } catch (e) {}

    try {
      var images = AdsApp.extensions().images().get();
      while (images.hasNext()) { images.next(); extensions.images++; }
    } catch (e) {}

    try {
      var logos = AdsApp.extensions().logos().get();
      while (logos.hasNext()) { logos.next(); extensions.logos++; }
    } catch (e) {}

    return extensions;
  } catch (e) {
    log('⚠ Account-level extensions skipped: ' + e.toString());
    return { sitelinks: 0, callouts: 0, snippets: 0, promotions: 0, prices: 0, images: 0, logos: 0 };
  }
}

function getExtensionsForCampaign(campaign) {
  try {
    var extensions = {
      sitelinks: 0,
      callouts: 0,
      snippets: 0
    };

    try {
      var sitelinks = campaign.extensions().sitelinks().get();
      while (sitelinks.hasNext()) { sitelinks.next(); extensions.sitelinks++; }
    } catch (e) {}

    try {
      var callouts = campaign.extensions().callouts().get();
      while (callouts.hasNext()) { callouts.next(); extensions.callouts++; }
    } catch (e) {}

    try {
      var snippets = campaign.extensions().structuredSnippets().get();
      while (snippets.hasNext()) { snippets.next(); extensions.snippets++; }
    } catch (e) {}

    return extensions;
  } catch (e) {
    return { sitelinks: 0, callouts: 0, snippets: 0 };
  }
}

function getDeviceBidAdjustments(campaign) {
  try {
    var adjustments = campaign.targeting().getTargetingCriteria();
    var devices = {};
    for (var i = 0; i < adjustments.length; i++) {
      var adj = adjustments[i];
      if (adj.getDeviceType) {
        var device = adj.getDeviceType();
        var bidMult = adj.getBidModifier ? adj.getBidModifier() : null;
        if (bidMult !== null) {
          devices[device] = bidMult;
        }
      }
    }
    return devices;
  } catch (e) {
    return {};
  }
}

function getShoppingAdGroups(campaign) {
  try {
    var adgroups = campaign.adGroups().get();
    var partitions = [];
    while (adgroups.hasNext()) {
      var ag = adgroups.next();
      try {
        var listingGroups = ag.productPartitions().get();
        var groupCount = 0;
        while (listingGroups.hasNext()) {
          listingGroups.next();
          groupCount++;
        }
        partitions.push({ adgroupName: ag.getName(), partitionCount: groupCount });
      } catch (e) {}
    }
    return partitions;
  } catch (e) {
    return [];
  }
}

function detectTargetStructure(campaignList) {
  var structure = {
    hasBrand: false,
    hasGenericCore: false,
    hasGenericExplore: false,
    hasCompetitor: false,
    shoppingBuckets: []
  };

  for (var i = 0; i < campaignList.length; i++) {
    var camp = campaignList[i];
    var name = camp.name.toUpperCase();

    if (name.indexOf('BRAND') > -1) {
      structure.hasBrand = true;
    }
    if (name.indexOf('GENERIC CORE') > -1 || name.indexOf('EXACT') > -1) {
      structure.hasGenericCore = true;
    }
    if (name.indexOf('GENERIC EXPLORE') > -1 || name.indexOf('BROAD') > -1) {
      structure.hasGenericExplore = true;
    }
    if (name.indexOf('COMPETITOR') > -1) {
      structure.hasCompetitor = true;
    }

    var bucket = name.indexOf('CHAMPION') > -1 ? 'Champions' :
                 name.indexOf('WINNER') > -1 ? 'Winners' :
                 name.indexOf('IMPROVER') > -1 ? 'Improvers' :
                 name.indexOf('ZOMBIE') > -1 ? 'Zombies' : null;
    if (bucket && structure.shoppingBuckets.indexOf(bucket) === -1) {
      structure.shoppingBuckets.push(bucket);
    }
  }

  return structure;
}

function main() {
  var today = new Date();

  log('\n');
  log('=== SCRIPT D: STRUCTURE AUDIT ===');
  log('Generated: ' + formatDate(today));
  log('');

  // === Section 1: Account overview
  log('=== Section 1: Account overview ===');
  try {
    var accountInfo = getAccountInfo();
    var cachedStats = getCampaignStats();
    var totalAdGroups = 0;

    for (var i = 0; i < cachedStats.campaignList.length; i++) {
      var adgroups = getAdGroupsForCampaign(cachedStats.campaignList[i].campaign);
      totalAdGroups += adgroups.length;
    }

    log('');
    log('Account: ' + accountInfo.name);
    log('Currency: ' + accountInfo.currency);
    log('Timezone: ' + accountInfo.timezone);
    log('Total active campaigns (ENABLED): ' + cachedStats.enabledCount);
    log('Total paused campaigns: ' + cachedStats.pausedCount);
    log('Total ad groups: ' + totalAdGroups);
  } catch (e) {
    log('⚠ Section 1 skipped: ' + e.toString());
  }

  // === Section 2: Campaigns table
  log('');
  log('=== Section 2: Campaigns table (L30D metrics) ===');
  try {
    var campaignStats = cachedStats;
    var campaignMetrics = [];

    for (var i = 0; i < campaignStats.campaignList.length; i++) {
      var campData = campaignStats.campaignList[i];
      var metrics = getCampaignL30DMetrics(campData.campaign);
      var roas = calcRoas(metrics.cost, metrics.revenue);

      campaignMetrics.push({
        name: campData.name,
        type: campData.type,
        status: campData.status,
        dailyBudget: campData.dailyBudget,
        strategy: campData.strategy,
        tRoas: campData.tRoas,
        tCpa: campData.tCpa,
        cost: metrics.cost,
        roas: roas
      });
    }

    campaignMetrics.sort(function(a, b) { return b.cost - a.cost; });

    log('');
    log(padRight('Campaign', 25) + ' | ' +
        padRight('Type', 12) + ' | ' +
        padRight('Status', 9) + ' | ' +
        padRight('Daily', 10) + ' | ' +
        padRight('Strategy', 15) + ' | ' +
        padRight('tROAS', 8) + ' | ' +
        padRight('tCPA', 8) + ' | ' +
        padRight('Cost L30D', 12) + ' | ' +
        padRight('ROAS L30D', 10));
    log(Array(130).join('-'));

    for (var i = 0; i < campaignMetrics.length; i++) {
      var c = campaignMetrics[i];
      var tRoasStr = c.tRoas != null ? c.tRoas.toFixed(2) : '-';
      var tCpaStr = c.tCpa != null ? c.tCpa.toFixed(2) : '-';
      log(padRight(c.name.substring(0, 24), 25) + ' | ' +
          padRight(c.type, 12) + ' | ' +
          padRight(c.status, 9) + ' | ' +
          padRight(c.dailyBudget.toFixed(0), 10) + ' | ' +
          padRight(c.strategy, 15) + ' | ' +
          padRight(tRoasStr, 8) + ' | ' +
          padRight(tCpaStr, 8) + ' | ' +
          padRight(formatNum(c.cost), 12) + ' | ' +
          padRight(c.roas.toFixed(2), 10));
    }
  } catch (e) {
    log('⚠ Section 2 skipped: ' + e.toString());
  }

  // === Section 3: Ad groups per campaign
  log('');
  log('=== Section 3: Ad groups per campaign ===');
  try {
    var campaignStats = cachedStats;

    for (var i = 0; i < campaignStats.campaignList.length; i++) {
      var campData = campaignStats.campaignList[i];
      var adgroups = getAdGroupsForCampaign(campData.campaign);

      log('');
      log('Campaign: ' + campData.name);
      log(padRight('AdGroup', 22) + ' | ' +
          padRight('Status', 9) + ' | ' +
          padRight('EXACT', 6) + ' | ' +
          padRight('PHRASE', 6) + ' | ' +
          padRight('BROAD', 6) + ' | ' +
          padRight('Neg', 4) + ' | ' +
          padRight('RSA', 4) + ' | ' +
          padRight('ETA', 4) + ' | ' +
          padRight('Cost', 10) + ' | ' +
          padRight('ROAS', 8));
      log(Array(90).join('-'));

      for (var j = 0; j < adgroups.length; j++) {
        var ag = adgroups[j];
        var flag = '';
        if (ag.rsaCount === 0 && (ag.exactKws > 0 || ag.phraseKws > 0 || ag.broadKws > 0)) {
          flag = ' [!no RSA]';
        }
        if (ag.broadKws > 0 && !campData.tRoas) {
          flag += ' [!broad w/o tROAS]';
        }

        log(padRight(ag.name.substring(0, 21), 22) + ' | ' +
            padRight(ag.status, 9) + ' | ' +
            padRight(ag.exactKws.toString(), 6) + ' | ' +
            padRight(ag.phraseKws.toString(), 6) + ' | ' +
            padRight(ag.broadKws.toString(), 6) + ' | ' +
            padRight(ag.negatives.toString(), 4) + ' | ' +
            padRight(ag.rsaCount.toString(), 4) + ' | ' +
            padRight(ag.etaCount.toString(), 4) + ' | ' +
            padRight(formatNum(ag.cost), 10) + ' | ' +
            padRight(ag.roas.toFixed(2), 8) + flag);
      }

      if (adgroups.length === 0) {
        log('(none)');
      }
    }
  } catch (e) {
    log('⚠ Section 3 skipped: ' + e.toString());
  }

  // === Section 4: Negative keyword lists
  log('');
  log('=== Section 4: Negative keyword lists ===');
  try {
    var lists = getSharedNegativeLists();

    if (lists.length === 0) {
      log('(none)');
    } else {
      log('');
      log(padRight('List Name', 30) + ' | ' +
          padRight('Keywords', 10) + ' | ' +
          padRight('Campaigns', 10));
      log(Array(60).join('-'));

      for (var i = 0; i < lists.length; i++) {
        var list = lists[i];
        log(padRight(list.name.substring(0, 29), 30) + ' | ' +
            padRight(list.keywordCount.toString(), 10) + ' | ' +
            padRight(list.campaignCount.toString(), 10));
      }
    }

    log('');
    log('Search campaigns with ZERO shared negative lists:');
    var campaignStats = cachedStats;
    var flaggedCampaigns = [];
    for (var i = 0; i < campaignStats.campaignList.length; i++) {
      var campData = campaignStats.campaignList[i];
      if (campData.type === 'SEARCH') {
        var negCount = getCampaignNegativeLists(campData.campaign);
        if (negCount === 0) {
          flaggedCampaigns.push(campData.name);
        }
      }
    }

    if (flaggedCampaigns.length === 0) {
      log('(none)');
    } else {
      for (var i = 0; i < flaggedCampaigns.length; i++) {
        log('  • ' + flaggedCampaigns[i]);
      }
    }
  } catch (e) {
    log('⚠ Section 4 skipped: ' + e.toString());
  }

  // === Section 5: Audiences
  log('');
  log('=== Section 5: Audiences per campaign ===');
  try {
    var campaignStats = cachedStats;
    var campaignsWithoutObservation = [];

    for (var i = 0; i < campaignStats.campaignList.length; i++) {
      var campData = campaignStats.campaignList[i];
      var audiences = getAudiencesForCampaign(campData.campaign);

      log('');
      log('Campaign: ' + campData.name);
      log('  Targeting: ' + (audiences.targeting.length > 0 ? audiences.targeting.join(', ') : '(none)'));
      log('  Observation: ' + (audiences.observation.length > 0 ? audiences.observation.join(', ') : '(none)'));

      if (audiences.observation.length === 0 && campData.type === 'SEARCH') {
        campaignsWithoutObservation.push(campData.name);
      }
    }

    if (campaignsWithoutObservation.length > 0) {
      log('');
      log('Search campaigns with ZERO observation audiences:');
      for (var i = 0; i < campaignsWithoutObservation.length; i++) {
        log('  • ' + campaignsWithoutObservation[i]);
      }
    }
  } catch (e) {
    log('⚠ Section 5 skipped: ' + e.toString());
  }

  // === Section 6: Extensions / Assets
  log('');
  log('=== Section 6: Extensions / Assets ===');
  try {
    var accountExt = getExtensionsForAccount();
    log('');
    log('Account-level asset counts:');
    log('  Sitelinks: ' + accountExt.sitelinks);
    log('  Callouts: ' + accountExt.callouts);
    log('  Structured snippets: ' + accountExt.snippets);
    log('  Promotions: ' + accountExt.promotions);
    log('  Prices: ' + accountExt.prices);
    log('  Images: ' + accountExt.images);
    log('  Logos: ' + accountExt.logos);

    log('');
    log('Search campaign-level extensions:');
    var campaignStats = cachedStats;
    var flaggedCampaigns = [];

    for (var i = 0; i < campaignStats.campaignList.length; i++) {
      var campData = campaignStats.campaignList[i];
      if (campData.type === 'SEARCH') {
        var ext = getExtensionsForCampaign(campData.campaign);
        var flag = '';
        if (ext.sitelinks === 0) flag += ' [!no sitelinks]';
        if (ext.callouts === 0) flag += ' [!no callouts]';

        log('  ' + campData.name + ': sitelinks=' + ext.sitelinks + ', callouts=' + ext.callouts + ', snippets=' + ext.snippets + flag);

        if (ext.sitelinks === 0 || ext.callouts === 0) {
          flaggedCampaigns.push(campData.name);
        }
      }
    }
  } catch (e) {
    log('⚠ Section 6 skipped: ' + e.toString());
  }

  // === Section 7: Bid adjustments
  log('');
  log('=== Section 7: Bid adjustments ===');
  try {
    var campaignStats = cachedStats;

    for (var i = 0; i < campaignStats.campaignList.length; i++) {
      var campData = campaignStats.campaignList[i];
      if (campData.type === 'SEARCH') {
        log('');
        log('Campaign: ' + campData.name);

        var devices = getDeviceBidAdjustments(campData.campaign);
        if (Object.keys(devices).length === 0) {
          log('  Device adjustments: (none) [!opportunity for device bid adjustments]');
        } else {
          for (var device in devices) {
            log('  ' + device + ': ' + devices[device].toFixed(2) + 'x');
          }
        }
      }
    }
  } catch (e) {
    log('⚠ Section 7 skipped: ' + e.toString());
  }

  // === Section 8: Shopping / PMax structure
  log('');
  log('=== Section 8: Shopping / PMax structure ===');
  try {
    var campaignStats = cachedStats;

    for (var i = 0; i < campaignStats.campaignList.length; i++) {
      var campData = campaignStats.campaignList[i];
      if (campData.type === 'SHOPPING' || campData.type === 'PERFORMANCE_MAX') {
        log('');
        log('Campaign: ' + campData.name + ' (' + campData.type + ')');

        var partitions = getShoppingAdGroups(campData.campaign);
        var totalPartitions = 0;
        for (var j = 0; j < partitions.length; j++) {
          totalPartitions += partitions[j].partitionCount;
        }

        log('  Ad groups: ' + partitions.length);
        log('  Total listing groups/asset groups: ' + totalPartitions);

        if (campData.type === 'PERFORMANCE_MAX' && campData.name.toUpperCase().indexOf('CHAMPION') === -1 &&
            campData.name.toUpperCase().indexOf('WINNER') === -1 &&
            campData.name.toUpperCase().indexOf('IMPROVER') === -1 &&
            campData.name.toUpperCase().indexOf('ZOMBIE') === -1) {
          log('  [!not named by bucket]');
        }
      }
    }
  } catch (e) {
    log('⚠ Section 8 skipped: ' + e.toString());
  }

  // === Section 9: Gaps vs target structure
  log('');
  log('=== Section 9: Gaps vs target structure ===');
  try {
    var campaignStats = cachedStats;
    var structure = detectTargetStructure(campaignStats.campaignList);

    log('');
    log('Target structure checklist:');
    log('');
    log('Search campaigns:');
    log('  ' + (structure.hasBrand ? '✓' : '❌') + ' Brand campaign');
    log('  ' + (structure.hasGenericCore ? '✓' : '❌') + ' Generic Core (EXACT, tROAS>=4.5)');
    log('  ' + (structure.hasGenericExplore ? '✓' : '❌') + ' Generic Explore (BROAD/PHRASE)');
    log('  ' + (structure.hasCompetitor ? '✓' : '❌') + ' Competitor/Brand terms');

    log('');
    log('Shopping/PMax campaigns (4 buckets):');
    log('  ' + (structure.shoppingBuckets.indexOf('Champions') > -1 ? '✓' : '❌') + ' Champions');
    log('  ' + (structure.shoppingBuckets.indexOf('Winners') > -1 ? '✓' : '❌') + ' Winners');
    log('  ' + (structure.shoppingBuckets.indexOf('Improvers') > -1 ? '✓' : '❌') + ' Improvers');
    log('  ' + (structure.shoppingBuckets.indexOf('Zombies') > -1 ? '✓' : '❌') + ' Zombies');

    log('');
    log('Recommendations (next steps):');
    var recommendations = [];

    if (!structure.hasBrand) {
      recommendations.push('1. Create Brand campaign (separate brand keywords from Search)');
    }
    if (!structure.hasGenericCore) {
      recommendations.push('2. Create Generic Core campaign (EXACT only, tROAS 4.5+)');
    }
    if (!structure.hasGenericExplore) {
      recommendations.push('3. Create Generic Explore campaign (BROAD/PHRASE, lower cap)');
    }
    if (!structure.hasCompetitor) {
      recommendations.push('4. Create Competitor campaign (monitor competitor brand terms)');
    }

    var shoppingBucketsNeeded = [];
    if (structure.shoppingBuckets.indexOf('Champions') === -1) shoppingBucketsNeeded.push('Champions');
    if (structure.shoppingBuckets.indexOf('Winners') === -1) shoppingBucketsNeeded.push('Winners');
    if (structure.shoppingBuckets.indexOf('Improvers') === -1) shoppingBucketsNeeded.push('Improvers');
    if (structure.shoppingBuckets.indexOf('Zombies') === -1) shoppingBucketsNeeded.push('Zombies');

    if (shoppingBucketsNeeded.length > 0) {
      recommendations.push('5. Segment Shopping/PMax by buckets (' + shoppingBucketsNeeded.join(', ') + ')');
    }

    if (recommendations.length === 0) {
      log('  ✓ Target structure complete');
    } else {
      for (var i = 0; i < recommendations.length; i++) {
        log('  ' + recommendations[i]);
      }
    }
  } catch (e) {
    log('⚠ Section 9 skipped: ' + e.toString());
  }

  log('');
  log('=== END AUDIT ===');
}

main();
