#!/usr/bin/env python3
"""Q1 YoY comparison report with rich table output."""

import os
import sys
import traceback
from pathlib import Path
from collections import defaultdict

from dotenv import load_dotenv
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException
from rich.console import Console
from rich.table import Table

console = Console()

load_dotenv(Path(__file__).parent.parent / ".env")

PERIODS = [
    {"name": "2025", "start": "2025-01-01", "end": "2025-03-31"},
    {"name": "2026", "start": "2026-01-01", "end": "2026-03-31"},
]


def get_client():
    """Create Google Ads client from env vars."""
    config = {
        "developer_token": os.getenv("GOOGLE_ADS_DEVELOPER_TOKEN"),
        "client_id": os.getenv("GOOGLE_ADS_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_ADS_CLIENT_SECRET"),
        "refresh_token": os.getenv("GOOGLE_ADS_REFRESH_TOKEN"),
        "login_customer_id": os.getenv("GOOGLE_ADS_LOGIN_CUSTOMER_ID"),
        "use_proto_plus": True,
    }
    return GoogleAdsClient.load_from_dict(config)


def fetch_q1_data(client, start_date, end_date):
    """Fetch campaign metrics for given date range."""
    customer_id = os.getenv("GOOGLE_ADS_CUSTOMER_ID")
    service = client.get_service("GoogleAdsService")

    query = f"""
    SELECT
        campaign.id,
        campaign.name,
        campaign.advertising_channel_type,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.impressions,
        metrics.clicks
    FROM campaign
    WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
    """

    data = defaultdict(
        lambda: {
            "channel": None,
            "cost_micros": 0,
            "conversions": 0.0,
            "conversions_value": 0.0,
            "impressions": 0,
            "clicks": 0,
        }
    )

    try:
        response = service.search_stream(customer_id=customer_id, query=query)
        for batch in response:
            for row in batch.results:
                campaign = row.campaign
                metrics = row.metrics
                campaign_name = campaign.name

                if campaign_name not in data:
                    data[campaign_name]["channel"] = campaign.advertising_channel_type.name

                data[campaign_name]["cost_micros"] += metrics.cost_micros
                data[campaign_name]["conversions"] += metrics.conversions
                data[campaign_name]["conversions_value"] += metrics.conversions_value
                data[campaign_name]["impressions"] += metrics.impressions
                data[campaign_name]["clicks"] += metrics.clicks

    except GoogleAdsException as ex:
        console.print("[red]Google Ads API Error:[/red]")
        for error in ex.failure.errors:
            console.print(f"  [red]• {error.message}[/red]")
        sys.exit(1)

    return data


def format_currency(micros):
    """Convert micros to currency string."""
    return micros / 1_000_000


def format_roas(conversions_value, cost):
    """Calculate ROAS or return dash if div-by-zero."""
    if cost == 0:
        return "—"
    return f"{conversions_value / cost:.2f}"


def main():
    """Main execution."""
    try:
        client = get_client()
        console.print("[bold green]✓ Google Ads client initialized[/bold green]\n")

        # Fetch both periods
        data_2025 = fetch_q1_data(client, PERIODS[0]["start"], PERIODS[0]["end"])
        data_2026 = fetch_q1_data(client, PERIODS[1]["start"], PERIODS[1]["end"])

        # Merge campaign names (all campaigns from either period)
        all_campaigns = sorted(
            set(data_2025.keys()) | set(data_2026.keys())
        )

        # Build table
        table = Table(title="Q1 YoY Comparison: 2025 vs 2026")
        table.add_column("Campaign", style="cyan")
        table.add_column("Channel")
        table.add_column("Cost 2025", justify="right")
        table.add_column("Cost 2026", justify="right")
        table.add_column("Cost Δ%", justify="right")
        table.add_column("Rev 2025", justify="right")
        table.add_column("Rev 2026", justify="right")
        table.add_column("Rev Δ%", justify="right")
        table.add_column("ROAS 2025", justify="right")
        table.add_column("ROAS 2026", justify="right")
        table.add_column("Conv 2025", justify="right")
        table.add_column("Conv 2026", justify="right")

        # Sort: by Cost 2026 desc, then Cost 2025 desc for campaigns only in 2025
        def sort_key(campaign_name):
            cost_2026 = format_currency(data_2026[campaign_name]["cost_micros"])
            cost_2025 = format_currency(data_2025[campaign_name]["cost_micros"])
            # Descending by 2026, then descending by 2025
            return (-cost_2026, -cost_2025)

        sorted_campaigns = sorted(all_campaigns, key=sort_key)

        # Per-campaign rows
        totals_cost_2025 = 0.0
        totals_cost_2026 = 0.0
        totals_conv_value_2025 = 0.0
        totals_conv_value_2026 = 0.0
        totals_conv_2025 = 0.0
        totals_conv_2026 = 0.0

        for campaign_name in sorted_campaigns:
            d25 = data_2025[campaign_name]
            d26 = data_2026[campaign_name]

            cost_2025 = format_currency(d25["cost_micros"])
            cost_2026 = format_currency(d26["cost_micros"])

            if cost_2025 == 0 and cost_2026 == 0:
                continue

            rev_2025 = d25["conversions_value"]
            rev_2026 = d26["conversions_value"]

            delta_pct = (
                f"{((cost_2026 - cost_2025) / cost_2025 * 100):.1f}%"
                if cost_2025 > 0
                else "—"
            )
            rev_delta_pct = (
                f"{((rev_2026 - rev_2025) / rev_2025 * 100):.1f}%"
                if rev_2025 > 0
                else "—"
            )

            roas_2025 = format_roas(rev_2025, cost_2025)
            roas_2026 = format_roas(rev_2026, cost_2026)

            conv_2025 = f"{d25['conversions']:.0f}"
            conv_2026 = f"{d26['conversions']:.0f}"

            channel = d26["channel"] or d25["channel"] or "Unknown"

            table.add_row(
                campaign_name,
                channel,
                f"${cost_2025:,.0f}",
                f"${cost_2026:,.0f}",
                delta_pct,
                f"${rev_2025:,.0f}",
                f"${rev_2026:,.0f}",
                rev_delta_pct,
                roas_2025,
                roas_2026,
                conv_2025,
                conv_2026,
            )

            totals_cost_2025 += cost_2025
            totals_cost_2026 += cost_2026
            totals_conv_value_2025 += d25["conversions_value"]
            totals_conv_value_2026 += d26["conversions_value"]
            totals_conv_2025 += d25["conversions"]
            totals_conv_2026 += d26["conversions"]

        # Totals row
        delta_cost_pct = (
            f"{((totals_cost_2026 - totals_cost_2025) / totals_cost_2025 * 100):.1f}%"
            if totals_cost_2025 > 0
            else "—"
        )
        delta_rev_pct = (
            f"{((totals_conv_value_2026 - totals_conv_value_2025) / totals_conv_value_2025 * 100):.1f}%"
            if totals_conv_value_2025 > 0
            else "—"
        )

        roas_total_2025 = format_roas(totals_conv_value_2025, totals_cost_2025)
        roas_total_2026 = format_roas(totals_conv_value_2026, totals_cost_2026)

        table.add_row(
            "[bold]TOTAL[/bold]",
            "",
            f"[bold]${totals_cost_2025:,.0f}[/bold]",
            f"[bold]${totals_cost_2026:,.0f}[/bold]",
            f"[bold]{delta_cost_pct}[/bold]",
            f"[bold]${totals_conv_value_2025:,.0f}[/bold]",
            f"[bold]${totals_conv_value_2026:,.0f}[/bold]",
            f"[bold]{delta_rev_pct}[/bold]",
            f"[bold]{roas_total_2025}[/bold]",
            f"[bold]{roas_total_2026}[/bold]",
            f"[bold]{totals_conv_2025:.0f}[/bold]",
            f"[bold]{totals_conv_2026:.0f}[/bold]",
        )

        console.print(table)

        console.print(f"\n[bold]Revenue Δ%:[/bold] {delta_rev_pct}")
        console.print("[bold green]✓ Report completed successfully[/bold green]")

    except GoogleAdsException as ex:
        console.print("[red]Google Ads API Error:[/red]")
        for error in ex.failure.errors:
            console.print(f"  [red]• {error.message}[/red]")
        sys.exit(1)

    except Exception as ex:
        console.print("[red]Unexpected error:[/red]")
        console.print(f"[red]{traceback.format_exc()}[/red]")
        sys.exit(1)


if __name__ == "__main__":
    main()
