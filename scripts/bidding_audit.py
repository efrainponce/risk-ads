#!/usr/bin/env python3
"""Bidding audit: current bidding strategy + tROAS per enabled campaign."""

import os
import sys
import traceback
from pathlib import Path

from dotenv import load_dotenv
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException
from rich.console import Console
from rich.table import Table

console = Console(width=200)

load_dotenv(Path(__file__).parent.parent / ".env")


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


def fetch_bidding_data(client):
    """Fetch bidding strategy and tROAS for enabled campaigns."""
    customer_id = os.getenv("GOOGLE_ADS_CUSTOMER_ID")
    service = client.get_service("GoogleAdsService")

    query = """
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.bidding_strategy_type,
      campaign.maximize_conversion_value.target_roas,
      campaign.target_roas.target_roas,
      campaign.target_cpa.target_cpa_micros,
      campaign.maximize_conversions.target_cpa_micros
    FROM campaign
    WHERE campaign.status = 'ENABLED'
    """

    campaigns = []

    try:
        response = service.search_stream(customer_id=customer_id, query=query)
        for batch in response:
            for row in batch.results:
                campaign = row.campaign
                campaigns.append({
                    "id": campaign.id,
                    "name": campaign.name,
                    "channel": campaign.advertising_channel_type.name,
                    "bidding_strategy": campaign.bidding_strategy_type.name,
                    "target_roas_mcv": campaign.maximize_conversion_value.target_roas or 0,
                    "target_roas_tr": campaign.target_roas.target_roas or 0,
                    "target_cpa_micros_cpa": campaign.target_cpa.target_cpa_micros or 0,
                    "target_cpa_micros_mc": campaign.maximize_conversions.target_cpa_micros or 0,
                })
    except GoogleAdsException as ex:
        console.print("[red]Google Ads API Error:[/red]")
        for error in ex.failure.errors:
            console.print(f"  [red]• {error.message}[/red]")
        sys.exit(1)

    return campaigns


def format_troas(target_roas_mcv, target_roas_tr):
    """Convert tROAS to percentage or return dash."""
    target_roas = target_roas_mcv if target_roas_mcv > 0 else target_roas_tr
    if target_roas == 0:
        return "—"
    return f"{target_roas * 100:.1f}%"


def format_target_cpa(target_cpa_micros):
    """Convert target CPA from micros to MXN or return dash."""
    if target_cpa_micros == 0:
        return "—"
    return f"{target_cpa_micros / 1_000_000:.2f}"


def main():
    """Main execution."""
    try:
        client = get_client()
        console.print("[bold green]✓ Google Ads client initialized[/bold green]\n")

        campaigns = fetch_bidding_data(client)

        # Sort by name ascending
        sorted_campaigns = sorted(campaigns, key=lambda x: x["name"])

        # Build table
        table = Table(title="Bidding Strategy Audit (ENABLED Campaigns Only)", width=200)
        table.add_column("Campaign", style="cyan")
        table.add_column("Type")
        table.add_column("Bidding Strategy")
        table.add_column("Current tROAS (%)", justify="right")
        table.add_column("Target CPA (MXN)", justify="right")

        for campaign in sorted_campaigns:
            troas_str = format_troas(
                campaign["target_roas_mcv"],
                campaign["target_roas_tr"]
            )

            # Target CPA: use whichever is non-zero
            target_cpa_micros = campaign["target_cpa_micros_cpa"] or campaign["target_cpa_micros_mc"]
            target_cpa_str = format_target_cpa(target_cpa_micros)

            table.add_row(
                campaign["name"],
                campaign["channel"],
                campaign["bidding_strategy"],
                troas_str,
                target_cpa_str,
            )

        console.print(table)
        console.print("[bold green]✓ Bidding audit completed successfully[/bold green]")

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
