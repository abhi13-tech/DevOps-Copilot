from fastapi import APIRouter
from datetime import datetime, timedelta
from .. import models


router = APIRouter()


@router.post("/seed")
def seed_demo_data():
    """Populate the database with synthetic demo pipelines, logs, and runs."""
    now = datetime.utcnow()

    samples = [
        {
            "id": "demo-1",
            "name": "Demo Pipeline",
            "runs": [
                (now - timedelta(days=2), "success", [
                    "Checkout code",
                    "Install dependencies",
                    "Run tests: 124 passed",
                    "Build docker image: success",
                ]),
                (now - timedelta(days=1), "failed", [
                    "Checkout code",
                    "Install dependencies",
                    "Run tests: 2 failed, 122 passed",
                    "FAILED tests/unit/test_api.py::test_create_user - AssertionError: expected 201 got 400",
                ]),
            ],
        },
        {
            "id": "demo-2",
            "name": "Infra Deploy",
            "runs": [
                (now - timedelta(days=3), "failed", [
                    "Terraform init",
                    "Terraform plan",
                    "Error: Provider registry.terraform.io timeout",
                    "Hint: Check network or provider version pinning",
                ]),
                (now - timedelta(days=1), "success", [
                    "Terraform apply",
                    "Outputs saved",
                ]),
            ],
        },
        {
            "id": "demo-3",
            "name": "Web App CI",
            "runs": [
                (now - timedelta(hours=12), "failed", [
                    "npm ci",
                    "npm run build",
                    "ERROR in src/App.tsx: Cannot find module '@/components/Button'",
                    "Build failed with exit code 2",
                ]),
            ],
        },
    ]

    for p in samples:
        models.upsert_pipeline(pipeline_id=p["id"], name=p["name"], status="unknown")
        for (ts, status, lines) in p["runs"]:
            # Insert logs with timestamps near the run
            for i, content in enumerate(lines):
                models.insert_log(pipeline_id=p["id"], content=f"[{(ts + timedelta(minutes=i)).isoformat()}] {content}")
            if status in {"success", "failed"}:
                models.insert_run(pipeline_id=p["id"], status=status)

    return {"message": "seeded", "pipelines": [p["id"] for p in samples]}


@router.post("/seed/reset")
def reset_demo_data():
    models.clear_all()
    return {"message": "reset complete"}

