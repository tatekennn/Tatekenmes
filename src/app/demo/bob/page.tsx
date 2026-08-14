import type { Metadata } from 'next';
import DemoConsole from '../../../components/DemoConsole';

export const metadata: Metadata = { title: 'bob.覇気.com — デモ' };

export default function BobPage() {
  return (
    <main className="demo-stage demo-bob">
      <p className="demo-kicker">テナント B</p>
      <h1 className="demo-title">bob.覇気.com</h1>
      <p className="demo-lead">
        わたしは bob。alice が書いたものが、ここから見えるか観察して。
      </p>
      <DemoConsole zoneCookieDomain="覇気.com" />
      <p className="demo-hint">
        alice の localStorage は見えないはず（別 origin）。
        Cookie は「Domain=覇気.com」で書かれた分だけ、ここにも漏れてくる。
      </p>
    </main>
  );
}
