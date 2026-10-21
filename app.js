// ==========================================
// 1. CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = "https://rvgvpzcosqzwidfgnrwv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z3ZwemNvc3F6d2lkZmducnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MTEzNTUsImV4cCI6MjEwODE4NzM1NX0.kaZgAD1yAh0XTviRrOwVkEkl9UqQyVHay9ORy1f91-8";

// Creamos el cliente (usando el objeto global 'supabase' del CDN)
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Ideal porque tus usuarios son anónimos
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});
// ==========================================
// 2. ESTADO GLOBAL Y ELEMENTOS DEL DOM
// ==========================================
const estado = {
  preguntas: [],
  ciudadId: null,
  respuestas: {},
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
  btnEnviar: document.getElementById("btn-enviar"),
  msgEnvio: document.getElementById("mensaje-envio"),
  selectPreguntaRes: document.getElementById("select-pregunta-resultado"),
  tablaResultados: document.getElementById("tabla-resultados"),
  tabs: document.querySelectorAll(".tab")
};

// ==========================================
// 3. INICIALIZACIÓN
// ==========================================
async function iniciarApp() {
  console.log("🚀 Iniciando Ideota...");
  try {
    await cargarDepartamentos();
    await cargarPreguntas();
    configurarEventos();
    console.log("✅ App lista.");
  } catch (error) {
    console.error("❌ Error crítico al iniciar:", error);
  }
}

// ==========================================
// 4. FUNCIONES DE CARGA DE DATOS
// ==========================================
async function cargarDepartamentos() {
  console.log("📡 Cargando departamentos...");
  const { data, error } = await db.from("departamento").select("id, nombre").order("nombre");
  
  if (error) {
    console.error("Error cargando departamentos:", error);
    DOM.selectDepto.innerHTML = '<option value="">Error al cargar</option>';
    return;
  }
  
  console.log("📦 Departamentos recibidos:", data);
  let html = '<option value="">Selecciona un departamento</option>';
  data.forEach(dep => {
    html += `<option value="${dep.id}">${dep.nombre}</option>`;
  });
  DOM.selectDepto.innerHTML = html;
}

async function cargarPreguntas() {
  console.log("📡 Cargando preguntas...");
  const { data, error } = await db.from("pregunta").select("id, texto, tipo").eq("activa", true).order("id");
  
  if (error) {
    console.error("Error cargando preguntas:", error);
    return;
  }
  
  console.log("📦 Preguntas recibidas:", data);
  estado.preguntas = data;
  
  let html = '';
  data.forEach(p => {
    html += `<option value="${p.id}">${p.texto}</option>`;
  });
  DOM.selectPreguntaRes.innerHTML = html;
}

// ==========================================
// 5. EVENTOS (CLICS Y SELECTORES)
// ==========================================
function configurarEventos() {
  // Al cambiar departamento, cargar ciudades
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

    const { data, error } = await db.from("ciudad")
    .select("id, nombre")
    .eq("departamento_id", depId) // <-- AQUÍ ESTÁ LA MAGIA
    .order("nombre");
    
    if (error) {
      console.error("Error cargando ciudades:", error);
      return;
    }

    let html = '<option value="">Selecciona una ciudad</option>';
    data.forEach(ciudad => {
      html += `<option value="${ciudad.id}">${ciudad.nombre}</option>`;
    });
    DOM.selectCiudad.innerHTML = html;
    DOM.selectCiudad.disabled = false;
  });

  // Al cambiar ciudad, habilitar botón de empezar
  DOM.selectCiudad.addEventListener("change", (e) => {
    estado.ciudadId = e.target.value;
    DOM.btnEmpezar.disabled = !estado.ciudadId;
  });

  // Botón Empezar
  DOM.btnEmpezar.addEventListener("click", () => {
    if (!estado.ciudadId) return;
    DOM.pasoCiudad.classList.add("hidden");
    DOM.pasoPreguntas.classList.remove("hidden");
    renderizarPreguntas();
  });

  // Botón Enviar
  DOM.btnEnviar.addEventListener("click", enviarRespuestas);

  // Pestañas de resultados
  DOM.tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      DOM.tabs.forEach(t => t.classList.remove("activo"));
      tab.classList.add("activo");
      estado.vistaActual = tab.dataset.vista;
      cargarResultados();
    });
  });

  // Selector de pregunta en resultados
  DOM.selectPreguntaRes.addEventListener("change", cargarResultados);
}

// ==========================================
// 6. RENDERIZAR Y ENVIAR PREGUNTAS
// ==========================================
function renderizarPreguntas() {
  let html = '';
  estado.respuestas = {}; // Limpiar respuestas previas

  estado.preguntas.forEach(p => {
    const opciones = p.tipo === 'si_no' 
      ? [{v: 1, t: 'Sí'}, {v: 0, t: 'No'}]
      : [1, 2, 3, 4, 5].map(n => ({v: n, t: n.toString()}));

    html += `
      <div class="pregunta" data-id="${p.id}">
        <p>${p.texto}</p>
        <div class="opciones">
          ${opciones.map(o => `<div class="opcion" data-valor="${o.v}">${o.t}</div>`).join('')}
        </div>
      </div>
    `;
  });

  DOM.contenedorPreguntas.innerHTML = html;

  // Enlazar clics en las opciones
  DOM.contenedorPreguntas.querySelectorAll('.pregunta').forEach(bloque => {
    const pId = bloque.dataset.id;
    bloque.querySelectorAll('.opcion').forEach(opcion => {
      opcion.addEventListener('click', () => {
        bloque.querySelectorAll('.opcion').forEach(o => o.classList.remove('seleccionada'));
        opcion.classList.add('seleccionada');
        estado.respuestas[pId] = parseInt(opcion.dataset.valor);
      });
    });
  });
}

async function enviarRespuestas() {
  // Validar que respondió todo
  const faltantes = estado.preguntas.filter(p => !(p.id in estado.respuestas));
  if (faltantes.length > 0) {
    DOM.msgEnvio.textContent = `Te faltan ${faltantes.length} preguntas.`;
    DOM.msgEnvio.classList.add("error");
    return;
  }

  DOM.btnEnviar.disabled = true;
  DOM.msgEnvio.textContent = "Enviando...";
  DOM.msgEnvio.classList.remove("error");

  // Preparar los datos para insertar
  const filas = estado.preguntas.map(p => ({
    pregunta_id: parseInt(p.id),
    ciudad_id: parseInt(estado.ciudadId),
    valor: estado.respuestas[p.id]
  }));

  const { error } = await db.from("respuesta").insert(filas);

  if (error) {
    console.error("Error al insertar:", error);
    DOM.msgEnvio.textContent = "Error al enviar. Revisa la consola.";
    DOM.msgEnvio.classList.add("error");
    DOM.btnEnviar.disabled = false;
    return;
  }

  DOM.msgEnvio.textContent = "¡Enviado con éxito!";
  setTimeout(() => {
    DOM.pasoPreguntas.classList.add("hidden");
    DOM.pasoResultados.classList.remove("hidden");
    cargarResultados();
  }, 1000);
}

// ==========================================
// 7. CARGAR RESULTADOS (PROMEDIOS)
// ==========================================
async function cargarResultados() {
  const preguntaId = DOM.selectPreguntaRes.value;
  if (!preguntaId) return;

  DOM.tablaResultados.innerHTML = "<p>Cargando resultados...</p>";

  // Llamamos a las funciones RPC que creaste en Supabase
  const funcionRPC = estado.vistaActual === 'ciudad' ? 'promedio_por_ciudad' : 'promedio_por_departamento';
  
  const { data, error } = await db.rpc(funcionRPC, { p_pregunta_id: parseInt(preguntaId) });

  if (error) {
    console.error("Error en RPC:", error);
    DOM.tablaResultados.innerHTML = "<p>Error al cargar promedios.</p>";
    return;
  }

  if (!data || data.length === 0) {
    DOM.tablaResultados.innerHTML = "<p>Aún no hay respuestas para esta pregunta.</p>";
    return;
  }

  // Construir tabla
  let html = '<table><thead><tr>';
  if (estado.vistaActual === 'ciudad') {
    html += '<th>Ciudad</th><th>Departamento</th><th>Promedio</th><th>Votos</th>';
  } else {
    html += '<th>Departamento</th><th>Promedio</th><th>Votos</th>';
  }
  html += '</tr></thead><tbody>';

  data.forEach(row => {
    html += '<tr>';
    if (estado.vistaActual === 'ciudad') {
      html += `<td>${row.ciudad}</td><td>${row.departamento}</td><td><b>${row.promedio}</b></td><td>${row.votos}</td>`;
    } else {
      html += `<td>${row.departamento}</td><td><b>${row.promedio}</b></td><td>${row.votos}</td>`;
    }
    html += '</tr>';
  });
  
  html += '</tbody></table>';
  DOM.tablaResultados.innerHTML = html;
}

// ==========================================
// 8. ARRANCAR
// ==========================================
iniciarApp();
