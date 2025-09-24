"""
Testes para o sistema AlugueisV2
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import Base
import os

# Database de teste
TEST_DATABASE_URL = "sqlite:///./test.db"

@pytest.fixture(scope="session")
def db_engine():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection)()

    yield session

    session.close()
    transaction.rollback()
    connection.close()