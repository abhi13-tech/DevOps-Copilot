from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .. import models


router = APIRouter()


class LogIn(BaseModel):
    pipeline_id: str = Field(..., description="Unique pipeline identifier, e.g., GitHub run_id")
    logs: str = Field(..., description="Raw text logs")
    name: Optional[str] = Field(None, description="Pipeline name")
    status: Optional[str] = Field(None, description="Pipeline status: success|failed|running|unknown")
    success_rate: Optional[float] = Field(None, ge=0, le=1, description="Optional success rate override (0..1)")


class LogOut(BaseModel):
    id: int
    pipeline_id: str
    timestamp: str
    content: str


@router.post("/logs")
def post_logs(payload: LogIn):
    models.upsert_pipeline(
        pipeline_id=payload.pipeline_id,
        name=payload.name,
        status=payload.status,
        success_rate=payload.success_rate,
    )
    log_id = models.insert_log(payload.pipeline_id, payload.logs)
    # If a terminal status is provided, record a run and recompute success rate
    if payload.status in {"success", "failed"}:
        models.insert_run(payload.pipeline_id, payload.status)
    return {"message": "logs stored", "log_id": log_id}


@router.get("/logs/{pipeline_id}", response_model=List[LogOut])
def get_logs(pipeline_id: str, limit: int = 50, offset: int = 0, q: Optional[str] = None):
    logs = models.get_logs(pipeline_id, limit=limit, offset=offset, q=q)
    if logs is None:
        raise HTTPException(status_code=404, detail="pipeline or logs not found")
    return logs
# meta: housekeeping note 2024-11-04T16:09:26-05:00
# meta: housekeeping note 2024-11-12T11:30:52-05:00
# meta: housekeeping note 2024-11-13T09:58:47-05:00
# meta: housekeeping note 2024-11-13T18:00:18-05:00
# meta: housekeeping note 2024-11-22T14:57:30-05:00
# meta: housekeeping note 2024-11-22T16:27:50-05:00
# meta: housekeeping note 2024-11-26T15:36:20-05:00
# meta: housekeeping note 2024-12-06T11:38:09-05:00
# meta: housekeeping note 2024-12-25T14:55:05-05:00
