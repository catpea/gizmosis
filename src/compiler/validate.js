import { GIZMO_FEATURES } from './features.js';

const CORE_INTERACTIONS = new Set(GIZMO_FEATURES.interactionTags.core.concat(['interaction']));
const KNOWN_KINDS = new Set(GIZMO_FEATURES.dataKinds);
const KNOWN_ROOT_SECTIONS = new Set([...GIZMO_FEATURES.canonicalRoot, ...GIZMO_FEATURES.compatibilityRoot]);
const KNOWN_BINDING_PREFIXES = ['class.', 'style.', 'svg.', 'bind.', 'on.'];
const KNOWN_COMMANDS = new Set(GIZMO_FEATURES.commandTags);

export function validateIr(ir, options = {}) {
  const diagnostics = [];
  const error = (message, detail = {}) => diagnostics.push({ severity: 'error', message, detail });
  const warning = (message, detail = {}) => diagnostics.push({ severity: 'warning', message, detail });
  const packageValidation = packageInteractionValidation(ir, options);

  if (!ir.name) warning('<gizmo> should have a name attribute.');
  if (!ir.tag) error('<gizmo> must have a tag attribute.');
  if (ir.tag && !/^[a-z][a-z0-9]*-[a-z0-9-]+$/.test(ir.tag)) error('Custom element tag must contain a hyphen and be lowercase.', { tag: ir.tag });
  if (ir.shadow && !['open', 'closed', 'none'].includes(ir.shadow)) warning('shadow should be open, closed, or none.', { shadow: ir.shadow });

  for (const section of ir.sections || []) {
    if (!KNOWN_ROOT_SECTIONS.has(section.kind)) warning(`Unknown root section <${section.kind}>.`, section);
  }

  for (const build of ir.build || []) if (build.attrs.mode && !['development', 'production', 'test'].includes(build.attrs.mode)) warning('<build> mode should be development, production, or test.', build);
  for (const use of ir.uses || []) if (!use.library) warning('<use> should declare library="...".', use);

  for (const prop of ir.props) validateProp(prop, 'prop');
  for (const attr of ir.attrs || []) validateProp(attr, 'attr');
  for (const field of ir.state) validateProp(field, 'state field');
  for (const type of ir.types) {
    if (!type.name) error('<type> must have a name.');
    for (const prop of type.props) validateProp(prop, `type ${type.name} prop`);
  }

  const definedTypes = new Set(ir.types.map(type => type.name));
  for (const prop of [...ir.props, ...(ir.attrs || []), ...ir.state, ...ir.types.flatMap(type => type.props)]) {
    if ((prop.kind === 'list' || prop.kind === 'record' || prop.kind === 'maybe') && prop.of && !isPrimitiveOf(prop.of) && !definedTypes.has(prop.of)) {
      warning(`${prop.kind} "${prop.name}" refers to undeclared type "${prop.of}".`, prop);
    }
  }

  for (const event of ir.events) {
    if (!event.name) error('<event> requires name="...".');
    for (const field of event.detail || []) validateProp(field, `event ${event.name} detail field`);
  }
  for (const method of ir.methods || []) if (!method.name) warning('<method> should have name="...".', method);
  for (const slot of ir.slots || []) if (!slot.name) warning('<slot> should have name="..."; use name="default" for default slot.', slot);
  for (const part of ir.parts || []) if (!part.name) warning('<part> should have name="...".', part);

  for (const style of ir.requires.styles || []) if (!style.attrs.src) warning('<requires><style> should declare src="...".', style);
  for (const component of ir.requires.components || []) if (!component.attrs.tag) warning('<requires><component> should declare tag="...".', component);
  for (const capability of [...(ir.requires.capabilities || []), ...(ir.provides.capabilities || [])]) if (!capability.name) warning('<capability> should declare name="...".', capability);
  for (const service of [...(ir.requires.services || []), ...(ir.provides.services || [])]) if (!service.name) warning('<service> should declare name="...".', service);

  for (const computed of ir.model.computed || []) if (!computed.name) warning('<computed> should have name="...".', computed);
  for (const signal of ir.model.signals || []) if (!signal.name) warning('<signal> should have name="...".', signal);
  for (const subscription of ir.model.subscriptions || []) if (!subscription.name) warning('<subscription> should have name="...".', subscription);
  for (const store of ir.model.stores || []) if (!store.name) warning('<store> should have name="...".', store);

  for (const interaction of flattenInteractions(ir.interactions)) {
    const packageGenerator = packageValidation.usedByTag.get(interaction.kind);
    if (!CORE_INTERACTIONS.has(interaction.kind) && !packageValidation.allTags.has(interaction.kind)) warning(`Unknown interaction <${interaction.kind}>.`, { interaction: interaction.name || interaction.kind });
    if (packageValidation.allTags.has(interaction.kind) && !packageGenerator) error(`<${interaction.kind}> requires a matching <use library="..."/> package.`, { interaction: interaction.name || interaction.kind });
    if (interaction.kind === 'drag' && !interaction.attrs.from) error(`<${interaction.kind}> requires from="...".`, { interaction: interaction.name });
    if (packageGenerator && !interaction.attrs.from && interaction.kind !== 'node' && interaction.kind !== 'port' && interaction.kind !== 'edge') error(`<${interaction.kind}> requires from="...".`, { interaction: interaction.name });
    packageGenerator?.validateInteraction?.(interaction, { error, warning });
  }

  if (ir.view) {
    for (const repeated of ir.view.repeated) if (!repeated.attrs.key) warning('Repeated interactive view element should include key="...".', repeated);
    for (const binding of ir.view.bindings) {
      if (binding.kind === 'attribute' && binding.name.includes('.') && !KNOWN_BINDING_PREFIXES.some(prefix => binding.name.startsWith(prefix)) && !binding.name.startsWith('data-')) warning(`Unknown binding attribute prefix "${binding.name}".`, binding);
    }
  } else warning('<gizmo> has no <view>. A component skeleton will be generated.');

  const actionNames = new Set((ir.actions || []).map(action => action.name));
  const effectNames = new Set((ir.effects.effects || []).map(effect => effect.name));
  for (const action of ir.actions || []) {
    if (!action.name) warning('<action> should have name="...".', action);
    for (const step of action.steps || []) validateCommand(step, action.name);
  }
  for (const event of ir.behavior.events || []) if (!event.name) warning('<behavior><event> should have name="...".', event);
  for (const reducer of ir.behavior.reducers || []) if (!reducer.name) warning('<reducer> should have name="...".', reducer);
  for (const stream of ir.behavior.streams || []) if (!stream.name) warning('<stream> should have name="...".', stream);
  for (const machine of ir.behavior.machines || []) {
    if (!machine.name) warning('<machine> should have name="...".', machine);
    if (!machine.attrs.initial) warning('<machine> should declare initial="state".', machine);
  }
  for (const command of ir.behavior.commands || []) if (!command.name) warning('<command> should have name="...".', command);

  for (const effect of ir.effects.effects || []) {
    if (!effect.name) warning('<effect> should have name="...".', effect);
    for (const step of effect.steps || []) validateCommand(step, effect.name);
  }
  for (const task of ir.effects.tasks || []) if (!task.name) warning('<task> should have name="...".', task);
  for (const worker of ir.effects.workers || []) if (!worker.name) warning('<worker> should have name="...".', worker);
  for (const frame of ir.frames || []) {
    if (!frame.name) error('<frame> requires a name.');
    for (const effect of frame.effects || []) if (effect && !effectNames.has(effect)) warning(`<frame> references undeclared effect "${effect}".`, frame);
  }
  for (const resource of ir.resources.resources || []) {
    if (!resource.name) warning('<resource> should have name="...".', resource);
    if (!resource.acquire) warning('<resource> should contain <acquire>.', resource);
    if (!resource.release) warning('<resource> should contain <release>.', resource);
  }

  for (const probe of ir.dev.probes || []) {
    if (!probe.name) warning('<probe> or <layout-probe> should have a name.');
    if (!probe.attrs.severity) warning('Probe should declare severity="error|warning|info".', { probe: probe.name });
  }
  for (const story of ir.dev.stories || []) if (!story.name) warning('<story> should have name="...".', story);
  for (const trace of ir.dev.traces || []) if (!trace.name) warning('<trace> should have name="...".', trace);
  for (const test of ir.tests || []) if (!test.name) warning('<test> should have name="...".', test);
  for (const fixture of ir.fixtures || []) if (!fixture.name) warning('<fixture> should have name="...".', fixture);

  return diagnostics;

  function validateProp(prop, label) {
    if (!prop.name) error(`<${label}> must have a name.`, { prop });
    if (!prop.kind) warning(`${label} "${prop.name}" should declare kind="..." or type="...".`);
    if (prop.kind && !KNOWN_KINDS.has(prop.kind)) warning(`Unknown kind "${prop.kind}" on ${label} "${prop.name}".`);
    if ((prop.kind === 'list' || prop.kind === 'record' || prop.kind === 'maybe') && !prop.of) error(`${label} "${prop.name}" with kind="${prop.kind}" requires of="...".`);
    if (prop.kind === 'choice' && !prop.values.length) error(`${label} "${prop.name}" with kind="choice" requires values="...".`);
  }
  function validateCommand(step, context) {
    if (step.kind && !KNOWN_COMMANDS.has(step.kind) && !['detail', 'from', 'to', 'acquire', 'release'].includes(step.kind)) warning(`Unknown command <${step.kind}> in ${context}.`, step);
    if (step.kind === 'run' && step.attrs.action && !actionNames.has(step.attrs.action)) warning(`<run> references undeclared action "${step.attrs.action}".`, step);
  }
}

export function hasErrors(diagnostics) { return diagnostics.some(item => item.severity === 'error'); }
function flattenInteractions(interactions, out = []) { for (const interaction of interactions || []) { out.push(interaction); flattenInteractions(interaction.nested || [], out); } return out; }
function isPrimitiveOf(value) { return ['text', 'number', 'boolean', 'css-color', 'url', 'string', 'unknown'].includes(String(value).toLowerCase()) || ['String', 'Number', 'Boolean', 'URL'].includes(value); }

function packageInteractionValidation(ir, options) {
  const generators = options.packageGenerators || {};
  const allTags = new Set();
  const usedByTag = new Map();
  const usedLibraries = new Set((ir.uses || []).map(use => use.library));

  for (const [library, generator] of Object.entries(generators)) {
    const tags = interactionTagsFor(generator);
    for (const tag of tags) {
      allTags.add(tag);
      if (usedLibraries.has(library)) usedByTag.set(tag, generator);
    }
  }

  return { allTags, usedByTag };
}

function interactionTagsFor(generator) {
  if (Array.isArray(generator?.interactionTags)) return generator.interactionTags;
  if (generator?.features?.interactionTags && Array.isArray(generator.features.interactionTags)) return generator.features.interactionTags;
  return [];
}
