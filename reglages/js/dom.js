// Petit utilitaire de construction du DOM, partagé par app.js et interfaceJournal.js.
// el('p', { class: 'aide' }, 'texte', autreElement) : crée un élément, ses attributs et ses enfants.
// Les textes passent par createTextNode : aucun risque d'injection HTML.
export function el(balise, attributs = {}, ...enfants) {
    const noeud = document.createElement(balise);
    for (const [nom, valeur] of Object.entries(attributs)) {
        if (valeur === false || valeur === null || valeur === undefined) continue;
        noeud.setAttribute(nom, valeur === true ? '' : String(valeur));
    }
    for (const enfant of enfants.flat()) {
        if (enfant === null || enfant === undefined || enfant === false) continue;
        noeud.append(enfant instanceof Node ? enfant : document.createTextNode(String(enfant)));
    }
    return noeud;
}

// Ouvre le sélecteur de fichier du système et renvoie le texte du fichier choisi (null si annulé).
// Le fichier est lu dans le navigateur : il n'est envoyé nulle part.
export function choisirFichierTexte(accept) {
    return new Promise(resolve => {
        const champ = el('input', { type: 'file', accept, hidden: true });
        champ.addEventListener('change', async () => {
            const [fichier] = champ.files;
            champ.remove();
            resolve(fichier ? await fichier.text() : null);
        });
        champ.addEventListener('cancel', () => { champ.remove(); resolve(null); });
        document.body.append(champ);
        champ.click();
    });
}
