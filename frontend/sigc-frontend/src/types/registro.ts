// src/types.ts

export type PryTipo = "interno" | "externo";

export type Proyecto = {
  tipo: PryTipo;
  codigo: string;
  titulo: string;
  num_participantes_internos: number;
  num_participantes_ext_nac: number;
  num_participantes_ext_int: number;
  num_estudiantes_pregrado: number;
  num_estudiantes_posgrado: number;
  fuente_financiamiento: string;
  monto_financiamiento: number;
};

export type Unidad = {
  nombre: string;
  campos_conocimiento: string;
  area_cobertura: string;
  num_personal_academico: number;
  num_personal_apoyo: number;
  presupuesto_anual: number;
};

export type RegistroPayload = {
  siglas: string;
  anio: number;
  fecha_corte: string; // YYYY-MM-DD
  total_estudiantes: number;
  total_personal_academico: number;
  total_personal_phd: number;
  total_personal_contratado_inv: number;
  total_personal_apoyo: number;
  pct_presupuesto_inv: number;
  presupuesto_externo: number;
  presupuesto_interno: number;
  num_est_pregrado_proy: number;
  num_alumni_pregrado_proy: number;
  num_est_posgrado_proy: number;
  num_alumni_posgrado_proy: number;
  proyectos: Proyecto[];
  unidades: Unidad[];
};
