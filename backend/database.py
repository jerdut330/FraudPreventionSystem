import os
import psycopg
from dotenv import load_dotenv

try:
    from psycopg_pool import ConnectionPool
except ImportError:
    ConnectionPool = None


load_dotenv()

_pool = None


class PooledConnection:
    def __init__(self, pool):
        self.pool = pool
        self.connection = pool.getconn()

    def cursor(self, *args, **kwargs):
        return self.connection.cursor(*args, **kwargs)

    def commit(self):
        self.connection.commit()

    def rollback(self):
        self.connection.rollback()

    def close(self):
        if self.connection is not None:
            self.pool.putconn(self.connection)
            self.connection = None


def get_connection_info():
    return {
        "host": os.environ.get("DB_HOST"),
        "dbname": os.environ.get("DB_NAME"),
        "user": os.environ.get("DB_USER"),
        "password": os.environ.get("DB_PASSWORD"),
        "port": os.environ.get("DB_PORT", "5432")
    }


def get_pool():
    global _pool

    if ConnectionPool is None:
        return None

    if _pool is None:
        pool_min_size = int(os.environ.get("DB_POOL_MIN_SIZE", "1"))
        pool_max_size = int(os.environ.get("DB_POOL_MAX_SIZE", "5"))
        _pool = ConnectionPool(
            kwargs=get_connection_info(),
            min_size=pool_min_size,
            max_size=pool_max_size,
            open=True
        )

    return _pool


def get_connection():
    required_variables = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"]
    missing_variables = [
        variable for variable in required_variables if not os.environ.get(variable)
    ]

    if missing_variables:
        missing_list = ", ".join(missing_variables)
        raise RuntimeError(
            f"Missing database environment variables: {missing_list}. "
            "Create backend/.env with your PostgreSQL connection settings."
        )

    pool = get_pool()

    if pool is not None:
        return PooledConnection(pool)

    return psycopg.connect(**get_connection_info())
