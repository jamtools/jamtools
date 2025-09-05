// Core JamTools exports

// Original modules
export * from './modules';

// Enhanced Dynamic Macro System - New API
export {
    // Core types
    MacroWorkflowConfig,
    MacroNodeConfig,
    MacroConnectionConfig,
    MacroTypeDefinition,
    WorkflowTemplate,
    WorkflowPreset,
    ValidationResult,
    ConnectableMacroHandler,
    MacroWorkflowInstance
} from './modules/macro_module/dynamic_macro_types';

export {
    // Core system components
    DynamicMacroManager,
    DynamicMacroManagerOptions,
    WorkflowPersistenceProvider,
    WorkflowValidationProvider
} from './modules/macro_module/dynamic_macro_manager';

export {
    // Enhanced macro module (replaces original MacroModule)
    EnhancedMacroModule,
    EnhancedMacroConfigState
} from './modules/macro_module/enhanced_macro_module';

export {
    // Connection management
    ReactiveConnectionManager,
    ConnectionBuilder,
    ConnectionPerformanceConfig,
    RealTimePerformanceMonitor
} from './modules/macro_module/reactive_connection_system';

export {
    // Validation system
    WorkflowValidator,
    ValidationRuleEngine,
    ValidationRule,
    builtInValidationRules
} from './modules/macro_module/workflow_validation';

export {
    // Legacy compatibility
    LegacyMacroAdapter,
    MacroMigrationService,
    StateKeyMigrator
} from './modules/macro_module/legacy_compatibility';

// Legacy macro system - maintained for backward compatibility
export {
    MacroTypeConfigs,
    MidiEvent,
    MidiEventFull,
    MacroConfigItem
} from './modules/macro_module/macro_module_types';

export {
    macroTypeRegistry,
    MacroAPI,
    MacroCallback
} from './modules/macro_module/registered_macro_types';

// Re-export original MacroModule for full backward compatibility
export { MacroModule } from './modules/macro_module/macro_module';

// Constants
export * from './constants/midi_number_to_note_name_mappings';
export * from './constants/qwerty_to_midi_mappings';

// Types
export * from './types/io_types';