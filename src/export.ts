import { Capacitor, registerPlugin } from '@capacitor/core';
import ExcelJS from 'exceljs';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { BEHAVIORS } from './data';
import type { AppData } from './types';
import { balanceFor, behaviorValue, localDateKey, pointsForDay, totalEarned, totalSpent } from './utils';

interface FileSaveResult {
  canceled: boolean;
  uri?: string;
}

interface FileSavePlugin {
  saveFile(options: { filename: string; mimeType: string; data: string }): Promise<FileSaveResult>;
}

const NativeFileSave = registerPlugin<FileSavePlugin>('FileSave');

const COLORS = {
  forest: 'FF317B69',
  forestDark: 'FF24594D',
  moss: 'FFDCEAE5',
  cream: 'FFF7F5EF',
  white: 'FFFFFFFF',
  ink: 'FF20332E',
  muted: 'FF697873',
  amber: 'FFE39A52',
  line: 'FFDADFD9',
};

function styleTitle(sheet: ExcelJS.Worksheet, title: string, subtitle: string, lastColumn: string) {
  sheet.mergeCells(`A1:${lastColumn}1`);
  sheet.getCell('A1').value = title;
  sheet.getCell('A1').font = { name: 'Aptos Display', size: 21, bold: true, color: { argb: COLORS.white } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.forest } };
  sheet.getCell('A1').alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 40;

  sheet.mergeCells(`A2:${lastColumn}2`);
  sheet.getCell('A2').value = subtitle;
  sheet.getCell('A2').font = { name: 'Aptos', size: 9, italic: true, color: { argb: COLORS.muted } };
  sheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.cream } };
  sheet.getCell('A2').alignment = { vertical: 'middle', wrapText: true };
  sheet.getRow(2).height = 31;
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 29;
  row.eachCell((cell) => {
    cell.font = { name: 'Aptos', size: 9, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.forestDark } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
}

function styleRows(sheet: ExcelJS.Worksheet, first: number, last: number, columns: number) {
  for (let index = first; index <= last; index += 1) {
    const row = sheet.getRow(index);
    row.height = 34;
    for (let column = 1; column <= columns; column += 1) {
      const cell = row.getCell(column);
      cell.font = { name: 'Aptos', size: 9, color: { argb: COLORS.ink } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 ? COLORS.cream : COLORS.white } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = { bottom: { style: 'hair', color: { argb: COLORS.line } } };
    }
  }
}

function dateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-');
  return `${day}/${month}/${year}`;
}

/** Construit une copie Excel complète et lisible des réglages et de l'historique courant. */
export async function buildBackupWorkbook(data: AppData): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Le Chemin — Diane & Jim';
  workbook.title = `Sauvegarde du tableau de ${data.profile.name}`;
  workbook.subject = 'Copie Excel des données locales Le Chemin';
  workbook.created = new Date();
  workbook.modified = new Date();

  const summary = workbook.addWorksheet('Synthèse', { properties: { tabColor: { argb: COLORS.forest } } });
  summary.columns = [{ width: 34 }, { width: 58 }];
  styleTitle(summary, `Le Chemin · ${data.profile.name}`, `Copie Excel générée le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}.`, 'B');
  summary.addRow([]);
  styleHeader(summary.addRow(['Indicateur', 'Valeur']));
  const summaryRows = [
    ['Prénom', data.profile.name],
    ['Total gagné', `${totalEarned(data)} points`],
    ['Total dépensé', `${totalSpent(data)} points`],
    ['Solde disponible', `${balanceFor(data)} points`],
    ['Jours enregistrés', Object.keys(data.days).length],
    ['Récompenses disponibles', data.rewards.length],
    ['Dernière modification', data.updatedAt],
    ['Thème', data.profile.theme === 'dark' ? 'Sombre' : data.profile.theme === 'light' ? 'Clair' : 'Lié au système'],
  ];
  summaryRows.forEach((row) => summary.addRow(row));
  styleRows(summary, 5, 12, 2);
  summary.getCell('A14').value = 'Cette copie Excel accompagne le fichier JSON de restauration. Pour réimporter les données dans l’application, conserver le fichier ZIP complet.';
  summary.mergeCells('A14:B14');
  summary.getCell('A14').alignment = { wrapText: true, vertical: 'middle' };
  summary.getCell('A14').font = { name: 'Aptos', size: 9, italic: true, color: { argb: COLORS.muted } };
  summary.getRow(14).height = 42;
  summary.views = [{ state: 'frozen', ySplit: 4 }];

  const behaviors = workbook.addWorksheet('Comportements', { properties: { tabColor: { argb: COLORS.forestDark } } });
  behaviors.columns = [{ width: 59 }, { width: 13 }, { width: 33 }, { width: 18 }, { width: 19 }];
  styleTitle(behaviors, `Comportements de ${data.profile.name}`, 'Barème courant et cumul présent dans cette sauvegarde.', 'E');
  behaviors.addRow([]);
  styleHeader(behaviors.addRow(['Comportement', 'Barème', 'Fréquence', 'Réussites cumulées', 'Points cumulés']));
  BEHAVIORS.forEach((behavior) => {
    const occurrences = Object.values(data.days).reduce((sum, day) => sum + behaviorValue(day, [behavior.id]), 0);
    const row = behaviors.addRow([behavior.label, behavior.points, behavior.hint, occurrences, occurrences * behavior.points]);
    row.getCell(2).numFmt = '0 "points"';
    row.getCell(5).numFmt = '0 "points"';
  });
  styleRows(behaviors, 5, 4 + BEHAVIORS.length, 5);
  behaviors.views = [{ state: 'frozen', ySplit: 4 }];
  behaviors.autoFilter = `A4:E${4 + BEHAVIORS.length}`;

  const rewards = workbook.addWorksheet('Récompenses', { properties: { tabColor: { argb: COLORS.amber } } });
  rewards.columns = [{ width: 58 }, { width: 17 }, { width: 20 }, { width: 22 }];
  styleTitle(rewards, 'Boutique et échanges', 'Récompenses configurées au moment de la sauvegarde et historique des dépenses.', 'D');
  rewards.addRow([]);
  styleHeader(rewards.addRow(['Récompense actuelle', 'Coût', 'Nombre d’échanges', 'Points dépensés']));
  data.rewards.forEach((reward) => {
    const exchanges = data.redemptions.filter((item) => item.rewardId === reward.id || item.title === reward.title);
    const row = rewards.addRow([reward.title, reward.cost, exchanges.length, exchanges.reduce((sum, item) => sum + item.cost, 0)]);
    row.getCell(2).numFmt = '0 "points"';
    row.getCell(4).numFmt = '0 "points"';
  });
  const rewardLastRow = Math.max(4, 4 + data.rewards.length);
  if (data.rewards.length) styleRows(rewards, 5, rewardLastRow, 4);
  rewards.views = [{ state: 'frozen', ySplit: 4 }];

  const history = workbook.addWorksheet('Historique', { properties: { tabColor: { argb: COLORS.moss } } });
  history.columns = [{ width: 15 }, { width: 58 }, { width: 15 }, { width: 16 }, { width: 23 }];
  styleTitle(history, `Historique de ${data.profile.name}`, 'Une ligne par comportement réussi ou récompense échangée.', 'E');
  history.addRow([]);
  styleHeader(history.addRow(['Date', 'Événement', 'Occurrences', 'Points', 'Type']));
  const dates = Array.from(new Set([...Object.keys(data.days), ...data.redemptions.map((item) => item.date)])).sort();
  dates.forEach((date) => {
    const day = data.days[date];
    BEHAVIORS.forEach((behavior) => {
      const occurrences = behaviorValue(day, [behavior.id]);
      if (!occurrences) return;
      const row = history.addRow([dateLabel(date), behavior.label, occurrences, occurrences * behavior.points, 'Points gagnés']);
      row.getCell(4).numFmt = '+0 "points"';
    });
    data.redemptions.filter((item) => item.date === date).forEach((redemption) => {
      const row = history.addRow([dateLabel(date), redemption.title, 1, -redemption.cost, 'Récompense échangée']);
      row.getCell(4).numFmt = '0 "points"';
    });
    if (day && !BEHAVIORS.some((behavior) => behaviorValue(day, [behavior.id]))) {
      history.addRow([dateLabel(date), 'Journée enregistrée sans point', 0, pointsForDay(day), 'Information']);
    }
  });
  if (history.rowCount >= 5) styleRows(history, 5, history.rowCount, 5);
  history.views = [{ state: 'frozen', ySplit: 4 }];
  history.autoFilter = `A4:E${Math.max(4, history.rowCount)}`;

  workbook.eachSheet((sheet) => {
    sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    sheet.headerFooter.oddFooter = '&LLe Chemin&CPage &P / &N';
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export interface BackupArchive {
  bytes: Uint8Array;
  filename: string;
}

/** Crée une sauvegarde unique contenant le JSON réimportable et une copie Excel. */
export async function buildBackupArchive(data: AppData, dateKey = localDateKey()): Promise<BackupArchive> {
  const excel = await buildBackupWorkbook(data);
  const json = strToU8(JSON.stringify(data, null, 2));
  const readme = strToU8(
    `Sauvegarde Le Chemin de ${data.profile.name}\n\n` +
    `- le-chemin-donnees.json : fichier à réimporter dans l'application ;\n` +
    `- le-chemin-tableau.xlsx : copie Excel lisible des réglages et de l'historique.\n\n` +
    `Créée le ${new Date().toLocaleString('fr-FR')}.\n`,
  );
  return {
    bytes: zipSync({
      'le-chemin-donnees.json': json,
      'le-chemin-tableau.xlsx': excel,
      'LISEZ-MOI.txt': readme,
    }, { level: 6 }),
    filename: `le-chemin-sauvegarde-${dateKey}.zip`,
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export type ExportDestination = 'native-save' | 'native-canceled' | 'browser-download';

/** Ouvre le sélecteur de fichier Android, ou déclenche un téléchargement web standard. */
export async function downloadBackup(data: AppData): Promise<ExportDestination> {
  const archive = await buildBackupArchive(data);
  if (Capacitor.isNativePlatform()) {
    const result = await NativeFileSave.saveFile({
      filename: archive.filename,
      mimeType: 'application/zip',
      data: bytesToBase64(archive.bytes),
    });
    return result.canceled ? 'native-canceled' : 'native-save';
  }

  const blob = new Blob([archive.bytes as BlobPart], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = archive.filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return 'browser-download';
}

export function parseBackupBytes(bytes: Uint8Array, filename: string): unknown {
  if (filename.toLowerCase().endsWith('.zip')) {
    const files = unzipSync(bytes);
    const jsonName = Object.keys(files).find((name) => name.toLowerCase().endsWith('.json'));
    if (!jsonName) throw new Error('Aucun fichier JSON trouvé dans cette sauvegarde.');
    return JSON.parse(strFromU8(files[jsonName]));
  }
  return JSON.parse(strFromU8(bytes));
}

export async function parseBackupFile(file: File): Promise<unknown> {
  return parseBackupBytes(new Uint8Array(await file.arrayBuffer()), file.name);
}
