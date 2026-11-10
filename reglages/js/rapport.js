// Rapport à conserver : tous les résultats sur une seule colonne (pas de tableau large), pour
// l'imprimer ou l'enregistrer en PDF, le coller dans Word ou le télécharger en .html.
// Titres, paragraphes et listes seulement : c'est ce que les traitements de texte reprennent le mieux.

import { el, telecharger } from './dom.js';
import { avecComparaisons } from './moteur/journal.js';
import * as stockage from './stockage.js';
import { T, langue, nombre, tr } from './textes.js';

const dateDuJour = () => new Date().toLocaleDateString(langue === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'long' });
const dateIso = () => new Date().toISOString().slice(0, 10);

// Libellé d'un champ sans son numéro de schéma ni les guillemets de l'affichage
const libelleSimple = texte => String(texte).split(' — ')[0].replace(/\s*\((?:Go, |GB, )?(?:facultatif|optional)\)/, '');

// Élément de liste « Libellé : valeur », omis si la valeur est vide
const item = (libelle, valeur) => (valeur === null || valeur === undefined || valeur === '' ? null : el('li', {}, el('strong', {}, `${libelle} : `), String(valeur)));

const niveau = n => T.impactNiveaux[n] ?? n;

function sectionCadence(r, profil) {
    const c = r.cadence;
    if (!c.valide) return [];
    const lignes = [el('p', {}, T.sousMultiples(nombre(c.frequenceHz)), ' ', c.cibles.map(x => `${nombre(x.fps)} FPS`).join(' · '))];
    if (c.verrouFps !== null) {
        if (c.verrouExact) lignes.push(el('p', {}, T.verrouExact(nombre(c.verrouFps))));
        else if (c.vrr) lignes.push(el('p', {}, T.verrouVrr(nombre(c.verrouFps))));
        else lignes.push(el('p', {}, T.verrouInexact(nombre(c.verrouFps), c.voisins.map(v => `${nombre(v.fps)} FPS`).join(langue === 'en' ? ' and ' : ' et '))));
    }
    if (profil.vrrInconnu) lignes.push(el('p', {}, T.vrrInconnu));
    if (c.mesureBloqueeParVerrou) lignes.push(el('p', {}, T.mesureBloquee));
    else if (c.cibleConseillee) lignes.push(el('p', {}, el('strong', {}, T.cibleConseillee(nombre(c.cibleConseillee.fps), c.cibleConseillee.diviseur))));
    return [el('h3', {}, T.cadence), ...lignes];
}

/** Rapport complet, sous forme d'élément <article> */
export function construireRapport(saisie, r, base) {
    const { profil, mesures } = saisie;
    const libelleParametre = id => tr(base.parametres.find(p => p.id === id)?.libelle) || id;
    const usercfg = saisie.usercfg && saisie.usercfg.simulateur === profil.simulateur ? saisie.usercfg : null;
    const valeurChezVous = id => {
        const v = usercfg?.valeurs?.[id];
        if (!v) return null;
        return v.libelle ? (T.libellesValeurs[v.libelle] ?? v.libelle) : (typeof v.valeur === 'number' ? nombre(v.valeur) : v.valeur);
    };
    const d = r.diagnostic;
    const journal = avecComparaisons(stockage.lireJournal().filter(e => e.simulateur === profil.simulateur));

    return el('article', { class: 'rapport', lang: langue },
        el('h1', {}, T.rapportTitre),
        el('p', {}, T.rapportDate(dateDuJour())),

        el('h2', {}, T.etapes.configuration),
        el('ul', {},
            item(T.simulateur, profil.simulateur && `Microsoft Flight Simulator ${profil.simulateur}`),
            item('DirectX', profil.directx),
            item(T.gpu, profil.gpu), item(libelleSimple(T.vram), profil.vramGo), item(libelleSimple(T.cpu), profil.cpu),
            item(libelleSimple(T.ram), profil.ramGo), item(T.resolution, profil.resolution), item(T.frequence, profil.frequenceHz),
            item(T.vrr, profil.vrrInconnu ? T.nsp : profil.vrr ? T.oui : T.non), item(libelleSimple(T.avion), profil.avion)),

        el('h2', {}, T.etapes.mesures),
        el('ul', {},
            item(libelleSimple(T.fpsReels), mesures.fpsReels && nombre(mesures.fpsReels)),
            item(libelleSimple(T.synchroAffichee), mesures.synchroAffichee === 'vsync' ? 'VSync' : mesures.synchroAffichee === 'novsync' ? 'NoVSync' : null),
            item(libelleSimple(T.limite), { 'main-thread': T.limiteMain, rendu: T.limiteRendu, gpu: T.limiteGpu }[mesures.limite]),
            item(libelleSimple(T.msPrincipal), mesures.msPrincipal && `${nombre(mesures.msPrincipal)} ms`),
            item(libelleSimple(T.msRendu), mesures.msRendu && `${nombre(mesures.msRendu)} ms`),
            item(libelleSimple(T.msGpu), mesures.msGpu && `${nombre(mesures.msGpu)} ms`),
            item(libelleSimple(T.gpuMem), mesures.vramUtiliseeGo && T.gpuMemLu(nombre(mesures.vramUtiliseeGo), mesures.vramTotaleGo && nombre(mesures.vramTotaleGo))),
            item(T.verrou, mesures.verrouFps && nombre(mesures.verrouFps)),
            mesures.capture && el('li', {}, T.resumeCapture(mesures.capture))),

        el('h2', {}, T.etapes.constats),
        el('ul', {},
            saisie.symptomes.map(id => el('li', {}, tr(base.symptomes.find(s => s.id === id)?.libelle) || id)),
            saisie.changements.map(c => el('li', {}, `${libelleParametre(c.id)} : ${(c.sens === 'baisse' ? T.sensBaisse : T.sensHausse).toLowerCase()}`))),

        el('h2', {}, T.etapes.diagnostic),
        el('p', {}, el('strong', {}, `${T.diagnostic} : `), T.goulots[d.goulot] + (d.fil && d.goulot === 'cpu' ? ` (${T.fils[d.fil]})` : ''), '. ', T.confiances[d.confiance]),
        d.tauxVram !== null && el('p', {}, T.vramTaux(Math.round(d.tauxVram * 100))),
        ...sectionCadence(r, profil),
        el('h3', {}, T.generation),
        el('p', {}, T.avisGeneration[r.generation.avis], r.generation.multiDisponible ? ` ${T.multiDisponible}` : ''),

        r.messages.length > 0 && el('h2', {}, T.messages),
        r.messages.map(m => el('p', {}, el('strong', {}, `${T.gravites[m.gravite]}${m.statut === 'verifie' ? '' : ` (${T.aVerifier})`} : `), tr(m.message))),

        el('h2', {}, T.rapportReglages),
        r.tableau.map(l => [
            el('h3', {}, tr(l.libelle), l.statut === 'verifie' ? '' : ` (${T.aVerifier})`),
            el('ul', {},
                item(T.colChezVous, valeurChezVous(l.id)),
                item(T.colImpact, T.impactClair(niveau(l.impact.cpu), niveau(l.impact.gpu), niveau(l.impact.vram))),
                item(T.colDepart, tr(l.depart)),
                item(T.colCout, tr(l.coutVisuel)),
                item(T.colTest, tr(l.test)))
        ]),

        journal.length > 0 && el('h2', {}, T.rapportJournal),
        journal.length > 0 && el('ul', {}, journal.map(({ entree: e, comparaison: c }) => el('li', {},
            `${new Date(e.date).toLocaleDateString(langue === 'en' ? 'en-GB' : 'fr-FR')} — `,
            e.reglage.id ? `${libelleParametre(e.reglage.id)} : ${e.reglage.avant} → ${e.reglage.apres}` : T.reference,
            ` — ${nombre(e.fpsMoyen)} FPS`,
            c.ecartFps !== null ? ` (${T.ecart(c.ecartFps, c.ecartPourcent, nombre)})` : '',
            e.unPourcentBas !== null ? `, ${T.colUnPourcent} ${nombre(e.unPourcentBas)}` : '')))
    );
}

// Texte brut du rapport (pour le presse-papiers) : titres soulignés, listes à tirets
function texteBrut(article) {
    const lignes = [];
    for (const noeud of article.children) {
        const texte = noeud.textContent.trim();
        if (noeud.tagName === 'H1') lignes.push(texte.toUpperCase(), '');
        else if (noeud.tagName === 'H2') lignes.push('', texte, '='.repeat(texte.length));
        else if (noeud.tagName === 'H3') lignes.push('', texte);
        else if (noeud.tagName === 'UL') for (const li of noeud.children) lignes.push(`- ${li.textContent.trim()}`);
        else lignes.push(texte);
    }
    return lignes.join('\n');
}

// Document HTML autonome (styles simples en ligne), que Word ouvre directement
function documentHtml(article) {
    return `<!DOCTYPE html>
<html lang="${langue}"><head><meta charset="UTF-8"><title>${T.rapportTitre}</title>
<style>body{font-family:Calibri,Arial,sans-serif;max-width:46em;margin:2em auto;line-height:1.5;color:#1e293b}h1{font-size:1.6em}h2{font-size:1.3em;margin-top:1.6em;border-bottom:1px solid #cbd5e1}h3{font-size:1.05em;margin:1.2em 0 .3em}li{margin:.2em 0}</style>
</head><body>
${article.outerHTML}
</body></html>
`;
}

/** Imprimer (ou enregistrer en PDF) : seul le rapport est imprimé, voir @media print dans reglages.css */
export function imprimerRapport(article) {
    const zone = el('div', { id: 'impression' }, article);
    document.body.append(zone);
    document.body.classList.add('impression');
    const nettoyer = () => {
        zone.remove();
        document.body.classList.remove('impression');
        window.removeEventListener('afterprint', nettoyer);
    };
    window.addEventListener('afterprint', nettoyer);
    window.print();
}

/** Copie avec mise en forme (Word reprend titres et listes), texte brut en secours. Renvoie true si réussi. */
export async function copierRapport(article) {
    const html = article.outerHTML;
    try {
        if (window.ClipboardItem && navigator.clipboard?.write) {
            await navigator.clipboard.write([new ClipboardItem({
                'text/html': new Blob([html], { type: 'text/html' }),
                'text/plain': new Blob([texteBrut(article)], { type: 'text/plain' })
            })]);
        } else {
            await navigator.clipboard.writeText(texteBrut(article));
        }
        return true;
    } catch (e) {
        return false;
    }
}

export function telechargerRapport(article) {
    telecharger(documentHtml(article), `${T.nomRapport}-${dateIso()}.html`, 'text/html;charset=utf-8');
}
