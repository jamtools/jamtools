# Claude Code Development Guidelines for JamTools

## Project Overview

JamTools is a comprehensive framework for building music applications with support for MIDI, macro workflows, and multi-platform deployment through Springboard. This document provides essential context for AI-assisted development.

## Architecture

### Core Technologies
- **TypeScript** - Type-safe development throughout
- **React** - UI components and state management  
- **RxJS** - Reactive programming for real-time data flows
- **Springboard** - Module system for cross-platform deployment
- **MIDI** - Real-time music data processing (<10ms latency requirements)

### Project Structure
```
packages/
├── jamtools/
│   ├── core/           # Core MIDI and macro functionality
│   │   └── modules/
│   │       ├── macro_module/    # Dynamic macro workflow system
│   │       └── io/              # MIDI I/O handling
│   └── features/       # Feature modules and UI components
└── springboard/        # Module framework and platform support
```

## Dynamic Macro System

### Current Implementation Status (Issue #51)

We have implemented a comprehensive dynamic macro system that transforms the static macro system into a fully flexible, user-customizable workflow system:

#### Core Components
- **Dynamic Types** (`dynamic_macro_types.ts`) - Complete type system for workflows
- **Dynamic Manager** (`dynamic_macro_manager.ts`) - Workflow lifecycle and hot reloading  
- **Reactive Connections** (`reactive_connection_system.ts`) - <10ms latency MIDI processing
- **Validation Framework** (`workflow_validation.ts`) - Pre-deployment error prevention
- **Legacy Compatibility** (`legacy_compatibility.ts`) - 100% backward compatibility
- **Enhanced Module** (`enhanced_macro_module.tsx`) - Main integration point

#### Key Features Delivered
✅ **Data-driven configuration** - Workflows defined by JSON, not compile-time code  
✅ **Hot reloading** - Runtime reconfiguration without disrupting MIDI streams  
✅ **User customization** - Arbitrary MIDI control assignment with custom value ranges  
✅ **Type safety** - Full TypeScript support with runtime validation  
✅ **Legacy compatibility** - Zero breaking changes to existing `createMacro()` code  
✅ **Real-time performance** - Optimized for <10ms MIDI latency requirements  

### Usage Patterns

#### Legacy API (Unchanged)
```typescript
// Existing code continues working exactly the same
const input = await macroModule.createMacro(moduleAPI, 'Input', 'midi_cc_input', {});
const output = await macroModule.createMacro(moduleAPI, 'Output', 'midi_cc_output', {});
```

#### Dynamic Workflows (New)
```typescript
// Template-based approach for common use cases
const workflowId = await macroModule.createWorkflowFromTemplate('midi_cc_chain', {
    inputDevice: 'My Controller',
    inputChannel: 1,
    inputCC: 1,           // User configurable
    outputDevice: 'My Synth',
    outputChannel: 1, 
    outputCC: 7,          // Maps to any output CC
    minValue: 50,         // Custom ranges: 0-127 → 50-100
    maxValue: 100
});

// Hot reload configuration changes
await macroModule.updateWorkflow(workflowId, updatedConfig);
// Workflow continues running with new settings - no MIDI interruption!
```

## Development Guidelines

### Code Standards
- **TypeScript strict mode** - All code must pass strict type checking
- **Functional patterns** - Prefer immutable data and pure functions where possible
- **Reactive programming** - Use RxJS for asynchronous data flows
- **Error handling** - Comprehensive error boundaries and graceful degradation
- **Performance** - Real-time constraints for MIDI processing (sub-10ms)

### Testing Requirements
- **Unit tests** - All business logic must be tested
- **Integration tests** - Macro workflows and MIDI data flows
- **Performance tests** - Latency and throughput validation
- **Compatibility tests** - Legacy API continues working

### Real-Time Constraints
- **MIDI latency** - Must maintain <10ms end-to-end processing time
- **Memory management** - Efficient cleanup of connections and subscriptions
- **CPU usage** - Optimize for background processing without blocking UI
- **Error recovery** - System must continue operating despite individual macro failures

## Common Development Tasks

### Adding New Macro Types
1. Define type in `macro_module_types.ts` using module augmentation
2. Create handler in appropriate `macro_handlers/` subdirectory
3. Register with `macroTypeRegistry.registerMacroType()`
4. Add type definition for dynamic system compatibility
5. Write tests for both legacy and dynamic usage

### Workflow Template Creation
1. Define template config type in `dynamic_macro_types.ts`
2. Add generator function in `DynamicMacroManager.initializeTemplates()`
3. Create validation rules if needed
4. Add example usage in `examples.ts`

### Performance Optimization
- Profile MIDI data flow paths for bottlenecks
- Use RxJS operators efficiently (throttleTime, bufferTime)
- Monitor memory usage in long-running workflows
- Optimize connection management for high-throughput scenarios

## Migration Strategy

The system supports gradual migration from legacy to dynamic workflows:

1. **Phase 1** - Legacy code continues unchanged (100% compatibility)
2. **Phase 2** - New features use dynamic workflows  
3. **Phase 3** - Automatic migration tools convert legacy patterns
4. **Phase 4** - Full dynamic system with visual workflow builder

### Migration Tools Available
- `LegacyMacroAdapter` - Seamless API translation
- Pattern detection - Identifies common macro combinations  
- Auto-migration - Converts compatible legacy macros to workflows
- Validation - Ensures migrations maintain functionality

## Integration Points

### Springboard Module System
- Modules register via `springboard.registerClassModule()`
- Module lifecycle managed by Springboard engine
- State management through `BaseModule` patterns
- Cross-module communication via module registry

### MIDI I/O Integration
- All MIDI processing goes through `IoModule`
- Device enumeration and selection handled centrally
- Platform-specific implementations (browser, Node.js, etc.)
- Error handling for device disconnection/reconnection

## Performance Monitoring

The system includes comprehensive performance monitoring:

- **Real-time metrics** - Latency, throughput, error rates
- **Connection health** - Monitor data flow between workflow nodes
- **Resource usage** - Memory and CPU tracking
- **Validation results** - Pre-deployment performance checks

## Future Enhancements

Areas for continued development:

1. **Visual Workflow Builder** - Drag-and-drop macro creation UI
2. **Advanced Templates** - More sophisticated workflow patterns
3. **Cloud Synchronization** - Share workflows across devices
4. **Machine Learning** - Auto-optimize workflows based on usage
5. **Plugin System** - Third-party macro type extensions

## Common Pitfalls

- **Async/await chains** - Be careful with macro creation timing
- **Memory leaks** - Always clean up RxJS subscriptions
- **Type safety** - Don't use `any` in dynamic configurations
- **MIDI timing** - Avoid synchronous operations in MIDI data paths
- **State mutations** - Use immutable updates for React compatibility

## Getting Help

- **Examples** - See comprehensive examples in `examples.ts`
- **Tests** - Look at existing test files for patterns
- **Architecture** - Review type definitions for system understanding
- **Performance** - Use built-in monitoring and validation tools

This dynamic macro system represents a significant evolution in JamTools' capabilities while maintaining complete backward compatibility. It enables the exact user customization requested in Issue #51 while providing a solid foundation for future enhancements.