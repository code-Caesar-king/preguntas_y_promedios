// ==========================================
// 1. CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = "https://rvgvpzcosqzwidfgnrwv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z3ZwemNvc3F6d2lkZmducnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MTEzNTUsImV4cCI6MjEwODE4NzM1NX0.kaZgAD1yAh0XTviRrOwVkEkl9UqQyVHay9ORy1f91-8";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

// ==========================================
// 2. ESTADO GLOBAL Y ELEMENTOS DEL DOM
// ==========================================
const estado = {
  preguntasAgrupadas: [], // Array de arrays con los grupos
  bloqueActual: 0,
  ciudadId: null,
  respuestas: {}, // Objeto con { preguntaId: valor }
  vistaActual: 'ciudad'
};

const DOM = {
  pasoCiudad: document.getElementById("paso-ciudad"),
  pasoPreguntas: document.getElementById("paso-preguntas"),
  pasoResultados: document.getElementById("paso-resultados"),
  selectDepto: document.getElementById("select-departamento"),
  selectCiudad: document.getElementById("select-ciudad"),
  btnEmpezar: document.getElementById("btn-empezar"),
  contenedorPreguntas: document.getElementById("contenedor-preguntas"),
  btnAtras: document.getElementById("btn-atras"),
  btnSiguiente: document.getElementById("btn-siguiente"),
  msgEnvio: document.getElementById("mensaje-envio"),
  selectPreguntaRes: document.getElementById("select-pregunta-resultado"),
  tablaResultados: document.getElementById("tabla-resultados"),
  tabs: document.querySelectorAll(".tab"),
  progTexto: document.getElementById("progreso-texto"),
  progPorcentaje: document.getElementById("progreso-porcentaje"),
  progRelleno: document.getElementById("progreso-relleno")
};

// ==========================================
// 3. INICIALIZACIÓN Y CARGA
// ==========================================
async function iniciarApp() {
  try {
    await cargarDepartamentos();
    await cargarPreguntas();
    configurarEventos();
  } catch (error) {
    console.error("Error crítico:", error);
  }
}

async function cargarDepartamentos() {
  const { data, error } = await db.from("departamento").select("id, nombre").order("nombre");
  if (error) return;
  let html = '<option value="">Selecciona un departamento</option>';
  data.forEach(dep => { html += `<option value="${dep.id}">${dep.nombre}</option>`; });
  DOM.selectDepto.innerHTML = html;
}

async function cargarPreguntas() {
  const { data, error } = await db.from("pregunta").select("id, texto, tipo").eq("activa", true).order("id");
  if (error) return;

  // Llenar el selector de resultados
  let htmlSelect = '';
  data.forEach(p => { htmlSelect += `<option value="${p.id}">${p.texto}</option>`; });
  DOM.selectPreguntaRes.innerHTML = htmlSelect;

  // Agrupar preguntas por categorías
  const grupos = {
    'Clima': { clase: 'cat-clima', icono: '🌤️', preguntas: [] },
    'Transporte': { clase: 'cat-transporte', icono: '🚌', preguntas: [] },
    'Sensación Ciudad': { clase: 'cat-vibra', icono: '✨', preguntas: [] },
    'Calidad de Vida': { clase: 'cat-calidad', icono: '🏙️', preguntas: [] }
  };

  data.forEach(p => {
    const t = p.texto.toLowerCase();
    if (t.includes('clima') || t.includes('calor') || t.includes('frío') || t.includes('zonas verdes') || t.includes('caminando')) {
      grupos['Clima'].preguntas.push(p);
    } else if (t.includes('transporte') || t.includes('tarifas') || t.includes('bicicleta') || t.includes('peatones') || t.includes('desplazarse')) {
      grupos['Transporte'].preguntas.push(p);
    } else if (t.includes('animada') || t.includes('cultura') || t.includes('ocio') || t.includes('orgullo') || t.includes('ideal para vivir') || t.includes('recomendarías')) {
      grupos['Sensación Ciudad'].preguntas.push(p);
    } else {
      grupos['Calidad de Vida'].preguntas.push(p);
    }
  });

  // Convertir a array y filtrar grupos vacíos
  estado.preguntasAgrupadas = Object.keys(grupos)
    .map(nombre => ({ nombre, ...grupos[nombre] }))
    .filter(g => g.preguntas.length > 0);
}

// ==========================================
// 4. EVENTOS
// ==========================================
function configurarEventos() {
  DOM.selectDepto.addEventListener("change", async (e) => {
    const depId = e.target.value;
    if (!depId) {
      DOM.selectCiudad.disabled = true;
      DOM.selectCiudad.innerHTML = '<option value="">Primero elige un departamento</option>';
      DOM.btnEmpezar.disabled = true;
      return;
    }
    DOM.selectCiudad.innerHTML = '<option value="">Cargando...</option>';
    DOM.selectCiudad.disabled = true;

    const { data, error } = await db.from("ciudad").select("id, nombre").eq("departamento_id", depId).order("nombre");
    if (error) return;

    let html = '<option value="">Selecciona una ciudad</option>';
    data.forEach(c => { html += `<option value="${c.id}">${c.nombre}</option>`; });
    DOM.selectCiudad.innerHTML = html;
    DOM.selectCiudad.disabled = false;
  });

  DOM.selectCiudad.addEventListener("change", (e) => {
    estado.ciudadId = e.target.value;
    DOM.btnEmpezar.disabled = !estado.ciudadId;
  });

  DOM.btnEmpezar.addEventListener("click", () => {
    if (!estado.ciudadId) return;
    estado.bloqueActual = 0;
    estado.respuestas = {};
    DOM.pasoCiudad.classList.add("hidden");
    DOM.pasoPreguntas.classList.remove("hidden");
    renderizarBloque();
  });

  DOM.btnAtras.addEventListener("click", () => {
    if (estado.bloqueActual > 0) {
      estado.bloqueActual--;
      renderizarBloque();
    }
  });

  DOM.btnSiguiente.addEventListener("click", () => {
    if (estado.bloqueActual < estado.preguntasAgrupadas.length - 1) {
      estado.bloqueActual++;
      renderizarBloque();
    } else {
      enviarRespuestas(); // Si es el último bloque, envía
    }
  });

  DOM.tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      DOM.tabs.forEach(t => t.classList.remove("activo"));
      tab.classList.add("activo");
      estado.vistaActual = tab.dataset.vista;
      cargarResultados();
    });
  });
  DOM.selectPreguntaRes.addEventListener("change", cargarResultados);
}

// ==========================================
// 5. RENDERIZADO DEL WIZARD (PASO A PASO)
// ==========================================
function renderizarBloque() {
  const bloque = estado.preguntasAgrupadas[estado.bloqueActual];
  
  // Actualizar barra de progreso
  const totalBloques = estado.preguntasAgrupadas.length;
  const porcentaje = Math.round(((estado.bloqueActual + 1) / totalBloques) * 100);
  DOM.progTexto.textContent = `Paso ${estado.bloqueActual + 1} de ${totalBloques}: ${bloque.nombre}`;
  DOM.progPorcentaje.textContent = `${porcentaje}% completado`;
  DOM.progRelleno.style.width = `${porcentaje}%`;

  // Construir HTML de las preguntas del bloque
  let html = '';
  bloque.preguntas.forEach(p => {
    const opciones = [1, 2, 3, 4, 5].map(n => ({v: n, t: n.toString()}));
    // Revisar si ya estaba respondida (por si el usuario dio "Atrás")
    const valorPrevio = estado.respuestas[p.id];

    html += `
      <div class="pregunta ${bloque.clase}" data-id="${p.id}">
        <p><span class="icono-pregunta">${bloque.icono}</span> ${p.texto}</p>
        <div class="opciones">
          ${opciones.map(o => `
            <div class="opcion ${valorPrevio === o.v ? 'seleccionada' : ''}" data-valor="${o.v}">${o.t}</div>
          `).join('')}
        </div>
      </div>
    `;
  });

  DOM.contenedorPreguntas.innerHTML = html;

  // Enlazar clics en las opciones
  DOM.contenedorPreguntas.querySelectorAll('.pregunta').forEach(bloqueDOM => {
    const pId = bloqueDOM.dataset.id;
    bloqueDOM.querySelectorAll('.opcion').forEach(opcion => {
      opcion.addEventListener('click', () => {
        bloqueDOM.querySelectorAll('.opcion').forEach(o => o.classList.remove('seleccionada'));
        opcion.classList.add('seleccionada');
        estado.respuestas[pId] = parseInt(opcion.dataset.valor);
        validarBotonSiguiente();
      });
    });
  });

  // Configurar botones de abajo
  DOM.btnAtras.disabled = estado.bloqueActual === 0;
  if (estado.bloqueActual === estado.preguntasAgrupadas.length - 1) {
    DOM.btnSiguiente.textContent = "Finalizar y Ver Resultados";
  } else {
    DOM.btnSiguiente.textContent = "Siguiente →";
  }
  
  validarBotonSiguiente();
}

function validarBotonSiguiente() {
  const bloque = estado.preguntasAgrupadas[estado.bloqueActual];
  // Verificar que todas las preguntas del bloque actual estén respondidas
  const todasRespondidas = bloque.preguntas.every(p => p.id in estado.respuestas);
  DOM.btnSiguiente.disabled = !todasRespondidas;
}

// ==========================================
// 6. ENVIAR RESPUESTAS A SUPABASE
// ==========================================
async function enviarRespuestas() {
  DOM.btnSiguiente.disabled = true;
  DOM.btnSiguiente.textContent = "Guardando...";
  DOM.msgEnvio.textContent = "";
  
  // Convertir el objeto de respuestas a un array para Supabase
  const filas = Object.keys(estado.respuestas).map(pId => ({
    pregunta_id: parseInt(pId),
    ciudad_id: parseInt(estado.ciudadId),
    valor: estado.respuestas[pId]
  }));

  const { error } = await db.from("respuesta").insert(filas);

  if (error) {
    console.error(error);
    DOM.msgEnvio.textContent = "Error al guardar. Intenta de nuevo.";
    DOM.msgEnvio.style.color = "var(--error)";
    DOM.btnSiguiente.disabled = false;
    DOM.btnSiguiente.textContent = "Finalizar y Ver Resultados";
    return;
  }

  // Éxito
  setTimeout(() => {
    DOM.pasoPreguntas.classList.add("hidden");
    DOM.pasoResultados.classList.remove("hidden");
    cargarResultados();
  }, 800);
}

// ==========================================
// 7. RESULTADOS
// ==========================================
async function cargarResultados() {
  const preguntaId = DOM.selectPreguntaRes.value;
  if (!preguntaId) return;

  DOM.tablaResultados.innerHTML = "<p>Cargando...</p>";
  const funcionRPC = estado.vistaActual === 'ciudad' ? 'promedio_por_ciudad' : 'promedio_por_departamento';
  const { data, error } = await db.rpc(funcionRPC, { p_pregunta_id: parseInt(preguntaId) });

  if (error || !data || data.length === 0) {
    DOM.tablaResultados.innerHTML = "<p>No hay datos suficientes aún.</p>";
    return;
  }

  let html = '<table><thead><tr>';
  if (estado.vistaActual === 'ciudad') {
    html += '<th>Ciudad</th><th>Departamento</th><th>Promedio</th><th>Votos</th></tr></thead><tbody>';
  } else {
    html += '<th>Departamento</th><th>Promedio</th><th>Votos</th></tr></thead><tbody>';
  }

  data.forEach(row => {
    html += '<tr>';
    if (estado.vistaActual === 'ciudad') {
      html += `<td>${row.ciudad}</td><td>${row.departamento}</td><td><b class="promedio">${row.promedio}</b></td><td>${row.votos}</td>`;
    } else {
      html += `<td>${row.departamento}</td><td><b class="promedio">${row.promedio}</b></td><td>${row.votos}</td>`;
    }
    html += '</tr>';
  });
  html += '</tbody></table>';
  DOM.tablaResultados.innerHTML = html;
}

iniciarApp();
