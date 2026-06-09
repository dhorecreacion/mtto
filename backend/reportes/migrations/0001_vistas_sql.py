from django.db import migrations

VISTA_SEGUIMIENTO_PREDICTIVO = """
CREATE OR REPLACE VIEW vista_seguimiento_predictivo AS
SELECT
    ROW_NUMBER() OVER (ORDER BY e.id, pm.anio, pm.mes_planificado) AS id,
    e.id                              AS equipo_id,
    e.codigo_activo,
    e.nombre                          AS equipo_nombre,
    e.categoria_mantenimiento,
    e.criticidad,
    pm.id                             AS programa_id,
    pm.anio,
    pm.mes_planificado,
    pm.estado                         AS estado_programa,
    pm.score_salud_ultimo,
    pm.requiere_tercero,
    im.id                             AS informe_id,
    im.fecha                          AS fecha_informe,
    im.estado_informe,
    im.hallazgos_generales,
    au.username                       AS tecnico_username,
    au.first_name || ' ' || au.last_name AS tecnico_nombre,
    z.nombre                          AS zona_nombre,
    l.nombre                          AS lugar_nombre,
    s.nombre                          AS seccion_nombre
FROM activos_equipo e
LEFT JOIN preventivo_programamantenimiento pm ON pm.equipo_id = e.id AND pm.activo = TRUE
LEFT JOIN preventivo_informemantenimiento im
    ON im.programa_id = pm.id
    AND im.id = (
        SELECT id FROM preventivo_informemantenimiento
        WHERE programa_id = pm.id
        ORDER BY fecha DESC LIMIT 1
    )
LEFT JOIN accounts_usuario au ON au.id = im.tecnico_id
LEFT JOIN activos_seccion s ON s.id = e.seccion_id
LEFT JOIN activos_lugar l ON l.id = s.lugar_id
LEFT JOIN activos_zona z ON z.id = l.zona_id
WHERE e.activo = TRUE;
"""

VISTA_CORRECTIVOS_PENDIENTES = """
CREATE OR REPLACE VIEW vista_correctivos_pendientes AS
SELECT
    ROW_NUMBER() OVER (ORDER BY oc.created_at DESC) AS id,
    oc.id                             AS orden_id,
    LEFT(REPLACE(oc.id::text, '-', ''), 8) AS codigo_orden,
    e.codigo_activo,
    e.nombre                          AS equipo_nombre,
    oc.descripcion_falla,
    oc.tipo_ejecucion,
    oc.estado,
    oc.costo_total,
    oc.fecha_resolucion,
    pt.razon_social                   AS proveedor_nombre,
    pt.especialidad                   AS proveedor_especialidad,
    au.username                       AS tecnico_username,
    au.first_name || ' ' || au.last_name AS tecnico_nombre,
    oc.created_at                     AS fecha_creacion,
    CURRENT_DATE - oc.created_at::date AS dias_abierto,
    z.nombre                          AS zona_nombre
FROM correctivo_ordencorrectiva oc
JOIN activos_equipo e ON e.id = oc.equipo_id
LEFT JOIN correctivo_proveedortercero pt ON pt.id = oc.proveedor_id
LEFT JOIN accounts_usuario au ON au.id = oc.tecnico_interno_id
LEFT JOIN activos_seccion s ON s.id = e.seccion_id
LEFT JOIN activos_lugar l ON l.id = s.lugar_id
LEFT JOIN activos_zona z ON z.id = l.zona_id
WHERE oc.activo = TRUE;
"""

VISTA_TASA_BAJAS = """
CREATE OR REPLACE VIEW vista_tasa_bajas AS
SELECT
    ROW_NUMBER() OVER (ORDER BY hr.fecha_reemplazo DESC) AS id,
    DATE_TRUNC('month', hr.fecha_reemplazo) AS mes,
    EXTRACT(YEAR FROM hr.fecha_reemplazo)   AS anio,
    EXTRACT(MONTH FROM hr.fecha_reemplazo)  AS mes_numero,
    z.nombre                                AS zona_nombre,
    l.nombre                                AS lugar_nombre,
    s.nombre                                AS seccion_nombre,
    sal.codigo_activo                       AS equipo_saliente_codigo,
    sal.nombre                              AS equipo_saliente_nombre,
    sal.marca                               AS equipo_saliente_marca,
    ent.codigo_activo                       AS equipo_entrante_codigo,
    ent.nombre                              AS equipo_entrante_nombre,
    hr.motivo_cambio,
    au.username                             AS tecnico_username,
    au.first_name || ' ' || au.last_name    AS tecnico_nombre,
    hr.fecha_reemplazo
FROM correctivo_historialreemplazo hr
JOIN activos_seccion s ON s.id = hr.seccion_id
JOIN activos_lugar l ON l.id = s.lugar_id
JOIN activos_zona z ON z.id = l.zona_id
JOIN activos_equipo sal ON sal.id = hr.equipo_saliente_id
JOIN activos_equipo ent ON ent.id = hr.equipo_entrante_id
JOIN accounts_usuario au ON au.id = hr.tecnico_id
ORDER BY hr.fecha_reemplazo DESC;
"""

DROP_VISTAS = """
DROP VIEW IF EXISTS vista_seguimiento_predictivo;
DROP VIEW IF EXISTS vista_correctivos_pendientes;
DROP VIEW IF EXISTS vista_tasa_bajas;
"""


class Migration(migrations.Migration):

    dependencies = [
        ('activos', '0001_initial'),
        ('preventivo', '0001_initial'),
        ('correctivo', '0001_initial'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql=VISTA_SEGUIMIENTO_PREDICTIVO + VISTA_CORRECTIVOS_PENDIENTES + VISTA_TASA_BAJAS,
            reverse_sql=DROP_VISTAS,
        )
    ]
