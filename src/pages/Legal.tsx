import { Link } from 'react-router-dom'
import { ArrowLeft, Shield, FileText, Scale } from 'lucide-react'

type Tab = 'mentions' | 'cgu' | 'rgpd'

import { useState } from 'react'

export default function Legal() {
  const [tab, setTab] = useState<Tab>('mentions')

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'mentions', label: 'Mentions légales', icon: FileText },
    { id: 'cgu', label: "CGU", icon: Scale },
    { id: 'rgpd', label: 'Politique de confidentialité', icon: Shield },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-700 mb-8 transition-colors">
          <ArrowLeft size={15} /> Retour à l'accueil
        </Link>

        {/* Tab bar */}
        <div className="flex gap-1 bg-navy-100/60 p-1 rounded-xl mb-8">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  tab === t.id
                    ? 'bg-white text-navy-800 shadow-sm'
                    : 'text-navy-500 hover:text-navy-700'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl border border-navy-100/60 p-6 sm:p-10">
          {tab === 'mentions' && <MentionsLegales />}
          {tab === 'cgu' && <CGU />}
          {tab === 'rgpd' && <RGPD />}
        </div>
      </div>
    </div>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif text-lg font-bold text-navy-900 mt-8 mb-3 first:mt-0">{children}</h2>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-navy-600 leading-relaxed mb-3">{children}</p>
}

function MentionsLegales() {
  return (
    <>
      <h1 className="font-serif text-2xl font-bold text-navy-900 mb-6">Mentions légales</h1>

      <Heading>Éditeur du site</Heading>
      <P>
        Lègue Facile est édité par [Nom de la société], [forme juridique], au capital de [montant] €.<br />
        Siège social : [adresse]<br />
        RCS : [ville] [numéro]<br />
        N° TVA intracommunautaire : [numéro]<br />
        Directeur de la publication : [nom]<br />
        Email : contact@leguefacile.fr
      </P>

      <Heading>Hébergement</Heading>
      <P>
        Ce site est hébergé par Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis.<br />
        La base de données est hébergée par Neon Inc. (PostgreSQL managé).<br />
        Les données sont stockées dans des centres de données situés dans l'Union européenne.
      </P>

      <Heading>Propriété intellectuelle</Heading>
      <P>
        L'ensemble du contenu de ce site (textes, graphismes, logos, icônes, images, logiciels) est protégé par le droit
        d'auteur et le droit des marques. Toute reproduction ou représentation, en tout ou partie, sans autorisation
        préalable est interdite.
      </P>

      <Heading>Limitation de responsabilité</Heading>
      <P>
        Les simulations fiscales et les informations fournies par Lègue Facile sont données à titre indicatif et ne
        constituent pas un conseil juridique, fiscal ou patrimonial. Elles ne se substituent en aucun cas à la
        consultation d'un notaire, avocat ou conseiller en gestion de patrimoine. Lègue Facile ne saurait être tenu
        responsable des décisions prises sur la base des informations fournies.
      </P>
    </>
  )
}

function CGU() {
  return (
    <>
      <h1 className="font-serif text-2xl font-bold text-navy-900 mb-6">Conditions Générales d'Utilisation</h1>
      <P><em>Dernière mise à jour : juillet 2026</em></P>

      <Heading>1. Objet</Heading>
      <P>
        Les présentes conditions générales d'utilisation (« CGU ») régissent l'accès et l'utilisation de la plateforme
        Lègue Facile, accessible à l'adresse https://leguefacile.fr (le « Service »). En créant un compte, vous acceptez
        sans réserve les présentes CGU.
      </P>

      <Heading>2. Description du service</Heading>
      <P>
        Lègue Facile est une plateforme numérique d'aide à la préparation de la transmission patrimoniale. Elle propose
        notamment : un simulateur fiscal (succession et donation), une cartographie du patrimoine, un arbre familial,
        un assistant IA, la gestion de documents et un export de dossier pour le notaire.
      </P>
      <P>
        <strong>Important :</strong> Lègue Facile n'est pas un cabinet de conseil juridique ou fiscal. Les résultats
        des simulations sont fournis à titre informatif uniquement et ne constituent pas un conseil personnalisé.
      </P>

      <Heading>3. Inscription et compte</Heading>
      <P>
        L'utilisateur s'engage à fournir des informations exactes et à maintenir la confidentialité de ses identifiants.
        Tout accès au Service avec vos identifiants est réputé effectué par vous-même.
      </P>

      <Heading>4. Données personnelles</Heading>
      <P>
        Le traitement des données personnelles est décrit dans notre Politique de confidentialité, accessible depuis
        l'onglet dédié. En utilisant le Service, vous consentez au traitement de vos données conformément à cette
        politique.
      </P>

      <Heading>5. Propriété intellectuelle</Heading>
      <P>
        Les contenus générés par l'utilisateur (patrimoine, données familiales, documents) restent sa propriété.
        L'utilisateur accorde à Lègue Facile une licence limitée d'utilisation de ces données pour le fonctionnement
        du Service.
      </P>

      <Heading>6. Responsabilité</Heading>
      <P>
        Lègue Facile met en œuvre les moyens raisonnables pour assurer la disponibilité et la sécurité du Service, sans
        obligation de résultat. En aucun cas Lègue Facile ne pourra être tenu responsable des dommages indirects liés
        à l'utilisation du Service.
      </P>

      <Heading>7. Résiliation</Heading>
      <P>
        L'utilisateur peut supprimer son compte à tout moment. Lègue Facile se réserve le droit de suspendre ou
        supprimer un compte en cas de violation des présentes CGU.
      </P>

      <Heading>8. Droit applicable</Heading>
      <P>
        Les présentes CGU sont régies par le droit français. Tout litige sera soumis aux tribunaux compétents de Paris.
      </P>
    </>
  )
}

function RGPD() {
  return (
    <>
      <h1 className="font-serif text-2xl font-bold text-navy-900 mb-6">Politique de confidentialité</h1>
      <P><em>Dernière mise à jour : juillet 2026</em></P>

      <Heading>1. Responsable du traitement</Heading>
      <P>
        Le responsable du traitement des données personnelles est [Nom de la société], joignable à l'adresse
        contact@leguefacile.fr.
      </P>

      <Heading>2. Données collectées</Heading>
      <P>Nous collectons les données suivantes :</P>
      <ul className="list-disc list-inside text-sm text-navy-600 mb-3 space-y-1 ml-2">
        <li><strong>Données d'identification :</strong> nom, prénom, adresse email</li>
        <li><strong>Données patrimoniales :</strong> biens immobiliers, financiers, professionnels, dettes (saisies volontairement)</li>
        <li><strong>Données familiales :</strong> composition familiale, dates de naissance, liens de parenté</li>
        <li><strong>Données d'usage :</strong> conversations avec l'assistant IA, réponses au canvas familial</li>
        <li><strong>Données techniques :</strong> adresse IP, type de navigateur (logs serveur)</li>
      </ul>

      <Heading>3. Finalités du traitement</Heading>
      <P>Vos données sont traitées pour :</P>
      <ul className="list-disc list-inside text-sm text-navy-600 mb-3 space-y-1 ml-2">
        <li>Fournir et personnaliser le Service (simulations, assistant IA, dossier notaire)</li>
        <li>Gérer votre compte et vos invitations familiales</li>
        <li>Améliorer le Service et corriger les bugs</li>
        <li>Respecter nos obligations légales</li>
      </ul>

      <Heading>4. Base légale</Heading>
      <P>
        Le traitement est fondé sur : l'exécution du contrat (CGU), votre consentement (assistant IA, cookies),
        et notre intérêt légitime (amélioration du service, sécurité).
      </P>

      <Heading>5. Partage des données</Heading>
      <P>
        Vos données ne sont jamais vendues. Elles peuvent être partagées avec :
      </P>
      <ul className="list-disc list-inside text-sm text-navy-600 mb-3 space-y-1 ml-2">
        <li><strong>Vercel</strong> (hébergement) — données techniques</li>
        <li><strong>Neon</strong> (base de données PostgreSQL) — données applicatives, chiffrées au repos</li>
        <li><strong>OpenRouter / modèles IA</strong> — contenu des conversations (anonymisé côté serveur)</li>
        <li><strong>Resend</strong> (emails transactionnels) — adresse email uniquement</li>
      </ul>
      <P>
        Les membres de votre famille invités ont accès aux données partagées dans votre espace familial, selon les
        permissions que vous définissez.
      </P>

      <Heading>6. Durée de conservation</Heading>
      <P>
        Vos données sont conservées tant que votre compte est actif. Après suppression du compte, les données sont
        effacées sous 30 jours, sauf obligation légale de conservation.
      </P>

      <Heading>7. Vos droits (RGPD)</Heading>
      <P>Conformément au Règlement Général sur la Protection des Données, vous disposez des droits suivants :</P>
      <ul className="list-disc list-inside text-sm text-navy-600 mb-3 space-y-1 ml-2">
        <li><strong>Droit d'accès</strong> — obtenir une copie de vos données</li>
        <li><strong>Droit de rectification</strong> — corriger des données inexactes</li>
        <li><strong>Droit à l'effacement</strong> — demander la suppression de vos données</li>
        <li><strong>Droit à la portabilité</strong> — recevoir vos données dans un format structuré</li>
        <li><strong>Droit d'opposition</strong> — vous opposer à certains traitements</li>
        <li><strong>Droit de retrait du consentement</strong> — à tout moment</li>
      </ul>
      <P>
        Pour exercer ces droits, contactez-nous à <strong>contact@leguefacile.fr</strong> ou via la fonction
        d'export de dossier dans votre espace.
      </P>

      <Heading>8. Sécurité</Heading>
      <P>
        Nous mettons en œuvre des mesures de sécurité appropriées : chiffrement des données au repos et en transit
        (TLS), hachage des mots de passe (bcrypt), tokens JWT à durée limitée, et accès restreint aux bases de données.
      </P>

      <Heading>9. Contact</Heading>
      <P>
        Pour toute question relative à vos données personnelles, contactez notre délégué à la protection des données
        à l'adresse : <strong>dpo@leguefacile.fr</strong>.
      </P>
      <P>
        Vous pouvez également adresser une réclamation à la CNIL : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="underline text-navy-700 hover:text-navy-900">www.cnil.fr</a>.
      </P>
    </>
  )
}
