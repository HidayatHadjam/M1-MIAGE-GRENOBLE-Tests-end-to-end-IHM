/**
 * DSL de test pour SauceDemo (https://www.saucedemo.com)
 *
 * Niveau d'abstraction : tâches et concepts.
 *  - Les ACTIONS correspondent aux tâches de l'utilisateur (T1 à T5 du README).
 *  - Les PERCEPTIONS correspondent à ce que l'utilisateur observe sur l'IHM.
 *  - Les paramètres sont des concepts (nom de produit, informations client...),
 *    jamais des sélecteurs CSS ni des actions articulatoires (clics, saisies).
 *
 * L'implémentation (l'interpréteur) est dans SauceDemoPlaywright.ts.
 */

// ---------------------------------------------------------------------------
// Concepts
// ---------------------------------------------------------------------------

/** Critères de tri du catalogue (concept : Catalogue) */
export type CritereTri = 'nom-a-z' | 'nom-z-a' | 'prix-croissant' | 'prix-decroissant';

/** Un produit tel qu'il est perçu par l'utilisateur (concept : Produit) */
export interface Produit {
  nom: string;
  prix: number;
}

/** Une ligne du panier (concept : Panier) */
export interface LignePanier extends Produit {
  quantite: number;
}

/** Informations saisies lors de la commande (concept : Commande).
 *  Un champ absent = champ laissé vide (utile pour la partition des entrées). */
export interface InfosClient {
  prenom?: string;
  nom?: string;
  codePostal?: string;
}

/** Récapitulatif de commande (concept : Commande) */
export interface Recapitulatif {
  articles: Produit[];
  itemTotal: number;
  taxe: number;
  total: number;
}

// ---------------------------------------------------------------------------
// DSL
// ---------------------------------------------------------------------------

export interface SauceDemoDSL {
  // =========================== ACTIONS ===========================

  // --- T1 S'authentifier ---
  /** T1.1 Se connecter (depuis la page de connexion) */
  seConnecter(identifiant: string, motDePasse: string): Promise<void>;
  /** T1.2 Se déconnecter */
  seDeconnecter(): Promise<void>;

  // --- T2 Consulter le catalogue ---
  /** T2.1 Voir la liste des produits */
  consulterCatalogue(): Promise<void>;
  /** T2.2 Trier les produits */
  trierProduits(critere: CritereTri): Promise<void>;
  /** T2.3 Voir le détail d'un produit */
  consulterFicheProduit(nomProduit: string): Promise<void>;

  // --- T3 Gérer le panier ---
  /** T3.1 Ajouter un produit depuis la page courante (catalogue ou fiche détail) */
  ajouterAuPanier(nomProduit: string): Promise<void>;
  /** T3.2 Retirer un produit depuis la page courante (catalogue, fiche ou panier) */
  retirerDuPanier(nomProduit: string): Promise<void>;
  /** T3.3 Consulter le panier */
  consulterPanier(): Promise<void>;
  /** T3.4 Continuer ses achats (retour au catalogue depuis le panier) */
  continuerAchats(): Promise<void>;

  // --- T4 Passer commande ---
  /** Début de T4 : depuis le panier, lancer la commande */
  commencerCommande(): Promise<void>;
  /** T4.1 Renseigner ses informations puis valider (les champs absents restent vides) */
  renseignerInformations(infos: InfosClient): Promise<void>;
  /** T4.3 Finaliser la commande (depuis le récapitulatif) */
  finaliserCommande(): Promise<void>;
  /** T4.4 Annuler la commande */
  annulerCommande(): Promise<void>;
  /** T4.5 Revenir à l'accueil après la commande ("Back Home") */
  revenirAccueil(): Promise<void>;
  /** T4.6 Générer le PDF de la commande ("Generate PDF order") */
  genererPdfCommande(): Promise<void>;

  // --- T5 Réinitialiser l'application ---
  /** T5 Réinitialiser l'état de l'application (Reset App State) */
  reinitialiserApplication(): Promise<void>;

  // ========================= PERCEPTIONS =========================

  // --- Navigation ---
  /** L'utilisateur voit la page de connexion */
  estSurPageConnexion(): Promise<boolean>;
  /** L'utilisateur voit le catalogue */
  estSurCatalogue(): Promise<boolean>;

  // --- Catalogue / Produit ---
  /** Produits affichés sur la page courante, dans l'ordre d'affichage */
  produitsAffiches(): Promise<Produit[]>;
  /** Vrai si le bouton du produit propose « Add to cart » (faux s'il propose « Remove ») */
  peutAjouter(nomProduit: string): Promise<boolean>;

  // --- Panier ---
  /** Nombre indiqué par la pastille du panier (0 si la pastille est absente) */
  nombreArticlesPastille(): Promise<number>;
  /** Contenu du panier (à appeler sur la page panier) */
  contenuPanier(): Promise<LignePanier[]>;
  /** Vrai si l'utilisateur peut modifier la quantité d'un produit dans le panier */
  quantiteModifiable(nomProduit: string): Promise<boolean>;

  // --- Commande ---
  /** Récapitulatif affiché avant de finaliser la commande */
  recapitulatif(): Promise<Recapitulatif>;
  /** Vrai si le message « Thank you for your order! » est affiché */
  commandeConfirmee(): Promise<boolean>;
  /** Vrai si un fichier PDF a été téléchargé après genererPdfCommande() */
  pdfTelecharge(): Promise<boolean>;

  // --- Erreurs ---
  /** Message d'erreur affiché (connexion ou formulaire), ou null s'il n'y en a pas */
  messageErreur(): Promise<string | null>;
}
