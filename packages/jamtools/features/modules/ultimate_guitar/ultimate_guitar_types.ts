export type UltimateGuitarTab = ParsedUltimateGuitarUrl & {
    title: string;
    tabLyrics: string;
}

export type UltimateGuitarSetlist = {

}

type SavedUltimateGuitarSong = {
    name: string;
    url: string;
    transpose: number;
}

type SavedSetlist = {
    url: string;
    songs: SavedUltimateGuitarSong[];
}

const UltimateGuitarResourceTypes = {
    chords: 'chords',
    official: 'official',
} as const;

type ParsedUltimateGuitarUrl = {
    url: string;
    id: string;
    type: keyof typeof UltimateGuitarResourceTypes;
}

// Examples:
// https://tabs.ultimate-guitar.com/tab/some-band/some-song-official-2758167
// https://tabs.ultimate-guitar.com/tab/some-band/some-song-chords-2758168
export const parseUltimateGuitarTabUrl = (url: string): ParsedUltimateGuitarUrl | string => {
    if (!url.startsWith('https://tabs.ultimate-guitar.com/tab/')) {
        return 'Please provide a valid ultimate-guitar.com url. error: 1';
    }

    const dashParts = url.split('-');
    const id = dashParts.pop();
    const resourceType = dashParts.pop();
    if (!id || !resourceType) {
        return 'Please provide a valid ultimate-guitar.com url. error: 2';
    }

    if (!(resourceType in UltimateGuitarResourceTypes)) {
        return `Invalid ultimate-guitar resource type '${resourceType}'`;
    }

    return {
        url,
        id,
        type: resourceType,
    };
};
