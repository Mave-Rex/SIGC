from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import engine
from sqlmodel import text
from app.routers.universidades import router as universidades_router
from app.routers.registro import router as registro_router

app = FastAPI(title="SIGC Piloto", version="0.1.0")

app.include_router(universidades_router)
app.include_router(registro_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # en prod se restringe
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/db-test")
def db_test():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        return {"db": "connected", "result": [row[0] for row in result]}

