from sqlalchemy import create_engine

DB_USER = "root"
DB_PW   = "1234"
DB_HOST = "localhost"
DB_NAME = "runnerism"

def get_engine():
    return create_engine(
        f"mysql+pymysql://{DB_USER}:{DB_PW}@{DB_HOST}/{DB_NAME}",
        pool_pre_ping=True
    )
