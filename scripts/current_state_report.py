#!/usr/bin/env python3
"""Current state report: L30D performance + budget + Lost IS per campaign."""

import os
import sys
import traceback
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict

from dotenv import load_dotenv
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException
from rich.console import Console
from rich.table import Table

console = Console(width=240)

load_dotenv(Path(__file__).parent.parent / ".env")

# Today: 2026-05-04. L30D window = 2026-04-04 to 2026-05-04
TODAY = datetime(2026, 5, 4)
L30D_START = TODAY - timedelta(days=30)
L30D_START_STR = L30D_START.strftime("%Y-%m-%d")
L30D_END_STR = TODAY.strftime("%Y-%m-%d")


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


def fetch_campaign_data(client):
    """Fetch campaign metrics for L30D with Lost IS metrics."""
    customer_id = os.getenv("GOOGLE_ADS_CUSTOMER_ID")
    service = client.get_service("GoogleAdsService")

    # Query 1: Get performance + Lost IS with date range
    # Including segments.date will split by day, so we'll aggregate in Python
    query = f"""
    SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.impressions,
        metrics.clicks,
        metrics.search_budget_lost_impression_share,
        metrics.search_rank_lost_impression_share,
        metrics.search_impression_share,
        segments.date
    FROM campaign
    WHERE segments.date BETWEEN '{L30D_START_STR}' AND '{L30D_END_STR}'
        AND metrics.impressions > 0
    """

    campaigns_data = defaultdict(
        lambda: {
            "id": None,
            "status": None,
            "channel": None,
            "budget_micros": 0,
            "cost_micros": 0,
            "conversions": 0.0,
            "conversions_value": 0.0,
            "impressions": 0,
            "clicks": 0,
            "lost_is_budget": [],  # Collect all values to avg
            "lost_is_rank": [],
            "search_is": [],
        }
    )

    try:
        response = service.search_stream(customer_id=customer_id, query=query)
        for batch in response:
            for row in batch.results:
                campaign = row.campaign
                metrics = row.metrics
                campaign_name = campaign.name

                if campaigns_data[campaign_name]["id"] is None:
                    campaigns_data[campaign_name]["id"] = campaign.id
                    campaigns_data[campaign_name]["status"] = campaign.status.name
                    campaigns_data[campaign_name]["channel"] = (
                        campaign.advertising_channel_type.name
                    )
                    campaigns_data[campaign_name]["budget_micros"] = (
                        row.campaign_budget.amount_micros
                    )

                # Aggregate metrics (sum over days)
                campaigns_data[campaign_name]["cost_micros"] += metrics.cost_micros
                campaigns_data[campaign_name]["conversions"] += metrics.conversions
                campaigns_data[campaign_name]["conversions_value"] += (
                    metrics.conversions_value
                )
                campaigns_data[campaign_name]["impressions"] += metrics.impressions
                campaigns_data[campaign_name]["clicks"] += metrics.clicks

                # Collect Lost IS percentages (will avg later)
                if metrics.search_budget_lost_impression_share is not None:
                    campaigns_data[campaign_name]["lost_is_budget"].append(
                        metrics.search_budget_lost_impression_share
                    )
                if metrics.search_rank_lost_impression_share is not None:
                    campaigns_data[campaign_name]["lost_is_rank"].append(
                        metrics.search_rank_lost_impression_share
                    )
                if metrics.search_impression_share is not None:
                    campaigns_data[campaign_name]["search_is"].append(
                        metrics.search_impression_share
                    )

    except GoogleAdsException as ex:
        console.print("[red]Google Ads API Error (Query 1):[/red]")
        for error in ex.failure.errors:
            console.print(f"  [red]• {error.message}[/red]")
        sys.exit(1)

    # Now fetch budget details for campaigns that might not appear in Q1
    # (zero impressions or entirely paused)
    query2 = """
    SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        campaign_budget.delivery_method
    FROM campaign
    WHERE campaign.status IN ('ENABLED', 'PAUSED')
    """

    try:
        response = service.search_stream(customer_id=customer_id, query=query2)
        for batch in response:
            for row in batch.results:
                campaign = row.campaign
                campaign_name = campaign.name

                # Always update budget from query2 (more reliable source)
                if campaign_name not in campaigns_data or campaigns_data[campaign_name]["budget_micros"] == 0:
                    campaigns_data[campaign_name]["id"] = campaign.id
                    campaigns_data[campaign_name]["status"] = campaign.status.name
                    campaigns_data[campaign_name]["channel"] = (
                        campaign.advertising_channel_type.name
                    )
                    campaigns_data[campaign_name]["budget_micros"] = (
                        row.campaign_budget.amount_micros
                    )

    except GoogleAdsException as ex:
        console.print("[red]Google Ads API Error (Query 2):[/red]")
        for error in ex.failure.errors:
            console.print(f"  [red]• {error.message}[/red]")
        sys.exit(1)

    return campaigns_data


def format_currency(micros):
    """Convert micros to MXN."""
    return micros / 1_000_000


def format_roas(conversions_value, cost):
    """Calculate ROAS or return dash if div-by-zero."""
    if cost == 0:
        return "—"
    return f"{conversions_value / cost:.2f}"


def avg_list(values):
    """Average a list of values or return None."""
    if not values:
        return None
    return sum(values) / len(values)


def format_percentage(value):
    """Format percentage or return dash."""
    if value is None:
        return "—"
    return f"{value:.1f}%"


def main():
    """Main execution."""
    try:
        client = get_client()
        console.print(
            f"[bold green]✓ Google Ads client initialized[/bold green]\n"
        )

        # Fetch campaign data
        campaigns_data = fetch_campaign_data(client)

        # Filter: skip campaigns where L30D cost = 0 AND budget = 0
        active_campaigns = {
            name: data
            for name, data in campaigns_data.items()
            if not (data["cost_micros"] == 0 and data["budget_micros"] == 0)
        }

        # Sort by L30D cost descending
        sorted_campaigns = sorted(
            active_campaigns.items(),
            key=lambda x: x[1]["cost_micros"],
            reverse=True,
        )

        # Build table
        table = Table(title=f"Current State Report (L30D: {L30D_START_STR} to {L30D_END_STR})", width=240)
        table.add_column("Campaign", style="cyan")
        table.add_column("Type")
        table.add_column("Status")
        table.add_column("Daily Budget (MXN)", justify="right")
        table.add_column("L30D Cost (MXN)", justify="right")
        table.add_column("Avg Daily Spend (MXN)", justify="right")
        table.add_column("% Budget Used", justify="right")
        table.add_column("L30D ROAS", justify="right")
        table.add_column("L30D Conv", justify="right")
        table.add_column("Lost IS Bud (%)", justify="right")
        table.add_column("Lost IS Rank (%)", justify="right")

        # Accumulate totals
        total_daily_budget = 0.0
        total_l30d_cost = 0.0
        total_conv_value = 0.0
        total_conv = 0.0

        for campaign_name, data in sorted_campaigns:
            # Extract fields
            channel = data["channel"] or "Unknown"
            status = data["status"]
            budget_micros = data["budget_micros"]
            cost_micros = data["cost_micros"]
            conversions = data["conversions"]
            conversions_value = data["conversions_value"]

            # Format values
            daily_budget_mxn = format_currency(budget_micros)
            l30d_cost_mxn = format_currency(cost_micros)
            avg_daily_spend = l30d_cost_mxn / 30

            # % Budget Used
            if daily_budget_mxn > 0:
                pct_budget = (avg_daily_spend / daily_budget_mxn) * 100
                pct_budget_str = f"{pct_budget:.1f}%"
            else:
                pct_budget_str = "—"

            # ROAS
            roas = format_roas(conversions_value, l30d_cost_mxn)

            # Lost IS metrics (only for Search/Shopping)
            if channel in ("SEARCH", "SHOPPING"):
                lost_is_bud_val = avg_list(data["lost_is_budget"])
                lost_is_rank_val = avg_list(data["lost_is_rank"])
                lost_is_bud_str = format_percentage(lost_is_bud_val)
                lost_is_rank_str = format_percentage(lost_is_rank_val)
            else:
                lost_is_bud_str = "—"
                lost_is_rank_str = "—"

            # Add row
            table.add_row(
                campaign_name,
                channel,
                status,
                f"{daily_budget_mxn:,.2f}" if daily_budget_mxn > 0 else "—",
                f"{l30d_cost_mxn:,.2f}",
                f"{avg_daily_spend:,.2f}",
                pct_budget_str,
                roas,
                f"{conversions:.0f}",
                lost_is_bud_str,
                lost_is_rank_str,
            )

            # Accumulate totals
            total_daily_budget += daily_budget_mxn
            total_l30d_cost += l30d_cost_mxn
            total_conv_value += conversions_value
            total_conv += conversions

        # Totals row
        total_avg_daily_spend = total_l30d_cost / 30
        if total_daily_budget > 0:
            total_pct_budget = (total_avg_daily_spend / total_daily_budget) * 100
            total_pct_str = f"{total_pct_budget:.1f}%"
        else:
            total_pct_str = "—"
        total_roas = format_roas(total_conv_value, total_l30d_cost)

        table.add_row(
            "[bold]TOTAL[/bold]",
            "",
            "",
            f"[bold]{total_daily_budget:,.2f}[/bold]",
            f"[bold]{total_l30d_cost:,.2f}[/bold]",
            f"[bold]{total_avg_daily_spend:,.2f}[/bold]",
            f"[bold]{total_pct_str}[/bold]",
            f"[bold]{total_roas}[/bold]",
            f"[bold]{total_conv:.0f}[/bold]",
            "",
            "",
        )

        console.print(table)

        # Summary
        monthly_ceiling = 120_000  # MXN
        daily_ceiling = monthly_ceiling / 30  # 4000 MXN/day
        gap_to_ceiling = daily_ceiling - total_avg_daily_spend

        console.print("\n[bold]═══════════════════════════════════════════[/bold]")
        console.print(f"[bold]Total Daily Budget:[/bold] MXN {total_daily_budget:,.2f}")
        console.print(f"[bold]Total Daily Spend (Avg):[/bold] MXN {total_avg_daily_spend:,.2f}")
        console.print(f"[bold]120K Monthly Ceiling (Daily Target):[/bold] MXN {daily_ceiling:,.2f}")
        console.print(
            f"[bold]Gap to Ceiling:[/bold] MXN {gap_to_ceiling:,.2f} "
            f"({'[green]under budget[/green]' if gap_to_ceiling > 0 else '[red]over budget[/red]'})"
        )
        console.print("[bold]═══════════════════════════════════════════[/bold]")

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
