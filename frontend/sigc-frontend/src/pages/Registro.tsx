import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8000";

type UniCatalogo = {
  cat_id: number;
  cat_siglas: string;
  cat_nombre_oficial: string;
  cat_ciudad: string;
};

type UnidadForm = {
  nombre: string;
  tipo: "CENTRO" | "INSTITUTO";
  campos_conocimiento: string;
  area_cobertura: string;
  num_personal_academico: number;
  num_personal_apoyo: number;
  presupuesto_anual: number;
};

type ProyectoForm = {
  codigo: string;
  titulo: string;
  fuente_financiamiento: string;
  monto_financiamiento: number;
  num_participantes_internos: number;
  num_participantes_ext_nac: number;
  num_participantes_ext_int: number;
  num_estudiantes_pregrado: number;
  num_estudiantes_posgrado: number;
  fecha_inicio: string; // yyyy-mm-dd
  fecha_fin: string; // yyyy-mm-dd
  estado: string;
};

type FormState = {
  universidad_siglas: string;
  anio: number;
  fecha_corte: string;

  rei: {
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
  };

  unidades: UnidadForm[];

  proyectos: {
    externos: ProyectoForm[];
    internos: ProyectoForm[];
  };
};

type StepKey =
  | "institucion"
  | "personal"
  | "presupuesto"
  | "unidades"
  | "proyectos"
  | "participacion";

const STEPS: { key: StepKey; label: string; num: number }[] = [
  { key: "institucion", label: "1. Institución", num: 1 },
  { key: "personal", label: "2. Personal", num: 2 },
  { key: "presupuesto", label: "3. Presupuesto", num: 3 },
  { key: "unidades", label: "4. Unidades", num: 4 },
  { key: "proyectos", label: "5. Proyectos", num: 5 },
  { key: "participacion", label: "6. Participación", num: 6 },
];

function clampNumber(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function toNumber(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function emptyUnidad(): UnidadForm {
  return {
    nombre: "",
    tipo: "CENTRO",
    campos_conocimiento: "",
    area_cobertura: "",
    num_personal_academico: 0,
    num_personal_apoyo: 0,
    presupuesto_anual: 0,
  };
}

function emptyProyecto(): ProyectoForm {
  return {
    codigo: "",
    titulo: "",
    fuente_financiamiento: "",
    monto_financiamiento: 0,
    num_participantes_internos: 0,
    num_participantes_ext_nac: 0,
    num_participantes_ext_int: 0,
    num_estudiantes_pregrado: 0,
    num_estudiantes_posgrado: 0,
    fecha_inicio: "",
    fecha_fin: "",
    estado: "Activo",
  };
}

function buildDefaultState(): FormState {
  return {
    universidad_siglas: "ESPOL",
    anio: 2025,
    fecha_corte: "2025-12-31",

    rei: {
      total_estudiantes: 0,
      total_personal_academico: 0,
      total_personal_phd: 0,
      total_personal_contratado_inv: 0,
      total_personal_apoyo: 0,

      pct_presupuesto_inv: 0,
      presupuesto_externo: 0,
      presupuesto_interno: 0,

      num_est_pregrado_proy: 0,
      num_alumni_pregrado_proy: 0,
      num_est_posgrado_proy: 0,
      num_alumni_posgrado_proy: 0,
    },

    unidades: [emptyUnidad()],
    proyectos: {
      externos: [emptyProyecto()],
      internos: [],
    },
  };
}

function validateAll(state: FormState) {
  const errors: string[] = [];

  // Institución
  if (!state.universidad_siglas.trim()) errors.push("Selecciona una universidad.");
  if (!(state.anio >= 2015 && state.anio <= 2026)) errors.push("Año de registro solo puede ser entre 2015 y 2026");

  // Personal (no negativos)
  const rei = state.rei;
  const nonNegFields: Array<[string, number]> = [
    ["Total estudiantes", rei.total_estudiantes],
    ["Total personal académico", rei.total_personal_academico],
    ["Personal con PhD", rei.total_personal_phd],
    ["Personal contratado investigación", rei.total_personal_contratado_inv],
    ["Personal de apoyo", rei.total_personal_apoyo],
    ["Estudiantes pregrado en proyectos", rei.num_est_pregrado_proy],
    ["Alumni pregrado en proyectos", rei.num_alumni_pregrado_proy],
    ["Estudiantes posgrado en proyectos", rei.num_est_posgrado_proy],
    ["Alumni posgrado en proyectos", rei.num_alumni_posgrado_proy],
  ];
  for (const [name, value] of nonNegFields) {
    if (value < 0) errors.push(`${name}: no puede ser negativo.`);
  }

  // Regla del brief: PhD <= Total académico
  if (rei.total_personal_phd > rei.total_personal_academico) {
    errors.push("Personal con PhD no puede ser mayor que el total del personal académico.");
  }

  // Presupuesto: % 0-100
  if (rei.pct_presupuesto_inv < 0 || rei.pct_presupuesto_inv > 100) {
    errors.push("% presupuesto investigación debe estar entre 0 y 100.");
  }
  if (rei.presupuesto_externo < 0) errors.push("Presupuesto externo no puede ser negativo.");
  if (rei.presupuesto_interno < 0) errors.push("Presupuesto interno no puede ser negativo.");

  // Unidades
  state.unidades.forEach((u, i) => {
    if (!u.nombre.trim()) errors.push(`Unidad #${i + 1}: nombre requerido.`);
    if (!["CENTRO", "INSTITUTO"].includes(u.tipo)) errors.push(`Unidad #${i + 1}: tipo inválido.`);
    if (u.num_personal_academico < 0) errors.push(`Unidad #${i + 1}: personal académico no negativo.`);
    if (u.num_personal_apoyo < 0) errors.push(`Unidad #${i + 1}: personal apoyo no negativo.`);
    if (u.presupuesto_anual < 0) errors.push(`Unidad #${i + 1}: presupuesto anual no negativo.`);
  });

  // Proyectos (fechas y básicos)
  const checkProyecto = (p: ProyectoForm, label: string, idx: number) => {
    if (!p.titulo.trim()) errors.push(`${label} #${idx + 1}: título requerido.`);
    if (p.monto_financiamiento < 0) errors.push(`${label} #${idx + 1}: monto no puede ser negativo.`);
    const nums = [
      p.num_participantes_internos,
      p.num_participantes_ext_nac,
      p.num_participantes_ext_int,
      p.num_estudiantes_pregrado,
      p.num_estudiantes_posgrado,
    ];
    if (nums.some((n) => n < 0)) errors.push(`${label} #${idx + 1}: valores numéricos no negativos.`);

    // Validación de fechas: fecha_fin > fecha_inicio (si ambas existen)
    if (p.fecha_inicio && p.fecha_fin) {
      if (p.fecha_fin <= p.fecha_inicio) {
        errors.push(`${label} #${idx + 1}: fecha_fin debe ser mayor a fecha_inicio.`);
      }
    }
  };

  state.proyectos.externos.forEach((p, i) => checkProyecto(p, "Proyecto Externo", i));
  state.proyectos.internos.forEach((p, i) => checkProyecto(p, "Proyecto Interno", i));

  return errors;
}

const Card: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }> = ({
    title,
    subtitle,
    right,
    children,
  }) => (
    <section className="card">
      <div className="cardHead">
        <div>
          <div className="cardTitle">{title}</div>
          {subtitle ? <div className="cardSub">{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="cardBody">{children}</div>
    </section>
  );

  const FieldRow: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="gridRow">{children}</div>;

  const Field: React.FC<{
    label: string;
    hint?: string;
    error?: string;
    children: React.ReactNode;
  }> = ({ label, hint, error, children }) => (
    <label className="field">
      <div className="fieldTop">
        <span className="fieldLabel">{label}</span>
        {hint ? <span className="fieldHint">{hint}</span> : null}
      </div>
      {children}
      {error ? <div className="fieldError">{error}</div> : null}
    </label>
  );

export default function App() {
  const navigate = useNavigate();
  const [universidades, setUniversidades] = useState<UniCatalogo[]>([]);
  const [loadingUnis, setLoadingUnis] = useState(false);

  const [step, setStep] = useState<StepKey>("institucion");
  const [state, setState] = useState<FormState>(() => buildDefaultState());

  const [activeProyTab, setActiveProyTab] = useState<"externos" | "internos">("externos");

  const [toast, setToast] = useState<{ type: "ok" | "err" | "info"; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const api = useMemo(() => {
    return axios.create({
      baseURL: API_BASE,
      headers: { "Content-Type": "application/json" },
    });
  }, []);

  // Cargar universidades
  useEffect(() => {
    (async () => {
      try {
        setLoadingUnis(true);
        const res = await api.get<UniCatalogo[]>("/api/universidades");
        setUniversidades(res.data || []);
      } catch (e: any) {
        setToast({ type: "err", msg: "No se pudo cargar universidades (GET /api/universidades)." });
      } finally {
        setLoadingUnis(false);
      }
    })();
  }, [api]);

  // Helpers UI
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const softWarnings = useMemo(() => {
    // warning: suma personal unidades <= total personal declarado (brief lo pone como warning) :contentReference[oaicite:7]{index=7}
    const sumAcademico = state.unidades.reduce((acc, u) => acc + (u.num_personal_academico || 0), 0);
    const sumApoyo = state.unidades.reduce((acc, u) => acc + (u.num_personal_apoyo || 0), 0);
    const warn: string[] = [];
    if (sumAcademico > state.rei.total_personal_academico) {
      warn.push(
        `⚠️ La suma de personal académico en unidades (${sumAcademico}) supera el total declarado (${state.rei.total_personal_academico}).`
      );
    }
    if (sumApoyo > state.rei.total_personal_apoyo) {
      warn.push(`⚠️ La suma de personal de apoyo en unidades (${sumApoyo}) supera el total declarado (${state.rei.total_personal_apoyo}).`);
    }
    return warn;
  }, [state]);

  // Persistencia local (borrador)
  const saveLocalDraft = () => {
    localStorage.setItem("sigc_registro_draft", JSON.stringify(state));
    setToast({ type: "ok", msg: "Borrador guardado en el navegador (localStorage)." });
  };
  const loadLocalDraft = () => {
    const raw = localStorage.getItem("sigc_registro_draft");
    if (!raw) {
      setToast({ type: "info", msg: "No hay borrador guardado en este navegador." });
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setState(parsed);
      setToast({ type: "ok", msg: "Borrador cargado." });
    } catch {
      setToast({ type: "err", msg: "Borrador corrupto. Borra localStorage y reintenta." });
    }
  };

  const postRegistro = async (mode: "draft" | "final") => {
  const errors = validateAll(state);

  if (mode === "final" && errors.length > 0) {
    setToast({
      type: "err",
      msg: `Corrige errores antes de Finalizar: ${errors[0]} (${errors.length} total)`,
    });
    return;
  }

  setSaving(true);
  try {
    // 1) Limpia unidades: elimina filas vacías
    //    y quita campos que el backend no espera (ej: "tipo" si existe en tu UI)
    const unidadesLimpias = (state.unidades ?? [])
      .filter((u: any) => (u?.nombre ?? "").trim() !== "")
      .map((u: any) => {
        // Si tu front tiene "tipo" u otros campos UI-only, quítalos aquí
        const { tipo, ...rest } = u;
        return rest;
      });

    // 2) Limpia proyectos: elimina filas vacías y convierte fechas "" -> null
    const normalizeProyecto = (p: any) => ({
      ...p,
      fecha_inicio: p?.fecha_inicio ? p.fecha_inicio : null,
      fecha_fin: p?.fecha_fin ? p.fecha_fin : null,
    });

    const externosLimpios = (state.proyectos?.externos ?? [])
      .filter((p: any) => (p?.titulo ?? "").trim() !== "")
      .map(normalizeProyecto);

    const internosLimpios = (state.proyectos?.internos ?? [])
      .filter((p: any) => (p?.titulo ?? "").trim() !== "")
      .map(normalizeProyecto);

    // 3) Payload EXACTO como el backend lo espera
    const payload = {
      universidad_siglas: state.universidad_siglas,
      anio: Number(state.anio),
      // En tu ejemplo, fecha_corte es string "YYYY-MM-DD"
      // Si no tienes, manda null
      fecha_corte: state.fecha_corte ? state.fecha_corte : null,

      rei: state.rei,

      unidades: unidadesLimpias,

      proyectos: {
        externos: externosLimpios,
        internos: internosLimpios,
      },
    };

    const res = await api.post("/api/registro", payload);

    if (res?.data?.rei_id) {
      setToast({ type: "ok", msg: `Registro creado ✅ rei_id = ${res.data.rei_id}` });
    } else {
      setToast({
        type: "ok",
        msg: mode === "draft" ? "Borrador enviado al API ✅" : "Registro creado ✅",
      });
    }
  } catch (e: any) {
    const msg =
      e?.response?.data?.detail ||
      e?.response?.data?.message ||
      e?.message ||
      "Error al enviar registro. Revisa consola / backend logs.";
    setToast({ type: "err", msg: String(msg) });
  } finally {
    setSaving(false);
  }
};

  // UI pieces
  const setReiField = (k: keyof FormState["rei"], v: number) => {
    setState((s) => ({ ...s, rei: { ...s.rei, [k]: v } }));
  };

  const errorsNow = useMemo(() => validateAll(state), [state]);
  const phdError =
    state.rei.total_personal_phd > state.rei.total_personal_academico
      ? "PhD no puede ser mayor que total académico"
      : undefined;

  // Render steps
  const renderInstitucion = () => (
    <Card
      title="Selección Institucional"
      subtitle="Selecciona universidad, año y fecha de corte."
    >
      <FieldRow>
        <Field label="Universidad" hint={loadingUnis ? "cargando..." : ""}>
  <select
    value={state.universidad_siglas}
    onChange={(e) =>
      setState((s) => ({ ...s, universidad_siglas: e.target.value }))
    }
    style={{
      height: 42,
      width: "100%",              // 👈 CLAVE
      maxWidth: "100%",          // 👈 CLAVE
      minWidth: 0,               // 👈 CLAVE para flex/grid
      borderRadius: 12,
      border: "1px solid rgba(15,23,42,.14)",
      padding: "0 12px",
      outline: "none",
      background: "rgba(255,255,255,.9)",
      color: "var(--text)",
      boxSizing: "border-box",   // 👈 CLAVE
      overflow: "hidden",
      textOverflow: "ellipsis",  // 👈 evita que el texto estire el input
      whiteSpace: "nowrap",
    }}
  >
    {universidades.length > 0 ? (
      universidades.map((u) => (
        <option key={u.cat_id} value={u.cat_siglas}>
          {u.cat_siglas} — {u.cat_nombre_oficial}
        </option>
      ))
    ) : (
      <>
        <option value="UC">UC</option>
        <option value="ESPOL">ESPOL</option>
      </>
    )}
  </select>
</Field>


        <Field label="Año de referencia">
          <select
            className="input"
            value={state.anio ?? ""}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                anio: Number(e.target.value),
              }))
            }
          >
            <option value="" disabled>
              Selecciona un año
            </option>

            {Array.from({ length: 2026 - 2015 + 1 }, (_, i) => {
              const year = 2026 - i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>


        </Field>

        <Field label="Fecha de corte">
          <input
            className="input"
            type="date"
            value={state.fecha_corte ?? ""}
            onClick={(e) => (e.currentTarget as any).showPicker?.()}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                fecha_corte: e.target.value, // "YYYY-MM-DD"
              }))
            }
          />


        </Field>
      </FieldRow>

      <div className="divider" />

      <div className="actionsRow">
        <button className="btn ghost" onClick={loadLocalDraft}>
          Cargar borrador
        </button>
        <button className="btn ghost" onClick={saveLocalDraft}>
          Guardar borrador
        </button>
        <button
          className="btn"
          onClick={() => setState(buildDefaultState())}
          title="Reinicia a valores base"
        >
          Reiniciar
        </button>
      </div>
    </Card>
  );

  const renderPersonal = () => (
    <Card
      title="Datos Demográficos y de Personal"
      subtitle="Personal con PhD debe ser ≤ Total académico."
      right={phdError ? <span className="badge bad">{phdError}</span> : <span className="badge ok">OK</span>}
    >
     
        <FieldRow>
          <Field label="Total estudiantes">
            <input
              className="input"
              type="number"
              min={0}
              value={state.rei.total_estudiantes}
              onFocus={(e) => {
                // ✅ si está en 0, selecciona todo para que el primer número lo reemplace
                if (state.rei.total_estudiantes === 0) e.currentTarget.select();
              }}
              onChange={(e) => {
                // (opcional) mantener tu limpieza por si el navegador permite "05"
                const cleaned = e.target.value.replace(/^0+(?=\d)/, "");
                setReiField("total_estudiantes", Math.max(0, toNumber(cleaned)));
              }}
            />
          </Field>

        <Field label="Total personal académico">
          <input
            className="input"
            type="number"
            min={0}
            value={state.rei.total_personal_academico}
            onFocus={(e) => {
              if (state.rei.total_personal_academico === 0) e.currentTarget.select();
            }}
            onChange={(e) =>
              setReiField(
                "total_personal_academico",
                Math.max(0, toNumber(e.target.value))
              )
            }
          />
        </Field>

        <Field label="Personal con PhD" error={phdError}>
          <input
            className="input"
            type="number"
            min={0}
            value={state.rei.total_personal_phd}
            onFocus={(e) => {
              if (state.rei.total_personal_phd === 0) e.currentTarget.select();
            }}
            onChange={(e) =>
              setReiField(
                "total_personal_phd",
                Math.max(0, toNumber(e.target.value))
              )
            }
          />
        </Field>

        <Field label="Personal contratado para investigación">
          <input
            className="input"
            type="number"
            min={0}
            value={state.rei.total_personal_contratado_inv}
            onFocus={(e) => {
              if (state.rei.total_personal_contratado_inv === 0)
                e.currentTarget.select();
            }}
            onChange={(e) =>
              setReiField(
                "total_personal_contratado_inv",
                Math.max(0, toNumber(e.target.value))
              )
            }
          />
        </Field>

        <Field label="Personal de apoyo">
          <input
            className="input"
            type="number"
            min={0}
            value={state.rei.total_personal_apoyo}
            onFocus={(e) => {
              if (state.rei.total_personal_apoyo === 0)
                e.currentTarget.select();
            }}
            onChange={(e) =>
              setReiField(
                "total_personal_apoyo",
                Math.max(0, toNumber(e.target.value))
              )
            }
          />
        </Field>
      </FieldRow>

      {softWarnings.length ? (
        <div className="warnBox">
          {softWarnings.map((w, idx) => (
            <div key={idx}>{w}</div>
          ))}
        </div>
      ) : null}
    </Card>
  );

  const renderPresupuesto = () => (
    <Card
      title="Presupuesto"
      subtitle="Porcentaje 0–100 y montos (USD)."
      right={<span className="badge">{state.rei.pct_presupuesto_inv.toFixed(0)}%</span>}
    >
      <FieldRow>
        <Field label="% presupuesto anual a investigación">
          <input
            className="input"
            type="range"
            min={0}
            max={100}
            value={state.rei.pct_presupuesto_inv}
            onChange={(e) => setReiField("pct_presupuesto_inv", clampNumber(toNumber(e.target.value), 0, 100))}
          />
          <div className="rangeMeta">
            <span>0</span>
            <span className="mono">{state.rei.pct_presupuesto_inv.toFixed(0)}%</span>
            <span>100</span>
          </div>
        </Field>

        <Field label="Presupuesto externo (USD)">
          <input
            className="input"
            type="number"
            min={0}
            value={state.rei.presupuesto_externo}
            onFocus={(e) => {
              if (state.rei.total_personal_contratado_inv === 0)
                e.currentTarget.select();
            }}
            onChange={(e) => setReiField("presupuesto_externo", Math.max(0, toNumber(e.target.value)))}
          />
        </Field>

        <Field label="Presupuesto interno (USD)">
          <input
            className="input"
            type="number"
            min={0}
            value={state.rei.presupuesto_interno}
            onFocus={(e) => {
              if (state.rei.total_personal_contratado_inv === 0)
                e.currentTarget.select();
            }}
            onChange={(e) => setReiField("presupuesto_interno", Math.max(0, toNumber(e.target.value)))}
          />
        </Field>
      </FieldRow>
    </Card>
  );

  const renderUnidades = () => (
    <Card
      title="Unidades de Investigación"
      subtitle='Usa "Agregar Unidad" si deseas registrar varias unidades.'
      right={
        <button
          onClick={() =>
            setState((s) => ({
              ...s,
              unidades: [...s.unidades, emptyUnidad()],
            }))
          }
          style={{
            background: "linear-gradient(135deg, #218849, #16a34a)",
              color: "#fff",
              border: "none",
              padding: "10px 20px",
              borderRadius: "10px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              transition: "all 0.25s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 14px rgba(0,0,0,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.15)";
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 900 }}>＋</span>
          Agregar Unidad
        </button>

      }
    >
      <div className="stack">
        {state.unidades.map((u, idx) => (
          <div key={idx} className="subCard">
            <div className="subHead">
              <div className="subTitle">
                Unidad #{idx + 1} <span className="badge">{u.tipo}</span>
              </div>
              <div className="subActions">
                <button
                  className="btn ghost"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      unidades: s.unidades.filter((_, i) => i !== idx),
                    }))
                  }
                  disabled={state.unidades.length <= 1}
                  title={state.unidades.length <= 1 ? "Debe existir al menos 1 unidad" : "Eliminar"}
                >
                  Eliminar
                </button>
              </div>
            </div>

            <FieldRow>
              <Field label="Nombre">
                <input
                  className="input"
                  value={u.nombre}
                  onChange={(e) =>
                    setState((s) => {
                      const next = [...s.unidades];
                      next[idx] = { ...next[idx], nombre: e.target.value };
                      return { ...s, unidades: next };
                    })
                  }
                />
              </Field>

              <Field label="Tipo">
                <select
                  className="input"
                  value={u.tipo}
                  onChange={(e) =>
                    setState((s) => {
                      const next = [...s.unidades];
                      next[idx] = { ...next[idx], tipo: e.target.value as UnidadForm["tipo"] };
                      return { ...s, unidades: next };
                    })
                  }
                >
                  <option value="CENTRO">CENTRO</option>
                  <option value="INSTITUTO">INSTITUTO</option>
                </select>
              </Field>

              <Field label="Campos de conocimiento">
                <input
                  className="input"
                  value={u.campos_conocimiento}
                  onChange={(e) =>
                    setState((s) => {
                      const next = [...s.unidades];
                      next[idx] = { ...next[idx], campos_conocimiento: e.target.value };
                      return { ...s, unidades: next };
                    })
                  }
                />
              </Field>

              <Field label="Área cobertura">
                <input
                  className="input"
                  value={u.area_cobertura}
                  onChange={(e) =>
                    setState((s) => {
                      const next = [...s.unidades];
                      next[idx] = { ...next[idx], area_cobertura: e.target.value };
                      return { ...s, unidades: next };
                    })
                  }
                />
              </Field>

              <Field label="Nº personal académico">
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={u.num_personal_academico}
                  onFocus={(e) => {
                    if (state.rei.total_personal_contratado_inv === 0)
                      e.currentTarget.select();
                  }}
                  onChange={(e) =>
                    setState((s) => {
                      const next = [...s.unidades];
                      next[idx] = { ...next[idx], num_personal_academico: Math.max(0, toNumber(e.target.value)) };
                      return { ...s, unidades: next };
                    })
                  }
                />
              </Field>

              <Field label="Nº personal apoyo">
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={u.num_personal_apoyo}
                  onFocus={(e) => {
                    if (state.rei.total_personal_contratado_inv === 0)
                      e.currentTarget.select();
                  }}
                  onChange={(e) =>
                    setState((s) => {
                      const next = [...s.unidades];
                      next[idx] = { ...next[idx], num_personal_apoyo: Math.max(0, toNumber(e.target.value)) };
                      return { ...s, unidades: next };
                    })
                  }
                />
              </Field>

              <Field label="Presupuesto anual (USD)">
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={u.presupuesto_anual}
                  onChange={(e) =>
                    setState((s) => {
                      const next = [...s.unidades];
                      next[idx] = { ...next[idx], presupuesto_anual: Math.max(0, toNumber(e.target.value)) };
                      return { ...s, unidades: next };
                    })
                  }
                />
              </Field>
            </FieldRow>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderProyectos = () => {
    const list = activeProyTab === "externos" ? state.proyectos.externos : state.proyectos.internos;
    const tabLabel = activeProyTab === "externos" ? "Externos" : "Internos";

    const add = () => {
      setState((s) => ({
        ...s,
        proyectos: {
          ...s.proyectos,
          [activeProyTab]: [...(s.proyectos as any)[activeProyTab], emptyProyecto()],
        } as any,
      }));
    };

    const removeAt = (idx: number) => {
      setState((s) => ({
        ...s,
        proyectos: {
          ...s.proyectos,
          [activeProyTab]: (s.proyectos as any)[activeProyTab].filter((_: any, i: number) => i !== idx),
        } as any,
      }));
    };

    const updateAt = (idx: number, patch: Partial<ProyectoForm>) => {
      setState((s) => {
        const next = [...(s.proyectos as any)[activeProyTab]];
        next[idx] = { ...next[idx], ...patch };
        return { ...s, proyectos: { ...s.proyectos, [activeProyTab]: next } as any };
      });
    };

    return (
      <Card
        title="Proyectos de Investigación"
        subtitle="Seleccionar entre Proyectos Externos o Internos de la Institución"
        right={
          <div className="tabs">
            <button
              className={`tab ${activeProyTab === "externos" ? "active" : ""}`}
              onClick={() => setActiveProyTab("externos")}
            >
              Externos
            </button>
            <button
              className={`tab ${activeProyTab === "internos" ? "active" : ""}`}
              onClick={() => setActiveProyTab("internos")}
            >
              Internos
            </button>
          </div>
        }
      >
        <div className="actionsRow">
         <button
          onClick={add}
          style={{
            height: 42,
            padding: "0 18px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg,#218849,#16a34a)",
            color: "#fff",
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 6px 14px rgba(0,0,0,0.18)",
            transition: "all .2s ease",

            /* ✅ CLAVE: que NO se estire a todo el ancho */
            alignSelf: "flex-start",
            width: "fit-content",
            maxWidth: "100%",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 18px rgba(0,0,0,0.22)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 6px 14px rgba(0,0,0,0.18)";
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>＋</span>
          Agregar proyecto {tabLabel}
        </button>


        </div>

        <div className="stack">
          {list.map((p, idx) => (
            <div key={idx} className="subCard">
              <div className="subHead">
                <div className="subTitle">
                  {tabLabel} #{idx + 1}{" "}
                  {p.fecha_inicio && p.fecha_fin && p.fecha_fin <= p.fecha_inicio ? (
                    <span className="badge bad">Fechas inválidas</span>
                  ) : (
                    <span className="badge ok">OK</span>
                  )}
                </div>
                <div className="subActions">
                  <button className="btn ghost" onClick={() => removeAt(idx)} disabled={list.length <= 1}>
                    Eliminar
                  </button>
                </div>
              </div>

              <FieldRow>
                <Field label="Código">
                  <input className="input" value={p.codigo} onChange={(e) => updateAt(idx, { codigo: e.target.value })} />
                </Field>

                <Field label="Título">
                  <input className="input" value={p.titulo} onChange={(e) => updateAt(idx, { titulo: e.target.value })} />
                </Field>

                <Field label="Fuente financiamiento">
                  <input
                    className="input"
                    value={p.fuente_financiamiento}
                    onChange={(e) => updateAt(idx, { fuente_financiamiento: e.target.value })}
                  />
                </Field>

                <Field label="Monto (USD)">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={p.monto_financiamiento}
                    onFocus={(e) => {
                      if (state.rei.total_personal_contratado_inv === 0)
                        e.currentTarget.select();
                    }}
                    onChange={(e) => updateAt(idx, { monto_financiamiento: Math.max(0, toNumber(e.target.value)) })}
                  />
                </Field>

                <Field label="Participantes internos">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={p.num_participantes_internos}
                    onFocus={(e) => {
                      if (state.rei.total_personal_contratado_inv === 0)
                        e.currentTarget.select();
                    }}
                    onChange={(e) => updateAt(idx, { num_participantes_internos: Math.max(0, toNumber(e.target.value)) })}
                  />
                </Field>

                <Field label="Participantes ext. nac">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={p.num_participantes_ext_nac}
                    onFocus={(e) => {
                      if (state.rei.total_personal_contratado_inv === 0)
                        e.currentTarget.select();
                    }}
                    onChange={(e) => updateAt(idx, { num_participantes_ext_nac: Math.max(0, toNumber(e.target.value)) })}
                  />
                </Field>

                <Field label="Participantes ext. int">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={p.num_participantes_ext_int}
                    onFocus={(e) => {
                      if (state.rei.total_personal_contratado_inv === 0)
                        e.currentTarget.select();
                    }}
                    onChange={(e) => updateAt(idx, { num_participantes_ext_int: Math.max(0, toNumber(e.target.value)) })}
                  />
                </Field>

                <Field label="Estudiantes pregrado">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={p.num_estudiantes_pregrado}
                    onFocus={(e) => {
                      if (state.rei.total_personal_contratado_inv === 0)
                        e.currentTarget.select();
                    }}
                    onChange={(e) => updateAt(idx, { num_estudiantes_pregrado: Math.max(0, toNumber(e.target.value)) })}
                  />
                </Field>

                <Field label="Estudiantes posgrado">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={p.num_estudiantes_posgrado}
                    onFocus={(e) => {
                      if (state.rei.total_personal_contratado_inv === 0)
                        e.currentTarget.select();
                    }}
                    onChange={(e) => updateAt(idx, { num_estudiantes_posgrado: Math.max(0, toNumber(e.target.value)) })}
                  />
                </Field>

                <Field label="Fecha inicio">
                  <input className="input" type="date" value={p.fecha_inicio} onClick={(e) => (e.currentTarget as any).showPicker?.()} onChange={(e) => updateAt(idx, { fecha_inicio: e.target.value })} />
                </Field>

                <Field label="Fecha fin">
                  <input className="input" type="date" value={p.fecha_fin} onClick={(e) => (e.currentTarget as any).showPicker?.()} onChange={(e) => updateAt(idx, { fecha_fin: e.target.value })} />
                </Field>

                <Field label="Estado">
                <select
                  className="input"
                  value={p.estado}
                  onChange={(e) => updateAt(idx, { estado: e.target.value })}
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="PAUSADO">Pausado</option>
                  <option value="CANCELADO">Cancelado</option>
                  <option value="TERMINADO">Terminado</option>
                </select>
              </Field>

              </FieldRow>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  const renderParticipacion = () => (
    <Card title="Participación Estudiantil" subtitle="Estudiantes de Pregrado / Posgrado o Alumni activos en proyectos">
      <FieldRow>
        <Field label="Estudiantes pregrado en proyectos">
          <input
            className="input"
            type="number"
            min={0}
            value={state.rei.num_est_pregrado_proy}
            onFocus={(e) => {
              if (state.rei.total_personal_contratado_inv === 0)
                e.currentTarget.select();
            }}
            onChange={(e) => setReiField("num_est_pregrado_proy", Math.max(0, toNumber(e.target.value)))}
          />
        </Field>

        <Field label="Alumni pregrado (participaron)">
          <input
            className="input"
            type="number"
            min={0}
            value={state.rei.num_alumni_pregrado_proy}
            onFocus={(e) => {
              if (state.rei.total_personal_contratado_inv === 0)
                e.currentTarget.select();
            }}
            onChange={(e) => setReiField("num_alumni_pregrado_proy", Math.max(0, toNumber(e.target.value)))}
          />
        </Field>

        <Field label="Estudiantes posgrado en proyectos">
          <input
            className="input"
            type="number"
            min={0}
            value={state.rei.num_est_posgrado_proy}
            onFocus={(e) => {
              if (state.rei.total_personal_contratado_inv === 0)
                e.currentTarget.select();
            }}
            onChange={(e) => setReiField("num_est_posgrado_proy", Math.max(0, toNumber(e.target.value)))}
          />
        </Field>

        <Field label="Alumni posgrado (participaron)">
          <input
            className="input"
            type="number"
            min={0}
            value={state.rei.num_alumni_posgrado_proy}
            onFocus={(e) => {
              if (state.rei.total_personal_contratado_inv === 0)
                e.currentTarget.select();
            }}
            onChange={(e) => setReiField("num_alumni_posgrado_proy", Math.max(0, toNumber(e.target.value)))}
          />
        </Field>
      </FieldRow>
    </Card>
  );

  const currentStepUI = () => {
    switch (step) {
      case "institucion":
        return renderInstitucion();
      case "personal":
        return renderPersonal();
      case "presupuesto":
        return renderPresupuesto();
      case "unidades":
        return renderUnidades();
      case "proyectos":
        return renderProyectos();
      case "participacion":
        return renderParticipacion();
      default:
        return renderInstitucion();
    }
  };

  const goPrev = () => setStep(STEPS[Math.max(0, stepIndex - 1)].key);
  const goNext = () => setStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)].key);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        maxWidth: "100vw",
        overflowX: "hidden",
        background:
          "radial-gradient(900px 500px at 12% 12%, rgba(45,106,106,.20), transparent 60%)," +
          "radial-gradient(700px 380px at 85% 16%, rgba(31,58,90,.18), transparent 60%)," +
          "linear-gradient(180deg, var(--bg1), var(--bg2))",
        padding: 26,
        boxSizing: "border-box",
      }}
    >

      <style>{css}</style>

      <header className="header">
        <div>
          <h1 className="title">SIGC — Registro</h1>
          <p className="subtitle ">Formulario por secciones, complete los campos obligatorios para realizar registro.</p>
        </div>
        
    <div className="form-header">

       <div className="headerRight">
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              background: "linear-gradient(135deg, #3d2259, #a31edd)",
              color: "#fff",
              border: "none",
              padding: "10px 20px",
              borderRadius: "10px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              transition: "all 0.25s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 14px rgba(0,0,0,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.15)";
            }}
          >
            Ir al Dashboard
          </button>

        </div>
    </div>

      </header>

      <nav className="stepper">
        {STEPS.map((s) => {
          const active = s.key === step;
          const done = STEPS.findIndex((x) => x.key === s.key) < stepIndex;
          return (
            <button
              key={s.key}
              className={`step ${active ? "active" : ""} ${done ? "done" : ""}`}
              onClick={() => setStep(s.key)}
              title={s.label}
            >
              <span className="stepDot">{s.num}</span>
              <span className="stepLabel">{s.label}</span>
            </button>
          );
        })}

        <div className="headerRight">
          <button
            onClick={() => postRegistro("final")}
            disabled={saving}
            style={{
              background: "linear-gradient(90deg, #218849, #16a34a)",
              color: "#fff",
              border: "none",
              padding: "10px 20px",
              borderRadius: "10px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              transition: "all 0.25s ease",

              /* ✅ que no se estire ni se rompa */
              alignSelf: "flex-start",
              width: "fit-content",
              maxWidth: "100%",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 10px 22px rgba(0,0,0,0.25)";
                e.currentTarget.style.background =
                  "linear-gradient(90deg, #218849, #16a34a)";
              }
            }}
            onMouseLeave={(e) => {
              if (!saving) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 18px rgba(0,0,0,0.20)";
                e.currentTarget.style.background =
                  "linear-gradient(90deg, #218849, #16a34a)";
              }
            }}
          >
            {saving ? "Enviando..." : "Realizar Registro"}
          </button>

        </div>
      </nav>
      

      <main className="main">{currentStepUI()}</main>
      

      <footer className="footer">
        <div className="leftMeta">
          <span
            className="pill"
            style={
              errorsNow.length > 0
                ? {
                    backgroundColor: "#fee2e2",
                    color: "#991b1b",
                    border: "1px solid #fecaca",
                  }
                : {}
            }
          >
            Errores: <b>{errorsNow.length}</b>
          </span>

          {errorsNow.length > 0 ? <span className="hint"> {errorsNow[0]}</span> : <span className="hint">Todo OK.</span>}
        </div>

        <div className="footerRight">
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
              width: "100%",
              flexWrap: "wrap",
            }}
    >
      {/* Anterior */}
      <button
        onClick={goPrev}
        disabled={stepIndex === 0}
        style={{
          flex: "0 0 180px",     // 👈 tamaño fijo en desktop
          padding: "10px 16px",
          borderRadius: "10px",
          border: "1px solid #cbd5e1",
          background: stepIndex === 0 ? "#e5e7eb" : "#ffffff",
          color: "#334155",
          fontWeight: 600,
          cursor: stepIndex === 0 ? "not-allowed" : "pointer",
          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          transition: "all .2s ease",
        }}
      >
        ← Anterior
      </button>

      {/* Siguiente */}
      <button
        onClick={goNext}
        disabled={stepIndex === STEPS.length - 1}
        style={{
          flex: "0 0 180px",     // 👈 tamaño fijo en desktop
          padding: "10px 16px",
          borderRadius: "10px",
          border: "none",
          background:
            stepIndex === STEPS.length - 1
              ? "#9ca3af"
              : "linear-gradient(90deg, rgba(18, 68, 128, 0.96), rgba(26, 148, 204, 0.96))",
          color: "#fff",
          fontWeight: 600,
          cursor:
            stepIndex === STEPS.length - 1 ? "not-allowed" : "pointer",
          boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
          transition: "all .2s ease",
        }}
      >
        Siguiente →
      </button>
    </div>

            </div>
          </footer>
          <div style={{ height: 18 }} />
          <div style={{ color:"#334155", textAlign: "center", fontWeight: 800, opacity: 0.9 }}>
            SIGC · Formulario de Registro · {new Date().getFullYear()}
          </div>

          {toast ? (
            <div className={`toast ${toast.type}`}>
              <div className="toastMsg">{toast.msg}</div>
              <button className="toastX" onClick={() => setToast(null)}>
                ✕
              </button>
            </div>
          ) : null}
        </div>
        
  );
}

const css = `
  :root{
    --bg1:#f2f7f6;
    --bg2:#e9f1ef;
    --card:#ffffffcc;
    --stroke:#d7e6e2;
    --text:#0f172a;
    --muted:#334155;
    --pill:#0b1220;
    --pillText:#e5e7eb;

    /* paleta pastel basada en tu referencia (verdes/azules suaves) */
    --a:#2d6a6a;
    --a2:#3a7f7f;
    --b:#1f3a5a;
    --shadow: 0 18px 40px rgba(15, 23, 42, .10);
    --shadow2: 0 10px 25px rgba(15, 23, 42, .10);
    --r:18px;
  }

  *{ box-sizing:border-box; }
  body{ margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--text); }

  .header{
    display:flex;
    justify-content:space-between;
    align-items:flex-end;
    gap:16px;
    padding: 22px 22px 14px 22px;
    border: 1px solid var(--stroke);
    border-radius: var(--r);
    background: var(--card);
    box-shadow: var(--shadow);
    backdrop-filter: blur(10px);
  }
  .title{
    margin:0;
    font-size: 44px;
    letter-spacing: .2px;
    color: var(--b);
  }
  .subtitle{
    margin:6px 0 0 0;
    color: var(--muted);
    font-size: 14px;
  }
  .headerRight{
    display:flex;
    gap:10px;
    align-items:center;
    flex-wrap:wrap;
    padding-bottom: 4px;
  }

  .stepper{
    display:flex;
    gap:10px;
    margin-top: 14px;
    padding: 10px;
    border-radius: var(--r);
    border: 1px solid var(--stroke);
    background: rgba(255, 255, 255, 0);
    box-shadow: var(--shadow2);
    overflow:auto;
  }
  .step{
    display:flex;
    align-items:center;
    gap:10px;
    padding: 10px 12px;
    border-radius: 999px;
    border: 1px solid rgba(15,23,42,.10);
    background: linear-gradient(90deg, rgba(150, 155, 161, 0.96), rgb(90, 105, 105));
    cursor:pointer;
    user-select:none;
    white-space:nowrap;
    transition: transform .08s ease, background .2s ease, border-color .2s ease;
  }
  .step:hover{ transform: translateY(-1px); background: rgba(45,106,106,.10); }
  .step.active{
    background: linear-gradient(90deg, rgba(31,58,90,.96), rgba(45,106,106,.96));
    border-color: rgba(255,255,255,.25);
    color: white;
  }
  .step.done{
    background: rgba(45,106,106,.12);
  }
  .stepDot{
    width:28px; height:28px;
    display:grid; place-items:center;
    border-radius:999px;
    font-weight:700;
    background: rgba(255,255,255,.8);
    color: var(--b);
  }
  .step.active .stepDot{ background: rgba(255,255,255,.18); color:#fff; }
  .stepLabel{ font-weight:600; font-size: 13px; }

  .main{
    margin-top: 14px;
    display:flex;
    flex-direction:column;
    gap: 14px;
  }

  .card{
    border-radius: var(--r);
    background: var(--card);
    border: 1px solid var(--stroke);
    box-shadow: var(--shadow2);
    backdrop-filter: blur(10px);
    overflow:hidden;
  }
  .cardHead{
    display:flex;
    justify-content:space-between;
    gap:12px;
    padding: 16px 18px;
    border-bottom: 1px solid rgba(15,23,42,.08);
    background: linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,255,255,.55));
  }
  .cardTitle{
    font-size: 18px;
    font-weight: 800;
    color: var(--b);
  }
  .cardSub{
    margin-top: 4px;
    font-size: 13px;
    color: var(--muted);
  }
  .cardBody{
    padding: 18px;
  }

  .gridRow{
    display:grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  @media (max-width: 1100px){
    .gridRow{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .title{ font-size: 34px; }
  }
  @media (max-width: 760px){
    .gridRow{ grid-template-columns: 1fr; }
    .page{ padding: 14px; }
    .title{ font-size: 28px; }
  }

  .field{
    display:flex;
    flex-direction:column;
    gap:6px;
  }
  .fieldTop{
    display:flex;
    justify-content:space-between;
    align-items:baseline;
    gap:10px;
  }
  .fieldLabel{
    font-size: 12px;
    font-weight: 800;
    letter-spacing: .3px;
    color: rgba(15,23,42,.85);
  }
  .fieldHint{
    font-size: 12px;
    color: rgba(51,65,85,.8);
  }
  .fieldError{
    font-size: 12px;
    color: #b91c1c;
    font-weight: 700;
  }
  .input{
    height: 42px;
    border-radius: 12px;
    border: 1px solid rgba(15,23,42,.14);
    padding: 0 12px;
    outline: none;
    background: rgba(255,255,255,.9);
    transition: border-color .15s ease, box-shadow .15s ease;
    color: var(--text);
  }
  .input:focus{
    border-color: rgba(45,106,106,.55);
    box-shadow: 0 0 0 4px rgba(45,106,106,.15);
  }

  .divider{
    height:1px;
    background: rgba(15,23,42,.08);
    margin: 16px 0;
  }

  .btn{
    height: 40px;
    padding: 0 14px;
    border-radius: 12px;
    border: 1px solid rgba(15,23,42,.14);
    background: rgba(15,23,42,.06);
    cursor:pointer;
    font-weight: 800;
    color: rgba(15,23,42,.9);
    transition: transform .08s ease, background .2s ease, border-color .2s ease;
  }
  .btn:hover{ transform: translateY(-1px); background: rgba(45,106,106,.12); border-color: rgba(45,106,106,.25); }
  .btn:disabled{ opacity:.55; cursor:not-allowed; transform:none; }
  .btn.primary{
    border-color: rgba(255,255,255,.18);
    background: linear-gradient(90deg, rgba(31,58,90,.96), rgba(45,106,106,.96));
    color: white;
  }
  .btn.primary:hover{ background: linear-gradient(90deg, rgba(31,58,90,1), rgba(45,106,106,1)); }
  .btn.ghost{
    background: rgba(255,255,255,.55);
  }

  .pill{
    padding: 8px 10px;
    border-radius: 999px;
    background: rgba(15,23,42,.85);
    color: var(--pillText);
    font-size: 12px;
  }
  .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

  .badge{
    display:inline-flex;
    align-items:center;
    gap:6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(15,23,42,.08);
    border: 1px solid rgba(15,23,42,.10);
    font-size: 12px;
    font-weight: 900;
    color: rgba(15,23,42,.8);
  }
  .badge.ok{
    background: rgba(16,185,129,.14);
    border-color: rgba(16,185,129,.25);
    color: rgba(6,95,70,.95);
  }
  .badge.bad{
    background: rgba(239,68,68,.14);
    border-color: rgba(239,68,68,.25);
    color: rgba(127,29,29,.95);
  }

  .actionsRow{
    display:flex;
    gap:10px;
    flex-wrap:wrap;
    align-items:center;
  }

  .rangeMeta{
    display:flex;
    justify-content:space-between;
    font-size: 12px;
    color: rgba(51,65,85,.9);
    margin-top: 6px;
  }

  .warnBox{
    margin-top: 12px;
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(245,158,11,.14);
    border: 1px solid rgba(245,158,11,.22);
    color: rgba(120,53,15,.95);
    font-weight: 700;
  }

  .stack{
    display:flex;
    flex-direction:column;
    gap: 12px;
  }

  .subCard{
    border-radius: 16px;
    border: 1px solid rgba(15,23,42,.10);
    background: rgba(255,255,255,.65);
    box-shadow: 0 10px 20px rgba(15,23,42,.06);
    overflow:hidden;
  }
  .subHead{
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding: 12px 14px;
    border-bottom: 1px solid rgba(15,23,42,.08);
  }
  .subTitle{
    font-weight: 900;
    color: rgba(31,58,90,.95);
    display:flex;
    align-items:center;
    gap:10px;
  }
  .subActions{ display:flex; gap:10px; }
  .subCard .gridRow{ padding: 14px; }

  .tabs{
    display:flex;
    gap:8px;
    padding: 6px;
    border-radius: 999px;
    background: rgba(15,23,42,.06);
    border: 1px solid rgba(15,23,42,.10);
  }
  .tab{
    height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid transparent;
    background: transparent;
    cursor:pointer;
    font-weight: 900;
    color: rgba(15,23,42,.75);
  }
  .tab.active{
    background: rgba(255,255,255,.75);
    border-color: rgba(15,23,42,.12);
    color: rgba(31,58,90,.95);
  }

  .footer{
    margin-top: 14px;
    padding: 12px 14px;
    border-radius: var(--r);
    border: 1px solid var(--stroke);
    background: rgba(255,255,255,.60);
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap: 12px;
    box-shadow: var(--shadow2);
  }
  .leftMeta{
    display:flex;
    gap:10px;
    align-items:center;
    flex-wrap:wrap;
  }
  .hint{
    font-size: 12px;
    color: rgba(51,65,85,.85);
  }
  .footerRight{ display:flex; gap:10px; }

  .toast{
    position: fixed;
    right: 18px;
    bottom: 18px;
    display:flex;
    align-items:center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid rgba(15,23,42,.12);
    background: rgba(255,255,255,.85);
    box-shadow: var(--shadow);
    backdrop-filter: blur(10px);
    max-width: min(680px, calc(100vw - 36px));
  }
  .toast.ok{ border-color: rgba(16,185,129,.25); }
  .toast.err{ border-color: rgba(239,68,68,.25); }
  .toast.info{ border-color: rgba(59,130,246,.25); }
  .toastMsg{
    font-weight: 800;
    color: rgba(15,23,42,.9);
  }
  .toastX{
    border:none;
    background: rgba(15,23,42,.08);
    width: 34px;
    height: 34px;
    border-radius: 10px;
    cursor:pointer;
    font-weight: 900;
  }
`;
