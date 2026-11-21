/**
 * Interpréteur du DSL SauceDemo, implémenté avec Playwright.
 *
 * C'est le SEUL fichier qui connaît l'interface concrète du site :
 * URLs, sélecteurs (attributs data-test), clics, saisies.
 * Si l'interface de SauceDemo évolue, seul ce fichier est à modifier :
 * les scénarios de test (tests/scenarios.spec.ts) restent inchangés.
 *
 * Stratégie de sélection des éléments :
 *  1. attributs data-test, prévus par le site pour les tests (stables) ;
 *  2. rôles et textes accessibles (getByRole) pour les boutons « Add to cart »,
 *     « Remove », les liens du menu et « Generate PDF order ».
 */
import { Page, Locator, Download } from '@playwright/test';
import {
  SauceDemoDSL, CritereTri, Produit, LignePanier, InfosClient, Recapitulatif,
} from './SauceDemoDSL';

/** Correspondance entre les critères du DSL et les valeurs de la liste de tri du site */
const VALEURS_TRI: Record<CritereTri, string> = {
  'nom-a-z': 'az',
  'nom-z-a': 'za',
  'prix-croissant': 'lohi',
  'prix-decroissant': 'hilo',
};

/** Échappe les caractères spéciaux d'un texte pour l'utiliser dans une RegExp */
function echapper(texte: string): string {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Convertit un texte de prix (« $29.99 », « Item total: $55.97 ») en nombre */
function lirePrix(texte: string | null): number {
  const montants = (texte ?? '').match(/\d+(\.\d+)?/g);
  if (!montants) throw new Error(`Prix illisible : "${texte}"`);
  return parseFloat(montants[montants.length - 1]);
}

export class SauceDemoPlaywright implements SauceDemoDSL {
  private dernierTelechargement: Download | null = null;

  constructor(private readonly page: Page) {}

  // =====================================================================
  // Fonctions utilitaires (niveau articulatoire, non exposées au DSL)
  // =====================================================================

  private sel(dataTest: string): Locator {
    return this.page.locator(`[data-test="${dataTest}"]`);
  }

  /** Zone de la page qui contient le produit demandé (carte du catalogue,
   *  ligne du panier, ou toute la page sur la fiche détail). */
  private zoneProduit(nomProduit: string): Locator {
    if (this.page.url().includes('inventory-item.html')) {
      return this.page.locator('body');
    }
    const nomExact = new RegExp(`^\\s*${echapper(nomProduit)}\\s*$`);
    return this.sel('inventory-item').filter({
      has: this.sel('inventory-item-name').filter({ hasText: nomExact }),
    });
  }

  /** Ouvre le menu latéral et clique sur une entrée */
  private async choisirDansMenu(entree: string): Promise<void> {
    await this.page.locator('#react-burger-menu-btn').click();
    // Les entrées du menu peuvent être des liens <a> ou des <button> selon la
    // version du site : on accepte les deux rôles, dans la navigation du menu.
    const menu = this.page.getByRole('navigation');
    const lien = menu.getByRole('link', { name: entree, exact: true })
      .or(menu.getByRole('button', { name: entree, exact: true }));
    await lien.waitFor({ state: 'visible' });
    await lien.click();
  }

  /** Lit nom + prix de chaque produit d'une liste (catalogue, panier, récapitulatif) */
  private async lireProduits(): Promise<Produit[]> {
    const items = this.sel('inventory-item');
    const produits: Produit[] = [];
    for (const item of await items.all()) {
      const nom = (await item.locator('[data-test="inventory-item-name"]').textContent())?.trim() ?? '';
      const prix = lirePrix(await item.locator('[data-test="inventory-item-price"]').textContent());
      produits.push({ nom, prix });
    }
    return produits;
  }

  // =====================================================================
  // ACTIONS
  // =====================================================================

  // --- T1 S'authentifier ---
  async seConnecter(identifiant: string, motDePasse: string): Promise<void> {
    await this.page.goto('/');
    await this.sel('username').fill(identifiant);
    await this.sel('password').fill(motDePasse);
    await this.sel('login-button').click();
    // Attendre le résultat : catalogue affiché OU message d'erreur
    await this.page.locator('[data-test="inventory-list"], [data-test="error"]').first().waitFor();
  }

  async seDeconnecter(): Promise<void> {
    await this.choisirDansMenu('Logout');
    await this.sel('login-button').waitFor();
  }

  // --- T2 Consulter le catalogue ---
  async consulterCatalogue(): Promise<void> {
    await this.page.goto('/inventory.html');
  }

  async trierProduits(critere: CritereTri): Promise<void> {
    await this.sel('product-sort-container').selectOption(VALEURS_TRI[critere]);
  }

  async consulterFicheProduit(nomProduit: string): Promise<void> {
    await this.zoneProduit(nomProduit).locator('[data-test="inventory-item-name"]').click();
    await this.page.waitForURL(/inventory-item\.html/);
  }

  // --- T3 Gérer le panier ---
  async ajouterAuPanier(nomProduit: string): Promise<void> {
    await this.zoneProduit(nomProduit).getByRole('button', { name: 'Add to cart' }).click();
  }

  async retirerDuPanier(nomProduit: string): Promise<void> {
    await this.zoneProduit(nomProduit).getByRole('button', { name: 'Remove' }).click();
  }

  async consulterPanier(): Promise<void> {
    await this.sel('shopping-cart-link').click();
    await this.page.waitForURL(/cart\.html/);
  }

  async continuerAchats(): Promise<void> {
    await this.sel('continue-shopping').click();
    await this.page.waitForURL(/inventory\.html/);
  }

  // --- T4 Passer commande ---
  async commencerCommande(): Promise<void> {
    await this.sel('checkout').click();
    // Attendre le formulaire de commande OU un message d'erreur
    await this.page.locator('[data-test="firstName"], [data-test="error"]').first().waitFor();
  }

  async renseignerInformations(infos: InfosClient): Promise<void> {
    await this.sel('firstName').fill(infos.prenom ?? '');
    await this.sel('lastName').fill(infos.nom ?? '');
    await this.sel('postalCode').fill(infos.codePostal ?? '');
    await this.sel('continue').click();
    // Attendre le récapitulatif OU un message d'erreur
    await this.page.locator('[data-test="subtotal-label"], [data-test="error"]').first().waitFor();
  }

  async finaliserCommande(): Promise<void> {
    await this.sel('finish').click();
    await this.sel('complete-header').waitFor();
  }

  async annulerCommande(): Promise<void> {
    await this.sel('cancel').click();
  }

  async revenirAccueil(): Promise<void> {
    await this.sel('back-to-products').click();
    await this.page.waitForURL(/inventory\.html/);
  }

  async genererPdfCommande(): Promise<void> {
    this.dernierTelechargement = null;
    const attenteTelechargement = this.page.waitForEvent('download', { timeout: 10_000 });
    await this.page.getByRole('button', { name: /generate pdf/i }).click();
    try {
      this.dernierTelechargement = await attenteTelechargement;
    } catch {
      this.dernierTelechargement = null; // aucun téléchargement dans le délai
    }
  }

  // --- T5 Réinitialiser l'application ---
  async reinitialiserApplication(): Promise<void> {
    await this.choisirDansMenu('Reset App State');
    await this.page.reload(); // le site ne rafraîchit pas les boutons après un reset
  }

  // =====================================================================
  // PERCEPTIONS
  // =====================================================================

  async estSurPageConnexion(): Promise<boolean> {
    return this.sel('login-button').isVisible();
  }

  async estSurCatalogue(): Promise<boolean> {
    return this.page.url().includes('inventory.html')
      && await this.sel('inventory-list').isVisible();
  }

  async produitsAffiches(): Promise<Produit[]> {
    await this.sel('inventory-item').first().waitFor();
    return this.lireProduits();
  }

  async peutAjouter(nomProduit: string): Promise<boolean> {
    const zone = this.zoneProduit(nomProduit);
    await zone.getByRole('button', { name: /add to cart|remove/i }).first().waitFor();
    return (await zone.getByRole('button', { name: 'Add to cart' }).count()) > 0;
  }

  async nombreArticlesPastille(): Promise<number> {
    const pastille = this.sel('shopping-cart-badge');
    if ((await pastille.count()) === 0) return 0;
    return parseInt((await pastille.textContent()) ?? '0', 10);
  }

  async contenuPanier(): Promise<LignePanier[]> {
    const lignes: LignePanier[] = [];
    for (const item of await this.sel('inventory-item').all()) {
      const nom = (await item.locator('[data-test="inventory-item-name"]').textContent())?.trim() ?? '';
      const prix = lirePrix(await item.locator('[data-test="inventory-item-price"]').textContent());
      const quantite = parseInt((await item.locator('[data-test="item-quantity"]').textContent()) ?? '0', 10);
      lignes.push({ nom, prix, quantite });
    }
    return lignes;
  }

  async quantiteModifiable(nomProduit: string): Promise<boolean> {
    // La quantité est modifiable si la ligne contient un champ de saisie
    const champs = this.zoneProduit(nomProduit)
      .locator('input, select, textarea, [contenteditable="true"]');
    return (await champs.count()) > 0;
  }

  async recapitulatif(): Promise<Recapitulatif> {
    await this.sel('subtotal-label').waitFor();
    return {
      articles: await this.lireProduits(),
      itemTotal: lirePrix(await this.sel('subtotal-label').textContent()),
      taxe: lirePrix(await this.sel('tax-label').textContent()),
      total: lirePrix(await this.sel('total-label').textContent()),
    };
  }

  async commandeConfirmee(): Promise<boolean> {
    const titre = this.sel('complete-header');
    return (await titre.isVisible())
      && ((await titre.textContent()) ?? '').includes('Thank you for your order!');
  }

  async pdfTelecharge(): Promise<boolean> {
    return this.dernierTelechargement !== null
      && this.dernierTelechargement.suggestedFilename().toLowerCase().endsWith('.pdf');
  }

  async messageErreur(): Promise<string | null> {
    const erreur = this.sel('error');
    if (!(await erreur.isVisible())) return null;
    return ((await erreur.textContent()) ?? '').trim();
  }
}
