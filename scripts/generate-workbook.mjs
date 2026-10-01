import ExcelJS from 'exceljs';
import fs from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('livrables');
const publicDir = path.resolve('public/telechargements');
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(publicDir, { recursive: true });

const workbook = new ExcelJS.Workbook();
workbook.creator = 'Le Chemin — Diane & Jim';
workbook.title = 'Tableau de points de Sokhan';
workbook.subject = 'Économie de jetons / tableau à points — principes généraux inspirés des entraînements parentaux comportementaux';
workbook.keywords = 'TDAH, TOP, économie de jetons, Barkley, tableau de points';
workbook.created = new Date('2026-10-01T12:00:00Z');
workbook.modified = new Date();
workbook.calcProperties.fullCalcOnLoad = true;

const colors = {
  forest: 'FF317B69',
  forestDark: 'FF24594D',
  moss: 'FFDCEAE5',
  cream: 'FFF7F5EF',
  white: 'FFFFFFFF',
  ink: 'FF20332E',
  muted: 'FF697873',
  amber: 'FFE39A52',
  amberSoft: 'FFF8E7D6',
  red: 'FFB44F4F',
  redSoft: 'FFF8E4E4',
  line: 'FFDADFD9',
};

function titleBlock(sheet, title, subtitle, lastColumn) {
  sheet.mergeCells(`A1:${lastColumn}1`);
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { name: 'Aptos Display', size: 23, bold: true, color: { argb: colors.white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.forest } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.border = { bottom: { style: 'thick', color: { argb: colors.amber } } };
  sheet.getRow(1).height = 43;

  sheet.mergeCells(`A2:${lastColumn}2`);
  const subtitleCell = sheet.getCell('A2');
  subtitleCell.value = subtitle;
  subtitleCell.font = { name: 'Aptos', size: 10, italic: true, color: { argb: colors.muted } };
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.cream } };
  subtitleCell.alignment = { wrapText: true, vertical: 'middle' };
  sheet.getRow(2).height = 35;
}

function styleHeader(row) {
  row.height = 31;
  row.eachCell((cell) => {
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: colors.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.forestDark } };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: colors.line } } };
  });
}

function styleTable(sheet, start, end, columns) {
  for (let rowNumber = start; rowNumber <= end; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.height = 40;
    for (let col = 1; col <= columns; col += 1) {
      const cell = row.getCell(col);
      cell.font = { name: 'Aptos', size: 10, color: { argb: colors.ink } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNumber % 2 ? colors.cream : colors.white } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        bottom: { style: 'hair', color: { argb: colors.line } },
        right: { style: 'hair', color: { argb: colors.line } },
      };
    }
  }
}

// Feuille 1 — Comportements
const behaviors = workbook.addWorksheet('Comportements', {
  properties: { tabColor: { argb: colors.forest }, defaultRowHeight: 18 },
  pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1, paperSize: 9 },
  views: [{ state: 'frozen', ySplit: 4 }],
});
behaviors.columns = [
  { key: 'behavior', width: 63 },
  { key: 'points', width: 14 },
  { key: 'frequency', width: 38 },
  { key: 'input', width: 27 },
];
titleBlock(behaviors, 'Le Chemin · Comportements de Sokhan', 'Barème familial demandé. Les fréquences sont visibles et également documentées dans les commentaires des cellules de points.', 'D');
behaviors.addRow([]);
const behaviorHeader = behaviors.addRow(['Comportement cible', 'Barème', "Fréquence d’évaluation", "Saisie dans l’application"]);
styleHeader(behaviorHeader);

const behaviorRows = [
  ['Je me prépare le matin sans crier ni faire du bruit exprès', 5, '1 fois par jour', 'Case unique'],
  ['Je fais mes devoirs sans rouspéter', 5, '1 fois par jour de devoirs', 'Case unique'],
  ['Je reste assis à table sans chanter ni parler fort', 5, 'À chaque repas : petit-déjeuner, déjeuner et dîner', '3 cases repas'],
  ["J’obéis à la première demande d’un adulte", 3, 'À chaque action réussie', 'Compteur + / −'],
  ['Je prends soin des objets de la maison (pas de coups, pas de casse)', 2, '1 bilan unique en fin de journée', 'Case unique'],
  ['Je parle à mon frère et ma sœur avec respect, sans surnom moqueur', 6, 'Par période : matin, après-midi et soir', '3 cases période'],
  ['Je respecte et ne provoque pas mes parents', 6, 'Par période : matin, après-midi et soir', '3 cases période'],
  ['Quand je sens la colère monter, je vais dans mon coin calme pour me détendre', 6, 'À chaque réussite', 'Compteur + / −'],
  ['Comportement exceptionnel', 12, "À chaque occurrence, à l’appréciation d’un adulte", 'Compteur + / −'],
];
behaviorRows.forEach((values) => {
  const row = behaviors.addRow(values);
  row.getCell(2).numFmt = '0 "points"';
  row.getCell(2).note = {
    texts: [
      { font: { bold: true, color: { argb: colors.forestDark } }, text: 'Fréquence : ' },
      { text: String(values[2]) },
      { text: `\nMode de saisie : ${values[3]}.` },
      { text: '\nLes points sont gagnés après le comportement ; ils ne sont jamais retirés.' },
    ],
    margins: { insetmode: 'auto' },
  };
  row.getCell(3).note = `Moment conseillé : valider au plus près du comportement. Pour les bilans par période, convenir d’heures fixes entre adultes.`;
});
styleTable(behaviors, 5, 13, 4);
behaviors.getColumn(2).alignment = { horizontal: 'center', vertical: 'middle' };
behaviors.getColumn(4).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
behaviors.autoFilter = 'A4:D13';
behaviors.getRow(15).height = 48;
behaviors.mergeCells('A15:D15');
behaviors.getCell('A15').value = 'Repère : le maximum des cases à fréquence fixe est de 63 points par jour ; les trois compteurs dépendent des occurrences. Ce barème et les seuils ont été fournis par la famille et ne sont pas, à eux seuls, une prescription clinique individualisée.';
behaviors.getCell('A15').font = { name: 'Aptos', size: 9, italic: true, color: { argb: colors.muted } };
behaviors.getCell('A15').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.amberSoft } };
behaviors.getCell('A15').alignment = { wrapText: true, vertical: 'middle' };
behaviors.headerFooter.oddFooter = '&LLe Chemin&CPage &P / &N&R01/10/2026';

// Feuille 2 — Récompenses
const rewards = workbook.addWorksheet('Récompenses', {
  properties: { tabColor: { argb: colors.amber }, defaultRowHeight: 18 },
  pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1, paperSize: 9 },
  views: [{ state: 'frozen', ySplit: 4 }],
});
rewards.columns = [
  { key: 'reward', width: 72 },
  { key: 'points', width: 21 },
];
titleBlock(rewards, 'Le Chemin · Boutique de récompenses', 'Les points cumulés sont dépensés lors de chaque échange : une récompense n’est pas « débloquée » définitivement.', 'B');
rewards.addRow([]);
const rewardHeader = rewards.addRow(['Récompense', 'Points requis']);
styleHeader(rewardHeader);
const rewardRows = [
  ['Un paquet de cartes (ex. Pokémon)', 50],
  ['Un jeu de société avec Maman ou en famille', 80],
  ['20 min de jeu vidéo', 110],
  ['Choix du repas du soir en famille', 130],
  ['Un congé de tâches ménagères', 150],
  ["5 euros d’argent de poche", 180],
  ['Plateau apéro devant la télé', 200],
  ['McDo', 250],
  ['Inviter un copain à la maison', 280],
  ['Une activité de ton choix (cinéma, laser game, trampoline…)', 300],
  ["Cadeau surprise ou grande sortie (accrobranche, parc d’attractions…)", 400],
];
rewardRows.forEach((values) => {
  const row = rewards.addRow(values);
  row.getCell(2).numFmt = '0 "points"';
  row.getCell(2).note = 'Débiter ce montant du solde à chaque échange. Ne pas passer le solde sous zéro et ne pas accorder de crédit.';
});
styleTable(rewards, 5, 15, 2);
rewards.getColumn(2).alignment = { horizontal: 'center', vertical: 'middle' };
rewards.autoFilter = 'A4:B15';
rewards.getRow(17).height = 55;
rewards.mergeCells('A17:B17');
rewards.getCell('A17').value = 'Adaptation générale à surveiller : pour le TDAH, les récompenses proches et variées sont souvent plus motivantes. Vérifier chaque semaine qu’au moins une petite récompense reste atteignable et demander à Sokhan ce qui garde de la valeur pour lui. Les coûts retenus ici viennent de la famille.';
rewards.getCell('A17').font = { name: 'Aptos', size: 9, italic: true, color: { argb: colors.muted } };
rewards.getCell('A17').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.amberSoft } };
rewards.getCell('A17').alignment = { wrapText: true, vertical: 'middle' };
rewards.headerFooter.oddFooter = '&LLe Chemin&CPage &P / &N&R01/10/2026';

// Feuille 3 — Mode d'emploi
const guide = workbook.addWorksheet("Mode d'emploi", {
  properties: { tabColor: { argb: colors.forestDark }, defaultRowHeight: 18 },
  pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
  views: [{ state: 'frozen', ySplit: 4 }],
});
guide.columns = [
  { key: 'step', width: 27 },
  { key: 'action', width: 43 },
  { key: 'detail', width: 70 },
];
titleBlock(guide, "Le Chemin · Mode d’emploi adulte", 'Principes généraux d’économie de jetons / entraînement parental comportemental. À ajuster avec les professionnels qui connaissent Sokhan.', 'C');
guide.addRow([]);
const guideHeader = guide.addRow(['Repère', 'Ce que fait l’adulte', 'Mise en œuvre concrète']);
styleHeader(guideHeader);
const guideRows = [
  ['1 · Présentation positive', 'Présenter le tableau comme une façon de mieux remarquer les efforts.', 'Dire : « Nous ne t’avons pas assez félicité pour tes efforts ; on va changer cela. » Décrire chaque comportement avec un exemple et faire choisir/valider des récompenses avec Sokhan.'],
  ['2 · Démarrage progressif', 'Mettre l’accent sur 2 ou 3 comportements atteignables pendant 7 jours.', 'Toutes les lignes peuvent rester disponibles, mais les adultes priorisent les réussites fréquentes et faciles au départ. Ajouter ensuite 1 comportement à la fois si le système reste calme et motivant.'],
  ['3 · Points immédiats', 'Attribuer le point juste après le comportement, autant que possible.', 'Associer le point à une louange descriptive : « Tu t’es assis calmement pendant ce repas : +5. » Ne pas promettre le point avant que l’action soit réalisée.'],
  ['4 · Cohérence entre adultes', 'Écrire ensemble une définition observable de chaque réussite.', 'Même barème, mêmes périodes, même vocabulaire. En cas de désaccord, ne pas débattre devant l’enfant : trancher plus tard entre adultes et appliquer la règle la plus simple jusque-là.'],
  ['5 · Auto-saisie accompagnée', 'Laisser Sokhan cocher, sous validation d’un adulte.', 'Il s’agit d’une adaptation demandée par la famille. Dans le modèle Barkley classique, l’adulte garde généralement la responsabilité du relevé. Féliciter aussi l’honnêteté de la saisie.'],
  ['6 · Bilans à heures fixes', 'Prévoir de courts rendez-vous, sans renégociation.', 'Exemple : après la routine du matin ; juste après chaque repas ; vers 12 h, 18 h et au coucher pour les périodes ; au coucher pour le soin des objets. Les compteurs sont saisis à l’occurrence.'],
  ['7 · Échanges', 'Autoriser des échanges fréquents et prévisibles.', 'Pour une récompense disponible, confirmer avec un adulte puis débiter son prix. Ne jamais afficher de solde négatif et ne pas accorder de « crédit ». Tenir la récompense promise.'],
  ['8 · Aucun retrait de points', 'Les points déjà gagnés ne sont jamais confisqués.', 'Une absence de réussite signifie simplement que les points correspondants ne sont pas gagnés. Les conséquences éducatives et le protocole de sécurité restent séparés du compte de points.'],
  ['9 · Préserver la motivation', 'Faire tourner les récompenses et garder des petits gains accessibles.', 'Vérifier chaque semaine ce qui motive encore Sokhan. Privilégier aussi les activités et les temps positifs avec un adulte ; éviter de transformer chaque comportement spontané déjà plaisant en transaction.'],
  ['10 · Révision à un mois', 'Faire un bilan factuel avec l’historique hebdomadaire.', 'Pour chaque cible : fréquence, tendance, moments difficiles, clarté du critère. Ajuster 1 ou 2 éléments à la fois. Revoir barèmes, seuils et objectifs avec le professionnel référent si nécessaire.'],
];
guideRows.forEach((values) => guide.addRow(values));
styleTable(guide, 5, 14, 3);
for (let row = 5; row <= 14; row += 1) guide.getRow(row).height = 70;

let currentRow = 16;
guide.mergeCells(`A${currentRow}:C${currentRow}`);
guide.getCell(`A${currentRow}`).value = 'PROTOCOLE DE SÉCURITÉ — SÉPARÉ DU TABLEAU DE POINTS';
guide.getCell(`A${currentRow}`).font = { name: 'Aptos', size: 12, bold: true, color: { argb: colors.white } };
guide.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.red } };
guide.getCell(`A${currentRow}`).alignment = { vertical: 'middle' };
guide.getRow(currentRow).height = 30;
currentRow += 1;
const safetyRows = [
  ['Priorité', 'Mettre en sécurité, pas compter des points.', 'En cas de danger immédiat pour Sokhan ou pour autrui : interrompre l’évaluation, éloigner les objets dangereux, créer de la distance, utiliser des phrases courtes et appeler les secours appropriés si nécessaire.'],
  ['Pendant la crise', 'Un adulte calme dirige ; les autres protègent et réduisent les stimulations.', 'Ne pas négocier une récompense, ne pas faire la leçon et ne pas utiliser le coin calme comme punition. Suivre le plan de crise défini avec les soignants.'],
  ['Après le retour au calme', 'Soutenir, débriefer brièvement et documenter les faits séparément.', 'Noter déclencheur, signes précoces, mesures efficaces et blessures/dégâts. Contacter le professionnel référent selon le protocole convenu. Ne pas corriger rétroactivement le solde.'],
];
safetyRows.forEach((values) => guide.addRow(values));
styleTable(guide, 17, 19, 3);
for (let row = 17; row <= 19; row += 1) {
  guide.getRow(row).height = 66;
  guide.getRow(row).eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.redSoft } }; });
}

currentRow = 21;
guide.mergeCells(`A${currentRow}:C${currentRow}`);
guide.getCell(`A${currentRow}`).value = 'LIMITES, HYPOTHÈSES ET SOURCES';
guide.getCell(`A${currentRow}`).font = { name: 'Aptos', size: 12, bold: true, color: { argb: colors.white } };
guide.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.forestDark } };
guide.getRow(currentRow).height = 30;
const noteRows = [
  ['Limite clinique', 'Ce document est un outil éducatif familial, pas une prescription.', 'Il ne constitue pas un avis pédopsychiatrique individualisé, ne valide pas spécifiquement les objectifs ou seuils pour Sokhan, et ne modifie ni son traitement ni son suivi. Les éléments personnalisés (barèmes, récompenses, nom) ont été fournis par la famille.'],
  ['Hypothèse 1', 'Auto-saisie par l’enfant avec validation adulte.', 'C’est une adaptation pratique demandée. La ressource Barkley/Cincinnati indique que l’adulte tient généralement le compte ; si l’auto-saisie crée des conflits, revenir à une validation ou saisie adulte.'],
  ['Hypothèse 2', 'Périodes « matin / après-midi / soir » et heures de bilan.', 'Les bornes horaires proposées sont des exemples généraux. La famille doit définir des moments stables compatibles avec son rythme.'],
  ['Hypothèse 3', 'Atteignabilité des récompenses.', 'Le barème n’a pas été calibré sur une observation clinique des fréquences réelles. Utiliser les données du premier mois pour vérifier qu’il produit assez de réussites et permet des échanges réguliers.'],
  ['Source méthodologique', 'Cincinnati Children’s Hospital Medical Center — Contingency Management Systems for Children with ADHD.', 'Points immédiats, objectifs explicites, choix et rotation des récompenses, cohérence, échange de points. https://www.cincinnatichildrens.org/-/media/Cincinnati-Childrens/Home/patients/family-support-resources/behavioral-management/page-media/Contingency-Management-Systems-for-Children-with-ADHD.pdf'],
  ['Source de recommandation', 'NICE NG87 — ADHD: diagnosis and management, recommandations 1.4.9 et 1.5.11.', 'Règles claires, gestion cohérente, structure quotidienne ; entraînement parental proposé aux familles d’enfants de 5 ans ou plus avec TDAH et symptômes oppositionnels. https://www.nice.org.uk/guidance/ng87/chapter/recommendations'],
  ['Revue scientifique', 'Behavior Management for School Aged Children with ADHD (Evans et al., 2014).', 'L’entraînement parental comportemental inclut louanges, conséquences positives contingentes, économies de jetons et consignes claires ; des bénéfices sont observés sur l’opposition et le fonctionnement. https://pmc.ncbi.nlm.nih.gov/articles/PMC4167345/'],
];
noteRows.forEach((values) => guide.addRow(values));
styleTable(guide, 22, 28, 3);
for (let row = 22; row <= 28; row += 1) guide.getRow(row).height = row >= 26 ? 80 : 64;

for (const worksheet of workbook.worksheets) {
  worksheet.eachRow((row) => row.eachCell((cell) => {
    cell.protection = { locked: false };
  }));
  worksheet.pageSetup.horizontalCentered = true;
  worksheet.headerFooter.oddHeader = '&C&"Aptos,Bold"Le Chemin — Tableau familial';
}
guide.headerFooter.oddFooter = '&LRepères généraux — pas un avis individualisé&CPage &P / &N&R01/10/2026';

const target = path.join(outputDir, 'Tableau-de-points-Sokhan.xlsx');
await workbook.xlsx.writeFile(target);
await fs.copyFile(target, path.join(publicDir, 'Tableau-de-points-Sokhan.xlsx'));
console.log(`Workbook créé : ${target}`);
