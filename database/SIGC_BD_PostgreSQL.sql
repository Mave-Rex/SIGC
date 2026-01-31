-- ==========================================
-- 1. CATÁLOGO MAESTRO DE UNIVERSIDADES
-- ==========================================
CREATE TABLE CAT_CATALOGO_UNIVERSIDAD (
    CAT_id SERIAL PRIMARY KEY,
    CAT_nombre_oficial VARCHAR(200) NOT NULL UNIQUE,
    CAT_siglas VARCHAR(10) NOT NULL UNIQUE,
    CAT_ciudad VARCHAR(100) NOT NULL, -- Migrado desde REI: sede física fija
    CAT_activa BOOLEAN DEFAULT TRUE
);

COMMENT ON TABLE CAT_CATALOGO_UNIVERSIDAD IS 'Maestro de las 12 universidades públicas del estudio';
COMMENT ON COLUMN CAT_CATALOGO_UNIVERSIDAD.CAT_ciudad IS 'Ciudad sede principal (no cambia anualmente)';

INSERT INTO CAT_CATALOGO_UNIVERSIDAD (CAT_nombre_oficial, CAT_siglas, CAT_ciudad) VALUES 
('Escuela Superior Politécnica del Litoral', 'ESPOL', 'Guayaquil'),
('Universidad de las Fuerzas Armadas - ESPE', 'ESPE', 'Sangolquí'),
('Escuela Politécnica Nacional', 'EPN', 'Quito'),
('Escuela Superior Politécnica de Chimborazo', 'ESPOCH', 'Riobamba'),
('Universidad de Guayaquil', 'UG', 'Guayaquil'),
('Universidad de Investigación de Tecnología Experimental Yachay', 'YACHAY', 'Urcuquí'),
('Universidad Técnica de Ambato', 'UTA', 'Ambato'),
('Universidad de Cuenca', 'UC', 'Cuenca'),
('Universidad Central del Ecuador', 'UCE', 'Quito'),
('Universidad Técnica de Manabí', 'UTM', 'Portoviejo'),
('Universidad Politécnica Estatal del Carchi', 'UPEC', 'Tulcán'),
('Universidad Técnica de Machala', 'UTMACH', 'Machala');

-- ==========================================
-- 2. REGISTRO INSTITUCIONAL (DATOS INFORMATIVOS)
-- ==========================================
CREATE TABLE REI_REGISTRO_INSTITUCIONAL (
    REI_id SERIAL PRIMARY KEY,
    REI_CAT_id INTEGER NOT NULL REFERENCES CAT_CATALOGO_UNIVERSIDAD(CAT_id),
    REI_anio INTEGER NOT NULL CHECK (REI_anio >= 2020 AND REI_anio <= 2050),
    REI_fecha_corte DATE,
    
    -- Demografía y Personal
    REI_total_estudiantes INTEGER DEFAULT 0 CHECK (REI_total_estudiantes >= 0),
    REI_total_personal_academico INTEGER DEFAULT 0 CHECK (REI_total_personal_academico >= 0),
    REI_total_personal_phd INTEGER DEFAULT 0 CHECK (REI_total_personal_phd >= 0),
    REI_total_personal_contratado_inv INTEGER DEFAULT 0 CHECK (REI_total_personal_contratado_inv >= 0),
    REI_total_personal_apoyo INTEGER DEFAULT 0 CHECK (REI_total_personal_apoyo >= 0),
    
    -- Presupuestos Institucionales
    REI_pct_presupuesto_inv DECIMAL(5,2) DEFAULT 0 CHECK (REI_pct_presupuesto_inv >= 0 AND REI_pct_presupuesto_inv <= 100),
    REI_presupuesto_externo DECIMAL(15,2) DEFAULT 0 CHECK (REI_presupuesto_externo >= 0),
    REI_presupuesto_interno DECIMAL(15,2) DEFAULT 0 CHECK (REI_presupuesto_interno >= 0),
    
    -- Participación Estudiantil (Totales Institucionales)
    REI_num_est_pregrado_proy INTEGER DEFAULT 0 CHECK (REI_num_est_pregrado_proy >= 0),
    REI_num_alumni_pregrado_proy INTEGER DEFAULT 0 CHECK (REI_num_alumni_pregrado_proy >= 0),
    REI_num_est_posgrado_proy INTEGER DEFAULT 0 CHECK (REI_num_est_posgrado_proy >= 0),
    REI_num_alumni_posgrado_proy INTEGER DEFAULT 0 CHECK (REI_num_alumni_posgrado_proy >= 0),
    
    -- Auditoría
    REI_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    REI_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(REI_CAT_id, REI_anio)
);

COMMENT ON TABLE REI_REGISTRO_INSTITUCIONAL IS 'Datos informativos agregados por universidad y año (sección 1 del instrumento)';

CREATE INDEX IDX_REI_CAT_ANIO ON REI_REGISTRO_INSTITUCIONAL(REI_CAT_id, REI_anio);

-- ==========================================
-- 3. UNIDADES DE INVESTIGACIÓN (CENTROS O INSTITUTOS)
-- ==========================================
CREATE TABLE UNI_UNIDAD_INVESTIGACION (
    UNI_id SERIAL PRIMARY KEY,
    UNI_REI_id INTEGER NOT NULL REFERENCES REI_REGISTRO_INSTITUCIONAL(REI_id) ON DELETE CASCADE,
    
    UNI_nombre VARCHAR(200) NOT NULL,
    UNI_campos_conocimiento TEXT, -- Ej: ["Ingeniería", "Nanotecnología"]
    UNI_area_cobertura VARCHAR(200), -- Ej: "Nacional", "Regional Sur", "Local"
    
    -- Personal asignado a esta unidad específica
    UNI_num_personal_academico INTEGER DEFAULT 0 CHECK (UNI_num_personal_academico >= 0),
    UNI_num_personal_apoyo INTEGER DEFAULT 0 CHECK (UNI_num_personal_apoyo >= 0),
    
    -- Financiamiento específico
    UNI_presupuesto_anual DECIMAL(15,2) DEFAULT 0 CHECK (UNI_presupuesto_anual >= 0),
    
    -- Distingue el tipo de unidad: TRUE=Centro, FALSE=Instituto
    UNI_flag_es_centro BOOLEAN NOT NULL DEFAULT TRUE,
    
    UNI_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE UNI_UNIDAD_INVESTIGACION IS 'Centros o Institutos de investigación por universidad';
COMMENT ON COLUMN UNI_UNIDAD_INVESTIGACION.UNI_flag_es_centro IS 'TRUE si es Centro de Investigación, FALSE si es Instituto de Investigación';

CREATE INDEX IDX_UNI_REI ON UNI_UNIDAD_INVESTIGACION(UNI_REI_id);
CREATE INDEX IDX_UNI_TIPO ON UNI_UNIDAD_INVESTIGACION(UNI_flag_es_centro); -- Para filtrar Centros vs Institutos

-- ==========================================
-- 4. PROYECTOS DE INVESTIGACIÓN
-- ==========================================
CREATE TYPE TYP_PRY_TIPO AS ENUM ('externo', 'interno');

CREATE TABLE PRY_PROYECTO_INVESTIGACION (
    PRY_id SERIAL PRIMARY KEY,
    PRY_REI_id INTEGER NOT NULL REFERENCES REI_REGISTRO_INSTITUCIONAL(REI_id) ON DELETE CASCADE,
    
    PRY_tipo TYP_PRY_TIPO NOT NULL,
    PRY_codigo VARCHAR(50),
    PRY_titulo VARCHAR(300),
    
    -- Personal participante desagregado
    PRY_num_participantes_internos INTEGER DEFAULT 0 CHECK (PRY_num_participantes_internos >= 0),
    PRY_num_participantes_ext_nac INTEGER DEFAULT 0 CHECK (PRY_num_participantes_ext_nac >= 0),
    PRY_num_participantes_ext_int INTEGER DEFAULT 0 CHECK (PRY_num_participantes_ext_int >= 0),
    
    -- Estudiantes en este proyecto específico
    PRY_num_estudiantes_pregrado INTEGER DEFAULT 0 CHECK (PRY_num_estudiantes_pregrado >= 0),
    PRY_num_estudiantes_posgrado INTEGER DEFAULT 0 CHECK (PRY_num_estudiantes_posgrado >= 0),
    
    -- Financiamiento
    PRY_fuente_financiamiento VARCHAR(50), -- Ej: "FONDECYT", "PII-ESPOL", "Mixto"
    PRY_monto_financiamiento DECIMAL(15,2) DEFAULT 0 CHECK (PRY_monto_financiamiento >= 0),
    
    -- Temporalidad
    PRY_fecha_inicio DATE,
    PRY_fecha_fin DATE,
    PRY_estado VARCHAR(50) DEFAULT 'Activo',
    
    PRY_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE PRY_PROYECTO_INVESTIGACION IS 'Proyectos externos e internos desagregados';

CREATE INDEX IDX_PRY_REI ON PRY_PROYECTO_INVESTIGACION(PRY_REI_id);
CREATE INDEX IDX_PRY_REI_TIPO ON PRY_PROYECTO_INVESTIGACION(PRY_REI_id, PRY_tipo);

-- ==========================================
-- 5. VISTA RESUMEN (NOMENCLATURA ACTUALIZADA)
-- ==========================================
CREATE VIEW V_RE_RESUMEN_UNIVERSIDAD AS
SELECT 
    R.REI_id,
    C.CAT_nombre_oficial,
    C.CAT_siglas,
    C.CAT_ciudad,
    R.REI_anio,
    R.REI_total_estudiantes,
    R.REI_total_personal_academico,
    R.REI_total_personal_phd,
    R.REI_pct_presupuesto_inv,
    (R.REI_presupuesto_externo + R.REI_presupuesto_interno) as REI_presupuesto_total_inv,
    
    -- Métricas calculadas de unidades
    COUNT(DISTINCT CASE WHEN U.UNI_flag_es_centro THEN U.UNI_id END) as REI_total_centros,
    COUNT(DISTINCT CASE WHEN NOT U.UNI_flag_es_centro THEN U.UNI_id END) as REI_total_institutos,
    
    -- Métricas calculadas de proyectos
    COUNT(DISTINCT CASE WHEN P.PRY_tipo = 'externo' THEN P.PRY_id END) as REI_num_proyectos_externos,
    COUNT(DISTINCT CASE WHEN P.PRY_tipo = 'interno' THEN P.PRY_id END) as REI_num_proyectos_internos,
    
    -- Consistencia de participantes (sumatoria de proyectos)
    SUM(CASE WHEN P.PRY_tipo = 'externo' THEN P.PRY_num_participantes_internos + P.PRY_num_participantes_ext_nac + P.PRY_num_participantes_ext_int ELSE 0 END) as REI_total_participantes_externos,
    SUM(CASE WHEN P.PRY_tipo = 'interno' THEN P.PRY_num_participantes_internos + P.PRY_num_participantes_ext_nac + P.PRY_num_participantes_ext_int ELSE 0 END) as REI_total_participantes_internos

FROM REI_REGISTRO_INSTITUCIONAL R
JOIN CAT_CATALOGO_UNIVERSIDAD C ON R.REI_CAT_id = C.CAT_id
LEFT JOIN UNI_UNIDAD_INVESTIGACION U ON R.REI_id = U.UNI_REI_id
LEFT JOIN PRY_PROYECTO_INVESTIGACION P ON R.REI_id = P.PRY_REI_id
GROUP BY 
    R.REI_id, C.CAT_nombre_oficial, C.CAT_siglas, C.CAT_ciudad, R.REI_anio,
    R.REI_total_estudiantes, R.REI_total_personal_academico, R.REI_total_personal_phd,
    R.REI_pct_presupuesto_inv, R.REI_presupuesto_externo, R.REI_presupuesto_interno;

-- ==========================================
-- 6. TRIGGER AUDITORÍA
-- ==========================================
CREATE OR REPLACE FUNCTION FN_UPDATE_TIMESTAMP()
RETURNS TRIGGER AS $$
BEGIN
    NEW.REI_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER TRG_REI_UPDATETIMESTAMP
    BEFORE UPDATE ON REI_REGISTRO_INSTITUCIONAL
    FOR EACH ROW
    EXECUTE FUNCTION FN_UPDATE_TIMESTAMP();

-- ==========================================
-- EJEMPLOS DE USO PARA TU CRUD
-- ==========================================

-- 1. Crear registro anual de universidad:
/*
INSERT INTO REI_REGISTRO_INSTITUCIONAL (
    REI_CAT_id, REI_anio, REI_total_estudiantes, 
    REI_total_personal_academico, REI_total_personal_phd, REI_pct_presupuesto_inv,
    REI_presupuesto_externo, REI_presupuesto_interno, REI_num_est_pregrado_proy
) VALUES (1, 2025, 28500, 850, 320, 15.5, 2500000.00, 1800000.00, 150);
*/

-- 2. Agregar un CENTRO de investigación:
/*
INSERT INTO UNI_UNIDAD_INVESTIGACION (
    UNI_REI_id, UNI_nombre, UNI_campos_conocimiento, 
    UNI_num_personal_academico, UNI_presupuesto_anual, UNI_flag_es_centro
) VALUES (1, 'Centro de Mecatrónica', 'Ingeniería Mecánica, Electrónica', 25, 150000.00, TRUE);
*/

-- 3. Agregar un INSTITUTO de investigación:
/*
INSERT INTO UNI_UNIDAD_INVESTIGACION (
    UNI_REI_id, UNI_nombre, UNI_campos_conocimiento, 
    UNI_num_personal_academico, UNI_presupuesto_anual, UNI_flag_es_centro
) VALUES (1, 'Instituto de Ciencias del Mar', 'Oceanografía, Biología Marina', 12, 89000.00, FALSE);
*/

-- 4. Consultar resumen con conteo de Centros vs Institutos:
/*
SELECT * FROM V_RE_RESUMEN_UNIVERSIDAD WHERE CAT_siglas = 'ESPOL' AND REI_anio = 2025;
*/