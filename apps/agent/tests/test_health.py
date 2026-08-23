import asyncio

from bi_agent_agent.main import health


def test_health_reports_agent_service() -> None:
    assert asyncio.run(health()) == {"service": "agent", "status": "UP"}
