import pandas as pd
from pathlib import Path
from collections import defaultdict

UNLABELED_CSV = Path("/Users/efrain/Documents/dev/risk-ads/data/manual_exports/product_not_labeled.csv")
MASTER_MATRIXIFY = Path("/Users/efrain/Documents/dev/risk-ads/data/manual_exports/matrixify_custom_label_0.csv")
OUTPUT_CSV = Path("/Users/efrain/Documents/dev/risk-ads/data/manual_exports/matrixify_unlabeled_products.csv")
REPORT_MD = Path("/Users/efrain/Documents/dev/risk-ads/reports/2026-05-04/unlabeled_products_summary.md")


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
        product_id, _ = extract_ids(row["Item ID"])
        if product_id is None:
            continue
        parent_metrics[product_id]["clicks"] += int(row["Clicks"])
        parent_metrics[product_id]["revenue"] += float(row["Revenue"])
        parent_metrics[product_id]["cost"] += float(row["Cost"])

    rows = []
    bucket_counts = defaultdict(int)
    source_counts = defaultdict(int)

    for pid, m in parent_metrics.items():
        if pid in master_lookup:
            bucket = master_lookup[pid]
            source = "master"
        else:
            roas = m["revenue"] / m["cost"] if m["cost"] > 0 else 0.0
            bucket = classify_bucket(m["clicks"], roas)
            source = "fallback"
        bucket_counts[bucket] += 1
        source_counts[source] += 1
        rows.append({"ID": pid, "bucket": bucket, "_source": source, "_clicks": m["clicks"], "_rev": m["revenue"], "_cost": m["cost"]})

    out_df = pd.DataFrame(rows).sort_values("ID").reset_index(drop=True)
    export_df = out_df[["ID", "bucket"]].rename(columns={"bucket": "Metafield: mm-google-shopping.custom_label_0 [single_line_text_field]"})
    export_df.to_csv(OUTPUT_CSV, index=False, quoting=1)

    REPORT_MD.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        f"# Unlabeled Products Matrixify Feed (PRODUCT-level) — {len(rows)} products\n\n",
        f"**Output:** `{OUTPUT_CSV}`\n",
        f"**From master:** {source_counts['master']} (already labeled, will overwrite — no-op if same)\n",
        f"**From fallback:** {source_counts['fallback']} (new labels)\n\n",
        "## Bucket distribution\n",
    ]
    for bucket in ["champion", "winner", "improver", "zombie"]:
        lines.append(f"- **{bucket.title()}:** {bucket_counts.get(bucket, 0)}\n")

    lines.append("\n## Per-product detail\n")
    for _, row in out_df.iterrows():
        roas = row["_rev"] / row["_cost"] if row["_cost"] > 0 else 0
        lines.append(f"- `{row['ID']}` → **{row['bucket']}** ({row['_source']}, {row['_clicks']} clicks, ${row['_rev']:.0f} rev, ROAS {roas:.2f})\n")

    REPORT_MD.write_text("".join(lines), encoding="utf-8")

    print(f"✓ Wrote {len(rows)} products to {OUTPUT_CSV}")
    print(f"  Master: {source_counts['master']} | Fallback: {source_counts['fallback']}")
    print(f"  Buckets: {dict(bucket_counts)}")
    print(f"✓ Report: {REPORT_MD}")


if __name__ == "__main__":
    main()
