import mysql from 'mysql2/promise';
import 'dotenv/config';

// Configuración del pool de conexiones MySQL
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root_password',
  database: process.env.DB_NAME || 'mapa_marciano',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Verificación de conectividad inicial sin bloquear el arranque del servidor
export async function probarConexionBd() {
  try {
    const conn = await pool.getConnection();
    console.log(`[MySQL] Conexión establecida exitosamente con la base de datos "${process.env.DB_NAME || 'mapa_marciano'}" en ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
    conn.release();
    return true;
  } catch (err) {
    console.warn(`[MySQL] Advertencia: No se pudo conectar a MySQL (${err.code || err.message}). Verifique que el contenedor Docker esté activo con 'docker compose up -d'. El servidor continuará operando en modo local.`);
    return false;
  }
}

export default pool;
