import { gizmoManifest } from 'gizmo/node-graph';
import { createInitialGraph } from './demo-data.js';

console.info('Gizmo compiled manifest loaded:', gizmoManifest.tag, gizmoManifest.version);

const graph = document.getElementById('graph');
const logList = document.getElementById('logList');
const testList = document.getElementById('testList');
const probeList = document.getElementById('probeList');
const xmlPanel = document.getElementById('xmlPanel');

function loadInitialGraph() {
  graph.loadGraph(createInitialGraph());
}

function logEvent(name, detail) {
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString()} ${name} ${JSON.stringify(detail)}`;
  logList.prepend(li);
  while (logList.children.length > 14) logList.lastElementChild.remove();
}

['fox-node-select', 'fox-node-move', 'fox-edge-connect', 'fox-edge-disconnect', 'fox-node-add', 'fox-pan-zoom'].forEach(name => {
  graph.addEventListener(name, event => logEvent(name, event.detail));
});

graph.addEventListener('gizmo-probe-results', event => {
  renderProbeResults(event.detail);
  if (event.detail.failed) logEvent('gizmo-probe-error', { failed: event.detail.failed, reason: event.detail.reason });
});

function renderProbeResults({ reason, results, failed }) {
  probeList.innerHTML = '';
  for (const result of results) {
    const li = document.createElement('li');
    li.className = result.pass ? 'pass' : 'fail';
    li.textContent = `${result.pass ? 'PASS' : 'FAIL'} ${result.name} · ${result.message}`;
    const detail = document.createElement('span');
    detail.className = 'probe-detail';
    const payload = { reason, ...(result.detail || {}) };
    if (result.hints?.length) payload.hints = result.hints;
    detail.textContent = JSON.stringify(payload, null, 2);
    li.append(detail);
    probeList.append(li);
  }
  if (!results.length) {
    const li = document.createElement('li');
    li.className = failed ? 'fail' : 'pass';
    li.textContent = 'No probes returned results.';
    probeList.append(li);
  }
}

document.getElementById('runTestsBtn').addEventListener('click', () => {
  testList.innerHTML = '';
  const results = graph.runBehaviorTests();
  for (const result of results) {
    const li = document.createElement('li');
    li.className = result.pass ? 'pass' : 'fail';
    li.textContent = `${result.pass ? 'PASS' : 'FAIL'} ${result.name}${result.detail ? ` · ${result.detail}` : ''}`;
    testList.append(li);
  }
});

document.getElementById('runProbesBtn').addEventListener('click', () => graph.runDevProbes({ reason: 'manual' }));

document.getElementById('bugBtn').addEventListener('click', event => {
  const pressed = event.currentTarget.getAttribute('aria-pressed') !== 'true';
  event.currentTarget.setAttribute('aria-pressed', String(pressed));
  graph.setProbeBugMode(pressed);
  logEvent('probe-bug-mode', { enabled: pressed });
});

document.getElementById('fitBtn').addEventListener('click', () => graph.fitToNodes());

document.getElementById('resetBtn').addEventListener('click', () => {
  graph.removeAttribute('readonly');
  document.getElementById('readonlyBtn').setAttribute('aria-pressed', 'false');
  document.getElementById('bugBtn').setAttribute('aria-pressed', 'false');
  graph.setProbeBugMode(false);
  loadInitialGraph();
  logEvent('demo-reset', {});
});

document.getElementById('snapBtn').addEventListener('click', event => {
  const pressed = event.currentTarget.getAttribute('aria-pressed') !== 'true';
  event.currentTarget.setAttribute('aria-pressed', String(pressed));
  graph.toggleAttribute('snap-to-grid', pressed);
  graph.render();
  logEvent('snap-grid', { enabled: pressed });
});

document.getElementById('readonlyBtn').addEventListener('click', event => {
  const pressed = event.currentTarget.getAttribute('aria-pressed') !== 'true';
  event.currentTarget.setAttribute('aria-pressed', String(pressed));
  graph.toggleAttribute('readonly', pressed);
  graph.render();
  logEvent('readonly', { enabled: pressed });
});

async function loadCanonicalXml(source = 'node-graph.xml') {
  xmlPanel.textContent = `Loading ${source}…`;
  try {
    const response = await fetch(new URL(`../${source}`, import.meta.url));
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    xmlPanel.textContent = await response.text();
  } catch (error) {
    xmlPanel.textContent = `Unable to load ${source} from dist/: ${error.message}`;
  }
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(item => item.setAttribute('aria-selected', 'false'));
    tab.setAttribute('aria-selected', 'true');
    loadCanonicalXml(tab.dataset.source || 'node-graph.xml');
  });
});

loadInitialGraph();
loadCanonicalXml('node-graph.xml');
requestAnimationFrame(() => requestAnimationFrame(() => graph.runDevProbes({ reason: 'initial' })));
