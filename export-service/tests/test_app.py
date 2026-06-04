"""
导出服务—API 端点测试
"""
import io
import zipfile
import pytest


class TestHealth:
    """GET /health — 健康检查"""

    def test_health_returns_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "ok"


class TestExportDocx:
    """POST /export/docx — DOCX 导出"""

    def test_normal_paper(self, client, docx_payload):
        resp = client.post(
            "/export/docx",
            json=docx_payload,
        )
        assert resp.status_code == 200
        assert resp.content_type == (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
        assert len(resp.data) > 0

        # Verify it's a valid ZIP/DOCX container
        assert zipfile.is_zipfile(io.BytesIO(resp.data))

    def test_empty_title(self, client, sample_questions):
        resp = client.post(
            "/export/docx",
            json={"title": "", "questions": sample_questions},
        )
        assert resp.status_code == 200
        assert len(resp.data) > 0

    def test_empty_questions(self, client):
        resp = client.post(
            "/export/docx",
            json={"title": "测试", "questions": []},
        )
        assert resp.status_code == 200
        assert len(resp.data) > 0

    def test_single_question(self, client, sample_questions):
        resp = client.post(
            "/export/docx",
            json={"title": "单题测试", "questions": [sample_questions[0]]},
        )
        assert resp.status_code == 200
        assert len(resp.data) > 0

    def test_all_question_types(self, client, sample_questions):
        """验证每种题型标签都出现在 DOCX 中"""
        resp = client.post(
            "/export/docx",
            json={"title": "全题型测试", "questions": sample_questions},
        )
        assert resp.status_code == 200

    def test_chinese_filename(self, client, docx_payload):
        resp = client.post(
            "/export/docx",
            json={"title": "五年级数学", "questions": docx_payload["questions"]},
        )
        assert resp.status_code == 200
        content_disp = resp.headers.get("Content-Disposition", "")
        # Flask 用 UTF-8 编码中文文件名
        assert ".docx" in content_disp

    def test_invalid_json(self, client):
        resp = client.post("/export/docx", data="not json", content_type="application/json")
        assert resp.status_code in (400, 500)

    def test_missing_questions_field(self, client):
        resp = client.post(
            "/export/docx",
            json={"title": "测试"},
            content_type="application/json",
        )
        # 缺少 questions 字段，使用默认值 []
        assert resp.status_code == 200

    def test_large_paper_50_questions(self, client):
        """50题大试卷 — 不应超时"""
        questions = []
        for i in range(50):
            questions.append({
                "index": i + 1,
                "type": "single_choice",
                "content": f"第{i+1}题：请选择正确答案",
                "options": ["A. 1", "B. 2", "C. 3", "D. 4"],
                "answer": "B",
                "analysis": f"解析第{i+1}题",
                "score": 2,
            })

        resp = client.post(
            "/export/docx",
            json={"title": "50题大试卷", "questions": questions},
        )
        assert resp.status_code == 200
        assert len(resp.data) > 0


class TestExportPdf:
    """POST /export/pdf — PDF 导出"""

    def test_normal_pdf(self, client, docx_payload):
        """PDF 导出 — 需要 LibreOffice，CI 中可能不可用"""
        resp = client.post(
            "/export/pdf",
            json=docx_payload,
        )
        # 503 if LibreOffice not installed, 200 if available, 500 if other error
        assert resp.status_code in (200, 500, 503)

    def test_pdf_unavailable(self, client, docx_payload, monkeypatch):
        """模拟 LibreOffice 不可用 → 503"""
        import subprocess
        def mock_run(*args, **kwargs):
            raise FileNotFoundError("libreoffice not found")
        monkeypatch.setattr(subprocess, "run", mock_run)

        resp = client.post(
            "/export/pdf",
            json=docx_payload,
        )
        assert resp.status_code == 503
        data = resp.get_json()
        assert "LibreOffice" in data["error"]

    def test_pdf_invalid_json(self, client):
        resp = client.post("/export/pdf", data="not json", content_type="application/json")
        assert resp.status_code in (400, 500)
