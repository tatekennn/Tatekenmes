import type { Metadata } from 'next';
import DemoConsole from '../../../components/DemoConsole';

export const metadata: Metadata = { title: 'alice.覇気.com — デモ' };

export default function AlicePage() {
  return (
    <main className="demo-stage demo-alice">
      <p className="demo-kicker">テナント A</p>
      <h1 className="demo-title">alice.覇気.com</h1>
      <p className="demo-lead">
        わたしは alice。<code>bob.覇気.com</code> を別タブで開いて、
        localStorage と Cookie がどう見えるか比べてみて。
      </p>
      <DemoConsole zoneCookieDomain="覇気.com" />
      <p className="demo-hint">
        localStorage に書いた値は bob からは見えない（origin 分離）。
        でも「Domain=覇気.com で共有」した Cookie は bob にも現れる（site 共有）。
      </p>
    </main>
  );
}
