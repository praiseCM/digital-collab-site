/* Conceptual project network. No actor, edge, or signal represents a survey record. */
(() => {
  'use strict';
  const root = document.querySelector('.hv-root');
  if (!root) return;
  const select = selector => root.querySelector(selector);
  const nodes = [...root.querySelectorAll('[data-actor]')];
  const edges = [...root.querySelectorAll('[data-edge]')];
  const categories = [...root.querySelectorAll('[data-network]')];
  const modeButtons = [...root.querySelectorAll('[data-view]')];
  const center = select('.hv-center');
  const motionButton = select('#motion-toggle');
  const status = select('#hv-status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const coordinates = {pm:[92,183], owner:[353,53], gc:[564,112], designer:[602,344], engineer:[535,559], sub:[149,540], central:[353,283]};
  const copy = {
    people: {title:'People', description:'Individual project actors contribute experience, judgment, and practical help.'},
    networks: {title:'Networks', description:'Relationships carry advice, ideas, and practical support between project actors.'},
    technology: {title:'Digital Technology', description:'Digital infrastructure gives people a shared setting to exchange and coordinate project information.'},
    collaboration: {title:'Digital Collaboration', description:'People, relationships, and digital infrastructure come together in collaborative project work.'}
  };
  const state = {selected:'networks', preview:null, actor:null, hovered:null, focused:null, mode:'concept', paused:false, visible:true, sequence:null, scrollLayer:null, scrollStage:0, engaged:false};
  const pool = [...root.querySelectorAll('.hv-signal')];
  let signals = [];
  let frame = 0;
  let idleTimer = 0;
  let pointerFrame = 0;
  let scrollFrame = 0;
  let idleIndex = 0;
  let lastSignalPhase = -1;

  function canMove() {
    return !reduced.matches && !state.paused && state.visible && !document.hidden && state.mode === 'concept';
  }
  function layer() {
    if (state.preview) return state.preview;
    if (state.sequence) return ['people','networks','technology','collaboration'][state.sequence.phase];
    return state.scrollLayer || state.selected;
  }
  function render() {
    const current = layer();
    root.dataset.layer = current;
    root.dataset.active = state.selected;
    root.dataset.mode = state.mode;
    const content = state.mode === 'model' ? {title:'NE-TPB / conceptual framework', description:'The study adds social network support to attitude, subjective norm, and perceived behavioral control to explain reported collaboration frequency.'} : copy[current];
    select('#hv-actor-note').textContent = state.mode === 'model' ? 'Study constructs; conceptual associations.' : 'Conceptual actors, not study participants.';
    select('#network-topic').textContent = content.title;
    select('#network-description').textContent = content.description;
    categories.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.network === state.selected));
      button.disabled = state.mode === 'model';
    });
    modeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === state.mode)));
    const focus = state.focused || state.hovered || state.actor;
    if (focus) root.dataset.focus = focus;
    else delete root.dataset.focus;
    const relatedNodes = new Set();
    edges.forEach(edge => {
      const related = !!focus && (edge.dataset.from === focus || edge.dataset.to === focus);
      edge.classList.toggle('is-related', related);
      if (related) { relatedNodes.add(edge.dataset.from); relatedNodes.add(edge.dataset.to); }
    });
    nodes.forEach(button => {
      button.classList.toggle('is-active', button.dataset.actor === focus);
      button.classList.toggle('is-related', relatedNodes.has(button.dataset.actor));
      button.setAttribute('aria-pressed', String(button.dataset.actor === state.actor));
    });
    center.classList.toggle('is-active', focus === 'central' || !!state.sequence);
  }
  function stopIdle() { clearTimeout(idleTimer); idleTimer = 0; }
  function clearSignals() {
    cancelAnimationFrame(frame); frame = 0; signals = [];
    pool.forEach(dot => { dot.style.opacity = '0'; });
    edges.forEach(edge => edge.classList.remove('is-transmitting'));
    nodes.forEach(node => node.classList.remove('is-transmitting'));
  }
  function resetParallax() {
    cancelAnimationFrame(pointerFrame); pointerFrame = 0;
    ['building','network','grid'].forEach(name => { root.style.setProperty('--' + name + '-x', '0px'); root.style.setProperty('--' + name + '-y', '0px'); });
  }
  function stopSequence() {
    state.sequence = null;
    delete root.dataset.sequence;
    delete root.dataset.phase;
    clearSignals();
  }
  function scheduleIdle() {
    stopIdle();
    if (!canMove() || state.sequence) return;
    idleTimer = setTimeout(() => {
      idleTimer = 0;
      if (!canMove()) return;
      ambientSignals();
      scheduleIdle();
    }, 4800 + (idleIndex++ % 4) * 1100);
  }
  // At most three SVG signals on desktop and one on coarse-pointer devices.
  // One requestAnimationFrame loop exists only while a signal or sequence is active.
  function emit(points, {delay = 0, duration = 1900, digital = false, edge = null} = {}) {
    if (!canMove() || signals.length >= (coarse.matches ? 1 : 3)) return;
    const dot = pool.find(candidate => !signals.some(signal => signal.dot === candidate));
    if (!dot) return;
    const segments = points.slice(1).map((point, index) => ({from:points[index], to:point, length:Math.hypot(point[0] - points[index][0], point[1] - points[index][1])}));
    const total = segments.reduce((sum, segment) => sum + segment.length, 0);
    if (!total) return;
    dot.classList.toggle('is-digital', digital);
    signals.push({dot, segments, total, start:performance.now() + delay, duration, edge});
    refreshTransmissions();
    if (!frame) frame = requestAnimationFrame(animate);
  }
  function refreshTransmissions() {
    const activeEdges = new Set(signals.map(signal => signal.edge).filter(Boolean));
    const activeActors = new Set();
    activeEdges.forEach(edge => { activeActors.add(edge.dataset.from); activeActors.add(edge.dataset.to); });
    edges.forEach(edge => edge.classList.toggle('is-transmitting', activeEdges.has(edge)));
    nodes.forEach(node => node.classList.toggle('is-transmitting', activeActors.has(node.dataset.actor)));
  }
  function emitEdge(index, options = {}) {
    const edge = edges[index];
    emit([coordinates[edge.dataset.from], coordinates[edge.dataset.to]], {...options, edge});
  }
  function ambientSignals() {
    const current = layer();
    const actor = state.focused || state.hovered || state.actor;
    if (actor && coordinates[actor]) {
      const connected = edges.findIndex(edge => edge.dataset.from === actor || edge.dataset.to === actor);
      emitEdge(Math.max(0, connected), {duration:2300});
    } else if (current === 'technology') {
      emit([[312,509],[312,200],[353,283]], {digital:true,duration:2400});
    } else if (current === 'people') {
      const related = edges.findIndex(edge => edge.dataset.from === (state.actor || 'pm') && edge.dataset.to !== 'central');
      emitEdge(Math.max(0, related), {duration:2300});
    } else {
      const first = idleIndex % 6;
      emitEdge(first, {duration:2200});
      if (!coarse.matches) emitEdge((first + 6) % 12, {delay:650,duration:2000});
    }
  }
  function animate(now) {
    frame = 0;
    if (!canMove()) { clearSignals(); return; }
    if (state.sequence) {
      const elapsed = Math.max(0, now - state.sequence.start);
      if (elapsed >= 3200) {
        state.sequence = null;
        delete root.dataset.sequence;
        delete root.dataset.phase;
        center.classList.remove('is-active');
        status.textContent = 'People, networks, and digital technology come together in digital collaboration.';
        render(); scheduleIdle();
      } else {
        const phase = Math.min(3, Math.floor(elapsed / 800));
        if (phase !== state.sequence.phase) { state.sequence.phase = phase; root.dataset.phase = String(phase); render(); }
        if (phase !== lastSignalPhase) {
          lastSignalPhase = phase;
          if (phase === 0) emit([coordinates.pm,[235,114]], {duration:650});
          if (phase === 1) emit([[235,114],coordinates.gc,[435,195]], {duration:700});
          if (phase === 2) emit([[435,195],[435,326],coordinates.central], {digital:true,duration:1150});
        }
      }
    }
    let signalEnded = false;
    signals = signals.filter(signal => {
      const progress = (now - signal.start) / signal.duration;
      if (progress >= 1) {
        signal.dot.style.opacity = '0';
        signalEnded = true;
        return false;
      }
      if (progress < 0) return true;
      let distance = progress * signal.total;
      let segment = signal.segments[signal.segments.length - 1];
      for (const candidate of signal.segments) { segment = candidate; if (distance <= candidate.length) break; distance -= candidate.length; }
      const t = Math.min(1, distance / segment.length);
      const x = segment.from[0] + (segment.to[0] - segment.from[0]) * t;
      const y = segment.from[1] + (segment.to[1] - segment.from[1]) * t;
      signal.dot.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      signal.dot.style.opacity = String(Math.min(1, progress * 8, (1 - progress) * 8) * .85);
      return true;
    });
    if (signalEnded) refreshTransmissions();
    if ((signals.length || state.sequence) && !frame) frame = requestAnimationFrame(animate);
  }
  function startSequence() {
    if (state.mode !== 'concept') return;
    stopIdle(); stopSequence();
    state.actor = null; state.hovered = null; state.focused = null;
    state.scrollLayer = null;
    if (!canMove()) {
      state.actor = 'central'; state.scrollLayer = 'collaboration';
      status.textContent = 'Digital collaboration brings people, networks, and digital technology together. Motion is disabled.';
      render(); return;
    }
    lastSignalPhase = -1;
    state.sequence = {start:performance.now(), phase:0};
    root.dataset.sequence = 'active'; root.dataset.phase = '0';
    status.textContent = 'People share knowledge through networks and digital infrastructure, converging at digital collaboration.';
    render(); frame = requestAnimationFrame(animate);
  }
  function chooseLayer(key) {
    stopSequence(); state.selected = key; state.preview = null;
    state.scrollLayer = null; state.actor = null; state.focused = null; state.hovered = null; state.engaged = true;
    render(); ambientSignals(); scheduleIdle();
  }
  categories.forEach(button => {
    button.addEventListener('pointerenter', event => { if (event.pointerType !== 'mouse' || state.mode !== 'concept') return; state.preview = button.dataset.network; render(); });
    button.addEventListener('pointerleave', () => { state.preview = null; render(); });
    button.addEventListener('focus', () => { state.preview = button.dataset.network; render(); });
    button.addEventListener('blur', () => { state.preview = null; render(); });
    button.addEventListener('click', () => chooseLayer(button.dataset.network));
  });
  function exploreActor(id, source) {
    if (!state.sequence) clearSignals();
    state[source] = id; state.preview = null; state.scrollLayer = null; render();
  }
  [...nodes, center].forEach(button => {
    const id = button.dataset.actor || 'central';
    button.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') exploreActor(id, 'hovered'); });
    button.addEventListener('pointerleave', () => { state.hovered = null; render(); });
    button.addEventListener('focus', () => exploreActor(id, 'focused'));
    button.addEventListener('blur', () => { state.focused = null; render(); });
    if (id !== 'central') button.addEventListener('click', () => {
      stopSequence(); state.actor = state.actor === id ? null : id; state.engaged = true;
      state.scrollLayer = null; render();
      const index = edges.findIndex(edge => edge.dataset.from === id && edge.dataset.to === 'central');
      if (index >= 0) emitEdge(index, {duration:1800});
    });
  });
  center.addEventListener('click', () => { state.engaged = true; startSequence(); });
  root.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    stopSequence(); state.actor = null; state.hovered = null; state.focused = null; state.preview = null; state.scrollLayer = null;
    render(); scheduleIdle();
  });
  root.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    state.actor = null; state.hovered = null; state.focused = null; render();
  });
  modeButtons.forEach(button => button.addEventListener('click', () => {
    stopSequence(); stopIdle(); resetParallax();
    state.mode = button.dataset.view; state.preview = null; state.scrollLayer = null; state.actor = null; state.hovered = null; state.focused = null; state.engaged = true;
    select('#hv-concept').inert = state.mode !== 'concept';
    select('#hv-concept').setAttribute('aria-hidden', String(state.mode !== 'concept'));
    select('#hv-model').inert = state.mode !== 'model';
    select('#hv-model').setAttribute('aria-hidden', String(state.mode !== 'model'));
    render(); scheduleIdle();
  }));
  function syncMotion() {
    root.dataset.motion = reduced.matches || state.paused ? 'paused' : 'running';
    motionButton.disabled = reduced.matches;
    motionButton.setAttribute('aria-pressed', String(reduced.matches || state.paused));
    motionButton.textContent = reduced.matches ? 'Reduced motion' : state.paused ? 'Resume motion' : 'Pause motion';
    if (!canMove()) { stopIdle(); stopSequence(); resetParallax(); render(); }
    else scheduleIdle();
  }
  motionButton.addEventListener('click', () => { state.paused = !state.paused; syncMotion(); });
  reduced.addEventListener('change', syncMotion);
  coarse.addEventListener('change', () => { resetParallax(); clearSignals(); scheduleIdle(); });
  root.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || coarse.matches || !canMove()) return;
    cancelAnimationFrame(pointerFrame);
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      const rect = root.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
      [['building',5],['network',-3],['grid',1.4]].forEach(([name,amount]) => {
        root.style.setProperty('--' + name + '-x', (x * amount).toFixed(2) + 'px');
        root.style.setProperty('--' + name + '-y', (y * amount).toFixed(2) + 'px');
      });
    });
  });
  root.addEventListener('pointerleave', resetParallax);
  function updateScroll() {
    scrollFrame = 0;
    if (reduced.matches || state.paused || !state.visible || state.engaged || state.mode !== 'concept') return;
    const rect = root.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -rect.top / (rect.height * .72)));
    const stage = progress === 0 ? 0 : Math.min(4, Math.ceil(progress * 4));
    if (stage === state.scrollStage) return;
    state.scrollStage = stage; root.dataset.scrollStage = String(stage);
    state.scrollLayer = [null,'people','networks','technology','collaboration'][stage];
    render();
    if (stage > 0) {
      clearSignals();
      if (stage === 4) emit([coordinates.gc,[435,195],coordinates.central], {digital:true,duration:2300});
      else ambientSignals();
    }
  }
  window.addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }, {passive:true});
  const visibility = new IntersectionObserver(entries => {
    state.visible = entries[0].isIntersecting; root.dataset.visible = String(state.visible);
    if (!state.visible) { stopIdle(); stopSequence(); resetParallax(); render(); }
    else { scheduleIdle(); updateScroll(); }
  }, {threshold:0});
  visibility.observe(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopIdle(); stopSequence(); resetParallax(); render(); } else scheduleIdle(); });
  render(); syncMotion();
})();

