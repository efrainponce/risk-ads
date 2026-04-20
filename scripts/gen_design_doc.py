#!/usr/bin/env python3
"""
Generate design documentation PDF for risk-ads Google Ads API Basic Access
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT

# Project root
PROJECT_ROOT = "/Users/efrain/Documents/dev/risk-ads"
DOCS_DIR = os.path.join(PROJECT_ROOT, "docs")
PDF_PATH = os.path.join(DOCS_DIR, "design.pdf")

# Create docs directory
os.makedirs(DOCS_DIR, exist_ok=True)

# Create document
doc = SimpleDocTemplate(
    PDF_PATH,
    pagesize=A4,
    rightMargin=2*cm,
    leftMargin=2*cm,
    topMargin=2*cm,
    bottomMargin=2*cm,
)

# Define custom styles
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Heading1'],
    fontSize=18,
    textColor='#000000',
    spaceAfter=6,
    alignment=TA_CENTER,
    fontName='Helvetica-Bold',
)

subtitle_style = ParagraphStyle(
    'CustomSubtitle',
    parent=styles['Heading2'],
    fontSize=11,
    textColor='#333333',
    spaceAfter=12,
    alignment=TA_CENTER,
    fontName='Helvetica-Oblique',
)

heading_style = ParagraphStyle(
    'CustomHeading',
    parent=styles['Heading2'],
    fontSize=13,
    textColor='#000000',
    spaceAfter=8,
    spaceBefore=10,
    fontName='Helvetica-Bold',
)

body_style = ParagraphStyle(
    'CustomBody',
    parent=styles['BodyText'],
    fontSize=10.5,
    textColor='#000000',
    spaceAfter=10,
    alignment=TA_JUSTIFY,
    fontName='Helvetica',
    leading=12,
)

# Build document content
story = []

# Title and Subtitle
story.append(Paragraph("risk-ads — Google Ads API Design Documentation", title_style))
story.append(Paragraph("Internal optimization tool for risktactical.mx", subtitle_style))
story.append(Spacer(1, 0.3*cm))

# Section 1: Overview
story.append(Paragraph("<b>Section 1: Overview</b>", heading_style))
story.append(Paragraph(
    "risk-ads is an internal, single-account optimization tool developed for the owner's own Google Ads account "
    "serving risktactical.mx, a tactical-gear ecommerce store operating in Mexico. The tool is not client-facing, "
    "not a SaaS product, not distributed to third parties. It exists solely to automate performance analysis and "
    "budget reallocation for one account.",
    body_style
))

# Section 2: How the tool uses the Google Ads API
story.append(Paragraph("<b>Section 2: How the tool uses the Google Ads API</b>", heading_style))
story.append(Paragraph(
    "The tool performs two classes of operations via the official google-ads Python SDK (v30):<br/>"
    "<br/>"
    "• <b>Read operations (majority)</b>: pull performance data for campaigns, ad groups, keywords, ads, search terms, "
    "Shopping products, Performance Max asset groups, and segment reports (geo, device, hour).<br/>"
    "• <b>Write operations (limited)</b>: update campaign budgets, pause underperforming keywords and ads, add negative keywords, "
    "adjust bid modifiers.<br/>"
    "<br/>"
    "All writes are subject to hard guardrails (±30% budget change maximum per iteration, ROAS floor of 4.0, learning-phase protection).",
    body_style
))

# Section 3: Architecture
story.append(Paragraph("<b>Section 3: Architecture</b>", heading_style))
story.append(Paragraph(
    "• <b>Language</b>: Python 3.13<br/>"
    "• <b>Local storage</b>: DuckDB (single file, no cloud database)<br/>"
    "• <b>Execution</b>: runs locally on the owner's machine, triggered manually<br/>"
    "• No multi-tenancy, no shared infrastructure, no web UI, no client dashboard<br/>"
    "• No data leaves the owner's machine except for API calls to Google",
    body_style
))

# Section 4: Data usage and privacy
story.append(Paragraph("<b>Section 4: Data usage and privacy</b>", heading_style))
story.append(Paragraph(
    "The tool only accesses data from one Google Ads customer account (Risk Tactical) authenticated via OAuth2. "
    "No third-party data is ingested. No advertising data is shared, resold, or aggregated with other accounts. "
    "Data is stored locally for analysis and discarded or rotated per the owner's discretion.",
    body_style
))

# Section 5: Estimated daily API operations
story.append(Paragraph("<b>Section 5: Estimated daily API operations</b>", heading_style))
story.append(Paragraph(
    "Operations occur on a biweekly cadence (every 14 days), not daily. Per iteration:<br/>"
    "<br/>"
    "• <b>Read</b>: ~50 queries (one per resource type across history windows)<br/>"
    "• <b>Write</b>: ~20–40 mutations (budget updates, keyword status changes)<br/>"
    "<br/>"
    "Averaged to daily: well under 100 operations per day. Peak days (iteration day) remain under 200 operations.",
    body_style
))

# Section 6: Safety mechanisms
story.append(Paragraph("<b>Section 6: Safety mechanisms</b>", heading_style))
story.append(Paragraph(
    "• Dry-run mode is the default for all mutations<br/>"
    "• Circuit breaker disables auto-apply if account ROAS drops below 4.0 or falls more than 20% versus baseline<br/>"
    "• Every mutation is logged with a written justification citing the metric that triggered it (primarily Search Lost IS (Budget) and ROAS)<br/>"
    "• Rollback script can revert the last N mutations",
    body_style
))

# Section 7: Contact
story.append(Paragraph("<b>Section 7: Contact</b>", heading_style))
story.append(Paragraph(
    "<b>Owner and developer</b>: Efrain Ponce<br/>"
    "<b>Email</b>: efrain.ponces@gmail.com<br/>"
    "<b>Account</b>: Risk Tactical (risktactical.mx)<br/>"
    "<b>MCC</b>: Linked and authorized",
    body_style
))

# Build PDF
doc.build(story)

# Print confirmation
print(f"✓ PDF generado: {PDF_PATH}")
