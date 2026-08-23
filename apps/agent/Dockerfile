FROM python:3.12-slim

WORKDIR /app
COPY apps/agent/pyproject.toml apps/agent/README.md* ./
RUN pip install --no-cache-dir fastapi httpx jsonschema pydantic 'uvicorn[standard]'
COPY apps/agent/src ./src
ENV PYTHONPATH=/app/src
EXPOSE 8000
CMD ["uvicorn", "bi_agent_agent.main:app", "--host", "0.0.0.0", "--port", "8000"]
