import os
from pathlib import Path

TEST_DB = Path(__file__).resolve().parent.parent / "sbp_padel_test.db"

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./sbp_padel_test.db"
os.environ.pop("REDIS_URL", None)
os.environ["REDIS_REQUIRED"] = "false"

if TEST_DB.exists():
    TEST_DB.unlink()
