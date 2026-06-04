"""
Pytest fixtures — 导出服务测试
"""
import io
import json
import pytest
from app import app


@pytest.fixture
def client():
    """Flask 测试客户端"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def sample_questions():
    """标准测试试卷数据：5道题，覆盖全部题型"""
    return [
        {
            "index": 1,
            "type": "single_choice",
            "content": "1 + 1 = ?",
            "options": ["A. 1", "B. 2", "C. 3", "D. 4"],
            "answer": "B",
            "analysis": "加法运算，1+1=2",
            "score": 5,
        },
        {
            "index": 2,
            "type": "multi_choice",
            "content": "以下哪些是偶数？",
            "options": ["A. 2", "B. 3", "C. 4", "D. 5"],
            "answer": "AC",
            "analysis": "偶数是能被2整除的整数",
            "score": 5,
        },
        {
            "index": 3,
            "type": "true_false",
            "content": "1 + 1 = 3",
            "options": ["正确", "错误"],
            "answer": "错误",
            "analysis": "1+1=2，不等于3",
            "score": 5,
        },
        {
            "index": 4,
            "type": "fill_blank",
            "content": "1 + 1 = ___",
            "options": [],
            "answer": "2",
            "analysis": "填空题",
            "score": 5,
        },
        {
            "index": 5,
            "type": "short_answer",
            "content": "请证明 1+1=2",
            "options": [],
            "answer": "根据皮亚诺公理，1的后继是2",
            "analysis": "高等数学基础",
            "score": 10,
        },
    ]


@pytest.fixture
def docx_payload(sample_questions):
    """DOCX/PDF API 请求体"""
    return {
        "title": "五年级数学综合练习卷",
        "questions": sample_questions,
    }


@pytest.fixture
def empty_payload():
    """空试卷请求体"""
    return {
        "title": "",
        "questions": [],
    }
