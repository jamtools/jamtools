import {UltimateGuitarSetlist, UltimateGuitarSetlistStatus, UltimateGuitarTab} from './ultimate_guitar_types';

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

    let tabData: string | undefined;
    try {
        const jsonData = JSON.parse(unescapedJSONData);
        tabData = jsonData?.store?.page.data.tab_view.wiki_tab.content;
    } catch (e) {
        console.error(e);
    }

    if (!tabData) {
        throw new Error('failed to parse chord sheet data');
        // return null;
    }

    return {
        title,
        tabData,
    };
};

type GetTabFromCurrentSetlistDataReturnValue = {
    setlist?: UltimateGuitarSetlist;
    song?: UltimateGuitarTab;
}

export const getTabFromCurrentSetlistData = (setlistStatus: UltimateGuitarSetlistStatus | null, savedSetlists: UltimateGuitarSetlist[], savedTabs: UltimateGuitarTab[]): GetTabFromCurrentSetlistDataReturnValue => {
    if (!setlistStatus) {
        return {
            setlist: undefined,
            song: undefined,
        };
    }

    const setlist = savedSetlists.find(s => s.id === setlistStatus.setlistId);
    if (!setlist) {
        return {
            setlist: undefined,
            song: undefined,
        };
    }

    const currentSong = setlist.songs[setlistStatus.songIndex];
    const tab = savedTabs.find(t => t.url === currentSong.url);
    return {
        setlist,
        song: tab,
    };
};

export const prepareLyricsWithChords = (tabLyrics: string, options: {showChords: boolean}): string => {
    const regexReplacement = options.showChords ? '$1' : '';

    return tabLyrics
        .replace(/\[ch.*?\](.*?)\[\/ch\]/g, regexReplacement)
        .replace(/\[\/?tab\]/g, '')
        .replace(/\[\/?syllable.*?\]/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\n{2,}/g, '\n\n');
};
