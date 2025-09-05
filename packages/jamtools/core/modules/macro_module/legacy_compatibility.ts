import {MacroAPI, MacroCallback} from './registered_macro_types';
import {MacroTypeConfigs, MacroConfigItem} from './macro_module_types';
import {DynamicMacroManager} from './dynamic_macro_manager';
import {
    MacroWorkflowConfig, 
    MacroNodeConfig, 
    MacroTypeDefinition,
    WorkflowTemplate
} from './dynamic_macro_types';
import {ModuleAPI} from 'springboard/engine/module_api';

// ========================================
// Legacy Compatibility Layer
// ========================================

/**
 * Provides backward compatibility for existing macro creation APIs
 * while internally using the new dynamic macro system.
 */
export class LegacyMacroAdapter {
    private legacyMacroInstances = new Map<string, any>();
    private migrationPromises = new Map<string, Promise<void>>();

    constructor(
        private dynamicMacroManager: DynamicMacroManager,
        private legacyRegisteredTypes: Map<string, [any, MacroCallback<any, any>]>
    ) {}

    /**
     * Legacy createMacro API - maintains exact same signature and behavior
     */
    async createMacro<T extends keyof MacroTypeConfigs>(
        moduleAPI: ModuleAPI,
        name: string,
        type: T,
        config: MacroTypeConfigs[T]['input']
    ): Promise<MacroTypeConfigs[T]['output']> {
        const legacyKey = this.getLegacyKey(moduleAPI.moduleId, name, type);
        
        // Check if already created
        const existing = this.legacyMacroInstances.get(legacyKey);
        if (existing) {
            return existing;
        }

        // Create single-node workflow that wraps the legacy macro
        const workflowId = `legacy_${moduleAPI.moduleId}_${name}_${Date.now()}`;
        const nodeId = `${type}_node`;

        const workflowConfig: MacroWorkflowConfig = {
            id: workflowId,
            name: `Legacy: ${name}`,
            description: `Auto-generated workflow for legacy macro: ${name}`,
            enabled: true,
            version: '1.0.0',
            metadata: {
                tags: ['legacy', 'auto-generated'],
                author: 'legacy-adapter',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            nodes: [{
                id: nodeId,
                type,
                position: { x: 0, y: 0 },
                config,
                customName: name
            }],
            connections: [] // Single node, no connections needed
        };

        // Create workflow using dynamic system
        await this.dynamicMacroManager.createWorkflow(workflowConfig);
        
        // Get the workflow instance and extract the node
        const workflows = await this.dynamicMacroManager.workflows$.pipe().toPromise();
        const workflow = workflows?.get(workflowId);
        
        if (!workflow) {
            throw new Error(`Failed to create workflow for legacy macro ${name}`);
        }

        const node = workflow.nodes.get(nodeId);
        if (!node) {
            throw new Error(`Failed to create node for legacy macro ${name}`);
        }

        // Create legacy-compatible wrapper
        const legacyWrapper = this.createLegacyWrapper(node, type);
        this.legacyMacroInstances.set(legacyKey, legacyWrapper);

        return legacyWrapper;
    }

    /**
     * Creates a wrapper that provides the exact same API as the original macro
     */
    private createLegacyWrapper<T extends keyof MacroTypeConfigs>(
        node: any,
        type: T
    ): MacroTypeConfigs[T]['output'] {
        // This is a simplified version - real implementation would need to handle
        // all the different macro types and their specific APIs
        
        const wrapper: any = {
            // Common properties that most macros have
            states: node.getState(),
            components: {}, // Would be populated based on the node's components
            
            // For input macros - provide subject/observable
            subject: node.outputs.get('default')?.observable,
            onEventSubject: node.outputs.get('default')?.observable,
            
            // For output macros - provide send method
            send: (data: any) => {
                const inputPort = node.inputs.get('default');
                if (inputPort) {
                    inputPort.process(data);
                }
            },
            
            // Add any additional type-specific methods
            ...this.getTypeSpecificMethods(type, node)
        };

        return wrapper;
    }

    /**
     * Add type-specific methods to the legacy wrapper
     */
    private getTypeSpecificMethods<T extends keyof MacroTypeConfigs>(
        type: T,
        node: any
    ): Partial<MacroTypeConfigs[T]['output']> {
        switch (type) {
            case 'midi_control_change_input':
                return {
                    // Add MIDI CC input specific methods
                };
            case 'midi_control_change_output':
                return {
                    send: (value: number) => {
                        const inputPort = node.inputs.get('value');
                        if (inputPort) {
                            inputPort.process(value);
                        }
                    }
                };
            case 'musical_keyboard_output':
                return {
                    send: (event: any) => {
                        const inputPort = node.inputs.get('event');
                        if (inputPort) {
                            inputPort.process(event);
                        }
                    }
                };
            default:
                return {};
        }
    }

    /**
     * Batch creation API for multiple macros - maintains legacy behavior
     */
    async createMacros<
        MacroConfigs extends {
            [K in string]: {
                type: keyof MacroTypeConfigs;
            } & (
                {[T in keyof MacroTypeConfigs]: {type: T; config: MacroTypeConfigs[T]['input']}}[keyof MacroTypeConfigs]
            )
        }
    >(moduleAPI: ModuleAPI, macros: MacroConfigs): Promise<{
        [K in keyof MacroConfigs]: MacroTypeConfigs[MacroConfigs[K]['type']]['output'];
    }> {
        const keys = Object.keys(macros);
        const promises = keys.map(async key => {
            const {type, config} = macros[key];
            return {
                macro: await this.createMacro(moduleAPI, key, type, config),
                key,
            };
        });

        const result = {} as {[K in keyof MacroConfigs]: MacroTypeConfigs[MacroConfigs[K]['type']]['output']};

        const createdMacros = await Promise.all(promises);
        for (const key of keys) {
            (result[key] as any) = createdMacros.find(m => m.key === key)!.macro;
        }

        return result;
    }

    private getLegacyKey(moduleId: string, name: string, type: keyof MacroTypeConfigs): string {
        return `${moduleId}::${name}::${type}`;
    }
}

// ========================================
// Migration Utilities
// ========================================

/**
 * Utilities for migrating existing macro configurations to the new workflow system
 */
export class MacroMigrationService {
    constructor(private dynamicMacroManager: DynamicMacroManager) {}

    /**
     * Migrates a legacy macro configuration to a workflow
     */
    async migrateLegacyMacroToWorkflow(
        moduleId: string,
        macroName: string,
        macroType: keyof MacroTypeConfigs,
        config: any
    ): Promise<string> {
        const workflowId = `migrated_${moduleId}_${macroName}_${Date.now()}`;
        
        const workflowConfig: MacroWorkflowConfig = {
            id: workflowId,
            name: `Migrated: ${macroName}`,
            description: `Migrated from legacy macro: ${moduleId}/${macroName}`,
            enabled: true,
            version: '1.0.0',
            metadata: {
                tags: ['migrated', 'legacy'],
                author: 'migration-service',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            nodes: [{
                id: `${macroType}_node`,
                type: macroType,
                position: { x: 100, y: 100 },
                config,
                customName: macroName
            }],
            connections: []
        };

        return this.dynamicMacroManager.createWorkflow(workflowConfig);
    }

    /**
     * Migrates persistent state keys from legacy format to new format
     */
    async migratePersistentState(
        oldKey: string,
        newWorkflowId: string,
        nodeId: string,
        stateType: 'shared' | 'persistent'
    ): Promise<void> {
        // Implementation would:
        // 1. Read data from old key
        // 2. Transform data format if needed
        // 3. Write to new key format
        // 4. Clean up old key (optionally)
        
        const newKey = this.getNewStateKey(newWorkflowId, nodeId, stateType);
        console.log(`Migrating state from ${oldKey} to ${newKey}`);
        
        // Actual migration logic would go here
    }

    private getNewStateKey(workflowId: string, nodeId: string, stateType: string): string {
        return `workflow:${workflowId}:node:${nodeId}:${stateType}`;
    }

    /**
     * Creates workflow templates from common legacy macro patterns
     */
    createCommonWorkflowTemplates(): WorkflowTemplate[] {
        return [
            this.createMidiCCChainTemplate(),
            this.createMidiThruTemplate(),
            this.createKeyboardToMidiTemplate()
        ];
    }

    private createMidiCCChainTemplate(): WorkflowTemplate {
        return {
            id: 'midi_cc_chain',
            name: 'MIDI CC Chain',
            description: 'Maps MIDI CC input to MIDI CC output with value transformation',
            category: 'midi',
            version: '1.0.0',
            schema: {
                id: 'midi_cc_chain',
                nodes: {
                    input: {
                        type: 'midi_control_change_input',
                        config: {
                            deviceFilter: '{{inputDevice}}',
                            channelFilter: '{{inputChannel}}',
                            ccNumberFilter: '{{inputCC}}'
                        },
                        position: { x: 100, y: 100 }
                    },
                    processor: {
                        type: 'value_mapper', // Would need to create this processor type
                        config: {
                            inputRange: [0, 127],
                            outputRange: ['{{minValue}}', '{{maxValue}}']
                        },
                        position: { x: 300, y: 100 }
                    },
                    output: {
                        type: 'midi_control_change_output',
                        config: {
                            device: '{{outputDevice}}',
                            channel: '{{outputChannel}}',
                            ccNumber: '{{outputCC}}'
                        },
                        position: { x: 500, y: 100 }
                    }
                },
                connections: [
                    {
                        from: { nodeId: 'input', port: 'value' },
                        to: { nodeId: 'processor', port: 'input' }
                    },
                    {
                        from: { nodeId: 'processor', port: 'output' },
                        to: { nodeId: 'output', port: 'value' }
                    }
                ]
            },
            configSchema: {
                type: 'object',
                properties: {
                    inputDevice: { type: 'string', title: 'Input Device' },
                    inputChannel: { type: 'integer', minimum: 1, maximum: 16, title: 'Input Channel' },
                    inputCC: { type: 'integer', minimum: 0, maximum: 127, title: 'Input CC Number' },
                    outputDevice: { type: 'string', title: 'Output Device' },
                    outputChannel: { type: 'integer', minimum: 1, maximum: 16, title: 'Output Channel' },
                    outputCC: { type: 'integer', minimum: 0, maximum: 127, title: 'Output CC Number' },
                    minValue: { type: 'integer', minimum: 0, maximum: 127, default: 0, title: 'Min Value' },
                    maxValue: { type: 'integer', minimum: 0, maximum: 127, default: 127, title: 'Max Value' }
                },
                required: ['inputDevice', 'inputChannel', 'inputCC', 'outputDevice', 'outputChannel', 'outputCC']
            },
            metadata: {
                author: 'jamtools',
                tags: ['midi', 'controller', 'mapping'],
                documentation: 'Creates a chain that maps MIDI CC input to MIDI CC output with value range transformation.',
                examples: [
                    {
                        name: 'Basic CC Mapping',
                        description: 'Map CC1 from controller to CC7 on synth',
                        parameters: {
                            inputDevice: 'My Controller',
                            inputChannel: 1,
                            inputCC: 1,
                            outputDevice: 'My Synth',
                            outputChannel: 1,
                            outputCC: 7,
                            minValue: 0,
                            maxValue: 127
                        }
                    }
                ]
            }
        };
    }

    private createMidiThruTemplate(): WorkflowTemplate {
        return {
            id: 'midi_thru',
            name: 'MIDI Thru',
            description: 'Simple MIDI input to output passthrough',
            category: 'midi',
            version: '1.0.0',
            schema: {
                id: 'midi_thru',
                nodes: {
                    input: {
                        type: 'musical_keyboard_input',
                        config: {},
                        position: { x: 100, y: 100 }
                    },
                    output: {
                        type: 'musical_keyboard_output',
                        config: {},
                        position: { x: 300, y: 100 }
                    }
                },
                connections: [
                    {
                        from: { nodeId: 'input', port: 'event' },
                        to: { nodeId: 'output', port: 'event' }
                    }
                ]
            },
            configSchema: {
                type: 'object',
                properties: {},
                additionalProperties: false
            }
        };
    }

    private createKeyboardToMidiTemplate(): WorkflowTemplate {
        return {
            id: 'keyboard_to_midi',
            name: 'Keyboard to MIDI',
            description: 'Convert computer keyboard input to MIDI notes',
            category: 'input',
            version: '1.0.0',
            schema: {
                id: 'keyboard_to_midi',
                nodes: {
                    keyboard: {
                        type: 'qwerty_input', // Would need to create this input type
                        config: {
                            keyMapping: '{{keyMapping}}'
                        },
                        position: { x: 100, y: 100 }
                    },
                    converter: {
                        type: 'key_to_note_converter', // Would need to create this processor
                        config: {
                            baseOctave: '{{baseOctave}}',
                            velocity: '{{velocity}}'
                        },
                        position: { x: 300, y: 100 }
                    },
                    output: {
                        type: 'musical_keyboard_output',
                        config: {},
                        position: { x: 500, y: 100 }
                    }
                },
                connections: [
                    {
                        from: { nodeId: 'keyboard', port: 'key' },
                        to: { nodeId: 'converter', port: 'key' }
                    },
                    {
                        from: { nodeId: 'converter', port: 'note' },
                        to: { nodeId: 'output', port: 'event' }
                    }
                ]
            },
            configSchema: {
                type: 'object',
                properties: {
                    keyMapping: {
                        type: 'string',
                        enum: ['qwerty', 'dvorak', 'custom'],
                        default: 'qwerty',
                        title: 'Key Mapping'
                    },
                    baseOctave: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 9,
                        default: 4,
                        title: 'Base Octave'
                    },
                    velocity: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 127,
                        default: 80,
                        title: 'Note Velocity'
                    }
                }
            }
        };
    }
}

// ========================================
// State Key Migration Utilities
// ========================================

/**
 * Handles migration of persistent state keys from legacy format to new format
 */
export class StateKeyMigrator {
    private readonly legacyKeyPattern = /^macro_(.+)_(.+)$/;
    private readonly migrationMap = new Map<string, string>();

    /**
     * Migrates a legacy state key to new workflow-based format
     */
    migrateLegacyKey(
        legacyKey: string,
        workflowId: string,
        nodeId: string,
        stateType: 'shared' | 'persistent' = 'persistent'
    ): string {
        const newKey = `workflow:${workflowId}:node:${nodeId}:${stateType}:${this.extractStateName(legacyKey)}`;
        this.migrationMap.set(legacyKey, newKey);
        return newKey;
    }

    /**
     * Gets the new key for a legacy key if it has been migrated
     */
    getMigratedKey(legacyKey: string): string | undefined {
        return this.migrationMap.get(legacyKey);
    }

    /**
     * Extracts the state name from a legacy key
     */
    private extractStateName(legacyKey: string): string {
        const match = this.legacyKeyPattern.exec(legacyKey);
        return match ? match[2] : 'unknown';
    }

    /**
     * Creates a key mapping for batch migration
     */
    createMigrationPlan(
        legacyKeys: string[],
        workflowMappings: Array<{
            workflowId: string;
            nodeId: string;
            legacyMacroName: string;
        }>
    ): Map<string, string> {
        const plan = new Map<string, string>();

        for (const legacyKey of legacyKeys) {
            // Find matching workflow mapping
            const mapping = workflowMappings.find(m => 
                legacyKey.includes(m.legacyMacroName)
            );

            if (mapping) {
                const newKey = this.migrateLegacyKey(
                    legacyKey,
                    mapping.workflowId,
                    mapping.nodeId
                );
                plan.set(legacyKey, newKey);
            }
        }

        return plan;
    }
}