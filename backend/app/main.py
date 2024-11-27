from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .routes import logs as logs_routes
from .routes import analyze as analyze_routes
from .routes import seed as seed_routes
from .routes import agents as agents_routes


def create_app() -> FastAPI:
    models.init_db()
    app = FastAPI(title="DevOps Copilot API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.get("/pipelines")
    def get_pipelines():
        return models.list_pipelines()

    app.include_router(logs_routes.router)
    app.include_router(analyze_routes.router)
    app.include_router(seed_routes.router)
    app.include_router(agents_routes.router)

    return app


app = create_app()
# meta: housekeeping note 2024-11-13T12:09:21-05:00
# meta: housekeeping note 2024-11-27T15:40:35-05:00
