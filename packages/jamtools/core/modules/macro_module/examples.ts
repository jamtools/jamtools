/**
 * Comprehensive examples demonstrating the Enhanced Dynamic Macro System
 */

import {
    MacroWorkflowConfig,
    WorkflowTemplate,
    MacroTypeDefinition
} from './dynamic_macro_types';
import {EnhancedMacroModule} from './enhanced_macro_module';
import {ModuleAPI} from 'springboard/engine/module_api';

// ========================================
// Example 1: Simple MIDI CC Chain
// ========================================

export async function createSimpleMidiCCChain(
    macroModule: EnhancedMacroModule,
    inputDevice: string,
    outputDevice: string
): Promise<string> {
    const workflowConfig: MacroWorkflowConfig = {
        id: `cc_chain_${Date.now()}`,
        name: 'Simple MIDI CC Chain',
        description: `Route CC1 from ${inputDevice} to CC7 on ${outputDevice}`,
        enabled: true,
        version: '1.0.0',
        nodes: [
            {
                id: 'cc_input',
                type: 'midi_control_change_input',
                position: { x: 100, y: 100 },
                config: {
                    deviceFilter: inputDevice,
                    channelFilter: 1,
                    ccNumberFilter: 1,
                    allowLocal: true
                },
                customName: 'Volume Input'
            },
            {
                id: 'cc_output',
                type: 'midi_control_change_output',
                position: { x: 400, y: 100 },
                config: {
                    device: outputDevice,
                    channel: 1,
                    ccNumber: 7
                },
                customName: 'Volume Output'
            }
        ],
        connections: [
            {
                id: 'main_connection',
                sourceNodeId: 'cc_input',
                targetNodeId: 'cc_output',
                sourcePort: 'value',
                targetPort: 'value',
                enabled: true,
                metadata: {
                    label: 'Volume Signal',
                    color: '#4CAF50'
                }
            }
        ],
        metadata: {
            tags: ['midi', 'cc', 'simple'],
            author: 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    };

    return await macroModule.createWorkflow(workflowConfig);
}

// ========================================
// Example 2: Complex Multi-Device Router  
// ========================================

export async function createMidiRouter(
    macroModule: EnhancedMacroModule,
    inputDevice: string,
    outputDevices: string[]
): Promise<string> {
    const nodes = [
        {
            id: 'main_input',
            type: 'musical_keyboard_input' as const,
            position: { x: 100, y: 200 },
            config: {
                deviceFilter: inputDevice,
                allowLocal: true
            },
            customName: 'Main Keyboard Input'
        },
        // Create output nodes for each device
        ...outputDevices.map((device, index) => ({
            id: `output_${index}`,
            type: 'musical_keyboard_output' as const,
            position: { x: 500, y: 100 + (index * 150) },
            config: {
                device: device,
                channel: index + 1
            },
            customName: `${device} Output`
        }))
    ];

    const connections = outputDevices.map((_, index) => ({
        id: `connection_${index}`,
        sourceNodeId: 'main_input',
        targetNodeId: `output_${index}`,
        sourcePort: 'event',
        targetPort: 'event',
        enabled: true,
        metadata: {
            label: `To Channel ${index + 1}`,
            color: `hsl(${index * 60}, 70%, 50%)`
        }
    }));

    const workflowConfig: MacroWorkflowConfig = {
        id: `midi_router_${Date.now()}`,
        name: 'MIDI Multi-Device Router',
        description: `Route MIDI from ${inputDevice} to ${outputDevices.length} output devices`,
        enabled: true,
        version: '1.0.0',
        nodes,
        connections,
        layout: {
            zoom: 1.0,
            pan: { x: 0, y: 0 },
            gridSize: 20,
            snapToGrid: true
        },
        metadata: {
            tags: ['midi', 'router', 'multi-device'],
            author: 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    };

    return await macroModule.createWorkflow(workflowConfig);
}

// ========================================
// Example 3: Using Templates
// ========================================

export async function createFromTemplate(
    macroModule: EnhancedMacroModule
): Promise<string> {
    // Use built-in MIDI CC chain template
    return await macroModule.createWorkflowFromTemplate('midi_cc_chain', {
        inputDevice: 'Korg nanoKONTROL2',
        inputChannel: 1,
        inputCC: 1,
        outputDevice: 'Logic Pro',
        outputChannel: 1,
        outputCC: 7,
        minValue: 50,  // Map 0-127 input to 50-100 output
        maxValue: 100
    }, 'Volume Control Chain');
}

// ========================================
// Example 4: Custom Template Creation
// ========================================

export function createCustomDrumMachineTemplate(): WorkflowTemplate {
    return {
        id: 'drum_machine_controller',
        name: 'Drum Machine Controller',
        description: 'Map keyboard keys to drum machine triggers',
        category: 'percussion',
        version: '1.0.0',
        schema: {
            id: 'drum_machine_controller',
            nodes: {
                keyboard: {
                    type: 'qwerty_input', // Custom node type we'd need to create
                    config: {
                        keyMapping: 'drumkit'
                    },
                    position: { x: 100, y: 100 }
                },
                kick_trigger: {
                    type: 'midi_button_output',
                    config: {
                        device: '{{drumMachine}}',
                        channel: 10, // Standard drum channel
                        note: 36 // Kick drum note
                    },
                    position: { x: 400, y: 50 }
                },
                snare_trigger: {
                    type: 'midi_button_output',
                    config: {
                        device: '{{drumMachine}}',
                        channel: 10,
                        note: 38 // Snare drum note  
                    },
                    position: { x: 400, y: 150 }
                },
                hihat_trigger: {
                    type: 'midi_button_output',
                    config: {
                        device: '{{drumMachine}}',
                        channel: 10,
                        note: 42 // Hi-hat note
                    },
                    position: { x: 400, y: 250 }
                }
            },
            connections: [
                {
                    from: { nodeId: 'keyboard', port: 'spacebar' },
                    to: { nodeId: 'kick_trigger', port: 'trigger' }
                },
                {
                    from: { nodeId: 'keyboard', port: 's' },
                    to: { nodeId: 'snare_trigger', port: 'trigger' }
                },
                {
                    from: { nodeId: 'keyboard', port: 'h' },
                    to: { nodeId: 'hihat_trigger', port: 'trigger' }
                }
            ]
        },
        configSchema: {
            type: 'object',
            properties: {
                drumMachine: {
                    type: 'string',
                    title: 'Drum Machine Device',
                    description: 'MIDI device name for the drum machine'
                },
                velocity: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 127,
                    default: 100,
                    title: 'Default Velocity'
                }
            },
            required: ['drumMachine']
        },
        metadata: {
            author: 'jamtools-examples',
            tags: ['drums', 'percussion', 'keyboard'],
            documentation: 'Use your computer keyboard as a drum machine trigger',
            examples: [
                {
                    name: 'Basic Setup',
                    description: 'Basic drum machine triggering',
                    parameters: {
                        drumMachine: 'Battery 4',
                        velocity: 100
                    }
                }
            ]
        }
    };
}

// ========================================
// Example 5: Legacy to Dynamic Migration
// ========================================

export async function migrateLegacySetup(
    macroModule: EnhancedMacroModule,
    moduleAPI: ModuleAPI
): Promise<void> {
    // This shows how existing legacy code can be migrated

    // OLD WAY (still works, but not as flexible):
    const legacyInput = await macroModule.createMacro(
        moduleAPI,
        'MIDI Input',
        'midi_control_change_input',
        { allowLocal: true }
    );
    
    const legacyOutput = await macroModule.createMacro(
        moduleAPI,
        'MIDI Output', 
        'musical_keyboard_output',
        {}
    );

    // OLD connection logic
    legacyInput.subject.subscribe(evt => {
        if (evt.event.value && evt.event.value % 2 === 1) {
            return;
        }
        const noteNumber = (evt.event.value || 0) / 2;
        legacyOutput.send({
            ...evt.event,
            type: 'noteon',
            number: noteNumber,
            velocity: 100,
        });
    });

    // NEW WAY (more flexible, configurable):
    const modernWorkflowId = await macroModule.createWorkflow({
        id: 'migrated_cc_to_notes',
        name: 'CC to Notes Converter',
        description: 'Convert MIDI CC values to note triggers (migrated from legacy)',
        enabled: true,
        version: '1.0.0',
        nodes: [
            {
                id: 'cc_input',
                type: 'midi_control_change_input',
                position: { x: 100, y: 100 },
                config: { allowLocal: true },
                customName: 'CC Input'
            },
            {
                id: 'value_processor',
                type: 'value_processor', // Custom processor node
                position: { x: 300, y: 100 },
                config: {
                    filterOdds: true,
                    divideBy: 2,
                    convertToNote: true
                },
                customName: 'Value Processor'
            },
            {
                id: 'note_output',
                type: 'musical_keyboard_output',
                position: { x: 500, y: 100 },
                config: {},
                customName: 'Note Output'
            }
        ],
        connections: [
            {
                id: 'cc_to_processor',
                sourceNodeId: 'cc_input',
                targetNodeId: 'value_processor',
                sourcePort: 'value',
                targetPort: 'input',
                enabled: true
            },
            {
                id: 'processor_to_output',
                sourceNodeId: 'value_processor',
                targetNodeId: 'note_output',
                sourcePort: 'note',
                targetPort: 'event',
                enabled: true
            }
        ],
        metadata: {
            tags: ['migrated', 'cc-to-notes'],
            author: 'migration-service',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    });

    console.log(`Migrated legacy setup to workflow: ${modernWorkflowId}`);
}

// ========================================
// Example 6: Real-time Workflow Modification
// ========================================

export async function demonstrateHotReloading(
    macroModule: EnhancedMacroModule,
    workflowId: string
): Promise<void> {
    // Get the current workflow
    const workflow = macroModule.getWorkflow(workflowId);
    if (!workflow) {
        throw new Error('Workflow not found');
    }

    const originalConfig = workflow.config;

    // Modify workflow configuration while it's running
    const updatedConfig: MacroWorkflowConfig = {
        ...originalConfig,
        nodes: originalConfig.nodes.map(node => {
            if (node.type === 'midi_control_change_input') {
                return {
                    ...node,
                    config: {
                        ...node.config,
                        ccNumberFilter: 7 // Change from CC1 to CC7
                    }
                };
            }
            return node;
        })
    };

    // Apply the update - workflow continues running with new configuration
    await macroModule.updateWorkflow(workflowId, updatedConfig);
    
    console.log('Workflow updated without interruption!');
}

// ========================================
// Example 7: Performance Monitoring
// ========================================

export function setupPerformanceMonitoring(macroModule: EnhancedMacroModule): void {
    // Monitor all workflow errors
    macroModule.workflowErrors$.subscribe(error => {
        console.error(`Workflow Error [${error.workflowId}]:`, {
            type: error.type,
            message: error.message,
            nodeId: error.nodeId,
            connectionId: error.connectionId,
            timestamp: error.timestamp
        });

        // Handle specific error types
        switch (error.type) {
            case 'connection':
                console.warn('Connection error - check MIDI device availability');
                break;
            case 'validation':
                console.error('Configuration validation failed');
                break;
            case 'runtime':
                console.error('Runtime error - workflow may need restart');
                break;
        }
    });

    // Monitor workflow state changes
    macroModule.workflows$.subscribe(workflows => {
        for (const [id, instance] of workflows) {
            const metrics = instance.metrics;
            
            // Log performance warnings
            if (metrics.averageLatency > 10) {
                console.warn(`High latency in workflow ${id}: ${metrics.averageLatency}ms`);
            }
            
            if (metrics.errorRate > 0.01) {
                console.warn(`High error rate in workflow ${id}: ${metrics.errorRate * 100}%`);
            }

            // Log throughput
            console.log(`Workflow ${id}: ${metrics.totalMessages} messages, ${metrics.averageLatency}ms latency`);
        }
    });
}

// ========================================
// Example 8: Custom Validation Rules
// ========================================

export function createCustomValidationRules() {
    return [
        {
            id: 'midi_device_check',
            name: 'MIDI Device Availability',
            description: 'Verify that all MIDI devices referenced in the workflow are available',
            validate: async (config: MacroWorkflowConfig) => {
                const errors = [];
                const warnings = [];

                // Check each node for device references
                for (const node of config.nodes) {
                    if (node.config.device || node.config.deviceFilter) {
                        const deviceName = node.config.device || node.config.deviceFilter;
                        
                        // In real implementation, check if device is actually available
                        const isAvailable = await checkMidiDeviceAvailable(deviceName);
                        
                        if (!isAvailable) {
                            errors.push({
                                path: `nodes.${node.id}.config`,
                                message: `MIDI device '${deviceName}' is not available`,
                                code: 'DEVICE_NOT_AVAILABLE',
                                severity: 'error' as const
                            });
                        }
                    }
                }

                return { valid: errors.length === 0, errors, warnings };
            }
        },
        {
            id: 'performance_check',
            name: 'Performance Validation',
            description: 'Check for potential performance issues',
            validate: (config: MacroWorkflowConfig) => {
                const warnings = [];

                // Check for excessive fan-out
                const outgoingConnections = new Map<string, number>();
                for (const connection of config.connections) {
                    const count = outgoingConnections.get(connection.sourceNodeId) || 0;
                    outgoingConnections.set(connection.sourceNodeId, count + 1);
                }

                for (const [nodeId, count] of outgoingConnections) {
                    if (count > 5) {
                        warnings.push({
                            path: `nodes.${nodeId}`,
                            message: `Node has ${count} outgoing connections, may cause latency`,
                            code: 'HIGH_FANOUT',
                            severity: 'warning' as const
                        });
                    }
                }

                return { valid: true, errors: [], warnings };
            }
        }
    ];
}

// Mock function for device availability check
async function checkMidiDeviceAvailable(deviceName: string): Promise<boolean> {
    // In real implementation, this would check actual MIDI device availability
    // For example, query the system's MIDI devices
    return Promise.resolve(true); // Mock: assume device is available
}

// ========================================
// Example 9: Workflow Builder UI Integration
// ========================================

export interface WorkflowBuilderProps {
    macroModule: EnhancedMacroModule;
    workflowId?: string;
    onSave?: (workflow: MacroWorkflowConfig) => void;
}

export function createWorkflowBuilderExample(props: WorkflowBuilderProps) {
    // This would be a React component in practice
    return {
        // Component methods for workflow builder
        async loadWorkflow(id: string) {
            const workflow = props.macroModule.getWorkflow(id);
            return workflow?.config;
        },

        async saveWorkflow(config: MacroWorkflowConfig) {
            // Validate before saving
            const validation = await props.macroModule.validateWorkflow(config);
            
            if (!validation.valid) {
                throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
            }

            // Save workflow
            if (config.id && props.macroModule.getWorkflow(config.id)) {
                await props.macroModule.updateWorkflow(config.id, config);
            } else {
                await props.macroModule.createWorkflow(config);
            }

            props.onSave?.(config);
        },

        async deleteWorkflow(id: string) {
            await props.macroModule.deleteWorkflow(id);
        },

        getAvailableNodeTypes() {
            // In practice, this would get registered macro types
            return [
                'midi_control_change_input',
                'midi_control_change_output',
                'musical_keyboard_input',
                'musical_keyboard_output',
                'midi_button_input',
                'midi_button_output'
            ];
        },

        validateConnection(sourceNode: string, sourcePort: string, targetNode: string, targetPort: string) {
            // Validate if connection is possible
            // This would use the workflow validator
            return true; // Simplified
        }
    };
}

// ========================================
// Example 10: Complete Application Setup
// ========================================

export async function setupCompleteApplication(macroModule: EnhancedMacroModule) {
    // 1. Register custom templates
    const drumTemplate = createCustomDrumMachineTemplate();
    macroModule.registerTemplate(drumTemplate);

    // 2. Set up monitoring
    setupPerformanceMonitoring(macroModule);

    // 3. Create some default workflows
    const defaultWorkflows = await Promise.all([
        createFromTemplate(macroModule),
        createSimpleMidiCCChain(macroModule, 'USB MIDI Device', 'IAC Driver Bus 1'),
        createMidiRouter(macroModule, 'Keyboard', ['Synth 1', 'Synth 2', 'Drum Machine'])
    ]);

    console.log(`Created ${defaultWorkflows.length} default workflows:`, defaultWorkflows);

    // 4. Set up automatic migration for legacy macros
    try {
        await macroModule.migrateLegacyMacros();
        console.log('Legacy macro migration completed successfully');
    } catch (error) {
        console.error('Legacy migration failed:', error);
    }

    return {
        workflowIds: defaultWorkflows,
        templates: [drumTemplate],
        monitoring: true
    };
}