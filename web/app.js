// app.js
const svg = d3.select("#chart");
const width = +svg.attr("width");
const height = +svg.attr("height");
const margin = { top: 40, right: 20, bottom: 80, left: 60 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const x0 = d3.scaleBand().paddingInner(0.2);   // categorias
const x1 = d3.scaleBand().padding(0.1);        // resilente / no
const y  = d3.scaleLinear().range([innerHeight, 0]);
const color = d3.scaleOrdinal()
  .domain(["Resilente", "No resilente"])
  .range(["#1f77b4", "#ff7f0e"]);

const xAxisG = g.append("g")
  .attr("transform", `translate(0,${innerHeight})`);
const yAxisG = g.append("g");

g.append("text")
  .attr("class", "y-label")
  .attr("x", -innerHeight / 2)
  .attr("y", -margin.left + 15)
  .attr("transform", "rotate(-90)")
  .attr("text-anchor", "middle")
  .text("% dentro de cada grupo de resilencia");

// leyenda
const legend = g.append("g")
  .attr("class", "legend")
  .attr("transform", `translate(${innerWidth - 220}, -20)`);

["Resilente", "No resilente"].forEach((lab, i) => {
  const row = legend.append("g")
    .attr("transform", `translate(${i * 110}, 0)`);

  const labelText = (lab === "No resilente") ? "No resiliente" : lab;

  row.append("rect")
    .attr("width", 14)
    .attr("height", 14)
    .attr("fill", color(lab));
  row.append("text")
    .attr("x", 20)
    .attr("y", 11)
    .text(labelText);
});

// tooltip sencillo
const tooltip = d3.select("body").append("div")
  .style("position", "absolute")
  .style("pointer-events", "none")
  .style("background", "white")
  .style("border", "1px solid #ccc")
  .style("padding", "4px 8px")
  .style("font-size", "12px")
  .style("display", "none");

let data;

// Carga de datos
Promise.all([
  d3.csv("perfil_long.csv"),
  d3.csv("aula_likert.csv"),
  d3.csv("res_region_gasto.csv"),
  d3.json("ccaa.json"),
  d3.csv("apoyo_box.csv")      // 👈 nuevo
]).then(([perfilData, likertData, regionData, spainGeo, apoyoData]) => {
  perfilData.forEach(d => {
    d.prop = +d.prop;
    d.n = +d.n;
  });

  likertData.forEach(d => {
    d.n    = +d.n;
    d.prop = +d.prop;
  });

  regionData.forEach(d => {
    d.n_desfav   = +d.n_desfav;
    d.n_resil    = +d.n_resil;
    d.pct_res    = +d.pct_res;
    d.mean_score = +d.mean_score;
    d.gasto_pc   = +d.gasto_pc;
  });

  apoyoData.forEach(d => {
    d.n      = +d.n;
    d.min    = +d.min;
    d.q1     = +d.q1;
    d.median = +d.median;
    d.q3     = +d.q3;
    d.max    = +d.max;
  });

  data = perfilData;
  window.perfilData = perfilData;
  window.likertData = likertData;
  window.regionData = regionData;
  window.spainGeo   = spainGeo;
  window.apoyoData  = apoyoData;

  updateChart("sexo");
  initLikertChart();
  initApoyoChart();        
  initCCAAmapAndScatter();
});


function initApoyoChart() {
  const datos = window.apoyoData;

  const svgA = d3.select("#apoyo-chart");
  const widthA = +svgA.attr("width");
  const heightA = +svgA.attr("height");
  const marginA = { top: 40, right: 20, bottom: 40, left: 60 };
  const innerWidthA = widthA - marginA.left - marginA.right;
  const innerHeightA = heightA - marginA.top - marginA.bottom;

  const gA = svgA.append("g")
    .attr("transform", `translate(${marginA.left},${marginA.top})`);

  const grupos = ["Resilente", "No resilente"];

  const xA = d3.scaleBand()
    .domain(grupos)
    .range([0, innerWidthA])
    .padding(0.4);

  const yA = d3.scaleLinear()
    .range([innerHeightA, 0]);

  const xAxisA = d3.axisBottom(xA);
  const yAxisA = d3.axisLeft(yA);

  const xAxisGA = gA.append("g")
    .attr("transform", `translate(0,${innerHeightA})`)
    .call(xAxisA);

  const yAxisGA = gA.append("g");

  gA.append("text")
    .attr("class", "y-label")
    .attr("x", -innerHeightA / 2)
    .attr("y", -marginA.left + 15)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Valor del índice");

  const title = gA.append("text")
    .attr("x", innerWidthA / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .attr("font-size", 14)
    .attr("font-weight", "bold");

  const tooltipA = d3.select("body").append("div")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "4px 8px")
    .style("font-size", "12px")
    .style("display", "none");

  function updateApoyo(indice) {
    const dataIndice = datos.filter(d => d.indice === indice);

    if (dataIndice.length === 0) return;

    const label = dataIndice[0].indice_label || indice;

    // dominio y
    const minVal = d3.min(dataIndice, d => d.min);
    const maxVal = d3.max(dataIndice, d => d.max);
    yA.domain([minVal, maxVal]).nice();
    yAxisGA.transition().duration(500).call(yAxisA);

    title.text(label);

    const boxWidth = xA.bandwidth();

    const groups = gA.selectAll(".box-group")
      .data(dataIndice, d => d.resilente_fac);

    const groupsEnter = groups.enter()
      .append("g")
        .attr("class", "box-group")
        .attr("transform", d => `translate(${xA(d.resilente_fac)}, 0)`);

    groupsEnter.merge(groups)
      .transition().duration(500)
      .attr("transform", d => `translate(${xA(d.resilente_fac)}, 0)`);

    groups.exit().remove();

    // rectángulo Q1–Q3
    const rects = groupsEnter.merge(groups)
      .selectAll("rect.box")
      .data(d => [d]);

    rects.enter()
      .append("rect")
        .attr("class", "box")
        .attr("x", boxWidth * 0.15)
        .attr("width", boxWidth * 0.7)
        .attr("y", d => yA(d.q3))
        .attr("height", d => yA(d.q1) - yA(d.q3))
        .attr("fill", "#d0e2ff")
        .attr("stroke", "#1f77b4")
  .on("mousemove", (event, d) => {
    tooltipA
      .style("display", "block")
      .html(`
        <strong>${d.indice_label || d.indice}</strong><br/>
        ${d.resilente_fac}<br/>
        n = ${d.n}<br/>
        min = ${d.min.toFixed(2)}<br/>
        Q1 = ${d.q1.toFixed(2)}<br/>
        mediana = ${d.median.toFixed(2)}<br/>
        Q3 = ${d.q3.toFixed(2)}<br/>
        max = ${d.max.toFixed(2)}
      `)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 20) + "px");
  })
      .on("mouseout", () => tooltipA.style("display", "none"))
      .merge(rects)
      .transition().duration(500)
        .attr("y", d => yA(d.q3))
        .attr("height", d => yA(d.q1) - yA(d.q3));

    rects.exit().remove();

    // línea de mediana
    const medLines = groupsEnter.merge(groups)
      .selectAll("line.median")
      .data(d => [d]);

    medLines.enter()
      .append("line")
        .attr("class", "median")
        .attr("x1", boxWidth * 0.15)
        .attr("x2", boxWidth * 0.85)
        .attr("y1", d => yA(d.median))
        .attr("y2", d => yA(d.median))
        .attr("stroke", "#1f77b4")
        .attr("stroke-width", 2)
      .merge(medLines)
      .transition().duration(500)
        .attr("y1", d => yA(d.median))
        .attr("y2", d => yA(d.median));

    medLines.exit().remove();

    // bigotes min–max
    const whiskers = groupsEnter.merge(groups)
      .selectAll("line.whisker")
      .data(d => [d]);

    whiskers.enter()
      .append("line")
        .attr("class", "whisker")
        .attr("x1", boxWidth * 0.5)
        .attr("x2", boxWidth * 0.5)
        .attr("y1", d => yA(d.min))
        .attr("y2", d => yA(d.max))
        .attr("stroke", "#1f77b4")
        .attr("stroke-width", 1)
      .merge(whiskers)
      .transition().duration(500)
        .attr("y1", d => yA(d.min))
        .attr("y2", d => yA(d.max));

    whiskers.exit().remove();
  }

  // primera llamada por defecto: BELONG
  updateApoyo("BELONG");

  // conectar con el <select>
  d3.select("#apoyo-select").on("change", function() {
    const indice = this.value;
    updateApoyo(indice);
  });
}




// función principal de actualización
function updateChart(factor) {
  const factorData = data.filter(d => d.factor === factor);
  const categorias = Array.from(new Set(factorData.map(d => d.categoria)));
  const grupos = ["Resilente", "No resilente"];

  x0.domain(categorias).range([0, innerWidth]);
  x1.domain(grupos).range([0, x0.bandwidth()]);
  y.domain([0, d3.max(factorData, d => d.prop)]).nice();

  const xAxis = d3.axisBottom(x0);
  const yAxis = d3.axisLeft(y).tickFormat(d3.format(".0%"));

  xAxisG.transition().duration(600).call(xAxis)
    .selectAll("text")
    .attr("transform", "rotate(-30)")
    .style("text-anchor", "end");

  yAxisG.transition().duration(600).call(yAxis);

  // join
  const catGroups = g.selectAll(".cat-group")
    .data(categorias, d => d);

  const catGroupsEnter = catGroups.enter()
    .append("g")
    .attr("class", "cat-group")
    .attr("transform", d => `translate(${x0(d)},0)`);

  catGroupsEnter.merge(catGroups)
    .transition().duration(600)
    .attr("transform", d => `translate(${x0(d)},0)`);

  catGroups.exit().remove();

  // barras dentro de cada categoria
  grupos.forEach(grupo => {
    const bars = catGroupsEnter.merge(catGroups)
      .selectAll(`rect.bar-${grupo.replace(" ", "")}`)
      .data(cat => factorData.filter(d => d.categoria === cat && d.resilente_fac === grupo),
            d => grupo);

    bars.enter()
      .append("rect")
        .attr("class", `bar bar-${grupo.replace(" ", "")}`)
        .attr("x", d => x1(d.resilente_fac))
        .attr("width", x1.bandwidth())
        .attr("y", innerHeight)
        .attr("height", 0)
        .attr("fill", d => color(d.resilente_fac))
      .on("mousemove", (event, d) => {
        tooltip
          .style("display", "block")
          .html(`
            <strong>${d.categoria}</strong><br/>
            ${d.resilente_fac}<br/>
            n = ${d.n}<br/>
            ${d3.format(".1%")(d.prop)} del grupo
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", () => tooltip.style("display", "none"))
      .merge(bars)
      .transition().duration(600)
        .attr("x", d => x1(d.resilente_fac))
        .attr("width", x1.bandwidth())
        .attr("y", d => y(d.prop))
        .attr("height", d => innerHeight - y(d.prop))
        .attr("fill", d => color(d.resilente_fac));

    bars.exit().remove();
  });

  // actualizar estado de botones
  d3.selectAll(".buttons button")
    .classed("active", function() {
      return d3.select(this).attr("data-factor") === factor;
    });
}

function initLikertChart() {
  const svgL = d3.select("#likert-chart");
  const widthL = +svgL.attr("width");
  const heightL = +svgL.attr("height");
  const marginL = { top: 30, right: 20, bottom: 40, left: 120 };
  const innerWidthL = widthL - marginL.left - marginL.right;
  const innerHeightL = heightL - marginL.top - marginL.bottom;

  const gL = svgL.append("g")
    .attr("transform", `translate(${marginL.left},${marginL.top})`);

  // orden de respuestas (de mejor a peor)
  const respuestas = [
    "Nunca o casi nunca",
    "Algunas clases",
    "La mayoría de las clases",
    "Cada clase"
  ];

  const yL = d3.scaleBand()
    .domain(["Resilente", "No resilente"])
    .range([0, innerHeightL])
    .padding(0.3);

  const xL = d3.scaleLinear()
    .range([0, innerWidthL]);

  const colorLikert = d3.scaleOrdinal()
    .domain(respuestas)
    .range(["#2166ac", "#67a9cf", "#d1e5f0", "#fddbc7"]);

  const xAxisL = d3.axisBottom(xL).tickFormat(d3.format(".0%"));
  const yAxisL = d3.axisLeft(yL);

  const xAxisGL = gL.append("g")
    .attr("transform", `translate(0,${innerHeightL})`);

  const yAxisGL = gL.append("g")
    .call(yAxisL);

  // leyenda
  const legendL = gL.append("g")
    .attr("transform", `translate(0,-20)`);

  respuestas.forEach((resp, i) => {
    const row = legendL.append("g")
      .attr("transform", `translate(${i * 150},0)`);
    row.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", colorLikert(resp));
    row.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .attr("font-size", 12)
      .text(resp);
  });

  const tooltipL = d3.select("body").append("div")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "4px 8px")
    .style("font-size", "12px")
    .style("display", "none");

  function updateLikert(itemCode) {
    const dataItem = window.likertData.filter(d => d.item === itemCode);

    // construir segmentos acumulados por grupo
    const datosOrdenados = [];
    ["Resilente", "No resilente"].forEach(grupo => {
      let acum = 0;
      respuestas.forEach(resp => {
        const row = dataItem.find(d =>
          d.resilente_fac === grupo && d.respuesta === resp
        );
        if (row) {
          datosOrdenados.push({
            grupo,
            respuesta: resp,
            prop: row.prop,
            n: row.n,
            item_label: row.item_label,
            x0: acum,
            x1: acum + row.prop
          });
          acum += row.prop;
        }
      });
    });

    xL.domain([0, 1]);
    xAxisGL.transition().duration(500).call(xAxisL);

    const grupos = gL.selectAll(".likert-group")
      .data(["Resilente", "No resilente"]);

    grupos.enter()
      .append("g")
        .attr("class", "likert-group")
        .attr("transform", d => `translate(0,${yL(d)})`)
      .merge(grupos)
        .transition().duration(500)
        .attr("transform", d => `translate(0,${yL(d)})`);

    grupos.exit().remove();

    const segments = gL.selectAll(".likert-group")
      .selectAll("rect.segment")
      .data(d => datosOrdenados.filter(row => row.grupo === d));

    segments.enter()
      .append("rect")
        .attr("class", "segment")
        .attr("y", 0)
        .attr("height", yL.bandwidth())
        .attr("x", d => xL(d.x0))
        .attr("width", d => xL(d.x1) - xL(d.x0))
        .attr("fill", d => colorLikert(d.respuesta))
      .on("mousemove", (event, d) => {
        tooltipL
          .style("display", "block")
          .html(`
            <strong>${d.item_label}</strong><br/>
            ${d.grupo}<br/>
            ${d.respuesta}: ${d3.format(".1%")(d.prop)}<br/>
            n = ${d.n}
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", () => tooltipL.style("display", "none"))
      .merge(segments)
      .transition().duration(500)
        .attr("x", d => xL(d.x0))
        .attr("width", d => xL(d.x1) - xL(d.x0));

    segments.exit().remove();
  }

  // primera pregunta por defecto
  updateLikert("ST273Q01JA");

  // conectar con el <select>
  d3.select("#item-select").on("change", function() {
    const itemCode = this.value;
    updateLikert(itemCode);
  });
}

function initCCAAmapAndScatter() {
  const regionData = window.regionData.filter(d => !isNaN(d.pct_res) && !isNaN(d.gasto_pc));
  const topo       = window.spainGeo;   // Topology

  // TopoJSON -> GeoJSON (la capa se llama 'autonomous_regions')
  const geo       = topojson.feature(topo, topo.objects.autonomous_regions);
  const features  = geo.features;

  // diccionario ccaa -> datos PISA/gasto
  const dataByCCAA = new Map();
  regionData.forEach(d => {
    dataByCCAA.set(d.ccaa, d);
  });

  // mapeo de nombres del GeoJSON a nombres de tu CSV
  const nameMap = {
    "Principado de Asturias": "Asturias",
    "Illes Balears": "Islas Baleares",
    "Comunitat Valenciana": "Comunidad Valenciana",
    "Cataluña/Catalunya": "Cataluña",
    "Comunidad Foral de Navarra": "Navarra",
    "País Vasco/Euskadi": "País Vasco"
    // el resto ("Andalucía", "Aragón", "Galicia", etc.) coinciden
  };

  // --- MAPA ---
  const svgM = d3.select("#ccaa-map");
  const widthM = +svgM.attr("width");
  const heightM = +svgM.attr("height");

  const gM = svgM.append("g");

  const projection = d3.geoMercator()
    .fitSize([widthM, heightM], geo);   // ⬅️ usar geo, no topo

  const path = d3.geoPath().projection(projection);

  const valuesPct = regionData.map(d => d.pct_res);
  const color = d3.scaleSequential()
    .domain([d3.min(valuesPct), d3.max(valuesPct)])
    .interpolator(d3.interpolateBlues);

  const tooltipM = d3.select("body").append("div")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "4px 8px")
    .style("font-size", "12px")
    .style("display", "none");

  gM.selectAll("path.ccaa")
    .data(features)   // ⬅️ ahora sí, features es un array
    .enter()
    .append("path")
      .attr("class", "ccaa")
      .attr("d", path)
      .attr("stroke", "#999")
      .attr("stroke-width", 0.5)
      .attr("fill", d => {
        const rawName = d.properties.name;
        const nombre  = nameMap[rawName] || rawName;
        const row     = dataByCCAA.get(nombre);
        return row ? color(row.pct_res) : "#eee";
      })
    .on("mousemove", (event, d) => {
      const rawName = d.properties.name;
      const nombre  = nameMap[rawName] || rawName;
      const row     = dataByCCAA.get(nombre);
      if (!row) return;
      tooltipM
        .style("display", "block")
        .html(`
          <strong>${nombre}</strong><br/>
          % resilentes (desfav.): ${row.pct_res.toFixed(1)}%<br/>
          n desfav.: ${row.n_desfav}<br/>
          Gasto pc: ${row.gasto_pc.toFixed(0)} €
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", () => tooltipM.style("display", "none"));

  // pequeña leyenda de color (opcional)
  const legendWidth = 200;
  const legendHeight = 10;
  const legendSvg = svgM.append("g")
    .attr("transform", `translate(20, ${heightM - 40})`);

  const legendScale = d3.scaleLinear()
    .domain(color.domain())
    .range([0, legendWidth]);

  const legendAxis = d3.axisBottom(legendScale)
    .ticks(4)
    .tickFormat(d => d.toFixed(0) + "%");

  // gradiente
  const defs = svgM.append("defs");
  const gradient = defs.append("linearGradient")
    .attr("id", "legend-gradient");

  gradient.selectAll("stop")
    .data(d3.ticks(0, 1, 10))
    .enter()
    .append("stop")
      .attr("offset", d => `${d * 100}%`)
      .attr("stop-color", d => color(
        color.domain()[0] + d * (color.domain()[1] - color.domain()[0])
      ));

  legendSvg.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", "url(#legend-gradient)");

  legendSvg.append("g")
    .attr("transform", `translate(0, ${legendHeight})`)
    .call(legendAxis);

  legendSvg.append("text")
    .attr("x", 0)
    .attr("y", -5)
    .attr("font-size", 12)
    .text("% resilentes (desfavorecidos)");

  // --- 4.3. SCATTER GASTO vs % RES (reutilizando regionData) ---

  const svgS = d3.select("#ccaa-scatter");
  const widthS = +svgS.attr("width");
  const heightS = +svgS.attr("height");
  const marginS = { top: 40, right: 20, bottom: 60, left: 70 };
  const innerWidthS = widthS - marginS.left - marginS.right;
  const innerHeightS = heightS - marginS.top - marginS.bottom;

  const gS = svgS.append("g")
    .attr("transform", `translate(${marginS.left},${marginS.top})`);

  const xS = d3.scaleLinear()
    .domain(d3.extent(regionData, d => d.gasto_pc)).nice()
    .range([0, innerWidthS]);

  const yS = d3.scaleLinear()
    .domain(d3.extent(regionData, d => d.pct_res)).nice()
    .range([innerHeightS, 0]);

  const xAxisS = d3.axisBottom(xS);
  const yAxisS = d3.axisLeft(yS);

  gS.append("g")
    .attr("transform", `translate(0,${innerHeightS})`)
    .call(xAxisS)
    .append("text")
      .attr("x", innerWidthS / 2)
      .attr("y", 40)
      .attr("fill", "currentColor")
      .attr("text-anchor", "middle")
      .text("Gasto educativo por habitante (€)");

  gS.append("g")
    .call(yAxisS)
    .append("text")
      .attr("x", -marginS.left + 10)
      .attr("y", -10)
      .attr("fill", "currentColor")
      .text("% alumnado resilente (desfavorecido)");

  const tooltipS = d3.select("body").append("div")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "4px 8px")
    .style("font-size", "12px")
    .style("display", "none");

  gS.selectAll("circle.dot-ccaa")
    .data(regionData)
    .enter()
    .append("circle")
      .attr("class", "dot-ccaa")
      .attr("cx", d => xS(d.gasto_pc))
      .attr("cy", d => yS(d.pct_res))
      .attr("r", 5)
      .attr("fill", "#ff7f0e")
      .attr("opacity", 0.9)
    .on("mousemove", (event, d) => {
      tooltipS
        .style("display", "block")
        .html(`
          <strong>${d.ccaa}</strong><br/>
          Gasto pc: ${d.gasto_pc.toFixed(0)} €<br/>
          % resilentes: ${d.pct_res.toFixed(1)}%
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", () => tooltipS.style("display", "none"));
}


// listeners de botones
d3.selectAll(".buttons button").on("click", function() {
  const factor = d3.select(this).attr("data-factor");
  updateChart(factor);
});
