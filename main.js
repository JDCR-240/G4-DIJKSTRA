   // Variables globales principales
        let nodos, aristas, red;
        let modoActual = 'mover';
        let idSiguiente = 1;
        let nodoOrigenSel = null;
        let NodosTam = 0;
        const  NodoTamMax = 16;
        const  NodoTamMin = 7;
        // Estilos de colores por defecto
        const colorNodoDef = {
            background: '#b1c6de',          // Azul muy suave
            border: '#4a7a9f',              // Azul borde de logo
            highlight: { background: '#8aaae5', border: '#2c4a6b' },
            hover: { background: '#d9e3f0', border: '#5a8bb0' }
        
        };

        const colorAristaDef = {
            color: '#8aaae5',               // Azul medio
            highlight: '#5a8bb0',
            hover: '#4a7a9f'
        };

        function inicializarRed() {
            nodos = new vis.DataSet([]);
            aristas = new vis.DataSet([]);

            const elemContenedor = document.getElementById('lienzo-grafo');
            const datos = { nodes: nodos, edges: aristas };

            const opciones = {
    nodes: {
        shape: 'dot',
        size: 26,
        borderWidth: 2,
        font: { color: '#1a2b3c', size: 14, face: 'Outfit, sans-serif' }, /* Letra oscura */
        color: colorNodoDef,
        shadow: { enabled: true, color: 'rgba(31,38,135,0.1)' } /* Sombra más suave */
    },
    edges: {
        width: 2,
        color: colorAristaDef,
        font: { 
            color: '#1a2b3c', /* Letra oscura */
            size: 13, 
            face: 'Outfit, sans-serif',
            background: 'rgba(255,255,255,0.7)', /* Fondo blanco translúcido en el texto de las aristas */
            strokeWidth: 0,
            align: 'top'
        },
        smooth: { enabled: false },
        shadow: { enabled: true, color: 'rgba(31,38,135,0.05)' }
    },
                physics: {
                    enabled: false,
                },
                interaction: {
                    hover: true,
                    dragNodes: true,
                    dragView: true,
                    zoomView: true
                }
            };

            red = new vis.Network(elemContenedor, datos, opciones);

            configurarEventosRed();

            // Suscribir eventos para actualizar estadísticas y listas desplegables
            nodos.on('*', () => { actualizarStats(); actualizarDesplegables(); });
            aristas.on('*', () => { actualizarStats(); });

            // --- AQUÍ VIENE LA MAGIA NUEVA ---
            // Leemos los parámetros que nos mandó el index.html
            const urlParams = new URLSearchParams(window.location.search);
            const modo = urlParams.get('modo');
            const numNodos = parseInt(urlParams.get('nodos')) || 7; // Si no hay, usa 7 por defecto
                
            if (modo === 'manual') {
                limpiarLienzo(); // Si le dio a "MANUAL", lienzo vacío
            } else if (modo === 'generar') {
                generarGrafoEjemplo(numNodos); // Si le dio a "GENERAR", usamos el número ingresado
            } else {
                generarGrafoEjemplo(7); // Por si entra directo a programa.html sin pasar por el index
            }
                }

        function cambiarModo(nuevoModo) {
            modoActual = nuevoModo;
            
            if (nodoOrigenSel !== null) {
                desmarcarNodoSeleccionado(nodoOrigenSel);
                nodoOrigenSel = null;
            }

            document.querySelectorAll('.btn-modo').forEach(btn => btn.classList.remove('activo'));
            document.getElementById(`btn-${nuevoModo}`).classList.add('activo');

            const ind = document.getElementById('ind-modo');
            const tit = document.getElementById('tit-modo');
            const desc = document.getElementById('desc-modo');

            switch (nuevoModo) {
                case 'mover':
                    ind.style.backgroundColor = '#3b82f6';
                    tit.innerText = 'Modo: Mover / Navegar';
                    desc.innerText = 'Arrastra nodos para moverlos o doble click para editarlos.';
                    break;
                case 'agregar':
                    ind.style.backgroundColor = '#10b981';
                    tit.innerText = 'Modo: Agregar Nodo';
                    desc.innerText = 'Haz click en un espacio vacío para crear un nodo.';
                    break;
                case 'conectar':
                    ind.style.backgroundColor = '#f59e0b';
                    tit.innerText = 'Modo: Relacionar / Conectar';
                    desc.innerText = 'Haz click en el nodo Origen y luego en el Destino.';
                    break;
                case 'eliminar':
                    ind.style.backgroundColor = '#f43f5e';
                    tit.innerText = 'Modo: Eliminar Elemento';
                    desc.innerText = 'Haz click en cualquier nodo o arista para eliminarlo.';
                    break;
            }
        }

        function configurarEventosRed() {
            red.on("click", function (params) {
                const idNodo = params.nodes[0];
                const idArista = params.edges[0];

                if (modoActual === 'agregar') {
                    if (!idNodo && !idArista) {
                        const posCanvas = params.pointer.canvas;
                        crearNodoEnPosicion(posCanvas.x, posCanvas.y);
                    }
                } 
                else if (modoActual === 'conectar') {
                    if (idNodo !== undefined) {
                        procesarConexion(idNodo);
                    }
                } 
                else if (modoActual === 'eliminar') {
                    if (idNodo !== undefined) {
                        // 1. Buscamos todas las aristas conectadas a este nodo
                        const aristasConectadas = red.getConnectedEdges(idNodo);
                        
                        // 2. Eliminamos esas aristas del DataSet explícitamente
                        aristas.remove(aristasConectadas);
                        
                        // 3. Finalmente eliminamos el nodo
                        nodos.remove(idNodo);
                        
                        mostrarToast("Nodo y conexiones eliminados", "info");
                    } else if (idArista !== undefined) {
                        aristas.remove(idArista);
                        mostrarToast("Relación eliminada correctamente", "info");
                    }
}
            });

            red.on("doubleClick", function (params) {
                if (modoActual !== 'mover') return;

                if (params.nodes.length > 0) {
                    abrirModalNodo(params.nodes[0]);
                } else if (params.edges.length > 0) {
                    abrirModalArista(params.edges[0]);
                }
            });
        }

        function crearNodoEnPosicion(x, y) {
            const nombre = obtenerNombreNodo(idSiguiente);
            nodos.add({
                id: idSiguiente,
                label: nombre,
                x: x,
                y: y
            });
            mostrarToast(`Nodo "${nombre}" creado`, "exito");
            idSiguiente++;
            
        }

        function obtenerNombreNodo(num) {
            const idx = (num - 1) % 26;
            const letra = String.fromCharCode(65 + idx);
            const ciclo = Math.floor((num - 1) / 26);
            return ciclo > 0 ? `${letra}${ciclo}` : letra;
        }

        // Búsqueda flexible de nodo por ID (String o Num)
        function obtenerNodo(id) {
            if (id === null || id === undefined) return null;
            return nodos.get(id) || nodos.get(parseInt(id, 10)) || nodos.get(String(id)) || null;
        }

        function procesarConexion(idNodo) {
            if (nodoOrigenSel === null) {
                nodoOrigenSel = idNodo;
                marcarNodoOrigen(idNodo);
                const nodo = obtenerNodo(idNodo);
                mostrarToast(`Origen: "${nodo ? nodo.label : idNodo}". Selecciona el nodo destino.`, "alerta");
            } else {
                const idDestino = idNodo;

                if (nodoOrigenSel === idDestino) {
                    mostrarToast("No se puede conectar un nodo consigo mismo.", "error");
                    desmarcarNodoSeleccionado(nodoOrigenSel);
                    nodoOrigenSel = null;
                    return;
                }

                const valPeso = document.getElementById('peso-defecto').value;
                const peso = parseInt(valPeso, 10) || 1;
                const esDirigido = document.getElementById('es-dirigido').checked;

                aristas.add({
                    from: nodoOrigenSel,
                    to: idDestino,
                    label: String(peso),
                    arrows: esDirigido ? { to: { enabled: true, scaleFactor: 0.8 } } : { to: { enabled: false } }
                });

                const nodoOri = obtenerNodo(nodoOrigenSel);
                const nodoDes = obtenerNodo(idDestino);
                mostrarToast(`Relación creada: ${nodoOri ? nodoOri.label : nodoOrigenSel} ➔ ${nodoDes ? nodoDes.label : idDestino}`, "exito");

                desmarcarNodoSeleccionado(nodoOrigenSel);
                nodoOrigenSel = null;
            }
        }

        function marcarNodoOrigen(id) {
    // Naranja suave/Advertencia
    nodos.update({ id: id, color: { background: '#f4ca88', border: '#eeb260' } });
}

        function desmarcarNodoSeleccionado(id) {
            if (obtenerNodo(id)) {
                nodos.update({ id: id, color: colorNodoDef });
            }
        }

        function verificarCiclos() {
            restaurarColores();

            const todosNodos = nodos.get();
            const todasAristas = aristas.get();

            if (todosNodos.length === 0) {
                mostrarToast("El grafo está vacío.", "info");
                return;
            }

            // Construir lista de adyacencia
            const adj = {};
            todosNodos.forEach(n => adj[String(n.id)] = []);

            todasAristas.forEach(a => {
                const u = String(a.from);
                const v = String(a.to);
                const esDirigida = a.arrows && a.arrows.to && a.arrows.to.enabled;

                if (!adj[u]) adj[u] = [];
                if (!adj[v]) adj[v] = [];

                adj[u].push({ destino: v, idArista: a.id, dirigida: esDirigida });
                if (!esDirigida) {
                    adj[v].push({ destino: u, idArista: a.id, dirigida: false });
                }
            });

            const visitado = {};
            const enRec = {};
            const padre = {};
            let cicloDetectado = null;

            // Búsqueda en profundidad (DFS)
            function dfs(u, aristaPadreId) {
                visitado[u] = true;
                enRec[u] = true;

                if (adj[u]) {
                    for (let i = 0; i < adj[u].length; i++) {
                        const vec = adj[u][i];
                        const v = String(vec.destino);
                        const aristaId = vec.idArista;

                        if (!vec.dirigida && aristaId === aristaPadreId) continue;

                        if (!visitado[v]) {
                            padre[v] = { nodo: u, arista: aristaId };
                            if (dfs(v, aristaId)) return true;
                        } else if (enRec[v] || !vec.dirigida) {
                            let caminoNodos = [v, u];
                            let caminoAristas = [aristaId];

                            let curr = u;
                            while (curr !== v && padre[curr]) {
                                caminoAristas.push(padre[curr].arista);
                                curr = padre[curr].nodo;
                                caminoNodos.push(curr);
                            }

                            cicloDetectado = {
                                nodos: caminoNodos,
                                aristas: caminoAristas
                            };
                            return true;
                        }
                    }
                }

                enRec[u] = false;
                return false;
            }

            for (let i = 0; i < todosNodos.length; i++) {
                const idNodo = String(todosNodos[i].id);
                if (!visitado[idNodo]) {
                    if (dfs(idNodo, null)) break;
                }
            }

            const elemRes = document.getElementById('resultado-ciclo');
            const elemTit = document.getElementById('ciclo-titulo');
            const elemDet = document.getElementById('ciclo-detalle');

            elemRes.classList.remove('oculto');

            if (cicloDetectado) {
                resaltarCiclo(cicloDetectado.nodos, cicloDetectado.aristas);

                elemRes.className = "caja-resultado res-error";
                elemTit.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color: #fb7185;"></i><span>¡Ciclo Detectado!</span>`;
                
                const nombresNodos = cicloDetectado.nodos.reverse().map(id => obtenerNodo(id)?.label || id).join(' ➔ ');
                elemDet.innerText = `El grafo contiene al menos un ciclo: ${nombresNodos}`;
                
                mostrarToast("¡Atención! Se han detectado ciclos en el grafo.", "error");
            } else {
                elemRes.className = "caja-resultado res-exito";
                elemTit.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #34d399;"></i><span>Sin Ciclos</span>`;
                elemDet.innerText = "El grafo es Acíclico (DAG / Árbol validado).";
                
                mostrarToast("Grafo verificado: No se encontraron ciclos.", "exito");
            }
        }

        function resaltarCiclo(nodosCiclo, aristasCiclo) {
    const setNodos = new Set(nodosCiclo.map(id => String(id)));
    const setAristas = new Set(aristasCiclo);

    const nodosNuevos = nodos.map(n => ({
        id: n.id,
        // Rojo suave (peligro)
        color: setNodos.has(String(n.id)) ? { background: '#f09a9a', border: '#e27b7b' } : colorNodoDef,
        opacity: setNodos.has(String(n.id)) ? 1.0 : 0.3
    }));
    nodos.update(nodosNuevos);

    const aristasNuevas = aristas.map(a => ({
        id: a.id,
        color: setAristas.has(a.id) ? { color: '#e27b7b', highlight: '#d16a6a' } : colorAristaDef,
        width: setAristas.has(a.id) ? 4 : 1,
        opacity: setAristas.has(a.id) ? 1.0 : 0.2
    }));
    aristas.update(aristasNuevas);
}

        function ejecutarDijkstra() {
            restaurarColores();

            const idInicioRaw = document.getElementById('sel-origen').value;
            const idFinRaw = document.getElementById('sel-destino').value;

            if (!idInicioRaw || !idFinRaw) {
                mostrarToast("Selecciona un nodo de Origen y un Destino.", "error");
                return;
            }

            if (idInicioRaw === idFinRaw) {
                mostrarToast("El origen y el destino deben ser diferentes.", "alerta");
                return;
            }

            const todosNodos = nodos.get();
            const todasAristas = aristas.get();

            const distancias = {};
            const previo = {};
            const noVisitados = new Set();

            todosNodos.forEach(n => {
                const sId = String(n.id);
                distancias[sId] = Infinity;
                previo[sId] = null;
                noVisitados.add(sId);
            });

            const startKey = String(idInicioRaw);
            const endKey = String(idFinRaw);

            distancias[startKey] = 0;

            while (noVisitados.size > 0) {
                let actualId = null;
                let minDist = Infinity;

                noVisitados.forEach(id => {
                    if (distancias[id] < minDist) {
                        minDist = distancias[id];
                        actualId = id;
                    }
                });

                if (actualId === null || distancias[actualId] === Infinity) break;
                if (actualId === endKey) break;

                noVisitados.delete(actualId);

                todasAristas.forEach(a => {
                    const u = String(a.from);
                    const v = String(a.to);
                    const peso = parseFloat(a.label) || 1;
                    const esDirigida = a.arrows && a.arrows.to && a.arrows.to.enabled;

                    if (u === actualId && noVisitados.has(v)) {
                        const alt = distancias[actualId] + peso;
                        if (alt < distancias[v]) {
                            distancias[v] = alt;
                            previo[v] = actualId;
                        }
                    }
                    if (!esDirigida && v === actualId && noVisitados.has(u)) {
                        const alt = distancias[actualId] + peso;
                        if (alt < distancias[u]) {
                            distancias[u] = alt;
                            previo[u] = actualId;
                        }
                    }
                });
            }

            const camino = [];
            let curr = endKey;

            if (distancias[endKey] !== Infinity) {
                while (curr !== null && curr !== undefined) {
                    camino.unshift(curr);
                    curr = previo[curr];
                }
            }

            if (camino.length <= 1 || camino[0] !== startKey) {
                mostrarToast("No existe un camino posible entre ambos nodos.", "error");
                document.getElementById('resultado-dijkstra').classList.add('oculto');
                return;
            }

            document.getElementById('distancia-total').innerText = distancias[endKey];
            const nombres = camino.map(id => obtenerNodo(id)?.label || id).join(' ➔ ');
            document.getElementById('texto-camino').innerText = `Ruta: ${nombres}`;
            document.getElementById('resultado-dijkstra').classList.remove('oculto');

            resaltarCaminoDijkstra(camino);
            mostrarToast(`Ruta mínima calculada. Distancia: ${distancias[endKey]}`, "exito");
        }

        function resaltarCaminoDijkstra(caminoIds) {
            const setCamino = new Set(caminoIds.map(id => String(id)));

            const nodosActualizados = nodos.map(n => {
                const enCamino = setCamino.has(String(n.id));
                return {
                    id: n.id,
                    // Turquesa del index
                    color: enCamino ? { background: '#66ccbb', border: '#5abeb4' } : colorNodoDef,
                    
                };
            });
            nodos.update(nodosActualizados);

            // ... la lógica de aristas permanece igual, solo cambiamos el color al devolverlo:
            const parAristas = new Set();
            for (let i = 0; i < caminoIds.length - 1; i++) {
                parAristas.add(`${caminoIds[i]}->${caminoIds[i+1]}`);
                parAristas.add(`${caminoIds[i+1]}->${caminoIds[i]}`);
            }

            const aristasActualizadas = aristas.map(a => {
                const u = String(a.from);
                const v = String(a.to);
                const esDirigida = a.arrows && a.arrows.to && a.arrows.to.enabled;
                let enCamino = esDirigida ? parAristas.has(`${u}->${v}`) : (parAristas.has(`${u}->${v}`) || parAristas.has(`${v}->${u}`));

                return {
                    id: a.id,
                    // Turquesa del index
                    color: enCamino ? { color: '#66ccbb', highlight: '#50b4a0' } : colorAristaDef,
                    width: enCamino ? 5 : 2,
                    
                };
            });
            aristas.update(aristasActualizadas);
        }

        function restaurarColores() {
            const nodosLimpios = nodos.map(n => ({ id: n.id, color: colorNodoDef, opacity: 1.0 }));
            nodos.update(nodosLimpios);

            const aristasLimpias = aristas.map(a => ({ id: a.id, color: colorAristaDef, width: 2, opacity: 1.0 }));
            aristas.update(aristasLimpias);

            document.getElementById('resultado-dijkstra').classList.add('oculto');
            document.getElementById('resultado-ciclo').classList.add('oculto');
        }

        function abrirModalArista(id) {
            const a = aristas.get(id);
            if (!a) return;

            document.getElementById('edit-arista-id').value = id;
            document.getElementById('edit-arista-peso').value = a.label || 1;
            document.getElementById('edit-arista-dirigida').checked = a.arrows && a.arrows.to && a.arrows.to.enabled;

            mostrarModal('modal-arista');
        }

        function guardarArista() {
            const id = document.getElementById('edit-arista-id').value;
            const peso = document.getElementById('edit-arista-peso').value || 1;
            const dirigida = document.getElementById('edit-arista-dirigida').checked;

            aristas.update({
                id: id,
                label: String(peso),
                arrows: dirigida ? { to: { enabled: true, scaleFactor: 0.8 } } : { to: { enabled: false } }
            });

            ocultarModal('modal-arista');
            mostrarToast("Conexión modificada correctamente", "exito");
        }

        function abrirModalNodo(id) {
            const n = obtenerNodo(id);
            if (!n) return;

            document.getElementById('edit-nodo-id').value = id;
            document.getElementById('edit-nodo-nombre').value = n.label;

            mostrarModal('modal-nodo');
        }

        function comprobarNombreExistente(nombre){
            const todoLosNodos = nodos.get();
            for (let i = 0; i < todoLosNodos.length; i++){
                let nodoActual = todoLosNodos[i];
                if (nodoActual.label === nombre)
                    return true;
            }
            return false;
        }

        function guardarNodo() {
            const id = document.getElementById('edit-nodo-id').value;
            const nombre = document.getElementById('edit-nodo-nombre').value.trim();
            if (!comprobarNombreExistente(nombre)){
                if (nombre) {
                    nodos.update({ id: id, label: nombre });
                    mostrarToast("Nodo renombrado", "exito");
                }
            }
            else {
                    mostrarToast("Nombre Existente", "error");
            }
            ocultarModal('modal-nodo');
        }

        function mostrarModal(id) {
            document.getElementById(id).classList.add('activo');
        }

        function ocultarModal(id) {
            document.getElementById(id).classList.remove('activo');
        }

    function generarGrafoEjemplo(cantidad = null) {
    nodos.clear();
    aristas.clear();
    idSiguiente = 1;

    // Usa la cantidad de la URL o una random entre 7 y 16
    let nTam = cantidad ? parseInt(cantidad) : Math.floor(Math.random() * (16 - 7 + 1)) + 7;
    NodosTam = nTam;

    const nuevosNodos = [];
    const nuevasAristas = [];
    const rangoEspacio = 400; 
    const distanciaMinima = 120; // Espacio vital entre nodos

    // 1. Nodos aleatorios con separación
    for (let i = 1; i <= nTam; i++) {
        let x, y;
        let posicionValida = false;
        let intentos = 0; 

        while (!posicionValida && intentos < 100) {
            x = (Math.random() - 0.5) * rangoEspacio * 2;
            y = (Math.random() - 0.5) * rangoEspacio * 2;
            posicionValida = true;

            for (let j = 0; j < nuevosNodos.length; j++) {
                let dx = x - nuevosNodos[j].x;
                let dy = y - nuevosNodos[j].y;
                let distancia = Math.sqrt(dx * dx + dy * dy);

                if (distancia < distanciaMinima) {
                    posicionValida = false;
                    break; 
                }
            }
            intentos++;
        }

        nuevosNodos.push({
            id: i,
            label: obtenerNombreNodo(i),
            x: x, 
            y: y 
        });
    }

    // 2. Aristas aleatorias NO dirigidas y SIN ciclos
    for (let i = 2; i <= nTam; i++) {
        const origen = Math.floor(Math.random() * (i - 1)) + 1; 
        const destino = i; 
        const pesoAleatorio = Math.floor(Math.random() * 9) + 1; 
        
        nuevasAristas.push({
            from: origen,
            to: destino,
            label: String(pesoAleatorio),
            arrows: { to: { enabled: false } } // <-- Aquí se quitan las flechas
        });
    }

    nodos.add(nuevosNodos);
    aristas.add(nuevasAristas);
    idSiguiente = nTam + 1;

    setTimeout(() => { red.fit(); }, 200);
    mostrarToast(`Grafo no dirigido generado con ${nTam} nodos`, "info");
}
        function limpiarLienzo() {
            nodos.clear();
            aristas.clear();
            idSiguiente = 1;
            nodoOrigenSel = null;
            document.getElementById('resultado-dijkstra').classList.add('oculto');
            document.getElementById('resultado-ciclo').classList.add('oculto');
            mostrarToast("Lienzo vaciado por completo", "info");
        }

        function actualizarStats() {
            document.getElementById('cant-nodos').innerText = nodos.length;
            document.getElementById('cant-aristas').innerText = aristas.length;
        }

        function actualizarDesplegables() {
            const selOri = document.getElementById('sel-origen');
            const selDes = document.getElementById('sel-destino');

            const valOri = selOri.value;
            const valDes = selDes.value;

            selOri.innerHTML = '<option value="">Seleccionar...</option>';
            selDes.innerHTML = '<option value="">Seleccionar...</option>';

            nodos.forEach(n => {
                selOri.innerHTML += `<option value="${n.id}">${n.label}</option>`;
                selDes.innerHTML += `<option value="${n.id}">${n.label}</option>`;
            });

            selOri.value = valOri;
            selDes.value = valDes;
        }

        let tToast;
        function mostrarToast(mensaje, tipo = "info") {
            const toast = document.getElementById('toast');
            const msg = document.getElementById('toast-msg');
            const icono = document.getElementById('toast-icono');

            msg.innerText = mensaje;

            if (tipo === 'exito') {
                icono.className = 'fa-solid fa-circle-check';
                icono.style.color = '#34d399';
            } else if (tipo === 'alerta') {
                icono.className = 'fa-solid fa-triangle-exclamation';
                icono.style.color = '#fbbf24';
            } else if (tipo === 'error') {
                icono.className = 'fa-solid fa-circle-xmark';
                icono.style.color = '#fb7185';
            } else {
                icono.className = 'fa-solid fa-circle-info';
                icono.style.color = '#60a5fa';
            }

            toast.classList.add('visible');

            clearTimeout(tToast);
            tToast = setTimeout(() => {
                toast.classList.remove('visible');
            }, 3000);
        }

        // Inicialización al cargar la página
        window.addEventListener('DOMContentLoaded', () => {
            inicializarRed();
        });