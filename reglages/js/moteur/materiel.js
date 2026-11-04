// Rapproche le modèle de carte graphique saisi d'une famille de donnees/materiel.json
// (ex. « RTX 5060 Ti » → GeForce RTX 50), pour connaître ses capacités DLSS.

// Renvoie la famille trouvée, ou null si le modèle n'est pas reconnu.
export function familleGpu(nomGpu, materiel) {
    const nom = String(nomGpu ?? '').trim();
    if (nom === '') return null;
    return materiel.familles.find(f => new RegExp(f.motif, 'i').test(nom)) ?? null;
}
