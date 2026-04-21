import pandas as pd
from pathlib import Path
from datetime import datetime

def classify(roas: float, clicks: float) -> tuple[str, str]:
    if clicks < 30:
        return ('Zombies', 'insufficient_data_<30_clicks')
    if roas >= 8 and clicks >= 100:
        return ('Champions', 'ROAS>=8_clicks>=100')
    if roas >= 4:
        return ('Winners', 'ROAS>=4')
    if roas >= 2:
        return ('Improvers', 'ROAS_2_to_4')
    return ('Zombies', 'ROAS<2')

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

def parse_number(val, default=0):
    if pd.isna(val) or val == '' or val == '--':
        return default
    try:
        return float(val)
    except:
        return default

def truncate_title(title, max_len=40):
    s = str(title)[:max_len]
    s = s.replace('|', '\\|')
    return s

def main():
    input_path = Path('data/manual_exports/productos_export.csv')
    output_csv = Path('data/manual_exports/productos_classified.csv')
    output_md = Path('reports/2026-04-20/product_classification.md')

    df = pd.read_csv(input_path, encoding='utf-8')

    df['Clicks'] = df['Clicks'].apply(lambda x: parse_number(x, 0))
    df['Orders'] = df['Orders'].apply(lambda x: parse_number(x, 0))
    df['Revenue'] = df['Revenue'].apply(lambda x: parse_number(x, 0))
    df['Cost'] = df['Cost'].apply(lambda x: parse_number(x, 0))
    df['ROAS_parsed'] = df['ROAS'].apply(parse_roas)

    df['Bucket'] = df.apply(lambda row: classify(row['ROAS_parsed'], row['Clicks'])[0], axis=1)
    df['Reason'] = df.apply(lambda row: classify(row['ROAS_parsed'], row['Clicks'])[1], axis=1)

    output_df = df[['Item ID', 'Title', 'Clicks', 'Orders', 'Revenue', 'Cost', 'ROAS_parsed', 'Bucket', 'Reason']].copy()
    output_df.columns = ['Item ID', 'Title', 'Clicks', 'Orders', 'Revenue', 'Cost', 'ROAS', 'Recommended_Bucket', 'Reason']
    output_df['Clicks'] = output_df['Clicks'].astype(int)
    output_df['Orders'] = output_df['Orders'].astype(int)
    output_df['Cost'] = output_df['Cost'].round(2)
    output_df['Revenue'] = output_df['Revenue'].round(2)
    output_df['ROAS'] = output_df['ROAS'].round(2)
    output_df = output_df.sort_values('Cost', ascending=False)

    output_csv.parent.mkdir(parents=True, exist_ok=True)
    output_df.to_csv(output_csv, index=False, encoding='utf-8')

    total_cost = df['Cost'].sum()
    total_revenue = df['Revenue'].sum()
    total_roas = total_revenue / total_cost if total_cost > 0 else 0

    bucket_stats = {}
    for bucket in ['Champions', 'Winners', 'Improvers', 'Zombies']:
        mask = df['Bucket'] == bucket
        bucket_stats[bucket] = {
            'count': mask.sum(),
            'cost': df[mask]['Cost'].sum(),
            'revenue': df[mask]['Revenue'].sum(),
            'roas': df[mask]['Revenue'].sum() / df[mask]['Cost'].sum() if df[mask]['Cost'].sum() > 0 else 0
        }

    zombies_df = df[df['Bucket'] == 'Zombies'].nlargest(30, 'Cost')
    champions_df = df[df['Bucket'] == 'Champions'].nlargest(20, 'Cost')
    winners_df = df[df['Bucket'] == 'Winners'].nlargest(20, 'Cost')
    improvers_df = df[df['Bucket'] == 'Improvers'].nlargest(20, 'Cost')
    improvers_high = df[(df['Bucket'] == 'Improvers') & (df['ROAS_parsed'] >= 3.5)].nlargest(10, 'Cost')

    estimated_saving = 0
    for _, row in zombies_df.iterrows():
        if row['ROAS_parsed'] < 4:
            saving = row['Cost'] * (1 - row['ROAS_parsed'] / 4)
            estimated_saving += min(saving, row['Cost'] * 0.5)

    now = datetime.now()
    md_content = f"""# Product bucket classification — 2026-04-20

Fuente: data/manual_exports/productos_export.csv (90D)
Generado: {now.strftime('%Y-%m-%d %H:%M')}
Método: clasificación por ROAS + clicks (thresholds Hélias adaptados)

## Totales
- Productos analizados: {len(df)}
- Cost total 90D: {total_cost:,.2f} MXN
- Revenue total 90D: {total_revenue:,.2f} MXN
- ROAS total: {total_roas:.2f}

## Distribución por bucket

| Bucket | # productos | Cost 90D | Revenue 90D | ROAS bucket |
|---|---|---|---|---|
| Champions | {bucket_stats['Champions']['count']} | {bucket_stats['Champions']['cost']:,.2f} | {bucket_stats['Champions']['revenue']:,.2f} | {bucket_stats['Champions']['roas']:.2f} |
| Winners | {bucket_stats['Winners']['count']} | {bucket_stats['Winners']['cost']:,.2f} | {bucket_stats['Winners']['revenue']:,.2f} | {bucket_stats['Winners']['roas']:.2f} |
| Improvers | {bucket_stats['Improvers']['count']} | {bucket_stats['Improvers']['cost']:,.2f} | {bucket_stats['Improvers']['revenue']:,.2f} | {bucket_stats['Improvers']['roas']:.2f} |
| Zombies | {bucket_stats['Zombies']['count']} | {bucket_stats['Zombies']['cost']:,.2f} | {bucket_stats['Zombies']['revenue']:,.2f} | {bucket_stats['Zombies']['roas']:.2f} |

## Top-30 drains (Zombies por costo)

Productos con más gasto en el bucket Zombies — candidatos prioritarios a excluir del feed.

| # | Item ID | Title (40ch) | Cost | ROAS | Clicks | Reason |
|---|---|---|---|---|---|---|
"""

    for idx, (_, row) in enumerate(zombies_df.iterrows(), 1):
        md_content += f"| {idx} | {row['Item ID']} | {truncate_title(row['Title'])} | {row['Cost']:.2f} | {row['ROAS_parsed']:.2f} | {int(row['Clicks'])} | {row['Reason']} |\n"

    md_content += "\n## Top-20 Champions por costo\n\nLos productos hero que más revenue generan. Proteger.\n\n| # | Item ID | Title (40ch) | Cost | Revenue | ROAS | Clicks |\n|---|---|---|---|---|---|---|\n"

    for idx, (_, row) in enumerate(champions_df.iterrows(), 1):
        md_content += f"| {idx} | {row['Item ID']} | {truncate_title(row['Title'])} | {row['Cost']:.2f} | {row['Revenue']:.2f} | {row['ROAS_parsed']:.2f} | {int(row['Clicks'])} |\n"

    md_content += "\n## Top-20 Winners por costo\n\n| # | Item ID | Title (40ch) | Cost | Revenue | ROAS | Clicks |\n|---|---|---|---|---|---|---|\n"

    for idx, (_, row) in enumerate(winners_df.iterrows(), 1):
        md_content += f"| {idx} | {row['Item ID']} | {truncate_title(row['Title'])} | {row['Cost']:.2f} | {row['Revenue']:.2f} | {row['ROAS_parsed']:.2f} | {int(row['Clicks'])} |\n"

    md_content += "\n## Top-20 Improvers por costo (candidatos a optimización)\n\n| # | Item ID | Title (40ch) | Cost | Revenue | ROAS | Clicks |\n|---|---|---|---|---|---|---|\n"

    for idx, (_, row) in enumerate(improvers_df.iterrows(), 1):
        md_content += f"| {idx} | {row['Item ID']} | {truncate_title(row['Title'])} | {row['Cost']:.2f} | {row['Revenue']:.2f} | {row['ROAS_parsed']:.2f} | {int(row['Clicks'])} |\n"

    md_content += f"\n## Recomendaciones\n\n- **Ahorro estimado si se excluyen top-30 Zombies por costo:** {estimated_saving:,.2f} MXN — estima cuánto gasto se recupera\n- **Proteger:** top-20 Champions (no tocar, blindar budget)\n- **Graduar:** Improvers con ROAS ≥ 3.5 cerca de Winners (top-10):\n"

    for idx, (_, row) in enumerate(improvers_high.iterrows(), 1):
        md_content += f"  {idx}. {row['Item ID']} — {truncate_title(row['Title'])} (ROAS {row['ROAS_parsed']:.2f}, Cost {row['Cost']:.2f})\n"

    md_content += "\n- **Próximo paso:** bajar `productos_classified.csv`, convertir `Recommended_Bucket` a `custom_label_0` en Shopify, sync Merchant Center\n"

    output_md.parent.mkdir(parents=True, exist_ok=True)
    output_md.write_text(md_content, encoding='utf-8')

    print(f"✓ CSV: {output_csv}")
    print(f"✓ MD: {output_md}")
    print(f"\nBucket distribution:")
    for bucket in ['Champions', 'Winners', 'Improvers', 'Zombies']:
        print(f"  {bucket}: {bucket_stats[bucket]['count']}")
    print(f"\nTotal Cost: {total_cost:,.2f} MXN")
    print(f"Total Revenue: {total_revenue:,.2f} MXN")

if __name__ == "__main__":
    main()
