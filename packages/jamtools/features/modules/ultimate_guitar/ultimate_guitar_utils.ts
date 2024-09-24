export type ParsedTabPageData = {
    title: string;
    tabData: string;
}

export const parseUltimateGuitarHTMLContent = (doc: Document): ParsedTabPageData | null => {
    let title = '';
    const titleContainer = doc.querySelector('meta[property="og:title"]');
    if (titleContainer) {
        title = (titleContainer as HTMLMetaElement).content;
        title = title.replace(' (Chords)', '');
        title = title.replace(' (Official)', '');
        title = title.replace(' (Bass)', '');
    }

    const el = doc.querySelector('.js-store');
    const content = el?.getAttribute('data-content');

    // const newDom = new JSDOM();
    const houseForEscapedHTML = doc.createElement('div');

    houseForEscapedHTML.innerHTML = content || '';
    const unescapedJSONData = houseForEscapedHTML.textContent || '';

    let chordSheetData: string | undefined;
    try {
        const jsonData = JSON.parse(unescapedJSONData);
        chordSheetData = jsonData?.store?.page.data.tab_view.wiki_tab.content;
    } catch (e) {
        console.error(e);
    }

    if (!chordSheetData) {
        throw new Error('failed to parse chord sheet data');
        // return null;
    }

    function cleanChordSheet(input: string): string {
        // Remove [ch] and [tab] tags
        return input
            .replace(/\[\/?(ch|tab)\]/g, '') // Remove chord/tab tags
            .replace(/\r\n/g, '\n')           // Normalize line endings
            .replace(/\n{2,}/g, '\n\n');      // Ensure spacing between sections
    }

    const tabData = cleanChordSheet(chordSheetData);
    return {
        title,
        tabData,
    };
};
