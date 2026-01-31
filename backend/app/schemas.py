from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field
from typing import Dict, Any



# -------------------------
# REI
# -------------------------

class ReiPayload(BaseModel):
    total_estudiantes: int = 0
    total_personal_academico: int = 0
    total_personal_phd: int = 0
    total_personal_contratado_inv: int = 0
    total_personal_apoyo: int = 0

    pct_presupuesto_inv: Decimal = Decimal("0")
    presupuesto_externo: Decimal = Decimal("0")
    presupuesto_interno: Decimal = Decimal("0")

    num_est_pregrado_proy: int = 0
    num_alumni_pregrado_proy: int = 0
    num_est_posgrado_proy: int = 0
    num_alumni_posgrado_proy: int = 0


# -------------------------
# Unidades (SIN tipo)
# -------------------------

class UnidadPayload(BaseModel):
    nombre: str
    campos_conocimiento: Optional[str] = ""
    area_cobertura: Optional[str] = ""
    num_personal_academico: int = 0
    num_personal_apoyo: int = 0
    presupuesto_anual: Decimal = Decimal("0")


# -------------------------
# Proyectos
# -------------------------

class ProyectoPayload(BaseModel):
    codigo: Optional[str] = ""
    titulo: str
    fuente_financiamiento: Optional[str] = ""
    monto_financiamiento: Decimal = Decimal("0")

    num_participantes_internos: int = 0
    num_participantes_ext_nac: int = 0
    num_participantes_ext_int: int = 0

    num_estudiantes_pregrado: int = 0
    num_estudiantes_posgrado: int = 0

    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    estado: str = "Activo"


class ProyectosPayload(BaseModel):
    externos: List[ProyectoPayload] = Field(default_factory=list)
    internos: List[ProyectoPayload] = Field(default_factory=list)


# -------------------------
# Registro completo
# -------------------------

class RegistroPayload(BaseModel):
    universidad_siglas: str
    anio: int
    fecha_corte: Optional[date] = None

    rei: ReiPayload
    unidades: List[UnidadPayload] = Field(default_factory=list)
    proyectos: ProyectosPayload

class UniversidadOut(BaseModel):
    cat_id: int
    cat_nombre_oficial: str
    cat_siglas: str
    cat_ciudad: str
    cat_activa: bool


class RegistroListItemOut(BaseModel):
    rei_id: int
    universidad_siglas: str
    universidad_nombre: str
    anio: int
    fecha_corte: Optional[date] = None


class RegistroDetalleOut(BaseModel):
    universidad: UniversidadOut
    rei: Dict[str, Any]
    unidades: List[Dict[str, Any]]
    proyectos: Dict[str, List[Dict[str, Any]]]
