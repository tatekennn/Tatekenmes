import type { Metadata } from 'next';
import Link from 'next/link';
import ApplyForm from './ApplyForm';
import { PROVISIONING_ENABLED } from '../../lib/config';

export const metadata: Metadata = {
  title: '覇気を放つ | 覇気.com',
  description: '名前を入れて、あなただけの覇気全開ページを作ろう。',
};

export default function ApplyPage() {
  // 提供停止中はフォームを出さず、案内だけ表示する
  if (!PROVISIONING_ENABLED) {
    return (
      <main className="apply-stage">
        <div className="aura aura-one" />
        <div className="aura aura-two" />
        <div className="apply-card">
          <p className="apply-kicker">覇気.com</p>
          <h1 className="apply-title">ただいま受付停止中</h1>
          <p className="apply-lead">
            サブドメインの新規発行は一時的に停止しています。再開までしばらくお待ちください。
          </p>
          <Link className="apply-button" href="/">
            覇気トップへ
          </Link>
        </div>
      </main>
    );
  }
  return <ApplyForm />;
}
