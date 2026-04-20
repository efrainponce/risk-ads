#!/usr/bin/env python3
"""Script para generar refresh_token de Google Ads API."""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from google_auth_oauthlib.flow import InstalledAppFlow
from rich.console import Console
from rich.panel import Panel

console = Console()

SCOPES = ["https://www.googleapis.com/auth/adwords"]


def main() -> None:
    """Genera refresh_token mediante OAuth flow."""
    # Cargar .env desde la raíz del proyecto
    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(env_path)

    # Leer credenciales de env
    client_id = os.getenv("GOOGLE_ADS_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_ADS_CLIENT_SECRET")

    # Validar credenciales
    if not client_id or not client_secret:
        console.print(
            "[red]Error: Falta GOOGLE_ADS_CLIENT_ID o GOOGLE_ADS_CLIENT_SECRET en .env[/red]"
        )
        sys.exit(1)

    try:
        # Construir client_config
        client_config = {
            "installed": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": ["http://localhost"],
            }
        }

        # Crear flow e iniciar servidor local
        flow = InstalledAppFlow.from_client_config(client_config, scopes=SCOPES)
        credentials = flow.run_local_server(
            port=0, prompt="consent", access_type="offline"
        )

        # Verificar refresh_token
        if credentials.refresh_token is None:
            console.print(
                "[red]Error: Google no devolvió refresh_token. "
                "Revoca permisos en https://myaccount.google.com/permissions y vuelve a correr.[/red]"
            )
            sys.exit(1)

        # Mostrar resultado
        panel = Panel(
            f"[green]{credentials.refresh_token}[/green]\n\n"
            "Pega en .env como:\n\n"
            "[cyan]GOOGLE_ADS_REFRESH_TOKEN={token}[/cyan]".format(
                token=credentials.refresh_token
            ),
            title="✓ refresh_token generado",
            style="green",
        )
        console.print(panel)

    except Exception as e:
        console.print(f"[red]Error: {str(e)}[/red]")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
