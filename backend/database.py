import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# DATA_DIR lets a host with a persistent disk (e.g. Render) point the DB at
# its mounted volume instead of the backend/ source directory — a volume
# can't be mounted directly over backend/ since that's where the deployed
# code itself lives. Defaults to backend/ for local dev, where the process
# cwd isn't guaranteed to match this file's directory.
DATA_DIR = Path(os.getenv("DATA_DIR", Path(__file__).resolve().parent))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "tradeagent.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
