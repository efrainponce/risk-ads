import pandas as pd
from pathlib import Path
from collections import defaultdict

UNLABELED_CSV = Path("/Users/efrain/Documents/dev/risk-ads/data/manual_exports/product_not_labeled.csv")
MASTER_MATRIXIFY = Path("/Users/efrain/Documents/dev/risk-ads/data/manual_exports/matrixify_custom_label_0.csv")
OUTPUT_CSV = Path("/Users/efrain/Documents/dev/risk-ads/data/manual_exports/matrixify_unlabeled_variants.csv")
REPORT_MD = Path("/Users/efrain/Documents/dev/risk-ads/reports/2026-05-04/unlabeled_variants_summary.md")


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


def extract_ids(item_id):
    parts = str(item_id).split("_")
    if len(parts) >= 4 and parts[0] == "shopify" and parts[1] == "mx":
        return parts[2], parts[3]
    return None, None


def main():
    master_df = pd.read_csv(MASTER_MATRIXIFY)
    metafield_col = [c for c in master_df.columns if "custom_label" in c.lower()][0]
    master_df["ID"] = master_df["ID"].astype(str)
    master_lookup = dict(zip(master_df["ID"], master_df[metafield_col]))

    df = pd.read_csv(UNLABELED_CSV, skiprows=2)

    parent_metrics = defaultdict(lambda: {"clicks": 0, "revenue": 0.0, "cost": 0.0})
    for _, row in df.iterrows():
        product_id, variant_id = extract_ids(row["Item ID"])
        if product_id is None:
            continue
        parent_metrics[product_id]["clicks"] += int(row["Clicks"])
        parent_metrics[product_id]["revenue"] += float(row["Revenue"])
        parent_metrics[product_id]["cost"] += float(row["Cost"])

    fallback_buckets = {}
    for pid, m in parent_metrics.items():
        if pid not in master_lookup:
            roas = m["revenue"] / m["cost"] if m["cost"] > 0 else 0.0
            fallback_buckets[pid] = classify_bucket(m["clicks"], roas)

    rows = []
    seen = set()
    bucket_counts = defaultdict(int)
    source_counts = defaultdict(int)

    for _, row in df.iterrows():
        product_id, variant_id = extract_ids(row["Item ID"])
        if product_id is None or variant_id is None:
            continue
        key = (product_id, variant_id)
        if key in seen:
            continue
        seen.add(key)

        if product_id in master_lookup:
            bucket = master_lookup[product_id]
            source = "master"
        else:
            bucket = fallback_buckets[product_id]
            source = "fallback"

        bucket_counts[bucket] += 1
        source_counts[source] += 1
        rows.append({"ID": product_id, "Variant ID": variant_id, "bucket": bucket})

    out_df = pd.DataFrame(rows)
    out_df = out_df.sort_values(["ID", "Variant ID"]).reset_index(drop=True)
    out_df = out_df.rename(columns={"bucket": "Variant Metafield: mm-google-shopping.custom_label_0 [single_line_text_field]"})
    out_df.to_csv(OUTPUT_CSV, index=False, quoting=1)

    REPORT_MD.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        f"# Unlabeled Variants Matrixify Feed — {len(rows)} rows\n\n",
        f"**Output:** `{OUTPUT_CSV}`\n",
        f"**Unique parent products:** {len(parent_metrics)}\n",
        f"**Variants from master classification:** {source_counts['master']}\n",
        f"**Variants from fallback classification:** {source_counts['fallback']}\n\n",
        "## Bucket distribution\n",
    ]
    for bucket in ["champion", "winner", "improver", "zombie"]:
        lines.append(f"- **{bucket.title()}:** {bucket_counts.get(bucket, 0)}\n")

    if fallback_buckets:
        lines.append("\n## Parent products NOT in master (classified by fallback)\n")
        for pid, bucket in sorted(fallback_buckets.items(), key=lambda x: -parent_metrics[x[0]]["revenue"]):
            m = parent_metrics[pid]
            roas = m["revenue"] / m["cost"] if m["cost"] > 0 else 0
            lines.append(f"- `{pid}` → **{bucket}** ({m['clicks']} clicks, ${m['revenue']:.0f} rev, ${m['cost']:.2f} cost, ROAS {roas:.2f})\n")

    REPORT_MD.write_text("".join(lines), encoding="utf-8")

    print(f"✓ Wrote {len(rows)} variants to {OUTPUT_CSV}")
    print(f"  Master: {source_counts['master']} | Fallback: {source_counts['fallback']}")
    print(f"  Buckets: {dict(bucket_counts)}")
    print(f"✓ Report: {REPORT_MD}")


if __name__ == "__main__":
    main()
