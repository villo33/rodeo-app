const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const webpush = require('web-push');

const PUBLIC_KEY = 'BJ9e4DSpEVY0_Nq_FJ6py3oGRBKFl7BCh5wunz4q5bDjA87IaJP2vw902IOj4rNllyV0B8ddg52vwrA5gXq0DSw';
const PRIVATE_KEY = 'UF2t6HaUoxPp33coN4MVWxS82cjPBNh3w0gHrKXdZEc';

webpush.setVapidDetails(
  'mailto:tu@email.com',
  PUBLIC_KEY,
  PRIVATE_KEY
);
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.post('/suscribir', async (req, res) => {
  try {

    const sub = req.body;

    // 🔥 EVITAR DUPLICADOS
    const existe = await db.query(
      'SELECT 1 FROM suscripciones WHERE endpoint = $1',
      [sub.endpoint]
    );

    if (existe.rows.length > 0) {
      return res.sendStatus(200);
    }

    await db.query(
      `INSERT INTO suscripciones (endpoint, p256dh, auth)
       VALUES ($1, $2, $3)`,
      [
        sub.endpoint,
        sub.keys.p256dh,
        sub.keys.auth
      ]
    );

    console.log("✅ Nueva suscripción guardada");

    res.sendStatus(201);

  } catch (err) {
    console.error("❌ Error guardando suscripción:", err);
    res.status(500).send("Error");
  }
});

// ================= RUTA PRINCIPAL =================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ================= INVENTARIO =================
app.get('/inventario', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM inventario');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post('/inventario', async (req, res) => {
  const { nombre, cantidad, encargado, fecha } = req.body;

  try {
    await db.query(
      'INSERT INTO inventario(nombre,cantidad,encargado,fecha) VALUES ($1,$2,$3,$4)',
      [nombre, cantidad, encargado, fecha]
    );
    res.send('Guardado');
  } catch (err) {
    res.status(500).send(err);
  }
});

app.put('/inventario', async (req, res) => {
  const { id, nombre, cantidad, encargado, fecha } = req.body;

  try {
    await db.query(
      'UPDATE inventario SET nombre=$1, cantidad=$2, encargado=$3, fecha=$4 WHERE id=$5',
      [nombre, cantidad, encargado, fecha, id]
    );
    res.send('Actualizado');
  } catch (err) {
    res.status(500).send(err);
  }
});

app.delete('/inventario/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM inventario WHERE id=$1', [req.params.id]);
    res.send('Eliminado');
  } catch (err) {
    res.status(500).send(err);
  }
});

// ================= MANTENIMIENTO =================
app.get('/mantenimiento', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM mantenimiento');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post('/mantenimiento', async (req, res) => {
  const { habitacion, descripcion, encargado, fecha } = req.body;

  try {
    await db.query(
      'INSERT INTO mantenimiento(habitacion,descripcion,encargado,fecha) VALUES ($1,$2,$3,$4)',
      [habitacion, descripcion, encargado, fecha]
    );
    res.send('Guardado');
  } catch (err) {
    res.status(500).send(err);
  }
});

app.put('/mantenimiento', async (req, res) => {
  const { id, habitacion, descripcion, encargado, fecha } = req.body;

  try {
    await db.query(
      'UPDATE mantenimiento SET habitacion=$1, descripcion=$2, encargado=$3, fecha=$4 WHERE id=$5',
      [habitacion, descripcion, encargado, fecha, id]
    );
    res.send('Actualizado');
  } catch (err) {
    res.status(500).send(err);
  }
});

app.delete('/mantenimiento/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM mantenimiento WHERE id=$1', [req.params.id]);
    res.send('Eliminado');
  } catch (err) {
    res.status(500).send(err);
  }
});

// ================= HABITACIONES =================
app.get('/habitaciones', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM habitaciones
      ORDER BY id DESC
    `);

    res.json(result.rows);

  } catch (err) {
    res.status(500).send(err);
  }
});

app.post('/habitaciones', async (req, res) => {
  try {

    let { habitacion, fecha, encargado, color, inicio, fin } = req.body;

    // 🔥 VALIDACIÓN REAL
    if (!habitacion || !fecha || !encargado) {
      return res.status(400).send('Datos incompletos');
    }

    // 🔥 LIMPIEZA CORRECTA (NO ROMPE DATOS)
    const inicioLimpio = inicio && inicio !== "" ? inicio : null;
    const finLimpio = fin && fin !== "" ? fin : null;

    await db.query(
      `INSERT INTO habitaciones 
      (habitacion, fecha, encargado, color, inicio, fin)
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        Number(habitacion),
        fecha,
        encargado,
        color || null,
        inicioLimpio,
        finLimpio
      ]
    );

    res.send('Guardado');

  } catch (err) {
    console.log("ERROR REAL HABITACIONES:", err);
    res.status(500).send(err.message);
  }
});
// 🔥 ELIMINAR HABITACIONES (FALTABA ESTO)
app.delete('/habitaciones/:id', async (req, res) => {
  try {

    const id = req.params.id;

    await db.query(
      'DELETE FROM habitaciones WHERE id = $1',
      [id]
    );

    res.send('Eliminado correctamente');

  } catch (err) {
    console.error("ERROR ELIMINANDO HABITACION:", err);
    res.status(500).send(err.message);
  }
});
// ================= LIMPIEZA =================
app.get('/limpieza', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM control_limpieza ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post('/limpieza', async (req, res) => {
  const { habitacion, tipo_accion, fecha, empleado, observacion } = req.body;

  try {
    await db.query(
      `INSERT INTO control_limpieza 
      (habitacion, tipo_accion, fecha, empleado, observacion, estado)
      VALUES ($1,$2,$3,$4,$5,'hecho')`,
      [habitacion, tipo_accion, fecha, empleado, observacion]
    );
    res.send('Guardado');
  } catch (err) {
    res.status(500).send(err);
  }
});

app.put('/limpieza', async (req, res) => {
  const { id, habitacion, tipo_accion, fecha, empleado, observacion } = req.body;

  try {
    await db.query(
      `UPDATE control_limpieza 
       SET habitacion=$1, tipo_accion=$2, fecha=$3, empleado=$4, observacion=$5 
       WHERE id=$6`,
      [habitacion, tipo_accion, fecha, empleado, observacion, id]
    );
    res.send('Actualizado');
  } catch (err) {
    res.status(500).send(err);
  }
});

app.delete('/limpieza/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM control_limpieza WHERE id=$1', [req.params.id]);
    res.send('Eliminado');
  } catch (err) {
    res.status(500).send(err);
  }
});
// ================= TAREAS =================

// 🔹 OBTENER TAREAS
app.get('/tareas', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tareas ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err);
  }
});

// 🔥 CREAR TAREA + NOTIFICAR
app.post('/tareas', async (req, res) => {
  const { descripcion, asignado_por, fecha } = req.body;

  try {

    await db.query(
      'INSERT INTO tareas (descripcion, asignado_por, fecha, estado) VALUES ($1,$2,$3,$4)',
[descripcion, asignado_por, fecha, 'pendiente']
    );

    const payload = JSON.stringify({
      title: "📋 Nueva tarea",
      body: descripcion
    });

    const subs = await db.query('SELECT * FROM suscripciones');

    for (const sub of subs.rows) {

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err) {

        console.log("❌ Error push:", err.statusCode || err);

        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.query(
            'DELETE FROM suscripciones WHERE endpoint = $1',
            [sub.endpoint]
          );
        }
      }
    }

    res.send('Tarea creada y notificada');

  } catch (err) {
    console.error("🔥 ERROR GENERAL:", err);
    res.status(500).send(err.message);
  }
});

// 🔥 COMPLETAR TAREA + NOTIFICAR (ESTA ES LA CLAVE)
app.put('/tareas/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { realizado_por } = req.body;

    // 1. actualizar tarea
    const result = await db.query(
      `UPDATE tareas 
       SET estado = 'hecho', realizado_por = $1 
       WHERE id = $2 
       RETURNING *`,
      [realizado_por, id]
    );

    const tarea = result.rows[0];

    // 2. payload con nombre 🔥
    const payload = JSON.stringify({
      title: "✅ Tarea completada",
      body: `${tarea.descripcion} fue finalizada por ${realizado_por}`
    });

    // 3. enviar notificaciones
    const subs = await db.query('SELECT * FROM suscripciones');

    for (const sub of subs.rows) {

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.query(
            'DELETE FROM suscripciones WHERE endpoint = $1',
            [sub.endpoint]
          );
        }
      }
    }

    res.send('Tarea completada con responsable');

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// 🔥 ELIMINAR TAREA
app.delete('/tareas/:id', async (req, res) => {
  try {
    const id = req.params.id;

    await db.query(
      'DELETE FROM tareas WHERE id = $1',
      [id]
    );

    res.send('Tarea eliminada');

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});
// ================= SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});