// Formulaire « J'ai un retour » (horloge UTC, SELCAL, Atelier réglages), sans compte.
// Le bouton #boutonRetour porte l'application dans data-app ; la boîte de dialogue est construite ici,
// dans la langue de la page. Envoi à /api/retour (relais/worker.js), qui transmet au forum AvroBB :
// sujet privé « à trier », contact envoyé aux administrateurs seulement.
// Une page peut ajouter du contexte en définissant window.contexteRetour() (ex. code SELCAL affiché).
(function () {
    const bouton = document.getElementById('boutonRetour');
    if (!bouton) return;

    const anglais = document.documentElement.lang === 'en';
    const application = bouton.dataset.app;

    const FORUMS = {
        horlogeUtc: anglais ? 'https://avrobb.org/en/forum/8-utc-clock' : 'https://avrobb.org/forum/8-horloge-utc',
        selcal: anglais ? 'https://avrobb.org/en/forum/9-selcal' : 'https://avrobb.org/forum/9-selcal',
        reglages: anglais ? 'https://avrobb.org/en/forum/13-msfs-settings-workshop' : 'https://avrobb.org/forum/13-atelier-reglages-msfs'
    };
    const forum = FORUMS[application];

    const T = anglais ? {
        titre: 'Send feedback',
        intro: 'A bug, an idea, a question? Tell us — no account needed.',
        type: 'Type of feedback',
        types: { bug: 'Bug', suggestion: 'Suggestion / idea', question: 'Question', autre: 'Other' },
        message: 'Message',
        messageAide: 'Describe your feedback (device, browser, what you expected…)',
        pseudo: 'Name (optional, shown with your feedback)',
        contact: 'Contact (optional, never published)',
        contactAide: 'Email, if you would like a reply',
        annuler: 'Cancel',
        envoyer: 'Send',
        envoi: 'Sending…',
        fermer: 'Close',
        merci: 'Thank you! Your feedback has been sent.',
        suite: 'It is read on the forum; if it is of interest to everyone, it will be published on the <a href="' + forum + '" rel="noopener">forum</a>, without your contact.',
        debit: 'Too many messages sent. Please try again in a minute.',
        echec: 'Sending failed. Please try again, or post on the <a href="' + forum + '" rel="noopener">forum</a>.'
    } : {
        titre: "J'ai un retour",
        intro: 'Un bug, une idée, une question ? Dites-nous tout, aucun compte requis.',
        type: 'Type de retour',
        types: { bug: 'Bug', suggestion: 'Suggestion / idée', question: 'Question', autre: 'Autre' },
        message: 'Message',
        messageAide: 'Décrivez votre retour (appareil, navigateur, ce que vous attendiez…)',
        pseudo: 'Pseudo (facultatif, affiché avec votre retour)',
        contact: 'Contact (facultatif, jamais publié)',
        contactAide: 'E-mail, si vous souhaitez une réponse',
        annuler: 'Annuler',
        envoyer: 'Envoyer',
        envoi: 'Envoi…',
        fermer: 'Fermer',
        merci: 'Merci ! Votre retour a bien été envoyé.',
        suite: 'Il est lu sur le forum ; s\'il intéresse tout le monde, il sera publié sur le <a href="' + forum + '" rel="noopener">forum</a>, sans votre contact.',
        debit: "Trop d'envois. Réessayez dans une minute.",
        echec: 'L\'envoi a échoué. Réessayez, ou écrivez sur le <a href="' + forum + '" rel="noopener">forum</a>.'
    };

    // Textes fixes du code ci-dessus uniquement (aucune saisie de l'utilisateur dans innerHTML)
    const options = Object.keys(T.types).map(cle => '<option value="' + cle + '">' + T.types[cle] + '</option>').join('');
    const dialogue = document.createElement('dialog');
    dialogue.className = 'retour';
    dialogue.setAttribute('aria-labelledby', 'retourTitre');
    dialogue.innerHTML =
        '<div class="retour-entete">' +
            '<h2 id="retourTitre">' + T.titre + '</h2>' +
            '<button type="button" class="retour-fermer" aria-label="' + T.fermer + '">×</button>' +
        '</div>' +
        '<form class="retour-formulaire" novalidate>' +
            '<p>' + T.intro + '</p>' +
            '<label for="retourType">' + T.type + '</label>' +
            '<select id="retourType" name="type">' + options + '</select>' +
            '<label for="retourMessage">' + T.message + '</label>' +
            '<textarea id="retourMessage" name="message" rows="5" maxlength="1800" required placeholder="' + T.messageAide + '"></textarea>' +
            '<p class="retour-compteur" aria-hidden="true"><span id="retourCompteur">0</span> / 1800</p>' +
            '<label for="retourPseudo">' + T.pseudo + '</label>' +
            '<input id="retourPseudo" name="pseudo" type="text" maxlength="40" autocomplete="nickname">' +
            '<label for="retourContact">' + T.contact + '</label>' +
            '<input id="retourContact" name="contact" type="text" maxlength="120" autocomplete="email" placeholder="' + T.contactAide + '">' +
            '<p class="retour-erreur" id="retourErreur" role="alert" hidden></p>' +
            '<div class="retour-actions">' +
                '<button type="button" class="retour-secondaire retour-annuler">' + T.annuler + '</button>' +
                '<button type="submit" class="retour-principal" id="retourEnvoyer" disabled>' + T.envoyer + '</button>' +
            '</div>' +
        '</form>' +
        '<div class="retour-merci" hidden>' +
            '<p class="retour-icone" aria-hidden="true">✅</p>' +
            '<p><strong>' + T.merci + '</strong></p>' +
            '<p>' + T.suite + '</p>' +
            '<div class="retour-actions"><button type="button" class="retour-principal retour-annuler">' + T.fermer + '</button></div>' +
        '</div>';
    document.body.appendChild(dialogue);

    const formulaire = dialogue.querySelector('form');
    const merci = dialogue.querySelector('.retour-merci');
    const message = dialogue.querySelector('#retourMessage');
    const compteur = dialogue.querySelector('#retourCompteur');
    const erreur = dialogue.querySelector('#retourErreur');
    const envoyer = dialogue.querySelector('#retourEnvoyer');
    const champType = dialogue.querySelector('#retourType');
    const champPseudo = dialogue.querySelector('#retourPseudo');
    const champContact = dialogue.querySelector('#retourContact');

    function majEnvoyer() {
        compteur.textContent = String(message.value.length);
        envoyer.disabled = message.value.trim() === '';
    }

    function afficherErreur(html) {
        erreur.innerHTML = html;
        erreur.hidden = !html;
    }

    function ouvrir() {
        // Formulaire vierge à chaque ouverture
        formulaire.reset();
        formulaire.hidden = false;
        merci.hidden = true;
        afficherErreur('');
        envoyer.textContent = T.envoyer;
        majEnvoyer();
        dialogue.showModal();
        message.focus();
    }

    async function soumettre(e) {
        e.preventDefault();
        if (message.value.trim() === '') return;
        afficherErreur('');
        envoyer.disabled = true;
        envoyer.textContent = T.envoi;

        const contexte = typeof window.contexteRetour === 'function' ? window.contexteRetour() : {};
        const corps = Object.assign({}, contexte, {
            app: application,
            type: champType.value,
            message: message.value.slice(0, 1800),
            pseudo: champPseudo.value.trim(),
            contact: champContact.value.trim(),
            lang: anglais ? 'en' : 'fr'
        });

        try {
            const rep = await fetch('/api/retour', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(corps)
            });
            if (rep.ok) {
                formulaire.hidden = true;
                merci.hidden = false;
                merci.querySelector('button').focus();
                return;
            }
            afficherErreur(rep.status === 429 ? T.debit : T.echec);
        } catch (err) {
            afficherErreur(T.echec);
        }
        envoyer.textContent = T.envoyer;
        majEnvoyer();
    }

    bouton.addEventListener('click', ouvrir);
    message.addEventListener('input', majEnvoyer);
    formulaire.addEventListener('submit', soumettre);
    dialogue.querySelectorAll('.retour-fermer, .retour-annuler').forEach(function brancherFermeture(b) {
        b.addEventListener('click', function fermer() { dialogue.close(); });
    });
    // Clic sur le fond (hors de la boîte) : fermeture
    dialogue.addEventListener('click', function fermerSurFond(e) {
        if (e.target === dialogue) dialogue.close();
    });
    // Retour au bouton d'ouverture après fermeture
    dialogue.addEventListener('close', function rendreFocus() { bouton.focus(); });
})();
