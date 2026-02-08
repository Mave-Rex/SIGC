import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type Universidad = {
  cat_id: number;
  cat_nombre_oficial: string;
  cat_siglas: string;
  cat_ciudad: string | null;
  cat_activa: boolean;
};

type RegistroListItem = {
  rei_id: number;
  universidad_siglas: string;
  universidad_nombre: string;
  anio: number;
  fecha_corte: string; // "YYYY-MM-DD"
};

type RegistroDetalle = {
  universidad: Universidad;
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
    pct_presupuesto_inv: string;
    presupuesto_externo: string;
    presupuesto_interno: string;
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
    presupuesto_anual: string;
  }>;
  proyectos: {
    externos: Array<any>;
    internos: Array<any>;
  };
};

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, [query]);
  return matches;
}

function formatDate(iso: string) {
  if (!iso) return "";
  // Mantener simple: YYYY-MM-DD -> DD/MM/YYYY
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 640px)");

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 7; y--) years.push(y);
    // por si quieres fijo 2024/2025:
    if (!years.includes(2024)) years.push(2024);
    if (!years.includes(2025)) years.push(2025);
    years.sort((a, b) => b - a);
    return years;
  }, [currentYear]);

  const [universidades, setUniversidades] = useState<Universidad[]>([]);
  const [uniSiglas, setUniSiglas] = useState<string>(""); // filtro
  const [anio, setAnio] = useState<number>(2024);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [registros, setRegistros] = useState<RegistroListItem[]>([]);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState("");
  const [detalle, setDetalle] = useState<RegistroDetalle | null>(null);

  // ---------- styles ----------
  const S = {
    page: {
      minHeight: "100vh",
      padding: isMobile ? "16px" : "28px",
      background:
        "radial-gradient(900px 450px at 20% 10%, rgba(190, 227, 248, .70), transparent 55%)," +
        "radial-gradient(900px 450px at 80% 20%, rgba(251, 207, 232, .65), transparent 55%)," +
        "radial-gradient(900px 450px at 55% 85%, rgba(196, 252, 239, .55), transparent 55%)," +
        "linear-gradient(180deg, #fbfbff 0%, #ffffff 100%)",
    } as React.CSSProperties,
    shell: {
      maxWidth: 1120,
      margin: "0 auto",
      display: "grid",
      gap: isMobile ? 12 : 16,
    } as React.CSSProperties,
    header: {
      display: "flex",
      alignItems: isMobile ? "flex-start" : "center",
      justifyContent: "space-between",
      gap: 12,
      flexDirection: isMobile ? "column" : "row",
    } as React.CSSProperties,
    titleBox: {
      display: "grid",
      gap: 6,
    } as React.CSSProperties,
    h1: {
      fontSize: isMobile ? 22 : 28,
      lineHeight: 1.15,
      margin: 0,
      color: "#101828",
      letterSpacing: -0.4,
    } as React.CSSProperties,
    sub: {
      margin: 0,
      color: "#475467",
      fontSize: isMobile ? 13 : 14,
    } as React.CSSProperties,
    primaryBtn: {
      border: "1px solid rgba(16,24,40,.12)",
      background: "linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,255,255,.6))",
      padding: isMobile ? "10px 12px" : "10px 14px",
      borderRadius: 14,
      cursor: "pointer",
      color: "#101828",
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      boxShadow: "0 12px 28px rgba(16,24,40,.08)",
      width: isMobile ? "100%" : "auto",
      justifyContent: isMobile ? "center" : "flex-start",
    } as React.CSSProperties,
    card: {
      background: "rgba(255,255,255,.78)",
      border: "1px solid rgba(16,24,40,.10)",
      borderRadius: 18,
      boxShadow: "0 18px 40px rgba(16,24,40,.08)",
      backdropFilter: "blur(10px)",
    } as React.CSSProperties,
    cardPad: {
      padding: isMobile ? 14 : 16,
    } as React.CSSProperties,
    grid: {
      display: "grid",
      gap: 12,
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1.4fr",
      alignItems: "start",
    } as React.CSSProperties,
    label: {
      fontSize: 12,
      color: "#475467",
      fontWeight: 700,
      letterSpacing: 0.2,
      marginBottom: 6,
      display: "block",
    } as React.CSSProperties,
    select: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 14,
      border: "1px solid rgba(16,24,40,.14)",
      outline: "none",
      background: "rgba(255,255,255,.9)",
      color: "#101828",
      fontWeight: 600,
    } as React.CSSProperties,
    row: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
      gap: 12,
    } as React.CSSProperties,
    ghostBtn: {
      border: "1px solid rgba(16,24,40,.12)",
      background: "rgba(255,255,255,.65)",
      padding: "10px 12px",
      borderRadius: 14,
      cursor: "pointer",
      color: "#101828",
      fontWeight: 700,
      width: isMobile ? "100%" : "auto",
    } as React.CSSProperties,
    hint: {
      fontSize: 12,
      color: "#667085",
      marginTop: 8,
    } as React.CSSProperties,
    tableWrap: {
      overflowX: "auto",
      borderRadius: 14,
      border: "1px solid rgba(16,24,40,.10)",
      background: "rgba(255,255,255,.7)",
    } as React.CSSProperties,
    table: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: 0,
      minWidth: 720,
    } as React.CSSProperties,
    th: {
      textAlign: "left",
      fontSize: 12,
      color: "#475467",
      padding: "12px 12px",
      borderBottom: "1px solid rgba(16,24,40,.10)",
      background: "rgba(255,255,255,.85)",
      position: "sticky" as const,
      top: 0,
      zIndex: 1,
    } as React.CSSProperties,
    td: {
      padding: "12px 12px",
      borderBottom: "1px solid rgba(16,24,40,.08)",
      color: "#101828",
      fontSize: 13,
      verticalAlign: "top",
    } as React.CSSProperties,
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid rgba(16,24,40,.12)",
      background: "rgba(240,249,255,.9)",
      color: "#0B4A6F",
      fontWeight: 800,
      fontSize: 12,
      whiteSpace: "nowrap" as const,
    } as React.CSSProperties,
    linkBtn: {
      border: "1px solid rgba(16,24,40,.14)",
      background: "rgba(255,255,255,.85)",
      borderRadius: 12,
      padding: "8px 10px",
      cursor: "pointer",
      fontWeight: 800,
      color: "#101828",
    } as React.CSSProperties,
    error: {
      border: "1px solid rgba(217,45,32,.25)",
      background: "rgba(254, 228, 226, .8)",
      color: "#7A271A",
      padding: "10px 12px",
      borderRadius: 14,
      fontSize: 13,
      fontWeight: 700,
    } as React.CSSProperties,
    modalOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(16,24,40,.50)",
      display: "grid",
      placeItems: "center",
      padding: 16,
      zIndex: 50,
    } as React.CSSProperties,
    modal: {
      width: "min(980px, 100%)",
      maxHeight: "85vh",
      overflow: "auto",
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,.22)",
      background: "rgba(255,255,255,.92)",
      boxShadow: "0 40px 90px rgba(16,24,40,.25)",
    } as React.CSSProperties,
    modalHeader: {
      position: "sticky" as const,
      top: 0,
      background: "rgba(255,255,255,.95)",
      borderBottom: "1px solid rgba(16,24,40,.10)",
      padding: 14,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      zIndex: 2,
    } as React.CSSProperties,
    modalTitle: {
      margin: 0,
      fontSize: 16,
      fontWeight: 900,
      color: "#101828",
    } as React.CSSProperties,
    closeBtn: {
      border: "1px solid rgba(16,24,40,.14)",
      background: "rgba(255,255,255,.9)",
      borderRadius: 12,
      padding: "8px 10px",
      cursor: "pointer",
      fontWeight: 900,
    } as React.CSSProperties,
    modalBody: {
      padding: 14,
      display: "grid",
      gap: 12,
    } as React.CSSProperties,
    kpiGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
      gap: 10,
    } as React.CSSProperties,
    kpi: {
      border: "1px solid rgba(16,24,40,.10)",
      borderRadius: 16,
      background: "rgba(236,253,245,.75)",
      padding: 12,
    } as React.CSSProperties,
    kpiLabel: { fontSize: 12, color: "#475467", fontWeight: 800 } as React.CSSProperties,
    kpiValue: { fontSize: 18, color: "#101828", fontWeight: 950, marginTop: 6 } as React.CSSProperties,
    sectionTitle: { margin: "6px 0 0", fontSize: 14, fontWeight: 950, color: "#101828" } as React.CSSProperties,
    miniList: { margin: 0, paddingLeft: 16, color: "#344054", fontSize: 13 } as React.CSSProperties,
  };

  // ---------- data loading ----------
  async function loadUniversidades() {
    try {
      setError("");
      const res = await fetch("/api/universidades");
      if (!res.ok) throw new Error(`HTTP ${res.status} al cargar universidades`);
      const data: Universidad[] = await res.json();
      setUniversidades(data);

      // Selección por defecto: ESPOL si existe, si no la primera
      const prefer = data.find((u) => u.cat_siglas === "ESPOL")?.cat_siglas;
      setUniSiglas((prev) => prev || prefer || data[0]?.cat_siglas || "");
    } catch (e: any) {
      setError(e?.message || "Error cargando universidades");
    }
  }

  async function loadRegistros(siglas: string, year: number) {
    if (!siglas) return;
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("universidad_siglas", siglas);
      params.set("anio", String(year));

      const res = await fetch(`/api/registros?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} al cargar registros`);

      const data: RegistroListItem[] = await res.json();
      setRegistros(data);
    } catch (e: any) {
      setError(e?.message || "Error cargando registros");
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  }

  async function openDetalle(rei_id: number) {
    try {
      setDetalleOpen(true);
      setDetalleLoading(true);
      setDetalleError("");
      setDetalle(null);

      const res = await fetch(`/api/registro/${rei_id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} al cargar detalle`);

      const data: RegistroDetalle = await res.json();
      setDetalle(data);
    } catch (e: any) {
      setDetalleError(e?.message || "Error cargando detalle");
    } finally {
      setDetalleLoading(false);
    }
  }

  useEffect(() => {
    loadUniversidades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Evita disparar antes de tener siglas
    if (uniSiglas) loadRegistros(uniSiglas, anio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniSiglas, anio]);

  const uniSelected = useMemo(
    () => universidades.find((u) => u.cat_siglas === uniSiglas),
    [universidades, uniSiglas]
  );

  return (
    <div style={S.page}>
      <div style={S.shell}>
        <div style={S.header}>
          <div style={S.titleBox}>
            <div>
          <h1 className="title">SIGC — Dashboard</h1>
          <p className="subtitle ">Dashboard por filtros. Años, Universidades y Comparativas</p>
        </div>
          </div>

          <button style={S.primaryBtn} onClick={() => navigate("/registro")}>
            <span style={{ fontSize: 18 }}>➕</span>
            Nuevo registro
          </button>
        </div>

        {error ? <div style={S.error}>{error}</div> : null}

        <div style={S.grid}>
          {/* filtros */}
          <div style={{ ...S.card, ...S.cardPad }}>
            <div style={S.row}>
              <div>
                <label style={S.label}>Universidad</label>
                <select
                  style={S.select}
                  value={uniSiglas}
                  onChange={(e) => setUniSiglas(e.target.value)}
                >
                  {universidades.map((u) => (
                    <option key={u.cat_id} value={u.cat_siglas}>
                      {u.cat_siglas} — {u.cat_nombre_oficial}
                    </option>
                  ))}
                </select>
                <div style={S.hint}>
                  {uniSelected
                    ? `${uniSelected.cat_ciudad ?? "—"} · ${uniSelected.cat_activa ? "Activa" : "Inactiva"}`
                    : "—"}
                </div>
              </div>

              <div>
                <label style={S.label}>Año</label>
                <select
                  style={S.select}
                  value={anio}
                  onChange={(e) => setAnio(Number(e.target.value))}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <div style={S.hint}>Filtra los registros existentes para ese año.</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexDirection: isMobile ? "column" : "row" }}>
              <button
                style={S.ghostBtn}
                onClick={() => loadRegistros(uniSiglas, anio)}
                disabled={loading || !uniSiglas}
                title="Recargar lista"
              >
                {loading ? "Cargando..." : "Recargar"}
              </button>

              <button
                style={S.ghostBtn}
                onClick={() => {
                  setUniSiglas("ESPOL");
                  setAnio(2024);
                }}
                title="Atajo"
              >
                ESPOL 2024
              </button>
            </div>
          </div>

          {/* listado */}
          <div style={{ ...S.card, ...S.cardPad }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 950, color: "#101828", fontSize: 14 }}>
                  Registros encontrados
                </div>
                <div style={{ color: "#667085", fontSize: 12, marginTop: 4 }}>
                  {loading ? "Consultando base de datos..." : `${registros.length} resultado(s)`}
                </div>
              </div>

              <div style={S.badge}>
                <span>📌</span>
                <span>{uniSiglas || "—"}</span>
                <span>·</span>
                <span>{anio}</span>
              </div>
            </div>

            <div style={{ marginTop: 12, ...S.tableWrap }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>ID</th>
                    <th style={S.th}>Universidad</th>
                    <th style={S.th}>Año</th>
                    <th style={S.th}>Fecha corte</th>
                    <th style={S.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.length === 0 ? (
                    <tr>
                      <td style={S.td} colSpan={5}>
                        {loading
                          ? "Cargando..."
                          : "No hay registros para ese filtro. Crea uno en “Nuevo registro”."}
                      </td>
                    </tr>
                  ) : (
                    registros.map((r) => (
                      <tr key={r.rei_id}>
                        <td style={S.td}>#{r.rei_id}</td>
                        <td style={S.td}>
                          <div style={{ fontWeight: 900 }}>{r.universidad_siglas}</div>
                          <div style={{ color: "#667085", fontSize: 12, marginTop: 2 }}>
                            {r.universidad_nombre}
                          </div>
                        </td>
                        <td style={S.td}>{r.anio}</td>
                        <td style={S.td}>{formatDate(r.fecha_corte)}</td>
                        <td style={S.td}>
                          <button style={S.linkBtn} onClick={() => openDetalle(r.rei_id)}>
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 10, color: "#667085", fontSize: 12 }}>
              Tip: si algo no aparece, revisa que tu backend esté corriendo en{" "}
              <b>127.0.0.1:8000</b> y que Vite tenga el proxy configurado.
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DETALLE */}
      {detalleOpen ? (
        <div style={S.modalOverlay} onMouseDown={() => setDetalleOpen(false)}>
          <div style={S.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h3 style={S.modalTitle}>Detalle del registro</h3>
              <button style={S.closeBtn} onClick={() => setDetalleOpen(false)}>
                Cerrar ✕
              </button>
            </div>

            <div style={S.modalBody}>
              {detalleLoading ? <div>Cargando detalle...</div> : null}
              {detalleError ? <div style={S.error}>{detalleError}</div> : null}

              {detalle ? (
                <>
                  <div style={S.kpiGrid}>
                    <div style={S.kpi}>
                      <div style={S.kpiLabel}>Universidad</div>
                      <div style={S.kpiValue}>
                        {detalle.universidad.cat_siglas} · {detalle.rei.anio}
                      </div>
                      <div style={{ color: "#667085", fontSize: 12, marginTop: 6 }}>
                        {detalle.universidad.cat_nombre_oficial}
                      </div>
                    </div>

                    <div style={S.kpi}>
                      <div style={S.kpiLabel}>Total estudiantes</div>
                      <div style={S.kpiValue}>{detalle.rei.total_estudiantes}</div>
                      <div style={{ color: "#667085", fontSize: 12, marginTop: 6 }}>
                        Fecha corte: {formatDate(detalle.rei.fecha_corte)}
                      </div>
                    </div>

                    <div style={S.kpi}>
                      <div style={S.kpiLabel}>Personal académico · PhD</div>
                      <div style={S.kpiValue}>
                        {detalle.rei.total_personal_academico} · {detalle.rei.total_personal_phd}
                      </div>
                      <div style={{ color: "#667085", fontSize: 12, marginTop: 6 }}>
                        Apoyo: {detalle.rei.total_personal_apoyo}
                      </div>
                    </div>
                  </div>

                  <div style={S.cardPad as any}>
                    <div style={S.sectionTitle}>Unidades de investigación</div>
                    {detalle.unidades.length === 0 ? (
                      <div style={{ color: "#667085", fontSize: 13, marginTop: 6 }}>
                        No hay unidades registradas.
                      </div>
                    ) : (
                      <ul style={S.miniList}>
                        {detalle.unidades.slice(0, 10).map((u) => (
                          <li key={u.uni_id}>
                            <b>{u.nombre}</b>{" "}
                            <span style={{ color: "#667085" }}>
                              — Personal académico: {u.num_personal_academico} · Apoyo:{" "}
                              {u.num_personal_apoyo}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div style={S.cardPad as any}>
                    <div style={S.sectionTitle}>Proyectos</div>
                    <div style={{ color: "#475467", fontSize: 13, marginTop: 6 }}>
                      Externos: <b>{detalle.proyectos.externos.length}</b> · Internos:{" "}
                      <b>{detalle.proyectos.internos.length}</b>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
                    <button
                      style={S.primaryBtn}
                      onClick={() => {
                        setDetalleOpen(false);
                        navigate("/registro");
                      }}
                    >
                      ➕ Crear otro registro
                    </button>

                    <button
                      style={S.ghostBtn}
                      onClick={() => {
                        navigator.clipboard?.writeText(String(detalle.rei.rei_id));
                      }}
                    >
                      Copiar ID (rei_id)
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
