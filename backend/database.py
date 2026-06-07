import os
import psycopg
from dotenv import load_dotenv


load_dotenv()


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

    return psycopg.connect(
        host=os.environ.get("DB_HOST"),
        dbname=os.environ.get("DB_NAME"),
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASSWORD"),
        port=os.environ.get("DB_PORT", "5432")
    )
