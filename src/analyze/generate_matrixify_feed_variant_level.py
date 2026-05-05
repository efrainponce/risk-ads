import pandas as pd
from pathlib import Path
from collections import defaultdict, OrderedDict

INPUT_CSV = Path("/Users/efrain/Documents/dev/risk-ads/data/manual_exports/productos_export.csv")
OUTPUT_CSV = Path("/Users/efrain/Documents/dev/risk-ads/data/manual_exports/matrixify_custom_label_0_variants.csv")

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

def extract_ids(item_id):
    try:
        parts = item_id.split("_")
        if len(parts) >= 4 and parts[0] == "shopify" and parts[1] == "mx":
            product_id = parts[2]
            variant_id = parts[3]
            return product_id, variant_id
    except:
        pass
    return None, None

def main():
    df = pd.read_csv(INPUT_CSV)

    products = OrderedDict()
    product_order = []
    variants = defaultdict(lambda: {"product_id": None, "seen": False})
    parse_errors = []

    for idx, row in df.iterrows():
        item_id = row["Item ID"]
        product_id, variant_id = extract_ids(item_id)

        if product_id is None or variant_id is None:
            parse_errors.append((idx, item_id))
            continue

        variant_key = (product_id, variant_id)
        variants[variant_key] = {"product_id": product_id, "variant_id": variant_id, "seen": True}

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

    product_buckets = {}
    for product_id in product_order:
        data = products[product_id]
        roas = data["revenue"] / data["cost"] if data["cost"] > 0 else 0.0
        bucket = classify_bucket(data["clicks"], roas)
        product_buckets[product_id] = bucket

    result = []
    seen_variants = set()
    for variant_key, variant_data in variants.items():
        if variant_data["seen"]:
            product_id = variant_data["product_id"]
            variant_id = variant_data["variant_id"]

            variant_tuple = (product_id, variant_id)
            if variant_tuple not in seen_variants:
                bucket = product_buckets.get(product_id, "zombie")
                result.append({
                    "ID": product_id,
                    "Variant ID": variant_id,
                    "bucket": bucket
                })
                seen_variants.add(variant_tuple)

    result_df = pd.DataFrame(result)
    result_df = result_df.rename(columns={"bucket": "Variant Metafield: mm-google-shopping.custom_label_0 [single_line_text_field]"})
    result_df.to_csv(OUTPUT_CSV, index=False, quoting=1)

    print(f"✓ Unique products: {len(products)}")
    print(f"✓ Total variants: {len(result)}")
    print(f"✓ CSV: {OUTPUT_CSV}")
    if parse_errors:
        print(f"⚠ Parse errors: {len(parse_errors)}")

    print("\nFirst 5 rows of matrixify CSV:")
    print(result_df.head(5).to_string(index=False))

if __name__ == "__main__":
    main()
