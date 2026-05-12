const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const webpush = require('web-push');
const app = express();



// ================= PUSH =================
const PUBLIC_KEY = 'BJ9e4DSpEVY0_Nq_FJ6py3oGRBKFl7BCh5wunz4q5bDjA87IaJP2vw902IOj4rNllyV0B8ddg52vwrA5gXq0DSw';

const PRIVATE_KEY = 'UF2t6HaUoxPp33coN4MVWxS82cjPBNh3w0gHrKXdZEc';

webpush.setVapidDetails(
  'mailto:tu@email.com',
  PUBLIC_KEY,
  PRIVATE_KEY
);

// ================= DATABASE =================
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ================= SUSCRIPCIONES =================
app.post('/suscribir', async (req, res) => {
  try {

    const sub = req.body;

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
app.get("/", (req,res)=>{
  res.redirect("/login.html");
});

// ================= MANTENIMIENTO =================

// OBTENER
app.get('/mantenimiento', async (req, res) => {

  try {

    const result = await db.query(
      'SELECT * FROM el_rodeo ORDER BY id DESC'
    );

    res.json(result.rows);

  } catch (err) {

    res.status(500).send(err.message);
  }
});

// CREAR
app.post('/mantenimiento', async (req, res) => {

  const {
    area,
    descripcion,
    encargado,
    fecha,
    evidencia
  } = req.body;

  try {

    await db.query(
      `
      INSERT INTO el_rodeo
      (
        area,
        descripcion,
        encargado,
        fecha,
        evidencia
      )

      VALUES ($1,$2,$3,$4,$5)
      `,
      [
        area,
        descripcion,
        encargado,
        fecha,
        evidencia
      ]
    );

    res.send('Guardado');

  } catch (err) {

    console.log(err);

    res.status(500).send(err.message);
  }
});

// ACTUALIZAR
app.put('/mantenimiento', async (req, res) => {

  const {
    id,
    area,
    descripcion,
    encargado,
    fecha,
    evidencia
  } = req.body;

  try {

    await db.query(
      `
      UPDATE el_rodeo
      SET
        area=$1,
        descripcion=$2,
        encargado=$3,
        fecha=$4,
        evidencia=$5

      WHERE id=$6
      `,
      [
        area,
        descripcion,
        encargado,
        fecha,
        evidencia,
        id
      ]
    );

    res.send('Actualizado');

  } catch (err) {

    console.log(err);

    res.status(500).send(err.message);
  }
});

// ELIMINAR
app.delete('/mantenimiento/:id', async (req, res) => {

  try {

    await db.query(
  'DELETE FROM el_rodeo WHERE id=$1',
  [req.params.id]
);

    res.send('Eliminado');

  } catch (err) {

    res.status(500).send(err.message);
  }
});

// ================= TAREAS =================

// OBTENER
app.get('/tareas', async (req, res) => {

  try {

    const result = await db.query(
      'SELECT * FROM tareas ORDER BY id DESC'
    );

    res.json(result.rows);

  } catch (err) {

    res.status(500).send(err.message);
  }
});

// CREAR + NOTIFICAR
app.post('/tareas', async (req, res) => {

  const { descripcion, asignado_por, fecha } = req.body;

  try {

    await db.query(
      `INSERT INTO tareas
      (descripcion, asignado_por, fecha, estado)
      VALUES ($1,$2,$3,$4)`,
      [descripcion, asignado_por, fecha, 'pendiente']
    );

    const payload = JSON.stringify({
      title: '📋 Nueva tarea',
      body: descripcion
    });

    const subs = await db.query(
      'SELECT * FROM suscripciones'
    );

    for (const sub of subs.rows) {

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {

        await webpush.sendNotification(
          pushSubscription,
          payload
        );

      } catch (err) {

        console.log("❌ Error push:", err.statusCode || err);

        if (
          err.statusCode === 410 ||
          err.statusCode === 404
        ) {

          await db.query(
            'DELETE FROM suscripciones WHERE endpoint = $1',
            [sub.endpoint]
          );
        }
      }
    }

    res.send('Tarea creada y notificada');

  } catch (err) {

    console.error(err);

    res.status(500).send(err.message);
  }
});

// COMPLETAR TAREA
app.put('/tareas/:id', async (req, res) => {

  try {

    const id = req.params.id;

    const { realizado_por } = req.body;

    const result = await db.query(
      `UPDATE tareas
       SET estado='hecho',
           realizado_por=$1
       WHERE id=$2
       RETURNING *`,
      [realizado_por, id]
    );

    const tarea = result.rows[0];

    const payload = JSON.stringify({
      title: '✅ Tarea completada',
      body: `${tarea.descripcion} fue finalizada por ${realizado_por}`
    });

    const subs = await db.query(
      'SELECT * FROM suscripciones'
    );

    for (const sub of subs.rows) {

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {

        await webpush.sendNotification(
          pushSubscription,
          payload
        );

      } catch (err) {

        if (
          err.statusCode === 410 ||
          err.statusCode === 404
        ) {

          await db.query(
            'DELETE FROM suscripciones WHERE endpoint = $1',
            [sub.endpoint]
          );
        }
      }
    }

    res.send('Tarea completada');

  } catch (err) {

    console.error(err);

    res.status(500).send(err.message);
  }
});

// ELIMINAR TAREA
app.delete('/tareas/:id', async (req, res) => {

  try {

    await db.query(
  'DELETE FROM el_rodeo WHERE id=$1',
  [req.params.id]
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