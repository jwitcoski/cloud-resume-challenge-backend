"""Generate cover letter Word document for FEMA IC-13 Geospatial announcement."""
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Inches, Pt

OUTPUT_DIR = Path(__file__).parent / "public"
DOCX_PATH = OUTPUT_DIR / "Jonathan_Witcoski_Cover_Letter_FEMA_872191600.docx"


def set_run_font(run, size=11, bold=False, italic=False):
    run.font.name = "Calibri"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic


def add_paragraph(doc, text="", bold=False, italic=False, align=None, space_after=8):
    p = doc.add_paragraph()
    if align is not None:
        p.alignment = align
    p.paragraph_format.space_after = Pt(space_after)
    if text:
        run = p.add_run(text)
        set_run_font(run, bold=bold, italic=italic)
    return p


def build_document() -> Path:
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)

    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)

    add_paragraph(doc, "Jonathan Witcoski", bold=True, space_after=2)
    add_paragraph(
        doc,
        "jwitcoski@gmail.com | (570) 582-3933",
        space_after=2,
    )
    add_paragraph(
        doc,
        "Washington, DC metropolitan area",
        space_after=12,
    )

    add_paragraph(doc, "June 14, 2026", space_after=12)

    add_paragraph(doc, "Hiring Manager", space_after=2)
    add_paragraph(doc, "Federal Emergency Management Agency", space_after=2)
    add_paragraph(doc, "Hazard Mitigation Assistance Division", space_after=2)
    add_paragraph(doc, "Washington, DC", space_after=12)

    subject = add_paragraph(doc, space_after=12)
    subject_run = subject.add_run(
        "Re: Emergency Management Specialist (Geospatial), IC-13 — "
        "Announcement FEMA-AK-12979370-CORE"
    )
    set_run_font(subject_run, bold=True)

    add_paragraph(doc, "Dear Hiring Manager:", space_after=8)

    paragraphs = [
        (
            "I am applying for the Emergency Management Specialist (Geospatial) position "
            "in FEMA's Mitigation Directorate. I bring more than 15 years of GIS experience "
            "supporting federal missions, including direct work with FEMA and the Department "
            "of Homeland Security on disaster response operations. I am motivated by FEMA's "
            "mission to help communities become more resilient and to reduce disaster suffering, "
            "and I am prepared to support that work as a CORE employee in the National Capital Region."
        ),
        (
            "At Booz Allen Hamilton, I supported FEMA and DHS by building maps, spatial analysis "
            "workflows, and web GIS tools used during major disaster events. That work required "
            "analyzing operational challenges in fast-moving environments and delivering geospatial "
            "products that supported situational awareness and decision-making. Since then, I have "
            "strengthened the technical skills this role requires through federal and enterprise GIS "
            "work at the U.S. Census Bureau and, currently, at DRT Strategies supporting CDC public "
            "health surveillance programs. In these roles, I have used Esri ArcGIS Enterprise, Python, "
            "R, SQL, SQL Server, PostgreSQL/PostGIS, and Power BI to build databases, ETL pipelines, "
            "dashboards, and web mapping applications that turn complex spatial data into actionable "
            "information."
        ),
        (
            "I also have a consistent record of collaborating across organizations to deliver results. "
            "As GIS Data Engineer and Scrum Master at Saicon, I led Agile delivery of a large utility "
            "GIS migration and coordinated with stakeholders on data quality and milestone completion. "
            "At CDC, I work with program teams on enterprise GIS standards, automation, and application "
            "maintenance. I am comfortable facilitating technical work across diverse partners and "
            "translating geospatial requirements into reliable solutions."
        ),
        (
            "I hold a Master of Science in Geography from the University of Tennessee and a Bachelor "
            "of Arts in Geography and Anthropology with a GIS minor from Pennsylvania State University. "
            "I understand that CORE positions may require deployment with limited notice and extended "
            "travel, and I am willing and able to meet those expectations."
        ),
        (
            "Thank you for your consideration. My resume provides additional detail on my qualifications. "
            "I welcome the opportunity to discuss how my FEMA-related GIS experience and current federal "
            "geospatial work can support the Hazard Mitigation Assistance Division."
        ),
    ]

    for text in paragraphs:
        add_paragraph(doc, text, space_after=8)

    add_paragraph(doc, "Sincerely,", space_after=18)
    add_paragraph(doc, "Jonathan Witcoski", space_after=0)

    doc.save(DOCX_PATH)
    return DOCX_PATH


if __name__ == "__main__":
    path = build_document()
    print(f"Saved Word: {path}")
