<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ideota — ¿Qué opina tu ciudad?</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header>
    <div class="header-graphic">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
      </svg>
    </div>
    <h1>Ideota</h1>
    <p>Descubre cómo se siente tu ciudad comparada con el resto del país.</p>
  </header>

  <main>
    <!-- PASO 1: elegir ciudad -->
    <section id="paso-ciudad" class="card">
      <h2>1. ¿De dónde eres?</h2>
      <label for="select-departamento">Departamento</label>
      <select id="select-departamento">
        <option value="">Cargando...</option>
      </select>

      <label for="select-ciudad">Ciudad</label>
      <select id="select-ciudad" disabled>
        <option value="">Primero elige un departamento</option>
      </select>

      <button id="btn-empezar" disabled>Empezar</button>
    </section>

    <!-- PASO 2: responder preguntas (TIPO WIZARD) -->
    <section id="paso-preguntas" class="card hidden">
      <!-- Barra de progreso -->
      <div class="progreso-container">
        <div class="progreso-header">
          <span id="progreso-texto">Paso 1</span>
          <span id="progreso-porcentaje">0%</span>
        </div>
        <div class="progreso-barra">
          <div id="progreso-relleno" class="progreso-relleno"></div>
        </div>
      </div>

      <div id="contenedor-preguntas">
        <!-- Aquí JavaScript inyectará el grupo de preguntas -->
      </div>

      <!-- Botones de Navegación -->
      <div class="wizard-controles">
        <button id="btn-atras" class="btn-secundario" disabled>← Atrás</button>
        <button id="btn-siguiente" class="btn-primario" disabled>Siguiente →</button>
      </div>
      
      <p id="mensaje-envio" class="mensaje"></p>
    </section>

    <!-- PASO 3: ver promedios -->
    <section id="paso-resultados" class="card hidden">
      <h2>3. Resultados</h2>
      <label for="select-pregunta-resultado">Pregunta</label>
      <select id="select-pregunta-resultado"></select>

      <div class="tabs">
        <button class="tab activo" data-vista="ciudad">Por ciudad</button>
        <button class="tab" data-vista="departamento">Por departamento</button>
      </div>

      <div id="tabla-resultados"></div>
    </section>
  </main>

  <footer>
    <p>Ideota · Proyecto académico · Datos anónimos</p>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="app.js"></script>
</body>
</html>
