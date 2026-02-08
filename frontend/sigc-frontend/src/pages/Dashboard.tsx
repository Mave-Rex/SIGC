import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8000";

type UniversidadOut = {
  cat_id: number;
  cat_siglas: string;
  cat_nombre_oficial: string;
  cat_ciudad: string;
  cat_activa?: boolean;
};

type RegistroListItemOut = {
  rei_id: number;
  universidad_siglas: string;
  universidad_nombre: string;
  anio: number;
  fecha_corte: string;
};

type RegistroDetalleOut = {
  universidad: {
    cat_id: number;
    cat_siglas: string;
    cat_nombre_oficial: string;
    cat_ciudad: string;
    cat_activa?: boolean;
  };
  rei: {
    rei_id: number;
    rei_cat_id: number;
    anio: number;
    fecha_corte: string;

    total_estudiantes: number;
    total_personal_academico: number;
    total_personal_phd: number;
    total_personal_contratado_inv: number;
    total_personal_apoyo: number;

    pct_presupuesto_inv: string | number;
    presupuesto_externo: string | number;
    presupuesto_interno: string | number;

    num_est_pregrado_proy: number;
    num_alumni_pregrado_proy: number;
    num_est_posgrado_proy: number;
    num_alumni_posgrado_proy: number;
  };
  unidades: Array<{
    uni_id: number;
    nombre: string;
    campos_conocimiento: string;
    area_cobertura: string;
    num_personal_academico: number;
    num_personal_apoyo: number;
    presupuesto_anual: string | number;
  }>;
  proyectos: {
    externos: Array<ProyectoRow>;
    internos: Array<ProyectoRow>;
  };
};

type ProyectoRow = {
  pry_id: number;
  tipo: string;
  codigo: string;
  titulo: string;
  fuente_financiamiento: string;
  monto_financiamiento: string | number;
  num_participantes_internos: number;
  num_participantes_ext_nac: number;
  num_participantes_ext_int: number;
  num_estudiantes_pregrado: number;
  num_estudiantes_posgrado: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
};

type UniFilter = "UC" | "ESPOL" | "AMBAS";

const YEARS = [2025, 2024]; // mayor a menor, como prefieres

const palette = {
  bg1: "#f2f7f6",
  bg2: "#e9f1ef",
  card: "rgba(255,255,255,0.92)",
  stroke: "rgba(15,23,42,0.10)",
  text: "#0f172a",
  muted: "#334155",
  a: "#2d6a6a",
  a2: "#3a7f7f",
  b: "#1f3a5a",
  okBg: "rgba(34,197,94,0.14)",
  okBorder: "rgba(34,197,94,0.35)",
  dangerBg: "rgba(239,68,68,0.12)",
  dangerBorder: "rgba(239,68,68,0.30)",
};

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(n: number): string {
  try {
    return n.toLocaleString("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  } catch {
    return `$${Math.round(n).toLocaleString()}`;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pct(part: number, total: number): number {
  if (!total) return 0;
  return (part / total) * 100;
}

/** ---------- UI primitives (inline styles) ---------- */

const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      minHeight: "100vh",
      width: "100vw",
      maxWidth: "100vw",
      overflowX: "hidden",
      background:
        `radial-gradient(900px 500px at 12% 12%, rgba(45,106,106,.20), transparent 60%),` +
        `radial-gradient(700px 380px at 85% 16%, rgba(31,58,90,.18), transparent 60%),` +
        `linear-gradient(180deg, ${palette.bg1}, ${palette.bg2})`,
      padding: 18,
      boxSizing: "border-box",
    }}
   >
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>{children}</div>
  </div>
);

const TopBar: React.FC<{ title: string; subtitle: string; right?: React.ReactNode }> = ({
  title,
  subtitle,
  right,
}) => (
  <div
    style={{
      background: palette.card,
      border: `1px solid ${palette.stroke}`,
      borderRadius: 18,
      padding: 18,
      boxShadow: "0 18px 40px rgba(15, 23, 42, .10)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      flexWrap: "wrap",
    }}
  >
    <div style={{ minWidth: 240 }}>
      <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -0.6, color: palette.b }}>
        {title}
      </div>
      <div style={{ marginTop: 4, color: palette.muted }}>{subtitle}</div>
    </div>
    {right ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{right}</div> : null}
  </div>
);

const Card: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  subtitle,
  right,
  children,
}) => (
  <section
    style={{
      background: palette.card,
      border: `1px solid ${palette.stroke}`,
      borderRadius: 18,
      boxShadow: "0 12px 28px rgba(15, 23, 42, .08)",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        padding: 16,
        borderBottom: `1px solid ${palette.stroke}`,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 240, flex: "1 1 280px" }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: palette.b }}>{title}</div>
        {subtitle ? <div style={{ marginTop: 4, color: palette.muted }}>{subtitle}</div> : null}
      </div>
      {right ? <div style={{ flex: "0 0 auto", maxWidth: "100%" }}>{right}</div> : null}
    </div>
    <div style={{ padding: 16 }}>{children}</div>
  </section>
);

const Pill: React.FC<{ text: string; kind?: "ok" | "danger" | "neutral" }> = ({ text, kind = "neutral" }) => {
  const s =
    kind === "ok"
      ? { background: palette.okBg, border: palette.okBorder, color: "#14532d" }
      : kind === "danger"
      ? { background: palette.dangerBg, border: palette.dangerBorder, color: "#7f1d1d" }
      : { background: "rgba(15,23,42,.06)", border: "rgba(15,23,42,.12)", color: palette.text };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${s.border}`,
        background: s.background,
        color: s.color,
        fontWeight: 800,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
};

const Select: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}> = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      height: 42,
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      borderRadius: 12,
      border: "1px solid rgba(15,23,42,.14)",
      padding: "0 38px 0 12px",
      outline: "none",
      backgroundColor: "rgba(255,255,255,.9)",
      color: palette.text,
      boxSizing: "border-box",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      appearance: "none",
      backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%231e293b'><path d='M5 7l5 6 5-6'/></svg>\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 12px center",
      backgroundSize: "16px",
    }}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

const Input: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => (
  <input
    value={value}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    style={{
      height: 42,
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      borderRadius: 12,
      border: "1px solid rgba(15,23,42,.14)",
      padding: "0 12px",
      outline: "none",
      background: "rgba(255,255,255,.9)",
      transition: "border-color .15s ease, box-shadow .15s ease",
      color: palette.text,
      boxSizing: "border-box",
    }}
  />
);

/** ---------- Charts (SVG) ---------- */

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

const DonutChart: React.FC<{
  items: Array<{ label: string; value: number; color: string }>;
}> = ({ items }) => {
  const total = items.reduce((a, b) => a + Math.max(0, b.value), 0);
  const size = 190;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  const stroke = 18;

  let acc = 0;
  const arcs = items
    .filter((it) => it.value > 0)
    .map((it) => {
      const start = (acc / total) * 360;
      acc += it.value;
      const end = (acc / total) * 360;
      return { ...it, start, end };
    });

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut chart">
        {/* base ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(15,23,42,.08)" strokeWidth={stroke} />
        {total > 0
          ? arcs.map((a, idx) => (
              <path
                key={idx}
                d={describeArc(cx, cy, r, a.start, a.end)}
                fill="none"
                stroke={a.color}
                strokeWidth={stroke}
                strokeLinecap="round"
              />
            ))
          : null}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="14" fontWeight="800" fill={palette.text}>
          Total
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize="18" fontWeight="900" fill={palette.b}>
          {total.toLocaleString()}
        </text>
      </svg>

      <div style={{ minWidth: 220 }}>
        {items.map((it) => {
          const p = total ? Math.round(pct(it.value, total)) : 0;
          return (
            <div key={it.label} style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: it.color,
                    flex: "0 0 auto",
                  }}
                />
                <span style={{ color: palette.text, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {it.label}
                </span>
              </div>
              <span style={{ color: palette.muted, fontWeight: 800 }}>{p}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BarChart: React.FC<{
  title: string;
  aLabel: string;
  aValue: number;
  bLabel: string;
  bValue: number;
}> = ({ title, aLabel, aValue, bLabel, bValue }) => {
  const maxV = Math.max(1, aValue, bValue);
  const wA = clamp((aValue / maxV) * 100, 0, 100);
  const wB = clamp((bValue / maxV) * 100, 0, 100);

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "160px 1fr 120px",
    gap: 10,
    alignItems: "center",
  };

  return (
    <div>
      <div style={{ fontWeight: 900, color: palette.b, marginBottom: 10 }}>{title}</div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={rowStyle}>
          <div style={{ color: palette.text, fontWeight: 800 }}>{aLabel}</div>
          <div
            style={{
              height: 14,
              borderRadius: 999,
              background: "rgba(15,23,42,.08)",
              overflow: "hidden",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.10)",
            }}
          >
            <div
              style={{
                width: `${wA}%`,
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg, rgba(31,58,90,1), rgba(45,106,106,1))",
              }}
            />
          </div>
          <div style={{ textAlign: "right", color: palette.muted, fontWeight: 900 }}>{formatMoney(aValue)}</div>
        </div>

        <div style={rowStyle}>
          <div style={{ color: palette.text, fontWeight: 800 }}>{bLabel}</div>
          <div
            style={{
              height: 14,
              borderRadius: 999,
              background: "rgba(15,23,42,.08)",
              overflow: "hidden",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.10)",
            }}
          >
            <div
              style={{
                width: `${wB}%`,
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg, rgba(34,197,94,1), rgba(22,163,74,1))",
              }}
            />
          </div>
          <div style={{ textAlign: "right", color: palette.muted, fontWeight: 900 }}>{formatMoney(bValue)}</div>
        </div>
      </div>
    </div>
  );
};

const StackedBar: React.FC<{
  title: string;
  leftLabel: string;
  leftValue: number;
  rightLabel: string;
  rightValue: number;
}> = ({ title, leftLabel, leftValue, rightLabel, rightValue }) => {
  const total = Math.max(1, leftValue + rightValue);
  const pL = clamp((leftValue / total) * 100, 0, 100);
  const pR = clamp((rightValue / total) * 100, 0, 100);

  return (
    <div>
      <div style={{ fontWeight: 900, color: palette.b, marginBottom: 10 }}>{title}</div>
      <div
        style={{
          height: 18,
          borderRadius: 999,
          background: "rgba(15,23,42,.08)",
          overflow: "hidden",
          display: "flex",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.10)",
        }}
      >
        <div style={{ width: `${pL}%`, background: "linear-gradient(90deg, rgba(31,58,90,1), rgba(45,106,106,1))" }} />
        <div style={{ width: `${pR}%`, background: "linear-gradient(90deg, rgba(34,197,94,1), rgba(22,163,74,1))" }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(31,58,90,1)" }} />
          <span style={{ fontWeight: 800, color: palette.text }}>
            {leftLabel}: {leftValue}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(34,197,94,1)" }} />
          <span style={{ fontWeight: 800, color: palette.text }}>
            {rightLabel}: {rightValue}
          </span>
        </div>
      </div>
    </div>
  );
};

/** ---------- Table ---------- */

type SortKey =
  | "nombre"
  | "campos_conocimiento"
  | "area_cobertura"
  | "num_personal_academico"
  | "num_personal_apoyo"
  | "presupuesto_anual";

function sortBy<T>(arr: T[], key: keyof T, dir: "asc" | "desc") {
  const mult = dir === "asc" ? 1 : -1;
  return [...arr].sort((a: any, b: any) => {
    const av = a[key];
    const bv = b[key];

    const na = typeof av === "number" ? av : Number(av);
    const nb = typeof bv === "number" ? bv : Number(bv);
    const bothNumeric = Number.isFinite(na) && Number.isFinite(nb);

    if (bothNumeric) return (na - nb) * mult;

    const sa = String(av ?? "").toLowerCase();
    const sb = String(bv ?? "").toLowerCase();
    return sa < sb ? -1 * mult : sa > sb ? 1 * mult : 0;
  });
}

/** ---------- Dashboard component ---------- */

export default function Dashboard() {
  const navigate = useNavigate();

  const [universidades, setUniversidades] = useState<UniversidadOut[]>([]);
  const [uniFilter, setUniFilter] = useState<UniFilter>("AMBAS");
  const [year, setYear] = useState<number>(2024);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [dataUC, setDataUC] = useState<RegistroDetalleOut | null>(null);
  const [dataESPOL, setDataESPOL] = useState<RegistroDetalleOut | null>(null);

  const [qUnits, setQUnits] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("nombre");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/universidades`);
        setUniversidades(res.data ?? []);
      } catch {
        // No bloquea el dashboard
      }
    })();
  }, []);

  async function fetchLatestId(siglas: string, anio: number): Promise<number | null> {
    const res = await axios.get<RegistroListItemOut[]>(
      `${API_BASE}/api/registros`,
      { params: { universidad_siglas: siglas, anio } }
    );
    const rows = res.data ?? [];
    if (!rows.length) return null;
    return rows[0].rei_id; // ya viene DESC por rei_id en tu backend
  }

  async function fetchDetalle(rei_id: number): Promise<RegistroDetalleOut> {
    const res = await axios.get<RegistroDetalleOut>(`${API_BASE}/api/registro/${rei_id}`);
    return res.data;
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const wantUC = uniFilter === "UC" || uniFilter === "AMBAS";
        const wantESPOL = uniFilter === "ESPOL" || uniFilter === "AMBAS";

        let uc: RegistroDetalleOut | null = null;
        let es: RegistroDetalleOut | null = null;

        if (wantUC) {
          const id = await fetchLatestId("UC", year);
          uc = id ? await fetchDetalle(id) : null;
        }
        if (wantESPOL) {
          const id = await fetchLatestId("ESPOL", year);
          es = id ? await fetchDetalle(id) : null;
        }

        setDataUC(uc);
        setDataESPOL(es);

        if (!uc && !es) {
          setErr(`No hay registros para el año ${year} con el filtro seleccionado.`);
        }
      } catch (e: any) {
        setErr(e?.message ?? "Error cargando datos del dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, [uniFilter, year]);

  const datasets = useMemo(() => {
    const list: Array<{ label: string; data: RegistroDetalleOut }> = [];
    if (dataUC) list.push({ label: "UC", data: dataUC });
    if (dataESPOL) list.push({ label: "ESPOL", data: dataESPOL });
    return list;
  }, [dataUC, dataESPOL]);

  /** KPIs agregados (si es "Ambas", suma; si es una, usa esa) */
  const kpis = useMemo(() => {
    const agg = {
      totalEstudiantes: 0,
      totalAcademico: 0,
      totalPhd: 0,
      contratadoInv: 0,
      apoyo: 0,
      presupuestoInterno: 0,
      presupuestoExterno: 0,
      totalUnidades: 0,
      countProyExternos: 0,
      countProyInternos: 0,
    };

    datasets.forEach(({ data }) => {
      agg.totalEstudiantes += data.rei.total_estudiantes ?? 0;
      agg.totalAcademico += data.rei.total_personal_academico ?? 0;
      agg.totalPhd += data.rei.total_personal_phd ?? 0;
      agg.contratadoInv += data.rei.total_personal_contratado_inv ?? 0;
      agg.apoyo += data.rei.total_personal_apoyo ?? 0;
      agg.presupuestoInterno += toNum(data.rei.presupuesto_interno);
      agg.presupuestoExterno += toNum(data.rei.presupuesto_externo);
      agg.totalUnidades += data.unidades?.length ?? 0;
      agg.countProyExternos += data.proyectos?.externos?.length ?? 0;
      agg.countProyInternos += data.proyectos?.internos?.length ?? 0;
    });

    return agg;
  }, [datasets]);

  const donutItems = useMemo(() => {
    const acadNoPhd = Math.max(0, kpis.totalAcademico - kpis.totalPhd);
    return [
      { label: "PhD", value: kpis.totalPhd, color: "rgba(31,58,90,1)" },
      { label: "Académico (sin PhD)", value: acadNoPhd, color: "rgba(45,106,106,1)" },
      { label: "Contratado (Inv.)", value: kpis.contratadoInv, color: "rgba(34,197,94,1)" },
      { label: "Apoyo", value: kpis.apoyo, color: "rgba(148,163,184,1)" },
    ];
  }, [kpis]);

  const unidadesAll = useMemo(() => {
    const rows = datasets.flatMap(({ label, data }) =>
      (data.unidades ?? []).map((u) => ({
        ...u,
        __uni: label, // para mostrar origen cuando es "Ambas"
        presupuesto_anual_num: toNum(u.presupuesto_anual),
      }))
    );

    const q = qUnits.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) =>
          [r.__uni, r.nombre, r.campos_conocimiento, r.area_cobertura]
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : rows;

    const keyMap: Record<SortKey, any> = {
      nombre: "nombre",
      campos_conocimiento: "campos_conocimiento",
      area_cobertura: "area_cobertura",
      num_personal_academico: "num_personal_academico",
      num_personal_apoyo: "num_personal_apoyo",
      presupuesto_anual: "presupuesto_anual_num",
    };

    return sortBy(filtered, keyMap[sortKey], sortDir);
  }, [datasets, qUnits, sortKey, sortDir]);

  const top5Proyectos = useMemo(() => {
    const rows = datasets.flatMap(({ label, data }) => {
      const ex = (data.proyectos?.externos ?? []).map((p) => ({ ...p, __uni: label }));
      const inn = (data.proyectos?.internos ?? []).map((p) => ({ ...p, __uni: label }));
      return [...ex, ...inn];
    });

    return rows
      .map((p) => ({ ...p, monto_num: toNum(p.monto_financiamiento) }))
      .sort((a, b) => b.monto_num - a.monto_num)
      .slice(0, 5);
  }, [datasets]);

  const headerRight = (
    <>
      <button
            onClick={() => navigate("/registro")}
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
            Realizar un Registro
          </button>
    </>
  );

  const filters = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        width: "100%",
        maxWidth: 520,
      }}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontWeight: 900, color: palette.text }}>Universidad</div>
        <Select
          value={uniFilter}
          onChange={(v) => setUniFilter(v as UniFilter)}
          options={[
            { value: "AMBAS", label: "Ambas (UC + ESPOL)" },
            { value: "UC", label: "UC" },
            { value: "ESPOL", label: "ESPOL" },
          ]}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontWeight: 900, color: palette.text }}>Año</div>
        <Select
          value={String(year)}
          onChange={(v) => setYear(Number(v))}
          options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
        />
      </div>

      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <Pill text={loading ? "Cargando..." : err ? "Sin datos" : "OK"} kind={loading ? "neutral" : err ? "danger" : "ok"} />
        <div style={{ color: palette.muted, fontWeight: 900 }}>
          {datasets.length ? (
            <>
              {datasets.map((d) => d.label).join(" + ")} · {year}
            </>
          ) : (
            "—"
          )}
        </div>
      </div>
    </div>
  );

  const kpiGrid = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(240px, 1fr))",
        gap: 12,
        width: "100%",
        minWidth: 0,
      }}
>
  <KpiCard
    title="Total Estudiantes"
    value={kpis.totalEstudiantes.toLocaleString()}
    hint={datasets.length ? "Suma según filtros" : "—"}
  />
  <KpiCard
    title="Personal Académico"
    value={`${kpis.totalAcademico.toLocaleString()}`}
    hint={`${Math.round(pct(kpis.totalPhd, kpis.totalAcademico))}% con PhD`}
  />
  <KpiCard
    title="Presupuesto Total"
    value={formatMoney(kpis.presupuestoInterno + kpis.presupuestoExterno)}
    hint={`Interno ${formatMoney(kpis.presupuestoInterno)} · Externo ${formatMoney(kpis.presupuestoExterno)}`}
  />
  <KpiCard
    title="Nº Total de Unidades"
    value={kpis.totalUnidades.toLocaleString()}
    hint="Unidades registradas"
  />
</div>

  );

  const chartsGrid = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.1fr 1fr",
        gap: 12,
      }}
    >
      <Card
        title="Distribución del personal"
        subtitle="Pie/Donut (PhD, académico sin PhD, contratado inv., apoyo)."
        right={<Pill text="Donut" />}
      >
        <DonutChart items={donutItems} />
      </Card>

      <div style={{ display: "grid", gap: 12 }}>
        <Card title="Comparación de presupuestos" subtitle="Bar chart (Interno vs Externo)." right={<Pill text="Bar" />}>
          <BarChart
            title="Presupuestos (USD)"
            aLabel="Interno"
            aValue={kpis.presupuestoInterno}
            bLabel="Externo"
            bValue={kpis.presupuestoExterno}
          />
        </Card>

        <Card
          title="Proyectos (externos vs internos)"
          subtitle="Stacked bar (conteo de proyectos)."
          right={<Pill text="Stacked" />}
        >
          <StackedBar
            title="Conteo"
            leftLabel="Externos"
            leftValue={kpis.countProyExternos}
            rightLabel="Internos"
            rightValue={kpis.countProyInternos}
          />
        </Card>
      </div>
    </div>
  );

  const unitsTable = (
    <Card
      title="Detalle de Unidades"
      subtitle="Columnas sortables con búsqueda textual."
      right={<Pill text={`${unidadesAll.length} filas`} />}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 260px",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900, color: palette.text }}>Buscar</div>
          <Input value={qUnits} onChange={setQUnits} placeholder="Nombre, campos, área, UC/ESPOL..." />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900, color: palette.text }}>Ordenar</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Select
              value={sortKey}
              onChange={(v) => setSortKey(v as SortKey)}
              options={[
                { value: "nombre", label: "Nombre" },
                { value: "campos_conocimiento", label: "Campos" },
                { value: "area_cobertura", label: "Área" },
                { value: "num_personal_academico", label: "Académico" },
                { value: "num_personal_apoyo", label: "Apoyo" },
                { value: "presupuesto_anual", label: "Presupuesto" },
              ]}
            />
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              style={{
                height: 42,
                padding: "0 14px",
                borderRadius: 12,
                border: "1px solid rgba(15,23,42,.14)",
                background: "rgba(15,23,42,.06)",
                cursor: "pointer",
                fontWeight: 900,
                color: "rgba(15,23,42,.92)",
                whiteSpace: "nowrap",
              }}
            >
              {sortDir === "asc" ? "Asc ↑" : "Desc ↓"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ width: "100%", overflowX: "auto", borderRadius: 14, border: `1px solid ${palette.stroke}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
          <thead>
            <tr style={{ background: "rgba(15,23,42,.04)" }}>
              <Th label={uniFilter === "AMBAS" ? "Uni" : "Uni"} />
              <Th label="Nombre" />
              <Th label="Campos" />
              <Th label="Área" />
              <Th label="Académico" align="right" />
              <Th label="Apoyo" align="right" />
              <Th label="Presupuesto" align="right" />
            </tr>
          </thead>
          <tbody>
            {unidadesAll.length ? (
              unidadesAll.map((u: any) => (
                <tr key={`${u.__uni}-${u.uni_id}`} style={{ borderTop: `1px solid ${palette.stroke}` }}>
                  <Td>{u.__uni}</Td>
                  <Td>{u.nombre}</Td>
                  <Td>{u.campos_conocimiento || "—"}</Td>
                  <Td>{u.area_cobertura || "—"}</Td>
                  <Td align="right">{(u.num_personal_academico ?? 0).toLocaleString()}</Td>
                  <Td align="right">{(u.num_personal_apoyo ?? 0).toLocaleString()}</Td>
                  <Td align="right">{formatMoney(u.presupuesto_anual_num ?? 0)}</Td>
                </tr>
              ))
            ) : (
              <tr>
                <Td colSpan={7}>
                  <div style={{ padding: 12, color: palette.muted, fontWeight: 800 }}>
                    No hay unidades para mostrar.
                  </div>
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const topProjects = (
    <Card
      title="Proyectos destacados"
      subtitle="Top 5 proyectos por monto de financiamiento."
      right={<Pill text="Top 5" />}
    >
      <div style={{ display: "grid", gap: 10 }}>
        {top5Proyectos.length ? (
          top5Proyectos.map((p) => (
            <div
              key={`${p.__uni}-${p.pry_id}`}
              style={{
                border: `1px solid ${palette.stroke}`,
                borderRadius: 14,
                padding: 12,
                display: "grid",
                gridTemplateColumns: "80px 1fr 180px",
                gap: 12,
                alignItems: "center",
                background: "rgba(255,255,255,.65)",
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <Pill text={p.__uni} />
                <Pill text={String(p.tipo).toUpperCase()} kind={String(p.tipo).includes("extern") ? "neutral" : "ok"} />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, color: palette.b, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.titulo || "(sin título)"}
                </div>
                <div style={{ color: palette.muted, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.codigo ? `Código: ${p.codigo}` : "Código: —"} · {p.fuente_financiamiento ? p.fuente_financiamiento : "Fuente: —"}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900, color: palette.text }}>{formatMoney(p.monto_num)}</div>
                <div style={{ color: palette.muted, fontWeight: 800, marginTop: 4 }}>{p.estado || "—"}</div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ color: palette.muted, fontWeight: 800 }}>No hay proyectos para mostrar.</div>
        )}
      </div>
    </Card>
  );

  const responsiveColumns = typeof window !== "undefined" && window.matchMedia("(max-width: 980px)").matches;

  return (
    <PageShell>
      <TopBar
        title="SIGC — Dashboard"
        subtitle="Visualización comparativa basada en los datos ingresados."
        right={headerRight}
      />

      <div style={{ height: 14 }} />

      <Card title="Filtros" subtitle="Selecciona universidad y año para visualizar KPIs, tablas y gráficos." right={filters}>
        {err ? (
          <div style={{ marginTop: 12 }}>
            <Pill text={`Error: ${err}`} kind="danger" />
          </div>
        ) : null}
      </Card>

      <div style={{ height: 12 }} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: responsiveColumns ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {kpiGrid}
      </div>

      <div style={{ height: 12 }} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: responsiveColumns ? "1fr" : "1fr",
          gap: 12,
        }}
      >
        {chartsGrid}
      </div>

      <div style={{ height: 12 }} />

      {unitsTable}

      <div style={{ height: 12 }} />

      {topProjects}

      <div style={{ height: 18 }} />
      <div style={{ color: palette.muted, textAlign: "center", fontWeight: 800, opacity: 0.9 }}>
        SIGC · Dashboard de Visualización · {new Date().getFullYear()}
      </div>
    </PageShell>
  );
}

/** ---------- KPI Card ---------- */

const KpiCard: React.FC<{ title: string; value: string; hint?: string }> = ({ title, value, hint }) => (
  <div
    style={{
      background: palette.card,
      border: `1px solid ${palette.stroke}`,
      borderRadius: 18,
      padding: 14,
      boxShadow: "0 10px 22px rgba(15, 23, 42, .08)",
      display: "grid",
      gap: 6,
      minWidth: 0,
    }}
  >
    <div style={{ color: palette.muted, fontWeight: 900 }}>{title}</div>
    <div style={{ color: palette.b, fontWeight: 900, fontSize: 26, letterSpacing: -0.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {value}
    </div>
    {hint ? <div style={{ color: palette.muted, fontWeight: 800 }}>{hint}</div> : null}
  </div>
);

/** ---------- Table cells ---------- */

const Th: React.FC<{ label: string; align?: "left" | "right" | "center" }> = ({ label, align = "left" }) => (
  <th
    style={{
      textAlign: align,
      padding: "12px 12px",
      fontWeight: 900,
      color: palette.text,
      fontSize: 13,
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </th>
);

const Td: React.FC<{ children: React.ReactNode; align?: "left" | "right" | "center"; colSpan?: number }> = ({
  children,
  align = "left",
  colSpan,
}) => (
  <td
    colSpan={colSpan}
    style={{
      textAlign: align,
      padding: "12px 12px",
      color: palette.text,
      fontWeight: 700,
      fontSize: 13,
      verticalAlign: "top",
      maxWidth: 340,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }}
    title={typeof children === "string" ? children : undefined}
  >
    {children}
  </td>
);
