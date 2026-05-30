"""
AI智能组卷 — 文档导出服务
POST /export/docx  → 生成 DOCX
POST /export/pdf   → 生成 PDF (需 LibreOffice)
"""

import io
import os
import subprocess
import tempfile
from flask import Flask, request, jsonify, send_file

app = Flask(__name__)

# ── DOCX Generation ──────────────────────────────────────────

@app.route("/export/docx", methods=["POST"])
def export_docx():
    """
    Request JSON:
    {
      "title": "试卷标题",
      "subject": "数学",
      "grade": "五年级",
      "questions": [
        {
          "index": 1,
          "type": "single_choice",
          "content": "题目正文",
          "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
          "answer": "A",
          "analysis": "解析内容",
          "score": 5
        }
      ]
    }
    """
    try:
        data = request.get_json()
        title = data.get("title", "试卷")
        questions = data.get("questions", [])

        doc_bytes = generate_docx(title, questions)

        filename = f"{title}.docx"
        return send_file(
            io.BytesIO(doc_bytes),
            mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            as_attachment=True,
            download_name=filename,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def generate_docx(title: str, questions: list) -> bytes:
    """Generate A4 DOCX with paper formatting."""
    from docx import Document
    from docx.shared import Pt, Mm, Cm
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn

    doc = Document()

    # Page setup: A4
    section = doc.sections[0]
    section.page_width = Mm(210)
    section.page_height = Mm(297)
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(2.0)
    section.right_margin = Cm(2.0)

    # Default font
    style = doc.styles["Normal"]
    style.font.name = "宋体"
    style.font.size = Pt(12)
    style.element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    style.paragraph_format.line_spacing = 1.5

    # ── Title ──
    title_para = doc.add_paragraph()
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title_para.add_run(title)
    run.font.name = "黑体"
    run.element.rPr.rFonts.set(qn("w:eastAsia"), "黑体")
    run.font.size = Pt(16)
    run.bold = True

    doc.add_paragraph()  # spacer

    # ── Questions ──
    for q in questions:
        # Question header
        q_text = f"{q['index']}. "
        type_labels = {
            "single_choice": "【单选题】",
            "multi_choice": "【多选题】",
            "true_false": "【判断题】",
            "fill_blank": "【填空题】",
            "short_answer": "【解答题】",
        }
        q_text += type_labels.get(q["type"], "")

        para = doc.add_paragraph()
        run = para.add_run(q_text)
        run.font.name = "黑体"
        run.element.rPr.rFonts.set(qn("w:eastAsia"), "黑体")
        run.font.size = Pt(12)

        # Question content
        para = doc.add_paragraph()
        run = para.add_run(q["content"])
        run.font.name = "宋体"
        run.element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
        run.font.size = Pt(12)

        # Options
        if q.get("options"):
            for opt in q["options"]:
                para = doc.add_paragraph()
                para.paragraph_format.left_indent = Cm(1.0)
                run = para.add_run(opt)
                run.font.name = "宋体"
                run.element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
                run.font.size = Pt(12)

        doc.add_paragraph()  # spacer

    # ── Answers (separate page) ──
    doc.add_page_break()
    ans_title = doc.add_paragraph()
    ans_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = ans_title.add_run("参考答案")
    run.font.name = "黑体"
    run.element.rPr.rFonts.set(qn("w:eastAsia"), "黑体")
    run.font.size = Pt(16)
    run.bold = True
    doc.add_paragraph()

    for q in questions:
        para = doc.add_paragraph()
        text = f"{q['index']}. "
        if q.get("answer"):
            text += q["answer"]
        if q.get("analysis"):
            text += f"\n    解析：{q['analysis']}"
        run = para.add_run(text)
        run.font.name = "宋体"
        run.element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
        run.font.size = Pt(12)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()


# ── PDF Generation (via LibreOffice) ──────────────────────────

@app.route("/export/pdf", methods=["POST"])
def export_pdf():
    """
    Accepts the same JSON as /export/docx.
    1. Generate DOCX
    2. Convert to PDF via LibreOffice headless
    3. Return PDF bytes
    """
    try:
        data = request.get_json()
        title = data.get("title", "试卷")
        questions = data.get("questions", [])

        docx_bytes = generate_docx(title, questions)

        with tempfile.TemporaryDirectory() as tmpdir:
            docx_path = os.path.join(tmpdir, "input.docx")
            with open(docx_path, "wb") as f:
                f.write(docx_bytes)

            subprocess.run(
                ["libreoffice", "--headless", "--convert-to", "pdf", "--outdir", tmpdir, docx_path],
                check=True,
                timeout=30,
            )

            pdf_path = os.path.join(tmpdir, "input.pdf")
            with open(pdf_path, "rb") as f:
                pdf_bytes = f.read()

        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"{title}.pdf",
        )
    except FileNotFoundError:
        return jsonify({"error": "LibreOffice not installed on this server"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Health ──

@app.route("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
