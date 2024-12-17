from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .. import models
from ..services.ai import analyze_logs_with_ai


router = APIRouter(prefix="/agent")


class AgentTaskCreate(BaseModel):
    type: Literal["triage", "rca", "fix"] = Field("rca")
    pipeline_id: str


class AgentTaskOut(BaseModel):
    id: int
    type: str
    pipeline_id: str
    status: str
    result_json: Optional[str] = None
    created_at: str
    updated_at: str


@router.post("/tasks", response_model=AgentTaskOut)
def create_task(payload: AgentTaskCreate):
    # Create queued task
    task_id = models.create_agent_task(payload.type, payload.pipeline_id, status="queued")
    # Auto-run for triage/rca MVP
    run_task(task_id)
    task = models.get_agent_task(task_id)
    assert task
    return task


@router.get("/tasks")
def list_tasks(limit: int = 50, offset: int = 0):
    return models.list_agent_tasks(limit=limit, offset=offset)


@router.get("/tasks/{task_id}", response_model=AgentTaskOut)
def get_task(task_id: int):
    task = models.get_agent_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    return task


@router.post("/tasks/{task_id}/run")
def api_run_task(task_id: int):
    run_task(task_id)
    task = models.get_agent_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    return task


def run_task(task_id: int) -> None:
    task = models.get_agent_task(task_id)
    if not task:
        return
    pipeline_id = task["pipeline_id"]
    task_type = task["type"]
    models.update_agent_task(task_id, status="running")
    models.insert_agent_action(task_id, "start", f"Running {task_type} on pipeline {pipeline_id}")

    try:
        if task_type == "triage":
            # Heuristic triage based on last run status + error keywords in latest logs
            logs = models.get_logs(pipeline_id, limit=50)
            text = "\n".join([l["content"] for l in logs])
            severity = "low"
            if "error" in text.lower() or "failed" in text.lower():
                severity = "high"
            result = {"kind": "triage", "severity": severity, "hints": ["Check failing steps", "Open pipeline detail"]}
            models.update_agent_task(task_id, status="completed", result_json=json_dumps_safe(result))
            models.insert_agent_action(task_id, "triage", f"severity={severity}")
        elif task_type == "rca":
            # Concatenate recent logs and call AI analyzer
            logs = models.get_logs(pipeline_id, limit=100)
            if not logs:
                models.update_agent_task(task_id, status="failed", result_json=json_dumps_safe({"error": "no logs"}))
                models.insert_agent_action(task_id, "rca", "no logs")
                return
            joined = "\n\n".join([item["content"] for item in logs])
            ai = analyze_logs_with_ai(joined)
            result = {"kind": "rca", **ai}
            models.update_agent_task(task_id, status="completed", result_json=json_dumps_safe(result))
            models.insert_agent_action(task_id, "rca", "ai_complete")
        else:
            # Fix agent placeholder
            models.update_agent_task(task_id, status="awaiting_approval", result_json=json_dumps_safe({"info": "fix plan requires approval"}))
            models.insert_agent_action(task_id, "plan", "generated fix plan (placeholder)")
    except Exception as e:
        models.update_agent_task(task_id, status="failed", result_json=json_dumps_safe({"error": str(e)}))
        models.insert_agent_action(task_id, "error", str(e))


def json_dumps_safe(obj) -> str:
    try:
        import json
        return json.dumps(obj)
    except Exception:
        return "{}"

# meta: housekeeping note 2024-11-07T11:21:29-05:00
# meta: housekeeping note 2024-11-07T17:48:25-05:00
# meta: housekeeping note 2024-11-11T18:26:11-05:00
# meta: housekeeping note 2024-11-12T12:21:47-05:00
# meta: housekeeping note 2024-11-18T11:56:47-05:00
# meta: housekeeping note 2024-11-20T18:22:31-05:00
# meta: housekeeping note 2024-11-21T12:15:07-05:00
# meta: housekeeping note 2024-11-28T14:37:56-05:00
# meta: housekeeping note 2024-12-17T16:21:34-05:00
# meta: housekeeping note 2024-12-17T17:10:05-05:00
