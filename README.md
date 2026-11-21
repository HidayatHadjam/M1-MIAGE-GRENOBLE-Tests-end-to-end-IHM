# Tests end-to-end de SauceDemo
## Contexte
Tests de vérification en **boîte noire** du site [SauceDemo](https://www.saucedemo.com), réalisés avec **Playwright** (TypeScript) à l'aide d'un **DSL de test** de niveau tâches et concepts.

## Binôme
- Hidayat HADJAM
- Chaimaa FAJJAR

---

## 1. Analyse du système à tester : concepts et tâches

### 1.1 Concepts manipulés par l'utilisateur

| Concept | Données |
|---|---|
| **Utilisateur** | identifiant, mot de passe, type de compte (standard, bloqué, ...) |
| **Produit** | nom, description, prix (6 produits au total) |
| **Catalogue** | liste des produits, ordre de tri |
| **Panier** | liste des produits choisis, quantité par produit (toujours 1), pastille indiquant le nombre d'articles |
| **Commande** | prénom, nom, code postal, récapitulatif (Item total, Tax, Total), confirmation, PDF de la commande |

### 1.2 Tâches de l'utilisateur

```
T1 S'authentifier
   T1.1 Se connecter (saisir identifiant + mot de passe, valider)
   T1.2 Se déconnecter 

T2 Consulter le catalogue
   T2.1 Voir la liste des produits
   T2.2 Trier les produits (nom A-Z, Z-A, prix croissant, prix décroissant)
   T2.3 Voir le détail d'un produit

T3 Gérer le panier
   T3.1 Ajouter un produit (depuis le catalogue ou la fiche détail)
   T3.2 Retirer un produit (depuis le catalogue, la fiche détail ou le panier)
   T3.3 Consulter le panier
   T3.4 Continuer ses achats (retour au catalogue)

T4 Passer commande
   T4.1 Renseigner ses informations (prénom, nom, code postal)
   T4.2 Consulter le récapitulatif (articles, Item total, Tax, Total)
   T4.3 Finaliser la commande
   T4.4 Annuler la commande
   T4.5 Revenir à l'accueil après la commande ("Back Home")
   T4.6 Générer le PDF de la commande ("Generate PDF order")

T5 Réinitialiser l'application (Reset App State)
```

---

## 2. Stratégie de production des cas de test

Notre stratégie suit les principes des tests en boîte noire vus en cours :

1. **Couverture des tâches** : chaque tâche identifiée (T1 à T5) est couverte par au moins un scénario.
2. **Valeurs limites** : d'expérience, les erreurs sont plus souvent liées aux valeurs limites. Pour chaque variable, nous avons identifié son domaine et testé les valeurs Ω − δ, Ω et Ω + δ.
3. **Partition des entrées** : pour les entrées (identifiants, formulaire), nous testons un représentant de chaque classe d'équivalence (valide, invalide, vide, ...).
4. **Le testeur est l'oracle** : pour chaque scénario nous spécifions le résultat attendu. Quand la spécification ne permet pas de le déterminer, nous le signalons comme **ambiguïté** .
5. **Un test end-to-end par scénario**, chaque test pouvant comporter plusieurs étapes.

### Variables, domaines et valeurs testées

Dans les tableaux suivants, **Sn** désigne le scénario numéro n (voir section 3).

| Variable | Domaine | Valeurs testées | Scénarios |
|---|---|---|---|
| Nombre d'articles dans le panier | 0 à 6 | 0 → 1, 3 → 2, 1 → 0 (limite basse), 6 (limite haute) | S6, S7, S8, S9, S16 |
| Quantité d'un même produit | {0, 1} | 1 → tentative de 2 (Ω + δ) | S19 |
| Identifiants de connexion | valides / mot de passe invalide / champ vide / compte bloqué | un représentant par classe | S1, S2, S3, S4 |
| Champs du formulaire de commande | vide / rempli (× 3 champs) | chaque champ vide un par un, puis tous remplis | S13, S14 |
| Critère de tri | 4 options | prix croissant, Z → A | S11, S12 |

---

## 3. Scénarios de test

Produits utilisés dans les scénarios :
- **A** = Sauce Labs Backpack (29.99 $)
- **B** = Sauce Labs Bike Light (9.99 $)
- **C** = Sauce Labs Bolt T-Shirt (15.99 $)

Sauf mention contraire, l'utilisateur est connecté avec `standard_user` / `secret_sauce`.

### Thème A : Authentification

| # | Given | When | Then |
|---|---|---|---|
| S1 | Je suis sur la page de connexion | Je me connecte avec `standard_user` / `secret_sauce` | Je vois le catalogue avec 6 produits | 
| S2 | Je suis sur la page de connexion | Je me connecte avec `standard_user` et un mauvais mot de passe | Un message d'erreur indique que l'identifiant et le mot de passe ne correspondent pas ; je reste sur la page de connexion |
| S3 | Je suis sur la page de connexion | Je valide sans identifiant (variante : sans mot de passe) | Le message « Username is required » (variante : « Password is required ») s'affiche | 
| S4 | Je suis sur la page de connexion | Je me connecte avec `locked_out_user` | Un message indique que l'utilisateur est bloqué | 
| S5 | Je suis connecté | Je me déconnecte | Je reviens à la page de connexion | 

### Thème B : Cohérence panier / produit

| # | Given | When | Then |
|---|---|---|---|
| S6 | Le panier est vide (pas de pastille) | J'ajoute A au panier | La pastille indique 1 ; le bouton de A devient « Remove » | 
| S7 | Le panier contient A, B et C ; la pastille indique 3 | Je retire B du panier | Le panier contient seulement A et C ; la pastille indique 2 ; sur le récapitulatif, Item total = 45.98 $ |
| S8 | Le panier est vide | J'ajoute les 6 produits | La pastille indique 6 ; le panier liste les 6 produits | 
| S9 | Le panier contient seulement A (pastille à 1) | Je retire A | La pastille disparaît ; le panier est vide | 
| S10 | Le panier est vide | J'ajoute A depuis sa fiche détail | A apparaît dans le panier avec le même nom et le même prix que dans le catalogue | 
| S19 | Le panier est vide | J'ajoute A au panier | Le bouton de A devient « Remove » (impossible d'ajouter A une 2ᵉ fois) ; la pastille indique 1 ; dans le panier, la quantité de A vaut 1 et n'est pas modifiable. Variante : la fiche détail de A affiche aussi « Remove » | 

### Thème C : Catalogue

| # | Given | When | Then |
|---|---|---|---|
| S11 | Je suis sur le catalogue | Je trie par prix croissant | Le premier produit coûte 7.99 $, le dernier 49.99 $ ; les prix sont dans l'ordre croissant | 
| S12 | Je suis sur le catalogue | Je trie de Z à A | Les noms des produits sont dans l'ordre alphabétique inverse | 

### Thème D : Commande

| # | Given | When | Then |
|---|---|---|---|
| S13 | Le panier contient A | Je passe commande avec « Jean / Dupont / 38000 » et je finalise | Le message « Thank you for your order! » s'affiche ; la pastille disparaît | 
| S14 | Le panier contient A | Je passe commande sans prénom (variantes : sans nom, sans code postal) | Le message « Error: First Name is required » s'affiche (resp. Last Name, Postal Code) | 
| S15 | Le panier contient A et C | J'arrive sur le récapitulatif de commande | Item total = somme des prix des articles ; Total = Item total + Tax | 
| S16 | Le panier est vide | Je tente de passer commande | Un message indique « vous ne pouvez pas effectuer une commande, le panier est vide » (voir ambiguïté n°2) |
| S17 | Je viens de finaliser une commande | Je clique sur « Back Home » | Je vois le catalogue avec 6 produits ; la pastille est absente ; tous les boutons affichent « Add to cart » | 
| S18 | Je viens de finaliser une commande avec A et C | Je génère le PDF de la commande | Un fichier PDF est téléchargé  | 

### Correspondance scénarios ↔ cas de test

Tous les cas de test sont dans [`tests/scenarios.spec.ts`](tests/scenarios.spec.ts). Chaque test porte le numéro de son scénario.

| Scénario | Test Playwright (`describe` › `test`) |
|---|---|
| S1 | Thème A - Authentification › `S1 - Connexion valide` |
| S2 | Thème A - Authentification › `S2 - Mot de passe incorrect` |
| S3 | Thème A - Authentification › `S3 - Identifiant vide` et `S3 (variante) - Mot de passe vide` |
| S4 | Thème A - Authentification › `S4 - Compte bloqué` |
| S5 | Thème A - Authentification › `S5 - Déconnexion` |
| S6 | Thème B - Cohérence panier / produit › `S6 - Ajout d'un produit` |
| S7 | Thème B - Cohérence panier / produit › `S7 - Retrait d'un produit` |
| S8 | Thème B - Cohérence panier / produit › `S8 - Limite haute : ajout des 6 produits` |
| S9 | Thème B - Cohérence panier / produit › `S9 - Limite basse : retrait du dernier article` |
| S10 | Thème B - Cohérence panier / produit › `S10 - Cohérence catalogue ↔ panier (ajout depuis la fiche détail)` |
| S11 | Thème C - Catalogue › `S11 - Tri par prix croissant` |
| S12 | Thème C - Catalogue › `S12 - Tri de Z à A` |
| S13 | Thème D - Commande › `S13 - Commande complète` |
| S14 | Thème D - Commande › `S14 - Formulaire de commande sans prénom / sans nom / sans code postal` (3 tests) |
| S15 | Thème D - Commande › `S15 - Exactitude du récapitulatif` |
| S16 | Thème D - Commande › `S16 - Commande avec un panier vide` (échec attendu, `test.fail()`) |
| S17 | Thème D - Commande › `S17 - Retour à l'accueil après la commande` |
| S18 | Thème D - Commande › `S18 - Génération du PDF de la commande` |
| S19 | Thème B - Cohérence panier / produit › `S19 - Quantité limitée à 1 par produit` |

Dans chaque test, les commentaires `Given / When / Then` reprennent le scénario : les lignes *Given / When* appellent les **actions** du DSL et les lignes *Then* comparent les **perceptions** au résultat attendu (`expect`).

---

## 4. Ambiguïtés relevées dans la spécification

Définir les données de test et les résultats attendus nous a permis de repérer plusieurs points que la spécification ne tranche pas :

1. **Prix total du panier (S7)** : la page panier n'affiche pas de total. Le total n'est visible que sur le récapitulatif de commande. Nous vérifions donc le montant à cette étape.
2. **Commande avec un panier vide (S16)** : rien n'indique si la commande doit être bloquée. **Oracle retenu** : la commande doit être refusée avec le message « vous ne pouvez pas effectuer une commande, le panier est vide ». Or le site accepte la commande : le test S16 révèle donc un **écart entre le comportement du site et notre spécification**. Il est marqué `test.fail()` (échec attendu) : la suite reste verte, et Playwright nous signalera si le comportement du site change.
3. **Contenu du PDF de commande (S18)** : la spécification ne dit pas ce que le PDF doit contenir (articles, total, informations client). Notre oracle vérifie au minimum qu'un PDF est téléchargé.
4. **Quantité par produit (S19)** : le site limite la quantité à 1 par produit, sans possibilité de la modifier. Nous considérons ce comportement comme voulu.

---

## 5. Description du DSL de test

Le DSL est défini par l'interface TypeScript `SauceDemoDSL` (fichier [`dsl/SauceDemoDSL.ts`](dsl/SauceDemoDSL.ts)).

Conformément aux conseils du cours, il sépare :
- des **fonctions actions** : comment l'utilisateur interagit avec l'IHM, au **niveau tâche** ;
- des **fonctions de perception** (vérification) : ce que l'utilisateur doit observer sur l'IHM.

Les scénarios de test sont écrits **uniquement** avec ces fonctions : les lignes *Given / When* utilisent les actions et les lignes *Then* utilisent les perceptions. Les paramètres sont des **concepts** (nom d'un produit, informations client, critère de tri) et jamais des sélecteurs CSS ou des clics. Les tests restent ainsi lisibles et indépendants de l'interface concrète.

### 5.1 Concepts (types du DSL)

| Type TypeScript | Concept | Contenu |
|---|---|---|
| `Produit` | Produit | nom, prix |
| `LignePanier` | Panier | nom, prix, quantité |
| `CritereTri` | Catalogue | `nom-a-z`, `nom-z-a`, `prix-croissant`, `prix-decroissant` |
| `InfosClient` | Commande | prénom, nom, code postal (un champ absent = champ laissé vide) |
| `Recapitulatif` | Commande | articles, Item total, Tax, Total |

### 5.2 Actions et tâches correspondantes

| Tâche | Action du DSL |
|---|---|
| T1.1 Se connecter | `seConnecter(identifiant, motDePasse)` |
| T1.2 Se déconnecter | `seDeconnecter()` |
| T2.1 Voir la liste des produits | `consulterCatalogue()` |
| T2.2 Trier les produits | `trierProduits(critere)` |
| T2.3 Voir le détail d'un produit | `consulterFicheProduit(nomProduit)` |
| T3.1 Ajouter un produit | `ajouterAuPanier(nomProduit)` (depuis le catalogue ou la fiche) |
| T3.2 Retirer un produit | `retirerDuPanier(nomProduit)` (depuis le catalogue, la fiche ou le panier) |
| T3.3 Consulter le panier | `consulterPanier()` |
| T3.4 Continuer ses achats | `continuerAchats()` |
| T4 Passer commande (début) | `commencerCommande()` |
| T4.1 Renseigner ses informations | `renseignerInformations(infos)` |
| T4.2 Consulter le récapitulatif | (affiché automatiquement après T4.1, lu par `recapitulatif()`) |
| T4.3 Finaliser la commande | `finaliserCommande()` |
| T4.4 Annuler la commande | `annulerCommande()` |
| T4.5 Revenir à l'accueil | `revenirAccueil()` |
| T4.6 Générer le PDF | `genererPdfCommande()` |
| T5 Réinitialiser l'application | `reinitialiserApplication()` |

### 5.3 Perceptions

| Ce que l'utilisateur observe | Perception du DSL | Utilisée dans |
|---|---|---|
| Il est sur la page de connexion | `estSurPageConnexion()` | S2, S5 |
| Il est sur le catalogue | `estSurCatalogue()` | S1, S17 |
| Les produits affichés et leur ordre | `produitsAffiches()` | S1, S11, S12, S17 |
| Le bouton d'un produit (« Add to cart » ou « Remove ») | `peutAjouter(nomProduit)` | S6, S17, S19 |
| Le nombre de la pastille (0 si absente) | `nombreArticlesPastille()` | S6 à S9, S13, S17, S19 |
| Le contenu du panier | `contenuPanier()` | S7 à S10, S19 |
| La quantité est-elle modifiable ? | `quantiteModifiable(nomProduit)` | S19 |
| Les montants du récapitulatif | `recapitulatif()` | S7, S15 |
| Le message « Thank you for your order! » | `commandeConfirmee()` | S13, S16, S17, S18 |
| Le téléchargement du PDF | `pdfTelecharge()` | S18 |
| Le message d'erreur | `messageErreur()` | S2, S3, S4, S14 |

### 5.4 Exemple : scénario S7 écrit avec le DSL

```ts
// Given : le panier contient A, B et C
await app.seConnecter('standard_user', 'secret_sauce');
await app.ajouterAuPanier(A);
await app.ajouterAuPanier(B);
await app.ajouterAuPanier(C);
expect(await app.nombreArticlesPastille()).toBe(3);

// When : je retire B du panier
await app.consulterPanier();
await app.retirerDuPanier(B);

// Then : le panier contient seulement A et C, la pastille indique 2
expect((await app.contenuPanier()).map(p => p.nom)).toEqual([A, C]);
expect(await app.nombreArticlesPastille()).toBe(2);

// And : sur le récapitulatif, Item total = 45.98 $
await app.commencerCommande();
await app.renseignerInformations({ prenom: 'Jean', nom: 'Dupont', codePostal: '38000' });
expect((await app.recapitulatif()).itemTotal).toBeCloseTo(45.98);
```

## 6. Stratégie d'implémentation du DSL

L'interpréteur du DSL est la classe `SauceDemoPlaywright` (fichier [`dsl/SauceDemoPlaywright.ts`](dsl/SauceDemoPlaywright.ts)). Elle **implémente l'interface `SauceDemoDSL`** avec Playwright.

### 6.1 Séparation des responsabilités

```
tests/scenarios.spec.ts      → QUOI tester (scénarios, oracle)      : aucun sélecteur
dsl/SauceDemoDSL.ts          → le vocabulaire (tâches, concepts)     : aucun détail technique
dsl/SauceDemoPlaywright.ts   → COMMENT interagir avec le site       : URLs, sélecteurs, clics
```

C'est le **seul** fichier qui connaît l'interface concrète du site. Si l'interface de SauceDemo évolue, seul l'interpréteur doit être modifié : les scénarios restent inchangés (maintenabilité).

### 6.2 Choix techniques

- **Sélecteurs `data-test`** : le site fournit des attributs `data-test` prévus pour les tests (`username`, `login-button`, `shopping-cart-badge`, `checkout`, `subtotal-label`, ...). Ils sont plus stables que les classes CSS ou la structure HTML.
- **Rôles accessibles (`getByRole`)** pour les boutons identifiés par leur texte : « Add to cart », « Remove », « Generate PDF order ». Les entrées du menu (« Logout », « Reset App State ») sont repérées par leur `data-test` (voir 6.4).
- **Repérage d'un produit par son nom** : la méthode privée `zoneProduit(nom)` retrouve la carte du produit dans le catalogue ou la ligne du panier, ou utilise toute la page sur la fiche détail. Une même action du DSL (`ajouterAuPanier`, `retirerDuPanier`, `peutAjouter`) fonctionne donc depuis le catalogue, la fiche détail ou le panier.
- **Lecture des prix** : les textes affichés (« $29.99 », « Item total: $55.97 ») sont convertis en nombres par `lirePrix`, pour que l'oracle compare des valeurs et non des chaînes.
- **Synchronisation** : après chaque action qui change de page (connexion, commande, ...), l'interpréteur attend l'élément attendu **ou** un message d'erreur. Les perceptions lisent ainsi toujours une page à jour.
- **Pastille absente = 0** : `nombreArticlesPastille()` renvoie 0 quand la pastille n'est pas affichée, ce qui permet d'exprimer simplement les valeurs limites (S9, S13, S17).
- **Téléchargement du PDF** : `genererPdfCommande()` clique sur « Generate PDF order » en écoutant l'événement `download` de Playwright ; `pdfTelecharge()` vérifie qu'un fichier `.pdf` a bien été reçu.
- **Quantité modifiable** : `quantiteModifiable()` vérifie si la ligne du panier contient un champ de saisie (`input`, `select`, ...).

### 6.3 Exécution des tests

```bash
npm install
npx playwright install
npx playwright test              # exécuter tous les tests
npx playwright test --ui         # mode interactif
npx playwright show-report       # rapport HTML
```





## 7. Outillage (TD, LLM, prompts, agents)


- **Approche TDD** : les scénarios et les tests ont été écrits avant l'interpréteur ; les tests ont été exécutés.
### 7.2 Répartition du travail entre nous et le LLM (Claude)

**Notre travail :**
- Exploration manuelle du site et analyse des fonctionnalités.
- Définition des taches du système
- Définition de la méthode et des **exemples de scénarios au format Given / When / Then**, par exemple :
  - *Scénario 1* — When : j'ajoute un produit au panier → Then : l'article est ajouté et la pastille du panier augmente de 1.
  - *Scénario 2* — Given : le panier contient 3 articles A, B, C → When : je retire B → Then : le panier contient seulement A et C, et le prix total est mis à jour.
- Validation de la liste finale des tâches et des scénarios.
- Exécution des tests, analyse des erreurs.

**Travail confié à Claude :**
- Compléter la liste des tâches et les scénarios à partir de nos exemples, en appliquant valeurs limites et partition des entrées (scénarios que nous avons ensuite triés et validés).
- **Concevoir le DSL** (`dsl/SauceDemoDSL.ts`) au niveau tâches et concepts, à partir des scénarios.
- **Traduire les scénarios en tests TypeScript** (`tests/scenarios.spec.ts`) utilisant uniquement le DSL.
- **Implémenter l'interpréteur Playwright** (`dsl/SauceDemoPlaywright.ts`).

