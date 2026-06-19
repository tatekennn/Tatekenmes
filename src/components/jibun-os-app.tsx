'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  hobbyItems,
  lunchLogs,
  monthFare,
  paidRides,
  stars,
  workState,
  yen,
} from '@/content/jibun-os-data';
import styles from './jibun-os-app.module.css';

type View = 'home' | 'work' | 'rides' | 'rideForm' | 'lunch' | 'lunchForm' | 'hobby' | 'hobbyForm';
type AiMode = 'dashboard' | 'rest' | 'budget' | 'hobby' | 'lunch';

const navItems = [
  { href: '/', label: 'ホーム', key: 'home' },
  { href: '/work_days/today', label: '打刻', key: 'work' },
  { href: '/paid_rides', label: '列車', key: 'rides' },
  { href: '/lunch_logs', label: 'ランチ', key: 'lunch' },
  { href: '/hobby_items', label: '趣味', key: 'hobby' },
] as const;

const modeLabels: Record<AiMode, string> = {
  dashboard: '今日の調整',
  rest: '疲れ気味',
  budget: '節約フォーカス',
  hobby: '趣味優先',
  lunch: 'ランチ候補',
};

function statusLabel(value: boolean) {
  return value ? '完了' : '確認';
}

function activeKey(view: View) {
  if (view === 'rideForm') return 'rides';
  if (view === 'lunchForm') return 'lunch';
  if (view === 'hobbyForm') return 'hobby';
  if (view === 'work') return 'work';
  if (view === 'rides') return 'rides';
  if (view === 'lunch') return 'lunch';
  if (view === 'hobby') return 'hobby';
  return 'home';
}

function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <section className={styles.pageHead}>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      {action}
    </section>
  );
}

function AppShell({ view, children }: { view: View; children: ReactNode }) {
  const [mode, setMode] = useState<AiMode>('dashboard');
  const [input, setInput] = useState('');
  const currentKey = activeKey(view);
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat('ja-JP', {
        month: 'numeric',
        day: 'numeric',
      }).format(new Date()),
    [],
  );

  return (
    <main className={styles.app} data-mode={mode}>
      <div className={styles.shell}>
        <header className={styles.topBar}>
          <Link href="/" className={styles.brand} aria-label="自分OS ホーム">
            <span className={styles.logo} aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span>
              <small>JIBUN OS</small>
              <strong>自分OS</strong>
            </span>
          </Link>
          <time>{today}</time>
        </header>

        <div className={styles.screen}>{children}</div>

        <aside className={styles.aiDock} aria-label="AIチャット">
          <div className={styles.aiHead}>
            <span aria-hidden="true" />
            <strong>{modeLabels[mode]}</strong>
          </div>
          <form
            className={styles.aiForm}
            onSubmit={(event) => {
              event.preventDefault();
              if (input.includes('早く') || input.includes('疲')) setMode('rest');
              else if (input.includes('節約')) setMode('budget');
              else if (input.includes('ランチ')) setMode('lunch');
              else if (input.includes('趣味')) setMode('hobby');
              setInput('');
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="例: 今日は早く帰りたい"
              aria-label="AIチャット入力"
            />
            <button type="submit">送信</button>
          </form>
        </aside>

        <nav className={styles.bottomNav} aria-label="メインメニュー">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={item.key === currentKey ? styles.activeNavItem : styles.navItem}
              aria-current={item.key === currentKey ? 'page' : undefined}
            >
              <span className={`${styles.navIcon} ${styles[`navIcon${item.key}`]}`} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}

function HomeView() {
  const latestLunch = lunchLogs[0];
  const nextHobby = hobbyItems[0];

  return (
    <>
      <section className={styles.masthead}>
        <div>
          <p>JIBUN OS</p>
          <h1>今日の管理</h1>
        </div>
        <time>{new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' }).format(new Date())}</time>
      </section>

      <article className={`${styles.summary} ${styles.focusBudget}`}>
        <div>
          <p>今月の有料列車合計</p>
          <strong>{yen(monthFare)}</strong>
        </div>
        <Link href="/paid_rides/new" className={styles.summaryAction} aria-label="有料列車を追加">
          +
        </Link>
        <dl>
          <div>
            <dt>年間換算</dt>
            <dd>{yen(monthFare * 12)}</dd>
          </div>
          <div>
            <dt>記録数</dt>
            <dd>{paidRides.length}件</dd>
          </div>
        </dl>
      </article>

      <div className={styles.chips} aria-label="ホーム表示">
        <span>今日</span>
        <Link href="/work_days/today">打刻</Link>
        <Link href="/paid_rides">列車</Link>
        <Link href="/lunch_logs">ランチ</Link>
        <Link href="/hobby_items">趣味</Link>
      </div>

      <section className={styles.itemList} aria-label="今日の項目">
        <h2>管理中の項目</h2>
        <div className={styles.itemRow}>
          <span className={`${styles.itemLogo} ${styles.workLogo}`}>出</span>
          <div>
            <strong>出勤チェック</strong>
            <small>{workState.checkIn ? '確認済み' : 'まだ未確認'}</small>
          </div>
          <button className={styles.rowAction}>{statusLabel(workState.checkIn)}</button>
        </div>
        <div className={styles.itemRow}>
          <span className={`${styles.itemLogo} ${styles.restLogo}`}>退</span>
          <div>
            <strong>退勤チェック</strong>
            <small>{workState.checkOut ? '確認済み' : '帰る前に確認'}</small>
          </div>
          <button className={styles.rowAction}>{statusLabel(workState.checkOut)}</button>
        </div>
        <Link href="/paid_rides" className={styles.itemRow}>
          <span className={`${styles.itemLogo} ${styles.rideLogo}`}>¥</span>
          <div>
            <strong>有料列車</strong>
            <small>今月 {paidRides.length}件</small>
          </div>
          <em>{yen(monthFare)}</em>
        </Link>
        <Link href="/lunch_logs" className={styles.itemRow}>
          <span className={`${styles.itemLogo} ${styles.lunchLogo}`}>昼</span>
          <div>
            <strong>{latestLunch.shop}</strong>
            <small>
              {stars(latestLunch.rating)} / {yen(latestLunch.price)}
            </small>
          </div>
          <em>›</em>
        </Link>
        <Link href="/hobby_items" className={styles.itemRow}>
          <span className={`${styles.itemLogo} ${styles.hobbyLogo}`}>趣</span>
          <div>
            <strong>{nextHobby.title}</strong>
            <small>{nextHobby.date} 予定</small>
          </div>
          <em>›</em>
        </Link>
      </section>
    </>
  );
}

function WorkView() {
  return (
    <>
      <PageHeader eyebrow="WORK CHECK" title="今日の打刻" />
      <section className={styles.cardGrid}>
        <article className={styles.statusCard}>
          <span className={`${styles.itemLogo} ${styles.workLogo}`}>出</span>
          <p>出勤</p>
          <strong>{statusLabel(workState.checkIn)}</strong>
          <button>出勤打刻した</button>
        </article>
        <article className={styles.statusCard}>
          <span className={`${styles.itemLogo} ${styles.restLogo}`}>退</span>
          <p>退勤</p>
          <strong>{statusLabel(workState.checkOut)}</strong>
          <button>退勤打刻した</button>
        </article>
      </section>
      <section className={styles.card}>
        <h2>メモ</h2>
        <textarea placeholder="今日は9時出勤で調整" />
        <button className={styles.primaryButton}>保存</button>
      </section>
    </>
  );
}

function RidesView() {
  return (
    <>
      <PageHeader eyebrow="PAID TRAIN" title="有料列車ログ" action={<Link className={styles.primaryButton} href="/paid_rides/new">今日乗った</Link>} />
      <section className={styles.metricCard}>
        <div>
          <span>利用回数</span>
          <strong>{paidRides.length}回</strong>
        </div>
        <div>
          <span>合計金額</span>
          <strong>{yen(monthFare)}</strong>
        </div>
      </section>
      <section className={styles.list}>
        {paidRides.map((ride) => (
          <article key={`${ride.date}-${ride.line}`} className={styles.listCard}>
            <div className={styles.listLine}>
              <strong>{ride.date}</strong>
              <span>
                {ride.line} {yen(ride.fare)}
              </span>
            </div>
            <p>
              {ride.direction} / {ride.reason} / 疲労{ride.fatigue}
            </p>
            <div className={styles.actions}>
              <button>編集</button>
              <button>削除</button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function LunchView() {
  return (
    <>
      <PageHeader eyebrow="LUNCH DB" title="渋谷ランチログ" action={<Link className={styles.primaryButton} href="/lunch_logs/new">ランチを記録</Link>} />
      <section className={styles.metricCard}>
        <div>
          <span>今月</span>
          <strong>{lunchLogs.length}件</strong>
        </div>
        <div>
          <span>平均価格</span>
          <strong>{yen(Math.round(lunchLogs.reduce((sum, lunch) => sum + lunch.price, 0) / lunchLogs.length))}</strong>
        </div>
      </section>
      <section className={styles.list}>
        {lunchLogs.map((lunch) => (
          <article key={`${lunch.date}-${lunch.shop}`} className={styles.listCard}>
            <div className={styles.listLine}>
              <strong>{lunch.shop}</strong>
              <span>{stars(lunch.rating)}</span>
            </div>
            <p>
              {lunch.date} / {lunch.area} / {yen(lunch.price)}
            </p>
            <div className={styles.tags}>{lunch.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </article>
        ))}
      </section>
    </>
  );
}

function HobbyView() {
  return (
    <>
      <PageHeader
        eyebrow="HOBBY SLOT"
        title="趣味コーナー"
        action={
          <div className={styles.splitActions}>
            <Link className={styles.primaryButton} href="/hobby_items/new">予定</Link>
            <Link className={styles.secondaryButton} href="/hobby_items/new">メモ</Link>
          </div>
        }
      />
      <section className={styles.card}>
        <p className={styles.eyebrow}>NEXT EVENT</p>
        <h2>{hobbyItems[0].date} {hobbyItems[0].title}</h2>
        <p>{hobbyItems[0].category} / {hobbyItems[0].status}</p>
      </section>
      <section className={styles.list}>
        {hobbyItems.map((item) => (
          <article key={`${item.type}-${item.title}`} className={styles.listCard}>
            <div className={styles.listLine}>
              <strong>{item.title}</strong>
              <span>{item.type}</span>
            </div>
            <p>{item.category}{item.date ? ` / ${item.date}` : ''}</p>
            <div className={styles.tags}>
              <span>{item.status}</span>
              {item.rating ? <span>{stars(item.rating)}</span> : null}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function FormView({ type }: { type: 'ride' | 'lunch' | 'hobby' }) {
  const config = {
    ride: { eyebrow: 'NEW RIDE', title: '今日乗った', label: '疲労度', value: 3, back: '/paid_rides' },
    lunch: { eyebrow: 'NEW LUNCH', title: 'ランチを記録', label: '満足度', value: 4, back: '/lunch_logs' },
    hobby: { eyebrow: 'NEW HOBBY', title: '趣味を記録', label: '評価', value: 3, back: '/hobby_items' },
  }[type];

  return (
    <>
      <PageHeader eyebrow={config.eyebrow} title={config.title} />
      <section className={styles.formCard}>
        <label>
          日付
          <input type="date" defaultValue="2026-06-19" />
        </label>
        <label>
          タイトル
          <input placeholder={type === 'ride' ? '路線名' : type === 'lunch' ? '店名' : 'タイトル'} />
        </label>
        <label>
          金額
          <input type="number" placeholder="900" />
        </label>
        <div className={styles.rangeField}>
          <div>
            <label>{config.label}</label>
            <span>{config.value}/5</span>
          </div>
          <input type="range" min="1" max="5" defaultValue={config.value} />
        </div>
        <label>
          メモ
          <textarea placeholder="あとで見返すためのメモ" />
        </label>
        <button className={styles.primaryButton}>保存</button>
        <Link className={styles.textLink} href={config.back}>戻る</Link>
      </section>
    </>
  );
}

export function JibunOsApp({ view }: { view: View }) {
  const content = {
    home: <HomeView />,
    work: <WorkView />,
    rides: <RidesView />,
    rideForm: <FormView type="ride" />,
    lunch: <LunchView />,
    lunchForm: <FormView type="lunch" />,
    hobby: <HobbyView />,
    hobbyForm: <FormView type="hobby" />,
  }[view];

  return <AppShell view={view}>{content}</AppShell>;
}
