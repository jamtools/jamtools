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

    const tabData = cleanUltimateGuitarChordTabLyrics(chordSheetData);
    return {
        title,
        tabData,
    };
};

export const cleanUltimateGuitarChordTabLyrics = (tabLyrics: string): string => {
    return tabLyrics
        .replace(/\[\/?(ch|tab)\]/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\n{2,}/g, '\n\n');
}

export const cleanUltimateGuitarOfficialTabLyrics = (tabLyrics: string): string => {
    return tabLyrics
        .replace(/\[ch.*?\](.*?)\[\/ch\]/g, '$1')
        .replace(/\[\/?tab\]/g, '')
        .replace(/\[\/?syllable.*?\]/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\n{2,}/g, '\n\n');
}
