import pandas as pd
from pathlib import Path
from collections import defaultdict, OrderedDict

INPUT_CSV = Path("/Users/efrain/Documents/dev/risk-ads/data/manual_exports/productos_export.csv")
OUTPUT_CSV = Path("/Users/efrain/Documents/dev/risk-ads/data/manual_exports/matrixify_custom_label_0.csv")
REPORT_DIR = Path("/Users/efrain/Documents/dev/risk-ads/reports/2026-04-20")
REPORT_MD = REPORT_DIR / "matrixify_summary.md"

def parse_roas(roas_str):
    if pd.isna(roas_str) or roas_str == "--":
        return 0.0
    if isinstance(roas_str, str):
        roas_str = roas_str.strip().rstrip("%")
        try:
            return float(roas_str) / 100.0
        except ValueError:
            return 0.0
    return float(roas_str)

def classify_bucket(clicks, roas):
    if clicks < 30:
        return "zombie"
    elif roas >= 8 and clicks >= 100:
        return "champion"
    elif roas >= 4:
        return "winner"
    elif roas >= 2:
        return "improver"
    else:
        return "zombie"

def extract_product_id(item_id):
    try:
        parts = item_id.split("_")
        if len(parts) >= 4 and parts[0] == "shopify" and parts[1] == "mx":
            return parts[2]
    except:
        pass
    return None

def main():
    df = pd.read_csv(INPUT_CSV)

    products = OrderedDict()
    product_order = []
    parse_errors = []

    for idx, row in df.iterrows():
        item_id = row["Item ID"]
        product_id = extract_product_id(item_id)

        if product_id is None:
            parse_errors.append((idx, item_id))
            continue

        if product_id not in products:
            products[product_id] = {
                "title": row["Title"],
                "clicks": 0,
                "impr": 0,
                "orders": 0,
                "revenue": 0.0,
                "cost": 0.0,
            }
            product_order.append(product_id)

        products[product_id]["clicks"] += row["Clicks"]
        products[product_id]["impr"] += row["Impr."]
        products[product_id]["orders"] += row["Orders"]
        products[product_id]["revenue"] += row["Revenue"]
        products[product_id]["cost"] += row["Cost"]

    result = []
    buckets = defaultdict(int)
    bucket_products = defaultdict(list)

    for product_id in product_order:
        data = products[product_id]
        roas = data["revenue"] / data["cost"] if data["cost"] > 0 else 0.0
        bucket = classify_bucket(data["clicks"], roas)
        buckets[bucket] += 1
        bucket_products[bucket].append((product_id, data["cost"], data["revenue"], data["clicks"]))
        result.append({"ID": product_id, "bucket": bucket})

    result_df = pd.DataFrame(result)
    result_df = result_df.rename(columns={"bucket": "Metafield: mm-google-shopping.custom_label_0 [single_line_text_field]"})
    result_df.to_csv(OUTPUT_CSV, index=False, quoting=1)

    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    total_cost = sum(products[pid]["cost"] for pid in products)
    total_revenue = sum(products[pid]["revenue"] for pid in products)

    report = []
    report.append(f"# Matrixify Custom Label 0 Update — {len(products)} Products\n")
    report.append(f"**Unique products:** {len(products)}\n")
    report.append(f"**Total cost (180D):** ${total_cost:,.2f}\n")
    report.append(f"**Total revenue (180D):** ${total_revenue:,.2f}\n\n")

    report.append("## Distribution\n")
    for bucket in ["champion", "winner", "improver", "zombie"]:
        count = buckets.get(bucket, 0)
        report.append(f"- **{bucket.title()}:** {count}\n")

    report.append("\n## Top 5 by Cost per Bucket\n")
    for bucket in ["champion", "winner", "improver", "zombie"]:
        sorted_products = sorted(bucket_products[bucket], key=lambda x: x[1], reverse=True)[:5]
        report.append(f"\n### {bucket.title()}\n")
        for pid, cost, rev, clicks in sorted_products:
            roas = (rev / cost * 100) if cost > 0 else 0
            report.append(f"- {pid}: ${cost:,.2f} cost, ${rev:,.2f} rev ({roas:.0f}% ROAS), {clicks} clicks\n")

    report.append("\n## Matrixify Import Instructions\n")
    report.append("1. Log in to Shopify → Products → Bulk → Upload CSV\n")
    report.append("2. Select file: `matrixify_custom_label_0.csv`\n")
    report.append("3. Map `Metafield: mm-google-shopping.custom_label_0` column → Update\n")

    with open(REPORT_MD, "w", encoding="utf-8") as f:
        f.writelines(report)

    print(f"✓ Unique products: {len(products)}")
    print(f"✓ Champion: {buckets.get('champion', 0)}, Winner: {buckets.get('winner', 0)}, Improver: {buckets.get('improver', 0)}, Zombie: {buckets.get('zombie', 0)}")
    print(f"✓ CSV: {OUTPUT_CSV}")
    print(f"✓ Report: {REPORT_MD}")
    if parse_errors:
        print(f"⚠ Parse errors: {len(parse_errors)}")

    print("\nFirst 3 rows of matrixify CSV:")
    print(result_df.head(3).to_string(index=False))

if __name__ == "__main__":
    main()
