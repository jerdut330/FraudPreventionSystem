import psycopg2

def get_connection():
    return psycopg2.connect(
        host="localhost",
        database="fraud_prevention_system",
        user="postgres",
        password="akusukakamu",
        port="5432"
    )
