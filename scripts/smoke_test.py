#!/usr/bin/env python3
"""Smoke test para validar conexión a Google Ads API."""

import os
import sys
import traceback
from pathlib import Path

from dotenv import load_dotenv
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException
from rich.console import Console
from rich.table import Table

console = Console()

load_dotenv(Path(__file__).parent.parent / ".env")


def validate_env_vars():
    """Valida que todas las variables de entorno requeridas estén seteadas."""
    required_vars = [
        "GOOGLE_ADS_DEVELOPER_TOKEN",
        "GOOGLE_ADS_CLIENT_ID",
        "GOOGLE_ADS_CLIENT_SECRET",
        "GOOGLE_ADS_REFRESH_TOKEN",
        "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
        "GOOGLE_ADS_CUSTOMER_ID",
    ]

    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        for var in missing:
            console.print(f"[red]ERROR: {var} no está seteada[/red]")
        sys.exit(1)


def get_client():
    """Crea y retorna el cliente de Google Ads."""
    config = {
        "developer_token": os.getenv("GOOGLE_ADS_DEVELOPER_TOKEN"),
        "client_id": os.getenv("GOOGLE_ADS_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_ADS_CLIENT_SECRET"),
        "refresh_token": os.getenv("GOOGLE_ADS_REFRESH_TOKEN"),
        "login_customer_id": os.getenv("GOOGLE_ADS_LOGIN_CUSTOMER_ID"),
        "use_proto_plus": True,
    }
    return GoogleAdsClient.load_from_dict(config)


def test_customer_info(client):
    """Ejecuta query para obtener información de la cuenta."""
    customer_id = os.getenv("GOOGLE_ADS_CUSTOMER_ID")
    service = client.get_service("GoogleAdsService")

    query = """
    SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone,
        customer.auto_tagging_enabled,
        customer.test_account
    FROM customer
    LIMIT 1
    """

    response = service.search_stream(customer_id=customer_id, query=query)

    for batch in response:
        for row in batch.results:
            customer = row.customer
            table = Table(title="Información de la Cuenta", style="green")
            table.add_column("Campo", style="cyan")
            table.add_column("Valor")

            table.add_row("ID", str(customer.id))
            table.add_row("Nombre", customer.descriptive_name)
            table.add_row("Moneda", customer.currency_code)
            table.add_row("Timezone", customer.time_zone)
            table.add_row("Auto-tagging", str(customer.auto_tagging_enabled))
            table.add_row("Test Account", str(customer.test_account))

            console.print(table)
            return

    console.print("[red]No se pudo obtener información de la cuenta[/red]")


def test_campaigns(client):
    """Ejecuta query para listar campañas."""
    customer_id = os.getenv("GOOGLE_ADS_CUSTOMER_ID")
    service = client.get_service("GoogleAdsService")

    query = """
    SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type
    FROM campaign
    ORDER BY campaign.name
    LIMIT 20
    """

    response = service.search_stream(customer_id=customer_id, query=query)

    campaigns = []
    for batch in response:
        for row in batch.results:
            campaigns.append(row.campaign)

    table = Table(title="Campañas (primeras 20)")
    table.add_column("ID", style="cyan")
    table.add_column("Nombre")
    table.add_column("Status")
    table.add_column("Channel Type")

    if not campaigns:
        console.print(
            "[yellow]Sin campañas visibles — verifica que login_customer_id "
            "(MCC) tenga acceso al customer_id target[/yellow]"
        )
        return

    for campaign in campaigns:
        table.add_row(
            str(campaign.id),
            campaign.name,
            campaign.status.name,
            campaign.advertising_channel_type.name,
        )

    console.print(table)


def main():
    """Función principal."""
    try:
        validate_env_vars()
        client = get_client()

        console.print("[bold green]✓ Cliente de Google Ads inicializado[/bold green]")
        test_customer_info(client)
        console.print()
        test_campaigns(client)
        console.print("[bold green]✓ Smoke test completado exitosamente[/bold green]")

    except GoogleAdsException as ex:
        console.print("[red]Error de Google Ads:[/red]")
        for error in ex.failure.errors:
            console.print(f"  [red]• {error.message}[/red]")
            code_field = error.error_code.WhichOneof("error_code")
            if code_field:
                console.print(f"    Código: {code_field} = {getattr(error.error_code, code_field)}")
        sys.exit(1)

    except Exception as ex:
        console.print("[red]Error inesperado:[/red]")
        console.print(f"[red]{traceback.format_exc()}[/red]")
        sys.exit(1)


if __name__ == "__main__":
    main()
