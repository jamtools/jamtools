// import {JSDOM} from 'jsdom';

// import htmlData from './sample_ug_html';

import fs from 'fs';

export const parseUltimateGuitarHTMLContent = (doc: Document) => {
    // const domParser = new DOMParser();
    // const parsed = domParser.parseFromString('');
    // parsed.querySelector

    // const dom = new JSDOM(htmlData);

    // const doc = dom.window.document;
    const el = doc.querySelector('.js-store');
    const content = el?.getAttribute('data-content');

    // const newDom = new JSDOM();
    const houseForEscapedHTML = doc.createElement('div');

    houseForEscapedHTML.innerHTML = content || '';
    const unescapedJSONData = houseForEscapedHTML.textContent || '';

    fs.writeFileSync('out.json', unescapedJSONData);

    let chordSheetData: string | undefined;
    try {
        const jsonData = JSON.parse(unescapedJSONData);
        chordSheetData = jsonData?.store?.page.data.tab_view.wiki_tab.content;
    } catch (e) {
    }

    if (!chordSheetData) {
        console.log('failed to parse chord sheet data');
        return null;
    }

    function cleanChordSheet(input: string): string {
        // Remove [ch] and [tab] tags
        return input
            .replace(/\[\/?(ch|tab)\]/g, '') // Remove chord/tab tags
            .replace(/\r\n/g, '\n')           // Normalize line endings
            .replace(/\n{2,}/g, '\n\n');      // Ensure spacing between sections
    }

    const result = cleanChordSheet(chordSheetData);
    return result;
}
