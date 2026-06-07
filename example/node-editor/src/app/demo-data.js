import { clone } from '../core/dom.js';

export const initialNodes = [
  {
    id: 'source', type: 'input', label: 'Media Source', color: '#49fafe', x: 72, y: 78, status: 'ok', expanded: true,
    inputs: [], outputs: [{ id: 'rgba', label: 'RGBA', type: 'rgba' }, { id: 'alpha', label: 'Alpha', type: 'mask' }]
  },
  {
    id: 'grade', type: 'effect', label: 'Color Grade', color: '#9d7cff', x: 364, y: 132, status: 'warning', expanded: false,
    inputs: [{ id: 'in', label: 'In', type: 'rgba' }], outputs: [{ id: 'out', label: 'Out', type: 'rgba' }]
  },
  {
    id: 'blur', type: 'effect', label: 'Gaussian Blur', color: '#0dcaf0', x: 660, y: 88, status: 'ok', expanded: false,
    inputs: [{ id: 'in', label: 'In', type: 'rgba' }, { id: 'mask', label: 'Mask', type: 'mask' }], outputs: [{ id: 'out', label: 'Out', type: 'rgba' }]
  },
  {
    id: 'output', type: 'output', label: 'Preview Output', color: '#44d07b', x: 930, y: 224, status: 'ok', expanded: false,
    inputs: [{ id: 'in', label: 'In', type: 'rgba' }], outputs: []
  }
];

export const initialEdges = [
  { id: 'edge-1', from: { nodeId: 'source', portId: 'rgba' }, to: { nodeId: 'grade', portId: 'in' } },
  { id: 'edge-2', from: { nodeId: 'grade', portId: 'out' }, to: { nodeId: 'blur', portId: 'in' } },
  { id: 'edge-3', from: { nodeId: 'blur', portId: 'out' }, to: { nodeId: 'output', portId: 'in' } }
];

export function createInitialGraph() {
  return {
    nodes: clone(initialNodes),
    edges: clone(initialEdges),
    selected: ['grade'],
    view: { panX: 0, panY: 0, zoom: 1 },
    fit: true
  };
}
