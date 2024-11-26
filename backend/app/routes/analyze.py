from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import models
from ..services.ai import analyze_logs_with_ai


router = APIRouter()


class AnalysisOut(BaseModel):
    root_cause: str
    suggested_fix: str
    confidence: str


@router.post("/analyze/{pipeline_id}", response_model=AnalysisOut)
def analyze_pipeline(pipeline_id: str):
    logs = models.get_logs(pipeline_id, limit=100)
    if not logs:
        raise HTTPException(status_code=404, detail="No logs for pipeline")

    # Concatenate latest N logs
    joined = "\n\n".join([item["content"] for item in logs[:20]])
    ai = analyze_logs_with_ai(joined)
    models.insert_analysis(pipeline_id, ai.get("root_cause", ""), ai.get("suggested_fix", ""), ai.get("confidence", "Low"))
    return ai
# meta: housekeeping note 2024-11-25T16:29:16-05:00
# meta: housekeeping note 2024-11-26T10:33:43-05:00
