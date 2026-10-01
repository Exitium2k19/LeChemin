# Le Chemin

**Le Chemin** est un tableau de points familial, mobile-first et utilisable hors ligne. Il a été préparé pour Sokhan à partir du barème fourni par Diane et Jim.

## Livrables

- `livrables/Le-Chemin.apk` — application Android installable (générée par la CI) ;
- `livrables/Le-Chemin.html` — application interactive autonome dans un seul fichier HTML ;
- `livrables/Tableau-de-points-Sokhan.xlsx` — classeur Excel à trois feuilles.

## Fonctions principales

- cases quotidiennes, par repas et par période ;
- compteurs d’occurrences ;
- solde toujours plafonné à zéro au minimum ;
- boutique avec débit à chaque échange ;
- historique quotidien et synthèse détaillée par semaine ISO ;
- double sauvegarde locale immédiate (IndexedDB + `localStorage`) avec état visible et réessai ;
- export/import d’une sauvegarde ZIP contenant le JSON réimportable, une copie Excel et une notice ;
- confirmation visible après la création de la sauvegarde ;
- prénom propagé dans toute l’interface et la signature ;
- ajout, modification et suppression de récompenses ;
- icônes importées puis redimensionnées automatiquement ;
- couleurs personnalisables et choix du thème clair, sombre ou lié au système ;
- emballage Android Capacitor, entièrement hors ligne.

## Développement

```bash
npm ci
npm run dev
npm test
npm run generate:xlsx
npm run build
```

Pour synchroniser le projet Android :

```bash
npm run cap:sync
```

La construction de l’APK est automatisée par `.github/workflows/build-android.yml`.

## Repères méthodologiques

La mise en œuvre s’appuie sur des principes généraux d’entraînement parental comportemental et d’économie de jetons : cibles observables, conséquence positive rapide, louange descriptive, cohérence entre adultes, récompenses choisies avec l’enfant et révision régulière.

Sources principales :

- Cincinnati Children’s Hospital Medical Center, *Contingency Management Systems for Children with ADHD* : https://www.cincinnatichildrens.org/-/media/Cincinnati-Childrens/Home/patients/family-support-resources/behavioral-management/page-media/Contingency-Management-Systems-for-Children-with-ADHD.pdf
- NICE NG87, *Attention deficit hyperactivity disorder: diagnosis and management* : https://www.nice.org.uk/guidance/ng87/chapter/recommendations
- Evans et al., *Behavior Management for School Aged Children with ADHD* : https://pmc.ncbi.nlm.nih.gov/articles/PMC4167345/

## Limite clinique

Ce logiciel et le classeur sont des outils éducatifs familiaux. Ils ne constituent pas un avis clinique individualisé pour Sokhan, ne valident pas spécifiquement les barèmes choisis et ne modifient ni son traitement ni son suivi. Les comportements à risque relèvent d’un protocole de sécurité séparé, défini avec les professionnels qui connaissent l’enfant.
