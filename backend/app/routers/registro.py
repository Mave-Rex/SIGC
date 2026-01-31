from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.db import get_session
from app.models import (
    CatCatalogoUniversidad,
    ReiRegistroInstitucional,
    UniUnidadInvestigacion,
    PryProyectoInvestigacion,
    PryTipo,
)
from app.schemas import (
    RegistroPayload,
    UniversidadOut,
    RegistroListItemOut,
    RegistroDetalleOut,
)

router = APIRouter(prefix="/api", tags=["Registro"])


# -------------------------
# POST: crear registro
# -------------------------
@router.post("/registro")
def crear_registro(payload: RegistroPayload, session: Session = Depends(get_session)):
    try:
        uni = session.exec(
            select(CatCatalogoUniversidad).where(
                CatCatalogoUniversidad.cat_siglas == payload.universidad_siglas
            )
        ).first()

        if not uni:
            raise HTTPException(status_code=404, detail="Universidad no encontrada por siglas")

        rei = ReiRegistroInstitucional(
            rei_cat_id=uni.cat_id,
            rei_anio=payload.anio,
            rei_fecha_corte=payload.fecha_corte,

            rei_total_estudiantes=payload.rei.total_estudiantes,
            rei_total_personal_academico=payload.rei.total_personal_academico,
            rei_total_personal_phd=payload.rei.total_personal_phd,
            rei_total_personal_contratado_inv=payload.rei.total_personal_contratado_inv,
            rei_total_personal_apoyo=payload.rei.total_personal_apoyo,

            rei_pct_presupuesto_inv=payload.rei.pct_presupuesto_inv,
            rei_presupuesto_externo=payload.rei.presupuesto_externo,
            rei_presupuesto_interno=payload.rei.presupuesto_interno,

            rei_num_est_pregrado_proy=payload.rei.num_est_pregrado_proy,
            rei_num_alumni_pregrado_proy=payload.rei.num_alumni_pregrado_proy,
            rei_num_est_posgrado_proy=payload.rei.num_est_posgrado_proy,
            rei_num_alumni_posgrado_proy=payload.rei.num_alumni_posgrado_proy,
        )
        session.add(rei)
        session.flush()  # para obtener rei.rei_id

        # Proyectos externos
        for proy in payload.proyectos.externos:
            session.add(
                PryProyectoInvestigacion(
                    pry_rei_id=rei.rei_id,
                    pry_tipo=PryTipo.externo,
                    pry_codigo=proy.codigo or "",
                    pry_titulo=proy.titulo,
                    pry_fuente_financiamiento=proy.fuente_financiamiento or "",
                    pry_monto_financiamiento=proy.monto_financiamiento or 0,
                    pry_num_participantes_internos=proy.num_participantes_internos or 0,
                    pry_num_participantes_ext_nac=proy.num_participantes_ext_nac or 0,
                    pry_num_participantes_ext_int=proy.num_participantes_ext_int or 0,
                    pry_num_estudiantes_pregrado=proy.num_estudiantes_pregrado or 0,
                    pry_num_estudiantes_posgrado=proy.num_estudiantes_posgrado or 0,
                    pry_fecha_inicio=proy.fecha_inicio,
                    pry_fecha_fin=proy.fecha_fin,
                    pry_estado=proy.estado or "Activo",
                )
            )

        # Proyectos internos
        for proy in payload.proyectos.internos:
            session.add(
                PryProyectoInvestigacion(
                    pry_rei_id=rei.rei_id,
                    pry_tipo=PryTipo.interno,
                    pry_codigo=proy.codigo or "",
                    pry_titulo=proy.titulo,
                    pry_fuente_financiamiento=proy.fuente_financiamiento or "",
                    pry_monto_financiamiento=proy.monto_financiamiento or 0,
                    pry_num_participantes_internos=proy.num_participantes_internos or 0,
                    pry_num_participantes_ext_nac=proy.num_participantes_ext_nac or 0,
                    pry_num_participantes_ext_int=proy.num_participantes_ext_int or 0,
                    pry_num_estudiantes_pregrado=proy.num_estudiantes_pregrado or 0,
                    pry_num_estudiantes_posgrado=proy.num_estudiantes_posgrado or 0,
                    pry_fecha_inicio=proy.fecha_inicio,
                    pry_fecha_fin=proy.fecha_fin,
                    pry_estado=proy.estado or "Activo",
                )
            )

        # Unidades
        for unidad in payload.unidades:
            session.add(
                UniUnidadInvestigacion(
                    uni_rei_id=rei.rei_id,
                    uni_nombre=unidad.nombre,
                    uni_campos_conocimiento=unidad.campos_conocimiento or "",
                    uni_area_cobertura=unidad.area_cobertura or "",
                    uni_num_personal_academico=unidad.num_personal_academico or 0,
                    uni_num_personal_apoyo=unidad.num_personal_apoyo or 0,
                    uni_presupuesto_anual=unidad.presupuesto_anual or 0,
                )
            )

        session.commit()
        return {"message": "Registro creado", "rei_id": rei.rei_id}

    except IntegrityError as e:
        session.rollback()
        raise HTTPException(status_code=409, detail=str(e.orig))

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")


# -------------------------
# GET: universidades (para dropdown)
# -------------------------
@router.get("/universidades", response_model=list[UniversidadOut])
def listar_universidades(session: Session = Depends(get_session)):
    universidades = session.exec(
        select(CatCatalogoUniversidad).order_by(CatCatalogoUniversidad.cat_siglas)
    ).all()
    return universidades


# -------------------------
# GET: listar registros (filtros opcionales)
# -------------------------
@router.get("/registros", response_model=list[RegistroListItemOut])
def listar_registros(
    universidad_siglas: str | None = Query(default=None),
    anio: int | None = Query(default=None),
    session: Session = Depends(get_session),
):
    stmt = (
        select(ReiRegistroInstitucional, CatCatalogoUniversidad)
        .join(CatCatalogoUniversidad, CatCatalogoUniversidad.cat_id == ReiRegistroInstitucional.rei_cat_id)
        .order_by(ReiRegistroInstitucional.rei_id.desc())
    )

    if universidad_siglas:
        stmt = stmt.where(CatCatalogoUniversidad.cat_siglas == universidad_siglas)

    if anio is not None:
        stmt = stmt.where(ReiRegistroInstitucional.rei_anio == anio)

    rows = session.exec(stmt).all()

    out: list[RegistroListItemOut] = []
    for rei, uni in rows:
        out.append(
            RegistroListItemOut(
                rei_id=rei.rei_id,
                universidad_siglas=uni.cat_siglas,
                universidad_nombre=uni.cat_nombre_oficial,
                anio=rei.rei_anio,
                fecha_corte=rei.rei_fecha_corte,
            )
        )
    return out


# -------------------------
# GET: detalle completo por rei_id
# -------------------------
@router.get("/registro/{rei_id}", response_model=RegistroDetalleOut)
def obtener_registro(rei_id: int, session: Session = Depends(get_session)):
    rei = session.get(ReiRegistroInstitucional, rei_id)
    if not rei:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    uni = session.get(CatCatalogoUniversidad, rei.rei_cat_id)
    if not uni:
        raise HTTPException(status_code=500, detail="Universidad asociada no encontrada")

    unidades = session.exec(
        select(UniUnidadInvestigacion).where(UniUnidadInvestigacion.uni_rei_id == rei_id)
    ).all()

    proyectos = session.exec(
        select(PryProyectoInvestigacion).where(PryProyectoInvestigacion.pry_rei_id == rei_id)
    ).all()

    externos = []
    internos = []

    for p in proyectos:
        item = {
            "pry_id": p.pry_id,
            "tipo": p.pry_tipo.value if hasattr(p.pry_tipo, "value") else str(p.pry_tipo),
            "codigo": p.pry_codigo,
            "titulo": p.pry_titulo,
            "fuente_financiamiento": p.pry_fuente_financiamiento,
            "monto_financiamiento": str(p.pry_monto_financiamiento),
            "num_participantes_internos": p.pry_num_participantes_internos,
            "num_participantes_ext_nac": p.pry_num_participantes_ext_nac,
            "num_participantes_ext_int": p.pry_num_participantes_ext_int,
            "num_estudiantes_pregrado": p.pry_num_estudiantes_pregrado,
            "num_estudiantes_posgrado": p.pry_num_estudiantes_posgrado,
            "fecha_inicio": p.pry_fecha_inicio,
            "fecha_fin": p.pry_fecha_fin,
            "estado": p.pry_estado,
        }
        if (hasattr(p.pry_tipo, "value") and p.pry_tipo.value == "externo") or str(p.pry_tipo) == "PryTipo.externo":
            externos.append(item)
        else:
            # interno
            internos.append(item)

    return RegistroDetalleOut(
        universidad=UniversidadOut(
            cat_id=uni.cat_id,
            cat_nombre_oficial=uni.cat_nombre_oficial,
            cat_siglas=uni.cat_siglas,
            cat_ciudad=uni.cat_ciudad,
            cat_activa=uni.cat_activa,
        ),
        rei={
            "rei_id": rei.rei_id,
            "rei_cat_id": rei.rei_cat_id,
            "anio": rei.rei_anio,
            "fecha_corte": rei.rei_fecha_corte,
            "total_estudiantes": rei.rei_total_estudiantes,
            "total_personal_academico": rei.rei_total_personal_academico,
            "total_personal_phd": rei.rei_total_personal_phd,
            "total_personal_contratado_inv": rei.rei_total_personal_contratado_inv,
            "total_personal_apoyo": rei.rei_total_personal_apoyo,
            "pct_presupuesto_inv": str(rei.rei_pct_presupuesto_inv),
            "presupuesto_externo": str(rei.rei_presupuesto_externo),
            "presupuesto_interno": str(rei.rei_presupuesto_interno),
            "num_est_pregrado_proy": rei.rei_num_est_pregrado_proy,
            "num_alumni_pregrado_proy": rei.rei_num_alumni_pregrado_proy,
            "num_est_posgrado_proy": rei.rei_num_est_posgrado_proy,
            "num_alumni_posgrado_proy": rei.rei_num_alumni_posgrado_proy,
        },
        unidades=[
            {
                "uni_id": u.uni_id,
                "nombre": u.uni_nombre,
                "campos_conocimiento": u.uni_campos_conocimiento,
                "area_cobertura": u.uni_area_cobertura,
                "num_personal_academico": u.uni_num_personal_academico,
                "num_personal_apoyo": u.uni_num_personal_apoyo,
                "presupuesto_anual": str(u.uni_presupuesto_anual),
            }
            for u in unidades
        ],
        proyectos={"externos": externos, "internos": internos},
    )
