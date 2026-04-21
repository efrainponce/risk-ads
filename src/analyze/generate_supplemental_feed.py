import pandas as pd
from pathlib import Path

def parse_roas(val):
    if pd.isna(val) or val == '' or val == '--':
        return 0.0
    try:
        s = str(val).strip()
        if s.endswith('%'):
            return float(s[:-1]) / 100
        return float(s)
    except:
        return 0.0

def classify(roas: float, clicks: float) -> str:
    if clicks < 30:
        return 'zombie'
    if roas >= 8 and clicks >= 100:
        return 'champion'
    if roas >= 4:
        return 'winner'
    if roas >= 2:
        return 'improver'
    return 'zombie'

def main():
    input_path = Path('data/manual_exports/productos_export.csv')
    output_path = Path('data/manual_exports/merchant_supplemental_feed.csv')

    df = pd.read_csv(input_path, encoding='utf-8')

    df['ROAS_parsed'] = df['ROAS'].apply(parse_roas)
    df['Clicks'] = pd.to_numeric(df['Clicks'], errors='coerce').fillna(0)

    df['custom_label_0'] = df.apply(
        lambda row: classify(row['ROAS_parsed'], row['Clicks']),
        axis=1
    )

    output_df = df[['Item ID', 'custom_label_0']].copy()
    output_df.columns = ['id', 'custom_label_0']

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_df.to_csv(output_path, index=False, encoding='utf-8')

    dist = output_df['custom_label_0'].value_counts().to_dict()
    print(f"Output: {output_path}")
    print(f"Rows: {len(output_df)} (header + {len(output_df) - 1} data)")
    print(f"Distribution: {dist}")
    print("\nFirst 3 data rows:")
    print(output_df.head(3).to_string(index=False))

if __name__ == '__main__':
    main()
