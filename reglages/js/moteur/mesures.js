// Lecture des valeurs recopiées depuis l'affichage FPS du mode développeur.

/**
 * Ligne « GPU Mem » : « 6.869GB/14.926GB », « GPU Mem: 6.869GB/14.926GB », « 6,9 / 14,9 » ou « 6,9 ».
 * Le premier nombre est la mémoire vidéo utilisée, le second (facultatif) la mémoire totale.
 * Valeurs en Go ; un nombre suivi de « MB »/« Mo » est converti.
 * @returns {{ utiliseeGo: number, totaleGo: number|null } | null}  null si aucun nombre lisible
 */
export function lireMemoireVideo(texte) {
    const nombres = [...String(texte ?? '').matchAll(/(\d+(?:[.,]\d+)?)\s*(gb|go|mb|mo)?/gi)].map(([, n, unite]) => {
        const valeur = parseFloat(n.replace(',', '.'));
        return /^m/i.test(unite ?? '') ? valeur / 1024 : valeur;
    }).filter(v => v > 0);
    if (nombres.length === 0) return null;
    const arrondi = v => Math.round(v * 1000) / 1000;
    const [utiliseeGo, totaleGo = null] = nombres;
    // Une mémoire utilisée plus grande que la totale : saisie inversée ou erronée, on ne garde que la première
    if (totaleGo !== null && utiliseeGo > totaleGo) return { utiliseeGo: arrondi(utiliseeGo), totaleGo: null };
    return { utiliseeGo: arrondi(utiliseeGo), totaleGo: totaleGo === null ? null : arrondi(totaleGo) };
}
