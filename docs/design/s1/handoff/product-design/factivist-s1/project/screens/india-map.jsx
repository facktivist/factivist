// Factivist — India AC choropleth map
// Loads the 4,182-polygon TopoJSON of assembly constituencies once, decodes
// arcs, and renders an interactive SVG using innerHTML (path soup is too
// large to round-trip through React reconciliation per state change).
//
// API:
//   <IndiaMap
//     width={720} height={620}
//     stateData={ "MAHARASHTRA": { density: 0.7, acHeat: { 21: 0.8, ... } } }
//     selectedState="MAHARASHTRA"      // null = whole-country view
//     colorBy="volume" | "severity" | "resolution"
//     onSelect={(stName) => ...}
//     onHoverAC={({ st, ac, acName, ev }) => ...}
//   />
//
// Module-level cache prevents re-decoding the topo on remount.

const TOPO_URL = 'data/india-acs.topo.json';

let _topoPromise = null;
function loadTopo() {
  if (!_topoPromise) {
    _topoPromise = fetch(TOPO_URL).then(r => r.json()).then(decodeTopo);
  }
  return _topoPromise;
}

function decodeTopo(topo) {
  const { scale, translate } = topo.transform;
  const arcs = topo.arcs.map(arc => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => {
      x += dx; y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
  });
  return {
    arcs,
    geometries: topo.objects.India_AC.geometries,
  };
}

function useTopo() {
  const [topo, setTopo] = React.useState(null);
  React.useEffect(() => {
    let cancelled = false;
    loadTopo().then(t => { if (!cancelled) setTopo(t); });
    return () => { cancelled = true; };
  }, []);
  return topo;
}

// India bbox — covers all 30 states in the topo, with a little padding.
const INDIA_BBOX = { lonMin: 67.5, lonMax: 97.6, latMin: 6.6, latMax: 37.2 };

function makeProjector(width, height, bbox = INDIA_BBOX, padding = 12) {
  const dx = bbox.lonMax - bbox.lonMin;
  const dy = bbox.latMax - bbox.latMin;
  const midLat = (bbox.latMin + bbox.latMax) / 2;
  const lonScale = Math.cos(midLat * Math.PI / 180);
  const effW = width - padding * 2;
  const effH = height - padding * 2;
  const s = Math.min(effW / (dx * lonScale), effH / dy);
  const ox = padding + (effW - dx * lonScale * s) / 2;
  const oy = padding + (effH - dy * s) / 2;
  return ([lon, lat]) => [
    ox + (lon - bbox.lonMin) * lonScale * s,
    oy + (bbox.latMax - lat) * s,
  ];
}

// Convert a list of ring-arc indices to an SVG path "M…L…Z" using the
// projector. Ring indices may be negative (= reverse of arc ~i).
function ringPath(arcs, ringIdxs, project) {
  let d = '';
  let first = true;
  for (const i of ringIdxs) {
    const arc = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
    for (let p = 0; p < arc.length; p++) {
      // Skip the first point of a follow-up arc (it duplicates the previous end).
      if (!first && p === 0) continue;
      const [x, y] = project(arc[p]);
      d += (first ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
      first = false;
    }
  }
  d += 'Z';
  return d;
}

function geomPath(topo, g, project) {
  if (g.type === 'Polygon') {
    let d = '';
    for (const ring of g.arcs) d += ringPath(topo.arcs, ring, project);
    return d;
  }
  if (g.type === 'MultiPolygon') {
    let d = '';
    for (const poly of g.arcs) for (const ring of poly) d += ringPath(topo.arcs, ring, project);
    return d;
  }
  return '';
}

// Heat scale — light → dark brand. Use OKLCH for smooth interpolation.
function heatColor(heat, palette = 'brand', dim = false) {
  if (heat == null) heat = 0;
  if (dim) return 'oklch(0.94 0.01 250)';
  const t = Math.max(0, Math.min(1, heat));
  if (palette === 'severity') {
    return `oklch(${(0.95 - t * 0.45).toFixed(3)} ${(0.04 + t * 0.18).toFixed(3)} 27)`;
  }
  if (palette === 'resolution') {
    return `oklch(${(0.95 - t * 0.40).toFixed(3)} ${(0.04 + t * 0.16).toFixed(3)} 145)`;
  }
  return `oklch(${(0.95 - t * 0.50).toFixed(3)} ${(0.04 + t * 0.20).toFixed(3)} 250)`;
}

const IndiaMap = ({
  width = 720,
  height = 620,
  stateData = {},
  selectedState = null,
  colorBy = 'volume',
  onSelect,
  onHoverAC,
  hoveredAC = null,
}) => {
  const topo = useTopo();
  const ref = React.useRef(null);

  // Compute the projector based on selection.
  const bbox = React.useMemo(() => {
    if (selectedState && stateData[selectedState]?.bbox) {
      const b = stateData[selectedState].bbox;
      // Pad bbox by 8% so the state doesn't kiss the edge
      const padX = (b[2] - b[0]) * 0.06;
      const padY = (b[3] - b[1]) * 0.06;
      return { lonMin: b[0] - padX, latMin: b[1] - padY, lonMax: b[2] + padX, latMax: b[3] + padY };
    }
    return INDIA_BBOX;
  }, [selectedState, stateData]);

  const project = React.useMemo(() => makeProjector(width, height, bbox), [width, height, bbox]);

  // Build the SVG path soup. Heavy work, but only re-runs when projection or
  // selection or data change.
  const pathHTML = React.useMemo(() => {
    if (!topo) return '';
    const palette = colorBy === 'severity' ? 'severity'
                  : colorBy === 'resolution' ? 'resolution'
                  : 'brand';
    let html = '';
    for (let k = 0; k < topo.geometries.length; k++) {
      const g = topo.geometries[k];
      const st = g.properties.ST_NAME;
      const ac = g.properties.AC_NO;
      const sData = stateData[st];

      let fill;
      let stroke = 'rgba(255,255,255,0.35)';
      let strokeWidth = '0.4';

      if (selectedState) {
        if (st === selectedState) {
          const heat = sData?.acHeat?.[ac] ?? 0.15;
          fill = heatColor(heat, palette);
          stroke = 'rgba(255,255,255,0.55)';
          strokeWidth = '0.5';
        } else {
          fill = '#e7e3da';
          stroke = 'rgba(255,255,255,0.7)';
          strokeWidth = '0.3';
        }
      } else {
        const heat = sData?.density ?? 0.05;
        fill = heatColor(heat, palette);
      }

      const d = geomPath(topo, g, project);
      html += '<path d="' + d + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + strokeWidth + '"'
        + ' data-st="' + st + '" data-ac="' + ac + '" data-acname="' + (g.properties.AC_NAME || '').replace(/"/g, '&quot;') + '"'
        + '/>';
    }
    // Overlay state borders by drawing the selected state's outline thicker
    return html;
  }, [topo, project, stateData, selectedState, colorBy]);

  // Push markup. Avoid React's per-node diff cost.
  React.useEffect(() => {
    if (ref.current) ref.current.innerHTML = pathHTML;
  }, [pathHTML]);

  // Highlight hovered AC by toggling its stroke (no re-render)
  React.useEffect(() => {
    if (!ref.current) return;
    const els = ref.current.querySelectorAll('path[data-highlight="1"]');
    els.forEach(el => {
      el.setAttribute('data-highlight', '');
      el.setAttribute('stroke', 'rgba(255,255,255,0.35)');
      el.setAttribute('stroke-width', '0.4');
    });
    if (hoveredAC) {
      const target = ref.current.querySelector(`path[data-st="${hoveredAC.st}"][data-ac="${hoveredAC.ac}"]`);
      if (target) {
        target.setAttribute('data-highlight', '1');
        target.setAttribute('stroke', '#1a1a1a');
        target.setAttribute('stroke-width', '1.2');
        target.parentNode.appendChild(target); // bring to front
      }
    }
  }, [hoveredAC]);

  // Event delegation
  const onMouseMove = (e) => {
    if (!onHoverAC) return;
    const t = e.target;
    if (t.tagName === 'path' && t.hasAttribute('data-st')) {
      onHoverAC({
        st: t.getAttribute('data-st'),
        ac: +t.getAttribute('data-ac'),
        acName: t.getAttribute('data-acname'),
        clientX: e.clientX,
        clientY: e.clientY,
      });
    } else {
      onHoverAC(null);
    }
  };
  const onMouseLeave = () => onHoverAC && onHoverAC(null);

  const onClick = (e) => {
    const t = e.target;
    if (t.tagName === 'path' && t.hasAttribute('data-st')) {
      const st = t.getAttribute('data-st');
      onSelect && onSelect(st);
    } else {
      onSelect && onSelect(null);
    }
  };

  return (
    <div style={{ position:'relative', width, height, userSelect:'none' }}>
      <svg ref={ref}
        width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        style={{ display:'block', cursor: onSelect ? 'pointer' : 'default' }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      />
      {!topo && (
        <div style={{
          position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:12, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em',
        }}>LOADING 4,182 CONSTITUENCIES …</div>
      )}
    </div>
  );
};

// Heat legend strip
const HeatLegend = ({ palette = 'volume', label = 'COMPLAINT DENSITY' }) => {
  const stops = [0, 0.2, 0.4, 0.6, 0.8, 1];
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
      <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)', letterSpacing:'0.04em' }}>LOW</span>
      <div style={{ display:'flex', height:8, borderRadius:99, overflow:'hidden', width:140 }}>
        {stops.map(s => (
          <div key={s} style={{ flex:1, background: heatColor(s, palette === 'volume' ? 'brand' : palette) }}/>
        ))}
      </div>
      <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)', letterSpacing:'0.04em' }}>HIGH</span>
      <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)', letterSpacing:'0.06em', marginLeft:6 }}>{label}</span>
    </div>
  );
};

Object.assign(window, { IndiaMap, HeatLegend, INDIA_BBOX });
