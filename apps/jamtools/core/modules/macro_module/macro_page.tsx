import React from 'react';
import {MacroConfigState} from './macro_module';

type Props = {
    state: MacroConfigState;
}

export const MacroPage = (props: Props) => {
    const moduleIds = Object.keys(props.state.configs);

    return (
        <ul>
            {moduleIds.map((moduleId) => {
                const c = props.state.configs[moduleId];
                const fieldNames = Object.keys(c);

                return (
                    <li key={moduleId}>
                        {moduleId}
                        <ul>
                            {fieldNames.map((fieldName) => {
                                const mapping = c[fieldName];
                                const producedMacro = props.state.producedMacros[moduleId][fieldName];
                                const Component = ((producedMacro as {Component?: React.ElementType}).Component);

                                return (
                                    <li key={fieldName}>
                                        {Component && <Component />}
                                        {fieldName} - {mapping.type}
                                    </li>
                                );
                            })}
                        </ul>
                    </li>
                );
            })}
        </ul>
    );
};
