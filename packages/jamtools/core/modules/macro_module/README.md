# Enhanced Dynamic Macro System

## Overview

The Enhanced Dynamic Macro System provides a comprehensive solution for creating flexible, user-customizable workflows in JamTools. It addresses the limitations of the previous static macro system by introducing:

- **Data-driven configuration**: Workflows defined by JSON configuration instead of compile-time code
- **Hot reloading**: Runtime reconfiguration without disrupting MIDI streams
- **Visual workflow builder**: Drag-and-drop interface for creating complex macro chains
- **Template system**: Reusable workflow patterns with parameterization
- **Legacy compatibility**: Seamless backward compatibility with existing macro code
- **Type safety**: Full TypeScript support with compile-time validation
- **Real-time performance**: Optimized for <10ms MIDI latency requirements

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Enhanced Macro Module                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Legacy API    │  │   Dynamic API   │  │   Template API  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Legacy Adapter  │  │Dynamic Manager  │  │Workflow Builder │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │Connection Mgr   │  │   Validation    │  │   Migration     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key Classes

1. **`EnhancedMacroModule`**: Main module providing both legacy and new APIs
2. **`DynamicMacroManager`**: Manages workflow lifecycle and instances
3. **`ReactiveConnectionManager`**: Handles real-time data flow between nodes
4. **`WorkflowValidator`**: Validates configurations and prevents errors
5. **`LegacyMacroAdapter`**: Provides backward compatibility layer

## Migration Guide

### For Existing Code

Your existing macro code will continue to work without changes:

```typescript
// This still works exactly the same
const input = await macroModule.createMacro(moduleAPI, 'MIDI Input', 'midi_control_change_input', {});
const output = await macroModule.createMacro(moduleAPI, 'MIDI Output', 'musical_keyboard_output', {});

input.subject.subscribe(evt => {
    output.send(evt.event);
});
```

### Migrating to Workflows

1. **Automatic Migration**: Use the built-in migration utility:

```typescript
// Migrate all legacy macros to workflows
await macroModule.migrateLegacyMacros();
```

2. **Manual Workflow Creation**: Create workflows programmatically:

```typescript
const workflowConfig: MacroWorkflowConfig = {
    id: 'my_midi_chain',
    name: 'MIDI CC Chain',
    description: 'Maps CC1 to CC7 with range transformation',
    enabled: true,
    version: '1.0.0',
    nodes: [
        {
            id: 'input_node',
            type: 'midi_control_change_input',
            position: { x: 100, y: 100 },
            config: {
                deviceFilter: 'My Controller',
                channelFilter: 1,
                ccNumberFilter: 1
            }
        },
        {
            id: 'output_node', 
            type: 'midi_control_change_output',
            position: { x: 300, y: 100 },
            config: {
                device: 'My Synth',
                channel: 1,
                ccNumber: 7
            }
        }
    ],
    connections: [
        {
            id: 'main_connection',
            sourceNodeId: 'input_node',
            targetNodeId: 'output_node',
            sourcePort: 'value',
            targetPort: 'value',
            enabled: true
        }
    ]
};

const workflowId = await macroModule.createWorkflow(workflowConfig);
```

## API Reference

### Legacy API (Backward Compatible)

#### `createMacro<T>(moduleAPI, name, type, config): Promise<MacroOutput<T>>`

Creates a single macro instance (legacy method).

```typescript
const midi_cc_input = await macroModule.createMacro(
    moduleAPI,
    'Volume Control',
    'midi_control_change_input',
    { allowLocal: true }
);
```

#### `createMacros<T>(moduleAPI, macros): Promise<MacroOutputs<T>>`

Creates multiple macros in batch (legacy method).

```typescript
const { input, output } = await macroModule.createMacros(moduleAPI, {
    input: {
        type: 'midi_control_change_input',
        config: { allowLocal: true }
    },
    output: {
        type: 'midi_control_change_output', 
        config: {}
    }
});
```

### Dynamic Workflow API

#### `createWorkflow(config): Promise<string>`

Creates a new workflow from configuration.

```typescript
const workflowId = await macroModule.createWorkflow({
    id: 'my_workflow',
    name: 'My Custom Workflow',
    // ... workflow configuration
});
```

#### `updateWorkflow(id, config): Promise<void>`

Updates an existing workflow with hot reloading.

```typescript
await macroModule.updateWorkflow(workflowId, updatedConfig);
```

#### `createWorkflowFromTemplate(templateId, parameters): Promise<string>`

Creates a workflow from a template with parameters.

```typescript
const workflowId = await macroModule.createWorkflowFromTemplate('midi_cc_chain', {
    inputDevice: 'My Controller',
    inputChannel: 1,
    inputCC: 1,
    outputDevice: 'My Synth',
    outputChannel: 1,  
    outputCC: 7,
    minValue: 50,
    maxValue: 100
});
```

#### `workflows$: Observable<Map<string, MacroWorkflowInstance>>`

Observable stream of all active workflows.

```typescript
macroModule.workflows$.subscribe(workflows => {
    console.log(`Active workflows: ${workflows.size}`);
});
```

### Template System

#### Built-in Templates

1. **`midi_cc_chain`**: Maps MIDI CC input to CC output with value range transformation
2. **`midi_thru`**: Simple MIDI passthrough
3. **`keyboard_to_midi`**: Convert computer keyboard to MIDI notes

#### Custom Templates

```typescript
const customTemplate: WorkflowTemplate = {
    id: 'my_custom_template',
    name: 'Custom MIDI Router',
    description: 'Routes MIDI from one input to multiple outputs',
    category: 'routing',
    version: '1.0.0',
    schema: {
        id: 'my_custom_template',
        nodes: {
            input: {
                type: 'midi_control_change_input',
                config: { deviceFilter: '{{inputDevice}}' },
                position: { x: 100, y: 100 }
            },
            output1: {
                type: 'midi_control_change_output', 
                config: { device: '{{output1Device}}' },
                position: { x: 300, y: 50 }
            },
            output2: {
                type: 'midi_control_change_output',
                config: { device: '{{output2Device}}' },
                position: { x: 300, y: 150 }
            }
        },
        connections: [
            {
                from: { nodeId: 'input', port: 'value' },
                to: { nodeId: 'output1', port: 'value' }
            },
            {
                from: { nodeId: 'input', port: 'value' },
                to: { nodeId: 'output2', port: 'value' }
            }
        ]
    },
    configSchema: {
        type: 'object',
        properties: {
            inputDevice: { type: 'string', title: 'Input Device' },
            output1Device: { type: 'string', title: 'Output Device 1' },
            output2Device: { type: 'string', title: 'Output Device 2' }
        },
        required: ['inputDevice', 'output1Device', 'output2Device']
    }
};

macroModule.registerTemplate(customTemplate);
```

## Advanced Usage

### Real-time Performance Monitoring

```typescript
// Monitor workflow performance
macroModule.workflowErrors$.subscribe(error => {
    if (error.type === 'connection') {
        console.warn(`Connection latency: ${error.details.latency}ms`);
    }
});

// Get performance metrics
const workflow = macroModule.getWorkflow('my_workflow_id');
const metrics = workflow?.metrics;
console.log(`Average latency: ${metrics?.averageLatency}ms`);
```

### Custom Validation Rules

```typescript
import { ValidationRule } from './workflow_validation';

const customValidationRule: ValidationRule = {
    id: 'device_availability',
    name: 'Device Availability Check',
    description: 'Ensures all referenced MIDI devices are available',
    validate: async (config) => {
        const errors = [];
        // Check device availability...
        return { valid: errors.length === 0, errors, warnings: [] };
    }
};

// Add custom validation
const validator = new WorkflowValidator(macroTypeDefinitions);
validator.addRule(customValidationRule);
```

### Hot Reloading

```typescript
// Update a workflow without stopping MIDI flow
const updatedConfig = { ...existingConfig };
updatedConfig.nodes[0].config.deviceFilter = 'New Device';

await macroModule.updateWorkflow(workflowId, updatedConfig);
// Workflow continues running with new configuration
```

## Performance Considerations

### MIDI Latency

The system is optimized for real-time MIDI performance:

- **Target latency**: <10ms end-to-end
- **Backpressure handling**: Configurable drop/buffer/throttle strategies  
- **Connection pooling**: Efficient resource management
- **Memory management**: Automatic cleanup of inactive connections

### Scalability

- **Node limit**: Recommended <50 nodes per workflow
- **Connection depth**: Recommended <10 levels deep
- **Concurrent workflows**: No hard limit, depends on system resources

### Configuration

```typescript
const connectionManager = new ReactiveConnectionManager({
    maxLatencyMs: 5,           // Stricter latency for critical applications
    backpressureStrategy: 'drop', // Drop excess messages to maintain real-time
    errorRetryCount: 3,        // Retry failed connections
    metricsCollectionInterval: 1000 // Collect metrics every second
});
```

## Troubleshooting

### Common Issues

1. **High Latency**
   - Check connection chain depth
   - Reduce number of parallel connections
   - Use 'drop' backpressure strategy

2. **Memory Leaks**
   - Ensure workflows are properly destroyed
   - Check for circular references in custom nodes
   - Monitor connection cleanup

3. **Validation Errors**
   - Use workflow validator before deployment
   - Check macro type availability
   - Verify port compatibility

### Debugging

```typescript
// Enable debug logging
macroModule.workflowErrors$.subscribe(error => {
    console.error('Workflow error:', error);
});

// Monitor performance
const workflow = macroModule.getWorkflow('problematic_workflow');
workflow?.onStateChange.subscribe(state => {
    console.log('Workflow state changed:', state);
});
```

## Migration Checklist

- [ ] Test existing macro code still works
- [ ] Run automatic migration: `macroModule.migrateLegacyMacros()`
- [ ] Validate migrated workflows
- [ ] Update persistent state keys if needed
- [ ] Test performance under load
- [ ] Update UI components to use new workflow APIs
- [ ] Create custom templates for common patterns
- [ ] Set up monitoring and error handling

## Future Roadmap

- Visual workflow builder UI component
- Marketplace for sharing workflow templates
- Audio processing node types
- Plugin system for custom macro types
- Cloud sync for workflow configurations
- Advanced analytics and optimization suggestions