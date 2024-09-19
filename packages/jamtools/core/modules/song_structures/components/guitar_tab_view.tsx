import React from 'react';

import GuitarImport from 'react-guitar';
const Guitar = (GuitarImport as unknown as {default: typeof GuitarImport}).default;

type Props = {
    numberOfStrings: number;
    chosenFrets: ChosenNote[];
}

type ChosenNote = {
    fret: number;
    string: number;
}

export const BasicGuitarTabView = (props: Props) => {
    const result: string[] = [];

    const firstRow: string[] = [''];
    const secondRow: string[] = [''];
    const lastRow: string[] = [''];
    for (let i = 0; i < props.chosenFrets.length; i++) {
        firstRow.push(' ');
        // firstRow.push((i + 1).toString());
        secondRow.push('-');
        lastRow.push(' ');
    }

    firstRow.push('');
    secondRow.push('');
    lastRow.push('');

    // result.push(firstRow.join(' | '));
    // result.push(secondRow.join('-|-'));

    for (let i = 0; i < props.numberOfStrings; i++) {
        const innerResult: string[] = [];
        // const innerResult: string[] = [''];
        for (const chosenFret of props.chosenFrets) {
            if (chosenFret.string === i) {
                innerResult.push(chosenFret.fret.toString());
            } else {
                innerResult.push('-');
            }
        }
        innerResult.push('');
        result.push(innerResult.join('   '));
        // result.push(innerResult.join(' | '));
    }

    // result.push(lastRow.join('---'));

    const fullText = result.join('\n');
    console.log(result);

    // const result = props.chosenFrets.map(chosenFret => {
    //     const innerResult: string[] = [];
    //     for (let i = 0; i < props.numberOfStrings; i++) {
    //         if (chosenFret.string === i) {
    //             innerResult.push(chosenFret.fret.toString());
    //         } else {
    //             innerResult.push('-');
    //         }
    //     }

    //     return innerResult;
    // });

    // let fullString = '';
    // for (let i = 0; i < props.numberOfStrings; i++) {

    //     if (chosenFret.string === i) {
    //         innerResult.push(chosenFret.fret.toString());
    //     } else {
    //         innerResult.push('-');
    //     }
    // }

    return (
        <div>
            <pre style={{
                fontSize: '40px',
                border: 'solid 1px',
                padding: '10px',
                display: 'inline-block',
                whiteSpace: 'pre-wrap',
            }}>
                {fullText}
            </pre>
        </div>
    );
};

export const GuitarTabView = (props: Props) => {
    return <BasicGuitarTabView {...props}/>;
    const chosen = props.chosenFrets;

    const str = Array.from('0'.repeat(props.numberOfStrings));

    const frets = chosen.map(_value => str);

    const stringsNew = chosen.map(_value => 1);

    return (
        <div>
            <style>
                {`.guitar {
                    width: 160px;
                    display: inline-block;
                    margin: 0;
                    padding: 0;
                }
                .fret .counter {display: none !important;}
                `}
            </style>

            {chosen.map((chosenRoot, i) => {
                const strings: number[] = [];
                for (let i = 0; i < props.numberOfStrings; i ++) {
                    if (chosenRoot.string === i) {
                        strings.push(1);
                    } else {
                        strings.push(-1);
                    }
                }
                return (
                    <Guitar
                        key={i}
                        className='guitar'
                        strings={strings}
                        renderFinger={(v, _f) => {
                            return <span>{chosenRoot.fret}</span>;
                            // return ['A', 'B', 'C', 'D'][index];
                        }}
                        frets={{from: 1, amount: 1}}
                    />
                );
            })}

            <div/>

            {/* {frets.map((fret, i) => {
                const strings: number[] = [];
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
                        renderFinger={(v, _f) => {
                            const key = `${v+1}-${i}`;
                            const index = chosen.findIndex(k => k === key);
                            return <span>{index + 1}</span>;
                            // return ['A', 'B', 'C', 'D'][index];
                        }}
                        frets={{from: 1, amount: 0}}
                    />
                );
            })} */}
        </div>
    );
};
