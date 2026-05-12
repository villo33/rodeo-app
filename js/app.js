// ======================================
// UTILIDAD
// ======================================
function hoy() {
    return new Date().toISOString().split("T")[0];
}

// ======================================
// INVENTARIO (MYSQL)
// ======================================
(function () {

    const form = document.getElementById("formInventario");
    if (!form) return;

    const lista = document.getElementById("lista");

    async function cargar() {
        const res = await fetch('/inventario');
        const data = await res.json();

        lista.innerHTML = "";

        if (data.length === 0) {
            lista.innerHTML = "<p>Sin productos</p>";
            return;
        }

        data.forEach(item => {
            lista.innerHTML += `
                <div class="card">
                    <strong>${item.nombre}</strong><br>
                    Cantidad: ${item.cantidad}
                </div>
            `;
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nombre = document.getElementById("producto").value.trim();
        const cantidad = document.getElementById("cantidad").value;

        if (!nombre || !cantidad) {
            alert("Completa todos los campos");
            return;
        }

        await fetch('/inventario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, cantidad })
        });

        form.reset();
        cargar();
    });

    cargar();

})();


// ======================================
// MANTENIMIENTO (MYSQL)
// ======================================
(function () {

    const form = document.getElementById("formMantenimiento");
    if (!form) return;

    const lista = document.getElementById("listaMantenimiento");

    async function cargar() {
        const res = await fetch('/mantenimiento');
        const data = await res.json();

        lista.innerHTML = "";

        if (data.length === 0) {
            lista.innerHTML = "<p>Sin mantenimientos</p>";
            return;
        }

        data.forEach(item => {
            lista.innerHTML += `
                <div class="card">
                    <strong>Habitación ${item.habitacion}</strong><br>
                    ${item.descripcion}<br>
                    Encargado: ${item.encargado}<br>
                    <small>${item.fecha}</small>
                </div>
            `;
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const habitacion = document.getElementById("habitacion").value;
        const descripcion = document.getElementById("descripcion").value.trim();
        const encargado = document.getElementById("encargadoMantenimiento").value.trim();
        const fecha = document.getElementById("fechaMantenimiento").value;

        if (!habitacion || !descripcion || !encargado || !fecha) {
            alert("Completa todos los campos");
            return;
        }

        await fetch('/mantenimiento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ habitacion, descripcion, encargado, fecha })
        });

        form.reset();
        cargar();
    });

    cargar();

})();


// ======================================
// HABITACIONES / RESERVAS
// ======================================
(function () {

    const btn = document.getElementById("guardarReserva");
    if (!btn) return;

    const inputFecha = document.getElementById("fecha");
    const tabla = document.getElementById("tablaHabitaciones");

    const habitaciones = [
        101,102,103,104,105,106,107,
        201,202,203,204,205,206,207,
        301,302,303,304,305,306
    ];

    async function cargarEstado() {

        const fecha = inputFecha.value;
        if (!fecha) return;

        const res = await fetch(`/estado/${fecha}`);
        const data = await res.json();

        let ocupadas = data.map(r => r.habitacion);

        let html = "<tr>";

        habitaciones.forEach(h => {
            if (ocupadas.includes(h)) {
                html += `<td style="background:red;color:white;">${h}</td>`;
            } else {
                html += `<td style="background:green;color:white;">${h}</td>`;
            }
        });

        html += "</tr>";

        tabla.innerHTML = html;
    }

    btn.addEventListener("click", async () => {

        const habitacion = document.getElementById("numHabitacion").value;
        const entrada = document.getElementById("entrada").value;
        const salida = document.getElementById("salida").value;
        const encargado = document.getElementById("encargado").value;

        if (!habitacion || !entrada || !salida || !encargado) {
            alert("Completa todos los datos");
            return;
        }

        const res = await fetch('/reservas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ habitacion, entrada, salida, encargado })
        });

        const msg = await res.text();
        alert(msg);

        cargarEstado();
    });

    document.getElementById("verEstado")?.addEventListener("click", cargarEstado);

})();


// ======================================
// HISTORIAL
// ======================================
(function () {

    const tabla = document.getElementById("tablaHistorial");
    if (!tabla) return;

    async function cargar() {
        const res = await fetch('/historial');
        const data = await res.json();

        tabla.innerHTML = "";

        data.forEach(item => {
            tabla.innerHTML += `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.fecha}</td>
                    <td>${item.encargado}</td>
                    <td>${JSON.stringify(item.ocupadas)}</td>
                </tr>
            `;
        });
    }

    cargar();

})();