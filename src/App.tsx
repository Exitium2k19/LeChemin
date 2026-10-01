import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';
import {
  BEHAVIORS,
  DEFAULT_REWARDS,
  PERIOD_LABELS,
  RELATIONSHIP_GROUPS,
  WEEKLY_ROWS,
} from './data';
import { downloadBackup, parseBackupFile } from './export';
import { Icon } from './Icon';
import { useAppStore } from './storage';
import type { AppData, BehaviorDefinition, Reward } from './types';
import {
  balanceFor,
  behaviorPoints,
  behaviorValue,
  dateFromKey,
  formatCompactDate,
  formatLongDate,
  formatShortDate,
  isoWeekForDate,
  localDateKey,
  nextReward,
  normalizeData,
  pointsForDay,
  safeName,
  sameIsoWeek,
  shiftWeek,
  totalEarned,
  totalSpent,
  uid,
  weekDateKeys,
  type IsoWeek,
} from './utils';

const essentialIds = ['morning-ready', 'homework-calm', 'care-objects'];
const mealIds = ['meal-breakfast', 'meal-lunch', 'meal-dinner'];
const counterIds = ['obey-first', 'calm-corner', 'exceptional'];
const periodIcons = ['sun', 'sparkle', 'star'];

type View = 'today' | 'shop' | 'history' | 'options';
type HistoryMode = 'week' | 'days';
type OptionMode = 'profile' | 'rewards' | 'appearance' | 'backup' | 'guide';

function MountainMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`mountain-mark${small ? ' mountain-mark--small' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" role="img">
        <path className="mark-sun" d="M35.5 5.5a6 6 0 1 1-5.6 8.1 6 6 0 0 1 5.6-8.1Z" />
        <path className="mark-back" d="m5 35 12.7-20.2L25 25.6l4.8-6.7L43 35Z" />
        <path className="mark-front" d="m5 35 9.2-12.7 5.7 7.7 3.8-5.1L31 35Z" />
        <path className="mark-path" d="M19 44c1.6-4.1 5.8-5.2 4.7-9.2-.6-2.3-3.3-3-2.4-6.3" />
      </svg>
    </span>
  );
}

function SaveIndicator({ status, error, onRetry }: { status: string; error: string; onRetry: () => void }) {
  if (status === 'error') {
    return (
      <div className="save-indicator save-indicator--error" role="status" title={error}>
        <Icon name="offline" size={15} />
        <span>Échec</span>
        <button type="button" onClick={onRetry}>Réessayer</button>
      </div>
    );
  }
  if (status === 'saving' || status === 'idle') {
    return (
      <div className="save-indicator" role="status">
        <Icon name="loading" className="spin" size={15} />
        <span>Sauvegarde…</span>
      </div>
    );
  }
  return (
    <div className="save-indicator save-indicator--saved" role="status">
      <Icon name="saved" size={15} />
      <span>Enregistré</span>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <header className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {description && <p>{description}</p>}
    </header>
  );
}

function PointPill({ points }: { points: number }) {
  return <span className="point-pill">+{points} pts</span>;
}

function CheckRow({ behavior, checked, onToggle }: { behavior: BehaviorDefinition; checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`check-row${checked ? ' is-checked' : ''}`}
      onClick={onToggle}
      aria-pressed={checked}
    >
      <span className="behavior-icon"><Icon name={behavior.icon} size={21} /></span>
      <span className="check-copy">
        <strong>{behavior.label}</strong>
        <small>{behavior.hint}</small>
      </span>
      <PointPill points={behavior.points} />
      <span className="round-check"><Icon name="check" size={18} /></span>
    </button>
  );
}

function CounterCard({ behavior, count, onChange }: { behavior: BehaviorDefinition; count: number; onChange: (delta: number) => void }) {
  return (
    <article className="counter-card">
      <div className="counter-card__top">
        <span className="behavior-icon"><Icon name={behavior.icon} size={22} /></span>
        <PointPill points={behavior.points} />
      </div>
      <h3>{behavior.label}</h3>
      <p>{behavior.hint} · Valide avec un adulte.</p>
      <div className="counter-controls">
        <button type="button" onClick={() => onChange(-1)} disabled={count === 0} aria-label={`Retirer une réussite : ${behavior.shortLabel}`}>
          <Icon name="minus" size={22} />
        </button>
        <div aria-live="polite">
          <strong>{count}</strong>
          <span>{count > 1 ? 'réussites' : 'réussite'}</span>
        </div>
        <button type="button" className="counter-add" onClick={() => onChange(1)} aria-label={`Ajouter une réussite : ${behavior.shortLabel}`}>
          <Icon name="plus" size={23} />
        </button>
      </div>
    </article>
  );
}

function TrailHero({ data, todayPoints }: { data: AppData; todayPoints: number }) {
  const balance = balanceFor(data);
  const next = nextReward(data);
  const previousCost = [...data.rewards]
    .filter((reward) => reward.cost <= balance)
    .reduce((max, reward) => Math.max(max, reward.cost), 0);
  const progress = next ? Math.max(4, Math.min(100, ((balance - previousCost) / Math.max(1, next.cost - previousCost)) * 100)) : 100;
  const remaining = next ? Math.max(0, next.cost - balance) : 0;

  return (
    <section className="trail-hero" aria-label="Solde de points">
      <div className="hero-copy">
        <span className="eyebrow">Le sentier de {data.profile.name}</span>
        <h1>{balance.toLocaleString('fr-FR')} <small>points</small></h1>
        <p><strong>+{todayPoints} aujourd’hui</strong><span aria-hidden="true"> · </span>{next ? `${remaining} avant « ${next.title} »` : 'Sommet atteint !'}</p>
      </div>
      <div className="hero-landscape" aria-hidden="true">
        <svg viewBox="0 0 440 180" preserveAspectRatio="xMidYMax slice">
          <circle className="land-sun" cx="356" cy="43" r="25" />
          <path className="land-far" d="M0 128 77 57l49 45 58-72 58 77 38-38 60 58 45-53 55 54v52H0Z" />
          <path className="land-near" d="M0 143 65 90l46 35 53-49 54 52 47-30 53 36 44-19 78 40v25H0Z" />
          <path className="land-trail" d="M142 181c7-29 62-22 65-51 2-19-25-22-16-44 8-20 37-20 45-38" />
          <circle className="land-waypoint" cx="236" cy="47" r="7" />
        </svg>
      </div>
      <div className="trail-progress">
        <span style={{ width: `${progress}%` }} />
        <i style={{ left: `calc(${progress}% - 9px)` }}><MountainMark small /></i>
      </div>
    </section>
  );
}

interface TodayProps {
  data: AppData;
  onToggle: (id: string) => void;
  onCounter: (id: string, delta: number) => void;
}

function TodayView({ data, onToggle, onCounter }: TodayProps) {
  const todayKey = localDateKey();
  const day = data.days[todayKey];
  const todayPoints = pointsForDay(day);
  const checksDone = BEHAVIORS.filter((behavior) => behavior.type === 'check' && day?.checks?.[behavior.id]).length;
  const allChecks = BEHAVIORS.filter((behavior) => behavior.type === 'check').length;

  return (
    <>
      <TrailHero data={data} todayPoints={todayPoints} />
      <div className="day-intro">
        <div>
          <span className="eyebrow">Aujourd’hui</span>
          <h2>{formatLongDate(todayKey)}</h2>
        </div>
        <span className="day-progress"><strong>{checksDone}</strong>/{allChecks} étapes</span>
      </div>

      <section className="content-section">
        <SectionHeading title="Mes essentiels" description="Chaque petit pas compte. Coche-le juste après l’avoir fait." />
        <div className="card check-list">
          {essentialIds.map((id) => {
            const behavior = BEHAVIORS.find((item) => item.id === id)!;
            return <CheckRow key={id} behavior={behavior} checked={Boolean(day?.checks?.[id])} onToggle={() => onToggle(id)} />;
          })}
        </div>
      </section>

      <section className="content-section">
        <SectionHeading title="À table" description="Un moment calme, un repas à la fois." />
        <div className="meal-grid">
          {mealIds.map((id) => {
            const behavior = BEHAVIORS.find((item) => item.id === id)!;
            const checked = Boolean(day?.checks?.[id]);
            return (
              <button type="button" className={`meal-card${checked ? ' is-checked' : ''}`} key={id} onClick={() => onToggle(id)} aria-pressed={checked}>
                <span className="meal-check"><Icon name="check" size={16} /></span>
                <Icon name={behavior.icon} size={25} />
                <strong>{behavior.shortLabel.replace(' calme', '')}</strong>
                <PointPill points={behavior.points} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="content-section">
        <SectionHeading title="Du respect, toute la journée" description="On fait le point ensemble à trois moments fixes." />
        <div className="relationship-stack">
          {RELATIONSHIP_GROUPS.map((group) => (
            <article className="card relationship-card" key={group.title}>
              <div className="relationship-card__heading">
                <span className="behavior-icon"><Icon name={group.icon} size={22} /></span>
                <div><h3>{group.title}</h3><p>{group.description}</p></div>
              </div>
              <div className="period-grid">
                {group.ids.map((id, index) => {
                  const checked = Boolean(day?.checks?.[id]);
                  return (
                    <button type="button" key={id} onClick={() => onToggle(id)} className={checked ? 'is-checked' : ''} aria-pressed={checked}>
                      <span><Icon name={periodIcons[index]} size={17} />{PERIOD_LABELS[index]}</span>
                      <small>+6</small>
                      <i><Icon name="check" size={16} /></i>
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section">
        <SectionHeading title="Mes réussites à compter" description="Appuie sur + à chaque fois. Le bouton − sert seulement à corriger une erreur." />
        <div className="counter-grid">
          {counterIds.map((id) => {
            const behavior = BEHAVIORS.find((item) => item.id === id)!;
            return <CounterCard key={id} behavior={behavior} count={day?.counts?.[id] || 0} onChange={(delta) => onCounter(id, delta)} />;
          })}
        </div>
      </section>

      <aside className="encouragement">
        <Icon name="leaf" size={25} />
        <div><strong>Le but n’est pas d’être parfait.</strong><p>On remarque les efforts, on donne les points vite et on accompagne chaque point d’un bravo précis.</p></div>
      </aside>
    </>
  );
}

function RewardIcon({ reward }: { reward: Reward }) {
  if (reward.image) return <img src={reward.image} alt="" />;
  return <span aria-hidden="true">{reward.emoji || '🎁'}</span>;
}

function ShopView({ data, onBuy }: { data: AppData; onBuy: (reward: Reward) => void }) {
  const balance = balanceFor(data);
  const sortedRewards = [...data.rewards].sort((a, b) => a.cost - b.cost);
  return (
    <section className="page-view">
      <div className="page-lead shop-lead">
        <span className="eyebrow">La boutique du sommet</span>
        <h1>Choisis ta prochaine aventure</h1>
        <p>Les points sont dépensés à chaque échange. Ils ne sont jamais retirés pour un comportement.</p>
        <div className="balance-chip"><Icon name="trophy" size={20} /><span>Mon solde</span><strong>{balance} pts</strong></div>
      </div>
      {sortedRewards.length ? (
        <div className="reward-grid">
          {sortedRewards.map((reward, index) => {
            const affordable = balance >= reward.cost;
            return (
              <article className="reward-card" key={reward.id}>
                <div className={`reward-visual reward-visual--${(index % 4) + 1}`}><RewardIcon reward={reward} /></div>
                <div className="reward-card__copy">
                  <span className="reward-cost">{reward.cost} points</span>
                  <h2>{reward.title}</h2>
                  {!affordable && <p>Encore {reward.cost - balance} points</p>}
                  {affordable && <p className="ready"><Icon name="sparkle" size={14} /> Prêt à échanger</p>}
                </div>
                <button type="button" onClick={() => onBuy(reward)} disabled={!affordable}>
                  {affordable ? 'Choisir' : 'Je continue'}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state card"><Icon name="gift" size={30} /><h2>La boutique attend ses récompenses</h2><p>Un adulte peut en ajouter dans Options.</p></div>
      )}
    </section>
  );
}

function WeeklyView({ data, week, onWeekChange }: { data: AppData; week: IsoWeek; onWeekChange: (delta: number) => void }) {
  const keys = weekDateKeys(week);
  const currentWeek = isoWeekForDate(new Date());
  const canGoNext = !sameIsoWeek(week, currentWeek) && week.start < currentWeek.start;
  const earned = keys.reduce((sum, key) => sum + pointsForDay(data.days[key]), 0);
  const spent = data.redemptions.filter((item) => keys.includes(item.date)).reduce((sum, item) => sum + item.cost, 0);
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow' });

  return (
    <div className="week-view">
      <div className="week-navigator card">
        <button type="button" onClick={() => onWeekChange(-1)} aria-label="Semaine précédente"><Icon name="left" /></button>
        <div>
          <span>Semaine {week.week} · {week.year}</span>
          <strong>{formatCompactDate(localDateKey(week.start))} — {formatCompactDate(localDateKey(week.end))}</strong>
        </div>
        <button type="button" onClick={() => onWeekChange(1)} disabled={!canGoNext} aria-label="Semaine suivante"><Icon name="right" /></button>
      </div>
      <div className="week-stats">
        <div><span>Gagnés</span><strong>+{earned}</strong></div>
        <div><span>Dépensés</span><strong>−{spent}</strong></div>
        <div><span>Bilan</span><strong>{Math.max(0, earned - spent)}</strong></div>
      </div>
      <div className="weekly-table-wrap card">
        <table className="weekly-table">
          <thead>
            <tr>
              <th>Comportement</th>
              {keys.map((key) => <th key={key}><span>{dayFormatter.format(dateFromKey(key))}</span><small>{dateFromKey(key).getDate()}</small></th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {WEEKLY_ROWS.map((row) => {
              const isCounter = row.behaviorIds.some((id) => BEHAVIORS.find((item) => item.id === id)?.type === 'counter');
              const values = keys.map((key) => behaviorValue(data.days[key], row.behaviorIds));
              const points = keys.map((key) => behaviorPoints(data.days[key], row.behaviorIds));
              return (
                <tr key={row.id}>
                  <th>{row.label}</th>
                  {values.map((value, index) => (
                    <td key={keys[index]} className={value ? 'has-value' : ''}>
                      {value ? <><strong>{!isCounter && row.behaviorIds.length === 1 ? '✓' : `${value}×`}</strong><small>+{points[index]}</small></> : <span>—</span>}
                    </td>
                  ))}
                  <td className="row-total"><strong>{points.reduce((sum, value) => sum + value, 0)}</strong></td>
                </tr>
              );
            })}
            <tr className="points-row">
              <th>Points du jour</th>
              {keys.map((key) => <td key={key}><strong>{pointsForDay(data.days[key]) || '—'}</strong></td>)}
              <td><strong>{earned}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="table-hint">Fais glisser le tableau horizontalement pour voir toute la semaine.</p>
    </div>
  );
}

function DailyHistory({ data }: { data: AppData }) {
  const dates = Array.from(new Set([...Object.keys(data.days), ...data.redemptions.map((item) => item.date)])).sort().reverse();
  if (!dates.length) return <div className="empty-state card"><Icon name="history" size={30} /><h2>Le chemin commence aujourd’hui</h2><p>Les réussites cochées apparaîtront ici, jour après jour.</p></div>;

  return (
    <div className="history-list">
      {dates.map((key) => {
        const day = data.days[key];
        const completed = BEHAVIORS.flatMap((behavior) => {
          const count = behavior.type === 'check' ? (day?.checks?.[behavior.id] ? 1 : 0) : (day?.counts?.[behavior.id] || 0);
          return count ? [{ behavior, count }] : [];
        });
        const redemptions = data.redemptions.filter((item) => item.date === key);
        return (
          <details className="history-day card" key={key} open={key === localDateKey()}>
            <summary>
              <span><strong>{formatShortDate(key)}</strong><small>{completed.length} type{completed.length > 1 ? 's' : ''} de réussite</small></span>
              <span className="history-points">+{pointsForDay(day)} pts</span>
              <Icon name="chevron-down" className="summary-chevron" size={20} />
            </summary>
            <div className="history-day__body">
              {completed.map(({ behavior, count }) => (
                <div className="history-line" key={behavior.id}>
                  <span className="mini-check"><Icon name="check" size={14} /></span>
                  <span>{behavior.shortLabel}{count > 1 ? ` × ${count}` : ''}</span>
                  <strong>+{behavior.points * count}</strong>
                </div>
              ))}
              {redemptions.map((redemption) => (
                <div className="history-line history-line--spent" key={redemption.id}>
                  <span className="mini-check"><Icon name="gift" size={14} /></span>
                  <span>Échange : {redemption.title}</span>
                  <strong>−{redemption.cost}</strong>
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function HistoryView({ data }: { data: AppData }) {
  const [mode, setMode] = useState<HistoryMode>('week');
  const [week, setWeek] = useState(() => isoWeekForDate(new Date()));
  return (
    <section className="page-view">
      <div className="page-lead">
        <span className="eyebrow">Carnet de route</span>
        <h1>Voir tous les progrès</h1>
        <p>Une trace factuelle pour célébrer les efforts et ajuster le tableau ensemble.</p>
      </div>
      <div className="segmented-control" role="tablist" aria-label="Type d'historique">
        <button type="button" role="tab" aria-selected={mode === 'week'} className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}>Vue semaine</button>
        <button type="button" role="tab" aria-selected={mode === 'days'} className={mode === 'days' ? 'active' : ''} onClick={() => setMode('days')}>Jour par jour</button>
      </div>
      {mode === 'week' ? <WeeklyView data={data} week={week} onWeekChange={(delta) => setWeek((current) => shiftWeek(current, delta))} /> : <DailyHistory data={data} />}
    </section>
  );
}

async function resizeRewardImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choisis un fichier image.');
  if (file.size > 10 * 1024 * 1024) throw new Error("L’image dépasse 10 Mo.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("L’image ne peut pas être lue."));
    });
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Redimensionnement indisponible.');
    context.clearRect(0, 0, 160, 160);
    const scale = Math.min(144 / image.naturalWidth, 144 / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (160 - width) / 2, (160 - height) / 2, width, height);
    return canvas.toDataURL('image/webp', 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function Modal({ children, title, onClose }: { children: ReactNode; title: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Fermer"><Icon name="close" /></button></header>
        {children}
      </section>
    </div>
  );
}

function RewardEditor({ initial, onSave, onClose }: { initial?: Reward; onSave: (reward: Reward) => void; onClose: () => void }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [cost, setCost] = useState(String(initial?.cost || ''));
  const [emoji, setEmoji] = useState(initial?.emoji || '🎁');
  const [image, setImage] = useState(initial?.image);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const submit = () => {
    const cleanTitle = title.trim();
    const numericCost = Math.round(Number(cost));
    if (!cleanTitle) return setError('Donne un nom à la récompense.');
    if (!Number.isFinite(numericCost) || numericCost < 1 || numericCost > 99999) return setError('Choisis un coût entre 1 et 99 999 points.');
    onSave({ id: initial?.id || uid('reward'), title: cleanTitle.slice(0, 100), cost: numericCost, emoji: emoji.trim().slice(0, 8) || '🎁', image });
  };

  const chooseImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setProcessing(true);
    try {
      setImage(await resizeRewardImage(file));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d’ajouter l’image.");
    } finally {
      setProcessing(false);
      event.target.value = '';
    }
  };

  return (
    <Modal title={initial ? 'Modifier la récompense' : 'Nouvelle récompense'} onClose={onClose}>
      <div className="form-stack">
        <label className="field"><span>Nom de la récompense</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} autoFocus /></label>
        <div className="field-row">
          <label className="field"><span>Coût en points</span><input type="number" min="1" max="99999" inputMode="numeric" value={cost} onChange={(event) => setCost(event.target.value)} /></label>
          <label className="field field--emoji"><span>Symbole</span><input value={emoji} onChange={(event) => setEmoji(event.target.value)} maxLength={8} /></label>
        </div>
        <div className="image-field">
          <div className="image-preview">{image ? <img src={image} alt="Aperçu" /> : <span>{emoji || '🎁'}</span>}</div>
          <div><strong>Icône personnalisée</strong><p>L’image est automatiquement recadrée dans un format léger de 160 × 160 px.</p>
            <label className="secondary-button file-button"><Icon name="image" size={17} />{processing ? 'Traitement…' : 'Choisir une image'}<input type="file" accept="image/*" onChange={chooseImage} disabled={processing} /></label>
            {image && <button type="button" className="text-button danger-text" onClick={() => setImage(undefined)}>Retirer l’image</button>}
          </div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Annuler</button><button type="button" className="primary-button" onClick={submit}>Enregistrer</button></div>
      </div>
    </Modal>
  );
}

const colorPresets = [
  { name: 'Forêt', accent: '#317b69', highlight: '#e39a52' },
  { name: 'Alpage', accent: '#356da8', highlight: '#e0a33e' },
  { name: 'Lavande', accent: '#725a9c', highlight: '#da7f5b' },
  { name: 'Framboise', accent: '#a84968', highlight: '#df9c3b' },
];

interface OptionsProps {
  data: AppData;
  onUpdate: (recipe: (current: AppData) => AppData) => void;
  onReplace: (data: AppData) => void;
  onBack: () => void;
}

function OptionsView({ data, onUpdate, onReplace, onBack }: OptionsProps) {
  const [mode, setMode] = useState<OptionMode>('profile');
  const [name, setName] = useState(data.profile.name);
  const [editor, setEditor] = useState<Reward | 'new' | null>(null);
  const [exporting, setExporting] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const saveName = () => {
    const clean = safeName(name);
    setName(clean);
    onUpdate((current) => ({ ...current, profile: { ...current.profile, name: clean } }));
  };
  const saveReward = (reward: Reward) => {
    onUpdate((current) => {
      const exists = current.rewards.some((item) => item.id === reward.id);
      return { ...current, rewards: exists ? current.rewards.map((item) => item.id === reward.id ? reward : item) : [...current.rewards, reward] };
    });
    setEditor(null);
  };
  const deleteReward = (reward: Reward) => {
    if (!window.confirm(`Supprimer « ${reward.title} » de la boutique ? L’historique des échanges reste conservé.`)) return;
    onUpdate((current) => ({ ...current, rewards: current.rewards.filter((item) => item.id !== reward.id) }));
  };
  const exportBackup = async () => {
    setExporting(true);
    setBackupMessage(null);
    try {
      const destination = await downloadBackup(data);
      if (destination === 'native-canceled') {
        setBackupMessage({ tone: 'info', text: 'Enregistrement annulé : aucun fichier n’a été créé.' });
      } else {
        setBackupMessage({
          tone: 'success',
          text: destination === 'native-save'
            ? 'Sauvegarde enregistrée dans le dossier choisi.'
            : 'Sauvegarde téléchargée : elle contient les données JSON et une copie du tableau Excel.',
        });
      }
    } catch (reason) {
      setBackupMessage({
        tone: 'error',
        text: reason instanceof Error ? `Échec de l’export : ${reason.message}` : 'La sauvegarde n’a pas pu être créée.',
      });
    } finally {
      setExporting(false);
    }
  };
  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBackupMessage(null);
    try {
      const parsed = await parseBackupFile(file);
      if (!window.confirm('Remplacer les données actuelles par cette sauvegarde ?')) return;
      onReplace(normalizeData(parsed));
      setBackupMessage({ tone: 'success', text: 'Sauvegarde importée avec succès.' });
    } catch (reason) {
      setBackupMessage({
        tone: 'error',
        text: reason instanceof Error ? reason.message : 'Ce fichier ne contient pas une sauvegarde Le Chemin valide.',
      });
    } finally {
      event.target.value = '';
    }
  };

  const optionTabs: { id: OptionMode; label: string; icon: string }[] = [
    { id: 'profile', label: 'Profil', icon: 'user' },
    { id: 'rewards', label: 'Récompenses', icon: 'gift' },
    { id: 'appearance', label: 'Apparence', icon: 'palette' },
    { id: 'backup', label: 'Sauvegarde', icon: 'save' },
    { id: 'guide', label: 'Repères adultes', icon: 'help' },
  ];

  return (
    <section className="options-view">
      <div className="options-titlebar">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Retour"><Icon name="left" /></button>
        <div><span className="eyebrow">Réglages adultes</span><h1>Options</h1></div>
      </div>
      <div className="option-tabs" role="tablist">
        {optionTabs.map((tab) => <button type="button" role="tab" aria-selected={mode === tab.id} className={mode === tab.id ? 'active' : ''} key={tab.id} onClick={() => setMode(tab.id)}><Icon name={tab.icon} size={18} /><span>{tab.label}</span></button>)}
      </div>

      <div className="option-panel">
        {mode === 'profile' && (
          <div className="settings-card card">
            <span className="settings-icon"><Icon name="user" /></span>
            <div className="settings-copy"><span className="eyebrow">Personnalisation</span><h2>Prénom de l’utilisateur</h2><p>La modification est reprise dans le sentier, les encouragements et la signature.</p></div>
            <label className="field"><span>Prénom</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={32} onKeyDown={(event) => event.key === 'Enter' && saveName()} /></label>
            <button type="button" className="primary-button" onClick={saveName}><Icon name="check" size={18} /> Appliquer partout</button>
          </div>
        )}

        {mode === 'rewards' && (
          <div className="settings-section">
            <div className="settings-section__head"><div><span className="eyebrow">Boutique</span><h2>Récompenses</h2><p>Modifie le menu avec {data.profile.name} pour préserver sa motivation.</p></div><button type="button" className="primary-button" onClick={() => setEditor('new')} disabled={data.rewards.length >= 30}><Icon name="plus" size={18} /> Ajouter</button></div>
            <div className="reward-edit-list">
              {data.rewards.map((reward) => (
                <article className="reward-edit-row card" key={reward.id}>
                  <div className="reward-edit-icon"><RewardIcon reward={reward} /></div>
                  <div><strong>{reward.title}</strong><span>{reward.cost} points</span></div>
                  <button type="button" className="icon-button" onClick={() => setEditor(reward)} aria-label={`Modifier ${reward.title}`}><Icon name="pencil" size={18} /></button>
                  <button type="button" className="icon-button danger-button" onClick={() => deleteReward(reward)} aria-label={`Supprimer ${reward.title}`}><Icon name="trash" size={18} /></button>
                </article>
              ))}
            </div>
            {data.rewards.length >= 30 && <p className="settings-note">Maximum de 30 récompenses atteint.</p>}
          </div>
        )}

        {mode === 'appearance' && (
          <div className="settings-card card">
            <span className="settings-icon"><Icon name="palette" /></span>
            <div className="settings-copy"><span className="eyebrow">Option avancée</span><h2>Apparence de l’application</h2><p>Choisis un thème fixe ou laisse l’application suivre automatiquement le téléphone.</p></div>
            <fieldset className="theme-picker">
              <legend>Thème</legend>
              {([
                { id: 'light', label: 'Clair', icon: 'sun' },
                { id: 'dark', label: 'Sombre', icon: 'moon' },
                { id: 'system', label: 'Lié au système', icon: 'monitor' },
              ] as const).map((theme) => (
                <button
                  type="button"
                  key={theme.id}
                  className={data.profile.theme === theme.id ? 'active' : ''}
                  aria-pressed={data.profile.theme === theme.id}
                  onClick={() => onUpdate((current) => ({ ...current, profile: { ...current.profile, theme: theme.id } }))}
                >
                  <Icon name={theme.icon} size={19} />
                  <span>{theme.label}</span>
                  <i><Icon name="check" size={14} /></i>
                </button>
              ))}
            </fieldset>
            <h3 className="settings-subtitle">Palette de couleurs</h3>
            <div className="preset-grid">
              {colorPresets.map((preset) => <button type="button" key={preset.name} className={data.profile.accent === preset.accent && data.profile.highlight === preset.highlight ? 'active' : ''} onClick={() => onUpdate((current) => ({ ...current, profile: { ...current.profile, accent: preset.accent, highlight: preset.highlight } }))}><span style={{ '--preset-a': preset.accent, '--preset-b': preset.highlight } as CSSProperties} /><strong>{preset.name}</strong><Icon name="check" size={16} /></button>)}
            </div>
            <div className="field-row color-fields">
              <label className="field"><span>Couleur principale</span><div className="color-input"><input type="color" value={data.profile.accent} onChange={(event) => onUpdate((current) => ({ ...current, profile: { ...current.profile, accent: event.target.value } }))} /><code>{data.profile.accent}</code></div></label>
              <label className="field"><span>Couleur accent</span><div className="color-input"><input type="color" value={data.profile.highlight} onChange={(event) => onUpdate((current) => ({ ...current, profile: { ...current.profile, highlight: event.target.value } }))} /><code>{data.profile.highlight}</code></div></label>
            </div>
            <button type="button" className="secondary-button" onClick={() => onUpdate((current) => ({ ...current, profile: { ...current.profile, accent: '#317b69', highlight: '#e39a52' } }))}><Icon name="reset" size={17} /> Couleurs d’origine</button>
          </div>
        )}

        {mode === 'backup' && (
          <div className="settings-card card">
            <span className="settings-icon"><Icon name="save" /></span>
            <div className="settings-copy"><span className="eyebrow">Données locales</span><h2>Deux copies sur cet appareil</h2><p>Chaque action est écrite immédiatement dans la base principale et dans une copie locale de secours. L’export manuel crée un fichier ZIP complet.</p></div>
            <div className="backup-facts">
              <div><Icon name="saved" /><span><strong>Base principale</strong><small>IndexedDB · automatique</small></span></div>
              <div><Icon name="shield" /><span><strong>Copie de secours</strong><small>Stockage local · automatique</small></span></div>
              <div><Icon name="download" /><span><strong>Export JSON + Excel</strong><small>ZIP réimportable · à conserver ailleurs</small></span></div>
            </div>
            <div className="backup-actions">
              <button type="button" className="primary-button" onClick={exportBackup} disabled={exporting}><Icon name={exporting ? 'loading' : 'download'} className={exporting ? 'spin' : ''} size={17} /> {exporting ? 'Création…' : 'Exporter mes données'}</button>
              <button type="button" className="secondary-button" onClick={() => importRef.current?.click()} disabled={exporting}><Icon name="upload" size={17} /> Importer</button>
              <input ref={importRef} hidden type="file" accept="application/zip,.zip,application/json,.json" onChange={importBackup} />
            </div>
            {backupMessage && <p className={`backup-message backup-message--${backupMessage.tone}`} role="status"><Icon name={backupMessage.tone === 'success' ? 'saved' : backupMessage.tone === 'error' ? 'offline' : 'help'} size={17} />{backupMessage.text}</p>}
            <p className="settings-note">Le ZIP contient le fichier JSON nécessaire à la restauration, une version Excel lisible du tableau et une notice. Conserve-le hors du téléphone avant un changement ou une réinitialisation de l’appareil.</p>
          </div>
        )}

        {mode === 'guide' && (
          <div className="guide-stack">
            <article className="settings-card card">
              <span className="settings-icon"><Icon name="sparkle" /></span>
              <div className="settings-copy"><span className="eyebrow">Économie de points</span><h2>Les repères de mise en œuvre</h2></div>
              <ol className="guide-list">
                <li><strong>Commencer petit.</strong><span>Pendant la première semaine, mettre l’accent sur 2 ou 3 comportements atteignables, même si tout le tableau reste disponible.</span></li>
                <li><strong>Réagir tout de suite.</strong><span>Valider le point dès que possible et ajouter une louange descriptive : « Tu t’es mis aux devoirs sans discuter, bravo. »</span></li>
                <li><strong>Être cohérents.</strong><span>Les adultes utilisent les mêmes critères. {data.profile.name} peut cocher, avec validation d’un adulte.</span></li>
                <li><strong>Faire les bilans à heure fixe.</strong><span>Matin, après-midi et soir pour les périodes ; fin de journée pour le soin des objets.</span></li>
                <li><strong>Dépenser, jamais confisquer.</strong><span>Les points cumulés servent à acheter une récompense. Ils ne sont pas retirés comme sanction.</span></li>
                <li><strong>Réviser après un mois.</strong><span>Observer la vue hebdomadaire avec le professionnel référent : comportements trop faciles/difficiles, prix et intérêt des récompenses.</span></li>
              </ol>
            </article>
            <article className="safety-card">
              <Icon name="shield" size={25} />
              <div><span className="eyebrow">Protocole séparé</span><h2>Un comportement à risque n’est pas un problème de points</h2><p>En cas de danger immédiat, arrêter l’évaluation, éloigner les objets dangereux, mettre les personnes en sécurité, garder des consignes brèves et appeler les secours adaptés si nécessaire. Débriefer seulement après le retour au calme et définir ce protocole avec les soignants de {data.profile.name}.</p></div>
            </article>
            <p className="clinical-note"><strong>Important :</strong> ces repères viennent de principes généraux d’entraînement parental et d’économie de jetons. Ils ne constituent pas un avis clinique individualisé pour {data.profile.name} et ne modifient ni son traitement ni son suivi.</p>
          </div>
        )}
      </div>
      {editor && <RewardEditor initial={editor === 'new' ? undefined : editor} onSave={saveReward} onClose={() => setEditor(null)} />}
    </section>
  );
}

function PurchaseModal({ reward, balance, onConfirm, onClose }: { reward: Reward; balance: number; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal title="Confirmer l’échange" onClose={onClose}>
      <div className="purchase-confirm">
        <div className="purchase-icon"><RewardIcon reward={reward} /></div>
        <h3>{reward.title}</h3>
        <p>Cette récompense coûte <strong>{reward.cost} points</strong>.</p>
        <div className="balance-before-after"><span><small>Avant</small><strong>{balance}</strong></span><Icon name="right" /><span><small>Après</small><strong>{Math.max(0, balance - reward.cost)}</strong></span></div>
        <p className="adult-check">À confirmer avec un adulte. Cet échange sera ajouté à l’historique.</p>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Pas maintenant</button><button type="button" className="primary-button" onClick={onConfirm}>Échanger</button></div>
      </div>
    </Modal>
  );
}

function Toast({ message }: { message: string }) {
  return <div className="toast" role="status"><Icon name="sparkle" size={17} />{message}</div>;
}

function App() {
  const store = useAppStore();
  const [view, setView] = useState<View>('today');
  const [previousView, setPreviousView] = useState<Exclude<View, 'options'>>('today');
  const [purchase, setPurchase] = useState<Reward | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);
  const todayKey = localDateKey();

  const showToast = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2200);
  };

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    const root = document.documentElement;
    const theme = store.data.profile.theme;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
      root.style.colorScheme = 'light dark';
    } else {
      root.setAttribute('data-theme', theme);
      root.style.colorScheme = theme;
    }
  }, [store.data.profile.theme]);

  const toggle = (id: string) => {
    const behavior = BEHAVIORS.find((item) => item.id === id);
    const wasChecked = Boolean(store.data.days[todayKey]?.checks?.[id]);
    store.update((current) => {
      const existing = current.days[todayKey] || { checks: {}, counts: {} };
      return {
        ...current,
        days: {
          ...current.days,
          [todayKey]: { ...existing, checks: { ...existing.checks, [id]: !existing.checks[id] }, counts: { ...existing.counts } },
        },
      };
    });
    if (!wasChecked && behavior) showToast(`+${behavior.points} points · Bravo !`);
  };

  const changeCounter = (id: string, delta: number) => {
    const behavior = BEHAVIORS.find((item) => item.id === id);
    store.update((current) => {
      const existing = current.days[todayKey] || { checks: {}, counts: {} };
      const previous = existing.counts[id] || 0;
      const nextCount = Math.max(0, Math.min(999, previous + delta));
      return {
        ...current,
        days: {
          ...current.days,
          [todayKey]: { ...existing, checks: { ...existing.checks }, counts: { ...existing.counts, [id]: nextCount } },
        },
      };
    });
    if (delta > 0 && behavior) showToast(`+${behavior.points} points · Beau réflexe !`);
  };

  const confirmPurchase = () => {
    if (!purchase) return;
    const balance = balanceFor(store.data);
    if (balance < purchase.cost) {
      setPurchase(null);
      showToast('Le solde a changé : continue ton chemin !');
      return;
    }
    const reward = purchase;
    store.update((current) => ({
      ...current,
      redemptions: [...current.redemptions, {
        id: uid('exchange'),
        rewardId: reward.id,
        title: reward.title,
        cost: reward.cost,
        date: todayKey,
        createdAt: new Date().toISOString(),
      }],
    }));
    setPurchase(null);
    showToast('Récompense échangée · Profite bien !');
  };

  const goTo = (next: Exclude<View, 'options'>) => {
    setView(next);
    setPreviousView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openOptions = () => {
    if (view !== 'options') setPreviousView(view);
    setView('options');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const themeStyle = useMemo(() => ({
    '--accent': store.data.profile.accent,
    '--highlight': store.data.profile.highlight,
  } as CSSProperties), [store.data.profile.accent, store.data.profile.highlight]);

  if (!store.ready) {
    return <div className="loading-screen"><MountainMark /><Icon name="loading" className="spin" /><p>On prépare le sentier…</p></div>;
  }

  return (
    <div className="app-shell" style={themeStyle}>
      <header className="topbar">
        <button type="button" className="brand" onClick={() => goTo('today')} aria-label="Le Chemin, accueil"><MountainMark /><span><strong>Le Chemin</strong><small>Chaque pas compte</small></span></button>
        <div className="topbar-actions">
          <SaveIndicator status={store.saveStatus} error={store.saveError} onRetry={store.retry} />
          <button type="button" className={`options-button${view === 'options' ? ' active' : ''}`} onClick={openOptions}><Icon name="settings" size={18} /><span>Options</span></button>
        </div>
      </header>

      <main>
        {view === 'today' && <TodayView data={store.data} onToggle={toggle} onCounter={changeCounter} />}
        {view === 'shop' && <ShopView data={store.data} onBuy={setPurchase} />}
        {view === 'history' && <HistoryView data={store.data} />}
        {view === 'options' && <OptionsView data={store.data} onUpdate={store.update} onReplace={store.replace} onBack={() => setView(previousView)} />}
      </main>

      <footer className="app-footer">
        <MountainMark small />
        <p>Fait avec <span aria-label="amour">💚</span> par Diane &amp; Jim pour les petits et les grands pas faits et à faire par <strong>{store.data.profile.name}</strong>.</p>
        <small>Outil éducatif familial · ne remplace pas un avis médical.</small>
      </footer>

      {view !== 'options' && (
        <nav className="bottom-nav" aria-label="Navigation principale">
          <button type="button" className={view === 'today' ? 'active' : ''} onClick={() => goTo('today')}><Icon name="home" /><span>Aujourd’hui</span></button>
          <button type="button" className={view === 'shop' ? 'active' : ''} onClick={() => goTo('shop')}><Icon name="shop" /><span>Boutique</span></button>
          <button type="button" className={view === 'history' ? 'active' : ''} onClick={() => goTo('history')}><Icon name="history" /><span>Progrès</span></button>
        </nav>
      )}
      {purchase && <PurchaseModal reward={purchase} balance={balanceFor(store.data)} onClose={() => setPurchase(null)} onConfirm={confirmPurchase} />}
      {toast && <Toast message={toast} />}
    </div>
  );
}

export default App;
