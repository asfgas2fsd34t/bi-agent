FROM python:3.12-slim

WORKDIR /app
COPY apps/agent/pyproject.toml ./
COPY apps/agent/src ./src
RUN pip install --no-cache-dir .
EXPOSE 8000
CMD ["uvicorn", "bi_agent_agent.main:app", "--host", "0.0.0.0", "--port", "8000"]
