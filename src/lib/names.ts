// "arhaan" -> "Arhaan", "mary ann" -> "Mary Ann". Only the first letter of each word is
// changed, so names that already have capitals (McDonald) are left alone.
export const capitalizeName = (name: string | null | undefined): string =>
    (name ?? '').trim().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase());
