/**
 * Comprehensive test suite for the Enhanced Dynamic Macro System
 */

import {describe, it, expect, beforeEach, afterEach, vi, Mock} from 'vitest';
import {Subject, BehaviorSubject} from 'rxjs';

import {DynamicMacroManager} from './dynamic_macro_manager';
import {WorkflowValidator} from './workflow_validation';
import {LegacyMacroAdapter} from './legacy_compatibility';
import {ReactiveConnectionManager} from './reactive_connection_system';
import {
    MacroWorkflowConfig,
    MacroNodeConfig,
    MacroTypeDefinition,
    WorkflowTemplate,
    ValidationResult
} from './dynamic_macro_types';
import {MacroAPI} from './registered_macro_types';

// ========================================
// Mock Setup
// ========================================

const mockMacroAPI: MacroAPI = {
    moduleAPI: {} as any,
    midiIO: {
        midiInputSubject: new Subject(),
        sendMidiEvent: vi.fn()
    } as any,
    statesAPI: {
        createSharedState: vi.fn().mockResolvedValue(new BehaviorSubject(null)),
        createPersistentState: vi.fn().mockResolvedValue(new BehaviorSubject([]))
    },
    createAction: vi.fn(),
    isMidiMaestro: vi.fn().mockReturnValue(true),
    onDestroy: vi.fn(),
    createMacro: vi.fn()
};

const mockMacroTypeDefinition: MacroTypeDefinition = {
    id: 'midi_control_change_input',
    displayName: 'MIDI CC Input',
    description: 'Captures MIDI control change messages',
    category: 'input',
    configSchema: {
        type: 'object',
        properties: {
            deviceFilter: { type: 'string' },
            channelFilter: { type: 'integer', minimum: 1, maximum: 16 },
            ccNumberFilter: { type: 'integer', minimum: 0, maximum: 127 }
        }
    },
    inputs: [],
    outputs: [{
        id: 'value',
        name: 'CC Value',
        type: 'output',
        dataType: 'control_value',
        required: false
    }]
};

const validWorkflowConfig: MacroWorkflowConfig = {
    id: 'test_workflow',
    name: 'Test Workflow',
    description: 'A test workflow',
    enabled: true,
    version: '1.0.0',
    nodes: [{
        id: 'input_node',
        type: 'midi_control_change_input',
        position: { x: 100, y: 100 },
        config: {
            deviceFilter: 'Test Device',
            channelFilter: 1,
            ccNumberFilter: 1
        }
    }],
    connections: [],
    metadata: {
        tags: ['test'],
        author: 'test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
};

// ========================================
// Dynamic Macro Manager Tests
// ========================================

describe('DynamicMacroManager', () => {
    let manager: DynamicMacroManager;
    let mockValidator: WorkflowValidator;

    beforeEach(() => {
        mockValidator = {
            validateWorkflow: vi.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
            validateTemplate: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] })
        } as any;

        manager = new DynamicMacroManager(mockMacroAPI, {
            validationProvider: mockValidator
        });

        const macroTypeDefinitions = new Map([
            ['midi_control_change_input', mockMacroTypeDefinition]
        ]);
        
        manager.registerMacroTypeDefinition(mockMacroTypeDefinition);
    });

    afterEach(async () => {
        await manager.destroy();
    });

    describe('Workflow Lifecycle', () => {
        it('should create a workflow successfully', async () => {
            const workflowId = await manager.createWorkflow(validWorkflowConfig);
            
            expect(workflowId).toBe('test_workflow');
            expect(mockValidator.validateWorkflow).toHaveBeenCalledWith(validWorkflowConfig);
        });

        it('should reject invalid workflow configurations', async () => {
            const invalidConfig = { ...validWorkflowConfig };
            delete (invalidConfig as any).id;
            
            (mockValidator.validateWorkflow as Mock).mockResolvedValueOnce({
                valid: false,
                errors: [{ path: 'id', message: 'ID is required', code: 'MISSING_ID', severity: 'error' }],
                warnings: []
            });

            await expect(manager.createWorkflow(invalidConfig)).rejects.toThrow('Invalid workflow configuration');
        });

        it('should update workflow configuration', async () => {
            await manager.createWorkflow(validWorkflowConfig);
            
            const updatedConfig = {
                ...validWorkflowConfig,
                name: 'Updated Workflow'
            };

            await expect(manager.updateWorkflow('test_workflow', updatedConfig)).resolves.not.toThrow();
        });

        it('should delete workflows', async () => {
            await manager.createWorkflow(validWorkflowConfig);
            await expect(manager.deleteWorkflow('test_workflow')).resolves.not.toThrow();
        });

        it('should handle deletion of non-existent workflows gracefully', async () => {
            await expect(manager.deleteWorkflow('non_existent')).resolves.not.toThrow();
        });
    });

    describe('Template System', () => {
        const testTemplate: WorkflowTemplate = {
            id: 'test_template',
            name: 'Test Template',
            description: 'A test template',
            category: 'test',
            version: '1.0.0',
            schema: {
                id: 'test_template',
                nodes: {
                    input: {
                        type: 'midi_control_change_input',
                        config: { deviceFilter: '{{device}}' },
                        position: { x: 100, y: 100 }
                    }
                },
                connections: []
            },
            configSchema: {
                type: 'object',
                properties: {
                    device: { type: 'string' }
                },
                required: ['device']
            }
        };

        it('should register templates', () => {
            expect(() => manager.registerWorkflowTemplate(testTemplate)).not.toThrow();
        });

        it('should create workflows from templates', async () => {
            manager.registerWorkflowTemplate(testTemplate);
            
            const workflowId = await manager.createWorkflowFromTemplate('test_template', {
                device: 'Test Device'
            });

            expect(workflowId).toBeDefined();
            expect(typeof workflowId).toBe('string');
        });

        it('should validate template parameters', async () => {
            manager.registerWorkflowTemplate(testTemplate);
            
            await expect(
                manager.createWorkflowFromTemplate('test_template', {}) // Missing required 'device' parameter
            ).rejects.toThrow('Invalid parameters');
        });
    });

    describe('Hot Reloading', () => {
        it('should rehydrate workflows without errors', async () => {
            await manager.createWorkflow(validWorkflowConfig);
            await expect(manager.rehydrateAllWorkflows()).resolves.not.toThrow();
        });

        it('should rehydrate specific workflows', async () => {
            await manager.createWorkflow(validWorkflowConfig);
            await expect(manager.rehydrateWorkflow('test_workflow')).resolves.not.toThrow();
        });

        it('should handle rehydration of non-existent workflows', async () => {
            await expect(manager.rehydrateWorkflow('non_existent')).rejects.toThrow('Workflow non_existent not found');
        });
    });

    describe('Observables', () => {
        it('should emit workflow changes', async () => {
            const workflowsPromise = manager.workflows$.pipe().toPromise();
            
            await manager.createWorkflow(validWorkflowConfig);
            
            const workflows = await workflowsPromise;
            expect(workflows?.size).toBe(1);
            expect(workflows?.has('test_workflow')).toBe(true);
        });

        it('should emit errors', (done) => {
            manager.errors$.subscribe(error => {
                expect(error.type).toBeDefined();
                expect(error.message).toBeDefined();
                done();
            });

            // Trigger an error by creating invalid workflow
            (mockValidator.validateWorkflow as Mock).mockResolvedValueOnce({
                valid: false,
                errors: [{ path: 'test', message: 'test error', code: 'TEST', severity: 'error' }],
                warnings: []
            });

            manager.createWorkflow(validWorkflowConfig).catch(() => {
                // Expected to fail
            });
        });
    });
});

// ========================================
// Workflow Validator Tests  
// ========================================

describe('WorkflowValidator', () => {
    let validator: WorkflowValidator;

    beforeEach(() => {
        const macroTypeDefinitions = new Map([
            ['midi_control_change_input', mockMacroTypeDefinition],
            ['midi_control_change_output', {
                ...mockMacroTypeDefinition,
                id: 'midi_control_change_output',
                category: 'output',
                inputs: [{
                    id: 'value',
                    name: 'CC Value',
                    type: 'input',
                    dataType: 'control_value',
                    required: true
                }],
                outputs: []
            }]
        ]);

        validator = new WorkflowValidator(macroTypeDefinitions);
    });

    describe('Workflow Structure Validation', () => {
        it('should validate valid workflows', async () => {
            const result = await validator.validateWorkflow(validWorkflowConfig);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect missing required fields', async () => {
            const invalidConfig = { ...validWorkflowConfig };
            delete (invalidConfig as any).id;

            const result = await validator.validateWorkflow(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'MISSING_ID')).toBe(true);
        });

        it('should validate ID format', async () => {
            const invalidConfig = {
                ...validWorkflowConfig,
                id: 'invalid id with spaces!'
            };

            const result = await validator.validateWorkflow(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'INVALID_ID_FORMAT')).toBe(true);
        });

        it('should validate version format', async () => {
            const invalidConfig = {
                ...validWorkflowConfig,
                version: 'invalid-version'
            };

            const result = await validator.validateWorkflow(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'INVALID_VERSION_FORMAT')).toBe(true);
        });
    });

    describe('Node Validation', () => {
        it('should detect duplicate node IDs', async () => {
            const configWithDuplicates = {
                ...validWorkflowConfig,
                nodes: [
                    validWorkflowConfig.nodes[0],
                    { ...validWorkflowConfig.nodes[0] } // Same ID
                ]
            };

            const result = await validator.validateWorkflow(configWithDuplicates);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'DUPLICATE_NODE_ID')).toBe(true);
        });

        it('should detect unknown macro types', async () => {
            const configWithUnknownType = {
                ...validWorkflowConfig,
                nodes: [{
                    ...validWorkflowConfig.nodes[0],
                    type: 'unknown_macro_type' as any
                }]
            };

            const result = await validator.validateWorkflow(configWithUnknownType);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'UNKNOWN_MACRO_TYPE')).toBe(true);
        });

        it('should validate node positions', async () => {
            const configWithInvalidPosition = {
                ...validWorkflowConfig,
                nodes: [{
                    ...validWorkflowConfig.nodes[0],
                    position: { x: 'invalid', y: 100 } as any
                }]
            };

            const result = await validator.validateWorkflow(configWithInvalidPosition);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'INVALID_POSITION')).toBe(true);
        });
    });

    describe('Connection Validation', () => {
        const workflowWithConnections: MacroWorkflowConfig = {
            ...validWorkflowConfig,
            nodes: [
                {
                    id: 'input_node',
                    type: 'midi_control_change_input',
                    position: { x: 100, y: 100 },
                    config: {}
                },
                {
                    id: 'output_node',
                    type: 'midi_control_change_output',
                    position: { x: 300, y: 100 },
                    config: {}
                }
            ],
            connections: [{
                id: 'connection_1',
                sourceNodeId: 'input_node',
                targetNodeId: 'output_node',
                sourcePort: 'value',
                targetPort: 'value',
                enabled: true
            }]
        };

        it('should validate valid connections', async () => {
            const result = await validator.validateWorkflow(workflowWithConnections);
            expect(result.valid).toBe(true);
        });

        it('should detect missing source nodes', async () => {
            const invalidConfig = {
                ...workflowWithConnections,
                connections: [{
                    ...workflowWithConnections.connections[0],
                    sourceNodeId: 'non_existent_node'
                }]
            };

            const result = await validator.validateWorkflow(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'SOURCE_NODE_NOT_FOUND')).toBe(true);
        });

        it('should detect missing target nodes', async () => {
            const invalidConfig = {
                ...workflowWithConnections,
                connections: [{
                    ...workflowWithConnections.connections[0],
                    targetNodeId: 'non_existent_node'
                }]
            };

            const result = await validator.validateWorkflow(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'TARGET_NODE_NOT_FOUND')).toBe(true);
        });

        it('should detect duplicate connection IDs', async () => {
            const invalidConfig = {
                ...workflowWithConnections,
                connections: [
                    workflowWithConnections.connections[0],
                    { ...workflowWithConnections.connections[0] } // Same ID
                ]
            };

            const result = await validator.validateWorkflow(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'DUPLICATE_CONNECTION_ID')).toBe(true);
        });
    });

    describe('Circular Dependency Detection', () => {
        it('should detect circular dependencies', async () => {
            const circularConfig: MacroWorkflowConfig = {
                ...validWorkflowConfig,
                nodes: [
                    { id: 'node1', type: 'midi_control_change_input', position: { x: 0, y: 0 }, config: {} },
                    { id: 'node2', type: 'midi_control_change_output', position: { x: 100, y: 0 }, config: {} },
                    { id: 'node3', type: 'midi_control_change_input', position: { x: 200, y: 0 }, config: {} }
                ],
                connections: [
                    { id: 'conn1', sourceNodeId: 'node1', targetNodeId: 'node2', sourcePort: 'value', targetPort: 'value', enabled: true },
                    { id: 'conn2', sourceNodeId: 'node2', targetNodeId: 'node3', sourcePort: 'value', targetPort: 'value', enabled: true },
                    { id: 'conn3', sourceNodeId: 'node3', targetNodeId: 'node1', sourcePort: 'value', targetPort: 'value', enabled: true } // Creates cycle
                ]
            };

            const result = await validator.validateWorkflow(circularConfig);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
        });
    });

    describe('Performance Validation', () => {
        it('should warn about high connection counts', async () => {
            const manyConnectionsConfig: MacroWorkflowConfig = {
                ...validWorkflowConfig,
                nodes: [
                    { id: 'source', type: 'midi_control_change_input', position: { x: 0, y: 0 }, config: {} },
                    ...Array.from({ length: 15 }, (_, i) => ({
                        id: `target_${i}`,
                        type: 'midi_control_change_output',
                        position: { x: 200 + i * 50, y: 0 },
                        config: {}
                    }))
                ],
                connections: Array.from({ length: 15 }, (_, i) => ({
                    id: `conn_${i}`,
                    sourceNodeId: 'source',
                    targetNodeId: `target_${i}`,
                    sourcePort: 'value',
                    targetPort: 'value',
                    enabled: true
                }))
            };

            const result = await validator.validateWorkflow(manyConnectionsConfig);
            expect(result.warnings.some(w => w.code === 'HIGH_CONNECTION_COUNT')).toBe(true);
        });

        it('should warn about high node counts', async () => {
            const manyNodesConfig: MacroWorkflowConfig = {
                ...validWorkflowConfig,
                nodes: Array.from({ length: 60 }, (_, i) => ({
                    id: `node_${i}`,
                    type: 'midi_control_change_input',
                    position: { x: i * 50, y: 0 },
                    config: {}
                })),
                connections: []
            };

            const result = await validator.validateWorkflow(manyNodesConfig);
            expect(result.warnings.some(w => w.code === 'HIGH_NODE_COUNT')).toBe(true);
        });
    });
});

// ========================================
// Legacy Compatibility Tests
// ========================================

describe('LegacyMacroAdapter', () => {
    let adapter: LegacyMacroAdapter;
    let mockDynamicManager: DynamicMacroManager;
    let mockModuleAPI: any;

    beforeEach(() => {
        mockDynamicManager = {
            createWorkflow: vi.fn().mockResolvedValue('workflow_id'),
            workflows$: {
                pipe: vi.fn().mockReturnValue({
                    toPromise: vi.fn().mockResolvedValue(new Map([
                        ['workflow_id', {
                            nodes: new Map([
                                ['node_id', {
                                    outputs: new Map([
                                        ['default', { observable: new Subject() }]
                                    ]),
                                    inputs: new Map([
                                        ['default', { process: vi.fn() }]
                                    ])
                                }]
                            ])
                        }]
                    ]))
                })
            }
        } as any;

        mockModuleAPI = {
            moduleId: 'test_module'
        };

        const legacyRegisteredTypes = new Map();
        adapter = new LegacyMacroAdapter(mockDynamicManager, legacyRegisteredTypes);
    });

    it('should create legacy macros using dynamic system', async () => {
        const result = await adapter.createMacro(
            mockModuleAPI,
            'Test Macro',
            'midi_control_change_input',
            { allowLocal: true }
        );

        expect(mockDynamicManager.createWorkflow).toHaveBeenCalled();
        expect(result).toBeDefined();
    });

    it('should maintain legacy API signature', async () => {
        const result = await adapter.createMacros(mockModuleAPI, {
            input: {
                type: 'midi_control_change_input',
                config: {}
            },
            output: {
                type: 'midi_control_change_output',
                config: {}
            }
        });

        expect(result).toHaveProperty('input');
        expect(result).toHaveProperty('output');
        expect(mockDynamicManager.createWorkflow).toHaveBeenCalledTimes(2);
    });
});

// ========================================
// Reactive Connection Manager Tests
// ========================================

describe('ReactiveConnectionManager', () => {
    let connectionManager: ReactiveConnectionManager;
    let mockSourceNode: any;
    let mockTargetNode: any;

    beforeEach(() => {
        connectionManager = new ReactiveConnectionManager();

        const mockSourcePort = {
            definition: { dataType: 'control_value' },
            observable: new Subject()
        };

        const mockTargetPort = {
            definition: { dataType: 'control_value' },
            process: vi.fn(),
            validate: vi.fn().mockReturnValue({ valid: true, errors: [] })
        };

        mockSourceNode = {
            id: 'source',
            outputs: new Map([['out', mockSourcePort]])
        };

        mockTargetNode = {
            id: 'target',
            inputs: new Map([['in', mockTargetPort]])
        };
    });

    afterEach(() => {
        connectionManager.destroy();
    });

    it('should create connections between compatible nodes', () => {
        const connection = connectionManager.createConnection(
            mockSourceNode,
            'out',
            mockTargetNode,
            'in'
        );

        expect(connection).toBeDefined();
        expect(connection.sourceNode).toBe('source');
        expect(connection.targetNode).toBe('target');
        expect(connection.enabled).toBe(true);
    });

    it('should validate port compatibility', () => {
        // Create incompatible target port
        const incompatibleTargetPort = {
            definition: { dataType: 'audio_stream' }, // Different data type
            process: vi.fn(),
            validate: vi.fn().mockReturnValue({ valid: true, errors: [] })
        };

        mockTargetNode.inputs.set('in', incompatibleTargetPort);

        expect(() => {
            connectionManager.createConnection(
                mockSourceNode,
                'out',
                mockTargetNode,
                'in'
            );
        }).toThrow('Incompatible data types');
    });

    it('should handle missing ports gracefully', () => {
        expect(() => {
            connectionManager.createConnection(
                mockSourceNode,
                'nonexistent',
                mockTargetNode,
                'in'
            );
        }).toThrow('Invalid ports');
    });

    it('should provide connection metrics', () => {
        const connection = connectionManager.createConnection(
            mockSourceNode,
            'out',
            mockTargetNode,
            'in'
        );

        const metrics = connectionManager.getConnectionMetrics(connection.id);
        expect(metrics).toBeDefined();
        expect(metrics?.messagesTransmitted).toBe(0);
        expect(metrics?.bytesTransmitted).toBe(0);
        expect(metrics?.errors).toBe(0);
    });

    it('should enable and disable connections', () => {
        const connection = connectionManager.createConnection(
            mockSourceNode,
            'out',
            mockTargetNode,
            'in'
        );

        expect(connection.enabled).toBe(true);
        
        connection.disable();
        expect(connection.enabled).toBe(false);
        
        connection.enable();
        expect(connection.enabled).toBe(true);
    });

    it('should destroy connections properly', () => {
        const connection = connectionManager.createConnection(
            mockSourceNode,
            'out',
            mockTargetNode,
            'in'
        );

        const connectionId = connection.id;
        connectionManager.destroyConnection(connectionId);
        
        const metrics = connectionManager.getConnectionMetrics(connectionId);
        expect(metrics).toBeUndefined();
    });
});

// ========================================
// Integration Tests
// ========================================

describe('Integration Tests', () => {
    let manager: DynamicMacroManager;
    let adapter: LegacyMacroAdapter;

    beforeEach(() => {
        const mockValidator = {
            validateWorkflow: vi.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] })
        } as any;

        manager = new DynamicMacroManager(mockMacroAPI, {
            validationProvider: mockValidator
        });

        manager.registerMacroTypeDefinition(mockMacroTypeDefinition);

        adapter = new LegacyMacroAdapter(manager, new Map());
    });

    afterEach(async () => {
        await manager.destroy();
    });

    it('should handle mixed legacy and dynamic workflow usage', async () => {
        // Create a legacy macro
        const mockModuleAPI = { moduleId: 'test_module' };
        const legacyMacro = await adapter.createMacro(
            mockModuleAPI as any,
            'Legacy Macro',
            'midi_control_change_input',
            {}
        );

        // Create a dynamic workflow  
        const workflowId = await manager.createWorkflow(validWorkflowConfig);

        // Both should coexist
        expect(legacyMacro).toBeDefined();
        expect(workflowId).toBeDefined();
        
        const workflows = await manager.workflows$.pipe().toPromise();
        expect(workflows?.size).toBeGreaterThan(0);
    });

    it('should validate complex workflow configurations', async () => {
        const complexConfig: MacroWorkflowConfig = {
            ...validWorkflowConfig,
            nodes: [
                {
                    id: 'input1',
                    type: 'midi_control_change_input',
                    position: { x: 0, y: 0 },
                    config: { deviceFilter: 'Device 1' }
                },
                {
                    id: 'input2',
                    type: 'midi_control_change_input', 
                    position: { x: 0, y: 100 },
                    config: { deviceFilter: 'Device 2' }
                },
                {
                    id: 'output1',
                    type: 'midi_control_change_input', // Using input type as output for test
                    position: { x: 300, y: 50 },
                    config: {}
                }
            ],
            connections: [
                {
                    id: 'conn1',
                    sourceNodeId: 'input1',
                    targetNodeId: 'output1',
                    sourcePort: 'value',
                    targetPort: 'value',
                    enabled: true
                },
                {
                    id: 'conn2', 
                    sourceNodeId: 'input2',
                    targetNodeId: 'output1',
                    sourcePort: 'value',
                    targetPort: 'value',
                    enabled: true
                }
            ]
        };

        const workflowId = await manager.createWorkflow(complexConfig);
        expect(workflowId).toBeDefined();
    });
});

// ========================================
// Performance Tests
// ========================================

describe('Performance Tests', () => {
    it('should handle multiple workflow creation efficiently', async () => {
        const mockValidator = {
            validateWorkflow: vi.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] })
        } as any;

        const manager = new DynamicMacroManager(mockMacroAPI, {
            validationProvider: mockValidator
        });

        manager.registerMacroTypeDefinition(mockMacroTypeDefinition);

        const startTime = performance.now();
        
        // Create multiple workflows concurrently
        const promises = Array.from({ length: 10 }, (_, i) => 
            manager.createWorkflow({
                ...validWorkflowConfig,
                id: `workflow_${i}`,
                name: `Workflow ${i}`
            })
        );

        await Promise.all(promises);
        
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Should complete within reasonable time (adjust threshold as needed)
        expect(duration).toBeLessThan(1000); // 1 second
        
        await manager.destroy();
    });

    it('should efficiently handle workflow updates', async () => {
        const mockValidator = {
            validateWorkflow: vi.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] })
        } as any;

        const manager = new DynamicMacroManager(mockMacroAPI, {
            validationProvider: mockValidator
        });

        manager.registerMacroTypeDefinition(mockMacroTypeDefinition);

        // Create initial workflow
        await manager.createWorkflow(validWorkflowConfig);

        const startTime = performance.now();

        // Perform multiple updates
        for (let i = 0; i < 10; i++) {
            await manager.updateWorkflow('test_workflow', {
                ...validWorkflowConfig,
                name: `Updated Workflow ${i}`
            });
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Updates should be fast
        expect(duration).toBeLessThan(500); // 500ms
        
        await manager.destroy();
    });
});

// ========================================
// Error Handling Tests
// ========================================

describe('Error Handling', () => {
    let manager: DynamicMacroManager;

    beforeEach(() => {
        const mockValidator = {
            validateWorkflow: vi.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] })
        } as any;

        manager = new DynamicMacroManager(mockMacroAPI, {
            validationProvider: mockValidator
        });

        manager.registerMacroTypeDefinition(mockMacroTypeDefinition);
    });

    afterEach(async () => {
        await manager.destroy();
    });

    it('should emit errors through error observable', (done) => {
        let errorReceived = false;

        manager.errors$.subscribe(error => {
            expect(error.type).toBeDefined();
            expect(error.message).toBeDefined();
            expect(error.timestamp).toBeInstanceOf(Date);
            errorReceived = true;
            done();
        });

        // Trigger an error by trying to update non-existent workflow
        manager.updateWorkflow('non_existent', validWorkflowConfig).catch(() => {
            // Expected to fail
            if (!errorReceived) {
                // If no error was emitted, manually complete test
                setTimeout(() => {
                    expect(errorReceived).toBe(true);
                    done();
                }, 100);
            }
        });
    });

    it('should handle validation failures gracefully', async () => {
        const mockValidator = {
            validateWorkflow: vi.fn().mockResolvedValue({
                valid: false,
                errors: [{ path: 'test', message: 'Test validation error', code: 'TEST_ERROR', severity: 'error' }],
                warnings: []
            })
        } as any;

        const managerWithFailingValidator = new DynamicMacroManager(mockMacroAPI, {
            validationProvider: mockValidator
        });

        await expect(
            managerWithFailingValidator.createWorkflow(validWorkflowConfig)
        ).rejects.toThrow('Invalid workflow configuration');

        await managerWithFailingValidator.destroy();
    });

    it('should recover from temporary errors', async () => {
        // Simulate a temporary error followed by success
        const mockValidator = {
            validateWorkflow: vi.fn()
                .mockResolvedValueOnce({ valid: false, errors: [{ path: 'test', message: 'Temporary error', code: 'TEMP_ERROR', severity: 'error' }], warnings: [] })
                .mockResolvedValue({ valid: true, errors: [], warnings: [] })
        } as any;

        const managerWithFailingValidator = new DynamicMacroManager(mockMacroAPI, {
            validationProvider: mockValidator
        });

        managerWithFailingValidator.registerMacroTypeDefinition(mockMacroTypeDefinition);

        // First attempt should fail
        await expect(
            managerWithFailingValidator.createWorkflow(validWorkflowConfig)
        ).rejects.toThrow();

        // Second attempt should succeed
        await expect(
            managerWithFailingValidator.createWorkflow({
                ...validWorkflowConfig,
                id: 'second_attempt'
            })
        ).resolves.toBe('second_attempt');

        await managerWithFailingValidator.destroy();
    });
});