import React from 'react';
import springboard from 'springboard';

import '@jamtools/core/modules/macro_module/macro_module';

springboard.registerModule('midi_thru', {}, async (moduleAPI) => {
    const macroModule = moduleAPI.getModule('enhanced_macro');

    // Use the new dynamic workflow system with templates
    const workflowId = await macroModule.createWorkflowFromTemplate('midi_thru', {
        inputDevice: 'Default Input',
        outputDevice: 'Default Output'
    });

    moduleAPI.registerRoute('', {}, () => {
        return (
            <div>
                <h2>MIDI Thru (Dynamic Workflow)</h2>
                <p>Workflow ID: {workflowId}</p>
                <p>This uses the new dynamic workflow system for flexible MIDI routing.</p>
                
                {/* Future: workflow configuration UI will be available here */}
                <div style={{padding: '10px', background: '#f0f0f0', borderRadius: '5px'}}>
                    <strong>Dynamic Features:</strong>
                    <ul>
                        <li>Hot reloading without MIDI interruption</li>
                        <li>Real-time configuration changes</li>
                        <li>Template-based workflow creation</li>
                        <li>Performance optimized for &lt;10ms latency</li>
                    </ul>
                </div>
            </div>
        );
    });
});
