import React from 'react';

import Guitar from 'react-guitar';

type Props = {
    numberOfStrings: number;
    chosenFrets: string[];
}

export const GuitarComponent = (props: Props) => {
    const chosen = props.chosenFrets;

    const str = Array.from('0'.repeat(props.numberOfStrings));

    const frets = [
        str,
        str,
        str,
        str,
        str,
    ] as const;

    return (
        <div>
            <style>
                {`.guitar {
                    width: 160px;
                    display: inline-block;
                    margin: 0;
                    padding: 0;
                }`}
            </style>
            {frets.map((fret, i) => {
                const strings: string[] = [];
                fret.forEach((f, j) => {
                    const key = `${j+1}-${i}`;
                    if (chosen.includes(key)) {
                        strings.push(i);
                    } else {
                        strings.push(-1);
                    }
                });
                return (
                    <Guitar
                        key={i}
                        className='guitar'
                        strings={strings}
                        renderFinger={(v, f) => {
                            const key = `${v+1}-${i}`;
                            const index = chosen.findIndex(k => k === key);
                            return index + 1;
                            // return ['A', 'B', 'C', 'D'][index];
                        }}
                        frets={{from: i, amount: 0}}
                    />
                );
            })}
        </div>
    );
};
