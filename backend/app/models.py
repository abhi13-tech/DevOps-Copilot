import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional


DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(__file__), "app.db"))


def _dict_factory(cursor, row):
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}


def init_db() -> None:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS pipelines (
                id TEXT PRIMARY KEY,
                name TEXT,
                status TEXT,
                last_run TEXT,
                success_rate REAL DEFAULT 0
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pipeline_id TEXT,
                status TEXT, -- success | failed | running | unknown
                timestamp TEXT,
                FOREIGN KEY(pipeline_id) REFERENCES pipelines(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pipeline_id TEXT,
                timestamp TEXT,
                content TEXT,
                FOREIGN KEY(pipeline_id) REFERENCES pipelines(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pipeline_id TEXT,
                root_cause TEXT,
                fix TEXT,
                confidence TEXT,
                created_at TEXT,
                FOREIGN KEY(pipeline_id) REFERENCES pipelines(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT, -- triage | rca | fix
                pipeline_id TEXT,
                status TEXT, -- queued | running | awaiting_approval | completed | failed
                result_json TEXT,
                created_at TEXT,
                updated_at TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER,
                action_type TEXT,
                payload TEXT,
                created_at TEXT,
                FOREIGN KEY(task_id) REFERENCES agent_tasks(id)
            )
            """
        )


@contextmanager
def get_conn(dict_rows: bool = False):
    conn = sqlite3.connect(DB_PATH)
    if dict_rows:
        conn.row_factory = _dict_factory
    try:
        yield conn
    finally:
        conn.commit()
        conn.close()


def upsert_pipeline(pipeline_id: str, name: Optional[str] = None, status: Optional[str] = None,
                    success_rate: Optional[float] = None) -> None:
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        cur = conn.execute("SELECT id FROM pipelines WHERE id = ?", (pipeline_id,))
        exists = cur.fetchone() is not None
        if exists:
            # Update existing pipeline
            fields = ["last_run = ?"]
            params: List[Any] = [now]
            if name is not None:
                fields.append("name = ?")
                params.append(name)
            if status is not None:
                fields.append("status = ?")
                params.append(status)
            if success_rate is not None:
                fields.append("success_rate = ?")
                params.append(success_rate)
            params.append(pipeline_id)
            conn.execute(f"UPDATE pipelines SET {', '.join(fields)} WHERE id = ?", params)
        else:
            conn.execute(
                "INSERT INTO pipelines (id, name, status, last_run, success_rate) VALUES (?, ?, ?, ?, ?)",
                (
                    pipeline_id,
                    name or f"Pipeline {pipeline_id}",
                    status or "unknown",
                    now,
                    success_rate if success_rate is not None else 0.0,
                ),
            )


def insert_log(pipeline_id: str, content: str) -> int:
    ts = datetime.utcnow().isoformat()
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO logs (pipeline_id, timestamp, content) VALUES (?, ?, ?)",
            (pipeline_id, ts, content),
        )
        return int(cur.lastrowid)


def list_pipelines() -> List[Dict[str, Any]]:
    with get_conn(dict_rows=True) as conn:
        cur = conn.execute(
            "SELECT id, name, status, last_run, success_rate FROM pipelines ORDER BY last_run DESC"
        )
        return [dict(row) for row in cur.fetchall()]


def get_logs(pipeline_id: str, limit: int = 50, offset: int = 0, q: Optional[str] = None) -> List[Dict[str, Any]]:
    with get_conn(dict_rows=True) as conn:
        if q:
            cur = conn.execute(
                """
                SELECT id, pipeline_id, timestamp, content
                FROM logs
                WHERE pipeline_id = ? AND content LIKE ?
                ORDER BY id DESC
                LIMIT ? OFFSET ?
                """,
                (pipeline_id, f"%{q}%", limit, offset),
            )
        else:
            cur = conn.execute(
                """
                SELECT id, pipeline_id, timestamp, content
                FROM logs
                WHERE pipeline_id = ?
                ORDER BY id DESC
                LIMIT ? OFFSET ?
                """,
                (pipeline_id, limit, offset),
            )
        return [dict(row) for row in cur.fetchall()]


def insert_analysis(pipeline_id: str, root_cause: str, fix: str, confidence: str) -> int:
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO analysis (pipeline_id, root_cause, fix, confidence, created_at) VALUES (?, ?, ?, ?, ?)",
            (pipeline_id, root_cause, fix, confidence, now),
        )
        return int(cur.lastrowid)


def get_latest_analysis(pipeline_id: str) -> Optional[Dict[str, Any]]:
    with get_conn(dict_rows=True) as conn:
        cur = conn.execute(
            "SELECT id, pipeline_id, root_cause, fix, confidence, created_at FROM analysis WHERE pipeline_id = ? ORDER BY id DESC LIMIT 1",
            (pipeline_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def insert_run(pipeline_id: str, status: str) -> int:
    ts = datetime.utcnow().isoformat()
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO runs (pipeline_id, status, timestamp) VALUES (?, ?, ?)",
            (pipeline_id, status, ts),
        )
        # recompute success_rate = successes / total
        cur2 = conn.execute(
            "SELECT COUNT(*), SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) FROM runs WHERE pipeline_id = ?",
            (pipeline_id,),
        )
        total, success = cur2.fetchone()
        rate = (success or 0) / total if total else 0.0
        conn.execute(
            "UPDATE pipelines SET success_rate = ?, status = ?, last_run = ? WHERE id = ?",
            (rate, status, ts, pipeline_id),
        )
        return int(cur.lastrowid)


def clear_all() -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM analysis")
        conn.execute("DELETE FROM logs")
        conn.execute("DELETE FROM runs")
        conn.execute("DELETE FROM pipelines")


# ============= Agents ============= #
def create_agent_task(task_type: str, pipeline_id: str, status: str = "queued", result_json: Optional[str] = None) -> int:
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO agent_tasks (type, pipeline_id, status, result_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (task_type, pipeline_id, status, result_json, now, now),
        )
        return int(cur.lastrowid)


def update_agent_task(task_id: int, *, status: Optional[str] = None, result_json: Optional[str] = None) -> None:
    now = datetime.utcnow().isoformat()
    fields = ["updated_at = ?"]
    params: List[Any] = [now]
    if status is not None:
        fields.append("status = ?")
        params.append(status)
    if result_json is not None:
        fields.append("result_json = ?")
        params.append(result_json)
    params.append(task_id)
    with get_conn() as conn:
        conn.execute(f"UPDATE agent_tasks SET {', '.join(fields)} WHERE id = ?", params)


def insert_agent_action(task_id: int, action_type: str, payload: str) -> int:
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO agent_actions (task_id, action_type, payload, created_at) VALUES (?, ?, ?, ?)",
            (task_id, action_type, payload, now),
        )
        return int(cur.lastrowid)


def list_agent_tasks(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    with get_conn(dict_rows=True) as conn:
        cur = conn.execute(
            "SELECT id, type, pipeline_id, status, result_json, created_at, updated_at FROM agent_tasks ORDER BY id DESC LIMIT ? OFFSET ?",
            (limit, offset),
        )
        return [dict(row) for row in cur.fetchall()]


def get_agent_task(task_id: int) -> Optional[Dict[str, Any]]:
    with get_conn(dict_rows=True) as conn:
        cur = conn.execute(
            "SELECT id, type, pipeline_id, status, result_json, created_at, updated_at FROM agent_tasks WHERE id = ?",
            (task_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def list_agent_actions(task_id: int) -> List[Dict[str, Any]]:
    with get_conn(dict_rows=True) as conn:
        cur = conn.execute(
            "SELECT id, task_id, action_type, payload, created_at FROM agent_actions WHERE task_id = ? ORDER BY id ASC",
            (task_id,),
        )
        return [dict(row) for row in cur.fetchall()]
# meta: housekeeping note 2024-11-14T10:59:49-05:00
