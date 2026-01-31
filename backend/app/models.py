from __future__ import annotations

import enum
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from sqlmodel import SQLModel, Field


# =========================
# ENUMS (Postgres types)
# =========================

class PryTipo(str, enum.Enum):
    externo = "externo"
    interno = "interno"


# =========================
# cat_catalogo_universidad
# =========================

class CatCatalogoUniversidad(SQLModel, table=True):
    __tablename__ = "cat_catalogo_universidad"

    cat_id: Optional[int] = Field(default=None, primary_key=True)
    cat_nombre_oficial: str
    cat_siglas: str
    cat_ciudad: str
    cat_activa: bool = Field(default=True)


# =========================
# rei_registro_institucional
# =========================

class ReiRegistroInstitucional(SQLModel, table=True):
    __tablename__ = "rei_registro_institucional"

    rei_id: Optional[int] = Field(default=None, primary_key=True)

    rei_cat_id: int = Field(foreign_key="cat_catalogo_universidad.cat_id")
    rei_anio: int
    rei_fecha_corte: Optional[date] = None

    rei_total_estudiantes: int = 0
    rei_total_personal_academico: int = 0
    rei_total_personal_phd: int = 0
    rei_total_personal_contratado_inv: int = 0
    rei_total_personal_apoyo: int = 0

    rei_pct_presupuesto_inv: Decimal = Decimal("0")
    rei_presupuesto_externo: Decimal = Decimal("0")
    rei_presupuesto_interno: Decimal = Decimal("0")

    rei_num_est_pregrado_proy: int = 0
    rei_num_alumni_pregrado_proy: int = 0
    rei_num_est_posgrado_proy: int = 0
    rei_num_alumni_posgrado_proy: int = 0


# =========================
# uni_unidad_investigacion
#  (SIN uni_tipo porque tu BD no lo tiene)
# =========================

class UniUnidadInvestigacion(SQLModel, table=True):
    __tablename__ = "uni_unidad_investigacion"

    uni_id: Optional[int] = Field(default=None, primary_key=True)
    uni_rei_id: int = Field(foreign_key="rei_registro_institucional.rei_id")

    uni_nombre: str
    uni_campos_conocimiento: Optional[str] = None
    uni_area_cobertura: Optional[str] = None

    uni_num_personal_academico: int = 0
    uni_num_personal_apoyo: int = 0
    uni_presupuesto_anual: Decimal = Decimal("0")


# =========================
# pry_proyecto_investigacion
# =========================

class PryProyectoInvestigacion(SQLModel, table=True):
    __tablename__ = "pry_proyecto_investigacion"

    pry_id: Optional[int] = Field(default=None, primary_key=True)
    pry_rei_id: int = Field(foreign_key="rei_registro_institucional.rei_id")

    # ENUM Postgres: typ_pry_tipo
    pry_tipo: PryTipo = Field(
        sa_column=Column(
            PGEnum(PryTipo, name="typ_pry_tipo", create_type=False),
            nullable=False
        )
    )

    pry_codigo: Optional[str] = None
    pry_titulo: Optional[str] = None

    pry_num_participantes_internos: int = 0
    pry_num_participantes_ext_nac: int = 0
    pry_num_participantes_ext_int: int = 0

    pry_num_estudiantes_pregrado: int = 0
    pry_num_estudiantes_posgrado: int = 0

    pry_fuente_financiamiento: Optional[str] = None
    pry_monto_financiamiento: Decimal = Decimal("0")

    pry_fecha_inicio: Optional[date] = None
    pry_fecha_fin: Optional[date] = None

    pry_estado: str = "Activo"
