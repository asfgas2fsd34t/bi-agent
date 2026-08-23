from __future__ import annotations

import os
from datetime import datetime, timezone
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException

from .contracts import DemoRunRequest, DemoRunResponse, StatusEvent, StatusPayload

app = FastAPI(title="Governed BI Agent", version="0.1.0")
JAVA_CORE_URL = os.getenv("JAVA_CORE_URL", "http://127.0.0.1:8080").rstrip("/")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"service": "agent", "status": "UP"}


@app.post("/v1/demo/runs", response_model=DemoRunResponse, status_code=201)
async def create_demo_run(request: DemoRunRequest) -> DemoRunResponse:
    run_id = f"run-demo-{uuid4().hex[:10]}"
    event = StatusEvent(
        run_id=run_id,
        sequence=1,
        occurred_at=datetime.now(timezone.utc),
        event_type="status",
        payload=StatusPayload(status="running", label="正在分析", detail="Python Agent 已提交候选事件"),
    )
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.post(
                f"{JAVA_CORE_URL}/api/v1/internal/events",
                json=event.model_dump(mode="json"),
            )
            response.raise_for_status()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Java BI Core 当前不可用") from error

    return DemoRunResponse(run_id=run_id, event_count=1)
