/**
 * Cas de test end-to-end de SauceDemo.
 *
 * Chaque test correspond à un scénario du README (S1 à S19).
 * Les tests n'utilisent QUE le DSL (dsl/SauceDemoDSL.ts) :
 *  - Given / When  → actions
 *  - Then          → perceptions + expect (le testeur est l'oracle)
 */
import { test, expect } from '@playwright/test';
import { SauceDemoDSL } from '../dsl/SauceDemoDSL';
import { SauceDemoPlaywright } from '../dsl/SauceDemoPlaywright';

// ---------------------------------------------------------------------------
// Données de test
// ---------------------------------------------------------------------------
const UTILISATEUR = 'standard_user';
const UTILISATEUR_BLOQUE = 'locked_out_user';
const MOT_DE_PASSE = 'secret_sauce';

const A = 'Sauce Labs Backpack';       // 29.99 $
const B = 'Sauce Labs Bike Light';     //  9.99 $
const C = 'Sauce Labs Bolt T-Shirt';   // 15.99 $
const TOUS_LES_PRODUITS = [
  'Sauce Labs Backpack',
  'Sauce Labs Bike Light',
  'Sauce Labs Bolt T-Shirt',
  'Sauce Labs Fleece Jacket',
  'Sauce Labs Onesie',
  'Test.allTheThings() T-Shirt (Red)',
];

const CLIENT = { prenom: 'Jean', nom: 'Dupont', codePostal: '38000' };

let app: SauceDemoDSL;

test.beforeEach(async ({ page }) => {
  app = new SauceDemoPlaywright(page);
});

// ===========================================================================
// Thème A : Authentification
// ===========================================================================
test.describe('Thème A - Authentification', () => {

  test('S1 - Connexion valide', async () => {
    // Given : je suis sur la page de connexion
    // When : je me connecte avec standard_user / secret_sauce
    await app.seConnecter(UTILISATEUR, MOT_DE_PASSE);
    // Then : je vois le catalogue avec 6 produits
    expect(await app.estSurCatalogue()).toBe(true);
    expect(await app.produitsAffiches()).toHaveLength(6);
  });

  test('S2 - Mot de passe incorrect', async () => {
    // When : je me connecte avec un mauvais mot de passe
    await app.seConnecter(UTILISATEUR, 'mauvais_mot_de_passe');
    // Then : un message d'erreur s'affiche et je reste sur la page de connexion
    expect(await app.messageErreur()).toContain('do not match');
    expect(await app.estSurPageConnexion()).toBe(true);
  });

  test('S3 - Identifiant vide', async () => {
    // When : je valide sans identifiant
    await app.seConnecter('', MOT_DE_PASSE);
    // Then : « Username is required »
    expect(await app.messageErreur()).toContain('Username is required');
  });

  test('S3 (variante) - Mot de passe vide', async () => {
    // When : je valide sans mot de passe
    await app.seConnecter(UTILISATEUR, '');
    // Then : « Password is required »
    expect(await app.messageErreur()).toContain('Password is required');
  });

  test('S4 - Compte bloqué', async () => {
    // When : je me connecte avec locked_out_user
    await app.seConnecter(UTILISATEUR_BLOQUE, MOT_DE_PASSE);
    // Then : un message indique que l'utilisateur est bloqué
    expect(await app.messageErreur()).toContain('locked out');
    expect(await app.estSurPageConnexion()).toBe(true);
  });

  test('S5 - Déconnexion', async () => {
    // Given : je suis connecté
    await app.seConnecter(UTILISATEUR, MOT_DE_PASSE);
    // When : je me déconnecte
    await app.seDeconnecter();
    // Then : je reviens à la page de connexion
    expect(await app.estSurPageConnexion()).toBe(true);
  });
});

// ===========================================================================
// Thème B : Cohérence panier / produit
// ===========================================================================
test.describe('Thème B - Cohérence panier / produit', () => {

  test.beforeEach(async () => {
    // Given commun : je suis connecté, le panier est vide
    await app.seConnecter(UTILISATEUR, MOT_DE_PASSE);
  });

  test('S6 - Ajout d\'un produit', async () => {
    // Given : le panier est vide (pas de pastille)
    expect(await app.nombreArticlesPastille()).toBe(0);
    // When : j'ajoute A au panier
    await app.ajouterAuPanier(A);
    // Then : la pastille indique 1 et le bouton de A devient « Remove »
    expect(await app.nombreArticlesPastille()).toBe(1);
    expect(await app.peutAjouter(A)).toBe(false);
  });

  test('S7 - Retrait d\'un produit', async () => {
    // Given : le panier contient A, B et C ; la pastille indique 3
    await app.ajouterAuPanier(A);
    await app.ajouterAuPanier(B);
    await app.ajouterAuPanier(C);
    expect(await app.nombreArticlesPastille()).toBe(3);
    // When : je retire B du panier
    await app.consulterPanier();
    await app.retirerDuPanier(B);
    // Then : le panier contient seulement A et C ; la pastille indique 2
    expect((await app.contenuPanier()).map(p => p.nom)).toEqual([A, C]);
    expect(await app.nombreArticlesPastille()).toBe(2);
    // And : sur le récapitulatif, Item total = 45.98 $
    await app.commencerCommande();
    await app.renseignerInformations(CLIENT);
    expect((await app.recapitulatif()).itemTotal).toBeCloseTo(45.98, 2);
  });

  test('S8 - Limite haute : ajout des 6 produits', async () => {
    // When : j'ajoute les 6 produits
    for (const produit of TOUS_LES_PRODUITS) {
      await app.ajouterAuPanier(produit);
    }
    // Then : la pastille indique 6 et le panier liste les 6 produits
    expect(await app.nombreArticlesPastille()).toBe(6);
    await app.consulterPanier();
    const noms = (await app.contenuPanier()).map(p => p.nom);
    expect(noms.sort()).toEqual([...TOUS_LES_PRODUITS].sort());
  });

  test('S9 - Limite basse : retrait du dernier article', async () => {
    // Given : le panier contient seulement A (pastille à 1)
    await app.ajouterAuPanier(A);
    expect(await app.nombreArticlesPastille()).toBe(1);
    // When : je retire A
    await app.retirerDuPanier(A);
    // Then : la pastille disparaît et le panier est vide
    expect(await app.nombreArticlesPastille()).toBe(0);
    await app.consulterPanier();
    expect(await app.contenuPanier()).toHaveLength(0);
  });

  test('S10 - Cohérence catalogue ↔ panier (ajout depuis la fiche détail)', async () => {
    // Given : je relève le prix de A dans le catalogue
    const produitCatalogue = (await app.produitsAffiches()).find(p => p.nom === A);
    expect(produitCatalogue).toBeDefined();
    // When : j'ajoute A depuis sa fiche détail
    await app.consulterFicheProduit(A);
    await app.ajouterAuPanier(A);
    // Then : A est dans le panier avec le même nom et le même prix
    await app.consulterPanier();
    expect(await app.contenuPanier()).toEqual([
      { nom: A, prix: produitCatalogue!.prix, quantite: 1 },
    ]);
  });

  test('S19 - Quantité limitée à 1 par produit', async () => {
    // When : j'ajoute A au panier
    await app.ajouterAuPanier(A);
    // Then : impossible d'ajouter A une 2e fois ; la pastille indique 1
    expect(await app.peutAjouter(A)).toBe(false);
    expect(await app.nombreArticlesPastille()).toBe(1);
    // And : dans le panier, la quantité de A vaut 1 et n'est pas modifiable
    await app.consulterPanier();
    expect((await app.contenuPanier())[0].quantite).toBe(1);
    expect(await app.quantiteModifiable(A)).toBe(false);
    // Variante : la fiche détail de A affiche aussi « Remove »
    await app.continuerAchats();
    await app.consulterFicheProduit(A);
    expect(await app.peutAjouter(A)).toBe(false);
  });
});

// ===========================================================================
// Thème C : Catalogue
// ===========================================================================
test.describe('Thème C - Catalogue', () => {

  test.beforeEach(async () => {
    await app.seConnecter(UTILISATEUR, MOT_DE_PASSE);
  });

  test('S11 - Tri par prix croissant', async () => {
    // When : je trie par prix croissant
    await app.trierProduits('prix-croissant');
    // Then : 7.99 $ en premier, 49.99 $ en dernier, ordre croissant
    const prix = (await app.produitsAffiches()).map(p => p.prix);
    expect(prix[0]).toBe(7.99);
    expect(prix[prix.length - 1]).toBe(49.99);
    expect(prix).toEqual([...prix].sort((x, y) => x - y));
  });

  test('S12 - Tri de Z à A', async () => {
    // When : je trie de Z à A
    await app.trierProduits('nom-z-a');
    // Then : les noms sont dans l'ordre alphabétique inverse
    const noms = (await app.produitsAffiches()).map(p => p.nom);
    expect(noms).toEqual([...noms].sort().reverse());
  });
});

// ===========================================================================
// Thème D : Commande
// ===========================================================================
test.describe('Thème D - Commande', () => {

  test.beforeEach(async () => {
    await app.seConnecter(UTILISATEUR, MOT_DE_PASSE);
  });

  test('S13 - Commande complète', async () => {
    // Given : le panier contient A
    await app.ajouterAuPanier(A);
    // When : je passe commande avec Jean / Dupont / 38000 et je finalise
    await app.consulterPanier();
    await app.commencerCommande();
    await app.renseignerInformations(CLIENT);
    await app.finaliserCommande();
    // Then : « Thank you for your order! » ; la pastille disparaît
    expect(await app.commandeConfirmee()).toBe(true);
    expect(await app.nombreArticlesPastille()).toBe(0);
  });

  // Partition des entrées : chaque champ vide un par un
  const champsManquants = [
    { cas: 'sans prénom', infos: { nom: 'Dupont', codePostal: '38000' }, erreur: 'First Name is required' },
    { cas: 'sans nom', infos: { prenom: 'Jean', codePostal: '38000' }, erreur: 'Last Name is required' },
    { cas: 'sans code postal', infos: { prenom: 'Jean', nom: 'Dupont' }, erreur: 'Postal Code is required' },
  ];
  for (const { cas, infos, erreur } of champsManquants) {
    test(`S14 - Formulaire de commande ${cas}`, async () => {
      // Given : le panier contient A
      await app.ajouterAuPanier(A);
      // When : je passe commande avec un champ manquant
      await app.consulterPanier();
      await app.commencerCommande();
      await app.renseignerInformations(infos);
      // Then : le message d'erreur correspondant s'affiche
      expect(await app.messageErreur()).toContain(erreur);
    });
  }

  test('S15 - Exactitude du récapitulatif', async () => {
    // Given : le panier contient A et C
    await app.ajouterAuPanier(A);
    await app.ajouterAuPanier(C);
    // When : j'arrive sur le récapitulatif de commande
    await app.consulterPanier();
    await app.commencerCommande();
    await app.renseignerInformations(CLIENT);
    // Then : Item total = somme des prix ; Total = Item total + Tax
    const recap = await app.recapitulatif();
    const somme = recap.articles.reduce((total, p) => total + p.prix, 0);
    expect(recap.itemTotal).toBeCloseTo(somme, 2);
    expect(recap.total).toBeCloseTo(recap.itemTotal + recap.taxe, 2);
  });

  test('S16 - Commande avec un panier vide', async () => {
    // Oracle retenu : la commande doit être refusée avec un message
    // « vous ne pouvez pas effectuer une commande, le panier est vide ».
    // Le site accepte cette commande : échec attendu (écart avec la spécification).
    test.fail();
    // Given : le panier est vide
    expect(await app.nombreArticlesPastille()).toBe(0);
    // When : je tente de passer commande
    await app.consulterPanier();
    await app.commencerCommande();
    // Then : un message indique que la commande est impossible
    expect(await app.messageErreur()).not.toBeNull();
  });

  test('S17 - Retour à l\'accueil après la commande', async () => {
    // Given : je viens de finaliser une commande
    await app.ajouterAuPanier(A);
    await app.consulterPanier();
    await app.commencerCommande();
    await app.renseignerInformations(CLIENT);
    await app.finaliserCommande();
    expect(await app.commandeConfirmee()).toBe(true);
    // When : je clique sur « Back Home »
    await app.revenirAccueil();
    // Then : catalogue avec 6 produits, pas de pastille, tous les boutons « Add to cart »
    expect(await app.estSurCatalogue()).toBe(true);
    const produits = await app.produitsAffiches();
    expect(produits).toHaveLength(6);
    expect(await app.nombreArticlesPastille()).toBe(0);
    for (const produit of produits) {
      expect(await app.peutAjouter(produit.nom)).toBe(true);
    }
  });

  test('S18 - Génération du PDF de la commande', async () => {
    // Given : je viens de finaliser une commande avec A et C
    await app.ajouterAuPanier(A);
    await app.ajouterAuPanier(C);
    await app.consulterPanier();
    await app.commencerCommande();
    await app.renseignerInformations(CLIENT);
    await app.finaliserCommande();
    // When : je génère le PDF de la commande
    await app.genererPdfCommande();
    // Then : un fichier PDF est téléchargé
    expect(await app.pdfTelecharge()).toBe(true);
  });
});
