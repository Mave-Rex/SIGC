from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.db import get_session
from app.models import CatCatalogoUniversidad

router = APIRouter(prefix="/api/universidades", tags=["Universidades"])

@router.get("")
def listar_universidades(session: Session = Depends(get_session)):
    stmt = select(CatCatalogoUniversidad).where(CatCatalogoUniversidad.cat_activa == True)
    return session.exec(stmt).all()
