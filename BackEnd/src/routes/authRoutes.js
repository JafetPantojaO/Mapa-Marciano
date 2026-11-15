import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Credenciales semilla para modo de contingencia si MySQL aún no está levantado
const ASTRONAUTAS_FALLBACK = [
  {
    Astronauta_ID: 1,
    Nombre: 'Elena Ramos',
    Identificador: 'ASTRO-01',
    Usuario: 'eramos',
    PasswordHash: 'Ares2026Pass!'
  },
  {
    Astronauta_ID: 2,
    Nombre: 'Mark Watney',
    Identificador: 'ASTRO-02',
    Usuario: 'mwatney',
    PasswordHash: 'BotanistMars42!'
  },
  {
    Astronauta_ID: 3,
    Nombre: 'Carlos Herrera',
    Identificador: 'ASTRO-03',
    Usuario: 'cherrera',
    PasswordHash: 'RoverPilot33!'
  }
];

/**
 * POST /api/auth/login
 * Autentica usuario o identificador contra la tabla Cuenta y Astronauta.
 * Registra el acceso en InicioSesion.
 */
router.post('/login', async (req, res) => {
  const { identificador, usuario, password } = req.body;
  const loginUser = (identificador || usuario || '').trim();
  const loginPass = (password || '').trim();

  if (!loginUser || !loginPass) {
    return res.status(400).json({
      ok: false,
      error: 'Debe ingresar su Identificador / Usuario y clave de seguridad.'
    });
  }

  try {
    // 1. Intentar autenticación directa en MySQL
    const sql = `
      SELECT 
        c.CUENTA_ID,
        c.Usuario,
        c.PasswordHash,
        a.Astronauta_ID,
        a.Nombre,
        a.Identificador,
        sa.TemperaturaCorporal,
        sa.Oxigeno,
        sa.Radiacion,
        sa.Comunicacion
      FROM Cuenta c
      INNER JOIN Astronauta a ON c.Astronauta_ID = a.Astronauta_ID
      LEFT JOIN StatusAstronauta sa ON a.Astronauta_ID = sa.Astronauta_ID
      WHERE (c.Usuario = ? OR a.Identificador = ?) AND c.PasswordHash = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(sql, [loginUser, loginUser, loginPass]);

    if (rows.length > 0) {
      const user = rows[0];

      // Registrar inicio de sesión en la tabla InicioSesion
      try {
        await pool.query(
          'INSERT INTO InicioSesion (CUENTA_ID, FechaHora) VALUES (?, NOW())',
          [user.CUENTA_ID]
        );
      } catch (logErr) {
        console.warn('[MySQL] No se pudo registrar InicioSesion:', logErr.message);
      }

      return res.json({
        ok: true,
        mensaje: 'Autenticación exitosa',
        fuente: 'mysql',
        astronauta: {
          id: user.Astronauta_ID,
          nombre: user.Nombre,
          identificador: user.Identificador,
          usuario: user.Usuario,
          cuentaId: user.CUENTA_ID,
          vitales: {
            temperatura: user.TemperaturaCorporal || 36.6,
            oxigeno: user.Oxigeno || 98.5,
            radiacion: user.Radiacion || 0.11,
            comunicacion: user.Comunicacion || 'Enlace Nominal DSN'
          }
        }
      });
    }

    // Si la consulta corrió pero no hubo coincidencia de credenciales
    return res.status(401).json({
      ok: false,
      error: 'Credenciales inválidas. Compruebe el identificador/usuario y la clave de acceso.'
    });

  } catch (dbError) {
    console.warn('[Auth] Base de datos no disponible, evaluando credenciales de contingencia:', dbError.message);

    // Modo de contingencia (fallback offline seguro)
    const encontrado = ASTRONAUTAS_FALLBACK.find(
      (a) =>
        (a.Identificador.toLowerCase() === loginUser.toLowerCase() ||
          a.Usuario.toLowerCase() === loginUser.toLowerCase()) &&
        a.PasswordHash === loginPass
    );

    if (encontrado) {
      return res.json({
        ok: true,
        mensaje: 'Autenticación exitosa (Modo de contingencia)',
        fuente: 'local_fallback',
        astronauta: {
          id: encontrado.Astronauta_ID,
          nombre: encontrado.Nombre,
          identificador: encontrado.Identificador,
          usuario: encontrado.Usuario,
          cuentaId: encontrado.Astronauta_ID,
          vitales: {
            temperatura: 36.6,
            oxigeno: 98.5,
            radiacion: 0.11,
            comunicacion: 'Enlace Local Seguro'
          }
        }
      });
    }

    return res.status(401).json({
      ok: false,
      error: 'Credenciales inválidas. Compruebe el identificador/usuario y la clave de acceso.'
    });
  }
});

/**
 * GET /api/auth/astronautas
 * Lista los astronautas registrados
 */
router.get('/astronautas', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.Astronauta_ID, a.Nombre, a.Identificador, c.Usuario 
      FROM Astronauta a
      LEFT JOIN Cuenta c ON a.Astronauta_ID = c.Astronauta_ID
    `);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.json({
      ok: true,
      data: ASTRONAUTAS_FALLBACK.map((a) => ({
        Astronauta_ID: a.Astronauta_ID,
        Nombre: a.Nombre,
        Identificador: a.Identificador,
        Usuario: a.Usuario
      }))
    });
  }
});

export default router;
